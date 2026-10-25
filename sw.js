// Stratosphere offline cache. Network-first: try the network, and if it
// doesn't start answering within 3 seconds (or fails outright), serve the
// saved copy instead. One failed or timed-out request switches the worker to
// cache-only for an hour, so a load with no signal never makes the user wait
// again. Only same-origin GET requests are handled; everything else is left
// alone.

const CACHE_NAME = 'stratosphere-cache-v1';
const NETWORK_TIMEOUT_MS = 3000;
const NETWORK_DOWN_MS = 60 * 60 * 1000;
// Where the "skip the network until" time is kept. It lives in the cache, not
// in a variable, because the browser stops idle service workers and wipes
// their memory.
const NETWORK_DOWN_URL = new URL('network-down-until', self.registration.scope).href;
const TIMEOUT = Symbol('timeout');
const FAILED = Symbol('failed');

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

async function getSkipUntil(cache) {
    const res = await cache.match(NETWORK_DOWN_URL);
    if (!res) return 0;
    const t = parseInt(await res.text(), 10);
    return isNaN(t) ? 0 : t;
}

// Cached copy of a request. A numbered file (?v=) that is not saved yet falls
// back to an older saved copy of the same path, so a page that was refreshed
// before its files were still works offline. A page navigation with no copy
// of that exact URL (e.g. one with a query string) falls back to the cached
// index.html.
async function matchCached(cache, req) {
    const isNav = req.mode === 'navigate';
    const exact = await cache.match(req, { ignoreVary: true });
    if (exact) return exact;
    const older = await cache.match(req, { ignoreVary: true, ignoreSearch: true });
    if (older || !isNav) return older;
    return (await cache.match(new URL('index.html', self.registration.scope).href, { ignoreVary: true }))
        || (await cache.match(self.registration.scope, { ignoreVary: true }));
}

// A file saved under a new ?v= number replaces the older saved copies of the
// same path (any other query, including none), so each build does not leave a
// full set of old files behind.
async function pruneOlderVersions(cache, urlString) {
    const url = new URL(urlString);
    if (!url.searchParams.has('v')) return;
    const keys = await cache.keys();
    await Promise.all(keys.filter((k) => {
        const u = new URL(k.url);
        return u.origin === url.origin && u.pathname === url.pathname && u.search !== url.search;
    }).map((k) => cache.delete(k)));
}

// `background` collects work that should outlive the response (the network
// request that is still running after a timeout, and its cache write).
async function handle(req, background) {
    const cache = await caches.open(CACHE_NAME);

    if (Date.now() < await getSkipUntil(cache)) {
        return (await matchCached(cache, req)) || fetch(req);
    }

    // cache: 'no-cache' makes the browser revalidate instead of reusing its
    // own HTTP cache, so one reload after an update is enough.
    const net = fetch(req, { cache: 'no-cache' });
    background.push(
        net.then((res) => (res.ok ? cache.put(req, res.clone()).then(() => pruneOlderVersions(cache, req.url)) : null)).catch(() => {})
    );

    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(TIMEOUT), NETWORK_TIMEOUT_MS); });
    let result;
    try {
        result = await Promise.race([net, timeout]);
    } catch (e) {
        result = FAILED;
    }
    clearTimeout(timer);

    if (result !== TIMEOUT && result !== FAILED) return result;

    await cache.put(NETWORK_DOWN_URL, new Response(String(Date.now() + NETWORK_DOWN_MS)));
    const cached = await matchCached(cache, req);
    if (cached) return cached;
    // Nothing saved to fall back on: keep waiting on the network request.
    return result === TIMEOUT ? net : Response.error();
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    if (new URL(req.url).origin !== self.location.origin) return;

    const background = [];
    const response = handle(req, background);
    event.respondWith(response);
    event.waitUntil(response.then(() => Promise.all(background)).catch(() => {}));
});

// First visit: the page finished loading before this worker was active, so
// none of its files passed through the fetch handler. The page sends the list
// of files it loaded, and they are saved here.
self.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'cache-urls') return;
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(event.data.urls.map(async (u) => {
            try {
                const url = new URL(u, self.location.href);
                if (url.origin !== self.location.origin) return;
                const res = await fetch(url.href);
                if (res.ok) { await cache.put(url.href, res); await pruneOlderVersions(cache, url.href); }
            } catch (e) { /* skip this file */ }
        }));
    })());
});
