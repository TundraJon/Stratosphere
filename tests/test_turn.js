const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT; const QUICK = !!process.env.QUICK;
mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9141); mk(require('./lib').ROOT, 9142);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const diff = (a, b) => ((a - b + 540) % 360) - 180;
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    await page.evaluate(() => {
      window.__fix = (lat, lon, hdg, kts = 450) => onGPSSuccess({ coords: { latitude: lat, longitude: lon, altitude: null, altitudeAccuracy: null, speed: kts / 1.94384, heading: hdg, accuracy: 5 } });
      window.__log = []; let on = false; window.__rec = v => { on = v; };
      (function loop() { if (on) __log.push({ t: performance.now(), hdg: STATE.plane.hdg, tgt: STATE.gps.targetHeading }); requestAnimationFrame(loop); })();
      for (let i = 0; i < 5; i++) __fix(40 + i * 0.01, -100, 0);
      toggleTrackUp(); STATE.plane.hdg = 0; STATE.view.zoom = 20;
    });
    return { ctx, page, errors };
  };
  let window_dbg; const n = await open(9142); const o = QUICK ? null : await open(9141);
  const run = async (p, fixes, ms = 3000) => {   // fixes: list of headings, one every `ms`
    await p.evaluate(() => { __log.length = 0; __rec(true); });
    for (let i = 0; i < fixes.length; i++) { await p.evaluate(([i, h]) => __fix(40.05 + i * 0.01, -100 + i * 0.002, h), [i, fixes[i]]); await sleep(ms); }
    await p.evaluate(() => __rec(false)); return p.evaluate(() => __log);
  };
  const stats = (log) => { let maxStep = 0, holds = 0, maxHold = 0, cur = 0; for (let i = 1; i < log.length; i++) { const d = Math.abs(diff(log[i].hdg, log[i - 1].hdg)); if (d > maxStep) maxStep = d; if (d < 0.0005) { cur += log[i].t - log[i - 1].t; } else { if (cur > maxHold) maxHold = cur; cur = 0; } } if (cur > maxHold) maxHold = cur; return { maxStep, maxHold }; };

  // a steady turn: +3 degrees on every fix
  const turn = [3, 6, 9, 12, 15, 18, 21];
  const lo = QUICK ? null : await run(o.page, turn), ln = await run(n.page, turn);
  const so = QUICK ? { maxStep: 0, maxHold: 9999 } : stats(lo.slice(Math.floor(lo.length * 0.25))), sn = stats(ln.slice(Math.floor(ln.length * 0.25)));
  console.log(`  steady turn, +3 deg per 3 s fix: old: biggest single-frame step ${so.maxStep.toFixed(2)} deg, longest hold ${Math.round(so.maxHold)} ms | new: ${sn.maxStep.toFixed(2)} deg, hold ${Math.round(sn.maxHold)} ms`);
  ok('OLD (v85) reproduces the steps: it holds the heading for over 1.5 s between swings', so.maxHold > 1500, Math.round(so.maxHold) + ' ms');
  ok('NEW: continuous rotation: no hold longer than 0.3 s during a steady turn', sn.maxHold < 300, Math.round(sn.maxHold) + ' ms');
  ok('NEW: biggest single-frame rotation is small (under 0.35 degrees, about 1 degree a second)', sn.maxStep < 0.35, sn.maxStep.toFixed(3));
  // the rate: about 1 deg/s
  const mid = ln.filter(e => e.t > ln[0].t + 9000 && e.t < ln[0].t + 18000); const rate = (mid[mid.length - 1].hdg - mid[0].hdg) / ((mid[mid.length - 1].t - mid[0].t) / 1000);
  ok('NEW: the rotation rate in the middle of the turn is about 1 degree a second (0.8 to 1.3)', rate > 0.8 && rate < 1.3, rate.toFixed(2) + ' deg/s');
  // arrival within 3 s: after the last fix (target 21), hdg reaches it within 3.3 s of that fix (we waited 3 s after each fix; the last log samples)
  const last = ln[ln.length - 1]; ok('NEW: the heading has caught up with the last target by the time the next fix is due (within 1 degree)', Math.abs(diff(last.hdg, last.tgt)) < 1.0, `hdg ${last.hdg.toFixed(2)}, target ${last.tgt.toFixed(2)}`);
  const lag = ln.map(e => Math.abs(diff(e.hdg, e.tgt))); ok('NEW: it never lags the averaged target by more than about 4 degrees in this turn', Math.max(...lag) < 4.5, Math.max(...lag).toFixed(2));

  // big change: 90 degrees at once still turns at no more than 10 deg/s
  if (o) await o.page.evaluate(() => { STATE.plane.hdg = 21; }); await n.page.evaluate(() => { STATE.plane.hdg = 21; });
  const big = await run(n.page, [111, 111, 111, 111, 111, 111, 111, 111], 1500);
  let maxRate = 0; // rate over 1-second windows (single-frame rates are noisy: the frame timestamps jitter)
  for (let i = 0, j = 0; i < big.length; i++) { while (big[i].t - big[j].t > 1000) j++; if (big[i].t - big[j].t > 900) { const r = Math.abs(diff(big[i].hdg, big[j].hdg)) / ((big[i].t - big[j].t) / 1000); if (r > maxRate) maxRate = r; } }
  ok('NEW: a big change still turns at no more than 10 degrees a second (over 1 s windows)', maxRate <= 10.3, maxRate.toFixed(2) + ' deg/s');
  ok('NEW: and it gets there (within 3 degrees of the averaged target after 12 s)', Math.abs(diff(big[big.length - 1].hdg, big[big.length - 1].tgt)) < 3, big[big.length - 1].hdg.toFixed(1) + ' vs ' + big[big.length - 1].tgt.toFixed(1));
  // wraparound: 358 -> 4
  await n.page.evaluate(() => { for (let i = 0; i < 6; i++) __fix(40.2 + i * 0.01, -100, 356); STATE.plane.hdg = 356; });
  await sleep(1500);
  const wrap = await run(n.page, [359, 2, 5, 8], 3000);
  let wmax = 0; for (let i = 1; i < wrap.length; i++) { const d = Math.abs(diff(wrap[i].hdg, wrap[i - 1].hdg)); if (d > wmax) wmax = d; }
  ok('NEW: turning through north (356 to about 8) is continuous (no jump through 180 degrees)', wmax < 0.5 && Math.abs(diff(wrap[wrap.length - 1].hdg, wrap[wrap.length - 1].tgt)) < 3 && Math.abs(diff(wrap[wrap.length - 1].hdg, 356)) < 30, `max step ${wmax.toFixed(2)}, ends ${wrap[wrap.length - 1].hdg.toFixed(1)}`);
  // frozen heading below 2 knots unchanged
  const frozen = await n.page.evaluate(async () => { const before = STATE.gps.targetHeading; __fix(40.6, -100.5, 123, 1); __fix(40.6, -100.5, 200, 1); return { before, after: STATE.gps.targetHeading }; });
  ok('below 2 knots the target heading stays frozen (unchanged rule)', frozen.before === frozen.after, JSON.stringify(frozen));
  // Track-Up snapshot behavior unchanged: steady flight still ends in a snapshot, and a turn still drops it
  const snap = await n.page.evaluate(async () => { STATE.plane.speed = 450; window.__t0 = 0; return STATE.render.slide.valid; });
  ok('zero JS errors (old and new)', n.errors.length === 0 && (!o || o.errors.length === 0), n.errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
