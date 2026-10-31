const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  const send = () => fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } });
  if (process.env.SLOW && pn.endsWith('.js') && pn.startsWith('/js/')) setTimeout(send, 50 + Math.random() * 250); else send(); }).listen(port);
const N = +process.argv[2] || 10, BATCH = 5;
const targets = [['BEFORE the fix (v70)', require('./lib').OLD_DIR, 8961], ['AFTER the fix (working tree)', require('./lib').ROOT, 8962]].filter(t => t[1]);   // the BEFORE run needs OLD_DIR=an older copy
const servers = targets.map(([, r, p]) => mk(r, p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const forceResize = process.env.RESIZE === '1';
  for (const [label, , port] of targets) {
    let errLoads = 0, stuck = 0; const msgs = {};
    for (let done = 0; done < N; done += BATCH) {
      await Promise.all(Array.from({ length: Math.min(BATCH, N - done) }, async () => {
        const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, geolocation: { latitude: 28.5383, longitude: -81.3792 }, permissions: ['geolocation'], serviceWorkers: 'block' });
        const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
        await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
        if (forceResize) await page.addInitScript(() => { let k = 0; const t = setInterval(() => { window.dispatchEvent(new Event('resize')); if (++k > 400) clearInterval(t); }, 2); });
        await page.goto(`http://localhost:${port}/`); await sleep(5500);
        const st = await page.evaluate(() => ({ ready: window.loadMapReady, faded: getComputedStyle(document.getElementById('loader-overlay')).opacity === '0' })).catch(() => ({ ready: false, faded: false }));
        if (errs.length) { errLoads++; errs.forEach(m => msgs[m] = (msgs[m] || 0) + 1); }
        if (!(st.ready && st.faded)) stuck++;
        await ctx.close();
      }));
    }
    console.log(`${label}: errors in ${errLoads} of ${N} loads | stuck loading screen in ${stuck} of ${N}`, JSON.stringify(msgs));
  }
  await b.close(); servers.forEach(s => s.close());
})();
