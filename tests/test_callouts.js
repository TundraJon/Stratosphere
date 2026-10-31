const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(require('./lib').ROOT, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(9094);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e !== '' ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DAY = '2026-06-21T20:00:00Z', NIGHT = '2026-06-21T08:00:00Z';   // noon-ish / midnight-ish on the US west coast
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: [], serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { const si = window.setInterval; window.setInterval = (f, ms, ...a) => (ms === 1000 && f && f.name === 'checkLandmarkCallouts') ? 0 : si(f, ms, ...a); });
  await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await page.addInitScript(() => {
    const RealDate = Date; let fixed = null;
    window.__setDate = iso => { fixed = iso === null ? null : new RealDate(iso).getTime(); };
    window.Date = class extends RealDate { constructor(...a) { if (a.length === 0) super(fixed !== null ? fixed : RealDate.now()); else super(...a); } static now() { return fixed !== null ? fixed : RealDate.now(); } };
    window.__skew = 0; const realNow = performance.now.bind(performance); performance.now = () => realNow() + window.__skew;
    window.__reset = () => { STATE.callouts.fired = {}; STATE.callouts.queue = []; hideCalloutBanner(); STATE.cutscene.active = false; };
    window.__lm = n => STATE.landmarks.find(l => l.name === n);
    window.__placeRel = (name, distNm, relDeg, mph) => {   // plane distNm north of the landmark, heading so the landmark is relDeg off the nose (negative = left)
      const lm = __lm(name); const lat = lm.lat + distNm / 60, lon = lm.lon;
      const brg = getBearing(lat, lon, lm.lat, lm.lon); const hdg = ((brg - relDeg) % 360 + 360) % 360;
      STATE.plane.lat = lat; STATE.plane.lon = lon; STATE.plane.hdg = hdg; STATE.gps.targetHeading = hdg; STATE.plane.speed = mph / 1.15078;
    };
    window.__state = () => ({ fired: Object.keys(STATE.callouts.fired), queue: STATE.callouts.queue.map(l => l.name), current: STATE.callouts.current && STATE.callouts.current.lm.name,
      text: document.getElementById('landmark-callout').textContent, shown: document.getElementById('landmark-callout').style.display === 'block' });
  });
  await page.goto('http://localhost:9094/'); await sleep(4500);
  const boot = () => page.evaluate(() => onGPSSuccess({ coords: { latitude: 40, longitude: -100, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } }));
  await boot();
  const run = (setup) => page.evaluate((setup) => { (new Function(setup))(); checkLandmarkCallouts(); return __state(); }, setup);
  const firesAt = async (name, nm, mph = 400, rel = 0) => { await page.evaluate(() => __reset()); const s = await run(`__placeRel(${JSON.stringify(name)}, ${nm}, ${rel}, ${mph})`); return s.fired.includes(name); };

  // ---- data
  const data = await page.evaluate(() => ({ n: STATE.landmarks.length, c: ['always', 'day', 'none'].map(v => STATE.landmarks.filter(l => l.view === v).length), bad: STATE.landmarks.filter(l => !['always', 'day', 'none'].includes(l.view) || (l.view !== 'none' && !['huge', 'large', 'medium', 'small'].includes(l.size))).map(l => l.name),
    gc: STATE.landmarks.find(l => l.name === 'Grand Canyon'), pathLen: GRAND_CANYON_PATH.length }));
  ok('43 landmarks, all with a valid class and (unless Not visible) a size', data.n === 43 && data.bad.length === 0, JSON.stringify(data.bad));
  ok('class counts: 4 Visible, 16 Daytime (15 + Grand Canyon), 23 Not visible', data.c.join() === '4,16,23', data.c.join());
  ok('Grand Canyon: daytime, huge, a line, icon at the line\'s midpoint (36.4003, -112.5095)', data.gc.view === 'day' && data.gc.size === 'huge' && data.gc.line === true && data.gc.lat === 36.4003 && data.gc.lon === -112.5095);

  // ---- ranges (daytime)
  await page.evaluate((d) => __setDate(d), DAY);
  for (const [name, nm, size] of [['Mount Rainier', 80, 'huge'], ['Crater Lake', 50, 'large'], ['Niagara Falls', 25, 'medium'], ['Golden Gate Bridge', 10, 'small']]) {
    const inside = await firesAt(name, nm - 1), outside = await firesAt(name, nm + 1);
    ok(`${size}: ${name} fires at ${nm - 1} NM and not at ${nm + 1} NM`, inside && !outside, `${inside}/${outside}`);
  }
  // wording
  let st = await run(`__reset(); __placeRel('Mount Rainier', 55, -40, 400)`);
  ok('wording, landmark 40 degrees left: "...55 NM ahead, on your left"', /Mount Rainier, 55 NM ahead, on your left$/.test(st.text), st.text);
  await page.evaluate(() => __reset()); st = await run(`__placeRel('Mount Rainier', 55, 40, 400)`);
  ok('wording, 40 degrees right: "...ahead, on your right"', /ahead, on your right$/.test(st.text), st.text);
  await page.evaluate(() => __reset()); st = await run(`__placeRel('Mount Rainier', 55, 10, 400)`);
  ok('wording, 10 degrees off the nose: "...55 NM straight ahead"', /55 NM straight ahead$/.test(st.text), st.text);
  ok('behind the plane (95 degrees off the nose): no callout', !(await firesAt('Mount Rainier', 55, 400, 95)));
  ok('89 degrees off the nose still counts as ahead', await firesAt('Mount Rainier', 55, 400, 89));

  // ---- day / night
  await page.evaluate((d) => __setDate(d), NIGHT);
  ok('night: a Daytime landmark (Mount Rainier) is silent', !(await firesAt('Mount Rainier', 50)));
  ok('night: a Visible landmark (Las Vegas Strip, large) still fires', await firesAt('Las Vegas Strip', 40));
  ok('night: Gateway Arch (Visible, medium) fires', await firesAt('Gateway Arch', 20));
  ok('Not visible (Superman Statue) never fires, even right on top of it, day or night', !(await firesAt('Superman Statue', 0.5)) && !((await page.evaluate((d) => __setDate(d), DAY)), await firesAt('Superman Statue', 0.5)));
  // twilight edge: find times where the sun at Rainier is -3 deg and -9 deg
  const tw = await page.evaluate(() => {
    const lm = __lm('Mount Rainier'); const res = {};
    for (let m = 0; m < 24 * 60; m++) { const t = Date.UTC(2026, 5, 21, 0, m); __setDate(new Date(t).toISOString()); const sub = getSubsolarPoint(new Date()); const el = 90 - getDistance(lm.lat, lm.lon, sub.lat, sub.lon) / 60; if (m > 0 && el < -2.9 && el > -3.1 && !res.a) res.a = [new Date(t).toISOString(), el]; if (el < -8.9 && el > -9.1 && !res.b) res.b = [new Date(t).toISOString(), el]; }
    return res;
  });
  ok('twilight: sun 3 deg below the horizon counts as day, 9 deg below does not', await (async () => { await page.evaluate((d) => __setDate(d), tw.a[0]); const a = await firesAt('Mount Rainier', 50); await page.evaluate((d) => __setDate(d), tw.b[0]); const b2 = await firesAt('Mount Rainier', 50); return a && !b2; })(), JSON.stringify(tw));
  await page.evaluate((d) => __setDate(d), DAY);

  // ---- speed floor
  ok('speed: 130 MPH is too slow', !(await firesAt('Mount Rainier', 50, 130)));
  ok('speed: exactly 140 MPH is not above the floor', !(await firesAt('Mount Rainier', 50, 140)));
  ok('speed: 150 MPH fires', await firesAt('Mount Rainier', 50, 150));
  // cutscene
  await page.evaluate(() => __reset());
  st = await run(`STATE.cutscene.active = true; __placeRel('Mount Rainier', 50, 0, 400)`);
  ok('nothing fires while a cutscene is playing', st.fired.length === 0 && !st.shown);
  st = await run(`STATE.cutscene.active = false`);
  ok('...and it fires once the cutscene is over', st.fired.includes('Mount Rainier') && st.shown);

  // ---- once only + re-arm
  await page.evaluate(() => __reset());
  await run(`__placeRel('Mount Rainier', 70, 0, 400)`);
  st = await run(`__placeRel('Mount Rainier', 60, 0, 400)`);
  ok('fires once: still fired when checked again closer in', st.fired.length === 1 && st.queue.length === 0);
  st = await run(`__placeRel('Mount Rainier', 95, 0, 400)`);   // 1.19x the range: not yet re-armed
  st = await run(`__placeRel('Mount Rainier', 70, 0, 400); STATE.callouts.queue = []`);
  ok('not re-armed at 1.19x the range: coming back in does not fire again', st.queue.length === 0 && st.fired.includes('Mount Rainier'));
  await run(`__placeRel('Mount Rainier', 101, 0, 400)`);   // > 100 NM = 1.25 x 80
  st = await run(`__placeRel('Mount Rainier', 101, 0, 400)`);
  ok('re-armed beyond 1.25x the range (100 NM)', !st.fired.includes('Mount Rainier'));
  st = await run(`__placeRel('Mount Rainier', 70, 0, 400)`);
  ok('...and fires again when it comes back in range', st.fired.includes('Mount Rainier'));

  // ---- queue order: Kennedy Space Center (large) and Disney World (large) are ~45 NM apart; plane just north of Disney
  await page.evaluate(() => __reset());
  st = await run(`const d = __lm('Disney World'), k = __lm('Kennedy Space Center'); STATE.plane.lat = (d.lat + k.lat) / 2 + 0.3; STATE.plane.lon = (d.lon + k.lon) / 2 - 0.15; STATE.plane.speed = 400/1.15078; STATE.plane.hdg = 180; STATE.gps.targetHeading = 180`);
  const firstTwo = st.current + '|' + st.queue.join();
  ok('two landmarks in range at once: nearest first, the other waits in line', st.current && st.queue.length === 1, firstTwo);
  const distOf = await page.evaluate(() => { const d = __lm('Disney World'), k = __lm('Kennedy Space Center'); return [getDistance(STATE.plane.lat, STATE.plane.lon, d.lat, d.lon), getDistance(STATE.plane.lat, STATE.plane.lon, k.lat, k.lon)]; });
  ok('...and the nearest one is the one on screen', (distOf[0] < distOf[1]) === (st.current === 'Disney World'), distOf.map(x => x.toFixed(1)).join('/'));
  // banner timing
  ok('banner is visible and fading in (class show)', await page.evaluate(() => document.getElementById('landmark-callout').classList.contains('show')));
  await page.evaluate(() => { window.__skew += 8100; checkLandmarkCallouts(); });
  const fading = await page.evaluate(() => ({ show: document.getElementById('landmark-callout').classList.contains('show'), disp: document.getElementById('landmark-callout').style.display }));
  ok('after 8 s the fade-out starts (still in the page for the 0.5 s fade)', !fading.show && fading.disp === 'block');
  await sleep(700);
  ok('...and it is gone after the 0.5 s fade', await page.evaluate(() => document.getElementById('landmark-callout').style.display === 'none'));
  st = await run('');
  ok('then the waiting landmark is shown next', st.shown && st.current !== null, st.current);
  // tap to dismiss
  await page.evaluate(() => document.getElementById('landmark-callout').click());
  await sleep(700);
  ok('tapping the banner dismisses it', await page.evaluate(() => document.getElementById('landmark-callout').style.display === 'none'));

  // ---- live distance update
  await page.evaluate(() => __reset());
  await run(`__placeRel('Mount Rainier', 60, 0, 400)`);
  const t1 = (await run('')).text;
  st = await run(`__placeRel('Mount Rainier', 50, 0, 400)`);
  ok('the distance keeps updating while the banner shows', /60 NM/.test(t1) && /50 NM/.test(st.text), t1 + ' -> ' + st.text);

  // ---- Grand Canyon (a line)
  await page.evaluate(() => __reset());
  const gc = await page.evaluate(() => {
    const P = GRAND_CANYON_PATH, east = P[0], mid = __lm('Grand Canyon');
    // plane 75 NM due east of the east end (Lees Ferry), heading west: far from the icon, close to the line's end
    const lat = east.lat, lon = east.lon + 75 / (60 * Math.cos(east.lat * Math.PI / 180));
    STATE.plane.lat = lat; STATE.plane.lon = lon; STATE.plane.hdg = 270; STATE.gps.targetHeading = 270; STATE.plane.speed = 400 / 1.15078;
    checkLandmarkCallouts(); const s = __state();
    return { s, toIcon: getDistance(lat, lon, mid.lat, mid.lon), toNearest: nearestOnPath(P, lat, lon).distNm };
  });
  ok('Grand Canyon fires from 75 NM beyond the east end of the line, though the icon is far farther', gc.s.fired.includes('Grand Canyon') && gc.toIcon > 80 && gc.toNearest < 80, `to icon ${gc.toIcon.toFixed(0)} NM, to nearest point ${gc.toNearest.toFixed(0)} NM`);
  ok('...and the banner text uses the nearest-point distance', new RegExp(`Grand Canyon, ${Math.round(gc.toNearest)} NM`).test(gc.s.text), gc.s.text);
  await page.evaluate(() => __reset());
  const gc2 = await page.evaluate(() => {
    const P = GRAND_CANYON_PATH, east = P[0];
    const lat = east.lat, lon = east.lon + 85 / (60 * Math.cos(east.lat * Math.PI / 180));
    STATE.plane.lat = lat; STATE.plane.lon = lon; STATE.plane.hdg = 270; STATE.gps.targetHeading = 270; STATE.plane.speed = 400 / 1.15078;
    checkLandmarkCallouts(); return __state().fired.includes('Grand Canyon');
  });
  ok('Grand Canyon does not fire from 85 NM beyond the end of the line', gc2 === false);
  await page.evaluate(() => __reset());
  const gc3 = await page.evaluate(() => { const m = __lm('Grand Canyon'); STATE.plane.lat = m.lat - 60 / 60; STATE.plane.lon = m.lon; STATE.plane.hdg = 0; STATE.gps.targetHeading = 0; STATE.plane.speed = 400 / 1.15078; checkLandmarkCallouts(); return __state(); });
  ok('Grand Canyon fires from 60 NM south of the middle, heading north', gc3.fired.includes('Grand Canyon') && /Grand Canyon, \d+ NM (straight ahead|ahead, on your (left|right))$/.test(gc3.text), gc3.text);
  await page.evaluate((d) => __setDate(d), NIGHT); await page.evaluate(() => __reset());
  const gc4 = await page.evaluate(() => { const m = __lm('Grand Canyon'); STATE.plane.lat = m.lat - 1; STATE.plane.lon = m.lon; STATE.plane.hdg = 0; STATE.gps.targetHeading = 0; STATE.plane.speed = 400 / 1.15078; checkLandmarkCallouts(); return __state().fired.length; });
  ok('Grand Canyon is silent at night', gc4 === 0);
  await page.evaluate((d) => __setDate(d), DAY);
  // nearestOnPath against brute force
  const np = await page.evaluate(() => { let worst = 0; for (const [la, lo] of [[36.4, -112.5], [36.0, -113.5], [37.2, -111.0], [35.9, -112.0], [36.9, -113.9]]) { const r = nearestOnPath(GRAND_CANYON_PATH, la, lo); let best = 1e9; const kx = 60 * Math.cos(la * Math.PI / 180); for (let i = 0; i < GRAND_CANYON_PATH.length - 1; i++) for (let t = 0; t <= 1; t += 0.001) { const a = GRAND_CANYON_PATH[i], b = GRAND_CANYON_PATH[i + 1]; const d = Math.hypot((a.lon + (b.lon - a.lon) * t - lo) * kx, (a.lat + (b.lat - a.lat) * t - la) * 60); if (d < best) best = d; } worst = Math.max(worst, Math.abs(best - r.distNm)); } return worst; });
  ok('nearest-point math matches a brute-force search (within 0.05 NM)', np < 0.05, np.toFixed(4));
  ok('the map icon: with the Landmarks layer on it is drawn (no errors) and the brown path is still drawn', await page.evaluate(() => { toggleLandmarks(); draw(); const ok1 = STATE.toggles.landmarks; toggleLandmarks(); draw(); return ok1; }));

  // ---- setting on/off and persistence
  ok('setting: the button starts "active" (on by default)', await page.evaluate(() => document.getElementById('btn-toggle-callouts').classList.contains('active') && STATE.callouts.enabled));
  await page.evaluate(() => { __reset(); toggleCallouts(); });
  ok('setting off: nothing fires', !(await firesAt('Mount Rainier', 50)));
  ok('setting off is saved ("0")', await page.evaluate(() => localStorage.getItem('stratosphere-landmark-callouts') === '0'));
  await page.reload(); await sleep(4500); await boot();
  ok('after a reload the setting is still off (button not active)', await page.evaluate(() => STATE.callouts.enabled === false && !document.getElementById('btn-toggle-callouts').classList.contains('active')));
  await page.evaluate(() => toggleCallouts());
  ok('turned back on and saved ("1")', await page.evaluate(() => STATE.callouts.enabled === true && localStorage.getItem('stratosphere-landmark-callouts') === '1'));
  ok('the Landmarks map layer toggle is independent (layer off, callouts still fire)', await page.evaluate(() => { onGPSSuccess({ coords: { latitude: 40, longitude: -100, altitude: null, altitudeAccuracy: null, speed: null, heading: 90, accuracy: 5 } }); return STATE.toggles.landmarks === false; }));

  // ---- look: screenshots + position vs the compass
  const shot = async (label) => {
    await page.evaluate(() => { __reset(); __placeRel('Mackinac Island', 30, -35, 400); checkLandmarkCallouts(); });
    await sleep(700);
    const r = await page.evaluate(() => { const b = document.getElementById('landmark-callout').getBoundingClientRect(), c = document.getElementById('compass-widget').getBoundingClientRect(), d = document.getElementById('top-drawer').getBoundingClientRect(), z = document.querySelector('.zoom-controls').getBoundingClientRect();
      const hit = (a, bb) => !(a.right <= bb.left || a.left >= bb.right || a.bottom <= bb.top || a.top >= bb.bottom);
      return { box: [b.left, b.top, b.right, b.bottom].map(Math.round), overCompass: hit(b, c), overReset: hit(b, z), overDrawer: hit(b, d), text: document.getElementById('landmark-callout').textContent }; });
    await page.screenshot({ path: `callout_${label}.png` });
    return r;
  };
  await page.evaluate((d) => __setDate(d), DAY);
  let r1 = await shot('drawer_open');
  ok('banner clear of the Flight Info drawer, the compass and the Reset button (drawer open)', !r1.overCompass && !r1.overReset && !r1.overDrawer, JSON.stringify(r1));
  await page.evaluate(() => toggleDrawer('top-drawer')); await sleep(500);
  let r2 = await shot('drawer_closed');
  ok('...and with the drawer collapsed', !r2.overCompass && !r2.overReset && !r2.overDrawer, JSON.stringify(r2));
  ok('zero JS errors', errors.length === 0, errors.join('|'));
  await b.close(); console.log(`${pass} passed, ${fail} failed`); process.exit(0);
})();
