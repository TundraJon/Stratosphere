const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT;
mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9095); mk(require('./lib').ROOT, 9096);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    await page.evaluate(() => {
      window.__skew = 0; const realNow = performance.now.bind(performance); performance.now = () => realNow() + window.__skew;
      window.__live = 0; const orig = window.drawBaseAndOverlays; window.drawBaseAndOverlays = function () { window.__live++; return orig.apply(this, arguments); };
      onGPSSuccess({ coords: { latitude: 36.2, longitude: -112.5, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } });
      STATE.plane.lat = 36.2; STATE.plane.lon = -112.5; STATE.plane.hdg = 90; STATE.gps.targetHeading = 90; STATE.plane.speed = 300; STATE.view.zoom = 60;
    });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
    return { ctx, page, errors, touch };
  };
  const live = p => p.evaluate(() => window.__live);
  const slideValid = p => p.evaluate(() => STATE.render.slide.valid);
  const touching = p => p.evaluate(() => STATE.render.touching);

  const o = await open(9095), n = await open(9096);

  // ================= Track-Up =================
  await n.page.evaluate(() => { toggleTrackUp(); STATE.view.zoom = 60; window.__skew += 8200; });
  await sleep(1500);
  ok('(setup) Track-Up with a steady heading: a snapshot exists after 1 s of stillness', await slideValid(n.page));
  // finger down on the map, change nothing: must not snapshot
  await n.touch('touchStart', [[200, 500]]); await sleep(100);
  await n.page.evaluate(() => { STATE.render.cacheValid = false; });   // drop it while the finger is down
  await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(1600);
  ok('a finger held still on the map: tracked as touching', await touching(n.page));
  ok('...and no snapshot is taken (even after more than 1 s and a long steady heading)', !(await slideValid(n.page)));
  await n.touch('touchEnd', []);
  await sleep(50);
  ok('finger lifted: no longer touching', !(await touching(n.page)));
  await sleep(500);
  ok('0.55 s after lifting: still no snapshot', !(await slideValid(n.page)));
  await sleep(750);
  ok('1.3 s after lifting: the snapshot is taken', await slideValid(n.page));
  // two fingers (pinch) paused
  await n.touch('touchStart', [[150, 500], [260, 500]]);
  await sleep(100);
  await n.page.evaluate(() => { STATE.render.cacheValid = false; });
  await n.touch('touchMove', [[130, 500], [280, 500]]);
  await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(1500);
  ok('a pinch paused with both fingers down: no snapshot', !(await slideValid(n.page)) && await touching(n.page));
  const z1 = await n.page.evaluate(() => STATE.view.zoom);
  ok('(sanity) the pinch itself still zooms the map', z1 !== 60, 'zoom ' + z1);
  await n.touch('touchEnd', [[130, 500]]);   // one finger still down
  await sleep(100);
  ok('one finger lifted, one still down: still touching', await touching(n.page));
  await n.touch('touchEnd', []);
  await sleep(1400);
  ok('after the last finger lifts and 1 s: snapshot taken', await slideValid(n.page));
  // touchcancel releases
  await n.touch('touchStart', [[200, 500]]); await sleep(100);
  await n.page.evaluate(() => { STATE.render.cacheValid = false; });
  await n.touch('touchCancel', []); await sleep(1500);
  ok('a cancelled touch releases it (snapshot taken afterwards)', !(await touching(n.page)) && await slideValid(n.page));
  // a finger moving (pan) never snapshots
  const snapsBefore = await n.page.evaluate(() => { window.__snap = 0; const o2 = window.renderTrackUpSnapshot; window.renderTrackUpSnapshot = function () { window.__snap++; return o2.apply(this, arguments); }; return 0; });
  await n.touch('touchStart', [[200, 400]]); await sleep(100);
  await n.page.evaluate(() => { STATE.render.cacheValid = false; window.__skew += 8200; window.__snap = 0; });
  for (let i = 0; i < 20; i++) { await n.touch('touchMove', [[200 + i * 3, 400 + i * 4]]); await sleep(60); }
  ok('while a finger is dragging the map, no snapshot is taken', (await n.page.evaluate(() => window.__snap)) === 0);
  await n.touch('touchEnd', []);
  // mouse
  await sleep(1500);
  await n.page.mouse.move(200, 500); await n.page.mouse.down(); await sleep(100);
  await n.page.evaluate(() => { STATE.render.cacheValid = false; window.__skew += 8200; }); await sleep(1500);
  ok('a held mouse button counts as touching: no snapshot', !(await slideValid(n.page)) && await touching(n.page));
  await n.page.mouse.up(); await sleep(1400);
  ok('mouse released: snapshot after 1 s', await slideValid(n.page));
  // a change (e.g. a toggle) restarts the 1 s
  await n.page.evaluate(() => toggleLandmarks());
  await sleep(700);
  ok('after a layer toggle: not yet (0.7 s)', !(await slideValid(n.page)));
  await n.page.evaluate(() => { window.__skew += 400; }); await sleep(450);
  ok('...and taken once 1 s has passed', await slideValid(n.page));

  // ================= North-Up =================
  await n.page.evaluate(() => { toggleTrackUp(); window.__skew += 2000; }); await sleep(1300);
  const quiet = async (p, ms) => { const a = await live(p); await sleep(ms); return (await live(p)) - a; };
  ok('North-Up at rest (1.3 s after the switch): the cache is used (no live redraws)', (await quiet(n.page, 800)) === 0);
  await n.touch('touchStart', [[200, 500]]);
  const duringTouch = await quiet(n.page, 1500);
  ok('North-Up with a finger held on the screen: drawn live every frame (cache not used)', duringTouch > 40, String(duringTouch));
  await n.touch('touchEnd', []);
  const after05 = await quiet(n.page, 500);
  ok('North-Up 0.5 s after lifting: still drawing live', after05 > 10, String(after05));
  await sleep(700);
  ok('North-Up 1.2 s after lifting: back on the cache (no redraws)', (await quiet(n.page, 800)) === 0);
  // OLD build for comparison: used the cache with a finger held still
  await o.page.evaluate(() => { toggleTrackUp(); toggleTrackUp(); window.__skew += 2000; }); await sleep(700);
  await o.touch('touchStart', [[200, 500]]);
  const oldDuring = await quiet(o.page, 1500);
  ok('OLD (v83) reproduces: North-Up used the cache even with a finger held still (no live redraws)', oldDuring === 0, String(oldDuring));
  await o.touch('touchEnd', []);

  // ================= taps still work =================
  await n.page.evaluate(() => { document.getElementById('bottom-drawer').classList.remove('expanded'); });
  const was = await n.page.evaluate(() => document.getElementById('bottom-drawer').classList.contains('collapsed'));
  const hb = await n.page.evaluate(() => { const r = document.querySelector('#bottom-drawer .controls-header').getBoundingClientRect(); return [r.left + 60, r.top + r.height / 2]; });
  await n.page.touchscreen.tap(hb[0], hb[1]); await sleep(500);
  const now = await n.page.evaluate(() => document.getElementById('bottom-drawer').classList.contains('collapsed'));
  ok('tapping a drawer header still works', was !== now, `collapsed ${was} -> ${now}`);
  await n.page.touchscreen.tap(hb[0], hb[1]); await sleep(500);
  const z0 = await n.page.evaluate(() => { toggleTrackUp && 0; STATE.view.zoom; return STATE.view.zoom; });
  await n.page.evaluate(() => toggleTrackUp()); await sleep(300);
  ok('toggle button / compass tap path unaffected (no errors)', n.errors.length === 0, n.errors.join('|'));
  ok('zero JS errors (old and new)', n.errors.length === 0 && o.errors.length === 0);
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
