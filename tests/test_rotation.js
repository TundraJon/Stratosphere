// The plane and the Track-Up map use where the plane points ON THE SCREEN (true heading plus the Albers map's north offset).
const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
mk(require('./lib').ROOT, 9181);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await page.goto('http://localhost:9181/'); await sleep(4500);
  await page.evaluate(() => {
    onGPSSuccess({ coords: { latitude: 39, longitude: -98, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } }); STATE.plane.speed = 0;
    window.__args = []; const orig = window.drawPlaneGlyph; window.drawPlaneGlyph = function (c, x, y, hdg, px) { window.__args.push({ id: c.canvas.id, x, y, hdg, px }); return orig.apply(this, arguments); };
    window.__angle = (vx, vy) => Math.atan2(vx, -vy) * 180 / Math.PI;                  // degrees clockwise from screen-up
    window.__dest = (lat, lon, brg, nm) => { const r = brg * Math.PI / 180, d = nm / 60; const la = lat + d * Math.cos(r); return [la, lon + d * Math.sin(r) / Math.cos(((lat + la) / 2) * Math.PI / 180)]; };
  });
  const diff = (a, b) => ((a - b + 540) % 360) - 180;

  // A. the offset function against the projection itself (where "north" really points on the map)
  const A = await page.evaluate(() => [[28.43, -81.31], [33.64, -84.43], [47.45, -122.31], [42.36, -71.0], [44.88, -93.22], [39.86, -104.67]].map(([la, lo]) => { const a = project(la, lo), b = project(la + 0.01, lo); return [la, lo, __angle(b.x - a.x, b.y - a.y), mapNorthOffsetDeg(lo)]; }));
  ok('mapNorthOffsetDeg matches the real direction of north on the map at MCO, ATL, SEA, BOS, MSP and DEN (within 0.1 degree)', A.every(r => Math.abs(r[2] - r[3]) < 0.1), A.map(r => r[3].toFixed(1) + '/' + r[2].toFixed(1)).join(' '));

  // B. airport popup: the plane's on-screen direction equals the runway's on-screen direction at big-offset airports
  for (const code of ['KMCO', 'KATL', 'KSEA', 'KBOS']) {
    const r = await page.evaluate((code) => {
      const ap = AIRPORTS.find(a => a.name.startsWith(code)); const rw = AIRPORT_RUNWAYS[code].runways.slice().sort((x, y) => y.len - x.len)[0];
      const p1 = project(rw.lat1, rw.lon1), p2 = project(rw.lat2, rw.lon2); const runwayScreen = __angle(p2.x - p1.x, p2.y - p1.y);
      STATE.plane.lat = rw.lat1 + (rw.lat2 - rw.lat1) * 0.4; STATE.plane.lon = rw.lon1 + (rw.lon2 - rw.lon1) * 0.4;
      STATE.plane.hdg = getBearing(rw.lat1, rw.lon1, rw.lat2, rw.lon2); STATE.gps.targetHeading = STATE.plane.hdg; STATE.plane.speed = 40 / 1.15078;
      __args.length = 0; if (STATE.airportPopup.open) closeAirportPopup(); openAirportPopup(ap); renderAirportPopup();
      const g = __args.filter(a => a.id === 'airport-popup-canvas').pop(); return { runwayScreen, glyph: g && g.hdg, trueHdg: STATE.plane.hdg, offset: mapNorthOffsetDeg(STATE.plane.lon) };
    }, code);
    ok(`popup at ${code.slice(1)}: the plane points along the runway on the screen (within 0.5 degree; the true heading alone would be ${Math.abs(diff(r.trueHdg, r.runwayScreen)).toFixed(1)} off)`, r.glyph !== undefined && Math.abs(diff(r.glyph, r.runwayScreen)) < 0.5, `plane ${r.glyph && r.glyph.toFixed(1)}, runway ${r.runwayScreen.toFixed(1)}`);
    await page.evaluate(() => closeAirportPopup());
  }

  // C. main screen North-Up: the nose points the way the plane actually moves on the map
  let worstC = 0;
  for (const lon of [-120, -105, -96, -85, -75]) for (const hdg of [20, 100, 200, 300]) {
    const e = await page.evaluate(([lon, hdg]) => {
      if (STATE.view.trackUp) toggleTrackUp(); STATE.plane.lat = 38; STATE.plane.lon = lon; STATE.plane.hdg = hdg; STATE.gps.targetHeading = hdg; STATE.plane.speed = 0; STATE.view.zoom = 5;
      const q = project(38, lon); STATE.view.offsetX = -q.x * 5; STATE.view.offsetY = -q.y * 5; STATE.render.cacheValid = false; __args.length = 0; draw();
      const g = __args.filter(a => a.id === 'map-canvas').pop(); const [la2, lo2] = __dest(38, lon, hdg, 0.5); const a = project(38, lon), b = project(la2, lo2);
      return Math.abs(((g.hdg - __angle(b.x - a.x, b.y - a.y) + 540) % 360) - 180); }, [lon, hdg]);
    worstC = Math.max(worstC, e);
  }
  ok('main screen North-Up: the nose points along the plane\'s movement on the map at 5 longitudes x 4 headings (within 0.8 degree; Albers is not conformal, so about 0.5 degree of local stretch remains)', worstC < 0.8, worstC.toFixed(2) + ' deg');

  // D. Track-Up: the same movement is straight up on the screen; E. the compass still shows true north; F. labels stay upright
  let worstD = 0, worstE = 0, worstF = 0;
  for (const lon of [-120, -105, -85, -75]) for (const hdg of [20, 100, 200, 300]) {
    const r = await page.evaluate(([lon, hdg]) => {
      STATE.plane.lat = 38; STATE.plane.lon = lon; STATE.plane.hdg = hdg; STATE.gps.targetHeading = hdg; STATE.plane.speed = 0; STATE.view.zoom = 5;
      if (!STATE.view.trackUp) toggleTrackUp(); STATE.view.offsetX = 0; STATE.view.offsetY = 0; STATE.render.cacheValid = false; draw();
      const [la2, lo2] = __dest(38, lon, hdg, 0.5); const a = project(38, lon), b = project(la2, lo2); const sa = mapToScreen(a.x, a.y), sb = mapToScreen(b.x, b.y);
      const n2 = project(38.01, lon); const na = mapToScreen(a.x, a.y), nb = mapToScreen(n2.x, n2.y);
      let net = null; const o = window.drawFixedLabel; window.drawFixedLabel = function (p, cb) { const orig = cb; return o.call(this, p, function () { if (net === null) { const m = ctx.getTransform(); net = Math.atan2(m.b, m.a) * 180 / Math.PI; } orig(); }); };
      STATE.toggles.airports = true; STATE.toggles.landmarks = true; STATE.render.cacheValid = false; draw(); window.drawFixedLabel = o;
      return { up: __angle(sb.x - sa.x, sb.y - sa.y), north: __angle(nb.x - na.x, nb.y - na.y), hdg, net }; }, [lon, hdg]);
    worstD = Math.max(worstD, Math.abs(diff(r.up, 0))); worstE = Math.max(worstE, Math.abs(diff(r.north, -r.hdg)));
    if (r.net !== null) worstF = Math.max(worstF, Math.abs(diff(r.net, 0)));
  }
  ok('Track-Up: the plane\'s movement is straight up on the screen at 4 longitudes x 4 headings (within 0.5 degree)', worstD < 0.8, worstD.toFixed(2) + ' deg');
  ok('Track-Up: true north on the screen is still at minus the heading, so the compass arrow is still right (within 0.5 degree)', worstE < 0.5, worstE.toFixed(2) + ' deg');
  ok('Track-Up: labels stay upright (the map\'s rotation and the label\'s counter-rotation cancel, within 0.1 degree)', worstF < 0.1, worstF.toFixed(3) + ' deg');
  ok('zero JS errors', errors.length === 0, errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
