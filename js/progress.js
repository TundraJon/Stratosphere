    // ============================================================
    // TRIP PROGRESS -- the gauge card in the Flight Info grid. Percent
    // complete = how much of the straight-line distance from the START
    // airport to the selected destination the plane has covered. The start
    // is picked by hand from Settings > Start Airport (nothing is detected
    // automatically), so a whole multi-leg trip can be tracked: pick the
    // first airport as the start and leave the destination on the last one.
    // The pick is saved for 24 hours.
    // ============================================================
    const TRIP_START_STORAGE_KEY = 'stratosphere.tripStart';
    const TRIP_START_MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const GAUGE_RADIUS = 18;
    const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
    const GAUGE_ARC_LENGTH = GAUGE_CIRCUMFERENCE * 240 / 360; // two thirds of the circle, open at the bottom

    STATE.trip = {
        start: null,      // { lat, lon, name, time } or null
        shownPct: null,   // what the card currently shows (so the page is only touched when it changes)
        shownCaption: null
    };

    function saveTripStart() {
        try {
            if (STATE.trip.start) localStorage.setItem(TRIP_START_STORAGE_KEY, JSON.stringify({ name: STATE.trip.start.name, time: STATE.trip.start.time }));
            else localStorage.removeItem(TRIP_START_STORAGE_KEY);
        } catch (e) { /* storage unavailable -- nothing to do */ }
    }

    function clearTripStart() {
        STATE.trip.start = null;
        const sel = document.getElementById('sel-start-airport');
        if (sel) sel.value = '';
        saveTripStart();
    }

    // Settings > Start Airport changed (or was set back to "Not set").
    function handleStartAirportSelect() {
        const val = document.getElementById('sel-start-airport').value;
        if (!val) { clearTripStart(); return; }
        const ap = JSON.parse(val);
        STATE.trip.start = { lat: ap.lat, lon: ap.lon, name: ap.name, time: Date.now() };
        saveTripStart();
    }

    // On launch: bring back the saved start if it is under 24 hours old and still in the list.
    function loadTripStart() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(TRIP_START_STORAGE_KEY)); } catch (e) { return; }
        if (!saved || typeof saved !== 'object' || !saved.name || !saved.time) return;
        if (Date.now() - saved.time > TRIP_START_MAX_AGE_MS) { saveTripStartExpired(); return; }
        const ap = AIRPORTS.find(a => a.name === saved.name);
        if (!ap) return;
        STATE.trip.start = { lat: ap.lat, lon: ap.lon, name: ap.name, time: saved.time };
        const sel = document.getElementById('sel-start-airport');
        const opt = sel && Array.from(sel.options).find(o => { try { return o.value && JSON.parse(o.value).name === saved.name; } catch (e) { return false; } });
        if (opt) sel.value = opt.value;
    }
    function saveTripStartExpired() { try { localStorage.removeItem(TRIP_START_STORAGE_KEY); } catch (e) { /* nothing to do */ } }

    // Percent complete (0 to 100) given the plane's distance to the destination, or null if it cannot be worked out.
    function tripProgressPct(distToDestNm) {
        const st = STATE.trip.start;
        if (!st || distToDestNm === null) return null;
        const total = getDistance(st.lat, st.lon, STATE.target.lat, STATE.target.lon);
        if (total < 1) return null;               // the start is the destination
        return Math.max(0, Math.min(100, (1 - distToDestNm / total) * 100));
    }

    // Called from updateTelemetryUI() every frame with the plane's distance to the destination (null before a GPS fix).
    function updateProgressCard(distToDestNm) {
        const st = STATE.trip.start;
        if (st && Date.now() - st.time > TRIP_START_MAX_AGE_MS) clearTripStart();   // 24 hours are up
        const pct = tripProgressPct(distToDestNm);
        const text = pct === null ? '--' : Math.round(pct) + '%';
        const caption = STATE.trip.start ? (pct === null ? 'waiting' : 'complete') : 'set start';
        if (text !== STATE.trip.shownPct) {
            STATE.trip.shownPct = text;
            document.getElementById('val-progress').textContent = text;
            document.getElementById('progress-fill').style.strokeDasharray = (pct === null ? 0 : GAUGE_ARC_LENGTH * pct / 100) + ' ' + GAUGE_CIRCUMFERENCE;   // via style so the CSS ease applies
        }
        if (caption !== STATE.trip.shownCaption) {
            STATE.trip.shownCaption = caption;
            document.getElementById('lbl-progress').textContent = caption;
        }
    }

    // Tapping the card with no start set opens Settings at the Start Airport list.
    function onProgressCardTap() {
        if (STATE.trip.start) return;
        const drawer = document.getElementById('bottom-drawer');
        if (drawer.classList.contains('collapsed')) toggleDrawer('bottom-drawer');
        const sel = document.getElementById('sel-start-airport');
        setTimeout(() => { sel.scrollIntoView({ block: 'center' }); sel.focus(); }, 350);
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadTripStart();
        const track = document.querySelector('#progress-gauge .gauge-track');
        const fill = document.getElementById('progress-fill');
        track.style.strokeDasharray = GAUGE_ARC_LENGTH + ' ' + GAUGE_CIRCUMFERENCE;
        fill.style.strokeDasharray = '0 ' + GAUGE_CIRCUMFERENCE;
    });
