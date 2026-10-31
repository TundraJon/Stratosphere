const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const mk = (root, port) => http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(port);
const S = require('./lib').OUT;
const servers = [mk((require('./lib').OLD_DIR || require('./lib').ROOT), 8981), mk(require('./lib').ROOT, 8982)];
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const measure = () => {
  const panel = document.getElementById('airport-popup-panel'), hdr = panel.firstElementChild, btn = hdr.querySelector('button'), title = document.getElementById('airport-popup-title');
  const R = e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom }; };
  const range = document.createRange(); range.selectNodeContents(title); const rects = [...range.getClientRects()];
  return { header: R(hdr), button: R(btn), title: R(title), textRight: Math.max(...rects.map(r => r.right)), lines: new Set(rects.map(r => Math.round(r.top))).size, text: title.textContent };
};
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const open = async (port) => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.25, isMobile: true, hasTouch: true, geolocation: { latitude: 28.5383, longitude: -81.3792 }, permissions: ['geolocation'], serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await page.goto(`http://localhost:${port}/`); await sleep(5500);
    return { ctx, page, errors };
  };
  const isOpen = page => page.evaluate(() => getComputedStyle(document.getElementById('airport-popup-overlay')).display !== 'none');
  const openMco = async page => { await page.evaluate(() => openAirportPopup(AIRPORTS.find(a => a.name.startsWith('KMCO')))); await sleep(900); };

  const o = await open(8981), n = await open(8982);
  await openMco(o.page); await openMco(n.page);
  const mo = await o.page.evaluate(measure), mn = await n.page.evaluate(measure);
  console.log('  old: button x=%s w=%s right=%s | header right=%s h=%s', mo.button.x.toFixed(1), mo.button.w.toFixed(1), mo.button.right.toFixed(1), mo.header.right.toFixed(1), mo.header.h.toFixed(1));
  console.log('  new: button x=%s w=%s h=%s right=%s | header right=%s h=%s', mn.button.x.toFixed(1), mn.button.w.toFixed(1), mn.button.h.toFixed(1), mn.button.right.toFixed(1), mn.header.right.toFixed(1), mn.header.h.toFixed(1));
  ok('button is in the corner: its right edge equals the header right edge', Math.abs(mn.button.right - mn.header.right) < 0.6);
  ok('button is 48 px wide and as tall as the header', Math.abs(mn.button.w - 48) < 0.6 && Math.abs(mn.button.h - mn.header.h) < 1.2, `${mn.button.w.toFixed(1)} x ${mn.button.h.toFixed(1)} vs header ${mn.header.h.toFixed(1)}`);
  ok('header height unchanged by the fix (look does not change)', Math.abs(mn.header.h - mo.header.h) < 0.2, `${mo.header.h.toFixed(2)} -> ${mn.header.h.toFixed(2)}`);
  const glyphCenterFromRight = mn.header.right - (mn.button.x + mn.button.w / 2);
  ok('the × glyph sits within 30 px of the right edge', glyphCenterFromRight <= 30 && glyphCenterFromRight > 0, glyphCenterFromRight.toFixed(1) + ' px');

  // taps
  const mid = { x: mn.title.x + 80, y: mn.header.y + mn.header.h / 2 };
  await n.page.touchscreen.tap(mid.x, mid.y); await sleep(400);
  ok('tapping the middle of the title no longer closes the popup', await isOpen(n.page));
  await n.page.touchscreen.tap(mn.header.right - 24, mn.header.y + mn.header.h / 2); await sleep(400);
  ok('tapping the × closes it', !(await isOpen(n.page)));
  await openMco(n.page);
  await n.page.touchscreen.tap(mn.header.right - 40, mn.header.y + mn.header.h / 2); await sleep(400);
  ok('tapping 40 px from the right edge (inside the bigger area) closes it', !(await isOpen(n.page)));
  await openMco(n.page);
  await n.page.touchscreen.tap(5, 5); await sleep(400);
  ok('tapping outside the popup (the dark overlay) still closes it', !(await isOpen(n.page)));
  await openMco(n.page);
  const pix = await n.page.evaluate(() => { const c = document.getElementById('airport-popup-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < d.length; i += 4 * 97) set.add(d[i] + ',' + d[i+1] + ',' + d[i+2]); return set.size; });
  ok('popup still draws its runways (canvas has more than a flat color)', pix > 6, pix + ' distinct colors sampled');
  await n.page.screenshot({ path: S + '/popup_x_new.png', clip: { x: 0, y: 120, width: 412, height: 140 } });
  await o.page.screenshot({ path: S + '/popup_x_old.png', clip: { x: 0, y: 120, width: 412, height: 140 } });

  // longest airport name: glyph must never overlap the title text
  const longest = await n.page.evaluate(() => AIRPORTS.map(a => a.name).sort((x, y) => formatAirportDisplay(y).length - formatAirportDisplay(x).length)[0]);
  await n.page.evaluate(name => { closeAirportPopup(); openAirportPopup(AIRPORTS.find(a => a.name === name)); }, longest); await sleep(900);
  const ml = await n.page.evaluate(measure);
  const glyphLeft = ml.button.x + ml.button.w / 2 - 7;
  ok('longest airport name never touches the × glyph', ml.textRight < glyphLeft, `"${ml.text}": text ends at ${ml.textRight.toFixed(1)}, glyph starts about ${glyphLeft.toFixed(1)}, ${ml.lines} line(s)`);
  ok('no JS errors (old and new)', n.errors.length === 0 && o.errors.length === 0, n.errors.join('|'));
  await b.close(); servers.forEach(s => s.close()); console.log(`${pass} passed, ${fail} failed`);
})();
