# Stratosphere
Track your in-flight status

> **Never build or edit code without explicit instruction.**
>
> Finding a bug or coming up with an improvement is never permission to fix it. It gets written down in the Build Queue or Build Planner below and left alone until Jon says to build it. If an instruction is ambiguous, ask first.

## Build Log

### Build Log 1 (completed): v62, carried over from the handoff doc
Everything that shipped in v62 before this repo existed. Recorded from the handoff doc, not from a live build.
- [x] Landmarks: Arlington Cemetery (🪦) and Dollywood (🦋)
- [x] Home location POI
- [x] Heading freeze at 2 knots or below
- [x] 12 state season-date fixes
- [x] Removed the main-map runway lines and the diagnostic displays
- [x] Automatic cutscene trigger disabled
- [x] Binary Overview/Follow popup camera
- [x] Auto-open at 1 nm, with a 9 nm / 20-minute re-arm

**Verification:** not recorded in the handoff doc.

### Build Log 2 (completed): Split index.html into CSS and JS files
The app lived in one 12,169-line `index.html` (committed as-is first, `7922da0`). Split into separate files, with no code changes.
- [x] `css/styles.css`: the inline style block
- [x] `js/early-gps.js`, `js/loader.js`, `js/drawers.js`, `js/state.js`: the small early scripts and global app state
- [x] `js/data/map-data.js` and `js/data/airport-data.js`: the large geometry, airport and runway data
- [x] `js/airports.js`, `js/projection.js`, `js/canvas.js`, `js/seasonal.js`, `js/touch.js`, `js/airport-popup.js`, `js/geodesy.js`, `js/render-loop.js`, `js/terminator.js`, `js/live-layer.js`, `js/telemetry.js`, `js/cutscene.js`, `js/controls.js`: the app logic, cut at its existing section headers
- [x] `index.html` is now markup plus `<script src>` tags in the original order. Classic scripts, not ES modules, so the shared globals work as before.
- [x] Left alone: the Google Fonts link (the app still needs internet for fonts).

**Verification:**
- Reassembling the new files reproduces the original `index.html` byte-for-byte.
- `node --check` passed on every JS file.
- Old and new versions loaded in headless Chromium (390x844 viewport, simulated GPS fix at Orlando, seeded `Math.random`). Zero JS errors, same airport dropdown count (133), 51 state polygons, 128 airports, same function set, and pixel-identical screenshots after the loader faded.
- Not tested: the cutscenes, airport popups and seasonal toggles. The code is byte-identical, so they are expected to work, but nobody has tapped through them yet.

### Build Log 3 (completed): Workflow docs
- [x] Replaced the earlier `docs/build-planner.md` and `docs/build-queue.md` with the three sections in this README.
- [x] `CLAUDE.md` now points to this README and carries the standing rules.

**Verification:** every item from Jon's pasted planner and queue is present below with its wording kept; the `docs/` files are gone.

### Build Log 4 (completed): v63, delete the orphaned zoom-debug comment
The comment described a zoom-level debug readout that no longer exists. Nothing follows it in the markup, and no zoom readout element exists in the HTML, JS or CSS.
- [x] `index.html`: deleted the three-line "DEBUG: current zoom level..." HTML comment (old lines 45-47), under the Reset button block.
- [x] Left alone: the blank line after it, to keep the original spacing.

**Verification:**
- `git diff` shows exactly 3 deletions, all comment lines.
- Old and new versions loaded in headless Chromium at Pixel 7 size (412x915, simulated GPS fix at Orlando, seeded `Math.random`). Zero JS errors, same airport dropdown count (133), 51 state polygons, 128 airports.
- Screenshots were byte-identical on 2 of 3 old-vs-new runs. The unchanged old version also differed from itself on 2 of 3 runs (timing noise in the live plane position), so a difference is not caused by this change.

### Build Log 5 (completed): v64, save the home location between sessions
Promoted from the Build Planner and built as spec'd in the Build Queue (Jon confirmed: save the "Show on map" checkbox too, browser-only storage, reverse the old "deliberately not persisted" decision).
- [x] `js/controls.js`: new `HOME_STORAGE_KEY` (`stratosphere.homeLocation`), `saveHomeLocation()` and `loadHomeLocation()`. The saved JSON is `{lat, lon, show}`: the text of the two input boxes plus the checkbox. If both boxes are empty and the checkbox is unchecked, the key is removed instead.
- [x] `handleHomeLocationChange()` calls `saveHomeLocation()` after updating `STATE.homeLocation`.
- [x] `loadHomeLocation()` runs on `DOMContentLoaded`: refills the boxes and checkbox, then calls `handleHomeLocationChange()` so the existing validation and redraw apply. A missing or unreadable entry does nothing.
- [x] Every storage call is wrapped in `try/catch`, so blocked storage behaves like today.
- [x] Updated the three "not persisted" comments in `js/controls.js`, `js/state.js` and `js/terminator.js`.
- [x] **Bug found during verification (existed in v62):** the render cache's change signature in `draw()` (`js/live-layer.js`) doesn't include the home location, so the 🏠 did not appear after entering or restoring a home location until the view changed (pan, zoom or a toggle). Confirmed in the unmodified v62 code. Fixed with one line in `handleHomeLocationChange()`: `STATE.render.cacheValid = false;`. `js/live-layer.js` was not touched. Jon chose this option over editing the signature.
- [x] Left out, as spec'd: no other settings are saved; no address lookup.

**Verification:** headless Chromium at Pixel 7 size (412x915), simulated GPS fix at Orlando.
- Fresh load: nothing saved, boxes empty, no errors.
- Enter values and check "Show on map": the stored JSON is exactly `{lat, lon, show}`. After a reload, the boxes refill, `STATE` is restored, and the 🏠 is drawn (pixel check against a run with no home).
- Typing at runtime now draws the 🏠 without moving the map, and looks identical to the restored one. Saved with "Show" off: no marker.
- Clear the boxes: the key is removed, and a reload restores nothing.
- Out-of-range latitude (200): restored into the box, no marker, no errors. Corrupt saved value: ignored, no errors. Storage blocked entirely: app loads, home works for the session, no errors.
- Old-vs-new load check with no saved home: zero errors, same airport (133) and state (51) counts. Screenshots were byte-identical on 1 of 3 runs; the unchanged version also differed from itself on 2 of 3 runs earlier (live plane position timing).
- Not tested: a real phone, or a real app relaunch (only page reloads in Chromium). A number box holds an empty value while a lone "-" is typed, so a half-typed "-" is not saved.

### Build Log 6 (completed): v65, "Use my current location" button for the home location
Built as spec'd in the Build Queue, with Jon's decisions: "your defaults", plus one change: ask for confirmation before replacing an existing home location.
- [x] `index.html`: a "📍 Use my current location" button (`btn-home-use-gps`) and a small status line (`home-gps-status`) in the Home Location 🏠 group, between the lat/lon boxes and the "Show on map" checkbox.
- [x] `js/controls.js`: new `useCurrentLocationAsHome()` and `setHomeGpsStatus()`. A one-shot `getCurrentPosition` request with `enableHighAccuracy: true`, `maximumAge: 0` and a 15-second timeout. It is its own request, separate from the app's 3-second GPS polling.
- [x] On success: writes latitude and longitude to 5 decimal places into the boxes, checks "Show on map", then calls `handleHomeLocationChange()` (existing validation, redraw and v64 saving). Status line: "Home set (accuracy ±N m)", or "accuracy unknown".
- [x] While waiting: the button is disabled and the status line reads "Locating…".
- [x] Failures (permission denied, position unavailable, timeout, no geolocation support): the status line says why and ends with "Home not changed." Boxes and saved value are untouched.
- [x] Confirmation: if a home location is already set, a `window.confirm` (no custom dialog existed to reuse) asks "Replace your current home location (old) with your current position (new, accuracy ±N m)?" The prompt appears after the fix arrives, so Jon can decline a poor-accuracy fix. Declining leaves everything unchanged and shows "Home not changed."
- [x] Left alone, as spec'd: the app's existing GPS polling; no address lookup; no background tracking; no CSS changes.

**Verification:** headless Chromium at Pixel 7 size (412x915) with a mocked GPS fix (accuracy 12.4 m).
- Success with no home set: boxes show 28.53830 / -81.37920, Show is checked, `STATE` is set, the value is saved to storage, status reads "Home set (accuracy ±12 m)", no confirm appears, no errors.
- Existing home, declined: the confirm shows the old and new coordinates and the accuracy; boxes, state and status are unchanged. Existing home, accepted: replaced, Show on, saved.
- Permission denied, position unavailable (code 2), timeout (code 3) and no geolocation support each show their message, change nothing and leave the button enabled.
- While waiting, the button is disabled and shows "Locating…"; after the fix it is re-enabled and the home is set.
- The app's existing GPS polling still drives the plane position. The layout was checked in a screenshot of the expanded Settings drawer.
- The v64 persistence and 🏠 marker tests were rerun against the final code: all pass.
- Old-vs-new load check with no saved home: zero errors, same airport (133) and state (51) counts. Screenshots differed by 0 to 291 pixels out of 376,000, in the same small areas (telemetry text and plane) as the unchanged version differs from itself (0 to 193 pixels).
- Not tested: a real phone or a real indoor GPS fix (the GPS was mocked). The Settings drawer scrolls inside its fixed height, so with the new button the "Show on map" checkbox sits slightly lower and needs a small scroll on a phone.

### Build Log 7 (completed): v66, self-host the fonts
Built as spec'd in the Build Queue. Removes the app's only external dependency (the Google Fonts link).
- [x] New `fonts/` folder: `antonio-latin-400-normal.woff2`, `antonio-latin-700-normal.woff2`, `inter-latin-400-normal.woff2`, `inter-latin-600-normal.woff2` (about 70 KB total, Latin subset only), plus `LICENSE-Antonio.txt` and `LICENSE-Inter.txt` (SIL OFL 1.1, as the license requires). Source: the `@fontsource/antonio` and `@fontsource/inter` npm packages, v5.3.0.
- [x] `css/styles.css`: four `@font-face` rules at the very top (`font-display: swap`, `src: url('../fonts/...woff2')`), with a short comment. No other CSS changes.
- [x] `index.html`: removed the Google Fonts `<link>` and the comment line above it. Nothing else changed.
- [x] Left out, as spec'd: no other fonts or weights, no service worker (see Build Queue 1).

**Verification:** headless Chromium at Pixel 7 size (412x915) against a local server, with every host except the local server blocked.
- Zero external requests attempted, zero failed requests, zero JS errors, map ready.
- All four font files were served from `/fonts/` with status 200, and `document.fonts.check` is true for all four faces. Antonio 400, Inter 400 and Inter 600 loaded on page load. Antonio 700 loads on demand: nothing in the UI currently uses bold Antonio, so it was not requested until the test asked for it (the old Google link declared the same weights).
- Checked by eye in screenshots of the main screen and the open Settings drawer: the telemetry readouts render in the condensed Antonio, and labels and buttons render in Inter.
- Coverage check: every non-emoji character the app draws was compared against Google's own subset ranges. `°`, `±`, `—` and `…` are inside the Latin subset. `≡`, `▲`, `▼`, `➢` and `✈` were never in any Google subset for these fonts, so they use the system fallback before and after this change. The data files contain no accented letters.
- The v64 and v65 test suites were rerun against this build: all pass.
- Not compared: pixel-for-pixel against the old version. Earlier test screenshots were taken with Google's fonts blocked, so they used fallback fonts and the text looks different by design. Not tested on a real phone.

### Build Log 8 (completed): v67, offline cache (service worker)
Built as spec'd in the Build Queue, with Jon's decisions: network-first with a 3-second fallback, a 1-hour cache-only window after a failed or timed-out request, background refresh after a slow response, offline cache only (not installable). Jon declined the proposed "end the window when the phone comes back online" idea.
- [x] New `sw.js` in the repo root (scope: the whole site). Same-origin GET requests only. Tries the network with `cache: 'no-cache'` and a 3-second wait; on success it saves a copy in the cache and returns the response; on a timeout or a failed request it returns the saved copy. A page navigation with no copy of that exact URL falls back to the cached `index.html`.
- [x] After one failed or timed-out request the worker serves from the cache only for 1 hour. The "skip until" time is stored as a small cache entry (`network-down-until`), because browsers wipe an idle worker's memory. If nothing is saved for a request, it still tries the network.
- [x] When the 3-second limit fires, the network request keeps running in the background and its result is written to the cache (kept alive with `waitUntil`).
- [x] One cache name constant (`stratosphere-cache-v1`); on activate, caches with any other name are deleted. `skipWaiting()` on install and `clients.claim()` on activate.
- [x] New `js/register-sw.js`, loaded as the last `<script>` in `index.html` (no other script order changes). Registers `sw.js` on window `load`, guarded and with a `.catch`. On a first visit (page not yet controlled) it sends the worker the list of same-origin URLs the page loaded, so they are cached right away without a hand-kept file list.
- [x] Left out, as spec'd: no manifest or icons (Build Planner item 4), no update banner, no background sync, no changes to the app's GPS or home-location code. Fonts needed nothing extra: they are cached like any other file.
- [x] **Behavior to know about (found in testing, not changed because it follows the spec):** after a slow load that hits the 3-second limit, the page itself is refreshed in the cache in the background, but the 1-hour window means the scripts and CSS are not re-requested. The next load inside that hour therefore shows the new page with the older cached scripts, until the hour ends or the network answers a load normally. This needs an update pushed just before a slow load, and a reload does not clear it for up to an hour.

**Verification:** headless Chromium at Pixel 7 size (412x915) against a local test server that sent `cache-control: max-age=600` like GitHub Pages, and could hang, go down, or serve a changed file.
- First visit online: all 25 files the page loaded (HTML, CSS, 20 scripts, 3 fonts) were in the cache, the worker was active, and nothing external was requested. The browser's automatic `favicon.ico` request returns a 404 and is not cached.
- Server unreachable: the page, map and loader load from the cache with zero JS errors, the saved home location restores, and a URL with a query string also loads. The failure set the 1-hour window (about 60 minutes left).
- Update: with a changed `index.html` and a changed script on the server, one normal reload showed both new versions even with the 10-minute `max-age`, and the worker revalidated with the server.
- Hanging server (connected, no internet): the page loaded from the cache after about 3.5 seconds; the next load inside the hour took about 0.6 seconds and made zero server requests; after rewriting the stored time into the past, the network was tried again and the update arrived.
- Slow server (answers after 4.5 seconds): that load showed the saved page, and the page was refreshed in the cache in the background (this also showed the behavior noted above).
- Service workers blocked, and a browser with no service worker support: the app loads normally with no errors.
- The v64, v65 and v66 test suites were rerun against this build: all pass.
- Live GitHub Pages site (checked after the deploy, headless Chromium at Pixel 7 size): the worker registered with the site scope and activated; the first visit filled the cache with 25 entries (the page, the CSS, 20 scripts, 3 fonts); no JS errors and nothing requested outside the site. With the network fully switched off, a reload loaded the app from the cache in about 30 ms, the loader faded, the saved home location came back and the 🏠 drew.
- Not tested: a real phone, or real airplane Wi-Fi.

### Build Log 9 (completed): v68, fix a stale comment about the cutscene runway color
Built as spec'd in the Build Queue. Comment-only change: no code or behavior touched.
- [x] `css/styles.css`, line 242 (the last line of the `BUG FIX` comment on `#cutscene-runway-dashes`): `black` changed to `grey`, so it reads `centerline on solid grey pavement */`.
- [x] Left alone, as spec'd: the earlier line in the same comment ("alternate solid black/white bars"), which describes how the old bug looked. No other file or line changed.

**Verification:**
- `git diff` shows exactly one changed line (one removed, one added), inside a comment.
- Headless Chromium at Pixel 7 size (412x915): zero JS errors, and the takeoff cutscene's runway still renders `rgb(117, 117, 117)` (`#757575`).
- The page-load part of the fonts test was rerun: passes.

### Build Log 10 (completed): v69, remove Wyoming's dead-time season
Built as spec'd in the Build Queue. Jon's reason: Wyoming typically goes straight from fall colors to snow cover overnight. Jon chose option 1, so the switch happens on Oct 11 (when snow starts) and snow's start date did not move.
- [x] `js/seasonal.js`, the `"Wyoming"` entry: `dead: [[10,21],[12,1]]` changed to `dead: null`. That is the only changed line. The entry now reads `seasons: { fall: [[9,21],[10,20]], dead: null, snow: [[10,11],[4,20]], spring: [[4,21],[6,30]] }`.
- [x] Result: Sep 21 to Oct 10 fall; Oct 11 to Apr 20 snow, with no brown stretch in between; Apr 21 to Jun 30 spring; Jul 1 to Sep 20 no season (the plain default land color, as before).
- [x] Left alone, as spec'd: fall, snow and spring dates; every other state; all code.

**Verification:** headless Chromium at Pixel 7 size (412x915), the previous version and the new version side by side.
- `git diff` shows exactly one changed line.
- `getActiveSeasonColors` was run for all 51 entries (50 states plus DC) on every day of 2026 and of the leap year 2028, 731 days each. The other 50 are identical to the previous version on every day.
- Wyoming boundary dates: Sep 20 none; Sep 21 fall; Oct 10 fall; Oct 11 snow; Oct 20 snow; Oct 21 snow; Nov 15 snow; Dec 2 snow; Apr 20 snow; Apr 21 spring; Jun 30 spring; Jul 1 none. All as specified.
- Wyoming no longer returns the dead-time season on any day. Only its 84 old dead-time days (42 per year) changed, and all of them are now snow.
- The page loads, the map is ready and there are zero JS errors, in both versions.
- Not checked: how the new Wyoming colors look on screen (only the season picker's output was tested).

### Build Log 11 (completed): v70, installable app (manifest, icons and favicon)
Built as spec'd in the Build Queue. Jon chose the icon (his globe image) and said "your defaults" for the rest, and asked for the favicon to be folded into this build. Android and iPhone.
- [x] New `icons/` folder: `icon-192.png` and `icon-512.png` (Android, transparent, globe at 94%), `icon-maskable-512.png` (Android adaptive, opaque, globe at 70% inside the safe circle on a deep-navy gradient with a soft shadow) and `apple-touch-icon-180.png` (iPhone, opaque, globe at 76%). Made from Jon's globe image (503x543 JPEG, globe 386 px across): the fake checkerboard was removed with a flood fill from the image edge, and the edge was replaced with a smooth anti-aliased circle (center 247, 292.5, radius 190.5, measured edge radius 192 +/- 1.5).
- [x] New `favicon.ico` in the repo root with 16, 32 and 48 px images, scaled from the cropped transparent globe (not from the small pixelated JPEG Jon sent), transparent corners.
- [x] New `manifest.webmanifest` in the repo root: `name` and `short_name` "Stratosphere", `description` "Track your in-flight status", `start_url` and `scope` `./`, `display` `standalone`, `background_color` and `theme_color` `#0d0e12`, and the three Android icons. No `orientation` entry, so rotation behaves as in the browser today.
- [x] `index.html` `<head>`: six added lines (the manifest link, `theme-color`, the favicon link, `apple-touch-icon`, `apple-mobile-web-app-capable` and `apple-mobile-web-app-title`). Nothing else in the file changed, and the script order is untouched.
- [x] Left out, as spec'd: no orientation lock; no day/night theme color; no in-app Install button; no iOS splash screens; no 1024 px App Store icon (the source image is too small for a sharp one); no app code changes.
- [x] **Existing problem found during testing, not fixed here (it comes from the file split in Build Log 2, not from this build):** some scripts run functions or read variables that are defined in a later script (for example `lastGpsFix` is declared in `js/controls.js`, the last script, but used by `js/live-layer.js`, `js/telemetry.js` and others). In the old single-file app that could never happen, but now an event such as a window `resize` that fires while the scripts are still loading can run a function before its dependencies exist. The page then logs `lastGpsFix is not defined` or `draw is not defined`, and in the worst case the loading screen never finishes. Measured: the original single file had 0 errors in 5 loads with resize events forced during loading; the split app had errors in 3 of 14 loads (v69) and 2 of 14 loads (this build), so this build does not change the rate; with resize events forced every 2 ms during loading, 1 of 8 loads never finished starting; in plain loads with no forcing there were 0 errors in 30 loads (v69) and 1 in 30 (this build). The service worker (Build Log 8) makes scripts load faster, which should make the window smaller, but it does not remove it.

**Verification:** headless Chromium at Pixel 7 size (412x915) against a local server.
- `manifest.webmanifest` is valid JSON. The manifest, all four PNGs and `favicon.ico` return 200 with the right content type. Each PNG has the size the manifest claims. The 192 and 512 icons have transparent corners; the maskable and Apple icons are fully opaque. `favicon.ico` holds exactly 16, 32 and 48 px images with transparent corners.
- Chrome's own installability check (`Page.getInstallabilityErrors`) reports no errors in a normal browser profile, and `Page.getAppManifest` parses the manifest with no errors or warnings. (In Playwright's default incognito-style context the check reports only `in-incognito`, which is a property of that test context, not of the app.)
- The page has all six new head tags with the right values, loads, and the browser now gets a 200 for `favicon.ico` instead of a 404.
- The v64, v65, v66 and v67 test suites were rerun against this build: all pass (one run of the v65 button suite had a single failure that did not repeat in six further runs; the startup problem above is the likely cause).
- Live GitHub Pages site (checked after the deploy, headless Chromium at Pixel 7 size, normal profile): the manifest (`application/manifest+json`), the favicon and all four PNGs return 200 with the right types; Chrome's installability check reports no errors and parses the manifest cleanly; the page loads with zero JS errors and nothing requested outside the site; the offline cache worker is still active and filled (27 entries); and with the network switched off, a reload still loads the app from the cache.
- Not tested: installing on a real phone, how the icon looks on a real home screen, or iPhone at all (no iPhone available).

## Build Queue

Fully specified work that is waiting for a go-ahead. Items leave this list in the same commit that builds them.

### 1. Fix the startup race (code running before later scripts have loaded)
**Not yet authorized to build.**

Found while testing Build Log 11 (it comes from the file split in Build Log 2). Jon asked for it to be logged. Since the split, a script can run a function or read a variable that lives in a script that has not loaded yet, which logs `lastGpsFix is not defined` or `draw is not defined` and, in the worst case, leaves the loading screen stuck.

- Cause, two entry points (found by listing every listener, timer and animation loop in `js/`):
  1. `js/canvas.js`, line 36: `window.addEventListener('resize', resizeCanvas);` is active as soon as that script runs (script 9 of 19). A window resize while the later scripts are still loading runs `resizeCanvas`, which calls functions from later scripts. Phones fire resize events during page load (address bar showing or hiding, rotation).
  2. `js/cutscene.js`, line 586: `requestAnimationFrame(animate);` starts the animation loop in the second-to-last script, before `js/controls.js` (where `lastGpsFix` is declared) has loaded. The first frame can fire in that gap. This one needs no resize at all.
- Edit 1, `js/canvas.js` line 36: change it to `document.addEventListener("DOMContentLoaded", () => window.addEventListener('resize', resizeCanvas));`. Line 37 (the existing `DOMContentLoaded` call to `resizeCanvas`) is untouched, so the first sizing and fit happen exactly as before.
- Edit 2, `js/cutscene.js` line 586: change `requestAnimationFrame(animate);` to `document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(animate));`. The loop keeps itself running through the existing `requestAnimationFrame(animate);` at the end of `animate()` (line 584), untouched.
- Why `DOMContentLoaded`: it fires only after every classic script has run, including `js/controls.js`, so nothing can call a function or read a variable that does not exist yet. Listener order is unchanged where it matters: the existing first `resizeCanvas` call is registered before the animation start, so the first fit still happens before the first animation frame.
- Not included: no script reordering, no `defer`, no bundling, and no moving of code between files. `defer` does not remove the problem, because the browser can still run other events while it waits for the next deferred script to download. The canvas mouse and touch listeners in `js/airport-popup.js` (lines 502 to 553) are left as they are: the loading screen covers the canvas while the scripts load, so input cannot reach them. `js/loader.js` and `js/early-gps.js` already only touch their own variables.
- Test plan, at Pixel 7 size (412x915): `git diff` shows exactly two changed lines; first reproduce the problem on the current version with resize events forced during loading (one every 2 ms for about 0.8 s) and with a local server that delays each script by a random 50 to 300 ms to widen the window, then run the same on the fixed version, 20 or more loads each in a normal profile and in a plain context, and expect zero page errors and zero loads where the loading screen sticks (before the fix: errors in 3 of 14 and 2 of 14 forced-resize loads, one stuck load in 8 stress loads, 1 error in 30 plain loads); 60 plain loads with no forcing, zero errors; after loading, a window resize still re-fits the canvas, and the animation loop still runs (the telemetry and plane keep updating); rerun the v64 to v70 test suites; load check with no errors; after the push, repeat the load and offline checks on the live GitHub Pages site.
- Ships as: v71.

## Build Planner

Ideas and known gaps with no committed design yet. Resolved, built, dropped or superseded items are deleted from here, and their history lives in the Build Log.

### Surfaced in earlier sessions
1. **GPS-noise tuning after your flight test:** 60 ft lateral margin,
   150 ft along-track margin, 7° alignment, 50 mph threshold.
   Waiting on real-world results from the GPS-loss flight test. The 60 ft
   lateral margin, 150 ft along-track margin and 7° alignment are the
   values to watch.
2. **Track-Up mode never gets the idle-snapshot caching:** a limitation,
   not a regression
