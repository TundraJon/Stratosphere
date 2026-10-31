#!/usr/bin/env node
// Runs the browser tests. Quick by default (about 2 minutes for a typical build, 5 at the very most):
//   - the version-number check and the smoke test, always;
//   - then only the suites for the files changed since the last commit (git diff against HEAD, plus new files).
// Usage:  node tests/run.js              quick check, changed files since HEAD
//         node tests/run.js --base <c>   changed files since commit <c> (use the commit before your work)
//         node tests/run.js --full       every suite (about 5 to 6 minutes)
//         node tests/run.js --list       show which suites would run, then stop
// Needs Playwright and Chromium (see lib.js). At most 3 suites run at once: more makes the timing-based ones flaky.
const { execFileSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const FULL = args.includes('--full'), LIST = args.includes('--list');
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'HEAD';

// every suite, and which source files make it relevant
const RULES = [
  [/^js\/touch\.js$/, ['test_tapfix']],
  [/^js\/(projection|render-loop|terminator)\.js$/, ['test_rotation', 'test_slide']],
  [/^js\/(airport-popup|canvas)\.js$/, ['test_plane', 'test_popup_x', 'test_rotation']],
  [/^js\/live-layer\.js$/, ['test_slide', 'test_touch', 'test_plane', 'test_rotation']],
  [/^js\/telemetry\.js$/, ['test_turn']],
  [/^js\/(callouts|state)\.js$/, ['test_callouts']],
  [/^(js\/progress\.js|js\/airports\.js|css\/styles\.css)$/, ['test_progress']],
  [/^js\/controls\.js$/, ['test_progress', 'test_dest', 'test_home', 'test_gps_btn']],
  [/^js\/terminator\.js$/, ['test_marker']],
  [/^(sw\.js|js\/register-sw\.js|manifest\.webmanifest|icons\/)/, ['test_sw', 'test_install', 'test_buster']],
  [/^(css\/|fonts\/)/, ['test_fonts']],
  [/^js\/(loader|early-gps|cutscene)\.js$|^index\.html$/, ['test_startup_race']],
  [/^index\.html$/, ['test_progress']],
];
const ALL = ['test_smoke', 'test_tapfix', 'test_plane', 'test_rotation', 'test_popup_x', 'test_slide', 'test_touch', 'test_turn', 'test_callouts',
  'test_progress', 'test_dest', 'test_home', 'test_marker', 'test_gps_btn', 'test_fonts', 'test_sw', 'test_install',
  'test_buster', 'test_startup_race'];

// --- version-number check: every file reference in index.html carries the same ?v= number
function versionCheck() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="((?:js|css|icons)\/[^"]+|manifest\.webmanifest[^"]*|favicon\.ico[^"]*)"/g)].map(m => m[1]);
  const nums = new Set(refs.map(r => (/\?v=(\d+)$/.exec(r) || [])[1]));
  const bad = refs.filter(r => !/\?v=\d+$/.test(r));
  const ok = refs.length > 0 && nums.size === 1 && bad.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} version check: ${refs.length} file references, numbers used: ${[...nums].join(', ')}${bad.length ? ', without a number: ' + bad.join(' ') : ''}`);
  return ok;
}

function changedFiles() {
  try {
    const tracked = execFileSync('git', ['diff', '--name-only', base], { cwd: ROOT }).toString().split('\n');
    const fresh = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT }).toString().split('\n');
    return [...new Set([...tracked, ...fresh].filter(Boolean))];
  } catch (e) { console.log('(git not available: running every suite)'); return null; }
}

let suites;
if (FULL) suites = ALL;
else {
  const files = changedFiles();
  if (files === null) suites = ALL;
  else {
    console.log('changed since ' + base + ': ' + (files.join(' ') || '(nothing)'));
    const set = new Set(['test_smoke']);
    for (const f of files) for (const [re, list] of RULES) if (re.test(f)) list.forEach(s => set.add(s));
    suites = ALL.filter(s => set.has(s));
  }
}
console.log('suites: ' + suites.join(' '));
if (LIST) process.exit(0);

const t0 = Date.now();
let failed = !versionCheck();
function runSuite(name) {
  return new Promise(resolve => {
    const s = Date.now();
    const a = [path.join(__dirname, name + '.js')];
    if (name === 'test_startup_race') a.push(FULL ? '20' : '10');
    const p = spawn('node', a, { cwd: __dirname, env: { ...process.env, QUICK: FULL ? '' : '1' } });
    let out = '';
    p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    const timer = setTimeout(() => { p.kill(); out += '\nFAIL timed out after 5 minutes'; }, 5 * 60 * 1000);
    p.on('close', () => {
      clearTimeout(timer);
      const lines = out.split('\n').filter(l => !/agent-proxy|connect_rejected|^For details|^- /.test(l));
      const pass = lines.filter(l => /^PASS/.test(l)).length;
      let fail = lines.filter(l => /^FAIL/.test(l)).length + (/SOME FAILED/.test(out) ? 1 : 0);
      const race = /errors in (\d+) of (\d+) loads \| stuck loading screen in (\d+) of/.exec(out);
      if (race && (+race[1] > 0 || +race[3] > 0)) fail++;
      if (/triggerUncaughtException|UnhandledPromiseRejection|ReferenceError|TypeError:|SyntaxError/.test(out)) fail++;   // the suite crashed part-way
      if (!pass && !race && !fail) fail = 1;          // the suite printed nothing: it crashed
      resolve({ name, secs: Math.round((Date.now() - s) / 1000), pass, fail, lines });
    });
  });
}
(async () => {
  const queue = suites.slice(), results = [];
  const worker = async () => { while (queue.length) results.push(await runSuite(queue.shift())); };
  await Promise.all([worker(), worker(), worker()]);
  for (const name of suites) {
    const r = results.find(x => x.name === name);
    console.log(`${r.fail ? 'FAIL' : 'ok  '} ${r.name} (${r.secs}s): ${r.pass} passed, ${r.fail} failed`);
    for (const l of r.lines.filter(l => /^FAIL/.test(l)).slice(0, 4)) console.log('       ' + l.slice(0, 170));
    if (r.fail && !r.lines.some(l => /^FAIL/.test(l))) console.log('       ' + r.lines.slice(-3).join(' | ').slice(0, 200));
    if (r.fail) failed = true;
  }
  console.log(`total: ${Math.round((Date.now() - t0) / 1000)} s, ${failed ? 'SOME CHECKS FAILED' : 'all passed'}`);
  process.exit(failed ? 1 : 0);
})();
