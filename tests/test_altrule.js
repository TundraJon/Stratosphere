const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT;
const servers = [mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9021), mk(require('./lib').ROOT, 9022)];
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, permissions: [], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(4500);
    return { ctx, page, errors };
  };
  // seq items: altitude in FEET (or null) and optional seconds since the previous fix (default 3)
  const run = (page, seq, isNew) => page.evaluate(({ seq, isNew }) => {
    STATE.gps.recentAltitudes = []; STATE.plane.altitude = null; STATE.gps.lastAltitudeAcceptedTime = null; STATE.gps.rawAltitudeLog = [];
    const realNow = Date.now; let t = 1767000000000; const out = []; const texts = [];
    seq.forEach(([ft, dt]) => {
      t += (dt === undefined ? 3 : dt) * 1000; Date.now = () => t;
      onGPSSuccess({ coords: { latitude: 36, longitude: -95, altitude: ft === null ? null : ft / 3.28084, altitudeAccuracy: 10, speed: 230, heading: 270, accuracy: 5 } });
      out.push(isNew ? shownAltitudeFt() : STATE.plane.altitude);
      if (isNew) { updateTelemetryUI(); texts.push(document.getElementById('val-altitude').textContent); }
    });
    // and what the screen shows 61 s after the last fix with no new fixes
    let later = null; if (isNew) { Date.now = () => t + 61000; updateTelemetryUI(); later = document.getElementById('val-altitude').textContent; }
    Date.now = realNow; return { out, texts, later };
  }, { seq, isNew });
  const o = await open(9021), n = await open(9022);
  const both = async (name, seq) => ({ old: (await run(o.page, seq, false)).out, nw: await run(n.page, seq, true) });
  const rep = a => a.map(v => v === null ? '--' : v).join(' ');

  // A steady cruise
  let r = await both('A', [35000, 35010, 35020, 35030, 35040, 35050].map(v => [v]));
  ok('A steady cruise: nothing shown until the 3rd reading, then the median of the newest 3', r.nw.out[0] === null && r.nw.out[1] === null && r.nw.out[2] === 35010 && r.nw.out[5] === 35040, rep(r.nw.out));
  ok('A the on-screen text shows "--" at first and then the value', r.nw.texts[1] === '--' && r.nw.texts[2] === '35,010 ft', r.nw.texts.join(' | '));
  // B single spike
  r = await both('B', [35000, 35010, 35020, 7000, 35030, 35040, 35050].map(v => [v]));
  ok('B one 7,000 ft spike never reaches the screen and the value recovers after 3 good readings', !r.nw.out.includes(7000) && r.nw.out[3] === 35010 && r.nw.out[6] === 35040, 'new: ' + rep(r.nw.out) + '  | old: ' + rep(r.old));
  // C two spikes in a row
  r = await both('C', [35000, 35010, 35020, 7000, 7020, 35030, 35040, 35050].map(v => [v]));
  ok('C two spikes in a row never reach the screen', !r.nw.out.some(v => v !== null && v < 30000), 'new: ' + rep(r.nw.out) + '  | old: ' + rep(r.old));
  // D alternating sources for 90 s
  const alt = []; for (let i = 0; i < 30; i++) alt.push([i % 2 ? 38000 : 7000]);
  r = await both('D', [[35000], [35010], [35020], ...alt]);
  const holdUntil = r.nw.out.slice(3, 3 + 19);   // first ~57 s: held at the last good value
  ok('D alternating 7,000 / 38,000: the last good value is held, then "--" once 60 s pass with nothing accepted', holdUntil.every(v => v === 35010) && r.nw.out[r.nw.out.length - 1] === null, 'new: ' + rep(r.nw.out.slice(0, 26)) + ' ... ' + rep(r.nw.out.slice(-3)));
  const oldSwing = Math.max(...r.old.filter(v => v !== null)) - Math.min(...r.old.filter(v => v !== null));
  console.log(`  INFO alternating case, v76 (old) swung ${oldSwing.toLocaleString()} ft on screen; new swung ${(Math.max(...r.nw.out.filter(v => v !== null)) - Math.min(...r.nw.out.filter(v => v !== null))).toLocaleString()} ft`);
  // E climbs
  const climb = (step, n) => Array.from({ length: n }, (_, i) => [1000 + i * step]);
  r = await both('E1', climb(150, 12));
  ok('E a 3,000 ft/min climb (150 ft per fix) is followed, within one step of the newest reading', r.nw.out[11] !== null && Math.abs(r.nw.out[11] - (1000 + 11 * 150)) <= 150, rep(r.nw.out.slice(-4)));
  r = await both('E2', climb(300, 12));
  ok('E a 6,000 ft/min climb (300 ft per fix) is still followed', r.nw.out[11] !== null && Math.abs(r.nw.out[11] - (1000 + 11 * 300)) <= 300, rep(r.nw.out.slice(-4)));
  r = await both('E3', climb(320, 12));
  ok('E a 6,400 ft/min climb (320 ft per fix, beyond the limit) is held at its first value', r.nw.out.every(v => v === null), rep(r.nw.out));
  // F genuine step to a new level
  r = await both('F', [35000, 35010, 35020, 33000, 33010, 33020].map(v => [v]));
  ok('F a genuine new level is shown after 3 readings at it (held until then)', r.nw.out[3] === 35010 && r.nw.out[4] === 35010 && r.nw.out[5] === 33010, rep(r.nw.out));
  // G missing altitudes and long gaps
  r = await both('G', [[35000], [null], [35010], [null], [35020], [35030]]);
  ok('G fixes with no altitude are skipped; the 3 readings still count', r.nw.out[4] === 35010 && r.nw.out[5] === 35020, rep(r.nw.out));
  r = await both('G2', [[35000], [35010], [35020, 3], [35030, 70], [35040, 3], [35050, 3]]);
  ok('G readings older than 60 s are not counted: after a 70 s gap the screen shows "--" and the count restarts, so 3 new readings are needed', r.nw.out[2] === 35010 && r.nw.out[3] === null && r.nw.out[4] === null && r.nw.out[5] === 35040, rep(r.nw.out));
  // H on-screen text goes back to "--" with no new fixes for 61 s
  r = await both('H', [35000, 35010, 35020].map(v => [v]));
  ok('H the screen shows "--" 61 s after the last accepted update when no new fixes arrive', r.nw.texts[2] === '35,010 ft' && r.nw.later === '--', `later="${r.nw.later}"`);
  ok('zero JS errors (old and new)', n.errors.length === 0 && o.errors.length === 0, n.errors.join('|'));
  await b.close(); servers.forEach(s => s.close()); console.log(`${pass} passed, ${fail} failed`);
})();
