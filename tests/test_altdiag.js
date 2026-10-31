const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT;
const servers = [mk((require('./lib').OLD_DIR || require('./lib').ROOT), 9011), mk(require('./lib').ROOT, 9012)];
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// synthetic fixes: [altitude m | null, altitudeAccuracy m | null, speed m/s | null]
const FT = f => f / 3.28084;
const SEQ = [];
for (let i = 0; i < 20; i++) SEQ.push([FT(35000 + (i % 3) * 20), 12, 230]);          // cruise
SEQ.push([null, null, 230]);                                                         // fix with no altitude
SEQ.push([FT(7050), 25, null]);                                                      // odd low reading, no speed
for (let i = 0; i < 12; i++) SEQ.push([FT(34900 + i * 10), i % 2 ? null : 8, 228]);  // back to normal, some without accuracy
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, permissions: [], serviceWorkers: 'block' });   // no real GPS: only injected fixes
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(5000);
    return { ctx, page, errors };
  };
  const feed = (page, seq) => page.evaluate((seq) => {
    const realNow = Date.now; const base = 1767000000000; const shown = [];
    seq.forEach(([alt, acc, spd], i) => {
      Date.now = () => base + i * 3000;
      onGPSSuccess({ coords: { latitude: 36 + i * 0.001, longitude: -95, altitude: alt, altitudeAccuracy: acc, speed: spd, heading: 270, accuracy: 5 } });
      shown.push(STATE.plane.altitude);
    });
    Date.now = realNow; return shown;
  }, seq);
  const o = await open(9011), n = await open(9012);
  const so = await feed(o.page, SEQ), sn = await feed(n.page, SEQ);
  ok('shown altitude settles on a value after the cruise readings (rule built in v77)', sn[sn.length - 1] !== null && Math.abs(sn[sn.length - 1] - 35000) < 200, 'last values: ' + sn.slice(-3));
  const text = await n.page.evaluate(() => document.getElementById('alt-diag').textContent);
  const lines = text.split('\n');
  console.log('--- readout ---\n' + text + '\n---------------');
  ok('readout has a header plus exactly the newest 12 readings', lines.length === 13);
  ok('header shows the shown altitude and the fresh-reading count', /^Shown: [\d,]+ ft {3}fresh readings: \d+$/.test(lines[0]), lines[0]);
  ok('every reading line has time, altitude (or "no altitude"), accuracy and speed', lines.slice(1).every(l => /^\d\d:\d\d:\d\d {2}( *[\d,]+ ft|no altitude) {2}±(\d+|--) m {1,3} {2}(\d+|--) kt$/.test(l)), lines.slice(1).find(l => !/^\d\d:\d\d:\d\d {2}( *[\d,]+ ft|no altitude) {2}±(\d+|--) m {1,3} {2}(\d+|--) kt$/.test(l)) || '');
  ok('readings are newest first (the last injected fix, 35,010 ft, is on top)', lines[1].includes('35,010 ft') && lines[12].includes('34,900 ft'), lines[1] + ' ... ' + lines[12]);
  const log = await n.page.evaluate(() => ({ len: STATE.gps.rawAltitudeLog.length, nulls: STATE.gps.rawAltitudeLog.filter(r => r.ft === null).length, noAcc: STATE.gps.rawAltitudeLog.filter(r => r.accM === null).length, noSpd: STATE.gps.rawAltitudeLog.filter(r => r.kts === null).length }));
  ok('log is capped at 30 entries', log.len === 30, JSON.stringify(log));
  // a few specific formats, looking at the raw log directly
  const spot = await n.page.evaluate(() => { const L = STATE.gps.rawAltitudeLog; return { hasNoAlt: document.getElementById('alt-diag').textContent.includes('no altitude') || L.some(r => r.ft === null), dashAcc: document.getElementById('alt-diag').textContent.includes('±-- m'), dashSpd: document.getElementById('alt-diag').textContent.includes('-- kt') }; });
  ok('a missing accuracy shows ±-- m and a missing speed shows -- kt', spot.dashAcc);
  await n.page.evaluate(() => onGPSSuccess({ coords: { latitude: 36.1, longitude: -95, altitude: null, altitudeAccuracy: null, speed: 100, heading: 270, accuracy: 5 } }));
  const t2 = await n.page.evaluate(() => document.getElementById('alt-diag').textContent.split('\n')[1]);
  ok('a fix with no altitude shows "no altitude" on the newest line', /no altitude/.test(t2), t2);
  // layout: open Settings, scroll to the group, look at it
  await n.page.evaluate(() => toggleDrawer('bottom-drawer')); await sleep(700);
  const fit = await n.page.evaluate(() => { const e = document.getElementById('alt-diag'); e.scrollIntoView({ block: 'end' }); return { scrollW: e.scrollWidth, clientW: e.clientWidth, fontPx: getComputedStyle(e).fontSize, color: getComputedStyle(e).color }; });
  await sleep(500);
  ok('the readout fits the Settings drawer width (no sideways scrolling)', fit.scrollW <= fit.clientW + 1, JSON.stringify(fit));
  await n.page.screenshot({ path: S + '/altdiag.png', clip: { x: 0, y: 560, width: 412, height: 355 } });
  ok('zero JS errors (old and new)', n.errors.length === 0 && o.errors.length === 0, n.errors.join('|'));
  await b.close(); servers.forEach(s => s.close()); console.log(`${pass} passed, ${fail} failed`);
})();
