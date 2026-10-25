    // --- CANVAS ENGINE ---
    const canvas = document.getElementById('map-canvas');
    const ctx = canvas.getContext('2d');

    let hasInitiallyFit = false;

    // Handle high-resolution retina screens
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        const firstFit = !hasInitiallyFit;
        if (!hasInitiallyFit) {
            fitMainlandToScreen();
            hasInitiallyFit = true;
        } else {
            clampViewOffsets();
        }
        draw();
        // Bake the seasonal fractal fill cache (all states + both cutscene
        // ground textures) here too, so its one-time cost is absorbed into
        // the loading screen's existing wait rather than causing a runtime
        // hitch. Measured ~270ms-1.2s depending on tuning in prior testing
        // -- comfortably within the loading screen's own floor.
        if (firstFit) {
            generateFractalCache();
        }
        // Tell the loading screen (its own script, earlier in the page) that
        // the map's first real frame is done, so it can start its fade-out
        // once its 2s minimum floor has also passed.
        if (firstFit) {
            window.loadMapReady = true;
        }
    }
    document.addEventListener("DOMContentLoaded", () => window.addEventListener('resize', resizeCanvas));
    document.addEventListener("DOMContentLoaded", resizeCanvas);

    // --- LANDMASS BOUNDING BOX (for pan/zoom clamping) ---
    // Computed once from the actual mainland + Alaska + Hawaii coordinates,
    // so clamping is based on real data rather than guessed numbers.
    const LANDMASS_BOUNDS = (() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const consider = (lat, lon) => {
            const p = project(lat, lon);
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        };
        USA_OUTLINE.forEach(pt => consider(pt.lat, pt.lon));
        const alaskaPoly = STATE_POLYGONS.find(s => s.name === 'Alaska');
        const hawaiiPoly = STATE_POLYGONS.find(s => s.name === 'Hawaii');
        if (alaskaPoly) alaskaPoly.rings.forEach(ring => ring.forEach(pt => consider(pt.lat, pt.lon)));
        if (hawaiiPoly) hawaiiPoly.rings.forEach(ring => ring.forEach(pt => consider(pt.lat, pt.lon)));
        return { minX, maxX, minY, maxY };
    })();

    // Mainland-only bounding box, used just for the initial "fit to screen" on load
    // (using the combined bounds here would zoom out to fit Alaska/Hawaii too, which
    // is not what "fill the screen with the continental US" means).
    const MAINLAND_BOUNDS = (() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        USA_OUTLINE.forEach(pt => {
            const p = project(pt.lat, pt.lon);
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        return { minX, maxX, minY, maxY };
    })();

    // Same idea, for Alaska — used to size its day-mode gradient (southeast
    // to northwest) to the actual shape.
    const ALASKA_BOUNDS = (() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const alaskaPoly = STATE_POLYGONS.find(s => s.name === 'Alaska');
        if (alaskaPoly) {
            alaskaPoly.rings.forEach(ring => ring.forEach(pt => {
                const p = project(pt.lat, pt.lon);
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }));
        }
        return { minX, maxX, minY, maxY };
    })();

    // Per-state bounding boxes, computed once (states don't move), used for
    // each state's own seasonal color gradient below.
    const STATE_BOUNDS_BY_NAME = (() => {
        const map = {};
        STATE_POLYGONS.forEach(state => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            state.rings.forEach(ring => ring.forEach(pt => {
                const p = project(pt.lat, pt.lon);
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }));
            map[state.name] = { minX, maxX, minY, maxY };
        });
        return map;
    })();

    // Each state's polygon area in map-units (shoelace formula, summed
    // across all rings), computed once. Multiplying by zoom^2 gives the
    // approximate on-screen area at any current zoom level, which the
    // seasonal scatter fill uses to size its dot count so texture density
    // looks the same everywhere and at any zoom.
    function hexToRgbParts(hex) {
        hex = hex.replace('#', '');
        return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
    }

    // Five size tiers (approximate real land-area ranking, not exact --
    // fine-tune later if a particular state looks off for its tier). Alaska
    // is the sole "huge" tier; the other 49 states split roughly into four
    // groups of ~12-13.
    // STATE_SIZE_TIER merged into STATE_DATA[state].tier (see below).


    // Returns the current visible viewport's map-space bounding box, given
    // the same translate/scale draw() applies (screen center + offset,
    // divided by zoom). Used for viewport culling below.
    // Returns the current visible viewport's map-space bounding box. Built
    // by inverting the REAL active screen transform -- translate/scale for
    // North-Up, PLUS rotation and a plane-centered re-origin for Track-Up --
    // applied to the four screen corners, then taking the bounding box of
    // those four map-space points. A rotated viewport is a rotated
    // rectangle in map-space, so this bounding box is slightly larger than
    // the true visible region (by design -- a little too generous is safe;
    // too tight risks culling something actually on screen).
    //
    // Previously this assumed the North-Up transform unconditionally, which
    // silently broke culling in Track-Up mode: states could vanish from one
    // side of the screen (or the wrong side, depending on heading) because
    // the culling box never rotated with the actual view.
    // Forward transform -- exact mirror of getVisibleMapBounds' inverse
    // above (same rotation/origin logic for Track-Up, reduces identically
    // to the plain North-Up case). Converts a map-space lat/lon-projected
    // point to real screen pixels, needed anywhere we compare against a
    // tap/click position rather than just letting the canvas transform
    // matrix handle it implicitly during drawing.
    function mapToScreen(mapX, mapY) {
        const w = window.innerWidth, h = window.innerHeight;
        const zoom = STATE.view.zoom;
        const rotationAngle = STATE.view.trackUp ? -STATE.plane.hdg * Math.PI / 180 : 0;
        let originX = 0, originY = 0;
        if (STATE.view.trackUp) {
            const p = project(STATE.plane.lat, STATE.plane.lon);
            originX = p.x; originY = p.y;
        }
        const cosA = Math.cos(rotationAngle), sinA = Math.sin(rotationAngle);
        const px = mapX - originX, py = mapY - originY;
        const rx = cosA * px - sinA * py;
        const ry = sinA * px + cosA * py;
        return { x: rx * zoom + w / 2 + STATE.view.offsetX, y: ry * zoom + h / 2 + STATE.view.offsetY };
    }

    function getVisibleMapBounds() {
        const w = window.innerWidth, h = window.innerHeight;
        const zoom = STATE.view.zoom;
        const rotationAngle = STATE.view.trackUp ? -STATE.plane.hdg * Math.PI / 180 : 0;
        let originX = 0, originY = 0;
        if (STATE.view.trackUp) {
            const p = project(STATE.plane.lat, STATE.plane.lon);
            originX = p.x; originY = p.y;
        }
        const cosA = Math.cos(-rotationAngle), sinA = Math.sin(-rotationAngle);

        function screenToMap(sx, sy) {
            const px = (sx - w / 2 - STATE.view.offsetX) / zoom;
            const py = (sy - h / 2 - STATE.view.offsetY) / zoom;
            const rx = cosA * px - sinA * py;
            const ry = sinA * px + cosA * py;
            return { x: rx + originX, y: ry + originY };
        }

        const corners = [screenToMap(0, 0), screenToMap(w, 0), screenToMap(0, h), screenToMap(w, h)];
        const xs = corners.map(c => c.x), ys = corners.map(c => c.y);
        return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    }

    // AABB intersection test between a state's bounding box and the current
    // viewport -- skips drawing entirely for any state that's off-screen.
    function stateInViewport(state) {
        const bounds = STATE_BOUNDS_BY_NAME[state.name];
        if (!bounds) return true; // unknown bounds -- draw it rather than risk hiding it
        const vp = getVisibleMapBounds();
        return bounds.minX <= vp.maxX && bounds.maxX >= vp.minX &&
               bounds.minY <= vp.maxY && bounds.maxY >= vp.minY;
    }

