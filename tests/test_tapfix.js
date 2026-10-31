const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT; const QUICK = !!process.env.QUICK;
mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9131); mk(require('./lib').ROOT, 9132);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    await page.evaluate(() => { onGPSSuccess({ coords: { latitude: 39.8, longitude: -104.67, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } }); STATE.plane.speed = 0; toggleAirports(); });
    return { ctx, page, errors };
  };
  // place plane `px` pixels "behind" KDEN along the heading; returns where the dot is on screen
  const setup = (p, trackUp, hdg, zoom, px, dest) => p.evaluate(([trackUp, hdg, zoom, px, dest]) => {
    if (trackUp !== STATE.view.trackUp) toggleTrackUp();
    const ap = AIRPORTS.find(a => a.name.startsWith('KDEN')); const d = AIRPORTS.find(a => a.name.startsWith('KCOS')); // destination: a different airport unless asked
    STATE.target = dest ? { lat: ap.lat, lon: ap.lon, name: ap.name } : { lat: d.lat, lon: d.lon, name: d.name };
    const nm = px / (zoom * 0.046991), r = hdg * Math.PI / 180;
    STATE.plane.lat = ap.lat - nm / 60 * Math.cos(r); STATE.plane.lon = ap.lon - nm / 60 * Math.sin(r) / Math.cos(ap.lat * Math.PI / 180);
    STATE.plane.hdg = hdg; STATE.gps.targetHeading = hdg; STATE.plane.speed = 0; STATE.view.zoom = zoom; STATE.planeSizeMult = 1;
    if (trackUp) { STATE.view.offsetX = 0; STATE.view.offsetY = 0; } else { const q = project(ap.lat, ap.lon); STATE.view.offsetX = -q.x * zoom; STATE.view.offsetY = -q.y * zoom; }
    STATE.render.cacheValid = false; draw(); if (STATE.airportPopup.open) closeAirportPopup();
  }, [trackUp, hdg, zoom, px, dest]);
  const dot = p => p.evaluate(() => { const ap = AIRPORTS.find(a => a.name.startsWith('KDEN')); const q = project(ap.lat, ap.lon); const s = mapToScreen(q.x, q.y); return { x: s.x, y: s.y }; });
  const tap = async (p, x, y) => { await p.touchscreen.tap(x, y); await sleep(380); const o = await p.evaluate(() => STATE.airportPopup.open && STATE.airportPopup.rawCode); if (o) await p.evaluate(() => closeAirportPopup()); return o; };

  const n = await open(9132); const o = QUICK ? null : await open(9131);
  const spots = [[12, -3], [24, -4], [40, -4]];
  for (const [label, pg, expectAll] of (QUICK ? [['NEW', n.page, true]] : [['OLD (v84)', o.page, false], ['NEW', n.page, true]])) {
    let allOpen = true, anyFail = false, tried = 0, failed = 0;
    for (const trackUp of [true]) for (const zoom of (QUICK ? [20, 120] : [20, 60, 120])) for (const hdg of (QUICK ? [0, 90, 180, 270] : [0, 45, 90, 135, 180, 225, 270, 315])) {
      await setup(pg, trackUp, hdg, zoom, 90, false); await sleep(900);
      const d = await dot(pg);
      for (const [dx, dy] of spots) { tried++; const r = await tap(pg, d.x + dx, d.y + dy); if (r !== 'KDEN') { failed++; allOpen = false; } }
    }
    if (expectAll) ok(`${label}: Track-Up, 3 spots on the code at 8 headings x zoom 20, 60, 120: every tap opens KDEN`, allOpen, `${tried - failed}/${tried}`);
    else ok(`${label} reproduces: many of the same taps fail`, failed > tried / 3, `${tried - failed}/${tried} opened`);
  }
  // destination pin
  for (const [label, pg, expectAll] of (QUICK ? [['NEW', n.page, true]] : [['OLD (v84)', o.page, false], ['NEW', n.page, true]])) {
    let tried = 0, failed = 0;
    for (const zoom of [20, 120]) for (const hdg of (QUICK ? [90, 270] : [0, 90, 180, 270, 45, 225])) {
      await setup(pg, true, hdg, zoom, 90, true); await sleep(900);
      const d = await dot(pg);
      for (const [dx, dy] of [[12, -3], [24, -5], [40, -5]]) { tried++; const r = await tap(pg, d.x + dx, d.y + dy); if (r !== 'KDEN') failed++; }
    }
    if (expectAll) ok(`${label}: destination pin code in Track-Up, 6 headings x zoom 20, 120: every tap opens`, failed === 0, `${tried - failed}/${tried}`);
    else ok(`${label} reproduces: destination pin taps fail`, failed > 0, `${tried - failed}/${tried} opened`);
  }
  // taps away from the code do not open (NEW)
  let farOpen = 0, farTried = 0;
  for (const hdg of [0, 90, 180, 270]) for (const zoom of [20, 120]) {
    await setup(n.page, true, hdg, zoom, 90, false); await sleep(800); const d = await dot(n.page);
    for (const [dx, dy] of [[90, -3], [-40, -3], [12, 55], [12, -60]]) { farTried++; if ((await tap(n.page, d.x + dx, d.y + dy)) === 'KDEN') farOpen++; }
  }
  ok('NEW: taps 40 to 90 px away from KDEN\'s code never open KDEN (a neighbouring airport\'s own code may open its own popup)', farOpen === 0, `${farOpen}/${farTried} opened`);
  // North-Up unchanged
  let nu = { o: 0, n: 0, t: 0 };
  for (const zoom of (QUICK ? [20, 120] : [20, 60, 120])) for (const [name, pg, key] of (QUICK ? [['new', n.page, 'n']] : [['old', o.page, 'o'], ['new', n.page, 'n']])) {
    await setup(pg, false, 0, zoom, 90, false); await sleep(900); const d = await dot(pg);
    for (const [dx, dy] of spots) { if (name === 'new') nu.t++; if (await tap(pg, d.x + dx, d.y + dy)) nu[key]++; }
  }
  ok('North-Up: all taps open' + (QUICK ? '' : ' (and the same as before)'), (QUICK || nu.o === 9) && nu.n === 3 * (QUICK ? 2 : 3), `old ${nu.o}, new ${nu.n}`);
  // plane tap still wins near the plane (Track-Up: plane is at the screen center; put KDEN's dot 10 px from it)
  await setup(n.page, true, 90, 120, 10, false); await sleep(900);
  const pc = await n.page.evaluate(() => ({ x: innerWidth / 2 + STATE.view.offsetX, y: innerHeight / 2 + STATE.view.offsetY }));
  await n.page.touchscreen.tap(pc.x, pc.y); await sleep(700);
  const pl = await n.page.evaluate(() => ({ mult: STATE.planeSizeMult, open: STATE.airportPopup.open }));
  ok('the plane tap still wins near the plane (icon resized, no popup)', pl.mult === 2 && !pl.open, JSON.stringify(pl));
  ok('zero JS errors (old and new)', n.errors.length === 0 && (!o || o.errors.length === 0), n.errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
