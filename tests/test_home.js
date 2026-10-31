const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const S = require('./lib').OUT; const root = require('./lib').ROOT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server = http.createServer((q, res) => {
  const p = path.join(root, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'text/plain'}); res.end(d); } });
}).listen(8803);
const URL = 'http://localhost:8803/';
const results = [];
const check = (name, ok, extra='') => { results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const browser = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  async function newPage(ctx, errors) {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    return page;
  }
  const state = page => page.evaluate(() => ({
    lat: document.getElementById('input-home-lat').value, lon: document.getElementById('input-home-lon').value,
    show: document.getElementById('chk-home-show').checked,
    sLat: STATE.homeLocation.lat, sLon: STATE.homeLocation.lon, sShow: STATE.homeLocation.show,
    stored: localStorage.getItem('stratosphere.homeLocation')
  }));
  const mk = () => browser.newContext({ viewport: {width: 412, height: 915}, geolocation: {latitude: 28.5383, longitude: -81.3792}, permissions: ['geolocation'] });

  // 1. fresh load, nothing saved
  let ctx = await mk(); let errors = []; let page = await newPage(ctx, errors);
  await page.goto(URL); await page.waitForTimeout(1500);
  let s = await state(page);
  check('fresh: nothing saved, fields empty, no marker state', s.stored === null && s.lat === '' && s.sLat === null && !s.sShow && errors.length === 0);

  // 2. enter + save + reload
  await page.evaluate(() => { document.getElementById('input-home-lat').value = '28.5383'; document.getElementById('input-home-lon').value = '-81.3792'; document.getElementById('chk-home-show').checked = true; handleHomeLocationChange(); });
  s = await state(page);
  check('enter: stored JSON written', s.stored === JSON.stringify({lat:'28.5383', lon:'-81.3792', show:true}), s.stored);
  await page.reload(); await page.waitForTimeout(1500);
  s = await state(page);
  check('reload: fields refilled, STATE restored, marker shown', s.lat === '28.5383' && s.lon === '-81.3792' && s.show && s.sLat === 28.5383 && s.sLon === -81.3792 && s.sShow && errors.length === 0, JSON.stringify(s));
  await page.screenshot({ path: S + '/home_restored.png' });

  // 3. clear -> key removed -> reload restores nothing
  await page.evaluate(() => { document.getElementById('input-home-lat').value = ''; document.getElementById('input-home-lon').value = ''; document.getElementById('chk-home-show').checked = false; handleHomeLocationChange(); });
  s = await state(page);
  check('clear: stored key removed', s.stored === null);
  await page.reload(); await page.waitForTimeout(1500);
  s = await state(page);
  check('reload after clear: nothing restored', s.lat === '' && s.sLat === null && !s.sShow);

  // 4. out-of-range value: restored into the box but no marker
  await page.evaluate(() => { document.getElementById('input-home-lat').value = '200'; document.getElementById('input-home-lon').value = '-81'; document.getElementById('chk-home-show').checked = true; handleHomeLocationChange(); });
  await page.reload(); await page.waitForTimeout(1500);
  s = await state(page);
  check('out-of-range: restored to boxes, STATE lat null (no marker)', s.lat === '200' && s.sLat === null && errors.length === 0, JSON.stringify(s));

  // 5. corrupt saved value
  await page.evaluate(() => localStorage.setItem('stratosphere.homeLocation', '{not json'));
  await page.reload(); await page.waitForTimeout(1500);
  s = await state(page);
  check('corrupt saved value: ignored, no errors', s.lat === '' && s.sLat === null && errors.length === 0);
  await ctx.close();

  // 6. storage blocked entirely
  ctx = await mk(); errors = []; page = await newPage(ctx, errors);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto(URL); await page.waitForTimeout(1500);
  await page.evaluate(() => { document.getElementById('input-home-lat').value = '10'; document.getElementById('input-home-lon').value = '20'; document.getElementById('chk-home-show').checked = true; handleHomeLocationChange(); });
  const blocked = await page.evaluate(() => ({ lat: STATE.homeLocation.lat, lon: STATE.homeLocation.lon, mapReady: window.loadMapReady }));
  check('storage blocked: app loads, home still works in-session, no errors', blocked.mapReady && blocked.lat === 10 && blocked.lon === 20 && errors.length === 0, errors.join('|'));
  await ctx.close();

  await browser.close(); server.close();
  console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
})();
