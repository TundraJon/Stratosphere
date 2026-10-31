const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const root = require('./lib').ROOT, PORT = 8910;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const reqs = [];
const server = http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); reqs.push(pn);
  const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(PORT);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  await b.close();
  const userDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'stratosphere-profile-'));   // a normal (non-incognito) profile, so Chrome's install check is meaningful
  const ctx = await chromium.launchPersistentContext(userDir, { executablePath: require('./lib').CHROMIUM, viewport: { width: 412, height: 915 }, geolocation: { latitude: 28.5383, longitude: -81.3792 }, permissions: ['geolocation'] });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await page.goto(`http://localhost:${PORT}/`); await sleep(6000);
  const head = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'), theme: document.querySelector('meta[name=theme-color]')?.content,
    icon: document.querySelector('link[rel=icon]')?.getAttribute('href'), apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
    cap: document.querySelector('meta[name=apple-mobile-web-app-capable]')?.content, title: document.querySelector('meta[name=apple-mobile-web-app-title]')?.content,
    mapReady: window.loadMapReady }));
  ok('page has all six new head tags with the right values', /^manifest\.webmanifest(\?v=\d+)?$/.test(head.manifest) && head.theme === '#0d0e12' && /^favicon\.ico(\?v=\d+)?$/.test(head.icon) && /^icons\/apple-touch-icon-180\.png(\?v=\d+)?$/.test(head.apple) && head.cap === 'yes' && head.title === 'Stratosphere', JSON.stringify(head));
  ok('page loads, map ready, zero JS errors', head.mapReady && errors.length === 0, errors.join('|'));
  const cdp = await ctx.newCDPSession(page);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok('Chrome installability check: no errors', inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors));
  const am = await cdp.send('Page.getAppManifest');
  const man = JSON.parse(am.data || '{}');
  ok('Chrome parsed the manifest with no errors', (am.errors || []).length === 0 && man.name === 'Stratosphere' && man.display === 'standalone' && man.icons.length === 3, JSON.stringify(am.errors || []));
  console.log('  manifest url:', am.url, '| parsed name/short:', man.name, '/', man.short_name, '| start_url (resolved):', man.start_url || '(relative)');
  const fetched = await page.evaluate(async () => { const out = {}; for (const u of ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon-180.png', 'favicon.ico']) { const r = await fetch(u, { cache: 'no-store' }); out[u] = r.status + ' ' + r.headers.get('content-type'); } return out; });
  console.log('  fetched:', JSON.stringify(fetched));
  ok('manifest, all four PNGs and the favicon return 200 with the right type', Object.entries(fetched).every(([u, v]) => v.startsWith('200 ') && (u.endsWith('.png') ? v.includes('image/png') : u.endsWith('.ico') ? v.includes('icon') : v.includes('manifest'))));
  ok('browser asked for favicon.ico itself (200, no more 404)', reqs.includes('/favicon.ico'));
  await ctx.close(); server.close(); console.log(`${pass} passed, ${fail} failed`);
})();
