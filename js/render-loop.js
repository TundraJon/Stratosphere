    // --- MAIN DRAWING LOOP ---
    // Draws content at a FIXED screen-pixel size at a given map point, regardless
    // of current zoom. Without this, font sizes computed as (px / zoom) become
    // sub-pixel at high zoom and cause garbled/uneven text spacing — this locally
    // cancels the ambient ctx.scale(zoom) (and the Track-Up rotation) so callback
    // draws in plain 1:1 pixel space, then restores the outer transform.
    function drawFixedLabel(p, callback) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const invZoom = 1 / STATE.view.zoom;
        ctx.scale(invZoom, invZoom);
        if (STATE.view.trackUp) {
            ctx.rotate(planeCourseOnScreenDeg() * Math.PI / 180); // counters the map's rotation
        }
        callback();
        ctx.restore();
    }

    // --- DAY / NIGHT COLOR SYSTEM ---
    const BORDER_COLOR_PRESETS = {
        white: '#ffffff',
        lightgray: '#c0c0c0',
        black: '#000000',
        gold: '#ffd700',
        snowwhite: '#fff5e6'
    };

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function getLandFillColor() {
        return STATE.dayMode ? '#3f7a35' : '#121b2d';
    }
    function getWaterColor() {
        return STATE.dayMode ? '#1a4d80' : '#0a2540';
    }
    function getBorderColor() {
        const key = STATE.dayMode ? STATE.borderPreset.day : STATE.borderPreset.night;
        const hex = BORDER_COLOR_PRESETS[key] || BORDER_COLOR_PRESETS.gold;
        // Day mode needs more opacity to read against the brighter green fill;
        // night mode keeps its original subtle 0.12 look.
        const alpha = STATE.dayMode ? 0.55 : 0.12;
        return hexToRgba(hex, alpha);
    }
    function getRiverColor() {
        return STATE.dayMode ? hexToRgba('#1a4d80', 0.85) : "rgba(35, 78, 142, 0.5)";
    }

