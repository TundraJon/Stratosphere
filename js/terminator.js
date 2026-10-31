    // ============================================================
    // DAY/NIGHT TERMINATOR (fully offline -- pure math off the device clock,
    // no network, no lookup tables, consistent with the app's offline-first
    // constraint).
    //
    // Two standard astronomical approximations do all the work:
    //   1. Solar declination -- the latitude where the sun is directly
    //      overhead. Swings between about +23.44 (June solstice) and -23.44
    //      (December solstice) over the year.
    //   2. Equation of time -- a correction (up to ~16 minutes) for Earth's
    //      elliptical orbit and axial tilt, which shifts where solar noon
    //      actually falls versus clock noon.
    // Together these give the "subsolar point" (lat/lon where it's local
    // solar noon right now). The terminator is then just the set of points
    // exactly 90 degrees away from that point in every direction.
    // ============================================================

    // Returns {lat, lon} of the point on Earth where the sun is directly
    // overhead at the given Date.
    function getSubsolarPoint(date) {
        const d2r = Math.PI / 180, r2d = 180 / Math.PI;
        // Day of year (1-366)
        const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
        const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86400000);

        // Fractional year angle (radians)
        const gamma = 2 * Math.PI / 365.24 * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);

        // Equation of time, in minutes (NOAA's standard Fourier approximation)
        const eqTimeMin = 229.18 * (0.000075
            + 0.001868 * Math.cos(gamma)
            - 0.032077 * Math.sin(gamma)
            - 0.014615 * Math.cos(2 * gamma)
            - 0.040849 * Math.sin(2 * gamma));

        // Solar declination, in radians (same NOAA series)
        const declRad = 0.006918
            - 0.399912 * Math.cos(gamma)
            + 0.070257 * Math.sin(gamma)
            - 0.006758 * Math.cos(2 * gamma)
            + 0.000907 * Math.sin(2 * gamma)
            - 0.002697 * Math.cos(3 * gamma)
            + 0.00148 * Math.sin(3 * gamma);

        const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
        // Longitude of solar noon: 0 deg at 12:00 UTC, moving west 15 deg/hour
        let lon = -((utcMinutes + eqTimeMin) / 4 - 180);
        // Normalize into [-180, 180]
        lon = ((lon + 180) % 360 + 360) % 360 - 180;

        return { lat: declRad * r2d, lon };
    }

    // Builds the terminator as a lat/lon path. The terminator is the great
    // circle 90 degrees from the subsolar point; for each longitude, the
    // boundary latitude is:
    //     lat = atan(-cos(lon - subsolarLon) / tan(declination))
    // Sampled every few degrees, then drawn through the same project() used
    // by every other map feature.
    function buildTerminatorPath(date, stepDeg) {
        const d2r = Math.PI / 180, r2d = 180 / Math.PI;
        const sub = getSubsolarPoint(date);
        const declRad = sub.lat * d2r;
        const step = stepDeg || 2;

        // Guard: at an exact equinox tan(decl) -> 0 and the formula blows up.
        // Nudge declination by a negligible amount so it stays finite (the
        // visual difference is far below one pixel).
        const safeDecl = Math.abs(declRad) < 1e-6 ? 1e-6 : declRad;

        const pts = [];
        for (let lon = -180; lon <= 180; lon += step) {
            const latRad = Math.atan(-Math.cos((lon - sub.lon) * d2r) / Math.tan(safeDecl));
            pts.push({ lat: latRad * r2d, lon });
        }
        // Which pole is in darkness follows the sign of declination: when the
        // sun is north of the equator, the SOUTH pole is dark, and vice versa.
        return { points: pts, darkPoleLat: declRad > 0 ? -90 : 90, subsolar: sub };
    }

    // Cached so we're not recomputing every animation frame -- the terminator
    // moves ~1 degree of longitude per 4 minutes, so a 60s refresh is
    // visually seamless and costs essentially nothing.
    let _terminatorCache = null;
    let _terminatorCacheTime = 0;
    function getTerminator() {
        const now = Date.now();
        if (!_terminatorCache || now - _terminatorCacheTime > 60000) {
            _terminatorCache = buildTerminatorPath(new Date(now), 2);
            _terminatorCacheTime = now;
        }
        return _terminatorCache;
    }

    function setDayNightMode(isDay) {
        if (STATE.dayMode === isDay) return; // already in that mode -- no-op, matches old guarded call sites
        STATE.dayMode = isDay;
        document.body.classList.toggle('day-mode', STATE.dayMode);
        document.getElementById('daynight-toggle').classList.toggle('night', !STATE.dayMode);
        // Reflect whichever border preset belongs to the mode we just switched to
        document.getElementById('sel-border-color').value = STATE.dayMode ? STATE.borderPreset.day : STATE.borderPreset.night;
        updateSeasonalButtonAvailability();
        draw();
    }

    // Seasonal colors only apply in day mode, so the toggle itself is
    // disabled (greyed out, unclickable) whenever night mode is active.
    // The underlying on/off STATE.toggles.seasonalColors value is left
    // untouched -- switching back to day mode restores whatever it was
    // set to before, it just can't be changed while disabled.
    function updateSeasonalButtonAvailability() {
        const btn = document.getElementById('btn-toggle-seasonal');
        btn.disabled = !STATE.dayMode;
        btn.classList.toggle('btn-disabled', !STATE.dayMode);
    }

    function handleBorderColorSelect() {
        const val = document.getElementById('sel-border-color').value;
        if (STATE.dayMode) {
            STATE.borderPreset.day = val;
        } else {
            STATE.borderPreset.night = val;
        }
        draw();
    }

    function drawBaseAndOverlays() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Clear display (ocean/water color surrounding all landmasses — also
        // shows through the gaps between states at the Great Lakes, since
        // those aren't separately filled)
        ctx.fillStyle = getWaterColor();
        ctx.fillRect(0, 0, w, h);

        ctx.save();

        // 1. Position map in center of viewport, honoring manual pan offset
        // in both North-Up and Track-Up modes (panning/zooming always works).
        ctx.translate(w / 2 + STATE.view.offsetX, h / 2 + STATE.view.offsetY);
        ctx.scale(STATE.view.zoom, STATE.view.zoom);

        // Track-Up logic: Rotate the map beneath the stationary plane
        let rotationAngle = 0;
        if (STATE.view.trackUp) {
            rotationAngle = -planeCourseOnScreenDeg() * Math.PI / 180;
            ctx.rotate(rotationAngle);
            
            // Re-offset map origin to lock plane at center screen
            const planeProj = project(STATE.plane.lat, STATE.plane.lon);
            ctx.translate(-planeProj.x, -planeProj.y);
        }

        // --- DRAW CENTRAL AMERICA & MEXICO (flat fill — these are just
        // connector pieces, not somewhere this map is used, so no
        // gradient/detail investment here) ---
        ctx.fillStyle = "#5c4a12";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.2 / STATE.view.zoom;
        Object.values(CENTRAL_AMERICA).forEach(rings => {
            rings.forEach(ring => {
                ctx.beginPath();
                ring.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lon);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        });
        ctx.beginPath();
        MEXICO_POLYGON.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- DRAW CANADA (south-to-north gradient: dark red to medium grey).
        // Uses a single fixed X (the horizontal midpoint) for both gradient
        // points so this is a true north-south gradient -- the earlier version
        // used opposite X corners too (SW corner -> NE corner), which meant
        // color also drifted with longitude, not just latitude. Note: in this
        // projection's map-space, Y DECREASES going north (verified empirically
        // against project()), so CANADA_BOUNDS.maxY is the southern edge and
        // .minY is the northern edge. ---
        const canadaGradMidX = (CANADA_BOUNDS.minX + CANADA_BOUNDS.maxX) / 2;
        const canadaGrad = ctx.createLinearGradient(
            canadaGradMidX, CANADA_BOUNDS.maxY, // south
            canadaGradMidX, CANADA_BOUNDS.minY  // north
        );
        canadaGrad.addColorStop(0, "#6b1414"); // south: dark red
        canadaGrad.addColorStop(1, "#808080"); // north: medium grey
        ctx.fillStyle = canadaGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.2 / STATE.view.zoom;
        ctx.beginPath();
        CANADA_POLYGON.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Canada's other landmasses (Vancouver Is., the Maritimes, Cape Breton, PEI) —
        // separate rings in the source data, same styling as the mainland
        CANADA_ISLANDS.forEach(island => {
            ctx.beginPath();
            island.forEach((pt, i) => {
                const p = project(pt.lat, pt.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // --- DRAW LANDMASS (USA Mainland & Alaska) ---
        ctx.strokeStyle = getBorderColor();
        ctx.lineWidth = 1.2 / STATE.view.zoom;

        // Day-mode gradients, built fresh each frame (cheap) so they follow
        // the current projection/zoom exactly. Night mode now uses the same
        // technique, just the same colors darkened 80% toward black -- a
        // subtle hint of the day gradient instead of a completely flat fill.
        let mainlandGradient = null, alaskaGradient = null, hawaiiColor = null;
        const midY = (MAINLAND_BOUNDS.minY + MAINLAND_BOUNDS.maxY) / 2;
        mainlandGradient = ctx.createLinearGradient(MAINLAND_BOUNDS.minX, midY, MAINLAND_BOUNDS.maxX, midY);
        // Southeast -> northwest (maxX,maxY is SE since X increases east
        // and Y increases south in this projection's map-space -- see
        // the Canada gradient work for the same verified convention).
        alaskaGradient = ctx.createLinearGradient(ALASKA_BOUNDS.maxX, ALASKA_BOUNDS.maxY, ALASKA_BOUNDS.minX, ALASKA_BOUNDS.minY);
        if (STATE.dayMode) {
            mainlandGradient.addColorStop(0, '#a2967a'); // west
            mainlandGradient.addColorStop(1, '#18532c'); // east
            alaskaGradient.addColorStop(0, '#3f4c31'); // southeast
            alaskaGradient.addColorStop(1, '#635c3f'); // northwest
            hawaiiColor = '#5e7f53'; // flat, no gradient, per explicit request
        } else {
            // Same colors as day mode, darkened 80% toward black.
            mainlandGradient.addColorStop(0, '#201e18'); // west
            mainlandGradient.addColorStop(1, '#051109'); // east
            alaskaGradient.addColorStop(0, '#0d0f0a'); // southeast
            alaskaGradient.addColorStop(1, '#14120d'); // northwest
            hawaiiColor = '#131911';
        }

        // State boundary polygons — each state (plus Alaska and Hawaii) filled
        // and stroked individually, which draws the mainland shape and the
        // internal state lines together from the same vector data.
        const seasonalNow = (STATE.toggles.seasonalColors && STATE.dayMode) ? (STATE.seasonalDateOverride || new Date()) : null;
        STATE_POLYGONS.forEach(state => {
            if (!stateInViewport(state)) return; // viewport culling -- skip off-screen states entirely
            const activeSeason = seasonalNow ? getActiveSeasonColors(state.name, seasonalNow) : null;
            if (activeSeason) {
                // Fractal fill -- baked noise, cheap per-state recolor only
                // when this state's own active category changes.
                drawSeasonalScatter(state, activeSeason.colors, activeSeason.category);
                return;
            }
            if (state.name === 'Alaska') ctx.fillStyle = alaskaGradient;
            else if (state.name === 'Hawaii') ctx.fillStyle = hawaiiColor;
            else ctx.fillStyle = mainlandGradient;
            state.rings.forEach(ring => {
                ctx.beginPath();
                ring.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lon);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        });

        // --- DRAW GREAT LAKES (Superior, Huron, Erie, Ontario) ---
        // Colored the same as the ocean/water background, drawn after the
        // states so this punches a correct lake shape through Canada's coarse
        // fill (which actually covers this water, since the real US/Canada
        // border runs through the middle of the lakes, not the shore).
        ctx.fillStyle = getWaterColor();
        ctx.strokeStyle = getBorderColor(); // outline in the same dynamic (day/night-aware)
        ctx.lineWidth = 1.2 / STATE.view.zoom; // color as state borders, matching Lake Michigan
        Object.values(GREAT_LAKES).forEach(lake => {
            ctx.beginPath();
            lake.forEach((pt, i) => {
                const p = project(pt.lat, pt.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // --- DRAW US LAKES (always on — reference geography, not worth a toggle) ---
        // Colored as water, like the Great Lakes; drawn as fills so they read
        // as real lakes rather than just outlines.
        ctx.fillStyle = getWaterColor();
        ctx.strokeStyle = getWaterColor();
        ctx.lineWidth = 1 / STATE.view.zoom;
        Object.entries(US_LAKES).forEach(([lakeKey, rings]) => {
            // Mendota/Monona are dramatically smaller than every other lake
            // here -- at low zoom their true fill shrinks below a screen
            // pixel, but the stroke (always drawn at a constant 1 physical
            // pixel regardless of zoom, same as everywhere else in the app)
            // keeps painting a visible outline anyway, making them look like
            // "a couple pixels" even when they should be invisible. Hard
            // cutoff below zoom 20 actually hides them; no stroke at all
            // (just the fill) avoids the stroke geometrically painting ~0.5px
            // beyond the fill's true edge on each side, which was making
            // them read as oversized once they WERE visible.
            const isMadisonLake = (lakeKey === 'mendota' || lakeKey === 'monona');
            if (isMadisonLake && STATE.view.zoom < 20) return;
            rings.forEach(ring => {
                ctx.beginPath();
                ring.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lon);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                if (!isMadisonLake) ctx.stroke();
            });
        });

        // Draw Mississippi River — the middle stretch is drawn from the actual
        // state-border points as one continuous line (so it reads as a single
        // unbroken river), which also means it can never overlap/duplicate the
        // border line. The two ends are real river geometry down to where the
        // border-following stretch starts/ends.
        ctx.strokeStyle = getRiverColor();
        ctx.lineWidth = 2.5 / STATE.view.zoom;

        ctx.beginPath();
        MISSISSIPPI_MIDDLE_CHAIN.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        ctx.beginPath();
        RIVERS.mississippi_north.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        ctx.beginPath();
        RIVERS.mississippi_south.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw other major rivers (always on — reference geography, not worth
        // a toggle; for visual flavor, not navigation-accurate)
        ctx.strokeStyle = getRiverColor();
        ctx.lineWidth = 1.2 / STATE.view.zoom;
        Object.values(OTHER_RIVERS).forEach(river => {
            ctx.beginPath();
            river.forEach((pt, i) => {
                const p = project(pt.lat, pt.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });

        // Draw Grand Canyon (dark brown carved path, not an emoji point) —
        // always visible, same special-casing as the Mississippi.
        ctx.strokeStyle = "rgba(101, 67, 33, 0.85)";
        ctx.lineWidth = 3 / STATE.view.zoom;
        ctx.lineCap = "round";
        ctx.beginPath();
        GRAND_CANYON_PATH.forEach((pt, i) => {
            const p = project(pt.lat, pt.lon);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.lineCap = "butt";

        // --- DRAW DAY/NIGHT TERMINATOR (toggle-able) ---
        // The line is the same proven-accurate analytic curve as before
        // (every point exactly 90 degrees from the subsolar point). The fill
        // is built by testing EACH point on that curve independently for
        // which side is actually dark, then pushing a matching point out to
        // the visible-area edge on that side -- unlike an earlier version,
        // which tested ONE point and assumed that answer held for the whole
        // shape (that assumption broke for real viewing conditions and
        // shaded the wrong region; caught and confirmed against ground
        // truth). Per-point testing can't make that mistake, since nothing
        // is ever extrapolated beyond the point that was actually checked.
        if (STATE.toggles.terminator) {
            const term = getTerminator();
            const sub = term.subsolar;
            const d2r = Math.PI / 180;
            const subLatRad = sub.lat * d2r;
            const cosSubLat = Math.cos(subLatRad), sinSubLat = Math.sin(subLatRad);

            const sunIsDown = (lat, lon) => {
                const latRad = lat * d2r;
                const cosAngle = sinSubLat * Math.sin(latRad) +
                                 cosSubLat * Math.cos(latRad) * Math.cos((lon - sub.lon) * d2r);
                return cosAngle < 0;
            };

            // Only the lat/lon band the map actually shows.
            const LAT_MIN = 5, LAT_MAX = 80, LON_MIN = -172, LON_MAX = -50;
            const curvePts = term.points
                .filter(pt => pt.lon >= LON_MIN && pt.lon <= LON_MAX)
                .map(pt => ({ lat: Math.max(LAT_MIN, Math.min(LAT_MAX, pt.lat)), lon: pt.lon }))
                .sort((a, b) => a.lon - b.lon);

            if (curvePts.length >= 2) {
                // For each point on the curve, test a few degrees to its own
                // north: if THAT specific spot is dark, this point's dark
                // side is north, so push it out to the top edge; otherwise
                // push it to the bottom edge. Every point decides for
                // itself -- nothing here is assumed from a single sample.
                const outerPts = curvePts.map(pt => {
                    const darkIsNorthHere = sunIsDown(Math.min(LAT_MAX, pt.lat + 3), pt.lon);
                    return { lat: darkIsNorthHere ? LAT_MAX : LAT_MIN, lon: pt.lon };
                });

                ctx.save();
                ctx.fillStyle = "rgba(60, 60, 60, 0.5)"; // dark gray -- distinct from the app's existing blue/green/gold palette
                ctx.beginPath();
                curvePts.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lon);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                // Close the shape by walking back along the per-point outer
                // edge (reversed, so the ring doesn't self-intersect).
                for (let i = outerPts.length - 1; i >= 0; i--) {
                    const p = project(outerPts[i].lat, outerPts[i].lon);
                    ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fill();

                // Terminator line, same curve points, drawn on top.
                ctx.beginPath();
                curvePts.forEach((pt, i) => {
                    const p = project(pt.lat, pt.lon);
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.strokeStyle = "rgba(150, 150, 150, 0.6)";
                ctx.lineWidth = 1.5 / STATE.view.zoom;
                ctx.stroke();
                ctx.restore();
            }
        }

        // --- DRAW SYSTEM LANDMARKS (toggle-able, emoji placed at exact coordinate) ---
        // Name label only shows once zoomed in enough (roughly "Texas fills
        // the screen" or closer) -- at wide zoom, every landmark's name text
        // stacking up made the screen unreadable. Same threshold as Airports.
        if (STATE.toggles.landmarks) {
            const showNames = STATE.view.zoom >= LABEL_DETAIL_ZOOM_THRESHOLD;
            STATE.landmarks.forEach(lm => {
                const p = project(lm.lat, lm.lon);
                drawFixedLabel(p, () => {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    // Emoji centered exactly on the landmark's lat/lon
                    ctx.font = `${scaledFontPx(16)}px sans-serif`;
                    ctx.fillText(lm.emoji, 0, 0);
                    if (showNames) {
                        // Name label offset slightly below the emoji
                        ctx.font = `${scaledFontPx(10)}px 'Inter', sans-serif`;
                        ctx.fillStyle = "#8892b0";
                        ctx.fillText(lm.name, 0, 14);
                    }
                });
            });
        }

        // --- DRAW HOME LOCATION (optional, user-entered lat/lon, saved in localStorage) ---
        if (STATE.homeLocation.show && STATE.homeLocation.lat !== null && STATE.homeLocation.lon !== null) {
            const p = project(STATE.homeLocation.lat, STATE.homeLocation.lon);
            drawFixedLabel(p, () => {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = `${scaledFontPx(16)}px sans-serif`;
                ctx.fillText("🏠", 0, 0);
            });
        }

        // --- DRAW AIRPORTS (toggle-able, 3-letter code + city/state below) ---
        if (STATE.toggles.airports) {
            const showCityState = STATE.view.zoom >= LABEL_DETAIL_ZOOM_THRESHOLD;

            AIRPORTS.forEach(ap => {
                // Skip the currently-selected destination — it's already drawn
                // above as the pin and label, so this avoids drawing it twice.
                if (ap.name === STATE.target.name) return;

                const p = project(ap.lat, ap.lon);
                const rawCode = ap.name.split(' ')[0]; // e.g. "KMSP" -- used to look up AIRPORT_RUNWAYS, which is keyed on the un-stripped code
                const code = formatAirportDisplay(ap.name).split(' ')[0]; // e.g. "MIA" or "SJU"
                const cityState = ap.name.substring(ap.name.indexOf('(')); // "(Miami, FL)"
                const officialName = AIRPORT_RUNWAYS[rawCode] ? AIRPORT_RUNWAYS[rawCode].officialName : null;

                ctx.fillStyle = "rgba(100, 180, 255, 0.85)";
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5 / STATE.view.zoom, 0, 2 * Math.PI);
                ctx.fill();

                drawFixedLabel(p, () => {
                    ctx.textAlign = "start";
                    ctx.textBaseline = "alphabetic";

                    // 3-letter code
                    ctx.fillStyle = "rgba(180, 210, 255, 0.95)";
                    ctx.font = `bold ${scaledFontPx(9)}px 'Inter', sans-serif`;
                    ctx.fillText(code, 5, 3);

                    if (showCityState) {
                        // Official name below the code -- smaller font since some
                        // run up to 43 characters (verified against the real
                        // data; average is ~20).
                        if (officialName) {
                            ctx.fillStyle = "rgba(160, 190, 230, 0.85)";
                            ctx.font = `${scaledFontPx(6)}px 'Inter', sans-serif`;
                            ctx.fillText(officialName, 5, 12);
                        }
                        // City/state below that, same size as before
                        ctx.fillStyle = "rgba(140, 170, 210, 0.8)";
                        ctx.font = `${scaledFontPx(7)}px 'Inter', sans-serif`;
                        ctx.fillText(cityState, 5, officialName ? 21 : 13);
                    }
                });
            });
        }

        ctx.restore(); // exit the map transform stack -- this function is done
    }

