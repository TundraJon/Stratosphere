    // ============================================================
    // LANDMARK CALLOUTS -- a small banner when the plane gets near a
    // landmark that could really be seen from the window. Each landmark in
    // STATE.landmarks carries a hand-picked `view` class ('always' = visible
    // day and night, 'day' = visible in daylight only, 'none' = never
    // called out) and, unless 'none', a `size` tier that sets how far away
    // it can be seen. The Grand Canyon is a line (`line: true`): its
    // distance is to the nearest point along GRAND_CANYON_PATH. Never uses
    // the phone's altitude (unreliable).
    // ============================================================
    const CALLOUT_RANGE_NM = { huge: 80, large: 50, medium: 25, small: 10 };
    const CALLOUT_MIN_SPEED_MPH = 140;
    const CALLOUT_REARM_FACTOR = 1.25;     // fires again only after the plane gets this many times the range away
    const CALLOUT_AHEAD_MAX_DEG = 90;      // a landmark farther off the nose than this is "behind" and ignored
    const CALLOUT_STRAIGHT_DEG = 15;       // within this of the heading = "straight ahead"
    const CALLOUT_TWILIGHT_DEG = -6;       // sun this far below the horizon still counts as day
    const CALLOUT_SHOW_MS = 8000;
    const CALLOUT_FADE_MS = 500;
    const CALLOUT_STORAGE_KEY = 'stratosphere-landmark-callouts';

    STATE.callouts = {
        enabled: true,
        fired: {},        // landmark name -> true once called out (until re-armed)
        queue: [],        // landmarks waiting to be shown
        current: null,    // { lm, shownAt } while a banner is up
        dismissing: false
    };

    // Nearest point on a polyline to (lat, lon), in nautical miles, using a
    // flat local approximation around the plane (accurate at these ranges).
    function nearestOnPath(points, lat, lon) {
        const kx = 60 * Math.cos(lat * Math.PI / 180), ky = 60;
        let best = null;
        for (let i = 0; i < points.length - 1; i++) {
            const ax = (points[i].lon - lon) * kx, ay = (points[i].lat - lat) * ky;
            const bx = (points[i + 1].lon - lon) * kx, by = (points[i + 1].lat - lat) * ky;
            const dx = bx - ax, dy = by - ay;
            const len2 = dx * dx + dy * dy;
            let t = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2;
            t = t < 0 ? 0 : (t > 1 ? 1 : t);
            const px = ax + dx * t, py = ay + dy * t;
            const d = Math.hypot(px, py);
            if (best === null || d < best.distNm) {
                best = { distNm: d, lat: lat + py / ky, lon: lon + px / kx };
            }
        }
        return best;
    }

    // Distance, side and bearing from the plane to a landmark (for a line
    // landmark, to its nearest point).
    function calloutGeometry(lm) {
        const lat = STATE.plane.lat, lon = STATE.plane.lon;
        let tLat = lm.lat, tLon = lm.lon, dist;
        if (lm.line) {
            const near = nearestOnPath(GRAND_CANYON_PATH, lat, lon);
            tLat = near.lat; tLon = near.lon; dist = near.distNm;
        } else {
            dist = getDistance(lat, lon, lm.lat, lm.lon);
        }
        const brg = getBearing(lat, lon, tLat, tLon);
        const rel = ((brg - STATE.plane.hdg + 540) % 360) - 180; // -180..180, negative = left
        return { dist: dist, rel: rel };
    }

    // Is the sun up (or within twilight) at the landmark right now?
    function calloutIsDaylight(lm) {
        const sub = getSubsolarPoint(new Date());
        const sunDistDeg = getDistance(lm.lat, lm.lon, sub.lat, sub.lon) / 60; // NM -> degrees of arc
        return (90 - sunDistDeg) > CALLOUT_TWILIGHT_DEG;
    }

    function calloutEligible(lm, g) {
        if (lm.view === 'none') return false;
        if (g.dist > CALLOUT_RANGE_NM[lm.size]) return false;
        if (Math.abs(g.rel) > CALLOUT_AHEAD_MAX_DEG) return false;
        if (lm.view === 'day' && !calloutIsDaylight(lm)) return false;
        return true;
    }

    function calloutText(lm, g) {
        const nm = Math.round(g.dist);
        const where = Math.abs(g.rel) <= CALLOUT_STRAIGHT_DEG
            ? 'straight ahead'
            : 'ahead, on your ' + (g.rel < 0 ? 'left' : 'right');
        return `${lm.emoji} ${lm.name}, ${nm} NM ${where}`;
    }

    function positionCalloutBanner() {
        const el = document.getElementById('landmark-callout');
        const drawer = document.getElementById('top-drawer');
        if (!el || !drawer) return;
        el.style.top = (drawer.getBoundingClientRect().bottom + 8) + 'px';
    }

    function hideCalloutBanner() {
        const el = document.getElementById('landmark-callout');
        if (el) { el.classList.remove('show'); el.style.display = 'none'; }
        STATE.callouts.current = null;
        STATE.callouts.dismissing = false;
    }

    function dismissCallout() {
        const C = STATE.callouts;
        if (!C.current || C.dismissing) return;
        C.dismissing = true;
        const el = document.getElementById('landmark-callout');
        el.classList.remove('show');
        setTimeout(hideCalloutBanner, CALLOUT_FADE_MS);
    }

    function showNextCallout() {
        const C = STATE.callouts;
        while (C.queue.length) {
            // Nearest first; drop any that are no longer in range or are behind by now.
            const scored = C.queue.map(lm => ({ lm: lm, g: calloutGeometry(lm) }))
                .filter(x => calloutEligible(x.lm, x.g));
            scored.sort((a, b) => a.g.dist - b.g.dist);
            C.queue = scored.map(x => x.lm);
            if (!scored.length) return;
            const next = C.queue.shift();
            const el = document.getElementById('landmark-callout');
            el.textContent = calloutText(next, calloutGeometry(next));
            positionCalloutBanner();
            el.style.display = 'block';
            void el.offsetWidth; // let the display change land before the fade-in starts
            el.classList.add('show');
            C.current = { lm: next, shownAt: performance.now() };
            C.dismissing = false;
            return;
        }
    }

    // Runs about once a second.
    function checkLandmarkCallouts() {
        const C = STATE.callouts;
        const el = document.getElementById('landmark-callout');
        if (!el) return;

        if (STATE.cutscene.active) {
            if (C.current) hideCalloutBanner();
            return;
        }

        // Keep the banner on the current landmark's live distance; end it after 8 s.
        if (C.current && !C.dismissing) {
            const now = performance.now();
            if (now - C.current.shownAt >= CALLOUT_SHOW_MS) {
                dismissCallout();
            } else {
                el.textContent = calloutText(C.current.lm, calloutGeometry(C.current.lm));
                positionCalloutBanner();
            }
        }

        if (lastGpsFix === null) return;
        const speedMph = STATE.plane.speed * 1.15078; // knots -> mph

        STATE.landmarks.forEach(lm => {
            if (lm.view === 'none') return;
            const g = calloutGeometry(lm);
            if (C.fired[lm.name]) {
                if (g.dist > CALLOUT_RANGE_NM[lm.size] * CALLOUT_REARM_FACTOR) delete C.fired[lm.name];
                return;
            }
            if (!C.enabled || speedMph <= CALLOUT_MIN_SPEED_MPH) return;
            if (!calloutEligible(lm, g)) return;
            C.fired[lm.name] = true;
            C.queue.push(lm);
        });

        if (!C.current && C.enabled) showNextCallout();
    }

    function toggleCallouts() {
        STATE.callouts.enabled = !STATE.callouts.enabled;
        document.getElementById('btn-toggle-callouts').classList.toggle('active', STATE.callouts.enabled);
        try { localStorage.setItem(CALLOUT_STORAGE_KEY, STATE.callouts.enabled ? '1' : '0'); } catch (e) { /* storage unavailable */ }
        if (!STATE.callouts.enabled) {
            STATE.callouts.queue = [];
            hideCalloutBanner();
        }
    }

    function loadCalloutSetting() {
        let v = null;
        try { v = localStorage.getItem(CALLOUT_STORAGE_KEY); } catch (e) { /* storage unavailable */ }
        if (v === '0') STATE.callouts.enabled = false;
        document.getElementById('btn-toggle-callouts').classList.toggle('active', STATE.callouts.enabled);
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadCalloutSetting();
        setInterval(checkLandmarkCallouts, 1000);
    });
