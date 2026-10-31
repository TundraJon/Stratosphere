# Tests

Browser tests for Stratosphere: headless Chromium at phone size (412x915), driven by Playwright, no GPS needed (they feed the app fake GPS fixes). They only read the app; nothing in the app depends on this folder.

## Run

```
node tests/run.js              # quick check: version check + smoke test + only the suites for files changed since the last commit (about 2 minutes)
node tests/run.js --base <c>   # same, but changed files since commit <c> (use the commit from before you started)
node tests/run.js --full       # every suite (about 5 to 6 minutes)
node tests/run.js --list       # show which suites would run
```

The goal is 5 minutes at the very most per build, so: quick check for ordinary builds, `--full` when asked, or when a build touches the loader, service worker, caching or startup code. At most 3 suites run at once (more makes the timing-based ones flaky). A single suite can be run on its own: `node tests/test_plane.js` (set `QUICK=1` for its shorter version).

## What each suite covers

| Suite | Covers |
|---|---|
| `test_smoke` | page loads, GPS fix updates the readouts, Track-Up toggle, airport popup opens and closes, Settings opens, 43 landmarks classified, no JS errors |
| `test_tapfix` | tapping an airport's (and the destination pin's) code opens it in Track-Up at every heading, North-Up unchanged, plane tap still wins |
| `test_plane` | the plane icon: centered on its position and lined up with the heading on both screens, popup sizes (26 px in Overview, 50 px wingspan on the ground, 100 px in the air), the 5-second ease, the 140/160 MPH hold rule |
| `test_popup_x` | the airport popup's close button |
| `test_slide` | Track-Up sliding map snapshot: redraw count, pixel match with a live redraw, every trigger that drops it |
| `test_touch` | no snapshot or cache while a finger (or mouse button) is down, 1 second wait, North-Up cache |
| `test_turn` | smooth heading turns (3 seconds), 10 degrees a second cap, wraparound, frozen heading below 2 knots |
| `test_callouts` | landmark callouts: classes, distances, side wording, day/night and twilight, speed floor, queue, banner timing, the Grand Canyon line, setting |
| `test_altrule`, `test_altdiag` | the "3 consistent readings" altitude rule and the altitude diagnostics readout |
| `test_dest`, `test_home`, `test_marker`, `test_gps_btn` | remembering the destination and the home location, the home marker, "Use my current location" |
| `test_fonts` | fonts are served from the site, no Google requests |
| `test_sw`, `test_install`, `test_buster` | offline cache (service worker), installability, the `?v=` version number refreshing files |
| `test_startup_race` | many page loads, none stuck on the loading screen or throwing errors |

## Notes

- `lib.js` finds Playwright and Chromium (override with `PLAYWRIGHT_PATH`, `CHROMIUM`) and sets where screenshots go (`TEST_OUT`, default a folder in the system temp dir).
- A few checks show a fixed bug still reproducing in an older build (their names start with `OLD`). They are skipped unless `OLD_DIR` points at an older copy of the app.
- Timing-dependent suites fake the clock where they can; if one fails only when the machine is busy, rerun it alone before treating it as a real failure.
