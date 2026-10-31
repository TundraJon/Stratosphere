    // ============================================================
    // LIVE LAYER -- drawn fresh every single frame, never cached, regardless
    // of whether the base map below it is idle or actively redrawing. This
    // covers everything that changes on its own even when the user isn't
    // touching the screen at all: the plane's continuous dead-reckoning
    // motion between GPS fixes, the route line following it, and the
    // destination pin and label.
    // Sets up its OWN independent transform (mirroring the top of
    // drawBaseAndOverlays exactly) rather than relying on any state left
    // over from that function, since this runs every frame regardless of
    // whether that one just ran or was skipped in favor of the cache.
    // ============================================================
    function drawLiveLayer() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        ctx.save();
        ctx.translate(w / 2 + STATE.view.offsetX, h / 2 + STATE.view.offsetY);
        ctx.scale(STATE.view.zoom, STATE.view.zoom);
        if (STATE.view.trackUp) {
            const rotationAngle = -STATE.plane.hdg * Math.PI / 180;
            ctx.rotate(rotationAngle);
            const planeProj = project(STATE.plane.lat, STATE.plane.lon);
            ctx.translate(-planeProj.x, -planeProj.y);
        }

        // --- DRAW FLIGHT ROUTE DIRECT PATH (solid magenta, standard GPS nav convention) ---
        const planePos = project(STATE.plane.lat, STATE.plane.lon);
        const targetPos = project(STATE.target.lat, STATE.target.lon);

        // Nothing real to route from until we've had a first GPS fix — the
        // plane's position is just a placeholder default until then.
        if (lastGpsFix !== null) {
            ctx.strokeStyle = "#ff00ff";
            ctx.lineWidth = 1.8 / STATE.view.zoom;
            ctx.beginPath();
            ctx.moveTo(planePos.x, planePos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.stroke();
        }

        // Draw Target Destination marker: a 📍 whose tip sits exactly on the
        // airport. The glyph's own measured ink bottom is aligned to the
        // airport's position, so this holds whatever emoji font the device uses.
        drawFixedLabel(targetPos, () => {
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.font = `${scaledFontPx(16)}px sans-serif`;
            ctx.fillText("📍", 0, -ctx.measureText("📍").actualBoundingBoxDescent);
        });

        drawFixedLabel(targetPos, () => {
            ctx.textAlign = "start";
            ctx.textBaseline = "alphabetic";

            const destRawCode = STATE.target.name.split(' ')[0]; // un-stripped, e.g. "KMSP" -- matches AIRPORT_RUNWAYS' keys
            const destCode = formatAirportDisplay(STATE.target.name).split(' ')[0];
            const destCityState = STATE.target.name.substring(STATE.target.name.indexOf('('));
            const destOfficialName = AIRPORT_RUNWAYS[destRawCode] ? AIRPORT_RUNWAYS[destRawCode].officialName : null;

            ctx.fillStyle = "#fff";
            ctx.font = `bold ${scaledFontPx(11)}px 'Inter', sans-serif`;
            ctx.fillText(destCode, 8, 3);

            if (destOfficialName) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
                ctx.font = `${scaledFontPx(7)}px 'Inter', sans-serif`;
                ctx.fillText(destOfficialName, 8, 14);
            }

            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.font = `${scaledFontPx(9)}px 'Inter', sans-serif`;
            ctx.fillText(destCityState, 8, destOfficialName ? 25 : 15);
        });

        ctx.restore(); // exit the map translation stack so the plane icon draws cleanly

        // --- DRAW PLANE LAYER (Decoupled Sharp Emoji Method) ---
        // Nothing to point anywhere until we've had a real fix — the plane's
        // position/heading are just placeholder defaults until then.
        if (lastGpsFix !== null) {
            // In Track-Up the map is rotated under the plane, so the plane
            // itself always points straight up (heading 0 on screen).
            if (STATE.view.trackUp) {
                drawPlaneGlyph(ctx, w / 2 + STATE.view.offsetX, h / 2 + STATE.view.offsetY, 0, 26 * STATE.planeSizeMult);
            } else {
                const screenX = w / 2 + STATE.view.offsetX + planePos.x * STATE.view.zoom;
                const screenY = h / 2 + STATE.view.offsetY + planePos.y * STATE.view.zoom;
                drawPlaneGlyph(ctx, screenX, screenY, STATE.plane.hdg, 26 * STATE.planeSizeMult);
            }
        }

        // Update the absolute heading floating Compass Rose widget UI
        const arrow = document.getElementById('compass-arrow');
        const compassRotation = STATE.view.trackUp ? -STATE.plane.hdg : 0;
        arrow.style.transform = `translate(-50%, -50%) rotate(${compassRotation - 90}deg)`;

        const modeLabel = document.getElementById('compass-mode-label');
        if (modeLabel) modeLabel.textContent = STATE.view.trackUp ? "Track Up" : "North Up";
    }

    // ============================================================
    // RENDER CACHE ORCHESTRATOR
    // ============================================================
    // The base map + additive overlays (drawBaseAndOverlays) are expensive
    // -- hundreds of state-border/river/lake points recomputed through the
    // current projection every time they're drawn. Rather than doing that
    // every single frame forever (as the app did before), this snapshots
    // the finished result to an offscreen canvas once the view has held
    // perfectly still for 1 second (with no finger on the screen), and
    // just stamps that image onto the
    // screen on every subsequent idle frame -- a cheap image copy instead
    // of a real redraw. Any pan, zoom, or Track-Up rotation change falls
    // straight back to full live rendering (exactly like before this
    // change), and a fresh snapshot is taken once things settle again.
    STATE.render = {
        cacheCanvas: document.createElement('canvas'),
        lastSignature: null,
        lastChangeTime: 0,
        cacheValid: false,
        // A finger (or held mouse button) on the screen means the person is
        // still doing something: neither cache is used or snapshotted until
        // 1 second after the last one lifts. See the listeners below.
        touching: false,
        touchReleasedAt: 0,
        // Extra rows/columns of base map kept around the Track-Up snapshot
        // (see drawTrackUpBase below); non-zero only while that snapshot is
        // being rendered, so viewport culling keeps the margins' states too.
        cullPad: { top: 0, side: 0, bottom: 0 },
        slide: {
            canvas: document.createElement('canvas'),
            valid: false,
            wasTrackUp: false,
            sig: null,
            sigChangeTime: 0,
            hdg0: 0,
            projX0: 0,
            projY0: 0,
            steadyRefHdg: null,
            steadySince: 0
        }
    };
    STATE.render.cacheCtx = STATE.render.cacheCanvas.getContext('2d');

    // Passive, document-level listeners that only watch: the existing pan,
    // pinch and tap handling is untouched.
    (function trackFingersDown() {
        const R = STATE.render;
        function setTouching(on) {
            if (R.touching && !on) R.touchReleasedAt = performance.now();
            R.touching = on;
        }
        const opts = { passive: true, capture: true };
        document.addEventListener('touchstart', (e) => setTouching(e.touches.length > 0), opts);
        document.addEventListener('touchend', (e) => setTouching(e.touches.length > 0), opts);
        document.addEventListener('touchcancel', (e) => setTouching(e.touches.length > 0), opts);
        document.addEventListener('mousedown', () => setTouching(true), opts);
        document.addEventListener('mouseup', () => setTouching(false), opts);
        window.addEventListener('blur', () => setTouching(false));
    })();
    STATE.render.slide.ctx = STATE.render.slide.canvas.getContext('2d');

    // ------------------------------------------------------------
    // TRACK-UP SLIDING SNAPSHOT
    // In Track-Up the plane is dead-reckoned every frame, so the base map
    // would otherwise be redrawn every frame. While the heading is steady
    // the map just moves under the plane in a straight line, so instead the
    // base map is rendered once into a snapshot that is a little bigger than
    // the screen (extra room ahead of the plane, a little at the sides and
    // behind) and each frame just slides that picture by the plane's
    // movement. The snapshot is thrown away (and the map drawn live, as
    // before) when the heading drifts, the margin runs low, or anything the
    // North-Up signature watches changes.
    // ------------------------------------------------------------
    const TRACKUP_SLIDE_AHEAD_PX = 70;
    const TRACKUP_SLIDE_SIDE_PX = 10;
    const TRACKUP_SLIDE_BEHIND_PX = 10;
    const TRACKUP_SLIDE_REFRESH_FRACTION = 0.2; // re-snapshot when under this share of the ahead margin is left
    const TRACKUP_SLIDE_STEADY_MS = 6000;       // heading must hold this long before a snapshot is taken
    const TRACKUP_SLIDE_HEADING_TOL_DEG = 1;
    const TRACKUP_SLIDE_SETTLE_MS = 1000;       // everything the signature watches must hold still this long, counted from the last finger lifting
    const NORTHUP_CACHE_SETTLE_MS = 1000;       // same wait before the North-Up cache is used

    function angleDiffDeg(a, b) {
        return Math.abs(((a - b + 540) % 360) - 180);
    }

    function renderTrackUpSnapshot(w, h) {
        const sl = STATE.render.slide;
        const dpr = window.devicePixelRatio || 1;
        sl.canvas.width = Math.round((w + 2 * TRACKUP_SLIDE_SIDE_PX) * dpr);
        sl.canvas.height = Math.round((h + TRACKUP_SLIDE_AHEAD_PX + TRACKUP_SLIDE_BEHIND_PX) * dpr);
        sl.ctx.setTransform(1, 0, 0, 1, 0, 0);
        sl.ctx.fillStyle = getWaterColor();
        sl.ctx.fillRect(0, 0, sl.canvas.width, sl.canvas.height);
        sl.ctx.setTransform(dpr, 0, 0, dpr, TRACKUP_SLIDE_SIDE_PX * dpr, TRACKUP_SLIDE_AHEAD_PX * dpr);
        const mainCtx = ctx;
        ctx = sl.ctx;
        STATE.render.cullPad = { top: TRACKUP_SLIDE_AHEAD_PX, side: TRACKUP_SLIDE_SIDE_PX, bottom: TRACKUP_SLIDE_BEHIND_PX };
        try {
            drawBaseAndOverlays();
        } finally {
            ctx = mainCtx;
            STATE.render.cullPad = { top: 0, side: 0, bottom: 0 };
        }
    }

    function drawTrackUpBase(w, h, signature) {
        const R = STATE.render, sl = R.slide;
        const now = performance.now();
        const dpr = window.devicePixelRatio || 1;

        if (!sl.wasTrackUp) {
            sl.wasTrackUp = true;
            sl.valid = false;
            sl.steadyRefHdg = null;
        }
        if (signature !== sl.sig) {
            sl.sig = signature;
            sl.sigChangeTime = now;
            sl.valid = false;
        }
        // Something outside draw() (home location, destination) asked for a rebuild.
        if (sl.valid && !R.cacheValid) sl.valid = false;

        // How long the heading has held within the tolerance of one value.
        const hdg = STATE.plane.hdg;
        if (sl.steadyRefHdg === null || angleDiffDeg(hdg, sl.steadyRefHdg) > TRACKUP_SLIDE_HEADING_TOL_DEG) {
            sl.steadyRefHdg = hdg;
            sl.steadySince = now;
        }

        let dx = 0, dy = 0;
        if (sl.valid) {
            const planeProj = project(STATE.plane.lat, STATE.plane.lon);
            const a = -sl.hdg0 * Math.PI / 180;
            const ex = sl.projX0 - planeProj.x, ey = sl.projY0 - planeProj.y;
            dx = STATE.view.zoom * (Math.cos(a) * ex - Math.sin(a) * ey);
            dy = STATE.view.zoom * (Math.sin(a) * ex + Math.cos(a) * ey);
            if (angleDiffDeg(hdg, sl.hdg0) > TRACKUP_SLIDE_HEADING_TOL_DEG ||
                Math.abs(dx) > TRACKUP_SLIDE_SIDE_PX ||
                dy < -TRACKUP_SLIDE_BEHIND_PX ||
                dy > TRACKUP_SLIDE_AHEAD_PX * (1 - TRACKUP_SLIDE_REFRESH_FRACTION)) {
                sl.valid = false;
            }
        }

        if (!sl.valid && !R.touching && now - sl.steadySince >= TRACKUP_SLIDE_STEADY_MS &&
            now - Math.max(sl.sigChangeTime, R.touchReleasedAt) >= TRACKUP_SLIDE_SETTLE_MS) {
            renderTrackUpSnapshot(w, h);
            const planeProj = project(STATE.plane.lat, STATE.plane.lon);
            sl.hdg0 = hdg;
            sl.projX0 = planeProj.x;
            sl.projY0 = planeProj.y;
            sl.valid = true;
            R.cacheValid = true;
            dx = 0; dy = 0;
        }

        if (sl.valid) {
            // 1:1 copy at a whole-device-pixel position so the map stays sharp.
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(sl.canvas,
                Math.round((dx - TRACKUP_SLIDE_SIDE_PX) * dpr),
                Math.round((dy - TRACKUP_SLIDE_AHEAD_PX) * dpr));
            ctx.restore();
        } else {
            drawBaseAndOverlays(); // full live redraw, as before
        }
    }

    function draw() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Everything that affects what drawBaseAndOverlays would draw --
        // if any of this changes, the cached snapshot no longer matches
        // reality and must be rebuilt. Folding it all into one string is
        // simpler and less error-prone than manually invalidating the
        // cache inside every individual toggle function.
        const rotationAngle = STATE.view.trackUp ? -STATE.plane.hdg * Math.PI / 180 : 0;
        let planeProjX = 0, planeProjY = 0;
        if (STATE.view.trackUp) {
            const p = project(STATE.plane.lat, STATE.plane.lon);
            planeProjX = p.x; planeProjY = p.y;
        }
        const seasonalDayKey = STATE.toggles.seasonalColors
            ? (STATE.seasonalDateOverride || new Date()).toDateString() : '';
        const signature = [
            w, h, STATE.view.zoom, STATE.view.offsetX, STATE.view.offsetY,
            rotationAngle, STATE.view.trackUp, planeProjX, planeProjY,
            STATE.toggles.landmarks, STATE.toggles.airports, STATE.toggles.terminator,
            STATE.dayMode, STATE.toggles.seasonalColors, seasonalDayKey,
            STATE.borderPreset.day, STATE.borderPreset.night,
            STATE.toggles.terminator ? _terminatorCacheTime : 0
        ].join('|');

        if (STATE.view.trackUp) {
            // Same signature minus the plane position and the rotation: those
            // are handled by the sliding snapshot's own checks.
            const slideSignature = [
                w, h, STATE.view.zoom, STATE.view.offsetX, STATE.view.offsetY, STATE.view.trackUp,
                STATE.toggles.landmarks, STATE.toggles.airports, STATE.toggles.terminator,
                STATE.dayMode, STATE.toggles.seasonalColors, seasonalDayKey,
                STATE.borderPreset.day, STATE.borderPreset.night,
                STATE.toggles.terminator ? _terminatorCacheTime : 0
            ].join('|');
            drawTrackUpBase(w, h, slideSignature);
            drawLiveLayer(); // always, every frame, on top
            updateTelemetryUI();
            return;
        }
        if (STATE.render.slide.wasTrackUp) {
            // Back to North-Up: drop whatever the Track-Up snapshot left behind.
            STATE.render.slide.wasTrackUp = false;
            STATE.render.slide.valid = false;
            STATE.render.cacheValid = false;
        }

        const now = performance.now();
        if (signature !== STATE.render.lastSignature) {
            STATE.render.lastSignature = signature;
            STATE.render.lastChangeTime = now;
            STATE.render.cacheValid = false;
        }
        const idleDuration = now - Math.max(STATE.render.lastChangeTime, STATE.render.touchReleasedAt);
        const cacheReady = STATE.render.cacheValid && !STATE.render.touching && idleDuration >= NORTHUP_CACHE_SETTLE_MS &&
            STATE.render.cacheCanvas.width === canvas.width && STATE.render.cacheCanvas.height === canvas.height;

        if (cacheReady) {
            // Cache canvas is sized in real backing-store pixels (dpr-scaled),
            // same as the main canvas -- explicitly specify the CSS-pixel
            // destination size (w,h) here since ctx already has its own
            // dpr scale active; using the 2-arg drawImage form here would
            // double-apply that scale and draw it at the wrong size.
            ctx.drawImage(STATE.render.cacheCanvas, 0, 0, w, h);
        } else {
            drawBaseAndOverlays(); // full live redraw of the expensive stuff
            if (STATE.render.cacheCanvas.width !== canvas.width || STATE.render.cacheCanvas.height !== canvas.height) {
                STATE.render.cacheCanvas.width = canvas.width;
                STATE.render.cacheCanvas.height = canvas.height;
            }
            STATE.render.cacheCtx.clearRect(0, 0, STATE.render.cacheCanvas.width, STATE.render.cacheCanvas.height);
            // Copying from the real canvas ELEMENT (its actual raw backing-store
            // pixels) into a same-sized cache canvas with no scale applied on
            // cacheCtx -- a true 1:1 pixel copy, no cropping, no scale mismatch.
            STATE.render.cacheCtx.drawImage(canvas, 0, 0);
            STATE.render.cacheValid = true;
        }

        drawLiveLayer(); // always, every frame, on top

        updateTelemetryUI();
    }

