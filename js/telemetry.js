    // --- TELEMETRY CALCULATOR AND WRITER ---
    function updateTelemetryUI() {
        document.getElementById('lbl-route-code').textContent = formatAirportDisplay(STATE.target.name).split(' ')[0];
        document.getElementById('lbl-route-citystate').textContent = STATE.target.name.substring(STATE.target.name.indexOf('('));

        // Nothing meaningful to show until we've had a real GPS fix — the
        // plane's lat/lon/heading/speed are just placeholder defaults until
        // then, and showing them looks like the plane is already moving.
        if (lastGpsFix === null) {
            document.getElementById('lbl-summary-speed').textContent = "Waiting for GPS...";
            document.getElementById('lbl-speed-title').textContent = STATE.speedUnitMph ? "Ground Speed" : "Airspeed";
            document.getElementById('val-hdg').textContent = "--";
            document.getElementById('val-dist').textContent = "--";
            document.getElementById('val-lat').textContent = "--";
            document.getElementById('val-lon').textContent = "--";
            document.getElementById('val-altitude').textContent = "--";
            document.getElementById('val-eta').textContent = "--:--";
            document.getElementById('val-ete').textContent = "--h --m";
            return;
        }

        const dist = getDistance(STATE.plane.lat, STATE.plane.lon, STATE.target.lat, STATE.target.lon);
        const hdg = getBearing(STATE.plane.lat, STATE.plane.lon, STATE.target.lat, STATE.target.lon);

        // Calculate ETE (Hours to go). Guard against zero/near-zero speed
        // (plane stationary, e.g. still on the ground) -- dividing by zero
        // there produced Infinity, which cascaded into "Invalid Date" for
        // ETA and "Infinityh NaNm" for ETE.
        const speedKts = STATE.plane.speed;
        const hasValidEte = speedKts * 1.15078 > 40; // below 40mph (converted from knots), treat as effectively stationary/taxiing -- ETA/ETE not meaningful yet
        let etaString = "--:--", hours = 0, mins = 0, eteMinTotal = 0;
        if (hasValidEte) {
            const eteHours = dist / speedKts;
            eteMinTotal = Math.round(eteHours * 60);
            hours = Math.floor(eteMinTotal / 60);
            mins = eteMinTotal % 60;

            // Calculate ETA relative to current actual time (accounting for local timezone)
            const now = new Date();
            now.setMinutes(now.getMinutes() + eteMinTotal);
            etaString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Update values in HTML viewports
        if (STATE.speedUnitMph) {
            document.getElementById('lbl-summary-speed').textContent = `${Math.round(speedKts * 1.15078)} MPH`;
            document.getElementById('lbl-speed-title').textContent = "Ground Speed";
        } else {
            document.getElementById('lbl-summary-speed').textContent = `${speedKts} KTS`;
            document.getElementById('lbl-speed-title').textContent = "Airspeed";
        }
        document.getElementById('val-hdg').textContent = `${Math.round(STATE.plane.hdg)}°`;
        document.getElementById('val-dist').textContent = `${Math.round(dist)} NM`;
        document.getElementById('val-lat').textContent = `${STATE.plane.lat.toFixed(4)}°N`;
        document.getElementById('val-lon').textContent = `${STATE.plane.lon.toFixed(4)}°E`;
        const shownAlt = shownAltitudeFt();
        document.getElementById('val-altitude').textContent = shownAlt !== null
            ? `${shownAlt.toLocaleString()} ft` : "--";
        document.getElementById('val-eta').textContent = etaString;
        document.getElementById('val-ete').textContent = hasValidEte ? `${hours}h ${mins}m` : "--h --m";
    }

    const TURN_RATE_DEG_PER_SEC = 10; // fastest turn allowed, not time-based
    const TURN_SPREAD_SECONDS = 3;    // each new target heading is reached smoothly over this long (about one GPS poll)

    // Turns STATE.plane.hdg toward targetHdg (GPS mode turning toward the
    // averaged real-world heading). Whenever the target changes (a new GPS
    // fix), the turn still to do is spread evenly over TURN_SPREAD_SECONDS,
    // so a steady turn rotates continuously instead of swinging a few
    // degrees and then holding until the next fix. The old fixed
    // TURN_RATE_DEG_PER_SEC is kept as the fastest turn allowed, so a big
    // change (the first fix, a sharp turn) turns as quickly as before.
    function turnTowardHeading(targetHdg, deltaSeconds) {
        let hdgDiff = targetHdg - STATE.plane.hdg;
        hdgDiff = ((hdgDiff + 540) % 360) - 180;
        if (targetHdg !== STATE.plane.turnTarget || (STATE.plane.turnRateDegPerSec === 0 && Math.abs(hdgDiff) > 0.01)) {
            STATE.plane.turnTarget = targetHdg;
            STATE.plane.turnRateDegPerSec = Math.min(Math.abs(hdgDiff) / TURN_SPREAD_SECONDS, TURN_RATE_DEG_PER_SEC);
        }
        const maxTurnThisFrame = STATE.plane.turnRateDegPerSec * deltaSeconds;
        if (Math.abs(hdgDiff) <= maxTurnThisFrame) {
            STATE.plane.hdg = targetHdg;
        } else {
            STATE.plane.hdg += Math.sign(hdgDiff) * maxTurnThisFrame;
        }
        STATE.plane.hdg = (STATE.plane.hdg + 360) % 360;
    }

    // Dead-reckons the plane forward every frame using its current heading and
    // speed — used in GPS mode so movement stays smooth even during long gaps
    // between real fixes (which can take anywhere from ~1 second to ~a minute
    // to resolve in flight).
    function stepPositionForward(deltaSeconds) {
        if (STATE.plane.speed <= 0) return;
        const stepDist = (STATE.plane.speed / 3600) * deltaSeconds;
        const stepRad = stepDist / 3440.065;

        const d2r = Math.PI / 180;
        const r2d = 180 / Math.PI;
        const latRad = STATE.plane.lat * d2r;
        const lonRad = STATE.plane.lon * d2r;
        const hdgRad = STATE.plane.hdg * d2r;

        const nextLatRad = Math.asin(Math.sin(latRad) * Math.cos(stepRad) +
                           Math.cos(latRad) * Math.sin(stepRad) * Math.cos(hdgRad));
        const nextLonRad = lonRad + Math.atan2(Math.sin(hdgRad) * Math.sin(stepRad) * Math.cos(latRad),
                           Math.cos(stepRad) - Math.sin(latRad) * Math.sin(nextLatRad));

        STATE.plane.lat = nextLatRad * r2d;
        STATE.plane.lon = nextLonRad * r2d;
    }

    // Fast animation engine update loop (for smooth panning/dragging, smooth
    // per-frame heading rotation, and GPS dead-reckoning between fixes).
    let lastFrameTime = null;
