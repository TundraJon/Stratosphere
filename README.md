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

## Build Queue

Fully specified work that is waiting for a go-ahead. Items leave this list in the same commit that builds them.

### 1. Self-host the fonts (remove the Google Fonts dependency)
**Not yet authorized to build.**

Jon's request: stop downloading the fonts from Google Fonts on every launch. The Google Fonts link is the only external dependency in the app.

- Fonts used: **Antonio** 400 and 700 (large readouts) and **Inter** 400 and 600 (everything else). These match the weights in the current Google link.
- Files: a new `fonts/` folder holding four `woff2` files, **Latin subset only** (Jon confirmed), about 100 KB total. Source: the `@fontsource/antonio` and `@fontsource/inter` npm packages (v5.3.0 at the time of writing), both SIL OFL-1.1.
- License: the OFL license text goes in `fonts/` next to the files, as the license requires.
- `css/styles.css`: four `@font-face` rules at the very top, with `font-display: swap` (same as the current Google link) and `src: url('../fonts/...')`. No other CSS changes.
- `index.html`: delete the Google Fonts `<link>` (line 8) and the comment line above it that describes it. Nothing else changes.
- Not included: no other fonts, no other weights, no service worker (see Build Planner item 8).
- Test plan: load the page with every external host blocked and confirm there are zero requests leaving the site and zero failed requests; confirm via `document.fonts` that Antonio 400/700 and Inter 400/600 are all loaded from the repo; check a Pixel 7 size (412x915) screenshot of the telemetry drawer and Settings drawer by eye, and confirm °, ± and … render. Expect text to look different from earlier test screenshots, because those were taken with Google's fonts blocked and used fallback fonts, so an old-vs-new pixel comparison isn't meaningful for this item. Rerun the v64/v65 home-location tests to confirm nothing else changed.
- Ships as: v66.


### 2. Offline cache (service worker)
**Not yet authorized to build.**

Promoted from the Build Planner (old item 8). Jon confirmed: network-first with a 3-second fallback, and offline cache only (not installable). Jon's expectation: no in-flight updating and no "update available" banner. A new version arrives when the page is next loaded with internet, and offline the app runs from its cache.

- New file `sw.js` in the repo root, so its scope covers the whole site (on GitHub Pages that is `/Stratosphere/`). Plain JS, no build step.
- New file `js/register-sw.js`, loaded as the last `<script>` in `index.html` (after `js/controls.js`; no other script order changes). It registers `sw.js` on window `load`, wrapped in a check for `'serviceWorker' in navigator` and a `.catch` so an unsupported or failed registration changes nothing about the app.
- Fetch strategy (GET requests to the same origin only; anything else passes through untouched): try the network with a 3-second timeout; on success, store a copy in the cache and return the response; on failure or timeout, return the cached copy. For page navigations with no cached copy of that exact URL, fall back to the cached `index.html`.
- The network fetch uses `cache: 'no-cache'` so the browser revalidates instead of reusing its own HTTP cache. GitHub Pages typically lets browsers reuse files for several minutes, which would otherwise delay an update past a single reload.
- Single cache name constant in `sw.js`; on activate, delete caches with any other name. `skipWaiting()` on install and `clients.claim()` on activate, so the new worker takes over on the first reload.
- First-visit rule: the very first page load finishes before the worker is active, so its files never pass through the fetch handler. To fix that without a hand-kept file list, `js/register-sw.js` sends the worker the list of same-origin URLs the page loaded (from `performance.getEntriesByType('resource')` plus the page URL) once the worker is ready, but only when the page was not already controlled by a worker. The worker fetches and caches them. Anything loaded later (for example a font used on a later screen) is cached by the normal fetch handler.
- Not included: no manifest or icons (see Build Planner item 9), no update banner, no background sync, no changes to the app's own GPS or home-location code.
- Test plan, at Pixel 7 size (412x915) against a local server (localhost counts as a secure context): load once online, wait for the cache to fill, go offline, reload, and confirm the map loads, the loader fades, there are zero JS errors, every script and the CSS came from the cache, and the home location still restores; change a served file, reload once online, and confirm the new version shows on that first reload; serve it with a long `max-age` header and confirm the new version still shows on the first reload; delay responses past 3 seconds and confirm the page loads from the cache after about 3 seconds; confirm the app works with the service worker unsupported or blocked; confirm nothing external is requested; rerun the v64/v65 home-location tests. Then recheck the live GitHub Pages site once after pushing.
- Order: independent of Build Queue 1. If the fonts are self-hosted first, they are cached automatically like any other file.
- Ships as: v67.

## Build Planner

Ideas and known gaps with no committed design yet. Resolved, built, dropped or superseded items are deleted from here, and their history lives in the Build Log.

### From the handoff doc
1. **Cutscene runway color:** black -> medium grey (no hex chosen)
2. **Cutscene background gradient gap:** the main map uses scattered-dot
   seasons, but the cutscene likely still uses a plain gradient
   - Low value now: the automatic cutscene trigger is disabled
     (the manual test buttons still run it)

### Surfaced in earlier sessions
4. **GPS-noise tuning after your flight test:** 60 ft lateral margin,
   150 ft along-track margin, 7° alignment, 50 mph threshold.
   Waiting on real-world results from the GPS-loss flight test. The 60 ft
   lateral margin, 150 ft along-track margin and 7° alignment are the
   values to watch.
5. **Wyoming's snow start (Oct 11) comes before its dead-time (Oct 21):**
   a known choice, parked
6. **Track-Up mode never gets the idle-snapshot caching:** a limitation,
   not a regression

### Status unknown (can't confirm either way)
7. **Plane icon reading the same variable as the Flight Info lat/lon:**
   in the handoff doc's old queue. I can't tell whether it was ever built.

### Surfaced later
9. **Installable app ("Add to Home Screen"):** split out of the offline-cache
   idea. Needs a web app manifest (name, theme color, standalone display) and
   app icons, and builds on the offline cache (Build Queue 2). Not needed for
   offline use, so parked for now. Open questions: icon design, whether it
   should share a look with a future Google Play version.
