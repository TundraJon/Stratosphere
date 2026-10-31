const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT; const QUICK = !!process.env.QUICK;
mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9151); mk(require('./lib').ROOT, 9152);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INSTALL = `
  window.__skew = 0; const base0 = performance.now(); performance.now = () => base0 + window.__skew;
  window.__rec = { main: null, popup: null };
  // analyse a glyph draw: diff the canvas before/after the draw call to isolate the plane's own pixels
  window.__analyse = (cv, pre, post, x, y, hdg) => {
    const W = cv.width, H = cv.height, dpr = W / cv.clientWidth; let n = 0, sx = 0, sy = 0; const pts = [];
    for (let i = 0; i < W * H; i++) { const k = i * 4; if (Math.abs(post.data[k] - pre.data[k]) + Math.abs(post.data[k+1] - pre.data[k+1]) + Math.abs(post.data[k+2] - pre.data[k+2]) > 12) { const px = i % W, py = (i / W) | 0; pts.push([px, py]); sx += px; sy += py; n++; } }
    if (n < 30) return { n };
    const cx = sx / n, cy = sy / n; let best = null;
    for (let a = hdg - 6; a <= hdg + 6; a += 0.25) { const r = a * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r); let hit = 0, tot = 0; const set = new Set(pts.map(p => p[0] + ',' + p[1]));
      for (let j = 0; j < pts.length; j += 5) { const px = pts[j][0] - cx, py = pts[j][1] - cy, d = px * ux + py * uy; const rx = Math.round(cx + 2 * d * ux - px), ry = Math.round(cy + 2 * d * uy - py); tot++; if (set.has(rx + ',' + ry)) hit++; }
      if (!best || hit / tot > best[1]) best = [a, hit / tot]; }
    const r = best[0] * Math.PI / 180, vx = Math.cos(r), vy = Math.sin(r); let mn = 1e9, mx = -1e9; for (const [px, py] of pts) { const v = (px - cx) * vx + (py - cy) * vy; if (v < mn) mn = v; if (v > mx) mx = v; }
    return { n, cxCss: cx / dpr, cyCss: cy / dpr, axisDeg: best[0], wingspanCss: (mx - mn) / dpr, dpr };
  };
  const orig = window.drawPlaneGlyph;
  window.drawPlaneGlyph = function (c, x, y, hdg, px) {
    const cv = c.canvas; const which = cv.id === 'airport-popup-canvas' ? 'popup' : (cv.id === 'map-canvas' ? 'main' : null);
    if (!which) return orig.apply(this, arguments);
    const pre = c.getImageData(0, 0, cv.width, cv.height); const r = orig.apply(this, arguments); const post = c.getImageData(0, 0, cv.width, cv.height);
    window.__rec[which] = { x, y, hdg, px, ...window.__analyse(cv, pre, post, x, y, hdg), pre: which === 'popup' ? { w: cv.width, h: cv.height } : null };
    window.__pre = which === 'popup' ? pre : window.__pre; return r;
  };
`;
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    await page.evaluate(() => { onGPSSuccess({ coords: { latitude: 44.88, longitude: -93.22, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } }); STATE.plane.speed = 0; });
    return { ctx, page, errors };
  };
  const n = await open(9152), o = await open(9151);
  await n.page.evaluate(INSTALL);

  // ---------- pure function: centering and axis, at a big size (300 px font), 8 headings ----------
  const fn = await n.page.evaluate(() => {
    const out = []; for (const hdg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const cv = document.createElement('canvas'); cv.width = 900; cv.height = 900; const c = cv.getContext('2d'); const pre = c.getImageData(0, 0, 900, 900);
      drawPlaneGlyph(c, 450, 450, hdg, 300); const post = c.getImageData(0, 0, 900, 900);
      Object.defineProperty(cv, 'clientWidth', { value: 900 }); const a = __analyse(cv, pre, post, 450, 450, hdg);
      out.push({ hdg, dx: +(a.cxCss - 450).toFixed(2), dy: +(a.cyCss - 450).toFixed(2), axis: a.axisDeg, ws: +(a.wingspanCss / 300).toFixed(3) });
    } return out; });
  const worstC = Math.max(...fn.map(f => Math.hypot(f.dx, f.dy))), worstA = Math.max(...fn.map(f => Math.abs(f.axis - f.hdg)));
  ok('drawPlaneGlyph (300 px font): the visible center is within 1.2% of the font size of the point, at all 8 headings', worstC < 300 * 0.012, 'worst ' + worstC.toFixed(2) + ' px of 300 (=' + (worstC / 300 * 100).toFixed(2) + '% of the size)');
  ok('drawPlaneGlyph: the plane\'s axis is within 1 degree of the heading at all 8 headings', worstA <= 1.0, 'worst ' + worstA.toFixed(2));
  ok('drawPlaneGlyph: wingspan is 1.407 times the font size (+-2%)', fn.every(f => Math.abs(f.ws - 1.407) < 0.03), fn.map(f => f.ws).join(','));

  // ---------- main screen ----------
  const mainCase = (trackUp, hdg, mult) => n.page.evaluate(([trackUp, hdg, mult]) => {
    if (trackUp !== STATE.view.trackUp) toggleTrackUp();
    STATE.plane.lat = 39; STATE.plane.lon = -98; STATE.plane.hdg = hdg; STATE.gps.targetHeading = hdg; STATE.plane.speed = 0; STATE.planeSizeMult = mult; STATE.view.zoom = 3;
    if (trackUp) { STATE.view.offsetX = 0; STATE.view.offsetY = 0; } else { const p = project(39, -98); STATE.view.offsetX = -p.x * 3; STATE.view.offsetY = -p.y * 3; }
    STATE.render.cacheValid = false; __rec.main = null; draw(); return __rec.main; }, [trackUp, hdg, mult]);
  for (const trackUp of [false, true]) {
    let worstC = 0, worstA = 0, sizes = [];
    for (const hdg of [0, 45, 90, 135, 180, 225, 270, 315]) { const r = await mainCase(trackUp, hdg, 3); const expectHdg = trackUp ? 0 : hdg + (await n.page.evaluate(() => mapNorthOffsetDeg(-98))); worstC = Math.max(worstC, Math.hypot(r.cxCss - r.x, r.cyCss - r.y)); worstA = Math.max(worstA, Math.abs(r.axisDeg - expectHdg)); }
    for (const m of [1, 2, 3]) { const r = await mainCase(trackUp, 90, m); sizes.push(r.px); }
    const argErr = await n.page.evaluate(() => { const r = __rec.main; const p = project(STATE.plane.lat, STATE.plane.lon); const s = mapToScreen(p.x, p.y); return Math.hypot(r.x - s.x, r.y - s.y); });
    ok(`main screen ${trackUp ? 'Track-Up' : 'North-Up'}: the glyph is drawn exactly at the plane's screen position (same point mapToScreen gives)`, argErr < 0.01, argErr.toFixed(4));
    ok(`main screen ${trackUp ? 'Track-Up' : 'North-Up'} (78 px plane, 8 headings): visible center within 2 px (2.5% of its size) of the plane's position`, worstC <= 2.0, worstC.toFixed(2) + ' px (measured against whatever map colors lie under the plane, so a little coarser than the pure test above)');
    ok(`main screen ${trackUp ? 'Track-Up' : 'North-Up'}: the plane's axis is within 1.5 degrees of its heading${trackUp ? ' (straight up)' : ''}`, worstA <= 1.5, worstA.toFixed(2) + ' deg');
    ok(`main screen ${trackUp ? 'Track-Up' : 'North-Up'}: tap-resize sizes are 26, 52 and 78`, sizes.join() === '26,52,78', sizes.join());
  }
  // old build: the same measurement shows the error the fix removes
  await o.page.evaluate(() => { window.__skew = 0; });
  const oldMain = await o.page.evaluate(() => {
    const cv = document.getElementById('map-canvas'), c = cv.getContext('2d'); const out = [];
    for (const hdg of [0, 90, 180, 270]) { const t = document.createElement('canvas'); t.width = 600; t.height = 600; const x = t.getContext('2d'); x.translate(300, 300); x.rotate((hdg - 48) * Math.PI / 180); x.font = '78px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✈️', 0, 0);
      const d = x.getImageData(0, 0, 600, 600).data; let sx = 0, sy = 0, k = 0; for (let i = 0; i < 360000; i++) if (d[i * 4 + 3] > 40) { sx += i % 600; sy += (i / 600) | 0; k++; } out.push(+Math.hypot(sx / k - 300, sy / k - 300).toFixed(1)); } return out; });
  console.log('  OLD (v86) plane: distance of the visible center from its position at 78 px, headings 0/90/180/270:', oldMain.join(' '), 'px');
  ok('OLD reproduces: the visible center is 10 px or more off the position at 78 px', Math.min(...oldMain) >= 9, oldMain.join());

  // ---------- airport popup ----------
  const openPopup = (rwIdx, reverse, mph, offsetAlong = 0.5) => n.page.evaluate(([rwIdx, reverse, mph, offsetAlong]) => {
    const ap = AIRPORTS.find(a => a.name.startsWith('KMSP')); const rws = AIRPORT_RUNWAYS['KMSP'].runways.filter(r => r.len > 6000); const r = rws[rwIdx % rws.length];
    const [la1, lo1, la2, lo2] = reverse ? [r.lat2, r.lon2, r.lat1, r.lon1] : [r.lat1, r.lon1, r.lat2, r.lon2];
    STATE.plane.lat = la1 + (la2 - la1) * offsetAlong; STATE.plane.lon = lo1 + (lo2 - lo1) * offsetAlong; STATE.plane.hdg = getBearing(la1, lo1, la2, lo2); STATE.gps.targetHeading = STATE.plane.hdg; STATE.plane.speed = mph / 1.15078;
    if (STATE.airportPopup.open) closeAirportPopup(); openAirportPopup(ap); window.__skew += 20000; return { id: r.id, hdg: STATE.plane.hdg, len: r.len }; }, [rwIdx, reverse, mph, offsetAlong]);
  const rec = async () => { await sleep(900); return n.page.evaluate(() => { __rec.popup = null; renderAirportPopup(); return __rec.popup; }); };
  // alignment on the runway: runway band centre from the pre-draw pixels
  const align = () => n.page.evaluate(() => {
    const r = __rec.popup, pre = __pre, W = pre.width, H = pre.height, dpr = W / document.getElementById('airport-popup-canvas').clientWidth;
    const b = r.hdg * Math.PI / 180, dir = [Math.sin(b), -Math.cos(b)], perp = [Math.cos(b), Math.sin(b)];
    const at = (cx, cy) => { const k = (Math.round(cy * dpr) * W + Math.round(cx * dpr)) * 4; return [pre.data[k], pre.data[k + 1], pre.data[k + 2]]; };
    const ref = at(r.x + dir[0] * 90, r.y + dir[1] * 90); const isRw = p => Math.abs(p[0] - ref[0]) + Math.abs(p[1] - ref[1]) + Math.abs(p[2] - ref[2]) < 24;
    let lo = 0, hi = 0; for (let t = 0; t > -80; t -= 0.25) { if (!isRw(at(r.x + perp[0] * t, r.y + perp[1] * t))) break; lo = t; } for (let t = 0; t < 80; t += 0.25) { if (!isRw(at(r.x + perp[0] * t, r.y + perp[1] * t))) break; hi = t; }
    const mid = (lo + hi) / 2, width = hi - lo; const planeAcross = (r.cxCss - r.x) * perp[0] + (r.cyCss - r.y) * perp[1];
    return { runwayWidthPx: +width.toFixed(1), runwayCentreOffsetFromPos: +mid.toFixed(2), planeCentreOffsetFromPos: +planeAcross.toFixed(2), planeVsRunwayCentre: +(planeAcross - mid).toFixed(2), wing: r.wingspanCss, axis: r.axisDeg, hdg: r.hdg, px: r.px, runwayRef: ref.join() }; });
  let worstAlign = 0, worstAxis = 0, widths = [], wings = [], tried = 0;
  for (const [idx, rev, along] of (QUICK ? [[0, false, 0.3], [1, true, 0.7], [2, false, 0.3], [3, true, 0.7], [0, true, 0.3], [1, false, 0.3]] : [[0, false, 0.3], [0, true, 0.3], [1, false, 0.3], [1, true, 0.7], [2, false, 0.3], [2, true, 0.7], [3, false, 0.3], [3, true, 0.7], [0, false, 0.15], [1, false, 0.85], [2, false, 0.15], [3, false, 0.85]])) {
    await openPopup(idx, rev, 40, along); await rec(); const a = await align(); tried++;
    if (Math.abs(a.runwayWidthPx - 60) > 2.5) continue;           // skip spots where another runway or marking merges into the band
    worstAlign = Math.max(worstAlign, Math.abs(a.planeVsRunwayCentre)); worstAxis = Math.max(worstAxis, Math.abs(a.axis - a.hdg)); widths.push(a.runwayWidthPx); wings.push(+a.wing.toFixed(1));
  }
  ok('(setup) at least 6 clean runway spots measured', widths.length >= (QUICK ? 4 : 6), `${widths.length} of ${tried}`);
  console.log('  worst centerline error', worstAlign.toFixed(2), 'px; worst axis error', worstAxis.toFixed(2), 'deg');
  console.log('  runway width seen (px):', widths.join(' '), '| plane wingspan seen (px):', wings.join(' '));
  ok('popup Follow, plane on 8 runway headings: the plane\'s center is within 1 px of the runway centerline (across the runway)', worstAlign <= 1.0, worstAlign.toFixed(2) + ' px');
  ok('popup Follow: the plane\'s axis is within 1.5 degrees of the runway direction', worstAxis <= 1.5, worstAxis.toFixed(2) + ' deg');
  ok('popup Follow on the ground: wingtip to wingtip is 50 px (+-1.5), on a 60 px runway (+-1.5)', wings.every(w => Math.abs(w - 50) <= 1.5) && widths.every(w => Math.abs(w - 60) <= 1.5), `${wings.join()} / ${widths.join()}`);
  ok('popup Follow: the wingtips are about 5 px inside the runway edge on each side (4 to 6 px)', wings.every((w, i) => { const gap = (widths[i] - w) / 2; return gap >= 3.5 && gap <= 6.5; }));

  const ground = 50 / 1.407, air = 100 / 1.407;
  // airborne: speed 170 held, with the fake clock the ease takes 5 s
  await openPopup(0, false, 40); await rec();
  const t0 = await n.page.evaluate(() => { STATE.plane.speed = 170 / 1.15078; window.__skew += 0; renderAirportPopup(); return __rec.popup.px; });
  const sample = async (ms) => n.page.evaluate((ms) => { window.__skew += ms; __rec.popup = null; renderAirportPopup(); return +__rec.popup.px.toFixed(2); }, ms);
  
  const s25 = await sample(2500), s50 = await sample(2500), s60 = await sample(1000);
  ok('popup: starts at the ground size (35.5 px font) when the speed first passes 160 MPH', Math.abs(t0 - ground) < 0.2, t0.toFixed(2));
  ok('popup: the size change is half done after 2.5 s (ease midpoint)', Math.abs(s25 - (ground + air) / 2) < 1.0, s25 + ' vs ' + ((ground + air) / 2).toFixed(2));
  ok('popup: it has reached the airborne size (71.1 px font) after 5 s', Math.abs(s50 - air) < 0.3, s50 + '');
  ok('popup: it stays there', Math.abs(s60 - air) < 0.1);
  await rec(); const wingAir = await n.page.evaluate(() => { __rec.popup = null; renderAirportPopup(); return __rec.popup.wingspanCss; });
  ok('popup Follow in the air: wingtip to wingtip is 100 px (+-2)', Math.abs(wingAir - 100) <= 2, wingAir.toFixed(1));
  // coming back down: 139 MPH, takes 5 s, midpoint at 2.5 s
  await n.page.evaluate(() => { STATE.plane.speed = 139 / 1.15078; renderAirportPopup(); });
  const d25 = await sample(2500), d50 = await sample(2600);
  ok('popup: coming back down (below 140 MPH) it is half way after 2.5 s and at the ground size after 5 s', Math.abs(d25 - (ground + air) / 2) < 1.0 && Math.abs(d50 - ground) < 0.3, d25 + ' / ' + d50);
  // reversal mid-ease
  await n.page.evaluate(() => { STATE.plane.speed = 170 / 1.15078; renderAirportPopup(); }); const r1 = await sample(2500);
  await n.page.evaluate(() => { STATE.plane.speed = 139 / 1.15078; }); const r2 = await sample(10);
  ok('popup: a reversal mid-ease continues from the current size (no jump)', Math.abs(r2 - r1) < 1.0, r1 + ' -> ' + r2);
  // Overview: plane far away, fast: 26 px whatever the speed; then back from a runway to Overview
  await n.page.evaluate(() => { closeAirportPopup(); const ap = AIRPORTS.find(a => a.name.startsWith('KMSP')); STATE.plane.lat = ap.lat + 0.012; STATE.plane.lon = ap.lon + 0.012; STATE.plane.hdg = 200; STATE.plane.speed = 300 / 1.15078; openAirportPopup(ap); window.__skew += 20000; });
  const ov = await rec(); ok('popup Overview, airborne at 300 MPH: the plane is 26 px', ov && Math.abs(ov.px - 26) < 0.05, ov && ov.px.toFixed(2));
  ok('popup Overview: the wingspan is about 36.6 px (26 px font)', ov && ov.wingspanCss > 33 && ov.wingspanCss < 40, ov && ov.wingspanCss.toFixed(1));
  // runway -> Overview: size follows the 0.5 s camera snap
  await openPopup(0, false, 40); await rec();
  await n.page.evaluate(() => { const ap = AIRPORTS.find(a => a.name.startsWith('KMSP')); STATE.plane.lat = ap.lat + 0.012; STATE.plane.lon = ap.lon + 0.012; STATE.plane.speed = 300 / 1.15078; STATE.airportPopup.lockedRunway = null; });
  await sleep(100); const back = await n.page.evaluate(() => { window.__skew += 3000; __rec.popup = null; renderAirportPopup(); return { px: __rec.popup && __rec.popup.px, cam: STATE.airportPopup.cameraBlend }; });
  console.log('  after leaving the runway at speed:', JSON.stringify(back));
  ok('popup: leaving the runway for the Overview brings the plane back to 26 px', back.px && Math.abs(back.px - 26) < 0.3, JSON.stringify(back));

  // ---------- the 140 / 160 MPH hold-in-between rule (carried over from the v81 size test), on a runway in Follow ----------
  const near = (a, b, e = 0.4) => Math.abs(a - b) <= e;
  const px = async (mph, ms) => n.page.evaluate(([mph, ms]) => { window.__skew += ms; STATE.plane.speed = mph / 1.15078; __rec.popup = null; renderAirportPopup(); return __rec.popup ? __rec.popup.px : null; }, [mph, ms]);
  await openPopup(0, false, 40, 0.3); await rec();
  ok('hold rule: 139 MPH ground size', near(await px(139, 6000), ground));
  ok('hold rule: 150 MPH (inside the band, was ground) stays ground', near(await px(150, 6000), ground));
  ok('hold rule: exactly 160 MPH is not yet in the air', near(await px(160, 6000), ground));
  await px(161, 0); ok('hold rule: 161 MPH starts the ease from the ground size', near(await px(161, 0), ground));
  ok('hold rule: 5 s later it is airborne', near(await px(161, 5100), air));
  ok('hold rule: 150 MPH (inside the band, was air) stays airborne', near(await px(150, 6000), air));
  ok('hold rule: exactly 140 MPH stays airborne', near(await px(140, 6000), air));
  let wob = []; for (const m of [159, 161, 159, 161, 159, 161]) wob.push(await px(m, 200));
  ok('hold rule: speed wobbling 159/161 once airborne does not shrink it', wob.every(v => v > air - 0.5), wob.map(v => v.toFixed(1)).join());
  await px(139, 0); ok('hold rule: below 140 MPH it eases back down and is at the ground size after 5 s', near(await px(139, 5100), ground));
  await openPopup(0, false, 300, 0.3); await rec(); ok('opening the popup at 300 MPH on a runway: airborne size at once, no animation', near(await px(300, 0), air, 0.6));
  await openPopup(0, false, 155, 0.3); await rec(); ok('opening at 155 MPH (inside the band) starts airborne with no animation', near(await px(155, 0), air, 0.6));
  await openPopup(0, false, 145, 0.3); await rec(); ok('opening at 145 MPH starts on the ground size', near(await px(145, 0), ground, 0.6));
  ok('zero JS errors', n.errors.length === 0, n.errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
