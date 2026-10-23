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

    // Dedicated font-size curve for the destination Runway Glyph ONLY. Do not
    // reuse this for landmarks/airports/other labels -- they should keep using
    // scaledFontPx() above. At zoom>=50 this behaves identically to the shared
    // curve (unchanged). Below zoom 50, instead of staying flat at the full
    // 20px size (which looks oversized zoomed all the way out to see the whole
    // US), it shrinks linearly down to a ~10-11px floor as zoom approaches 0.
    function runwayGlyphFontPx() {
        const BASE_PX = 20;   // matches the size at zoom=50 (unchanged from before)
        const FLOOR_PX = 10.5; // floor at zoom=0, per user confirmation (10-11px)
        const z = STATE.view.zoom;
        if (z >= 50) return scaledFontPx(BASE_PX);
        return FLOOR_PX + (BASE_PX - FLOOR_PX) * (z / 50);
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

