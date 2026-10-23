    // --- CONTROLLER EVENT HANDLERS ---
    function handleAirportSelect() {
        const val = document.getElementById('sel-airport').value;
        if (!val) return;
        const ap = JSON.parse(val);
        STATE.target = ap;

        // New destination - the runway marker should track live again until
        // it gets within 2NM of this new airport.
        STATE.runwayLocked = false;
        STATE.runwayLockedBearing = null;

        // Heading is NOT snapped here — the sim loop's fixed 10deg/sec turn
        // logic will gradually bring the plane onto the new course on its own.
        STATE.plane.speed = 460;

        draw();
    }

    function toggleTrackUp() {
        STATE.view.trackUp = !STATE.view.trackUp;

        if (STATE.view.trackUp) {
            // In Track-Up mode the plane always renders at (w/2+offsetX, h/2+offsetY),
            // so offset (0,0) is exactly what puts it dead-center.
            STATE.view.offsetX = 0;
            STATE.view.offsetY = 0;
        } else {
            // In North-Up mode the plane is just another point on the map, so we
            // have to compute the offset that puts its actual position at screen center.
            const planeProj = project(STATE.plane.lat, STATE.plane.lon);
            STATE.view.offsetX = -planeProj.x * STATE.view.zoom;
            STATE.view.offsetY = -planeProj.y * STATE.view.zoom;
        }

        clampViewOffsets();
        draw();
    }

    function toggleLandmarks() {
        STATE.toggles.landmarks = !STATE.toggles.landmarks;
        document.getElementById('btn-toggle-landmarks').classList.toggle('active', STATE.toggles.landmarks);
        draw();
    }

    function toggleAirports() {
        STATE.toggles.airports = !STATE.toggles.airports;
        document.getElementById('btn-toggle-airports').classList.toggle('active', STATE.toggles.airports);
        draw();
    }

    // Home location -- direct lat/lon entry only (no address/geocoding, to
    // keep this fully offline like the rest of the app). Saved to
    // localStorage so it survives closing the app -- see saveHomeLocation /
    // loadHomeLocation below. Invalid or out-of-range values are treated as
    // "not set" rather than drawing a marker somewhere nonsensical.
    function handleHomeLocationChange() {
        const latVal = parseFloat(document.getElementById('input-home-lat').value);
        const lonVal = parseFloat(document.getElementById('input-home-lon').value);
        const latValid = !isNaN(latVal) && latVal >= -90 && latVal <= 90;
        const lonValid = !isNaN(lonVal) && lonVal >= -180 && lonVal <= 180;
        STATE.homeLocation.lat = latValid ? latVal : null;
        STATE.homeLocation.lon = lonValid ? lonVal : null;
        STATE.homeLocation.show = document.getElementById('chk-home-show').checked;
        saveHomeLocation();
        // The render cache's change-detection signature (see draw() in
        // live-layer.js) doesn't include the home location, so without this
        // the marker wouldn't appear until something else changed the view.
        STATE.render.cacheValid = false;
        draw();
    }

    const HOME_STORAGE_KEY = 'stratosphere.homeLocation';

    // Saves the raw text of the two input boxes plus the "Show on map"
    // checkbox. If everything is empty/unchecked, removes the saved entry
    // instead. Every storage call is wrapped in try/catch: if storage is
    // unavailable (private mode, blocked site data), the app simply behaves
    // as if nothing were saved.
    function saveHomeLocation() {
        const latText = document.getElementById('input-home-lat').value;
        const lonText = document.getElementById('input-home-lon').value;
        const show = document.getElementById('chk-home-show').checked;
        try {
            if (latText === '' && lonText === '' && !show) {
                localStorage.removeItem(HOME_STORAGE_KEY);
            } else {
                localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify({ lat: latText, lon: lonText, show: show }));
            }
        } catch (e) { /* storage unavailable -- nothing to do */ }
    }

    // Restores the saved home location on launch: refills the inputs, then
    // goes through handleHomeLocationChange() so the normal validation and
    // redraw apply. A missing or unreadable entry does nothing.
    function loadHomeLocation() {
        let saved = null;
        try {
            const raw = localStorage.getItem(HOME_STORAGE_KEY);
            if (raw) saved = JSON.parse(raw);
        } catch (e) { return; }
        if (!saved || typeof saved !== 'object') return;
        document.getElementById('input-home-lat').value = String(saved.lat ?? '');
        document.getElementById('input-home-lon').value = String(saved.lon ?? '');
        document.getElementById('chk-home-show').checked = saved.show === true;
        handleHomeLocationChange();
    }
    document.addEventListener("DOMContentLoaded", loadHomeLocation);

    function toggleTerminator() {
        STATE.toggles.terminator = !STATE.toggles.terminator;
        document.getElementById('btn-toggle-terminator').classList.toggle('active', STATE.toggles.terminator);
        draw();
    }

    function toggleSeasonalColors() {
        STATE.toggles.seasonalColors = !STATE.toggles.seasonalColors;
        document.getElementById('btn-toggle-seasonal').classList.toggle('active', STATE.toggles.seasonalColors);
        draw();
    }

    // Lets the user pick any date to preview what the seasonal colors will
    // look like on that day, without waiting for the real calendar to get
    // there. The <input type="date"> value is "YYYY-MM-DD"; parsed as local
    // time (not UTC) so it lines up with the same local-date logic
    // checkSeasonWindow() already uses for the real current date.
    function handleSeasonalDateOverride() {
        const val = document.getElementById('input-seasonal-date').value;
        if (!val) { STATE.seasonalDateOverride = null; draw(); return; }
        const [y, m, d] = val.split('-').map(Number);
        STATE.seasonalDateOverride = new Date(y, m - 1, d);
        draw();
    }

    function resetSeasonalDate() {
        STATE.seasonalDateOverride = null;
        document.getElementById('input-seasonal-date').value = '';
        draw();
    }

    function toggleSpeedUnit(event) {
        if (event) event.stopPropagation(); // don't also toggle the drawer open/closed
        STATE.speedUnitMph = !STATE.speedUnitMph;
        updateTelemetryUI();
    }

    let gpsIntervalId = null;
    let lastGpsFix = null; // {lat, lon, time} of the previous raw fix, for computing instantaneous heading/speed

    // In-flight GPS fixes can take anywhere from ~1 second to ~a minute to
    // resolve, and single readings can be noisy. This averages recent
    // readings (heading averaged as vectors, since e.g. 359deg and 1deg
    // should average to ~0deg, not 180deg) and blends new fixes in gradually
    // rather than snapping — dead-reckoning in animate() fills the gaps.
    //
    // Timeout is intentionally kept BELOW the 3000ms poll interval (set in
    // gpsIntervalId below) so a new request can never be dispatched while a
    // previous one is still pending. Without this, a long real signal gap
    // could let requests stack up; when signal returns, a burst of
    // near-simultaneous late responses could compute a wildly wrong speed
    // (real distance / near-zero elapsed time between two queued
    // responses), which dead-reckoning would then use to rocket the plane
    // forward.
    function fetchGPSPosition() {
        if (!("geolocation" in navigator)) return;
        navigator.geolocation.getCurrentPosition(
            onGPSSuccess,
            onGPSError,
            { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
        );
    }

    function onGPSSuccess(pos) {
        const now = Date.now();
        const newLat = pos.coords.latitude;
        const newLon = pos.coords.longitude;

        let instHeading = (pos.coords.heading != null && !isNaN(pos.coords.heading)) ? pos.coords.heading : null;
        let instSpeedKts = (pos.coords.speed != null && !isNaN(pos.coords.speed)) ? pos.coords.speed * 1.94384 : null;
        // No fallback exists for altitude (unlike heading/speed, it can't be
        // derived from position deltas) -- if this fix doesn't have it,
        // recentAltitudes/STATE.plane.altitude are simply left untouched
        // below, which is exactly the "freeze at last known value" behavior.
        const instAltitudeFt = (pos.coords.altitude != null && !isNaN(pos.coords.altitude)) ? pos.coords.altitude * 3.28084 : null;

        // Fall back to computing heading/speed from the change since the last
        // fix, if the device didn't report them directly.
        if (lastGpsFix) {
            if (instHeading === null) {
                instHeading = getBearing(lastGpsFix.lat, lastGpsFix.lon, newLat, newLon);
            }
            if (instSpeedKts === null) {
                const distNm = getDistance(lastGpsFix.lat, lastGpsFix.lon, newLat, newLon);
                const dtHours = (now - lastGpsFix.time) / 3600000;
                if (dtHours > 0) instSpeedKts = distNm / dtHours;
            }
        }

        // Below ~2kts, GPS heading -- whether device-reported or computed
        // from the position delta since the last fix -- is unreliable
        // noise, not real direction of travel: even while truly stationary,
        // consumer GPS receivers still wobble a few meters, and a bearing
        // computed between two essentially-random nearby points is
        // essentially a random angle. Below this threshold, simply don't
        // push a new heading sample -- it freezes at the last real value.
        // Position itself is untouched by this and keeps updating normally
        // (real fixes or dead-reckoning) regardless of heading being frozen.
        const STATIONARY_HEADING_SPEED_KTS = 2;
        if (instHeading !== null && (instSpeedKts === null || instSpeedKts > STATIONARY_HEADING_SPEED_KTS)) {
            STATE.gps.recentHeadings.push(instHeading);
            if (STATE.gps.recentHeadings.length > 5) STATE.gps.recentHeadings.shift();
        }
        if (instSpeedKts !== null) {
            STATE.gps.recentSpeeds.push(instSpeedKts);
            if (STATE.gps.recentSpeeds.length > 5) STATE.gps.recentSpeeds.shift();
        }
        if (instAltitudeFt !== null) {
            STATE.gps.recentAltitudes.push({ value: instAltitudeFt, time: Date.now() });
            if (STATE.gps.recentAltitudes.length > 5) STATE.gps.recentAltitudes.shift();
            STATE.gps.lastAltitudeFixTime = Date.now();
        }

        // Vector-average heading so wraparound (359deg/1deg) averages correctly
        if (STATE.gps.recentHeadings.length > 0) {
            let sumX = 0, sumY = 0;
            STATE.gps.recentHeadings.forEach(h => {
                const r = h * Math.PI / 180;
                sumX += Math.cos(r);
                sumY += Math.sin(r);
            });
            STATE.gps.targetHeading = (Math.atan2(sumY, sumX) * 180 / Math.PI + 360) % 360;
        }

        // Median (not mean, unlike speed) -- altitude is the noisiest of the
        // GPS fields, and median resists a single spike better than a mean
        // would. Filtered by AGE first (60s), not just count -- altitude
        // fixes can be sparse (needs a full 4-satellite 3D lock), so "the
        // last 5 successful readings" could otherwise span several minutes,
        // letting stale ground-level values drag the median down long after
        // a real climb has started. If nothing survives the age filter,
        // this whole block is skipped, leaving STATE.plane.altitude at its
        // last computed value (freeze-on-gap, same as before).
        const ALTITUDE_MAX_AGE_MS = 60000;
        const freshAltitudes = STATE.gps.recentAltitudes.filter(r => Date.now() - r.time <= ALTITUDE_MAX_AGE_MS);
        if (freshAltitudes.length > 0) {
            const sorted = freshAltitudes.map(r => r.value).sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            STATE.plane.altitude = Math.round(median);
        }

        if (STATE.gps.recentSpeeds.length > 0) {
            const avgSpeed = STATE.gps.recentSpeeds.reduce((a, b) => a + b, 0) / STATE.gps.recentSpeeds.length;
            STATE.plane.speed = Math.round(avgSpeed);
            // Automatic trigger disabled -- superseded by the runway popup
            // view for the airports currently defined. checkCutsceneTriggers()
            // itself, playCutscene(), and endCutscene() are all still fully
            // intact; the manual Settings test buttons call playCutscene()
            // directly and are unaffected by this. Uncomment to restore:
            // checkCutsceneTriggers(STATE.plane.speed * 1.15078); // knots -> MPH, same factor used elsewhere
        }

        // Don't snap to the new fix — blend most of the way toward it, and let
        // continuous dead-reckoning (in animate()) handle smooth movement
        // between fixes, including long gaps.
        if (lastGpsFix === null) {
            STATE.plane.lat = newLat;
            STATE.plane.lon = newLon;
        } else {
            STATE.plane.lat = STATE.plane.lat * 0.4 + newLat * 0.6;
            STATE.plane.lon = STATE.plane.lon * 0.4 + newLon * 0.6;
        }

        lastGpsFix = { lat: newLat, lon: newLon, time: now };
        STATE.gps.lastFixError = null;
        updateGpsStatusDot();
        updateAltitudeStatusDot();
    }

    function onGPSError(err) {
        // Graceful degradation: keep dead-reckoning on the last known heading
        // and speed rather than stalling — exactly the scenario this was
        // built for (fixes that take a long time or fail entirely mid-flight).
        STATE.gps.lastFixError = err ? err.message : "Unknown GPS error";
        console.warn("GPS fix failed, continuing on dead-reckoning:", STATE.gps.lastFixError);
        updateGpsStatusDot();
        updateAltitudeStatusDot();
    }

    // GPS status indicator: 🟢 recent fix, 🟡 aging fix, 🔴 no fix / error.
    // Called on every fix success/error, and on a timer so the dot ages
    // from green to yellow even between polls.
    function gpsStatusEmoji() {
        if (!lastGpsFix) return "🔴"; // never had a fix yet
        const ageMs = Date.now() - lastGpsFix.time;
        if (STATE.gps.lastFixError) {
            // last poll attempt failed; only show red once the fix we do
            // have is also getting stale, otherwise it's just a blip
            return ageMs > 30000 ? "🔴" : "🟡";
        }
        if (ageMs < 15000) return "🟢";
        if (ageMs < 30000) return "🟡";
        return "🔴";
    }

    function updateGpsStatusDot() {
        const el = document.getElementById('gps-status-dot');
        if (el) el.textContent = gpsStatusEmoji();
    }

    // Altitude validity light: 🟢 if a fix with valid (non-null) altitude --
    // i.e. a real 4-satellite 3D lock -- arrived within the last 30s, 🔴
    // otherwise. Deliberately simple 2-state (unlike the 3-tier general GPS
    // dot above), and independent of it: a fix can succeed with good
    // lat/lon but no altitude if the satellite geometry isn't good enough
    // for a 3D fix, so this needs its own separate timestamp.
    const ALTITUDE_STATUS_MAX_AGE_MS = 30000;
    function altitudeStatusEmoji() {
        if (!STATE.gps.lastAltitudeFixTime) return "🔴";
        return (Date.now() - STATE.gps.lastAltitudeFixTime <= ALTITUDE_STATUS_MAX_AGE_MS) ? "🟢" : "🔴";
    }
    function updateAltitudeStatusDot() {
        const el = document.getElementById('altitude-status-dot');
        if (el) el.textContent = altitudeStatusEmoji();
    }

    // Real single-point sun-elevation check -- same math the terminator
    // feature already uses (see getSubsolarPoint above), just asking "is the
    // sun above or below the horizon at this ONE lat/lon" instead of
    // building the whole terminator curve/fill. Not affected by whether the
    // terminator's own toggle is on -- this is just the underlying formula.
    function isLocationInDaylight(lat, lon) {
        const sub = getSubsolarPoint(new Date());
        const d2r = Math.PI / 180;
        const cosAngle = Math.sin(sub.lat * d2r) * Math.sin(lat * d2r) +
                         Math.cos(sub.lat * d2r) * Math.cos(lat * d2r) * Math.cos((lon - sub.lon) * d2r);
        return cosAngle >= 0;
    }

    // One-time day/night default, decided once the early GPS kickoff (fired
    // at the very top of the page, before the loading screen even started)
    // has either resolved or given up (max 3s -- see that script for the
    // exact timing). If a real fix came back in time, use the actual
    // sun-elevation check at that location. Otherwise fall back to the
    // phone's local clock: 7pm-6:59am -> Night (STATE.dayMode's existing
    // default of false already covers this), 7am-6:59pm -> Day. Either way
    // this only runs once; the manual toggle works normally afterward with
    // no ongoing auto-switching. The loading screen's own fade-out is gated
    // on window.earlyGpsSettled, so this is always finished before the map
    // is ever actually shown -- no flash, no visible flip.
    window.applyEarlyDayNightDecision = function () {
        if (window.earlyDecisionApplied) return;
        window.earlyDecisionApplied = true;

        let shouldBeDay;
        if (window.earlyGpsCoords) {
            shouldBeDay = isLocationInDaylight(window.earlyGpsCoords.lat, window.earlyGpsCoords.lon);
        } else {
            const hour = new Date().getHours();
            shouldBeDay = (hour >= 7 && hour < 19);
        }

        if (shouldBeDay !== STATE.dayMode) {
            setDayNightMode(shouldBeDay);
        } else {
            updateSeasonalButtonAvailability(); // still needs to reflect the default even with no toggle call
        }
    };
    // Cover the case where GPS already settled before this function existed
    // (unlikely in practice -- GPS always takes real device time, far more
    // than parsing the rest of this page -- but cheap to guard against).
    if (window.earlyGpsSettled) {
        window.applyEarlyDayNightDecision();
    }

    // GPS tracking starts automatically on load — fetch immediately, then
    // poll every 3 seconds for near-real-time position updates.
    lastGpsFix = null;
    STATE.gps.recentHeadings = [];
    STATE.gps.recentSpeeds = [];
    STATE.gps.targetHeading = null;
    STATE.gps.lastAltitudeFixTime = null;
    fetchGPSPosition();
    gpsIntervalId = setInterval(fetchGPSPosition, 3000);
    updateGpsStatusDot();
    setInterval(updateGpsStatusDot, 2000);
    updateAltitudeStatusDot();
    setInterval(updateAltitudeStatusDot, 2000);
