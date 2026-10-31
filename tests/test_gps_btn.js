const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const root = require('./lib').ROOT, S = require('./lib').OUT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server = http.createServer((q, res) => { const p = path.join(root, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'text/plain'}); res.end(d); } }); }).listen(8840);
const ok = (n, v, e='') => console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : ''));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  async function open(opts = {}) {
    const ctx = await b.newContext({ viewport: {width: 412, height: 915}, geolocation: opts.geo === null ? undefined : {latitude: 28.5383, longitude: -81.3792, accuracy: 12.4}, permissions: opts.noPerm ? [] : ['geolocation'] });
    const page = await ctx.newPage(); const errors = []; const dialogs = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { dialogs.push(d.message()); opts.dialog === 'dismiss' ? d.dismiss() : d.accept(); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    if (opts.init) await page.addInitScript(opts.init);
    await page.goto('http://localhost:8840/'); await page.waitForTimeout(5000);
    return { ctx, page, errors, dialogs };
  }
  const snap = page => page.evaluate(() => ({ lat: document.getElementById('input-home-lat').value, lon: document.getElementById('input-home-lon').value,
    show: document.getElementById('chk-home-show').checked, sLat: STATE.homeLocation.lat, sLon: STATE.homeLocation.lon,
    status: document.getElementById('home-gps-status').textContent, disabled: document.getElementById('btn-home-use-gps').disabled,
    stored: localStorage.getItem('stratosphere.homeLocation') }));
  const click = async page => { await page.evaluate(() => document.getElementById('btn-home-use-gps').click()); await page.waitForTimeout(800); };

  // 1. success, no existing home
  let t = await open(); await click(t.page); let s = await snap(t.page);
  ok('success: boxes filled (5 decimals), Show checked, STATE set', s.lat === '28.53830' && s.lon === '-81.37920' && s.show && s.sLat === 28.5383 && s.sLon === -81.3792, JSON.stringify([s.lat, s.lon]));
  ok('success: status shows accuracy, button re-enabled, saved to storage', s.status === 'Home set (accuracy ±12 m)' && !s.disabled && s.stored === JSON.stringify({lat:'28.53830', lon:'-81.37920', show:true}), s.status);
  ok('success: no confirm shown when no home existed, no errors', t.dialogs.length === 0 && t.errors.length === 0, 'dialogs=' + t.dialogs.length + ' errors=' + t.errors.join('|'));
  await t.ctx.close();

  // 2. existing home + decline
  t = await open({ dialog: 'dismiss', init: () => localStorage.setItem('stratosphere.homeLocation', JSON.stringify({lat:'39.7392', lon:'-104.9903', show:true})) });
  await click(t.page); s = await snap(t.page);
  ok('existing home, declined: confirm shown with old + new coords', t.dialogs.length === 1 && /39\.7392, -104\.9903/.test(t.dialogs[0]) && /28\.53830, -81\.37920/.test(t.dialogs[0]) && /±12 m/.test(t.dialogs[0]), t.dialogs[0]);
  ok('existing home, declined: boxes and saved value untouched, status says so', s.lat === '39.7392' && s.lon === '-104.9903' && s.sLat === 39.7392 && s.status === 'Home not changed.' && !s.disabled);
  await t.ctx.close();

  // 3. existing home + accept
  t = await open({ dialog: 'accept', init: () => localStorage.setItem('stratosphere.homeLocation', JSON.stringify({lat:'39.7392', lon:'-104.9903', show:false})) });
  await click(t.page); s = await snap(t.page);
  ok('existing home, accepted: replaced, Show on, saved', s.lat === '28.53830' && s.show && s.sLat === 28.5383 && /28\.53830/.test(s.stored) && s.status === 'Home set (accuracy ±12 m)' && t.errors.length === 0);
  await t.ctx.close();

  // 4. permission denied
  t = await open({ noPerm: true }); await click(t.page); s = await snap(t.page);
  ok('permission denied: message shown, nothing changed', /permission was denied\. Home not changed\./.test(s.status) && s.lat === '' && s.sLat === null && !s.disabled && t.errors.length === 0, s.status);
  await t.ctx.close();

  // 5. position unavailable / timeout / unknown error via mocked API
  for (const [code, re] of [[2, /Position unavailable\. Home not changed\./], [3, /Timed out waiting for a GPS fix\. Home not changed\./]]) {
    t = await open({ init: `navigator.geolocation.getCurrentPosition = (ok, err) => { if (window.__btnMock) err({code:${code}}); else Object.getPrototypeOf(navigator.geolocation).getCurrentPosition.call(navigator.geolocation, ok, err); };` });
    await t.page.evaluate(() => { window.__btnMock = true; }); await click(t.page); s = await snap(t.page);
    ok('error code ' + code + ': message shown, nothing changed', re.test(s.status) && s.lat === '' && !s.disabled, s.status);
    await t.ctx.close();
  }

  // 6. no geolocation support
  t = await open(); await t.page.evaluate(() => { Object.defineProperty(Navigator.prototype, 'geolocation', { get: undefined, configurable: true }); delete Navigator.prototype.geolocation; });
  await click(t.page); s = await snap(t.page);
  ok('no geolocation support: message shown, nothing changed', /not supported/.test(s.status) && s.lat === '' && !s.disabled && t.errors.length === 0, s.status);
  await t.ctx.close();

  // 7. busy state while waiting
  t = await open({ init: `(() => { const real = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation); navigator.geolocation.getCurrentPosition = (ok, err, o) => { if (window.__slow) { setTimeout(() => real(ok, err, o), 1200); } else real(ok, err, o); }; })();` });
  await t.page.evaluate(() => { window.__slow = true; document.getElementById('btn-home-use-gps').click(); });
  await t.page.waitForTimeout(300); s = await snap(t.page);
  ok('while waiting: button disabled, "Locating…" shown', s.disabled && s.status === 'Locating…', s.status);
  await t.page.waitForTimeout(1500); s = await snap(t.page);
  ok('after fix: button re-enabled, home set', !s.disabled && s.sLat === 28.5383);
  await t.ctx.close();

  // 8. app GPS polling unaffected + layout screenshot
  t = await open(); await t.page.evaluate(() => toggleDrawer('bottom-drawer')); await t.page.waitForTimeout(600); await click(t.page);
  const plane = await t.page.evaluate(() => STATE.plane);
  ok('existing GPS polling still drives the plane position', Math.abs(plane.lat - 28.5383) < 0.01 && Math.abs(plane.lon + 81.3792) < 0.01, JSON.stringify([plane.lat, plane.lon]));
  await t.page.screenshot({ path: S + '/gps_button_layout.png' });
  await t.ctx.close();

  await b.close(); server.close();
})();
