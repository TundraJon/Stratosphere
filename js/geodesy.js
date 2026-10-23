    // --- GEODETIC NAVIGATION MATH (Great Circle Calculations) ---
    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 3440.065; // Radius of Earth in Nautical Miles
        const d2r = Math.PI / 180;
        const dLat = (lat2 - lat1) * d2r;
        const dLon = (lon2 - lon1) * d2r;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1*d2r) * Math.cos(lat2*d2r) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function getBearing(lat1, lon1, lat2, lon2) {
        const d2r = Math.PI / 180;
        const r2d = 180 / Math.PI;
        const dLon = (lon2 - lon1) * d2r;
        const lat1Rad = lat1 * d2r;
        const lat2Rad = lat2 * d2r;

        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        const brng = Math.atan2(y, x) * r2d;
        return (brng + 360) % 360;
    }

