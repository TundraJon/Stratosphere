    // ============================================================
    // AIRPORT RUNWAY DETAIL POPUP
    // ============================================================
    // Independent-scale diagram of a single airport's real runway layout --
    // NOT tied to the main map's zoom/projection (same principle as the
    // cutscene being its own separate mini-scene). Footprint is computed
    // from the true bounding box of every real runway endpoint for that
    // airport, so each airport gets its own appropriately-scaled view
    // rather than one fixed zoom for all of them. Always North-up
    // regardless of the main map's current mode. Live plane position
    // overlays on top when in-frame, continuously updating; an edge arrow
    // + distance-to-center shows when it isn't.
    function openAirportPopup(ap) {
        const rawCode = ap.name.split(' ')[0];
        const data = AIRPORT_RUNWAYS[rawCode];
        if (!data) return; // shouldn't happen -- all 128 AIRPORTS entries have matching data, verified at build time
        STATE.airportPopup.open = true;
        STATE.airportPopup.airport = ap;
        STATE.airportPopup.rawCode = rawCode;
        STATE.airportPopup.cameraState = 0;
        STATE.airportPopup.cameraBlend = 0;
        STATE.airportPopup.snapStartTime = null;
        STATE.airportPopup.lockedRunway = null;

        const code = formatAirportDisplay(ap.name).split(' ')[0];
        const cityState = ap.name.substring(ap.name.indexOf('('));
        document.getElementById('airport-popup-title').textContent = `${code} - ${data.officialName} ${cityState}`;
        document.getElementById('airport-popup-overlay').style.display = 'flex';
        renderAirportPopup();
    }

    function closeAirportPopup() {
        // If this was showing the current destination and we're still
        // within the 1nm auto-trigger radius, record the dismissal so the
        // auto-open logic doesn't immediately re-open it -- it re-arms
        // once the plane clears 9nm or 20 minutes pass, whichever's first.
        if (STATE.airportPopup.airport && STATE.airportPopup.airport.name === STATE.target.name) {
            const distNm = getDistance(STATE.plane.lat, STATE.plane.lon, STATE.target.lat, STATE.target.lon);
            if (distNm <= 1) {
                STATE.airportPopup.autoTriggerDismissedFor = STATE.target.name;
                STATE.airportPopup.autoTriggerDismissedAt = Date.now();
            }
        }
        STATE.airportPopup.open = false;
        document.getElementById('airport-popup-overlay').style.display = 'none';
    }

    // Real per-surface tint; unrecognized/blank codes fall back to the same
    // pavement grey used elsewhere in the app (cutscene runway, main-map
    // schematic lines).
    function runwaySurfaceColor(surfaceCode) {
        switch (surfaceCode) {
            case 'CONC': return '#8a8a8a';
            case 'ASPH-CONC': return '#7d7d7d';
            case 'WATER': return '#3a6f99';
            case 'TURF': return '#4a7c3f';
            case 'ASPH':
            default: return '#757575';
        }
    }

    // ============================================================
    // Approach/departure camera constants -- binary Overview/Follow model
    // ============================================================
    const AIRPORT_POPUP_SPEED_THRESHOLD_MPH = 50; // off-runway AND above this = Overview; everything else = Follow
    const AIRPORT_POPUP_FOLLOW_RUNWAY_WIDTH_PX = 60;
    const AIRPORT_POPUP_PLANE_PX = 50;
    const AIRPORT_POPUP_HEADING_ALIGN_DEG = 7; // "on this runway" requires heading within this many degrees of its real bidirectional orientation
    const AIRPORT_POPUP_LATERAL_MARGIN_FT = 60;  // GPS-noise allowance beyond the runway's real half-width, for "on runway" purposes
    const AIRPORT_POPUP_ALONG_TRACK_MARGIN_FT = 150; // allows touchdown/liftoff to register slightly before/after the painted threshold, not exactly at it
    const AIRPORT_POPUP_SNAP_DURATION_MS = 500;

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // True if the plane is currently ON this specific runway: laterally
    // within its real width (plus a GPS-noise margin), positioned between
    // its two real thresholds (plus a small margin so touchdown/liftoff can
    // register slightly before/after the exact painted marker), AND
    // heading-aligned with its real bidirectional orientation. All three
    // conditions matter -- heading alignment specifically is what rejects a
    // taxi crossing over a DIFFERENT runway at a steep angle, which lat/lon
    // proximity alone can't distinguish from actually being on it.
    function isPlaneOnRunway(planeLat, planeLon, planeHdg, runway) {
        if (!isHeadingAlignedWithRunway(planeHdg, runway)) return false;
        const planePos = project(planeLat, planeLon);
        const p1 = project(runway.lat1, runway.lon1);
        const p2 = project(runway.lat2, runway.lon2);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-12) return false;
        const t = ((planePos.x - p1.x) * dx + (planePos.y - p1.y) * dy) / lenSq;
        const runwayMapLen = Math.sqrt(lenSq);
        const feetPerMapUnit = runway.len / runwayMapLen;
        const marginT = (AIRPORT_POPUP_ALONG_TRACK_MARGIN_FT / runway.len);
        if (t < -marginT || t > 1 + marginT) return false;
        const centerX = p1.x + t * dx, centerY = p1.y + t * dy;
        const lateralFt = Math.hypot(planePos.x - centerX, planePos.y - centerY) * feetPerMapUnit;
        if (lateralFt > runway.width / 2 + AIRPORT_POPUP_LATERAL_MARGIN_FT) return false;
        return true;
    }

    // Checks the currently-locked runway FIRST (if any) for stability --
    // avoids flip-flopping between two runways that happen to overlap right
    // at a real intersection -- then falls through to checking every other
    // runway at this airport. Returns the matching runway, or null.
    function findOnRunway(planeLat, planeLon, planeHdg, runways, preferredRunway) {
        if (preferredRunway && isPlaneOnRunway(planeLat, planeLon, planeHdg, preferredRunway)) {
            return preferredRunway;
        }
        for (const r of runways) {
            if (isPlaneOnRunway(planeLat, planeLon, planeHdg, r)) return r;
        }
        return null;
    }

    // Real orientation (bearing) of a runway, from its own two real
    // threshold coordinates -- NOT the rounded runway-number heading, the
    // actual geodesic bearing between its endpoints.
    function runwayOrientationDeg(runway) {
        return getBearing(runway.lat1, runway.lon1, runway.lat2, runway.lon2);
    }

    // Smallest angular difference between two headings, 0-180, wraparound-safe.
    function headingDiffDeg(a, b) {
        const diff = Math.abs(a - b) % 360;
        return diff > 180 ? 360 - diff : diff;
    }

    // A runway is one bidirectional line -- traveling either along its
    // forward heading OR its exact 180 deg opposite both count as
    // "aligned." True within AIRPORT_POPUP_HEADING_ALIGN_DEG of either.
    function isHeadingAlignedWithRunway(planeHdg, runway) {
        const orientation = runwayOrientationDeg(runway);
        const diffForward = headingDiffDeg(planeHdg, orientation);
        const diffReverse = headingDiffDeg(planeHdg, (orientation + 180) % 360);
        return Math.min(diffForward, diffReverse) <= AIRPORT_POPUP_HEADING_ALIGN_DEG;
    }

    // Projects a map-space point onto a runway's real centerline (the
    // infinite line through its two real threshold coordinates, NOT
    // clamped to the segment -- preserves real along-runway distance even
    // just before/after the physical threshold). This is what discards
    // lateral GPS noise while keeping the meaningful along-track position.
    function projectOntoRunwayCenterline(mapX, mapY, runway) {
        const p1 = project(runway.lat1, runway.lon1);
        const p2 = project(runway.lat2, runway.lon2);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-12) return { x: mapX, y: mapY }; // degenerate (shouldn't happen for a real runway)
        const t = ((mapX - p1.x) * dx + (mapY - p1.y) * dy) / lenSq;
        return { x: p1.x + t * dx, y: p1.y + t * dy };
    }

    function renderAirportPopup() {
        if (!STATE.airportPopup.open) return;
        const rawCode = STATE.airportPopup.rawCode;
        const data = AIRPORT_RUNWAYS[rawCode];
        const ap = STATE.airportPopup.airport;
        const canvas = document.getElementById('airport-popup-canvas');
        const ctx2 = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
        if (cssW === 0 || cssH === 0) return; // not laid out yet
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2.clearRect(0, 0, cssW, cssH);

        // Ground color for this specific location. Season branch is
        // unchanged (already correct -- real per-state date windows via
        // getStateAtLatLon + getActiveSeasonColors, same as the cutscene).
        // The FALLBACK case (no active season) now samples the REAL
        // west-east mainland gradient / Alaska SE-NW gradient / Hawaii
        // flat color the main map actually uses at this airport's real
        // location, instead of a flat color disconnected from it -- e.g. a
        // South Dakota airport now shows the same blended tan-green the
        // main map shows there, not an arbitrary darker green.
        function lerpHex(hexA, hexB, t) {
            const a = hexToRgbParts(hexA), b = hexToRgbParts(hexB);
            const r = Math.round(a.r + (b.r - a.r) * t);
            const g = Math.round(a.g + (b.g - a.g) * t);
            const bl = Math.round(a.b + (b.b - a.b) * t);
            const toHex = v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
            return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
        }
        function fallbackGroundColor(lat, lon, dayMode) {
            const govState = getStateAtLatLon(lat, lon);
            const p = project(lat, lon);
            if (govState === 'Hawaii') {
                return dayMode ? '#5e7f53' : '#131911';
            }
            if (govState === 'Alaska') {
                // SE (maxX,maxY) -> NW (minX,minY), same axis as the main map's alaskaGradient.
                const p0x = ALASKA_BOUNDS.maxX, p0y = ALASKA_BOUNDS.maxY;
                const p1x = ALASKA_BOUNDS.minX, p1y = ALASKA_BOUNDS.minY;
                const vx = p1x - p0x, vy = p1y - p0y;
                const lenSq = vx * vx + vy * vy;
                let t = lenSq > 1e-12 ? ((p.x - p0x) * vx + (p.y - p0y) * vy) / lenSq : 0;
                t = Math.max(0, Math.min(1, t));
                return dayMode ? lerpHex('#3f4c31', '#635c3f', t) : lerpHex('#0d0f0a', '#14120d', t);
            }
            // Mainland -- purely horizontal west-east axis, same as the main map's mainlandGradient.
            const span = MAINLAND_BOUNDS.maxX - MAINLAND_BOUNDS.minX;
            let t = span > 1e-12 ? (p.x - MAINLAND_BOUNDS.minX) / span : 0;
            t = Math.max(0, Math.min(1, t));
            return dayMode ? lerpHex('#a2967a', '#18532c', t) : lerpHex('#201e18', '#051109', t);
        }
        let popupBackground = fallbackGroundColor(ap.lat, ap.lon, STATE.dayMode);
        if (STATE.toggles.seasonalColors && STATE.dayMode) {
            const govState = getStateAtLatLon(ap.lat, ap.lon);
            if (govState) {
                const now = STATE.seasonalDateOverride || new Date();
                const season = getActiveSeasonColors(govState, now);
                if (season) popupBackground = season.colors[0];
            }
        }
        ctx2.fillStyle = popupBackground;
        ctx2.fillRect(0, 0, cssW, cssH);

        // Contrast-aware text color for anything drawn directly on this
        // background (currently just the runway ID labels) -- standard
        // relative luminance formula, dark text on light backgrounds
        // (e.g. snow white), light text on dark ones (e.g. night mode).
        const bgRgb = hexToRgbParts(popupBackground);
        const bgLuminance = 0.299 * bgRgb.r + 0.587 * bgRgb.g + 0.114 * bgRgb.b;
        const labelTextColor = bgLuminance > 140 ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.9)';

        // Overview footprint: real bounding box across every runway's real
        // threshold endpoints (map-space), padded ~18% so nothing sits
        // flush against the edge. This is always computed -- it's both the
        // stable "in the airport's space" test AND one endpoint of the
        // Overview<->Follow blend below.
        let minMX = Infinity, maxMX = -Infinity, minMY = Infinity, maxMY = -Infinity;
        data.runways.forEach(r => {
            [project(r.lat1, r.lon1), project(r.lat2, r.lon2)].forEach(p => {
                if (p.x < minMX) minMX = p.x; if (p.x > maxMX) maxMX = p.x;
                if (p.y < minMY) minMY = p.y; if (p.y > maxMY) maxMY = p.y;
            });
        });
        const PAD_FRAC = 0.18;
        const spanX = Math.max(maxMX - minMX, 1e-6), spanY = Math.max(maxMY - minMY, 1e-6);
        minMX -= spanX * PAD_FRAC; maxMX += spanX * PAD_FRAC;
        minMY -= spanY * PAD_FRAC; maxMY += spanY * PAD_FRAC;
        const overviewCenterMX = (minMX + maxMX) / 2, overviewCenterMY = (minMY + maxMY) / 2;
        const overviewScale = Math.min(cssW / (maxMX - minMX), cssH / (maxMY - minMY));

        function overviewToPopup(mapX, mapY) {
            return { x: cssW / 2 + (mapX - overviewCenterMX) * overviewScale, y: cssH / 2 + (mapY - overviewCenterMY) * overviewScale };
        }

        const planeMapPos = project(STATE.plane.lat, STATE.plane.lon);
        const overviewPlaneScreen = overviewToPopup(planeMapPos.x, planeMapPos.y);
        const inFrame = lastGpsFix !== null && overviewPlaneScreen.x >= 0 && overviewPlaneScreen.x <= cssW && overviewPlaneScreen.y >= 0 && overviewPlaneScreen.y <= cssH;

        // --- Approach/departure camera (evaluated ONLY while the plane is
        // actually visible in this popup's frame -- there's no reason to
        // determine landing/takeoff state for a plane that isn't even
        // near this airport, and doing so was the root cause of an earlier
        // bug where the transition got compressed into a single instant
        // right as the plane entered view) ---
        let renderCenterMX = overviewCenterMX, renderCenterMY = overviewCenterMY, renderScale = overviewScale;
        let followTargetMapPos = planeMapPos; // may become the centerline-snapped position below

        if (inFrame) {
            const nowMs = performance.now();
            const speedMph = STATE.plane.speed * 1.15078; // knots -> mph

            // "On a runway" -- real geometry (centerline distance + along-
            // track position + heading alignment), not a speed guess.
            // Prefers the already-locked runway for stability at real
            // intersections, matching a plane that's continuously on the
            // same runway rather than flickering between two definitions
            // that happen to cross.
            const onRunway = findOnRunway(STATE.plane.lat, STATE.plane.lon, STATE.plane.hdg, data.runways, STATE.airportPopup.lockedRunway);

            if (onRunway) {
                STATE.airportPopup.lockedRunway = onRunway;
            }

            // The whole camera model in one rule: Follow unless the plane
            // is BOTH off every runway AND moving faster than the
            // threshold -- covers taxiing (off-runway, slow), being on any
            // runway at any speed (rolling for takeoff, just touched
            // down), and cruising toward the airport (off-runway, fast)
            // all from the same single condition. The slow-speed branch
            // specifically requires a runway to ALREADY be locked (has
            // been touched at least once this session) -- without that,
            // a plane that's merely slow but has never actually landed
            // would try to center-follow it with no runway to calibrate
            // Follow's scale against, a real center/scale mismatch.
            const desiredState = (onRunway || (STATE.airportPopup.lockedRunway !== null && speedMph <= AIRPORT_POPUP_SPEED_THRESHOLD_MPH)) ? 1 : 0;

            if (desiredState !== STATE.airportPopup.cameraState) {
                STATE.airportPopup.cameraState = desiredState;
                STATE.airportPopup.snapStartTime = nowMs;
                STATE.airportPopup.snapFromBlend = STATE.airportPopup.cameraBlend;
            }

            if (STATE.airportPopup.snapStartTime !== null) {
                const elapsed = nowMs - STATE.airportPopup.snapStartTime;
                if (elapsed < AIRPORT_POPUP_SNAP_DURATION_MS) {
                    const t = easeInOutCubic(elapsed / AIRPORT_POPUP_SNAP_DURATION_MS);
                    STATE.airportPopup.cameraBlend = STATE.airportPopup.snapFromBlend + (STATE.airportPopup.cameraState - STATE.airportPopup.snapFromBlend) * t;
                } else {
                    STATE.airportPopup.cameraBlend = STATE.airportPopup.cameraState;
                    STATE.airportPopup.snapStartTime = null;
                }
            }
            // No ambient/gradual easing branch -- once settled (no snap in
            // progress), cameraBlend simply holds at cameraState until the
            // next transition, per explicit request.

            // Once fully settled in Overview with no runway currently
            // matched and no transition in progress, release the lock --
            // ready for a completely fresh landing next time. Kept alive
            // through the departure snap-out itself so the shrinking view
            // still has a runway to calibrate scale against while it plays.
            if (!onRunway && STATE.airportPopup.cameraState === 0 && STATE.airportPopup.snapStartTime === null) {
                STATE.airportPopup.lockedRunway = null;
            }

            const blend = STATE.airportPopup.cameraBlend;

            if (STATE.airportPopup.lockedRunway) {
                const lr = STATE.airportPopup.lockedRunway;
                // Follow-mode scale: self-calibrated from the locked
                // runway's own real length/map-space length, same
                // technique the runway rectangles themselves use.
                const lrP1 = project(lr.lat1, lr.lon1), lrP2 = project(lr.lat2, lr.lon2);
                const lrMapLen = Math.max(Math.hypot(lrP2.x - lrP1.x, lrP2.y - lrP1.y), 1e-9);
                const feetPerMapUnit = lr.len / lrMapLen;
                const widthInMapUnits = lr.width / feetPerMapUnit;
                const followScale = AIRPORT_POPUP_FOLLOW_RUNWAY_WIDTH_PX / widthInMapUnits;
                renderScale = overviewScale + (followScale - overviewScale) * blend;

                // Centerline snap only while CURRENTLY on this runway (not
                // just locked to it) -- during a departure's snap-out, the
                // plane has already left, so it should visibly move away
                // from the centerline at its true position as the view
                // shrinks, not stay artificially glued to a runway it's
                // no longer on.
                if (onRunway) {
                    followTargetMapPos = projectOntoRunwayCenterline(planeMapPos.x, planeMapPos.y, lr);
                }
            } else {
                renderScale = overviewScale + (0) * blend; // no locked runway yet -- nothing to follow into, stays at Overview scale
            }

            renderCenterMX = overviewCenterMX + (followTargetMapPos.x - overviewCenterMX) * blend;
            renderCenterMY = overviewCenterMY + (followTargetMapPos.y - overviewCenterMY) * blend;
        } else {
            // Not in frame -- reset so re-entry always starts fresh at Overview.
            STATE.airportPopup.cameraState = 0;
            STATE.airportPopup.cameraBlend = 0;
            STATE.airportPopup.snapStartTime = null;
            STATE.airportPopup.lockedRunway = null;
        }


        function toPopup(mapX, mapY) {
            return { x: cssW / 2 + (mapX - renderCenterMX) * renderScale, y: cssH / 2 + (mapY - renderCenterMY) * renderScale };
        }

        // --- Draw each runway as a proportionally accurate rectangle ---
        data.runways.forEach(r => {
            const p1 = project(r.lat1, r.lon1), p2 = project(r.lat2, r.lon2);
            const s1 = toPopup(p1.x, p1.y), s2 = toPopup(p2.x, p2.y);
            const dx = s2.x - s1.x, dy = s2.y - s1.y;
            const lenPx = Math.max(Math.hypot(dx, dy), 0.001);
            const angle = Math.atan2(dy, dx);
            // Real width scaled using this runway's OWN real length as the
            // calibration reference (feet-per-px derived from its own
            // known length/pixel-length), rather than a general
            // feet-to-degrees conversion -- self-calibrating per runway,
            // avoids any latitude-dependent distortion.
            const feetPerPx = r.len / lenPx;
            const widthPx = Math.max(1.5, r.width / feetPerPx);
            const midX = (s1.x + s2.x) / 2, midY = (s1.y + s2.y) / 2;

            ctx2.save();
            ctx2.translate(midX, midY);
            ctx2.rotate(angle);
            ctx2.fillStyle = runwaySurfaceColor(r.surface);
            ctx2.fillRect(-lenPx / 2, -widthPx / 2, lenPx, widthPx);
            ctx2.restore();

            // Threshold marking bar at each real end -- geometrically
            // correct by construction, since it's drawn exactly at s1/s2.
            [s1, s2].forEach(pt => {
                ctx2.save();
                ctx2.translate(pt.x, pt.y);
                ctx2.rotate(angle + Math.PI / 2);
                ctx2.fillStyle = 'rgba(255,255,255,0.85)';
                ctx2.fillRect(-widthPx / 2 + 1, -1.5, widthPx - 2, 3);
                ctx2.restore();
            });

            // Edge lighting: real HIGH/MED intensity from the source data --
            // HIGH gets every position along the edge, MED gets every other.
            if (r.lighting === 'HIGH' || r.lighting === 'MED') {
                const spacingPx = 14;
                const dotCount = Math.max(2, Math.floor(lenPx / spacingPx));
                const perpAngle = angle + Math.PI / 2;
                const offset = widthPx / 2 + 2;
                for (let i = 0; i <= dotCount; i++) {
                    if (r.lighting === 'MED' && i % 2 !== 0) continue;
                    const t = i / dotCount;
                    const lx = s1.x + dx * t, ly = s1.y + dy * t;
                    [1, -1].forEach(side => {
                        ctx2.fillStyle = '#ffe066';
                        ctx2.beginPath();
                        ctx2.arc(lx + Math.cos(perpAngle) * offset * side, ly + Math.sin(perpAngle) * offset * side, 1.3, 0, Math.PI * 2);
                        ctx2.fill();
                    });
                }
            }

            // Runway ID label near one end
            ctx2.save();
            ctx2.fillStyle = labelTextColor;
            ctx2.font = '10px Inter, sans-serif';
            ctx2.textAlign = 'center';
            ctx2.fillText(r.id, midX, midY - widthPx / 2 - 6);
            ctx2.restore();
        });

        // --- Live plane overlay (in-frame) or off-screen edge indicator ---
        if (inFrame) {
            const planeScreen = toPopup(followTargetMapPos.x, followTargetMapPos.y);
            ctx2.save();
            ctx2.translate(planeScreen.x, planeScreen.y);
            // Always North-up in this popup (per explicit spec), so no
            // Track-Up rotation term here -- just the plane's own heading,
            // same calibration offset used on the main map.
            ctx2.rotate((STATE.plane.hdg - 48) * Math.PI / 180);
            ctx2.font = `${AIRPORT_POPUP_PLANE_PX}px sans-serif`;
            ctx2.textAlign = 'center';
            ctx2.textBaseline = 'middle';
            ctx2.fillText('✈️', 0, 0);
            ctx2.restore();
        } else if (lastGpsFix !== null) {
            // Off-screen: arrow at the point where the true bearing line
            // (airport center -> plane) crosses the popup's edge, pointing
            // outward toward the plane. North-up means real bearing maps
            // directly to screen direction with no rotation needed: due
            // east (90 deg) -> pure rightward, etc.
            const bearing = getBearing(ap.lat, ap.lon, STATE.plane.lat, STATE.plane.lon);
            const bearingRad = bearing * Math.PI / 180;
            const dirX = Math.sin(bearingRad), dirY = -Math.cos(bearingRad);
            const halfW = cssW / 2, halfH = cssH / 2;
            const tx = dirX !== 0 ? halfW / Math.abs(dirX) : Infinity;
            const ty = dirY !== 0 ? halfH / Math.abs(dirY) : Infinity;
            const t = Math.min(tx, ty) * 0.92; // slight inset so the arrow stays fully visible, not clipped at the literal edge
            const edgeX = halfW + dirX * t, edgeY = halfH + dirY * t;
            const distNm = getDistance(ap.lat, ap.lon, STATE.plane.lat, STATE.plane.lon);

            ctx2.save();
            ctx2.translate(edgeX, edgeY);
            ctx2.rotate(Math.atan2(dirY, dirX));
            ctx2.fillStyle = '#ffd700';
            ctx2.beginPath();
            ctx2.moveTo(10, 0);
            ctx2.lineTo(-6, -6);
            ctx2.lineTo(-6, 6);
            ctx2.closePath();
            ctx2.fill();
            ctx2.restore();

            ctx2.save();
            ctx2.fillStyle = '#ffd700';
            ctx2.font = 'bold 10px Inter, sans-serif';
            ctx2.textAlign = dirX > 0.3 ? 'right' : (dirX < -0.3 ? 'left' : 'center');
            const labelOffsetX = dirX > 0.3 ? -16 : (dirX < -0.3 ? 16 : 0);
            const labelOffsetY = dirY > 0.3 ? -16 : (dirY < -0.3 ? 16 : 12);
            ctx2.fillText(`${distNm.toFixed(0)} NM`, edgeX + labelOffsetX, edgeY + labelOffsetY);
            ctx2.restore();
        }
    }

    function handlePlaneSingleTap() {
        // 1x<->2x toggle; from 3x, a single tap resets to 1x.
        if (STATE.planeSizeMult === 1) STATE.planeSizeMult = 2;
        else STATE.planeSizeMult = 1;
        draw();
    }

    function handlePlaneDoubleTap() {
        STATE.planeSizeMult = 3; // from either 1x or 2x
        draw();
    }

    function touchDistance(t0, t1) {
        return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }
    function touchMidpoint(t0, t1) {
        return { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
    }

    // Mouse Listeners
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - STATE.view.offsetX;
        startY = e.clientY - STATE.view.offsetY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        STATE.view.offsetX = e.clientX - startX;
        STATE.view.offsetY = e.clientY - startY;
        clampViewOffsets();
        draw();
    });

    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);

    // Touch Listeners (single-finger pan, two-finger pinch-to-zoom)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - STATE.view.offsetX;
            startY = e.touches[0].clientY - STATE.view.offsetY;
            touchStartClientX = e.touches[0].clientX;
            touchStartClientY = e.touches[0].clientY;
            touchStartTime = Date.now();
        } else if (e.touches.length === 2) {
            isDragging = false; // pinch takes over from single-finger drag
            pinchStartDist = touchDistance(e.touches[0], e.touches[1]);
            pinchStartZoom = STATE.view.zoom;
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const newDist = touchDistance(e.touches[0], e.touches[1]);
            if (pinchStartDist > 0) {
                const mid = touchMidpoint(e.touches[0], e.touches[1]);
                const targetZoom = pinchStartZoom * (newDist / pinchStartDist);
                setZoomAtPoint(targetZoom, mid.x, mid.y, true);
            }
            return;
        }
        if (!isDragging || e.touches.length !== 1) return;
        STATE.view.offsetX = e.touches[0].clientX - startX;
        STATE.view.offsetY = e.touches[0].clientY - startY;
        clampViewOffsets();
        draw();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        isDragging = false;
        if (e.touches.length < 2) pinchStartDist = 0;

        // Tap detection for plane resizing: only counts as a tap if the touch
        // barely moved and didn't linger (otherwise it was a drag/long-press).
        const movement = Math.hypot(e.changedTouches[0].clientX - touchStartClientX,
                                     e.changedTouches[0].clientY - touchStartClientY);
        const duration = Date.now() - touchStartTime;
        if (e.touches.length === 0 && movement <= TAP_MAX_MOVEMENT && duration <= TAP_MAX_DURATION) {
            const tapX = e.changedTouches[0].clientX;
            const tapY = e.changedTouches[0].clientY;
            if (isTapOnPlane(tapX, tapY)) {
                if (planeTapTimeout) {
                    // Second tap arrived within the window - true double-tap.
                    clearTimeout(planeTapTimeout);
                    planeTapTimeout = null;
                    handlePlaneDoubleTap();
                } else {
                    // Wait to see if a second tap follows before treating this
                    // as a single tap (this is what a real double-tap requires -
                    // there's no way to know it's "just one tap" any sooner).
                    planeTapTimeout = setTimeout(() => {
                        planeTapTimeout = null;
                        handlePlaneSingleTap();
                    }, DOUBLE_TAP_WINDOW);
                }
            } else {
                // Not the plane -- check the destination marker first (its own
                // dedicated hit-test, no zoom gate), then fall back to regular
                // airport taps. Simple single-tap for both, no double-tap
                // ambiguity to wait out (unlike the plane).
                if (isTapOnDestinationMarker(tapX, tapY)) {
                    openAirportPopup(STATE.target);
                } else {
                    const tappedAirport = findTappedAirport(tapX, tapY);
                    if (tappedAirport) {
                        openAirportPopup(tappedAirport);
                    }
                }
            }
        }
    });

    // The minimum zoom allowed is whatever fits the full US (mainland + Alaska +
    // Hawaii) on screen — there's no reason to zoom out past "you can see it all".
    // Computed fresh each time since it depends on current screen size.
    function getMinZoom() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = 20;
        const bboxW = LANDMASS_BOUNDS.maxX - LANDMASS_BOUNDS.minX;
        const bboxH = LANDMASS_BOUNDS.maxY - LANDMASS_BOUNDS.minY;
        return Math.min((w - 2 * margin) / bboxW, (h - 2 * margin) / bboxH);
    }

    // Sets zoom to an absolute value (or via a multiplicative factor), anchored
    // at a specific screen point so that whatever was under that point stays
    // under it — this is what makes zoom feel centered instead of "flying away".
    function setZoomAtPoint(newZoom, anchorX, anchorY, isAbsolute) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const oldZoom = STATE.view.zoom;

        let targetZoom = isAbsolute ? newZoom : oldZoom * newZoom;
        const minZoom = getMinZoom();
        if (targetZoom < minZoom) targetZoom = minZoom;
        if (targetZoom > 120) targetZoom = 120;
        const f = targetZoom / oldZoom;

        // offset' = (anchor - screenCenter)*(1-f) + f*offset  -- keeps the map
        // point currently under the anchor fixed under that same anchor after zoom
        STATE.view.offsetX = (anchorX - w / 2) * (1 - f) + f * STATE.view.offsetX;
        STATE.view.offsetY = (anchorY - h / 2) * (1 - f) + f * STATE.view.offsetY;
        STATE.view.zoom = targetZoom;

        clampViewOffsets();
        draw();
    }

    function adjustZoom(factor) {
        // Button/wheel zoom anchors on screen center
        const w = window.innerWidth;
        const h = window.innerHeight;
        setZoomAtPoint(factor, w / 2, h / 2, false);
    }

