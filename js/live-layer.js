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
            ctx.save();
            const PLANE_ROTATION_CALIBRATION = -48;
            if (STATE.view.trackUp) {
                ctx.translate(w / 2 + STATE.view.offsetX, h / 2 + STATE.view.offsetY);
                ctx.rotate(PLANE_ROTATION_CALIBRATION * Math.PI / 180);
            } else {
                const screenX = w / 2 + STATE.view.offsetX + planePos.x * STATE.view.zoom;
                const screenY = h / 2 + STATE.view.offsetY + planePos.y * STATE.view.zoom;
                ctx.translate(screenX, screenY);
                ctx.rotate((STATE.plane.hdg + PLANE_ROTATION_CALIBRATION) * Math.PI / 180);
            }
            ctx.font = `${26 * STATE.planeSizeMult}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("✈️", 0, 0);
            ctx.restore();
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
    // perfectly still for 200ms, and just stamps that image onto the
    // screen on every subsequent idle frame -- a cheap image copy instead
    // of a real redraw. Any pan, zoom, or Track-Up rotation change falls
    // straight back to full live rendering (exactly like before this
    // change), and a fresh snapshot is taken once things settle again.
    STATE.render = {
        cacheCanvas: document.createElement('canvas'),
        lastSignature: null,
        lastChangeTime: 0,
        cacheValid: false
    };
    STATE.render.cacheCtx = STATE.render.cacheCanvas.getContext('2d');

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

        const now = performance.now();
        if (signature !== STATE.render.lastSignature) {
            STATE.render.lastSignature = signature;
            STATE.render.lastChangeTime = now;
            STATE.render.cacheValid = false;
        }
        const idleDuration = now - STATE.render.lastChangeTime;
        const cacheReady = STATE.render.cacheValid && idleDuration >= 200 &&
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

