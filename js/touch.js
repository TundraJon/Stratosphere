    // --- USER TOUCH & INTERACTION ENGINE ---
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let pinchStartDist = 0;
    let pinchStartZoom = 1;

    // Raw touch-start position/time, used only to tell a genuine tap (for
    // resizing the plane icon) apart from the start of a drag/pinch.
    let touchStartClientX = 0;
    let touchStartClientY = 0;
    let touchStartTime = 0;
    const TAP_MAX_MOVEMENT = 12;   // px - beyond this, it's a drag, not a tap
    const TAP_MAX_DURATION = 400;  // ms - beyond this, it's a long-press/drag, not a tap
    // Zoom level at which airport/landmark labels show their extra detail
    // line(s), and (new) the zoom at/above which airports become tappable to
    // open their runway detail popup -- same threshold, kept as one source
    // of truth rather than two numbers that could drift apart.
    const LABEL_DETAIL_ZOOM_THRESHOLD = 20;

    // Plane icon size multiplier: 1x (default) / 2x / 3x. Single tap on the
    // plane toggles 1x<->2x; a true double-tap jumps to 3x from either state;
    // a single tap while at 3x resets to 1x.
    STATE.planeSizeMult = 1;
    let planeTapTimeout = null;
    const DOUBLE_TAP_WINDOW = 300; // ms

    // Same screen-position formula the plane draw block uses, so tap
    // hit-testing lines up exactly with where the icon is actually drawn.
    function getPlaneScreenPos() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (STATE.view.trackUp) {
            return { x: w / 2 + STATE.view.offsetX, y: h / 2 + STATE.view.offsetY };
        }
        const planePos = project(STATE.plane.lat, STATE.plane.lon);
        return {
            x: w / 2 + STATE.view.offsetX + planePos.x * STATE.view.zoom,
            y: h / 2 + STATE.view.offsetY + planePos.y * STATE.view.zoom
        };
    }

    // Hit-radius scales a bit with the plane's current size so a bigger
    // plane icon is easier to tap, not harder.
    function isTapOnPlane(clientX, clientY) {
        if (lastGpsFix === null) return false; // nothing drawn yet to tap
        const pos = getPlaneScreenPos();
        const hitRadius = 22 * STATE.planeSizeMult;
        return Math.hypot(clientX - pos.x, clientY - pos.y) <= hitRadius;
    }

    // Only tappable once zoomed in enough for city/state labels to already
    // be showing (same LABEL_DETAIL_ZOOM_THRESHOLD) -- below that, airports
    // are too close together on screen for a reliable tap target anyway.
    // Returns the tapped airport object, or null.
    //
    // Hit region matches the 3-letter CODE text's own real footprint only
    // (not the official name / city-state lines below it) -- fixed at the
    // font system's max 2x scale regardless of current zoom, since a
    // slightly generous target below max zoom doesn't hurt. Drawn via
    // drawFixedLabel, which renders in real screen pixels starting at a
    // (5,3) local offset from the airport's dot. In Track-Up it
    // counter-rotates the label by the heading, which only cancels the
    // map's own rotation: the label always sits upright on screen. So the
    // tap's screen offset from the dot is already in the label's own space
    // and is tested as is, with no rotation by the heading.
    function findTappedAirport(clientX, clientY) {
        if (!STATE.toggles.airports) return null;
        if (STATE.view.zoom < LABEL_DETAIL_ZOOM_THRESHOLD) return null;
        const MAX_FONT_SCALE = 2; // matches zoomFontScale()'s cap
        const BASE_CODE_W = 26, BASE_CODE_H = 12; // rough footprint of a 3-4 char bold 9px code at 1x
        const PAD = 4; // tap-comfort margin
        const hitW = BASE_CODE_W * MAX_FONT_SCALE, hitH = BASE_CODE_H * MAX_FONT_SCALE;
        const left = 2 - PAD, right = 2 + hitW + PAD;
        const top = 3 - hitH - PAD, bottom = 3 + 4 + PAD;

        for (const ap of AIRPORTS) {
            const mapPos = project(ap.lat, ap.lon);
            const dotScreen = mapToScreen(mapPos.x, mapPos.y);
            const localX = clientX - dotScreen.x, localY = clientY - dotScreen.y;
            if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
                return ap;
            }
        }
        return null;
    }

    // Tap detection for the special destination marker's code text (the
    // pin + code label that replaces the normal airport marker at the
    // selected destination). Unlike regular airports, this
    // has NO zoom gate -- it's the only one on screen at any time, so
    // there's no tap-ambiguity risk the zoom gate exists to prevent for
    // closely-clustered regular airport dots. Font is bigger (bold 11px
    // vs regular airports' 9px), so the base hit footprint is scaled up
    // to match.
    function isTapOnDestinationMarker(clientX, clientY) {
        const mapPos = project(STATE.target.lat, STATE.target.lon);
        const dotScreen = mapToScreen(mapPos.x, mapPos.y);
        const MAX_FONT_SCALE = 2;
        const BASE_CODE_W = 32, BASE_CODE_H = 15; // scaled up from the regular 26x12 to match the bigger 11px font
        const PAD = 4;
        const hitW = BASE_CODE_W * MAX_FONT_SCALE, hitH = BASE_CODE_H * MAX_FONT_SCALE;
        const left = 2 - PAD, right = 2 + hitW + PAD;
        const top = 3 - hitH - PAD, bottom = 3 + 4 + PAD;
        const localX = clientX - dotScreen.x, localY = clientY - dotScreen.y; // screen offset = label space (see findTappedAirport)
        return localX >= left && localX <= right && localY >= top && localY <= bottom;
    }

