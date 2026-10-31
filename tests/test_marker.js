const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const root = require('./lib').ROOT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server = http.createServer((q, res) => { const p = path.join(root, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'text/plain'}); res.end(d); } }); }).listen(8830);
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const run = async (name, init, act) => {
    const ctx = await b.newContext({ viewport: {width: 412, height: 915}, geolocation: {latitude: 28.5383, longitude: -81.3792}, permissions: ['geolocation'] });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    if (init) await page.addInitScript(init);
    await page.goto('http://localhost:8830/'); await page.waitForTimeout(6000);
    if (act) { await page.evaluate(act); await page.waitForTimeout(1500); }
    const pos = await page.evaluate(() => { const p = project(39.7392, -104.9903); return mapToScreen(p.x, p.y); });
    const clip = { x: Math.round(pos.x-40), y: Math.round(pos.y-40), width: 80, height: 80 };
    const img = await page.screenshot({ clip }); await ctx.close();
    return { img, errors };
  };
  const base = await run('none');
  const restored = await run('restore', () => localStorage.setItem('stratosphere.homeLocation', JSON.stringify({lat:'39.7392', lon:'-104.9903', show:true})));
  const typed = await run('typed', null, () => { document.getElementById('input-home-lat').value='39.7392'; document.getElementById('input-home-lon').value='-104.9903'; document.getElementById('chk-home-show').checked=true; handleHomeLocationChange(); });
  const hiddenSaved = await run('saved-but-show-off', () => localStorage.setItem('stratosphere.homeLocation', JSON.stringify({lat:'39.7392', lon:'-104.9903', show:false})));
  const ok = (n, v, e='') => console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? ' ' + e : ''));
  ok('restored on launch: marker drawn (pixels differ from no-home)', !restored.img.equals(base.img) && restored.errors.length === 0);
  ok('typed at runtime: marker drawn without moving the map', !typed.img.equals(base.img) && typed.errors.length === 0);
  ok('restored and typed look the same', restored.img.equals(typed.img));
  ok('saved but "Show" off: no marker', hiddenSaved.img.equals(base.img));
  fs.writeFileSync(require('./lib').OUT + '/marker_restored.png', restored.img);
  await b.close(); server.close();
})();
