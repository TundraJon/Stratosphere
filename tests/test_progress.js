// Altitude is removed, and the Progress gauge card works (start picked from a list, percent of distance, saved 24 hours).
const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('./lib').ROOT, OUT = require('./lib').OUT;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(ROOT, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(9191);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // ---- altitude is gone from the app's own files (the cutscene's PLANE_TOP_ALTITUDE is a screen position, and a comment in callouts.js says it never uses altitude)
  const files = ['index.html', ...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f)];
  const hits = [];
  for (const f of files) fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { if (/altitude/i.test(l) && !/PLANE_TOP_ALTITUDE|top=15 \(altitude\)|phone's altitude \(unreliable\)/.test(l)) hits.push(f + ':' + (i + 1)); });
  ok('no altitude code left in index.html or js/ (apart from the cutscene screen position and one comment)', hits.length === 0, hits.slice(0, 5).join(' '));

  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  const boot = async () => { await page.goto('http://localhost:9191/'); await sleep(4500); await page.evaluate(() => { window.__skewMs = 0; onGPSSuccess({ coords: { latitude: 21.32, longitude: -157.92, speed: 200, heading: 90, accuracy: 5 } }); STATE.plane.speed = 0; }); };
  await boot();

  const dom = await page.evaluate(() => ({ cards: document.querySelectorAll('.telemetry-card').length, alt: !!document.getElementById('val-altitude'), dot: !!document.getElementById('altitude-status-dot'), diag: !!document.getElementById('alt-diag'), labels: [...document.querySelectorAll('.telemetry-label')].map(e => e.textContent.trim()) }));
  ok('the Flight Info grid still has 6 cards: no altitude card, dot or diagnostics group; there is a Progress card', dom.cards === 6 && !dom.alt && !dom.dot && !dom.diag && dom.labels.includes('Progress') && !dom.labels.some(l => /altitude/i.test(l)), dom.labels.join(','));

  // ---- no start set
  const none = await page.evaluate(() => ({ txt: document.getElementById('val-progress').textContent, cap: document.getElementById('lbl-progress').textContent, sel: document.getElementById('sel-start-airport').value }));
  ok('no start set: the card shows -- and "set start", the dropdown reads Not set', none.txt === '--' && none.cap === 'set start' && none.sel === '', JSON.stringify(none));
  const optInfo = await page.evaluate(() => { const o = [...document.getElementById('sel-start-airport').options]; return { n: o.length, first: o[0].textContent, airports: AIRPORTS.length, hnl: o.some(x => /HNL/.test(x.textContent)), mco: o.some(x => /MCO/.test(x.textContent)), sameAsDest: o.length - 1 === document.getElementById('sel-airport').options.length }; });
  ok('Start Airport lists "Not set" first and the same airports as the destination list (including HNL and MCO)', optInfo.first === 'Not set' && optInfo.n === optInfo.airports + 1 && optInfo.hnl && optInfo.mco && optInfo.sameAsDest, JSON.stringify(optInfo));
  await page.evaluate(() => { toggleDrawer('bottom-drawer'); }); await sleep(400);   // make sure it is closed to test the tap
  await page.evaluate(() => { const d = document.getElementById('bottom-drawer'); if (!d.classList.contains('collapsed')) toggleDrawer('bottom-drawer'); }); await sleep(500);
  await page.evaluate(() => document.getElementById('progress-card').click()); await sleep(900);
  const tap = await page.evaluate(() => ({ open: !document.getElementById('bottom-drawer').classList.contains('collapsed'), focus: document.activeElement && document.activeElement.id }));
  ok('tapping the card with no start opens Settings and focuses the Start Airport list', tap.open && tap.focus === 'sel-start-airport', JSON.stringify(tap));

  // ---- percent math: start HNL, destination MCO, the plane at points along the way
  const setStart = (code) => page.evaluate((code) => { const sel = document.getElementById('sel-start-airport'); const o = [...sel.options].find(x => x.textContent.startsWith(code)); sel.value = o.value; handleStartAirportSelect(); }, code);
  const setDest = (code) => page.evaluate((code) => { const sel = document.getElementById('sel-airport'); const o = [...sel.options].find(x => x.textContent.startsWith(code)); sel.value = o.value; handleAirportSelect(); STATE.plane.speed = 0; }, code);
  await setStart('HNL'); await setDest('MCO');
  const at = (frac) => page.evaluate((frac) => {      // a point a fraction of the way along the great circle from the start to the destination
    const s = STATE.trip.start, t = STATE.target, d2r = Math.PI / 180;
    const v = (la, lo) => [Math.cos(la * d2r) * Math.cos(lo * d2r), Math.cos(la * d2r) * Math.sin(lo * d2r), Math.sin(la * d2r)];
    const a = v(s.lat, s.lon), c = v(t.lat, t.lon); const om = Math.acos(a[0] * c[0] + a[1] * c[1] + a[2] * c[2]);
    const k1 = Math.sin((1 - frac) * om) / Math.sin(om), k2 = Math.sin(frac * om) / Math.sin(om);
    const p = [k1 * a[0] + k2 * c[0], k1 * a[1] + k2 * c[1], k1 * a[2] + k2 * c[2]];
    STATE.plane.lat = Math.atan2(p[2], Math.hypot(p[0], p[1])) / d2r; STATE.plane.lon = Math.atan2(p[1], p[0]) / d2r; STATE.plane.speed = 0;
    draw(); const dash = parseFloat(document.getElementById('progress-fill').style.strokeDasharray); return { txt: document.getElementById('val-progress').textContent, cap: document.getElementById('lbl-progress').textContent, dash, arc: 2 * Math.PI * 18 * 240 / 360 };
  }, frac);
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const r = await at(f); const pct = parseInt(r.txt);
    ok(`HNL to MCO at ${f * 100}% of the way: the card says ${f * 100}% (within 1) and the arc matches`, Math.abs(pct - f * 100) <= 1 && Math.abs(r.dash / r.arc - f) < 0.02 && r.cap === 'complete', JSON.stringify(r));
  }
  const behind = await page.evaluate(() => { STATE.plane.lat = -30; STATE.plane.lon = 150; STATE.plane.speed = 0; draw(); return document.getElementById('val-progress').textContent; });
  const beyond = await page.evaluate(() => { STATE.plane.lat = 28.43; STATE.plane.lon = -81.31; draw(); return document.getElementById('val-progress').textContent; });
  ok('past either end the percent is held to 0 and 100', behind === '0%' && beyond === '100%', behind + ' / ' + beyond);
  // an east-to-west and a mid-trip stop: changing the destination recalculates from the same start
  await at(0.5); await setDest('ATL');
  const dChange = await page.evaluate(() => { draw(); const s = STATE.trip.start, t = STATE.target; const total = getDistance(s.lat, s.lon, t.lat, t.lon), rem = getDistance(STATE.plane.lat, STATE.plane.lon, t.lat, t.lon); return { txt: document.getElementById('val-progress').textContent, expect: Math.round(Math.max(0, Math.min(100, (1 - rem / total) * 100))), start: s.name }; });
  ok('changing the destination recalculates from the same start point', parseInt(dChange.txt) === dChange.expect && /HNL/.test(dChange.start), JSON.stringify(dChange));
  await setDest('MCO');
  // start equal to the destination: no division by zero
  await setStart('MCO'); const same = await page.evaluate(() => { draw(); return [document.getElementById('val-progress').textContent, document.getElementById('lbl-progress').textContent]; });
  ok('start the same as the destination: shows -- and "waiting", no errors', same[0] === '--' && same[1] === 'waiting', same.join(' '));
  await setStart('HNL'); await at(0.4);

  // ---- saved for 24 hours
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stratosphere.tripStart')));
  ok('picking a start saves its name and the time', stored && /HNL/.test(stored.name) && Math.abs(stored.time - Date.now()) < 5000, JSON.stringify(stored));
  await page.reload(); await sleep(4500);
  const re1 = await page.evaluate(() => ({ sel: document.getElementById('sel-start-airport').selectedOptions[0].textContent, start: STATE.trip.start && STATE.trip.start.name }));
  ok('after a reload the pick is back (dropdown and start)', /HNL/.test(re1.sel) && /HNL/.test(re1.start || ''), JSON.stringify(re1));
  for (const [hours, expectKept] of [[23, true], [25, false]]) {
    await page.evaluate((h) => { const o = JSON.parse(localStorage.getItem('stratosphere.tripStart')) || { name: 'KHNL (Honolulu, HI)' }; o.time = Date.now() - h * 3600000; localStorage.setItem('stratosphere.tripStart', JSON.stringify(o)); }, hours);
    await page.reload(); await sleep(4500);
    const r = await page.evaluate(() => ({ start: STATE.trip.start && STATE.trip.start.name, sel: document.getElementById('sel-start-airport').value, key: localStorage.getItem('stratosphere.tripStart') }));
    ok(`a start picked ${hours} hours ago is ${expectKept ? 'still there' : 'ignored and cleared'}`, expectKept ? !!r.start : (!r.start && r.sel === '' && r.key === null), JSON.stringify(r));
    if (expectKept) { await page.evaluate(() => { const sel = document.getElementById('sel-start-airport'); const o = [...sel.options].find(x => x.textContent.startsWith('HNL')); sel.value = o.value; handleStartAirportSelect(); }); }
  }
  // expiry while the app stays open (clock moved on 25 hours)
  await page.evaluate(() => { const sel = document.getElementById('sel-start-airport'); const o = [...sel.options].find(x => x.textContent.startsWith('HNL')); sel.value = o.value; handleStartAirportSelect(); });
  await page.evaluate(() => { STATE.trip.start.time -= 25 * 3600000; draw(); });
  ok('while the app stays open, a start older than 24 hours is dropped (card back to --, "set start")', await page.evaluate(() => !STATE.trip.start && document.getElementById('val-progress').textContent === '--' && document.getElementById('lbl-progress').textContent === 'set start'));
  // picking again restarts the 24 hours
  await page.evaluate(() => { const sel = document.getElementById('sel-start-airport'); const o = [...sel.options].find(x => x.textContent.startsWith('LAX')); sel.value = o.value; handleStartAirportSelect(); });
  ok('picking again restarts the 24 hours', await page.evaluate(() => Math.abs(JSON.parse(localStorage.getItem('stratosphere.tripStart')).time - Date.now()) < 5000));
  await page.evaluate(() => { const sel = document.getElementById('sel-start-airport'); sel.value = ''; handleStartAirportSelect(); });
  ok('choosing "Not set" clears the start and the saved copy', await page.evaluate(() => !STATE.trip.start && localStorage.getItem('stratosphere.tripStart') === null));

  // ---- look: fits the card in both modes
  await page.evaluate(() => { onGPSSuccess({ coords: { latitude: 33, longitude: -125, speed: 200, heading: 70, accuracy: 5 } }); });
  await page.evaluate(() => { const sel = document.getElementById('sel-start-airport'); const o = [...sel.options].find(x => x.textContent.startsWith('HNL')); sel.value = o.value; handleStartAirportSelect(); STATE.plane.lat = 33; STATE.plane.lon = -125; STATE.plane.speed = 0; draw(); if (document.getElementById('top-drawer').classList.contains('collapsed')) toggleDrawer('top-drawer'); });
  await sleep(1200);
  for (const day of [false, true]) {
    await page.evaluate((d) => setDayNightMode(d), day); await sleep(900);
    const fit = await page.evaluate(() => { const c = document.getElementById('progress-card').getBoundingClientRect(), r = document.querySelector('.progress-row').getBoundingClientRect(), t = document.getElementById('val-progress').getBoundingClientRect(), g = document.getElementById('progress-gauge').getBoundingClientRect(); const grid = document.querySelector('.grid-3x2').getBoundingClientRect(); return { cardW: Math.round(c.width), rowRight: Math.round(r.right), cardRight: Math.round(c.right), textRight: Math.round(t.right), gaugeW: Math.round(g.width), gridRight: Math.round(grid.right), fill: getComputedStyle(document.getElementById('progress-fill')).stroke, plane: getComputedStyle(document.querySelector('.gauge-plane')).fill }; });
    ok(`${day ? 'day' : 'night'} mode: the gauge and its text fit inside the card (card ${fit.cardW} px)`, fit.textRight <= fit.cardRight + 1 && fit.rowRight <= fit.cardRight + 1, JSON.stringify(fit));
    const pl = await page.evaluate(() => { const bb = document.querySelector('.gauge-plane').getBBox(); const m = document.querySelector('.gauge-plane').getCTM(); const ctm = document.getElementById('progress-gauge').getScreenCTM(); return { w: bb.width, h: bb.height, scale: Math.hypot(m.a, m.b) / Math.hypot(ctm.a, ctm.b) }; });
    ok(`${day ? 'day' : 'night'} mode: the gauge plane is drawn at 0.93 scale (1.5 times the old 0.62) and fits inside the arc opening`, Math.abs(pl.scale - 0.93) < 0.01 && Math.max(pl.w, pl.h) * 0.93 < 2 * (18 - 2.25) - 4, JSON.stringify(pl));
    const el = await page.$('#top-drawer'); await el.screenshot({ path: path.join(OUT, `progress_${day ? 'day' : 'night'}.png`) });
  }
  ok('zero JS errors', errors.length === 0, errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
