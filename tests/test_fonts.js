const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const root = require('./lib').ROOT, S = require('./lib').OUT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.txt':'text/plain'};
const server = http.createServer((q, res) => { const p = path.join(root, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(8850);
const ok = (n, v, e='') => console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : ''));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const ctx = await b.newContext({ viewport: {width: 412, height: 915}, geolocation: {latitude: 28.5383, longitude: -81.3792}, permissions: ['geolocation'] });
  const external = [], requests = [], failed = [];
  await ctx.route('**/*', route => { const u = new URL(route.request().url());
    if (u.host !== 'localhost:8850') { external.push(route.request().url()); route.abort(); } else route.continue(); });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => requests.push(r.status() + ' ' + new URL(r.url()).pathname));
  page.on('requestfailed', r => failed.push(r.url()));
  await page.goto('http://localhost:8850/', { waitUntil: 'load' }); await page.waitForTimeout(6000);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [];
    document.fonts.forEach(f => faces.push(`${f.family} ${f.weight} ${f.status}`));
    await Promise.all(['400 16px Antonio', '700 16px Antonio', '400 16px Inter', '600 16px Inter'].map(f => document.fonts.load(f)));
    return { faces, checks: ['400 16px Antonio', '700 16px Antonio', '400 16px Inter', '600 16px Inter'].map(f => document.fonts.check(f)),
      mapReady: window.loadMapReady, usedAntonio: getComputedStyle(document.getElementById('lbl-route')).fontFamily,
      usedInter: getComputedStyle(document.body).fontFamily };
  });
  console.log(JSON.stringify(loaded));
  ok('four font faces declared and loadable (document.fonts.check)', loaded.faces.length === 4 && loaded.checks.every(Boolean));
  ok('page loads, map ready, no JS errors', loaded.mapReady && errors.length === 0, errors.join('|'));
  ok('zero external requests attempted (everything blocked but localhost)', external.length === 0, external.join(' | '));
  ok('zero failed requests', failed.length === 0, failed.join(' | '));
  const fontReqs = requests.filter(r => /woff2/.test(r));
  console.log('font requests:', JSON.stringify(fontReqs));
  ok('fonts served from /fonts/ with 200', fontReqs.length >= 1 && fontReqs.every(r => r.startsWith('200 /fonts/')));
  ok('no request to the old Google link', !requests.some(r => /googleapis|gstatic/.test(r)));
  // look at the real UI: telemetry + settings drawers
  await page.screenshot({ path: S + '/fonts_main.png' });
  await page.evaluate(() => toggleDrawer('bottom-drawer')); await page.waitForTimeout(600);
  await page.screenshot({ path: S + '/fonts_settings.png' });
  await b.close(); server.close();
})();
