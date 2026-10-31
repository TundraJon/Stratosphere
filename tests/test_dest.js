const { chromium } = require('./lib').playwright;
const http = require('http'), fs = require('fs'), path = require('path');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const root = require('./lib').ROOT;
const server = http.createServer((q, res) => { const pn = decodeURIComponent(q.url.split('?')[0]); const p = path.join(root, pn === '/' ? 'index.html' : pn);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, {'content-type': types[path.extname(p)]||'application/octet-stream'}); res.end(d); } }); }).listen(8991);
let pass = 0, fail = 0; const ok = (n, v, e = '') => { if (!require('./lib').OLD_DIR && /^OLD\b/.test(n)) { console.log('SKIP ' + n); return; } v ? pass++ : fail++; console.log((v ? 'PASS ' : 'FAIL ') + n + (e ? '  ' + e : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = 'stratosphere.destination';
(async () => {
  const b = await chromium.launch({ executablePath: require('./lib').CHROMIUM });
  const mkctx = () => b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, geolocation: { latitude: 28.5383, longitude: -81.3792 }, permissions: ['geolocation'] });
  const load = async (ctx, init) => { const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.route(/^https?:\/\/(?!localhost)/, r => r.abort()); if (init) await page.addInitScript(init); await page.goto('http://localhost:8991/'); await sleep(5500); return { page, errors }; };
  const snap = page => page.evaluate(() => ({ selName: (() => { try { return JSON.parse(document.getElementById('sel-airport').value).name; } catch (e) { return null; } })(), selText: document.getElementById('sel-airport').selectedOptions[0]?.textContent, code: document.getElementById('lbl-route-code').textContent, target: STATE.target.name, tlat: STATE.target.lat, speed: STATE.plane.speed, locked: STATE.runwayLocked, stored: localStorage.getItem('stratosphere.destination') }));

  // pick a different destination from the real list
  let ctx = await mkctx(); let { page, errors } = await load(ctx);
  const alt = await page.evaluate(() => { const a = AIRPORTS.find(x => x.name.includes('Denver')) || AIRPORTS.find(x => !x.name.includes('Orlando')); return { name: a.name, value: JSON.stringify({ lat: a.lat, lon: a.lon, name: a.name }), code: formatAirportDisplay(a.name).split(' ')[0] }; });
  let s = await snap(page);
  ok('T1 fresh profile: starts on KMCO, nothing saved', s.target.startsWith('KMCO') && s.code === 'MCO' && s.stored === null && /MCO/.test(s.selText), JSON.stringify(s));
  const spdAtPick = await page.evaluate(v => { const sel = document.getElementById('sel-airport'); sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); return STATE.plane.speed; }, alt.value);   // read in the same instant as the pick, so a GPS fix can't reset it first
  await sleep(300);
  s = await snap(page);
  ok('T2 picking another destination saves its name', s.stored === alt.name && s.target === alt.name && spdAtPick === 460, `${alt.name} | speed at the moment of picking = ${spdAtPick}`);
  await page.reload(); await sleep(5500); s = await snap(page);
  ok('T2 after a reload the dropdown, "EN ROUTE TO" and the target all show the saved destination', s.selName === alt.name && s.code === alt.code && s.target === alt.name, JSON.stringify(s));
  ok('T2 restore does not do what picking does (plane speed is not set to 460)', s.speed !== 460, 'speed=' + s.speed);
  ok('T2 no JS errors', errors.length === 0, errors.join('|'));
  // a second reload still holds it, and picking MCO again saves MCO
  await page.selectOption('#sel-airport', { index: 0 }); await sleep(300); const first = await snap(page);
  await page.reload(); await sleep(5500); s = await snap(page);
  ok('T2b changing the destination again replaces the saved one', s.target === first.target && s.stored === first.target, `${first.target} -> ${s.target}`);
  await ctx.close();

  // saved name no longer in the list / garbage
  for (const [label, val] of [['T3 a saved airport that is not in the list', 'KXXX (Nowhere, ZZ)'], ['T4 a corrupt saved value', '{"name": [broken']]) {
    ctx = await mkctx(); ({ page, errors } = await load(ctx, `localStorage.setItem('${KEY}', ${JSON.stringify(val)});`)); s = await snap(page);
    ok(label + ': falls back to KMCO, no errors', s.target.startsWith('KMCO') && s.code === 'MCO' && errors.length === 0, JSON.stringify([s.target, errors.join('|')]));
    await ctx.close();
  }

  // storage blocked
  ctx = await mkctx(); ({ page, errors } = await load(ctx, `Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });`));
  const ready = await page.evaluate(() => window.loadMapReady);
  await page.selectOption('#sel-airport', { value: alt.value }); await sleep(400);
  const inSession = await page.evaluate(() => STATE.target.name);
  ok('T5 storage blocked: app loads, picking a destination still works for the session, no errors', ready && inSession === alt.name && errors.length === 0, errors.join('|'));
  await ctx.close();

  // T6: look only at the cached map layer (no plane in it): is it identical to a forced full rebuild?
  const cacheHash = pg => pg.evaluate(() => { const c = STATE.render.cacheCanvas; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 37) h = (h * 31 + d[i]) | 0; return h; });
  const rebuild = async pg => { await pg.evaluate(() => { STATE.render.cacheValid = false; draw(); }); await sleep(700); };
  ctx = await mkctx(); ({ page, errors } = await load(ctx, `localStorage.setItem('${KEY}', ${JSON.stringify(alt.name)});`));
  await page.evaluate(() => toggleAirports()); await sleep(1500);
  const rA = await cacheHash(page); await rebuild(page); const rB = await cacheHash(page);
  ok('T6 restored destination + Airports layer on: the cached map layer already matches a full rebuild (no stale or duplicate label)', rA === rB, `${rA} vs ${rB}`);
  await ctx.close();
  ctx = await mkctx(); ({ page, errors } = await load(ctx));
  await page.evaluate(() => toggleAirports()); await sleep(1200);
  await page.selectOption('#sel-airport', { value: alt.value }); await sleep(900);
  const pA = await cacheHash(page); await rebuild(page); const pB = await cacheHash(page);
  console.log('  INFO (existing behavior, not part of this build): picking a destination in the dropdown with the Airports layer on and the view idle -> cached map layer matches a full rebuild =', pA === pB);
  await ctx.close();

  await b.close(); server.close(); console.log(`${pass} passed, ${fail} failed`);
})();
