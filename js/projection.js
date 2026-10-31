    // --- MATHEMATICAL MAP PROJECTION (ALBERS CONIC EQUAL-AREA) ---
    // Perfect for projecting the standard United States geographic layout onto a flat screen
    const PROJ = {
        lat0: 37.5,      // Latitude Origin
        lon0: -96.0,     // Longitude Origin (Central Meridian)
        lat1: 29.5,      // Standard Parallel 1
        lat2: 45.5,      // Standard Parallel 2
        scale: 160,      // Default base projection scale
    };

    // Shared font-scaling factor for all map text labels (landmarks,
    // airports, target label): 1.0x at zoom<=50, scaling linearly
    // up to 2.0x at zoom=120 (the max zoom), clamped to that range.
    function zoomFontScale() {
        const z = STATE.view.zoom;
        if (z <= 50) return 1;
        const scale = 1 + (z - 50) / 70;
        return scale > 2 ? 2 : scale;
    }

    function scaledFontPx(basePx) {
        return Math.round(basePx * zoomFontScale());
    }

    // The map is an Albers conic projection, where the lines of longitude
    // converge, so true north points straight up the screen only on the
    // central meridian. mapNorthOffsetDeg() is the angle of true north from
    // screen-up at a longitude, in degrees clockwise (negative = leaning
    // left), from the same constants project() uses: -n * (lon - lon0).
    // planeCourseOnScreenDeg() is where a plane flying its true heading
    // actually points on the screen, and what the Track-Up map is rotated by.
    function mapNorthOffsetDeg(lon) {
        const d2r = Math.PI / 180;
        const n = 0.5 * (Math.sin(PROJ.lat1 * d2r) + Math.sin(PROJ.lat2 * d2r));
        return -n * (lon - PROJ.lon0);
    }

    function planeCourseOnScreenDeg() {
        return STATE.plane.hdg + mapNorthOffsetDeg(STATE.plane.lon);
    }

    function project(lat, lon) {
        const d2r = Math.PI / 180;
        const r0 = 6371; // Earth Radius in km (Relative scaling)
        
        const phi = lat * d2r;
        const lambda = lon * d2r;
        const phi0 = PROJ.lat0 * d2r;
        const lambda0 = PROJ.lon0 * d2r;
        const phi1 = PROJ.lat1 * d2r;
        const phi2 = PROJ.lat2 * d2r;

        const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
        const c = Math.cos(phi1) * Math.cos(phi1) + 2 * n * Math.sin(phi1);
        const rho0 = (Math.sqrt(c - 2 * n * Math.sin(phi0))) / n;
        
        const theta = n * (lambda - lambda0);
        const rho = (Math.sqrt(c - 2 * n * Math.sin(phi))) / n;

        // Map space coordinates (normalized centered around 0,0)
        const x = rho * Math.sin(theta);
        const y = rho0 - rho * Math.cos(theta);

        return {
            x: x * PROJ.scale,
            y: -y * PROJ.scale // Invert Y axis for screen space
        };
    }

