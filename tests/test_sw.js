const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = require('./lib').ROOT, PORT = 8880, ORIGIN = 'http://localhost:' + PORT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.txt':'text/plain'};
const srv = { mode: 'ok', delay: 0, overrides: {}, log: [] };
const server = http.createServer((q, res) => {
  const pathname = decodeURIComponent(q.url.split('?')[0]);
  srv.log.push(pathname);
  if (srv.mode === 'down') { q.socket.destroy(); return; }
  const send = () => {
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    let body = srv.overrides[rel];
    if (body === undefined) { try { body = fs.readFileSync(path.join(root, rel)); } catch (e) { res.writeHead(404); res.end(); return; } }
    const etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
    const h = { 'content-type': types[path.extname(rel)] || 'application/octet-stream', 'cache-control': 'max-age=600', etag }; // same headers GitHub Pages sends
    if (q.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return; }
    res.writeHead(200, h); res.end(body);
  };
  if (srv.mode === 'hang') setTimeout(send, srv.delay); else send();
}).listen(PORT);

let pass = 0, fail = 0;
const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const newCtx = async (opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, geolocation: { latitude: 28.5383, longitude: -81.3792 }, permissions: ['geolocation'], ...opts });
    const external = [];
    await ctx.route(/^https?:\/\/(?!localhost)/, r => { external.push(r.request().url()); r.abort(); });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    return { ctx, page, errors, external };
  };
  const reset = () => { srv.mode = 'ok'; srv.delay = 0; srv.overrides = {}; srv.log = []; };
  const cacheKeys = page => page.evaluate(async () => (await (await caches.open('stratosphere-cache-v1')).keys()).map(r => r.url));
  const ready = page => page.evaluate(() => ({ map: window.loadMapReady, loader: getComputedStyle(document.getElementById('loader-overlay')).opacity }));
  const waitMap = async (page, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if ((await ready(page)).map) return Date.now() - t0; } catch (e) {} await sleep(50); } return -1; };
  // first visit, online: load, wait until the cache is filled
  const firstVisit = async (t) => {
    await t.page.goto(ORIGIN + '/'); await waitMap(t.page); await sleep(300);
    for (let i = 0; i < 40; i++) { if ((await cacheKeys(t.page)).length >= 24) break; await sleep(250); }
  };

  // ---------- T1: first visit fills the cache
  reset(); let t = await newCtx(); await firstVisit(t);
  const resources = await t.page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name));
  const keys = await cacheKeys(t.page);
  const missing = resources.filter(u => !keys.includes(u) && !/\/favicon\.ico(\?|$)/.test(u));
  console.log('resources loaded:', resources.length, ' cache entries:', keys.length);
  ok('T1 first visit: every loaded file (HTML, CSS, JS, fonts) is in the cache', missing.length === 0 && keys.includes(ORIGIN + '/'), 'missing: ' + missing.join(','));
  ok('T1 service worker active and controlling the page after first visit', await t.page.evaluate(async () => !!(await navigator.serviceWorker.ready).active));
  ok('T1 no JS errors, nothing external requested', t.errors.length === 0 && t.external.length === 0, t.errors.join('|'));

  // ---------- T2: offline (server unreachable) reload
  await t.page.evaluate(() => { document.getElementById('input-home-lat').value = '39.7392'; document.getElementById('input-home-lon').value = '-104.9903'; document.getElementById('chk-home-show').checked = true; handleHomeLocationChange(); });
  srv.mode = 'down'; srv.log = [];
  await t.page.reload(); let ms = await waitMap(t.page);
  await sleep(3500); let r = await ready(t.page);
  const home = await t.page.evaluate(() => ({ lat: document.getElementById('input-home-lat').value, sLat: STATE.homeLocation.lat, show: STATE.homeLocation.show }));
  ok('T2 offline reload: map loads from the cache, loader fades, no JS errors', ms >= 0 && r.loader === '0' && t.errors.length === 0, `mapReady in ${ms} ms, errors: ${t.errors.join('|')}`);
  ok('T2 offline: home location still restores', home.lat === '39.7392' && home.sLat === 39.7392 && home.show);
  await t.page.goto(ORIGIN + '/?utm=test'); ms = await waitMap(t.page);
  ok('T2 offline: a page URL with a query string also loads (falls back to cached index.html)', ms >= 0 && t.errors.length === 0, `${ms} ms`);
  const sk = await t.page.evaluate(async () => { const r = await (await caches.open('stratosphere-cache-v1')).match(new URL('network-down-until', location.href).href); return r ? parseInt(await r.text(), 10) : 0; });
  ok('T2 a failed request switched the worker to cache-only for about an hour', sk - Date.now() > 55 * 60 * 1000 && sk - Date.now() <= 60 * 60 * 1000, `${Math.round((sk - Date.now()) / 60000)} min left`);
  await t.ctx.close();

  // ---------- T3: update shows on the FIRST reload, even though the server says max-age=600
  reset(); t = await newCtx(); await firstVisit(t);
  srv.overrides['index.html'] = fs.readFileSync(root + '/index.html', 'utf8').replace('</head>', '<meta name="vtest" content="2"></head>');
  srv.overrides['js/geodesy.js'] = fs.readFileSync(root + '/js/geodesy.js', 'utf8') + '\nwindow.__upd = 2;\n';
  srv.log = []; await t.page.reload(); ms = await waitMap(t.page);
  let upd = await t.page.evaluate(() => ({ meta: !!document.querySelector('meta[name=vtest]'), js: window.__upd }));
  ok('T3 update: new HTML and new script both appear after ONE normal reload (long max-age ignored)', upd.meta && upd.js === 2 && t.errors.length === 0, JSON.stringify(upd));
  const revalidated = srv.log.filter(p => p === '/' || p === '/js/geodesy.js').length;
  ok('T3 the worker revalidated with the server on that reload', revalidated >= 2, srv.log.length + ' requests');
  await t.ctx.close();

  // ---------- T4: server hangs (connected but no internet)
  reset(); t = await newCtx(); await firstVisit(t);
  srv.mode = 'hang'; srv.delay = 4000; srv.log = [];
  let t0 = Date.now(); await t.page.reload(); ms = await waitMap(t.page, 15000);
  ok('T4 hanging server: page loads from the cache after about 3 seconds', ms >= 0 && Date.now() - t0 > 2800 && Date.now() - t0 < 7000 && t.errors.length === 0, `${Date.now() - t0} ms`);
  await sleep(5000); // let the hung requests finish
  srv.log = []; t0 = Date.now(); await t.page.reload(); ms = await waitMap(t.page, 15000); const quick = Date.now() - t0;
  await sleep(500);
  const nonIcon = srv.log.filter(u => !/favicon\.ico/.test(u));
  ok('T4 next load inside the hour is fast and makes no network attempt (the browser\'s own favicon request does not go through the worker and is not counted)', ms >= 0 && quick < 2500 && nonIcon.length === 0, `${quick} ms, ${srv.log.length} server requests: ${srv.log.join(' ')}`);
  // window expiry: rewrite the stored time into the past, serve a newer file, server healthy
  await t.page.evaluate(async () => (await caches.open('stratosphere-cache-v1')).put(new URL('network-down-until', location.href).href, new Response('0')));
  srv.mode = 'ok'; srv.overrides['js/geodesy.js'] = fs.readFileSync(root + '/js/geodesy.js', 'utf8') + '\nwindow.__upd = 3;\n'; srv.log = [];
  await t.page.reload(); ms = await waitMap(t.page);
  upd = await t.page.evaluate(() => window.__upd);
  ok('T4 after the hour has passed the network is tried again and the update arrives', srv.log.length > 5 && upd === 3, `${srv.log.length} requests, __upd=${upd}`);
  await t.ctx.close();

  // ---------- T4b: slow server answers AFTER the 3 s limit -> the page request finishes in the background and the cache is refreshed
  reset(); t = await newCtx(); await firstVisit(t);
  srv.overrides['index.html'] = fs.readFileSync(root + '/index.html', 'utf8').replace('</head>', '<meta name="bgtest" content="1"></head>');
  srv.mode = 'hang'; srv.delay = 4500;
  await t.page.reload(); await waitMap(t.page, 15000);
  const firstView = await t.page.evaluate(() => !!document.querySelector('meta[name=bgtest]'));
  await sleep(5000);
  const refreshed = await t.page.evaluate(async () => { const r = await (await caches.open('stratosphere-cache-v1')).match(location.origin + '/'); return r ? (await r.text()).includes('bgtest') : false; });
  ok('T4b slow server: that load showed the saved page, and the page was refreshed in the cache in the background', firstView === false && refreshed, `shownOld=${!firstView} refreshed=${refreshed}`);
  srv.mode = 'ok'; srv.log = []; await t.page.reload(); await waitMap(t.page);
  const second = await t.page.evaluate(() => ({ newHtml: !!document.querySelector('meta[name=bgtest]') }));
  console.log('INFO T4b next load (inside the hour, network skipped): new page from cache =', second.newHtml, '| server requests =', srv.log.length);
  await t.ctx.close();

  // ---------- T5: no service worker support / blocked
  reset(); t = await newCtx({ serviceWorkers: 'block' });
  await t.page.goto(ORIGIN + '/'); ms = await waitMap(t.page);
  ok('T5 service workers blocked: app loads normally, no errors', ms >= 0 && t.errors.length === 0, t.errors.join('|'));
  await t.ctx.close();
  t = await newCtx(); await t.page.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
  await t.page.goto(ORIGIN + '/'); ms = await waitMap(t.page);
  ok('T5 browser without service worker support: app loads normally, no errors', ms >= 0 && t.errors.length === 0, t.errors.join('|'));
  await t.ctx.close();

  await b.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
})();
