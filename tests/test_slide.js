const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT;
mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9091); mk(require('./lib').ROOT, 9092);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port, trackUp = true) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    await page.evaluate((tu) => {
      window.__skew = 0; const realNow = performance.now.bind(performance); performance.now = () => realNow() + window.__skew;
      window.__snap = 0; const origSnap = window.renderTrackUpSnapshot; if (origSnap) window.renderTrackUpSnapshot = function () { window.__snap++; return origSnap.apply(this, arguments); };
      window.__live = 0; const orig = window.drawBaseAndOverlays; window.drawBaseAndOverlays = function () { window.__live++; return orig.apply(this, arguments); };
      onGPSSuccess({ coords: { latitude: 36.2, longitude: -112.5, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } });
      STATE.plane.lat = 36.2; STATE.plane.lon = -112.5; STATE.plane.hdg = 90; STATE.gps.targetHeading = 90; STATE.plane.speed = 2000;
      STATE.view.zoom = 60;
      if (tu) toggleTrackUp(); 
      STATE.view.zoom = 60; clampViewOffsets && clampViewOffsets();
    }, trackUp);
    return { ctx, page, errors };
  };
  const live = p => p.evaluate(() => window.__live);
  const sl = p => p.evaluate(() => { const s = STATE.render.slide; return { valid: s.valid, tu: s.wasTrackUp }; });
  const snaps = p => p.evaluate(() => window.__snap);
  const skew = (p, ms) => p.evaluate((m) => { window.__skew += m; }, ms);

  const o = await open(9091), n = await open(9092);
  // ---- redraw counts over 8 s of steady flight (+ 7 s skew so the 6 s hold is met)
  await skew(n.page, 8200); await sleep(1500);
  const o0 = await live(o.page), n0 = await live(n.page);
  await sleep(8000);
  const oc = (await live(o.page)) - o0, nc = (await live(n.page)) - n0;
  console.log(`  base-map redraws in ~8 s of steady Track-Up flight: old(v81) ${oc}, new ${nc}`);
  ok('OLD (v81) reproduces: redraws the base map on (nearly) every frame in Track-Up', oc > 200, String(oc));
  ok('NEW: at most 10 base-map renders (snapshots included) in the same time', nc <= 10, String(nc));
  ok('NEW: a snapshot is active while flying steadily', (await sl(n.page)).valid === true);

  // ---- pixel comparison: sliding frame vs live frame of exactly the same state
  const cmp = async (p) => p.evaluate(() => {
    const grab = () => { const c = document.getElementById('map-canvas'); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
    draw(); const A = grab();
    const s = STATE.render.slide; const wasValid = s.valid; const dyInfo = project(STATE.plane.lat, STATE.plane.lon);
    s.valid = false; s.steadySince = performance.now() + 1e9; draw(); const B = grab();  // forced live frame, no new snapshot
    s.steadySince = performance.now() - 1e9; // allow re-snapshot next frame
    let diff = 0, big = 0, mid = 0, N = A.length / 4;
    for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i]-B[i]), Math.abs(A[i+1]-B[i+1]), Math.abs(A[i+2]-B[i+2])); if (d > 0) diff++; if (d > 60) big++; if (d > 25) mid++; }
    return { wasValid, diffPct: (100 * diff / N).toFixed(2), bigPct: (100 * big / N).toFixed(2), midPct: (100 * mid / N).toFixed(2), moved: Math.hypot(dyInfo.x - s.projX0, dyInfo.y - s.projY0) * STATE.view.zoom };
  });
  await sleep(1200);
  const c1 = await cmp(n.page);
  console.log('  slid frame vs live frame:', JSON.stringify(c1));
  ok('pixel check: the sliding frame was a real slid snapshot that had moved', c1.wasValid && c1.moved > 1, 'moved ' + c1.moved.toFixed(1) + ' px');
  ok('pixel check: fewer than 1.5% of pixels differ by more than 60/255 (and see the 25/255 figure in the log) from a full live redraw', parseFloat(c1.bigPct) < 1.5, c1.bigPct + '%');

  // ---- turning: no snapshot while turning; live drawing; snapshot again after 6 s steady
  await n.page.evaluate(() => { STATE.gps.targetHeading = 200; });
  await sleep(500);
  const turning = await sl(n.page);
  ok('heading drifting > 1 degree throws the snapshot away', turning.valid === false);
  const l0 = await live(n.page); await sleep(900); const l1 = await live(n.page);
  ok('while turning the base map is drawn live every frame (like before)', l1 - l0 > 20, String(l1 - l0));
  await sleep(10000); // 10 s of turning at 10 deg/s covers the 110 degrees
  await n.page.evaluate(() => { window.__skew += 0; });
  const afterTurnA = await n.page.evaluate(() => STATE.plane.hdg);
  ok('(setup) the plane finished turning to ~200', Math.abs(afterTurnA - 200) < 1.5, afterTurnA.toFixed(1));
  await sleep(1500); const st = await sl(n.page);
  ok('right after the turn there is no snapshot yet (heading has not held 6 s)', st.valid === false);
  await skew(n.page, 8200); await sleep(600);
  ok('after the heading has held 6 s a snapshot is taken again', (await sl(n.page)).valid === true);

  // ---- other invalidation triggers
  const trig = async (name, fn, expectInvalid = true) => {
    await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(500);
    const before = (await sl(n.page)).valid;
    await n.page.evaluate(fn);
    await sleep(120);
    const after = (await sl(n.page)).valid;
    ok(`trigger: ${name} drops the snapshot (was ${before}, then ${after})`, before === true && after === false);
    await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(700);
    ok(`   ...and a new snapshot appears after things settle (${name})`, (await sl(n.page)).valid === true);
  };
  await trig('a pan', () => { STATE.view.offsetX += 40; });
  await trig('a zoom', () => { STATE.view.zoom = 55; });
  await trig('the Landmarks layer toggle', () => toggleLandmarks());
  await trig('the day/night switch', () => setDayNightMode(!STATE.dayMode));
  { await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(600); const a = await snaps(n.page); await n.page.evaluate(() => { STATE.render.cacheValid = false; }); await sleep(200); const b2 = await snaps(n.page);
    ok('trigger: an outside "rebuild" request (home location / destination style) makes it render a fresh snapshot', b2 === a + 1, `${a} -> ${b2}`); }
  await trig('the terminator refresh (toggle on, then its 60 s refresh)', () => { toggleTerminator(); });
  await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(600);
  const tv = await n.page.evaluate(() => { const was = STATE.render.slide.valid; _terminatorCacheTime = 0; return was; });
  await sleep(200);
  const tafter = await sl(n.page);
  ok('terminator on: its 60 s refresh expires the snapshot', tv === true && tafter.valid === false);
  // edge margins
  await n.page.evaluate(() => { toggleTerminator(); window.__skew += 8200; }); await sleep(900);
  const jump = async (name, fn) => {
    await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(700);
    const a = await snaps(n.page); await n.page.evaluate(fn); await sleep(200); const b2 = await snaps(n.page);
    ok(`margin: ${name} makes it render a fresh snapshot (${a} -> ${b2})`, b2 === a + 1);
  };
  // heading is 200 now: forward = bearing 200. Move plane sideways (bearing 290) and backward (bearing 20) and ahead (200)
  const mv = (brg, nm) => `(() => { const r = ${brg} * Math.PI / 180, d = ${nm} / 60; STATE.plane.lat += d * Math.cos(r); STATE.plane.lon += d * Math.sin(r) / Math.cos(STATE.plane.lat * Math.PI / 180); })()`;
  await jump('a sideways jump past the 10 px side margin', mv(290, 4));
  await jump('a backward jump past the 10 px margin behind', mv(20, 6));
  await jump('running down the 70 px ahead margin (to under 20% left)', mv(200, 25));
  // small movement keeps it
  await n.page.evaluate(() => { window.__skew += 8200; }); await sleep(700);
  await n.page.evaluate(new Function(mv(200, 1))); await sleep(150);
  ok('a small forward move (about 6 px) keeps the snapshot', (await sl(n.page)).valid === true);

  // ---- North-Up unchanged
  await n.page.evaluate(() => { toggleTrackUp(); window.__skew += 2000; }); await sleep(1200);
  const na = await live(n.page); await sleep(2000); const nb = await live(n.page);
  const st2 = await sl(n.page);
  ok('North-Up: the old 200 ms cache still works (no redraws while still) and the Track-Up snapshot is dropped', nb - na <= 1 && st2.valid === false && st2.tu === false, 'redraws in 2 s: ' + (nb - na));
  await n.page.evaluate(() => toggleTrackUp()); await sleep(300);
  ok('toggling back to Track-Up starts with no stale snapshot', (await sl(n.page)).valid === false);
  ok('zero JS errors (old and new)', n.errors.length === 0 && o.errors.length === 0, n.errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
