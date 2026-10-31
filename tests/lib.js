// Shared setup for the browser tests in this folder.
//   ROOT     the repo root (the app under test is served from here)
//   OUT      where screenshots go (TEST_OUT, default a folder in the system temp dir)
//   OLD_DIR  optional: a folder holding an OLDER copy of the app (OLD_DIR=...), used by the few
//            checks that show a fixed bug still reproducing in the old build; those checks are
//            skipped when it is not set.
//   playwright / CHROMIUM  the browser driver and the Chromium binary (PLAYWRIGHT_PATH, CHROMIUM
//            can override the defaults, which are where the cloud sessions install them)
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.TEST_OUT || path.join(os.tmpdir(), 'stratosphere-tests');
fs.mkdirSync(OUT, { recursive: true });
const OLD_DIR = process.env.OLD_DIR || null;
let playwright;
for (const p of [process.env.PLAYWRIGHT_PATH, '/opt/node22/lib/node_modules/playwright', 'playwright']) {
  if (!p) continue;
  try { playwright = require(p); break; } catch (e) { /* try the next one */ }
}
if (!playwright) throw new Error('Playwright not found: set PLAYWRIGHT_PATH or install it (npm i playwright)');
let CHROMIUM = process.env.CHROMIUM;
if (!CHROMIUM) {
  const base = '/opt/pw-browsers';
  try {
    const dir = fs.readdirSync(base).filter(d => d.startsWith('chromium-')).sort().pop();
    if (dir) CHROMIUM = path.join(base, dir, 'chrome-linux', 'chrome');
  } catch (e) { /* use Playwright's own browser */ }
}
module.exports = { ROOT, OUT, OLD_DIR, playwright, CHROMIUM };
