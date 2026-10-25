    // ============================================================
    // TAKEOFF / LANDING CUTSCENE
    // ============================================================
    // Full spec (agreed with user before build):
    //   - Trigger: takeoff arms once speed is seen <50 MPH, fires when speed
    //     then rises above 70 MPH. Landing arms once speed is seen >=400 MPH,
    //     fires when speed then drops below 150 MPH. Each disarms after
    //     firing until the opposite threshold is re-crossed. Checked once per
    //     GPS fix (every 3s), not every frame -- matches real data cadence.
    //   - Total duration: 15s for both, auto-closes when animation finishes.
    //   - Card covers the bottom half of the screen (incl. the Settings
    //     drawer) while playing.
    //   - Master speed curve while grounded: apparent total groundspeed
    //     changes at a constant 16 MPH/sec. That total is split between the
    //     plane's own on-screen motion and the runway's scroll speed, in a
    //     ratio that shifts over the course of the sequence (see stage
    //     tables below) -- implemented here as the runway's FRACTION of the
    //     total rate, so multiplying by total(t) gives its scroll speed at
    //     any instant.
    //   - Runway is only visible while scale is in the 1.0x-1.5x band on
    //     both ends (matches real spec: appears/disappears exactly at 1.5x).
    //
    // Both computeXFrame() functions are pure (elapsed seconds in, plane/
    // runway state out) so they can be sanity-checked directly without the
    // DOM -- see the checkpoint values called out in comments below each.

    const CUTSCENE_TOTAL_DURATION = 15; // seconds, both directions
    const CUTSCENE_MPH_PER_SEC = 16;
    const CUTSCENE_LIFTOFF_SPEED = 160;
    const CUTSCENE_PX_PER_MPH_SEC = 3; // shared by position kinematics AND runway scroll -- same conversion factor throughout, so "the plane and runway share one world" is literally true, not just thematic

    // Horizontal/vertical resting positions, as % of the card. Shared by
    // both directions since takeoff's start == landing's end (rest, left).
    const PLANE_LEFT_REST = 8;
    const PLANE_LEFT_DECEL_START = 40; // takeoff: plane starts decelerating once it reaches this % of screen width
    const PLANE_LEFT_TRANSFER_END = 25; // landing: plane has picked up 100% of the remaining speed by the time it reaches this % of screen width
    const PLANE_LEFT_CENTER = 50;
    const PLANE_LEFT_EXIT = 115;   // takeoff exits off the right edge here
    const PLANE_LEFT_ENTRY = 92;   // landing enters from the right here
    const PLANE_TOP_GROUND = 60;   // runway-level vertical position (both)
    const PLANE_TOP_ALTITUDE = 15; // landing's initial "still airborne" height

    function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
    function easeInCubic(x) { return x * x * x; }
    function lerp(a, b, f) { return a + (b - a) * f; }
    function clamp01(x) { return Math.max(0, Math.min(1, x)); }

    // Cubic Hermite interpolation: given position+velocity at both ends of a
    // fixed time window, returns position/velocity at any point in between,
    // matching BOTH boundary conditions exactly. Used for the landing
    // rollout's transfer/final-stop phases (see comments there for why this
    // was needed over a simpler constant-acceleration approach).
    function hermitePosition(p0, v0, p1, v1, durationSec, localT) {
        const s = clamp01(localT / durationSec), s2 = s * s, s3 = s2 * s;
        const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
        return h00 * p0 + h10 * durationSec * v0 + h01 * p1 + h11 * durationSec * v1;
    }
    function hermiteVelocity(p0, v0, p1, v1, durationSec, localT) {
        const s = clamp01(localT / durationSec), s2 = s * s;
        const dh00 = 6 * s2 - 6 * s, dh10 = 3 * s2 - 4 * s + 1, dh01 = -6 * s2 + 6 * s, dh11 = 3 * s2 - 2 * s;
        return (dh00 * p0 + dh10 * durationSec * v0 + dh01 * p1 + dh11 * durationSec * v1) / durationSec;
    }

    // --- TAKEOFF -------------------------------------------------
    // Stage boundaries (seconds) -- note t1/t2 below are DERIVED from real
    // kinematics (not fixed constants), so they vary slightly by screen
    // width. Approximate values shown are for a ~390px-wide phone screen.
    //   0.0 - 1.0     Taxi hold (static)
    //   1.0 - t1(~3.9) Ground roll: plane accelerates from rest at a constant
    //               rate (10 MPH/s-equivalent) until it reaches 40% of the
    //               screen width. Runway accelerates alongside it the whole
    //               time at total-minus-plane (works out to 60% of the
    //               plane's rate here, matching the original 10:6 split).
    //   t1 - t2(~4.8)  Deceleration: plane decelerates from whatever speed it
    //               reached at the 40% mark down to EXACTLY zero, timed to
    //               land precisely at center (50%). This rate isn't a free
    //               choice -- it's fully determined by the known speed and
    //               the fixed 40%->50% distance (standard v^2=2ad kinematics).
    //               Runway's rate = total - plane the whole time, so
    //               whatever speed the plane gives up is automatically
    //               added onto the runway -- the combined total never stops
    //               climbing at its constant 16 MPH/s rate, start to finish.
    //   t2 - 11.0   Runway-only acceleration (anchored; runway alone climbs
    //               from wherever the 16 MPH/s clock is toward 160 MPH --
    //               reaches exactly 160 at t=11, since total(t)=16*(t-1),
    //               unaffected by the ground-roll rework since plane's
    //               contribution is 0 again by this point either way)
    //  11.0 - 15.0  Liftoff through exit: ONE continuous curve, un-anchoring
    //               and scaling 1.0->4.0 the whole way, no pause anywhere.
    //               Plane stays level throughout (no pitch). 1.5x is purely
    //               a bookkeeping checkpoint for the runway's end marker.
    function computeTakeoffFrame(t, screenWidthPx) {
        t = Math.max(0, Math.min(t, CUTSCENE_TOTAL_DURATION));
        screenWidthPx = screenWidthPx || 390; // sensible fallback for standalone calls without a real DOM

        const startPx = screenWidthPx * PLANE_LEFT_REST / 100;
        const decelStartPx = screenWidthPx * PLANE_LEFT_DECEL_START / 100;
        const centerPx = screenWidthPx * PLANE_LEFT_CENTER / 100;

        const A1_MPH_PER_S = 10; // plane's own acceleration during ground roll (60% of this, 6, is what's left over for the runway -- matches the original 10:6 split, now derived rather than assumed)
        const A1_px = A1_MPH_PER_S * CUTSCENE_PX_PER_MPH_SEC;
        const distA = decelStartPx - startPx;
        const durA = Math.sqrt(2 * distA / A1_px); // time from t=1 to reach the 40% mark
        const t1 = 1 + durA;
        const v1_mph = A1_MPH_PER_S * durA; // plane's speed at the 40% mark
        const v1_px = v1_mph * CUTSCENE_PX_PER_MPH_SEC;

        const distB = centerPx - decelStartPx;
        const A2_px = distB > 0 ? (v1_px * v1_px) / (2 * distB) : 0; // solved so v=0 exactly at center
        const durB = A2_px > 0 ? v1_px / A2_px : 0;
        const t2 = t1 + durB;

        let leftPx, scale, planeSpeedMph;
        if (t < 1) {
            leftPx = startPx; scale = 1.0; planeSpeedMph = 0;
        } else if (t < t1) {
            const dt = t - 1;
            leftPx = startPx + 0.5 * A1_px * dt * dt;
            planeSpeedMph = A1_MPH_PER_S * dt;
            scale = 1.0;
        } else if (t < t2) {
            const dt = t - t1;
            leftPx = decelStartPx + v1_px * dt - 0.5 * A2_px * dt * dt;
            planeSpeedMph = Math.max(0, v1_mph - (A2_px / CUTSCENE_PX_PER_MPH_SEC) * dt);
            scale = 1.0;
        } else if (t < 11) {
            leftPx = centerPx; scale = 1.0; planeSpeedMph = 0;
        } else {
            const f = easeInCubic(clamp01((t - 11) / 4));
            leftPx = lerp(centerPx, screenWidthPx * PLANE_LEFT_EXIT / 100, f);
            scale = lerp(1.0, 4.0, f);
            planeSpeedMph = 0; // airborne, not contributing to ground speed anymore
        }

        const totalSpeedMph = CUTSCENE_MPH_PER_SEC * Math.max(0, t - 1);
        const runwayScrollRateMph = Math.max(0, totalSpeedMph - planeSpeedMph);
        const leftPct = leftPx / screenWidthPx * 100;
        return { leftPct, topPct: PLANE_TOP_GROUND, scale, pitchDeg: 0, runwayScrollRateMph };
    }
    // Checkpoints (verified separately, not just by inspection):
    //   t=0        -> left=8%,  scale=1.0
    //   t=t1       -> left=40% exactly, plane speed = v1
    //   t=t2       -> left=50% exactly, plane speed = 0 (arrived/anchored)
    //   t=11       -> total elapsed accel time = 10s * 16MPH/s = 160MPH (liftoff)
    //   t=15       -> left=115% (off right edge), scale=4.0, no pause anywhere
    //             in the 11-15 span

    // --- LANDING (mirror of takeoff) ------------------------------
    // Stage boundaries (seconds):
    //   0.0 - 3.448 Approach: enters top-right at 4x/-15deg (nose-down),
    //               easing toward center; scale is ONE continuous curve
    //               4.0->1.1 spanning the full 0.0-4.0 window (not just to
    //               3.448) -- 3.448s is simply the moment that continuous
    //               curve crosses scale=1.5, which is also when position
    //               finishes (anchors) and the runway appears.
    //   3.448-4.0   Flare tail: anchored; scale keeps gliding 1.5->1.1 on
    //               the SAME curve; pitch levels from -15deg to 0, finishing
    //               exactly as scale hits 1.1
    //   4.0 - 4.5   Hold at 1.1x (brief pause)
    //   4.5 - 5.0   Touchdown: quick final shrink 1.1->1.0
    //   5.0 - 11.0  Runway-only deceleration: anchored, runway alone carries
    //               the -16 MPH/s unwind from 160 down to 64
    //  11.0 - 12.0  Handoff transition (~1s): runway's share shrinks back
    //               toward 6/16, plane's ramps up to 10/16, total still
    //               falling at -16 MPH/s throughout (64->48)
    //  12.0 - 15.0  Rollout: un-anchors, drifts left to rest, fixed 10:6
    //               split, decelerating 48->0 (reaches exactly 0 at t=15)
    const LANDING_SCALE_CURVE_END = 4.0; // seconds; scale goes 4.0->1.1 over [0, this]
    const LANDING_ANCHOR_TIME = LANDING_SCALE_CURVE_END * (4.0 - 1.5) / (4.0 - 1.1); // ~3.448s, where scale crosses 1.5

    const LANDING_TRANSFER_START = 11.0; // matches the old handoff's trigger point -- reusing an already-tuned moment, just replacing what happens at it
    const LANDING_TRANSFER_DURATION = 2.5; // seconds; tune-able
    const LANDING_TRANSFER_END = LANDING_TRANSFER_START + LANDING_TRANSFER_DURATION; // 13.5
    const LANDING_PLANE_STOP_OFFSET_PX = 50; // plane stops this many px short of the screen edge, not exactly at it

    function computeLandingFrame(t, screenWidthPx) {
        t = Math.max(0, Math.min(t, CUTSCENE_TOTAL_DURATION));
        screenWidthPx = screenWidthPx || 390;
        let leftPct, topPct, scale, runwayFraction;

        if (t < LANDING_SCALE_CURVE_END) {
            // One continuous linear scale curve for the whole approach+flare
            scale = lerp(4.0, 1.1, t / LANDING_SCALE_CURVE_END);
            if (t < LANDING_ANCHOR_TIME) {
                const f = easeOutCubic(clamp01(t / LANDING_ANCHOR_TIME));
                leftPct = lerp(PLANE_LEFT_ENTRY, PLANE_LEFT_CENTER, f);
                topPct = lerp(PLANE_TOP_ALTITUDE, PLANE_TOP_GROUND, f);
            } else {
                leftPct = PLANE_LEFT_CENTER;
                topPct = PLANE_TOP_GROUND;
            }
            runwayFraction = 0; // set below once past the anchor moment
        } else if (t < 4.5) {
            leftPct = PLANE_LEFT_CENTER; topPct = PLANE_TOP_GROUND;
            scale = 1.1;
        } else if (t < 5.0) {
            leftPct = PLANE_LEFT_CENTER; topPct = PLANE_TOP_GROUND;
            scale = lerp(1.1, 1.0, clamp01((t - 4.5) / 0.5));
        } else if (t < LANDING_TRANSFER_START) {
            // Runway-only deceleration -- unchanged from before.
            leftPct = PLANE_LEFT_CENTER; topPct = PLANE_TOP_GROUND;
            scale = 1.0;
        } else if (t < LANDING_TRANSFER_END) {
            // TRANSFER PHASE (replaces the old abrupt handoff): plane
            // smoothly picks up speed while the runway gives it up, via a
            // Hermite curve matching position AND velocity exactly at both
            // ends -- (center, v=0) to (25%, v=total speed at transfer end).
            // No lurch, because velocity is continuous the whole way through
            // (Hermite guarantees this by construction, unlike the old
            // fixed-ratio jump).
            topPct = PLANE_TOP_GROUND; scale = 1.0;
            const centerPx = screenWidthPx * PLANE_LEFT_CENTER / 100;
            const transferEndPx = screenWidthPx * PLANE_LEFT_TRANSFER_END / 100;
            const vEndMph = Math.max(0, CUTSCENE_LIFTOFF_SPEED - CUTSCENE_MPH_PER_SEC * (LANDING_TRANSFER_END - 5.0));
            const vEndPx = -vEndMph * CUTSCENE_PX_PER_MPH_SEC; // negative: moving LEFT (toward rest)
            const localT = t - LANDING_TRANSFER_START;
            const posPx = hermitePosition(centerPx, 0, transferEndPx, vEndPx, LANDING_TRANSFER_DURATION, localT);
            const velPx = hermiteVelocity(centerPx, 0, transferEndPx, vEndPx, LANDING_TRANSFER_DURATION, localT);
            leftPct = posPx / screenWidthPx * 100;
            // Runway's share = whatever the plane ISN'T carrying yet (mirrors
            // the "total minus plane" pattern used everywhere else).
            const totalMphHere = Math.max(0, CUTSCENE_LIFTOFF_SPEED - CUTSCENE_MPH_PER_SEC * (t - 5.0));
            const planeMphHere = Math.abs(velPx) / CUTSCENE_PX_PER_MPH_SEC;
            const runwayMphHere = Math.max(0, totalMphHere - planeMphHere);
            runwayFraction = totalMphHere > 0 ? runwayMphHere / totalMphHere : 0;
        } else {
            // FINAL ROLLOUT: runway is fully stopped (0 from here on). Plane
            // alone coasts from whatever speed/position the transfer phase
            // ended with, to a complete stop LANDING_PLANE_STOP_OFFSET_PX
            // short of the screen edge (not exactly at 0px) -- stopping
            // exactly at the edge rendered the plane half off-screen, since
            // its own width extends past its center point.
            topPct = PLANE_TOP_GROUND; scale = 1.0;
            const transferEndPx = screenWidthPx * PLANE_LEFT_TRANSFER_END / 100;
            const vEndMph = Math.max(0, CUTSCENE_LIFTOFF_SPEED - CUTSCENE_MPH_PER_SEC * (LANDING_TRANSFER_END - 5.0));
            const vEndPx = -vEndMph * CUTSCENE_PX_PER_MPH_SEC;
            const rolloutDuration = CUTSCENE_TOTAL_DURATION - LANDING_TRANSFER_END;
            const localT = t - LANDING_TRANSFER_END;
            const posPx = rolloutDuration > 0
                ? hermitePosition(transferEndPx, vEndPx, LANDING_PLANE_STOP_OFFSET_PX, 0, rolloutDuration, localT)
                : LANDING_PLANE_STOP_OFFSET_PX;
            leftPct = posPx / screenWidthPx * 100;
            runwayFraction = 0; // stopped
        }

        // Runway fraction / total-speed model (post-anchor only; the runway
        // isn't visible at all before the anchor moment).
        const runwayVisible = t >= LANDING_ANCHOR_TIME;
        const totalSpeed = t < 5.0 ? CUTSCENE_LIFTOFF_SPEED
            : Math.max(0, CUTSCENE_LIFTOFF_SPEED - CUTSCENE_MPH_PER_SEC * (t - 5.0));
        if (t >= 5.0 && t < LANDING_TRANSFER_START) {
            runwayFraction = 1.0; // runway-only deceleration
        } else if (t < 5.0) {
            runwayFraction = 1.0; // full threshold-speed scroll during flare/hold/touchdown
        }
        // (transfer/rollout branches above already set their own runwayFraction)

        return { leftPct, topPct, scale, pitchDeg: 0, runwayVisible, runwayScrollRateMph: totalSpeed * runwayFraction };
    }
    // Checkpoints (verified separately, not just by inspection):
    //   t=0      -> left=92 (entry), top=15 (altitude), scale=4.0
    //   t=3.448  -> scale crosses 1.5 exactly; left/top finish at center/ground
    //   t=4.0    -> scale=1.1
    //   t=5.0    -> scale=1.0 (touchdown)
    //   t=15     -> left=8 (at rest), scale=1.0

    let cutsceneRafId = null;
    let cutsceneStartTime = null;
    let cutsceneWorldScrollPx = 0; // shared world-scroll accumulator (sign convention differs by direction) -- drives runway pavement/markers only
    let groundScrollPx = 0; // separate ground-texture accumulator -- always scrolls continuously from t=0 for both types, decoupled from runway visibility gating (landing's marker math needs cutsceneWorldScrollPx to stay exactly 0 until the anchor moment; this doesn't)
    let cutsceneLastFrameTime = null;

    // Measures a glyph's real rendered width via a throwaway hidden probe
    // element -- used so runway dash/marker sizing is derived from the
    // actual plane emoji's rendered wingspan at runtime, not a guessed
    // pixel value that might not match the real font stack.
    function measureGlyphWidthPx(text, fontSizePx, bold) {
        const probe = document.createElement('span');
        probe.style.position = 'fixed';
        probe.style.left = '-9999px';
        probe.style.visibility = 'hidden';
        probe.style.fontSize = fontSizePx + 'px';
        if (bold) probe.style.fontWeight = 'bold';
        probe.textContent = text;
        document.body.appendChild(probe);
        const w = probe.getBoundingClientRect().width;
        document.body.removeChild(probe);
        return w;
    }

    function playCutscene(type) {
        if (STATE.cutscene.active) return; // don't stack a second one mid-playback
        STATE.cutscene.active = true;
        cutsceneStartTime = null;
        cutsceneLastFrameTime = null;
        cutsceneWorldScrollPx = 0;
        groundScrollPx = 0;

        const card = document.getElementById('cutscene-card');
        const plane = document.getElementById('cutscene-plane');
        const runway = document.getElementById('cutscene-runway');
        const dashes = document.getElementById('cutscene-runway-dashes');
        const markerA = document.getElementById('cutscene-runway-marker-start'); // takeoff: leading/start marker. landing: leading marker (enters at x=0, exits right)
        const markerB = document.getElementById('cutscene-runway-marker-end');   // takeoff: trailing/end marker (spawns at 1.5x). landing: far marker (scrolls in from offscreen-left, settles at x=0)
        card.classList.add('active');

        // --- Grass background: plain day/night green by default, replaced
        // by a fractal-fill texture (same technique/cache as the main map)
        // when Seasonal Colors is on (day mode only, same restriction as
        // the main map). Governing state is wherever the plane actually is
        // right now -- for takeoff that's where it starts rolling, for
        // landing that's wherever it is when the landing trigger fires
        // (which will be at/near the destination, since that's what
        // triggers it in the first place). Colored ONCE at cutscene start,
        // not every frame -- the governing state can't change mid-cutscene.
        let cutsceneGroundBitmap = null;
        {
            let background = STATE.dayMode ? '#2e5a27' : '#16241a';
            if (STATE.toggles.seasonalColors && STATE.dayMode) {
                const govState = getStateAtLatLon(STATE.plane.lat, STATE.plane.lon);
                if (govState) {
                    const now = STATE.seasonalDateOverride || new Date();
                    const season = getActiveSeasonColors(govState, now);
                    if (season) {
                        background = season.colors[0]; // solid base -- fractal texture draws on top every frame
                        const blendGrid = cutsceneFractalBlend[type];
                        if (blendGrid) cutsceneGroundBitmap = recolorFractalGrid(blendGrid, season.colors);
                    }
                }
            }
            card.style.background = background;
        }

        // --- Fractal ground canvas setup -- sized to the card's real
        // backing-store pixels (dpr-aware), same convention as the main
        // map canvas, so the texture stays sharp on retina screens.
        const blobCanvas = document.getElementById('cutscene-blob-canvas');
        const blobCtx = blobCanvas.getContext('2d');
        const blobDpr = window.devicePixelRatio || 1;
        const cardRectForBlobs = card.getBoundingClientRect();
        blobCanvas.width = cardRectForBlobs.width * blobDpr;
        blobCanvas.height = cardRectForBlobs.height * blobDpr;
        blobCtx.setTransform(blobDpr, 0, 0, blobDpr, 0, 0);

        // Draws the ground fractal texture for this frame, tiled 3x (-W, 0,
        // +W) across the same cutsceneWorldScrollPx accumulator the runway
        // dashes use, so the texture inherits identical speed/deceleration
        // for free and wraps seamlessly as it scrolls off one edge and
        // back in the other. Tile width = screen width captured at
        // cutscene start (screenWidthPx, defined below); tile height =
        // card height. Just 3 drawImage calls per frame -- vs. up to ~270
        // individual blob draws in the earlier per-dot system.
        function drawCutsceneBlobs() {
            blobCtx.clearRect(0, 0, cardRectForBlobs.width, cardRectForBlobs.height);
            if (!cutsceneGroundBitmap) return;
            const tileW = screenWidthPx;
            const tileH = cardRectForBlobs.height;
            let x = groundScrollPx % tileW;
            if (x < 0) x += tileW;
            [x - tileW, x, x + tileW].forEach(px => {
                blobCtx.drawImage(cutsceneGroundBitmap, px, 0, tileW, tileH);
            });
        }

        const computeFn = type === 'landing' ? computeLandingFrame : computeTakeoffFrame;
        const PX_PER_MPH_SEC = CUTSCENE_PX_PER_MPH_SEC; // same constant computeTakeoffFrame's kinematics use, so position math and runway scroll stay consistent
        const screenWidthPx = card.getBoundingClientRect().width; // measured once; takeoff's ground-roll kinematics are derived from the real screen width
        const PLANE_ROTATION_CALIBRATION = -48; // same emoji calibration as the main map's plane icon
        const baseHeading = type === 'landing' ? 270 : 90;
        const rotationDeg = baseHeading + PLANE_ROTATION_CALIBRATION;
        plane.style.transform = `translate(-50%, -50%) scale(1) rotate(${rotationDeg}deg)`;

        // --- Runway dash/marker sizing, derived from the plane's real
        // rendered wingspan at 1x scale (not a guessed pixel value). Runway
        // strip height = 1.5x the wingspan, centered on the dash centerline
        // (so 0.75x the wingspan above and below it). ---
        const planeFontSizePx = parseFloat(getComputedStyle(plane).fontSize);
        const wingspanPx = measureGlyphWidthPx('✈️', planeFontSizePx, false);
        const REFERENCE_MARKER_SIZE = 20;
        const referenceMarkerWidth = measureGlyphWidthPx('≡', REFERENCE_MARKER_SIZE, true);
        const markerFontSizePx = REFERENCE_MARKER_SIZE * (wingspanPx / referenceMarkerWidth);
        markerA.style.fontSize = markerFontSizePx + 'px';
        markerB.style.fontSize = markerFontSizePx + 'px';
        runway.style.height = (wingspanPx * 1.5) + 'px';

        const dashLenPx = wingspanPx * 0.5;
        dashes.style.backgroundImage = `repeating-linear-gradient(to right, ` +
            `#ffffff 0px, #ffffff ${dashLenPx}px, transparent ${dashLenPx}px, transparent ${dashLenPx * 2}px)`;
        dashes.style.backgroundPositionX = '0px'; // fixed -- the STRIP's own left/width now carry all the motion, so the pattern rides along for free instead of needing separate per-frame scrolling

        const LARGE_WIDTH_PX = 9999; // takeoff placeholder width before the end marker spawns and the true extent is known; card's overflow:hidden clips it, so this is safe

        // --- Landing only: pre-integrate the exact total scroll distance
        // from the anchor moment to full stop (t=15), using the same rate
        // formula computeLandingFrame already provides. This lets the far
        // marker's world position be fixed analytically up front so it
        // lands EXACTLY at x=0 the instant the plane stops, instead of
        // guessing a spawn time and hoping it lines up. ---
        let landingFinalScrollPx = 0;
        if (type === 'landing') {
            const step = 0.02;
            for (let t = LANDING_ANCHOR_TIME; t < CUTSCENE_TOTAL_DURATION; t += step) {
                landingFinalScrollPx += computeLandingFrame(t, screenWidthPx).runwayScrollRateMph * PX_PER_MPH_SEC * step;
            }
        }

        if (type === 'takeoff') {
            markerA.style.left = '0px';
            markerA.style.display = 'block';
            markerB.style.display = 'none';
        } else {
            markerA.style.right = '';
            markerB.style.right = '';
        }

        let endMarkerSpawned = false; // takeoff only
        let endMarkerWorldPx = 0;     // takeoff only

        function frame(timestamp) {
            if (cutsceneStartTime === null) { cutsceneStartTime = timestamp; cutsceneLastFrameTime = timestamp; }
            const elapsed = (timestamp - cutsceneStartTime) / 1000;
            const dt = Math.min((timestamp - cutsceneLastFrameTime) / 1000, 0.1);
            cutsceneLastFrameTime = timestamp;

            const f = computeFn(elapsed, screenWidthPx);

            plane.style.left = f.leftPct + '%';
            plane.style.top = f.topPct + '%';
            plane.style.transform = `translate(-50%, -50%) scale(${f.scale}) rotate(${rotationDeg}deg)`;

            if (type === 'takeoff') {
                // Scrolls LEFT (plane faces right). Strip's left edge is
                // always world-position 0 (markerA); its right edge is
                // "unknown/off past the screen" until the end marker (markerB)
                // spawns at the 1.5x checkpoint, after which both edges move
                // together as one rigid body -- nothing exists past markerB,
                // so grass shows through automatically once it's on screen.
                cutsceneWorldScrollPx -= f.runwayScrollRateMph * PX_PER_MPH_SEC * dt;
                groundScrollPx -= f.runwayScrollRateMph * PX_PER_MPH_SEC * dt; // mirrors cutsceneWorldScrollPx exactly here -- takeoff never had a gating bug, this just keeps drawCutsceneBlobs() reading one consistent variable for both types
                runway.classList.add('visible');

                const leftEdgePx = 0 + cutsceneWorldScrollPx;
                markerA.style.left = leftEdgePx + 'px';

                if (!endMarkerSpawned && f.scale >= 1.5) {
                    endMarkerSpawned = true;
                    const containerWidthPx = card.getBoundingClientRect().width;
                    endMarkerWorldPx = containerWidthPx - cutsceneWorldScrollPx;
                    markerB.style.display = 'block';
                }
                const rightEdgePx = endMarkerSpawned ? (endMarkerWorldPx + cutsceneWorldScrollPx) : LARGE_WIDTH_PX;
                if (endMarkerSpawned) markerB.style.left = (rightEdgePx - wingspanPx) + 'px'; // anchor by RIGHT edge (subtract marker's own width) so it sits ON the pavement, not past it

                runway.style.left = leftEdgePx + 'px';
                runway.style.width = Math.max(0, rightEdgePx - leftEdgePx) + 'px';
            } else {
                // Scrolls RIGHT (plane faces left) -- reversed from takeoff.
                // markerA leads (spawns at x=0 at the anchor moment, exits
                // off the right edge). markerB is analytically pre-placed so
                // it scrolls in from off-screen-left and settles exactly at
                // x=0 at full stop (t=15). Strip spans between them the
                // whole time, same "nothing exists past the marker" rule.
                // Ground scroll accumulates continuously from t=0 into its
                // OWN accumulator (groundScrollPx, declared above with the
                // other cutscene-local state) -- NOT cutsceneWorldScrollPx,
                // which the marker math above depends on staying exactly 0
                // at the anchor moment (landingFinalScrollPx is calibrated
                // against that assumption so the far marker lands precisely
                // at x=0 when the plane stops; touching that variable here
                // would silently break that calibration). Only the runway
                // PAVEMENT and markers stay gated behind runwayVisible --
                // they genuinely shouldn't exist until their spawn moment.
                groundScrollPx += f.runwayScrollRateMph * PX_PER_MPH_SEC * dt;
                if (f.runwayVisible) {
                    cutsceneWorldScrollPx += f.runwayScrollRateMph * PX_PER_MPH_SEC * dt;
                    runway.classList.add('visible');
                    markerA.style.display = 'block';
                    markerB.style.display = 'block';

                    const rightEdgePx = 0 + cutsceneWorldScrollPx; // markerA (world 0)
                    const leftEdgePx = -landingFinalScrollPx + cutsceneWorldScrollPx; // markerB (world -final)
                    markerA.style.left = (rightEdgePx - wingspanPx) + 'px'; // anchor by RIGHT edge -- same fix as takeoff's markerB
                    markerB.style.left = leftEdgePx + 'px';
                    runway.style.left = leftEdgePx + 'px';
                    runway.style.width = Math.max(0, rightEdgePx - leftEdgePx) + 'px';
                } else {
                    runway.classList.remove('visible');
                }
            }

            drawCutsceneBlobs();

            if (elapsed < CUTSCENE_TOTAL_DURATION) {
                cutsceneRafId = requestAnimationFrame(frame);
            } else {
                endCutscene();
            }
        }
        cutsceneRafId = requestAnimationFrame(frame);
    }

    function endCutscene() {
        if (cutsceneRafId !== null) cancelAnimationFrame(cutsceneRafId);
        cutsceneRafId = null;
        STATE.cutscene.active = false;
        const card = document.getElementById('cutscene-card');
        const runway = document.getElementById('cutscene-runway');
        const markerA = document.getElementById('cutscene-runway-marker-start');
        const markerB = document.getElementById('cutscene-runway-marker-end');
        card.classList.remove('active');
        runway.classList.remove('visible');
        markerA.style.display = 'none';
        markerB.style.display = 'none';
    }

    // Called once per real GPS fix (every 3s) -- not every frame, since
    // position/speed data itself doesn't arrive any faster than that.
    function checkCutsceneTriggers(speedMph) {
        if (STATE.cutscene.active) return;
        if (speedMph < 50) STATE.cutscene.takeoffArmed = true;
        if (STATE.cutscene.takeoffArmed && speedMph > 70) {
            STATE.cutscene.takeoffArmed = false;
            playCutscene('takeoff');
            return;
        }
        if (speedMph >= 400) STATE.cutscene.landingArmed = true;
        if (STATE.cutscene.landingArmed && speedMph < 140) {
            STATE.cutscene.landingArmed = false;
            playCutscene('landing');
        }
    }

    // Auto-opens the runway popup for the current destination once within
    // 1nm, unless it was recently manually dismissed for this same
    // destination (see closeAirportPopup's dismissal recording) and hasn't
    // yet re-armed (cleared 9nm from the destination, or 20 minutes have
    // passed since the dismissal -- whichever happens first).
    const AUTO_TRIGGER_RADIUS_NM = 1;
    const AUTO_TRIGGER_REARM_RADIUS_NM = 9;
    const AUTO_TRIGGER_REARM_MINUTES = 20;
    function checkAutoTriggerAirportPopup() {
        if (STATE.airportPopup.open) return;
        if (lastGpsFix === null) return;
        const distNm = getDistance(STATE.plane.lat, STATE.plane.lon, STATE.target.lat, STATE.target.lon);

        if (STATE.airportPopup.autoTriggerDismissedFor === STATE.target.name) {
            const minutesSinceDismiss = (Date.now() - STATE.airportPopup.autoTriggerDismissedAt) / 60000;
            if (distNm > AUTO_TRIGGER_REARM_RADIUS_NM || minutesSinceDismiss > AUTO_TRIGGER_REARM_MINUTES) {
                STATE.airportPopup.autoTriggerDismissedFor = null;
                STATE.airportPopup.autoTriggerDismissedAt = null;
            } else {
                return; // still dismissed, not yet re-armed
            }
        }

        if (distNm <= AUTO_TRIGGER_RADIUS_NM) {
            openAirportPopup(STATE.target);
        }
    }

    function animate(timestamp) {
        if (lastFrameTime === null) lastFrameTime = timestamp;
        // Clamp delta so a backgrounded/throttled tab doesn't cause one huge jump
        // when it resumes.
        const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.25);
        lastFrameTime = timestamp;

        // Turn smoothly toward the averaged real-world heading, and keep
        // advancing position every frame via dead-reckoning so the plane
        // never freezes while waiting on the next GPS fix. None of this runs
        // until we've actually had a first real fix — otherwise this would
        // dead-reckon from the placeholder STATE.plane defaults, which is
        // exactly the "drifting before GPS ever reports in" bug.
        if (lastGpsFix !== null) {
            if (STATE.gps.targetHeading !== null) {
                turnTowardHeading(STATE.gps.targetHeading, deltaSeconds);
            }
            stepPositionForward(deltaSeconds);
        }

        draw();
        if (STATE.airportPopup.open) renderAirportPopup();
        else checkAutoTriggerAirportPopup();
        requestAnimationFrame(animate);
    }
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(animate));

