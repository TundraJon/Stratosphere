const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = require('./lib').ROOT, PORT = 9081, ORIGIN = 'http://localhost:' + PORT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv = { mode: 'ok', delay: 0, overrides: {}, log: [] };
const server = http.createServer((q, res) => {
  const pathname = decodeURIComponent(q.url.split('?')[0]); srv.log.push(q.url);
  if (srv.mode === 'down') { q.socket.destroy(); return; }
  const send = () => {
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    let body = srv.overrides[rel]; if (body === undefined) { try { body = fs.readFileSync(path.join(root, rel)); } catch (e) { res.writeHead(404); res.end(); return; } }
    const etag = '"' + crypto.createHash('md5').update(body).digest('hex') + '"';
    const h = { 'content-type': types[path.extname(rel)] || 'application/octet-stream', 'cache-control': 'max-age=600', etag };   // same headers GitHub Pages sends
    if (q.headers['if-none-match'] === etag) { res.writeHead(304, h); res.end(); return; }
    res.writeHead(200, h); res.end(body);
  };
  if (srv.mode === 'hang') setTimeout(send, srv.delay); else send();
}).listen(PORT);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const html = fs.readFileSync(root + '/index.html', 'utf8');
const V = +/\?v=(\d+)/.exec(html)[1];   // the version number the page carries now
const withV = n => html.replace(new RegExp('\\?v=' + V, 'g'), '?v=' + n);
const geo = fs.readFileSync(root + '/js/geodesy.js', 'utf8');
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const newCtx = async (opts = {}) => {
    const { noRoute, ...ctxOpts } = opts; const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, permissions: [], ...ctxOpts });
    const page = await ctx.newPage(); const errors = [], bad = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) bad.push(r.status() + ' ' + r.url()); });
    if (!opts.noRoute) await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());   // request interception turns the browser's HTTP cache off, so the cache tests skip it
    return { ctx, page, errors, bad };
  };
  const reset = () => { srv.mode = 'ok'; srv.delay = 0; srv.overrides = {}; srv.log = []; };
  const ready = async (page, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await page.evaluate(() => window.loadMapReady)) return true; } catch (e) {} await sleep(100); } return false; };

  // ---- T1: the page loads with numbered URLs, no 404s, no errors
  reset(); let t = await newCtx({ serviceWorkers: 'block' });
  await t.page.goto(ORIGIN + '/'); await ready(t.page); await sleep(500);
  const urls = srv.log.filter(u => /\.(js|css|webmanifest|ico|png)(\?|$)/.test(u));
  const numbered = urls.filter(u => u.includes('?v=' + V)).length;
  ok('T1 page loads with ?v=' + V + ' URLs: no 404s, no JS errors', t.bad.length === 0 && t.errors.length === 0 && numbered >= 22, `${numbered} numbered requests; bad: ${t.bad.join(',')}`);
  await t.ctx.close();

  // ---- T2: WITHOUT the number changing, in separate sessions: a new visit, and a refresh
  reset(); t = await newCtx({ serviceWorkers: 'block', noRoute: true });
  await t.page.goto(ORIGIN + '/'); await ready(t.page);
  srv.overrides['js/geodesy.js'] = geo + '\nwindow.__ver = "new";\n';
  await t.page.goto('about:blank'); await t.page.goto(ORIGIN + '/?visit=2'); await ready(t.page);
  const afterVisit = await t.page.evaluate(() => window.__ver);
  ok('T2 control: with the SAME ?v= number, coming back to the site (new visit or tab restore within 10 minutes) shows the OLD script', afterVisit === undefined, 'window.__ver = ' + afterVisit);
  await t.ctx.close();
  reset(); t = await newCtx({ serviceWorkers: 'block', noRoute: true });
  await t.page.goto(ORIGIN + '/'); await ready(t.page);
  srv.overrides['js/geodesy.js'] = geo + '\nwindow.__ver = "new";\n';
  await t.page.reload(); await ready(t.page);
  const afterReload = await t.page.evaluate(() => window.__ver);
  console.log('  INFO same ?v= number, plain refresh (reload) in this Chrome: shows ' + (afterReload === 'new' ? 'the NEW script (Chrome revalidates on a refresh)' : 'the old script'));
  await t.ctx.close();

  // ---- T3: WITH the number bumped (separate sessions): a new visit gets the new script, and so does a refresh
  for (const kind of ['new visit', 'refresh']) {
    reset(); t = await newCtx({ serviceWorkers: 'block', noRoute: true });
    await t.page.goto(ORIGIN + '/'); await ready(t.page);
    srv.overrides['js/geodesy.js'] = geo + '\nwindow.__ver = "new";\n'; srv.overrides['index.html'] = withV(V + 1);
    if (kind === 'refresh') await t.page.reload(); else { await t.page.goto('about:blank'); await t.page.goto(ORIGIN + '/?visit=2'); }
    await ready(t.page);
    const v = await t.page.evaluate(() => window.__ver);
    ok(`T3 buster: with ?v=${V + 1} in the page, a ${kind} gets the new script`, v === 'new' && t.errors.length === 0, 'window.__ver = ' + v);
    await t.ctx.close();
  }

  // ---- T4: offline cache worker: old versions are cleaned up
  reset(); t = await newCtx();
  await t.page.goto(ORIGIN + '/'); await ready(t.page);
  for (let i = 0; i < 40; i++) { const n = await t.page.evaluate(async () => (await (await caches.open('stratosphere-cache-v1')).keys()).length); if (n >= 24) break; await sleep(250); }
  await t.page.evaluate(async () => { const c = await caches.open('stratosphere-cache-v1'); await c.put(location.origin + '/js/state.js', new Response('// old pre-buster copy')); });   // simulate a leftover from before the buster
  const perPath = async () => t.page.evaluate(async () => { const keys = (await (await caches.open('stratosphere-cache-v1')).keys()).map(r => new URL(r.url)); const m = {}; keys.forEach(u => { (m[u.pathname] = m[u.pathname] || []).push(u.search || '(none)'); }); return m; });
  let m = await perPath();
  ok('T4 first visit: the files are saved under their ?v=' + V + ' URLs', m['/js/geodesy.js'] && m['/js/geodesy.js'].includes('?v=' + V), JSON.stringify(m['/js/geodesy.js']));
  for (const v of [V + 1, V + 2]) {
    srv.overrides['index.html'] = withV(v); await t.page.reload(); await ready(t.page); await sleep(2500);
    m = await perPath();
    const multi = Object.entries(m).filter(([p, s]) => s.length > 1 && p !== '/').map(([p, s]) => p + ' ' + s.join(','));
    ok(`T4 after the bump to ?v=${v}: each file has only its newest saved copy (old versions and the old plain copy are gone)`, multi.length === 0 && m['/js/state.js'].length === 1 && m['/js/state.js'][0] === '?v=' + v && m['/js/geodesy.js'][0] === '?v=' + v, multi.join(' | ') || JSON.stringify(m['/js/state.js']));
  }
  const total = await t.page.evaluate(async () => (await (await caches.open('stratosphere-cache-v1')).keys()).length);
  ok('T4 the number of saved entries does not grow with each build', total <= 34, total + ' entries after two bumps');
  await t.ctx.close();

  // ---- T5: safeguard: page refreshed to the next version in the background (slow server) while scripts are still the current one; then offline -> still loads
  reset(); t = await newCtx();
  await t.page.goto(ORIGIN + '/'); await ready(t.page);
  for (let i = 0; i < 40; i++) { const n = await t.page.evaluate(async () => (await (await caches.open('stratosphere-cache-v1')).keys()).length); if (n >= 24) break; await sleep(250); }
  srv.overrides['index.html'] = withV(V + 1); srv.mode = 'hang'; srv.delay = 4500;
  await t.page.reload(); await ready(t.page, 15000); await sleep(5200);      // the late page answer is saved in the background
  const cachedHtml = await t.page.evaluate(async () => { const r = await (await caches.open('stratosphere-cache-v1')).match(location.origin + '/'); return r ? (await r.text()).includes('?v=' + (V + 1)) : null; });
  srv.mode = 'down'; await t.page.reload(); const up = await ready(t.page, 15000); await sleep(3000);
  const ld = await t.page.evaluate(() => ({ faded: getComputedStyle(document.getElementById('loader-overlay')).opacity === '0', ver: [...document.scripts].map(s => s.src).filter(s => s.includes('geodesy')).join() }));
  ok('T5 saved page now asks for ?v=' + (V + 1) + ' files that are not saved, server down: the app still loads from the older saved files', cachedHtml === true && up && ld.faded && t.errors.length === 0, `html has v81: ${cachedHtml}, ready ${up}, ${ld.ver}, errors: ${t.errors.join('|')}`);
  await t.ctx.close();

  await b.close(); server.close(); console.log(`${pass} passed, ${fail} failed`);
})();
