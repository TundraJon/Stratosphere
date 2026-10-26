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

### Build Log 12 (completed): v71, fix the startup race
Built as spec'd in the Build Queue (found while testing Build Log 11; it came from the file split in Build Log 2).
- [x] `js/canvas.js`: `window.addEventListener('resize', resizeCanvas);` is now `document.addEventListener("DOMContentLoaded", () => window.addEventListener('resize', resizeCanvas));`. The existing `DOMContentLoaded` call to `resizeCanvas` on the next line is untouched, so the first sizing and fit happen as before.
- [x] `js/cutscene.js`: the top-level `requestAnimationFrame(animate);` that starts the animation loop is now `document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(animate));`. The loop keeps itself running through the `requestAnimationFrame(animate);` at the end of `animate()`, untouched.
- [x] Why `DOMContentLoaded`: it fires only after every classic script (including `js/controls.js`) has run, so nothing can call a function or read a variable that does not exist yet. The first `resizeCanvas` is registered before the animation start, so the first fit still happens before the first animation frame.
- [x] Left out, as spec'd: no script reordering, no `defer`, no bundling, no code moved between files; the canvas mouse and touch listeners in `js/airport-popup.js` are untouched (the loading screen covers the canvas while the scripts load).

**Verification:** headless Chromium at Pixel 7 size (412x915), the previous version (v70) against the fixed version, loads run in batches of 5 in parallel.
- `git diff` shows exactly two changed lines.
- Reproduced first on v70 and confirmed fixed. Slow scripts (each script delayed a random 50 to 300 ms), no forced resize: v70 threw `lastGpsFix is not defined` in 15 of 30 loads (10 of 20 on an earlier run); the fixed version threw in 0 of 30. This confirms the animation-loop start was a cause on its own, with no resize involved.
- Resize events forced every 2 ms during loading: v70 had errors in 29 of 30 loads and a loading screen that never finished in 28 of 30; the fixed version had 0 errors and 0 stuck. Forced resize plus slow scripts: v70 errors in 30 of 30 and stuck in 30 of 30; the fixed version 0 and 0.
- Plain loads with nothing forced: v70 had errors in 11 of 60 loads (more often than in earlier sequential runs, because the parallel loads compete for the CPU); the fixed version 0 of 60, and no stuck loading screens in either.
- After loading, resizing the window still re-fits the canvas (824x1830 at 412x915, then 720x1560 at 360x780); the animation loop runs at 60 frames in a second; a GPS fix arrives and the telemetry keeps working; zero JS errors.
- The v64, v65, v66, v67 and v70 test suites were rerun against this build: all pass (including Chrome's installability check, which an earlier run had tripped over this bug).
- Live GitHub Pages site (checked after the deploy, 412x915 phone-style, 20 cold loads, 5 at a time): zero JS errors and the loading screen finished on all 20.
- Not tested: a real phone.

### Build Log 13 (completed): v72, fix the airport popup close button
Built as spec'd in the Build Queue. Reported by Jon from a real phone: the close × sat in the middle of the popup's title row, on top of "(Orlando, FL)", instead of in the corner. Jon also asked for a bigger tap area.
- [x] `index.html`, the close button in the airport popup header: inline style changed from `top: 6px; right: 8px; ... padding: 0 4px;` to `top: 0; right: 0; width: 48px; height: 100%; ... padding: 0;`. Everything else in the style is unchanged. That is the only changed line.
- [x] Cause (reproduced first): the global `select, input, button { width: 100%; ... }` rule in `css/styles.css` stretched this button into a 377 px strip across the whole header (the old version measured 377 px wide), with the × glyph centered in the middle of it, and made a tap anywhere on the title row close the popup. The inline `width` now overrides that rule.
- [x] Result: the button is 48 px wide and fills the header above its 1 px bottom border (35.6 px tall, so about 48 by 36 px of tap area, up from about 26 by 22 px for the glyph alone); the × sits 24 px from the right edge (about 18 px before).
- [x] Left out, as spec'd: the header's size, padding and look are unchanged (its height is 36.59 px before and after); the title's right padding (40 px) was not touched; no other button and the global `button` style were not touched.

**Verification:** headless Chromium emulating a phone (412x915, 2.25 pixel ratio, touch), the previous version (v71) against the new one.
- `git diff` shows exactly one changed line.
- The button's right edge equals the header's right edge; it is 48 px wide and 35.6 px tall (the header's inner height); the header height is unchanged; the glyph is 24 px from the right edge. The old version's button measured 377 px wide, which reproduces the bug.
- Tapping the middle of the title no longer closes the popup; tapping the × closes it; tapping 40 px from the right edge (inside the bigger area) closes it; tapping outside on the dark overlay still closes it.
- The longest airport name in the list ("HDN - Yampa Valley (Hayden/Steamboat Springs, CO)") ends at 343.9 px and the glyph starts at about 363.5 px, so they never touch.
- The popup still draws its runways. Screenshots checked by eye: before and after.
- The v64, v65, v66, v67, v70 and v71 test suites were rerun: all pass.
- Live GitHub Pages site (checked after the deploy): the close button measures 48 px wide with its right edge on the header's right edge; tapping the title leaves the popup open and tapping the × closes it.
- Not tested: a real phone.

### Build Log 14 (completed): v73, remember the destination airport between launches
Built as spec'd in the Build Queue. Reported by Jon: the destination airport he selected gets lost after he moves to another app for a while, and it used to stay for days. Jon answered "no" to saving the other settings.
- [x] `js/controls.js`: new `DESTINATION_STORAGE_KEY` (`stratosphere.destination`), `saveDestination(name)` and `loadDestination()`. The saved value is the airport's `name` string (for example `KDEN (Denver, CO)`). Every storage call is inside `try/catch`.
- [x] Save: `handleAirportSelect()` calls `saveDestination(ap.name)` right after `STATE.target = ap`.
- [x] Restore: `loadDestination()` runs on `DOMContentLoaded` (registered after `populateAirports`, so the dropdown exists). It finds the dropdown option whose airport name matches, sets the dropdown to it and sets `STATE.target`. It does not call `handleAirportSelect()`, which also sets the plane speed to 460 and resets the runway lock. It sets `STATE.render.cacheValid = false` before `draw()`, for the same reason as the home-location fix. A missing, unreadable or no-longer-listed saved name leaves the default (KMCO).
- [x] Left out, as spec'd and as Jon chose: no other settings are saved (day/night mode, map layers, speed unit); the way picking a destination works did not change.
- [x] **Cause not confirmed:** the destination was never saved before this build (the original single-file app did not save it either), so it could only last while the page stayed loaded. My explanation was that Android reloads a page left in the background, but Jon says he does not see the radar loading screen when he comes back, which does not fit a reload. This build fixes the symptom either way, because the destination now survives any reload or discard. If it still gets lost with no loading screen, that is a different problem and needs a new look.

**Verification:** headless Chromium at 412x915 with a 2x pixel ratio.
- Fresh profile: starts on KMCO with nothing saved. Picking Denver saves `KDEN (Denver, CO)` and sets the plane speed to 460 (as picking always does); after a reload the dropdown shows DEN, "EN ROUTE TO" shows DEN, the target is Denver, and the plane speed is 0, not 460. Picking another destination (Albuquerque) replaces the saved one, and it survives a reload.
- A saved airport that is not in the list, and a corrupt saved value: both fall back to KMCO with no errors. Storage blocked entirely: the app loads and picking a destination still works for the session, with no errors.
- With the Airports layer on, the cached map layer after a restore is identical to a full rebuild, so no stale or doubled label.
- The v64, v65, v66, v67, v70, v71 and v72 test suites were rerun: all pass (the popup suite's one strict height check, 35.6 px against 36.6 px, is the known measurement artifact from Build Log 13).
- Live GitHub Pages site (checked after the deploy): picking Denver and reloading shows DEN, not MCO, with the plane speed not set to 460; after the offline cache filled, a reload with the network off loads the app from the cache and still shows DEN; zero JS errors in the whole session.
- Not tested: a real phone, and the "app in the background for a while" case itself (only page reloads).
- **Existing behavior found while testing, not changed here:** when the Airports layer is on and the view is idle, picking a destination in the dropdown leaves the cached map layer out of date (it does not match a full rebuild) until the view changes, the same kind of problem as the home-location fix in Build Log 5. The cached layer skips drawing the destination's label, so the previous destination's label can be missing and the new one drawn twice until you pan or zoom. A one-line `STATE.render.cacheValid = false;` in `handleAirportSelect()` would fix it. It was not in this build's spec.

### Build Log 15 (completed): v74, fix the stale map layer after picking a destination
Built as spec'd in the Build Queue (found while testing Build Log 14; the same kind of problem as the home-location fix in Build Log 5). Jon's intent: the Airports layer's own label must never show for the selected destination, because the destination already has its own label.
- [x] `js/controls.js`, `handleAirportSelect()`: added `STATE.render.cacheValid = false;` right before the final `draw();`, with a two-line comment saying why. That is the only code change (3 added lines); `js/live-layer.js` was not touched.
- [x] Cause: the cached map layer skips drawing the current destination's label (the live layer draws it), but the cache's change check does not include the destination, so picking a new one reused the old snapshot. Visible effect: the previous destination's label (MCO) was missing and the new one (DEN) was drawn twice, slightly ghosted, until the view changed.
- [x] Left out, as spec'd: no other state missing from the cache check; the destination-restore code from Build Log 14 already did this; no change to how picking a destination otherwise works.

**Verification:** headless Chromium at 412x915 with a 2x pixel ratio, the previous version (v73) against the fixed version. The cached map layer (which has no plane in it) was compared with a forced full rebuild after each pick, with the Airports layer on and the view idle.
- Reproduced first: on v73 all 3 picks in a row (Denver, Seattle, Miami) left the cached layer different from a full rebuild.
- After the fix: 0 mismatches after each of the 3 picks in a row. A before and after screenshot shows the MCO label back near Orlando and DEN drawn once.
- Airports layer off: picking a destination works as before (DEN and KDEN), no errors.
- The v64, v65, v66, v67, v70, v71, v72 and v73 test suites were rerun: all pass. (The popup test had two outdated assertions of its own: a strict height check and a check that the old version still had the bug; both were corrected in the test.)
- Not tested: a real phone. The live site was checked once at the end of this group of builds (see Build Log 20).

### Build Log 16 (completed): v75, stop Chrome restoring the destination dropdown on its own
Built as spec'd in the Build Queue. Reported by Jon from a real phone: the Flight Info showed MCO while the Settings dropdown showed BNA, and changing to another airport and back to BNA worked (the Flight Info then showed BNA, which Jon confirmed).
- [x] `index.html`: `<select id="sel-airport" onchange="handleAirportSelect()">` is now `<select id="sel-airport" autocomplete="off" onchange="handleAirportSelect()">`. That is the only changed line.
- [x] Cause (reproduced): when Chrome restores a page it puts the dropdown back to its last value by itself, while the app's own destination resets to KMCO, and the Flight Info reads the app's destination. With the saved-destination code (Build Log 14) the two agree when a saved value exists, but not when none exists (for example a destination picked before that code shipped, or saved data cleared by the browser). The attribute tells Chrome not to restore the dropdown, so it is always set by the app: the saved destination if there is one, otherwise KMCO.
- [x] One-time effect, as spec'd: a phone that was showing BNA in the dropdown with no saved destination shows MCO in both places after this change, until Jon picks a destination once (that pick is then saved).
- [x] Left out, as spec'd: the home location boxes and checkbox are unchanged (they save on every change); no code changes.

**Verification:** headless Chromium at 412x915 with Chrome's back-forward cache disabled, going to another page and back through history (this behaves like a restored tab).
- Reproduced first on v74: with BNA picked and no saved value, the dropdown showed BNA while the Flight Info and the app's target showed MCO (the mismatch Jon sees).
- With the attribute: in the same test the dropdown, the Flight Info and the target all show MCO (in step). With a saved BNA, all three show BNA. A normal reload also keeps them in step in both cases. Zero JS errors.
- `git diff` shows exactly one changed line.
- The v64 to v74 test suites were rerun: all pass.
- Live site: checked together with the rest of v74 to v79 (see Build Log 20).
- Not tested: a real phone.

### Build Log 17 (completed): v76, altitude diagnostic readout (raw readings in Settings)
Built as spec'd in the Build Queue. Jon's altitude reports: the readout swings between about 7,000 and 38,000 ft, and during takeoff and descent it is far too low (about 800 ft while the captain announces 10,000). Working guess, not yet confirmed: the phone's altitude sometimes comes from its barometer (cabin pressure) and sometimes from GPS. This readout shows the raw numbers so the next flight can confirm or rule that out.
- [x] `js/state.js`: new `rawAltitudeLog: []` in the `gps` object.
- [x] `js/controls.js`, `onGPSSuccess()`: for every fix (including fixes with no altitude) it pushes `{ t, ft, accM, kts }` (time, raw altitude in feet or null, `altitudeAccuracy` in meters or null, and the device-reported speed in knots or null, taken before any computed fallback) and keeps the newest 30. This is logging only; nothing in the altitude calculation reads it.
- [x] `js/controls.js`: new `updateAltitudeDiag()`, called at the end of `onGPSSuccess()` and once at startup (so the header line is there before the first fix); it does nothing if the element is missing.
- [x] `index.html`: new "Altitude diagnostics" group in the Settings drawer, directly under the Testing group, with one monospace block `id="alt-diag"` (10 px, muted color, `white-space: pre`). First line: `Shown: 34,990 ft   fresh readings: 5` (the current shown altitude or `--`, and how many buffered readings are under 60 s old). Then the newest 12 raw readings, newest first: time as `HH:MM:SS`, raw altitude (`35,010 ft` or `no altitude`), accuracy (`±8 m` or `±-- m`) and speed (`443 kt` or `-- kt`).
- [x] Left out, as spec'd: no change to how the shown altitude is computed (the 3-reading rule, built next as v77 in Build Log 18); the log is in memory only, so a page reload restarts it; no copy or export button; nothing is saved to `localStorage`.

**Verification:** headless Chromium at 412x915 with a 2x pixel ratio and no real GPS (permission denied), feeding 33 synthetic fixes through `onGPSSuccess()` with a controlled clock (cruise readings, a fix with no altitude, an odd 7,050 ft reading with no speed, and readings with and without accuracy).
- The shown altitude is identical to the previous version (v75) after each of the 33 fixes, so the calculation is unchanged.
- The readout has the header plus exactly 12 reading lines, newest first (35,010 ft on top, 34,900 ft at the bottom); every line matches the format; a missing accuracy shows `±-- m`, a missing speed shows `-- kt`, and a fix with no altitude shows `no altitude`. The log is capped at 30 entries.
- In the Settings drawer at phone size the readout fits the width (no sideways scrolling) and reads clearly in a screenshot. Zero JS errors in both versions.
- The v64 to v75 test suites were rerun: all pass.
- Live site: checked together with the rest of v74 to v79 (see Build Log 20).
- Not tested: a real phone, and real in-flight readings (that is the point of the next flight).

### Build Log 18 (completed): v77, altitude: require 3 consistent readings before the shown value changes
Built as spec'd in the Build Queue, built after the diagnostic readout (Build Log 17). Jon's rule: the shown altitude should only change after 3 relatively consistent readings, within a few hundred feet at most. Before this build there was no such rule: the app took the median of however many readings under 60 s old were in a 5-reading buffer, so with one or two fresh readings a single spike went straight to the screen, and three bad readings out of five won.
- [x] `js/controls.js`, `onGPSSuccess()`: the old median block is replaced. The 3 newest buffer readings that are under 60 s old (`ALTITUDE_MAX_AGE_MS`, unchanged) are checked. If there are 3 and each step between neighbors (oldest to middle, middle to newest) is at most `ALTITUDE_CONSISTENCY_FT = 300`, the shown altitude becomes the median of those 3, rounded, and `STATE.gps.lastAltitudeAcceptedTime` is set. Otherwise the shown value is left alone (hold). The 5-reading buffer and the 60 s age limit are unchanged.
- [x] Why each step and not the total spread: with a 3 s poll a steady 3,000 ft/min climb moves about 150 ft per poll, so three readings span about 300 ft; a limit on the total spread would freeze the display in normal climbs. A 300 ft step passes climbs and descents up to 6,000 ft/min and rejects jumps like 7,000 to 38,000.
- [x] New `shownAltitudeFt()` (with `ALTITUDE_HOLD_MS = 60000`) in `js/controls.js`: returns the last accepted altitude only for 60 s after it was accepted, otherwise `null`. `updateTelemetryUI()` in `js/telemetry.js` and the Settings diagnostics header both use it, so the screen goes back to `--` if nothing has been accepted for 60 s, instead of freezing on a stale number as before.
- [x] `js/state.js`: new `lastAltitudeAcceptedTime: null` in the `gps` object.
- [x] First reading: nothing is shown (`--`) until 3 consistent readings have arrived (about 9 s at the 3 s poll).
- [x] Implementation detail found in testing: the steps are compared in whole feet. Altitudes arrive in meters and are converted to feet, and a step of exactly 300 ft could come out as 300.0000001 and be rejected at the limit (the 6,000 ft/min climb test caught it).
- [x] Left out, as spec'd: no choice between a barometer and a GPS source (the "take the higher of the two" idea waits for the readings from the Build Log 17 diagnostics); no change to the altitude status dot, heading or speed smoothing.
- [x] **Known limit:** the rule cannot tell sources apart. If the phone reports a consistently wrong value (for example a steady cabin-pressure altitude) for 3 readings in a row, it is accepted. This build only stops spikes and flipping; whether the takeoff and descent error (about 800 ft when the captain says 10,000) needs a source rule depends on what the diagnostics show on the next flight.

**Verification:** headless Chromium at 412x915 with no real GPS (permission denied), feeding synthetic fixes through `onGPSSuccess()` with a controlled clock, the previous version (v76) against this one.
- Steady cruise: nothing shown until the 3rd reading, then the median of the newest 3; the screen shows `--` and then `35,010 ft`.
- One 7,000 ft spike among 35,000 ft readings never reaches the screen, and the value recovers after 3 good readings (v76 let it move the shown value). Two spikes in a row never reach the screen.
- Alternating 7,000 and 38,000 for 90 s: the last good value is held and then `--` appears once 60 s pass with nothing accepted. The shown value swung 31,000 ft on v76 and 0 ft on this version.
- Climbs: 3,000 ft/min (150 ft per fix) and 6,000 ft/min (300 ft per fix) are followed; a 6,400 ft/min climb (320 ft per fix, beyond the limit) is held, as expected.
- A genuine step to a new level is shown after 3 readings at that level (held until then). Fixes with no altitude are skipped. Readings older than 60 s are not counted: after a 70 s gap the screen shows `--` and 3 new readings are needed. With no new fixes, the screen shows `--` 61 s after the last accepted update.
- Zero JS errors in both versions. The v64 to v76 test suites were rerun: all pass. (Two of my own tests were tightened along the way: the destination suite's speed check now reads the speed in the same instant as the pick, because a mocked GPS fix could occasionally reset it first, and the diagnostics suite no longer asserts the old calculation.)
- Live site: checked together with the rest of v74 to v79 (see Build Log 20).
- Not tested: a real phone, and real in-flight altitude readings.

### Build Log 19 (completed): v78, replace the destination runway glyph with a 📍 and remove its orientation code
Built as spec'd in the Build Queue. Jon: the destination's black "≡---" runway glyph is no longer needed, a simple 📍 is fine, and the code that orients the glyph should go too. Jon chose to put the pin's tip exactly on the airport, and (after I proposed a wider tap area) confirmed that the tap target stays the 3-letter code text only.
- [x] `js/live-layer.js`: the whole "Draw Target Destination Runway Marker" block (the glyph and its bearing and 2 NM lock logic, about 60 lines) is replaced with a 📍 drawn through `drawFixedLabel(targetPos, ...)`, the same way the home 🏠 is: centered, `sans-serif`, `scaledFontPx(16)` (the same size as the home pin). The glyph's own measured ink bottom is aligned to the airport's position (`fillText("📍", 0, -measureText("📍").actualBoundingBoxDescent)`), so the pin's tip lands on the airport whatever emoji font the device uses (spec'd as `textBaseline` `"bottom"` tuned in testing; measuring the glyph is more robust).
- [x] Removed because nothing else used them: `STATE.runwayLocked` and `STATE.runwayLockedBearing` and their comment in `js/touch.js`; the reset of both, and its comment, in `handleAirportSelect()` in `js/controls.js`; `runwayGlyphFontPx()` and its comment in `js/projection.js`. A search of `js/` and `index.html` finds no remaining use of `runwayLocked`, `runwayLockedBearing`, `runwayGlyphFontPx`, `runwayBearing` or `runwayFontPx`.
- [x] Comment-only updates so they stop describing the glyph: the live layer header comment in `js/live-layer.js`, the `isTapOnDestinationMarker` comment in `js/touch.js`, and the "runway marker" mention in `js/terminator.js`.
- [x] Left out, as spec'd: the destination label (code, official name, city) keeps its position and text; the tap target stays the 3-letter code text and `isTapOnDestinationMarker()` is untouched; the cutscene's own `≡` runway markers and the popup's runway drawing are separate and untouched; the magenta route line stays.

**Verification:** headless Chromium at 412x915 with a 2x pixel ratio. The pin is measured by drawing the screen with and without it and diffing the two images, so the measurement does not depend on its colors.
- At zoom 1.1, 3, 9, 20 and 40 the pin is drawn and its tip is within 0.5 px of the airport's projected position (dx -0.3, dy -0.5). The pin is about 9 by 18 px for the 16 px font.
- The black runway glyph is gone: pure-black pixels within 50 px of the airport went from 681 to 0.
- Track-Up with the map rotated 45 degrees (plane placed about 100 NM away so the plane icon does not cover the pin): the pin stays upright and its tip is on the airport (dx -0.1, dy -0.6).
- Picking Denver moves the pin there (tip within 0.5 px). Tapping the 3-letter code text still opens the airport popup. The pin sits cleanly beside the label in screenshots at zoom 9 and at the normal view with the Airports layer on.
- Zero JS errors. The v64 to v77 test suites were rerun: all pass (the destination suite's assertion about `STATE.runwayLocked` was removed from the test because that state no longer exists; the offline cache suite failed one check once under heavy machine load and passed 4 of 4 reruns).
- Live site: checked together with the rest of v74 to v79 (see Build Log 20).
- Not tested: a real phone, and how the pin looks in Apple's emoji font (the glyph is measured at run time, so the tip placement should hold).
- Observed, unchanged: tapping the pin at its horizontal centre, just above the tip, also opens the popup, because the code text's tap area starts 2 px left of the airport and reaches up 31 px. That area was not changed.

### Build Log 20 (completed): v79, auto-open the airport approach screen at 2 NM instead of 1 NM
Built as spec'd in the Build Queue. Jon expected the approach and landing screen to open at 2 NM, but it opened as the plane passed over the end of the runway: the code (and the v62 note in Build Log 1) said 1 NM, measured from the destination's listed position, which on a long runway is about where the runway end is.
- [x] `js/cutscene.js`: `AUTO_TRIGGER_RADIUS_NM` changed from `1` to `2`, and the comment above it (`1nm`) to `2nm`.
- [x] `js/airport-popup.js`, `closeAirportPopup()`: its own hard-coded `if (distNm <= 1)` (which decides whether to record a dismissal) is now `if (distNm <= AUTO_TRIGGER_RADIUS_NM)`, so the two can never disagree; its `1nm` comment is now `2nm`. This second place is the catch: with only the constant changed, closing the popup between 1 and 2 NM would not record the dismissal and the popup would pop straight back open. Demonstrated on a scratch copy with only the constant changed: the popup opened at 1.5 NM, and after closing it was open again within 1 second.
- [x] `js/state.js`: the `1nm` comment on `autoTriggerDismissedFor` is now `2nm`. A search of `js/` finds no other `1nm` or `<= 1` leftover.
- [x] Left out, as spec'd: the re-arm distance (9 NM) and re-arm time (20 minutes) are unchanged; the distance is still measured to the destination's listed position, not to the runway end; manually opening the popup by tapping is unchanged.

**Verification:** headless Chromium at 412x915, no real GPS, with the plane placed at set distances from the destination (placing it 1.9 NM away measures 1.901 NM with the app's own distance function) and the previous version (v78) tested alongside.
- Opens or not by distance, v78 against this build: 3.0 NM no and no; 2.5 NM no and no; 2.1 NM no and no; 1.9 NM no and yes; 1.5 NM no and yes; 0.9 NM yes and yes; 0.5 NM yes and yes. So v78 reproduces the 1 NM behavior, and the new version opens only within 2 NM.
- Closing the popup at 1.5 NM records the dismissal for that destination, and it does not reopen by itself (also not at 1.9 NM). After 10 minutes it is still dismissed; after 21 minutes it re-arms and opens again. Moving beyond 9 NM clears the dismissal, and it opens again at 1.9 NM. Picking a different destination is not blocked by the old dismissal. Manually tapping the destination's code text still opens the popup from 30 NM away. Zero JS errors.
- The v64 to v78 test suites, and the altitude and pin tests, were rerun: all pass (the pin test's "black glyph is gone" comparison is only meaningful against a version that still has the glyph, so it no longer applies now that the previous version is already glyph-free).
- Live GitHub Pages site (checked after the deploy of v79, headless Chromium at 412x915, no real GPS, synthetic fixes), covering the whole group v74 to v79: after picking a destination with the Airports layer on, the cached map layer matches a full rebuild (v74); with nothing saved and a history-style restore, the dropdown and the Flight Info agree (v75); the Settings altitude readout shows the raw readings (v76); a 7,000 ft spike never reaches the screen and the value appears only after 3 consistent readings (v77); the 📍 tip is 0.3 px and 0.5 px from the airport and no black glyph is drawn (v78); the approach screen does not open at 2.1 NM, opens at 1.9 NM, and does not pop back open after being closed at 1.9 NM (v79); zero JS errors; and an offline reload still loads the app from the cache.
- Not tested: a real approach on a real phone.

### Build Log 21 (completed): v80, version buster (a `?v=` number on every file reference)
Built as spec'd in the Build Queue. Jon's request (sent while v79 was being built): use a "version buster" so a browser refresh gets the new version. No version buster existed before this build.
- [x] `index.html`: `?v=80` added to all 24 file references: the stylesheet, all 20 scripts, the manifest, the favicon and the Apple icon link. GitHub Pages ignores the query string for static files, so the files still load. Nothing else in the file changed.
- [x] `sw.js`: when the worker saves a file whose URL has `?v=`, it also deletes any other saved entry with the same path and a different query (including a plain, pre-buster copy), so each build does not leave a full set of old files behind (new `pruneOlderVersions()`, also used by the first-visit save). The worker file itself is not versioned in its URL.
- [x] `CLAUDE.md`: one line added under "Code structure" saying every build must change the `?v=` number on every file reference in `index.html` to the new build's version number, so no later session forgets.
- [x] **One addition beyond the spec:** in `matchCached()` a numbered file that is not saved yet now falls back to an older saved copy of the same path (the same lookup with the query ignored). Without it, a page that was refreshed in the background to ask for `?v=81` files, while only `?v=80` files were saved, would fail to load offline. This only matters in the slow-connection case described in Build Log 8's note, and it keeps that case working (an updated page with older scripts, as before) instead of breaking it.
- [x] Left out, as spec'd: no build tool and no content hashing (the number is changed by hand each build); fonts (referenced from the CSS) and the icons listed in the manifest keep their plain paths; the page itself (`index.html`) cannot carry its own number.
- [x] The check that every reference carries the same number, and that it matches the build's version, is part of my test tooling and is not a file in the repo; the rule that keeps it true is the `CLAUDE.md` line.

**Verification:** headless Chromium at 412x915 against a local server that sends `cache-control: max-age=600` like GitHub Pages. (Playwright turns the browser's HTTP cache off whenever a page uses request blocking, so the cache tests run without it.)
- All 24 references carry `?v=80` and no other number; the page loads from the numbered URLs with no 404s and no JS errors.
- With service workers blocked and the HTTP cache on, after a script changes on the server: with the SAME number, both coming back to the site (a new visit) and a plain refresh show the OLD script (the browser reuses it for the 10 minutes); with the number bumped to `?v=81` in the page, both a new visit and a refresh get the new script. This is the problem the buster solves.
- With the worker active: files are saved under their `?v=80` URLs; after a bump to `?v=81` and then `?v=82`, each file has only its newest saved copy, a planted pre-buster plain copy is gone, and the number of saved entries stays at 26.
- Safeguard: after a slow server answered late with a page asking for `?v=81` files that were not saved, and the server was then taken down, a reload still loaded the app from the older saved files, with no errors.
- The v64 to v79 test suites, and the altitude, pin and approach-screen tests, were rerun: all pass. Four of my own tests were adjusted: the offline cache suite no longer counts the browser's own default `/favicon.ico` request (it does not go through the worker) and recognises `favicon.ico?v=80`; the installability suite accepts the `?v=` suffix on the head tags; and two old-version comparisons that only made sense against a version still having a fixed bug no longer apply.
- Live GitHub Pages site (checked after the deploy, headless Chromium in a normal profile): `index.html` has 24 file references, all `?v=80`, and every numbered URL returns 200; the page loads from the numbered URLs with the map ready, the loader faded, no JS errors and no 4xx responses; Chrome's installability check still reports no errors and the manifest parses; the worker saved 27 entries with one copy of each file (for example only `js/state.js?v=80`); nothing was requested outside the site; and an offline reload still loads the app from the cache.
- Not tested: a real phone, and other browsers' refresh behavior (for example Safari).

### Build Log 22 (completed): v81, plane larger than the runway while it is in the air (airport popup)
Built as spec'd in the Build Queue, with Jon's confirmed reading of the 140 to 160 MPH band (hysteresis).
- [x] `js/airport-popup.js`: new constants `AIRPORT_POPUP_AIRBORNE_UP_MPH = 160`, `AIRPORT_POPUP_AIRBORNE_DOWN_MPH = 140`, `AIRPORT_POPUP_AIRBORNE_SCALE = 2` and `AIRPORT_POPUP_AIRBORNE_DURATION_MS = 1500`. On each draw the popup checks the speed (`STATE.plane.speed * 1.15078`): above 160 MPH it is "in the air", below 140 MPH it is "on the ground", and in between it keeps its previous state. Each flip eases the plane size over 1.5 s (same `easeInOutCubic` as the Overview/Follow snap); a reversal mid-ease starts from the current size. The plane's font size is now `AIRPORT_POPUP_PLANE_PX * (1 + (AIRPORT_POPUP_AIRBORNE_SCALE - 1) * blend)`: 50 px on the ground, 100 px in the air, in both Overview and Follow.
- [x] `openAirportPopup()`: the size starts at the right value for the current speed with no animation.
- [x] `js/state.js`: four new `STATE.airportPopup` fields (`airborne`, `airborneBlend`, `airborneChangeStart`, `airborneFromBlend`).
- [x] `index.html`: all 24 `?v=` numbers are now 81.
- [x] **One choice not in the spec:** if the popup is opened while the speed is inside the 140 to 160 band, there is no earlier state, so it starts airborne at 150 MPH or more and on the ground below 150 (the middle of the band).
- [x] Left out, as spec'd: the four runway-detection values (60 ft, 150 ft, 7 degrees, 50 MPH), the Overview/Follow camera, the tap target, the cutscenes and the altitude readout are unchanged. The size is evaluated every draw regardless of whether the plane is in frame, so a plane arriving fast is already at the airborne size when it enters the picture.

**Verification:** headless Chromium at 412x915, fake clock, plane speed driven directly, plane size read from the popup canvas draw call.
- 23 checks pass: 50 px at 0, 139, 150 (was ground) and exactly 160 MPH; 161 MPH starts at 50 px, is 75 px at 0.75 s and 100 px at 1.5 s; 150 and exactly 140 MPH stay 100 px once airborne; below 140 it eases back, 75 px at 0.75 s; a reversal mid-ease continues from about 75 px with no jump and reaches 100 px 1.5 s later; speed wobbling between 159 and 161 does not flip it; it opens at the right size with no animation at 300, 60, 155 and 145 MPH; Overview and Follow (plane on a runway) give the same 50 px / 100 px; no JS errors.
- Version check: 24 references, all `?v=81`. The earlier suites were rerun: offline cache, home, home marker, use-my-location, fonts, installable, popup close, destination save, startup race (0 of 30 loads), altitude diagnostic and altitude rule all pass; the version buster suite passes with its numbers shifted up by one (9 of 9). The pin test has one stale assertion (it expects a black runway glyph in the old build to compare against) that fails the same way on unchanged v80, so it is not from this build.
- Not tested: a real phone and a real flight.

## Build Queue

Fully specified work that is waiting for a go-ahead. Items leave this list in the same commit that builds them.

### 1. Track-Up mode: cache an oversized map snapshot and slide it instead of redrawing
**Not yet authorized to build.** Would ship as v82 (every `?v=` number in
`index.html` becomes 82).

The problem: in Track-Up the plane's projected position is part of the
render-cache signature (`draw()` in `js/live-layer.js`), and the plane is
dead-reckoned forward every frame, so the signature changes every frame and
the whole base map is redrawn about 60 times a second. North-Up already
caches its snapshot once the view holds still for 200 ms; Track-Up never
does. Jon's idea: while the heading is steady the map just moves under the
plane in a straight line, so snapshot a slightly oversized picture once and
slide it, instead of redrawing.

The design:
- **Oversized snapshot (Track-Up only).** The cache holds the screen plus
  70 px ahead of the plane (straight up on screen, since Track-Up puts the
  heading at the top) and 10 px on each side. Nothing behind. About 13% more
  pixels than the screen.
- **Sliding.** While the snapshot is valid, each frame draws it shifted by
  the plane's movement since the snapshot, in map space, rounded to whole
  device pixels so it stays sharp. The live layer (plane, labels, 📍) is still
  drawn fresh every frame on top, exactly as now.
- **Margin math (checked with the real projection).** The map scrolls about
  47 px a minute at max zoom and 500 kt (about 16 px at zoom 40, about 1 px at
  the full-US view). Since 70 px is fixed, it lasts roughly 70 s of margin at
  the worst case (max zoom, 500 kt) after the refresh point below, and much
  longer at lower zoom or speed.
- **When it takes a snapshot.** Only after the heading has held within 1° of
  one value for 6 seconds (two 3-second GPS polls, so one dropped fix does not
  count as a change of heading and one late fix cannot trigger a snapshot in
  the middle of a turn). It never snapshots while turning.
- **When it throws the snapshot away and redraws live.** The remaining margin
  ahead drops under 20% (about 14 px); the plane shifts past the side margin
  (for example after a late GPS fix corrects the position); the heading
  drifts more than 1° from the snapshot's; or anything already in the
  signature changes: pan, zoom, the layer toggles, day/night, border color,
  terminator or seasonal date, or the screen size. While a snapshot is not
  valid it draws live, as it does today.
- **The day/night terminator stays inside the snapshot** (it is part of the
  base map, not the live layer). Its existing 60-second refresh is part of the
  signature, so with the terminator on, each refresh expires the snapshot and
  it is redrawn about once a minute; with it off, only the 70 px margin
  decides.
- **North-Up is untouched.** Its caching (200 ms of stillness) stays exactly
  as is. Cutscenes, the airport popup, the tap targets and GPS handling are
  untouched.

Where: `js/live-layer.js` (the cache section and `draw()`) and new
`STATE.render` fields in the same place. Constants for 70, 10, 6 s, 1° and
20% sit at the top of that section.

Test plan: headless Chromium at 412x915, synthetic GPS and a fake clock.
Count how many times the base map is actually redrawn in a straight 2-minute
Track-Up flight (expected: a handful, not thousands), and compare the
sliding frame to a full live redraw of the same frame, pixel by pixel
(expected: identical or within rounding) at several zooms and headings. Also
check: no snapshot during a turn or before 6 s of steady heading; a dropped
fix leaves the timer running; a late fix that jumps the position forces a
redraw; each trigger above falls back to live drawing; North-Up caching
behaves as before; toggling Track-Up on and off; then the full earlier
suites, the version check for `?v=82`, and the live site.


### 2. "Look out the window" landmark callouts
**Not yet authorized to build.** Ships as the next free version number when
it is built (v83 if it follows item 1, v82 if it goes first); every `?v=`
number in `index.html` changes to it.

What Jon wants: a small banner when the plane gets near a landmark that
could actually be seen from the window, saying how far ahead it is and which
side, for example "🗻 Mount Rainier, 55 NM ahead, on your left". Landmarks
only for now (not rivers, not city glow, not the Grand Canyon, see the
Planner). Size decides how far away it can be seen, and a hand-picked class
decides whether it can be seen at night.

**Data (`js/state.js`, the 42 entries of `STATE.landmarks`).** Each landmark
gets two new fields: `view` (`'always'`, `'day'` or `'none'`) and, unless
it is `'none'`, `size` (`'huge'`, `'large'`, `'medium'` or `'small'`).
- Visible day and night (`'always'`): Las Vegas Strip (large), Disney World
  (large), Kilauea Volcano (huge), Gateway Arch (medium).
- Visible in daytime only (`'day'`): Denali, Mount Rainier, Mount Shasta,
  Great Smoky Mountains (all huge); Crater Lake, Kennedy Space Center,
  Mackinac Island (large); Niagara Falls, Zion, Pearl Harbor Memorial,
  Indianapolis Motor Speedway, Epic Systems HQ (medium); Golden Gate Bridge,
  El Capitan, Colonial Williamsburg (small).
- Not visible (`'none'`, never called out): the other 23: Arlington
  National Cemetery, Dollywood, The White House, Space Needle, Statue of
  Liberty, Mount Rushmore, Hollywood Sign, Old Faithful, Mall of America,
  French Quarter, Willis Tower, Liberty Bell, Graceland, Wright Brothers
  Memorial, Fenway Park, Multnomah Falls, Carlsbad Caverns, Superman Statue,
  Georgia Aquarium, Field of Dreams, Mammoth Cave, Rock & Roll Hall of Fame,
  The Alamo. Rule used: when unsure, Not visible (a missed callout costs
  little, a wrong one looks silly). Promoting one later is a one-field
  change after Jon checks it from a window.
- Distance by size: huge 80 NM, large 50 NM, medium 25 NM, small 10 NM
  (constants at the top of the new code). The class is by hand, never from
  the phone's altitude (unreliable, see Build Log 17).

**When a callout fires** (checked about once a second over all 42 landmarks,
using `getDistance` and `getBearing` from `js/geodesy.js`):
- the class is not `'none'` and the plane is within that size's distance;
- the landmark is not behind the plane (bearing within 90° of the heading);
- it is daytime at the landmark, for `'day'` ones: the sun is above 6° below
  the horizon (twilight counts as day). The sun position comes from
  `getSubsolarPoint()` in `js/terminator.js`; elevation is 90° minus the
  angular distance from the subsolar point. `'always'` ones skip this test;
- the plane is moving faster than 100 MPH (so taxiing and the takeoff roll
  stay quiet);
- it has not already been called out. Each landmark fires once, and re-arms
  once the plane is farther than 1.25 times that distance away.

**The banner.** A small pill at the top of the map, just below the Flight
Info drawer: the landmark's emoji, its name, then "N NM ahead, on your left"
(or "on your right", or "straight ahead" within 15° of the heading). The
distance keeps updating while it shows. It stays 8 seconds, fades out over
0.5 s, and a tap dismisses it. One at a time; others wait in line, nearest
first, and any that are no longer in range or are behind the plane by then
are dropped. It does not take taps away from the map (only the pill itself
is tappable). It is not shown while a takeoff or landing cutscene is playing.

**Setting.** A "Landmark callouts" on/off button in Settings (default on),
remembered between launches the same way the destination is
(`localStorage`). It is separate from the Landmarks map layer: callouts work
whether or not the landmark icons are shown.

**Left alone:** how landmarks are drawn on the map, the map layers, the
render cache, the airport popup, the cutscenes, GPS handling and the
altitude readout. The Grand Canyon, rivers and city glow are separate
Planner ideas, not part of this build.

**Test plan:** headless Chromium at 412x915 (Pixel 7 size), synthetic GPS,
fake clock and fake date. Check: each size fires at its own distance and not
just outside it; the left/right/ahead wording from the bearing; `'day'`
landmarks fire at noon and stay silent at midnight, with the twilight edge;
`'always'` fire both; `'none'` never; nothing fires behind the plane, below
100 MPH or during a cutscene; once per landmark and the 1.25x re-arm;
queueing order; the banner timing (8 s, 0.5 s fade) and tap-to-dismiss; the
setting turns it off and survives a reload; the Landmarks layer toggle does
not affect it; a screenshot of the banner; then the full earlier suites, the
version check and the live site. Also confirm all 42 landmarks have a valid
class (and a size unless `'none'`).

## Build Planner

Ideas and known gaps with no committed design yet. Resolved, built, dropped or superseded items are deleted from here, and their history lives in the Build Log.

### Surfaced in this session
1. **Grand Canyon as a callout (and a landmark):** the Grand Canyon is not in
   the landmarks list; it is drawn as a dark-brown path (`GRAND_CANYON_PATH`,
   57 points, Lees Ferry to Grand Wash Cliffs, about 210 NM long), not a point.
   Jon wants it added as a landmark and asked where to put the point. A single
   point does not fit something 210 NM long: the middle of the path by
   distance is about 36.40, -112.51, but a callout would fire (or not) by
   distance to that one spot. Idea: treat it as a line feature, so the callout
   fires when the plane is within range of the nearest point on the path and
   the side comes from that nearest point. Daytime only, huge. Open: whether
   to also show an icon on the map (and where), and the wording ("Grand
   Canyon, 40 NM to your left").
2. **River callouts:** Jon noticed the rivers that appear on the map are easy
   to see from the window, so a callout each time the plane crosses (or
   flies along) a river drawn on the map. Not spec'd; he said "I don't know"
   on this. Same line-feature idea as the Grand Canyon (distance to the
   nearest point of the river's path). Open questions: crossing only, or
   also flying alongside; which rivers (the always-drawn Mississippi, the
   ones behind the Other Rivers toggle, or only the biggest); daytime only
   (rivers are dark at night); how to keep a coast-to-coast flight from
   producing a banner every few minutes (for example, only the biggest
   rivers, or one banner per river per flight); and the naming (the river
   data has no names yet beyond its keys).
