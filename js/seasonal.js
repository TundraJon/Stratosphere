    // ============================================================
    // SEASONAL FRACTAL FILL
    // ============================================================
    // Replaces the earlier baked-blob system. Architecture (validated in a
    // standalone test tool against all 50 states before being built here):
    //   - Each state gets a noise "blend grid" (a GRID x GRID array of 0-255
    //     values, NOT colors) computed ONCE, from a seeded fBm noise field
    //     sampled in fixed map-space -- so panning/zooming never touches it.
    //   - Two grids are baked per state -- one at FRACTAL_TUNING's Min-Zoom
    //     settings, one at Max-Zoom settings -- and blended between the two
    //     cached BITMAPS as zoom changes, so the "more detail zoomed in"
    //     effect still holds without ever recomputing noise on zoom/pan.
    //   - Colors are applied in a separate, cheap recolor step (~0.3ms per
    //     state, measured) that never touches the noise itself -- this is
    //     what makes per-state season changes fast, since each state can be
    //     in a DIFFERENT active category on the same real date.
    //   - Generation happens once, during the loading screen (see
    //     generateFractalCache() and its call site near the loading gate).
    const FRACTAL_GRID = 180;
    const FRACTAL_TUNING = { opacity: 0.6, density: 0.5, seed: 16, scaleMin: 12, scaleMax: 50, octMin: 3, octMax: 3 };

    function fractalHash2(ix, iy, seed) {
        let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h = h ^ (h >>> 16);
        return ((h >>> 0) % 1000000) / 1000000;
    }
    function fractalSmooth(t) { return t * t * (3 - 2 * t); }
    function fractalValueNoise2D(x, y, seed) {
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const sx = fractalSmooth(x - x0), sy = fractalSmooth(y - y0);
        const n00 = fractalHash2(x0, y0, seed), n10 = fractalHash2(x0 + 1, y0, seed);
        const n01 = fractalHash2(x0, y0 + 1, seed), n11 = fractalHash2(x0 + 1, y0 + 1, seed);
        const nx0 = n00 + (n10 - n00) * sx;
        const nx1 = n01 + (n11 - n01) * sx;
        return nx0 + (nx1 - nx0) * sy;
    }
    function fractalFbm2D(x, y, octaves, seed) {
        let total = 0, amp = 1, freq = 1, maxAmp = 0;
        for (let o = 0; o < octaves; o++) {
            total += fractalValueNoise2D(x * freq, y * freq, seed + o * 101) * amp;
            maxAmp += amp; amp *= 0.5; freq *= 2;
        }
        return maxAmp > 0 ? total / maxAmp : 0;
    }
    function computeFractalBlendGrid(bounds, noiseScale, octaves, seed, density) {
        const grid = new Uint8ClampedArray(FRACTAL_GRID * FRACTAL_GRID);
        const width = Math.max(bounds.maxX - bounds.minX, 0.001);
        const height = bounds.maxY - bounds.minY;
        const freq = noiseScale / width;
        for (let gy = 0; gy < FRACTAL_GRID; gy++) {
            const mapY = bounds.minY + (gy / FRACTAL_GRID) * height;
            for (let gx = 0; gx < FRACTAL_GRID; gx++) {
                const mapX = bounds.minX + (gx / FRACTAL_GRID) * width;
                const n = fractalFbm2D(mapX * freq, mapY * freq, octaves, seed);
                const blend = fractalSmooth(Math.max(0, Math.min(1, (n - density) / 0.3 + 0.5)));
                grid[gy * FRACTAL_GRID + gx] = Math.round(blend * 255);
            }
        }
        return grid;
    }
    // Recolors a cached blend grid into an offscreen canvas using the given
    // color array. Supports 2-color (light/dark blend, most seasons) and
    // multi-stop gradients (e.g. Spring's 4-color meadow mix) with the same
    // function -- no noise computation, just a per-pixel color lookup.
    function recolorFractalGrid(blendGrid, colors) {
        const off = document.createElement('canvas');
        off.width = FRACTAL_GRID; off.height = FRACTAL_GRID;
        const offCtx = off.getContext('2d');
        const imgData = offCtx.createImageData(FRACTAL_GRID, FRACTAL_GRID);
        if (colors.length === 2) {
            const light = hexToRgbParts(colors[0]), dark = hexToRgbParts(colors[1]);
            for (let i = 0; i < blendGrid.length; i++) {
                const t = blendGrid[i] / 255;
                const idx = i * 4;
                imgData.data[idx]     = dark.r + (light.r - dark.r) * t;
                imgData.data[idx + 1] = dark.g + (light.g - dark.g) * t;
                imgData.data[idx + 2] = dark.b + (light.b - dark.b) * t;
                imgData.data[idx + 3] = 255;
            }
        } else {
            const stops = colors.map(hexToRgbParts);
            const n = stops.length;
            for (let i = 0; i < blendGrid.length; i++) {
                const t = blendGrid[i] / 255;
                const scaled = t * (n - 1);
                const i0 = Math.floor(scaled);
                const i1 = Math.min(i0 + 1, n - 1);
                const frac = scaled - i0;
                const c0 = stops[i0], c1 = stops[i1];
                const idx = i * 4;
                imgData.data[idx]     = c0.r + (c1.r - c0.r) * frac;
                imgData.data[idx + 1] = c0.g + (c1.g - c0.g) * frac;
                imgData.data[idx + 2] = c0.b + (c1.b - c0.b) * frac;
                imgData.data[idx + 3] = 255;
            }
        }
        offCtx.putImageData(imgData, 0, 0);
        return off;
    }

    // Populated once at load (see the loading-screen call site below).
    // Keyed by state name: { blendMin, blendMax, coloredMin, coloredMax,
    // coloredCategory } -- coloredCategory tracks which category the
    // colored bitmaps currently reflect, so per-state recoloring only
    // happens when that state's OWN active category actually changes
    // (each state can be in a different category on the same real date).
    const fractalCache = {};

    // Cutscene ground isn't real geography, so its blend grids are sampled
    // directly in normalized [0,1]x[0,1] tile-space instead of a lat/lon
    // bbox. No zoom-blend needed either (fixed camera, no zoom concept) --
    // one grid per type, generated with the "detailed" (Max-Zoom) tuning
    // since the cutscene camera is effectively very close to the ground.
    // Distinct seeds so takeoff/landing patterns differ (independent
    // layouts, matching the earlier baked-blob spec's intent).
    const CUTSCENE_FRACTAL_SEED_TAKEOFF = 501;
    const CUTSCENE_FRACTAL_SEED_LANDING = 502;
    let cutsceneFractalBlend = { takeoff: null, landing: null };
    function computeFractalBlendGridNormalized(noiseScale, octaves, seed, density) {
        const grid = new Uint8ClampedArray(FRACTAL_GRID * FRACTAL_GRID);
        for (let gy = 0; gy < FRACTAL_GRID; gy++) {
            const ny = gy / FRACTAL_GRID;
            for (let gx = 0; gx < FRACTAL_GRID; gx++) {
                const nx = gx / FRACTAL_GRID;
                const n = fractalFbm2D(nx * noiseScale, ny * noiseScale, octaves, seed);
                const blend = fractalSmooth(Math.max(0, Math.min(1, (n - density) / 0.3 + 0.5)));
                grid[gy * FRACTAL_GRID + gx] = Math.round(blend * 255);
            }
        }
        return grid;
    }

    function generateFractalCache() {
        const skipDuplicate = (FRACTAL_TUNING.scaleMin === FRACTAL_TUNING.scaleMax && FRACTAL_TUNING.octMin === FRACTAL_TUNING.octMax);
        Object.keys(STATE_DATA).forEach(name => {
            const bounds = STATE_BOUNDS_BY_NAME[name];
            if (!bounds) return;
            const blendMin = computeFractalBlendGrid(bounds, FRACTAL_TUNING.scaleMin, FRACTAL_TUNING.octMin, FRACTAL_TUNING.seed, FRACTAL_TUNING.density);
            const blendMax = skipDuplicate ? blendMin : computeFractalBlendGrid(bounds, FRACTAL_TUNING.scaleMax, FRACTAL_TUNING.octMax, FRACTAL_TUNING.seed, FRACTAL_TUNING.density);
            fractalCache[name] = { blendMin, blendMax, coloredMin: null, coloredMax: null, coloredCategory: undefined };
        });
        cutsceneFractalBlend.takeoff = computeFractalBlendGridNormalized(FRACTAL_TUNING.scaleMax, FRACTAL_TUNING.octMax, CUTSCENE_FRACTAL_SEED_TAKEOFF, FRACTAL_TUNING.density);
        cutsceneFractalBlend.landing = computeFractalBlendGridNormalized(FRACTAL_TUNING.scaleMax, FRACTAL_TUNING.octMax, CUTSCENE_FRACTAL_SEED_LANDING, FRACTAL_TUNING.density);
    }


    // Ensures a state's colored bitmaps reflect its CURRENT active category
    // (looked up fresh via getActiveSeasonColors, same as before) --
    // recolors only if that category actually changed since last check, so
    // this is cheap to call every frame per visible state.
    function ensureFractalRecolored(stateName, category, colors) {
        const cache = fractalCache[stateName];
        if (!cache) return null;
        if (cache.coloredCategory !== category) {
            cache.coloredMin = recolorFractalGrid(cache.blendMin, colors);
            cache.coloredMax = recolorFractalGrid(cache.blendMax, colors);
            cache.coloredCategory = category;
        }
        return cache;
    }

    // Draws a state's cached fractal bitmaps (never recomputes noise here),
    // blended between the Min-Zoom and Max-Zoom cached versions by current
    // zoom. Clipped to the real polygon shape, solid base fill underneath
    // guarantees full coverage same as the old blob system did.
    function drawSeasonalScatter(state, colors, category) {
        const bounds = STATE_BOUNDS_BY_NAME[state.name];
        if (!bounds) return;
        const cache = ensureFractalRecolored(state.name, category, colors);

        ctx.save();
        ctx.beginPath();
        state.rings.forEach(ring => {
            ring.forEach((pt, i) => {
                const p = project(pt.lat, pt.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
        });
        ctx.clip();

        ctx.fillStyle = colors[0];
        ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

        if (cache) {
            const mix = Math.max(0, Math.min(1, (STATE.view.zoom - 1.7) / (120 - 1.7)));
            const w = bounds.maxX - bounds.minX, h = bounds.maxY - bounds.minY;
            ctx.imageSmoothingEnabled = true;
            ctx.globalAlpha = FRACTAL_TUNING.opacity * (1 - mix);
            ctx.drawImage(cache.coloredMin, bounds.minX, bounds.minY, w, h);
            ctx.globalAlpha = FRACTAL_TUNING.opacity * mix;
            ctx.drawImage(cache.coloredMax, bounds.minX, bounds.minY, w, h);
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // Border stroke, same as every other state -- unaffected by the fractal fill above.
        ctx.beginPath();
        state.rings.forEach(ring => {
            ring.forEach((pt, i) => {
                const p = project(pt.lat, pt.lon);
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
        });
        ctx.stroke();
    }


    // ============================================================
    // SEASONAL STATE COLORING
    // ============================================================
    // Per-state date windows for four categories (Fall, Dead time, Snow,
    // Spring). All dates are [month, day] pairs, 1-indexed months. A window
    // whose start is LATER in the year than its end wraps across Dec31/Jan1
    // (e.g. a snow season running Nov 1 -> Apr 30).
    //
    // Notes on specific corrections made during spec review (kept here so
    // the reasoning isn't lost):
    //   - California's snow window was removed entirely (real snow there is
    //     only at high mountain elevations, not representative of the state).
    //   - California/Florida/Hawaii/Texas originally had a single-day "Dec 1"
    //     dead-time window (their fall peaks already ran through Nov 30);
    //     all four were given real multi-day dead-time windows instead.
    //   - New Mexico, North Carolina, Oregon, and Washington had snow
    //     windows that would have resumed AFTER their spring window ended
    //     (since their mountain-driven snow seasons are unusually long) --
    //     each was trimmed to end the day before that state's spring starts,
    //     so the sequence is always snow -> spring, never spring -> snow.
    //   - All snow windows use the Valley/Coastal/Plains dates for any state
    //     that had a separate Mountain-only alternative, per instruction
    //     (that's where people actually live).
    // STATE_DATA -- consolidated per-state metadata: size tier (used for
    // seasonal blob density), season date windows, and baked seasonal
    // blob positions (generated once, real polygon-validated -- see
    // generate_blobs.js in project notes for regeneration method).
    // STATE_POLYGONS (geometry) and SEASON_COLORS (shared palette) remain
    // separate on purpose -- different data kind / not per-state.
    const STATE_DATA = {
        "Alabama": {
            tier: "small",
            seasons: { fall: [[10,21],[11,10]], dead: [[11,11],[2,10]], snow: null, spring: [[2,11],[2,28]] }
        },
        "Alaska": {
            tier: "huge",
            seasons: { fall: [[9,21],[10,10]], dead: [[10,11],[12,1]], snow: [[10,21],[5,20]], spring: [[5,21],[6,30]] }
        },
        "Arizona": {
            tier: "large",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: null, spring: [[2,11],[4,30]] }
        },
        "Arkansas": {
            tier: "small",
            seasons: { fall: [[10,21],[11,10]], dead: [[11,11],[2,28]], snow: null, spring: [[3,1],[3,10]] }
        },
        "California": {
            tier: "large",
            seasons: { fall: [[10,11],[11,30]], dead: [[12,1],[2,10]], snow: null, spring: [[2,11],[4,30]] }
        },
        "Colorado": {
            tier: "large",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[11,1],[4,20]], spring: [[4,1],[5,31]] }
        },
        "Connecticut": {
            tier: "tiny",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[4,10]], spring: [[4,11],[4,20]] }
        },
        "Delaware": {
            tier: "tiny",
            seasons: { fall: [[10,21],[10,31]], dead: [[11,1],[12,10]], snow: [[12,11],[3,20]], spring: [[3,21],[3,31]] }
        },
        "District of Columbia": {
            tier: "tiny",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[3,20]], spring: [[3,11],[3,20]] } // inherits Virginia's windows exactly, per instruction
        },
        "Florida": {
            tier: "medium",
            seasons: { fall: [[11,1],[11,30]], dead: [[12,1],[1,20]], snow: null, spring: [[1,21],[2,10]] }
        },
        "Georgia": {
            tier: "medium",
            seasons: { fall: [[10,1],[11,10]], dead: [[11,11],[2,10]], snow: null, spring: [[2,11],[2,28]] }
        },
        "Hawaii": {
            tier: "tiny",
            seasons: { fall: null, dead: null, snow: null, spring: [[3,1],[5,11]] }
        },
        "Idaho": {
            tier: "large",
            seasons: { fall: [[9,21],[10,10]], dead: [[10,11],[4,20]], snow: [[10,21],[3,31]], spring: [[4,21],[5,31]] }
        },
        "Illinois": {
            tier: "medium",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,1],[3,31]], spring: [[3,21],[4,20]] }
        },
        "Indiana": {
            tier: "small",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,11],[3,20]], spring: [[3,21],[4,20]] }
        },
        "Iowa": {
            tier: "medium",
            seasons: { fall: [[10,11],[10,20]], dead: [[10,21],[12,1]], snow: [[11,1],[3,31]], spring: [[4,1],[4,20]] }
        },
        "Kansas": {
            tier: "medium",
            seasons: { fall: [[10,21],[11,10]], dead: [[11,11],[12,1]], snow: [[12,1],[3,20]], spring: [[3,21],[3,31]] }
        },
        "Kentucky": {
            tier: "small",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[12,1],[3,20]], spring: [[3,11],[3,20]] }
        },
        "Louisiana": {
            tier: "small",
            seasons: { fall: [[11,11],[11,20]], dead: [[11,21],[2,10]], snow: null, spring: [[2,11],[2,20]] }
        },
        "Maine": {
            tier: "tiny",
            seasons: { fall: [[9,21],[10,10]], dead: [[10,11],[12,1]], snow: [[10,21],[4,30]], spring: [[5,1],[5,31]] }
        },
        "Maryland": {
            tier: "tiny",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[3,20]], spring: [[3,11],[3,31]] }
        },
        "Massachusetts": {
            tier: "tiny",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,11],[4,10]], spring: [[4,11],[4,30]] }
        },
        "Michigan": {
            tier: "large",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[10,21],[4,30]], spring: [[4,21],[5,20]] }
        },
        "Minnesota": {
            tier: "large",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[10,21],[4,30]], spring: [[4,21],[5,20]] }
        },
        "Mississippi": {
            tier: "small",
            seasons: { fall: [[10,21],[11,20]], dead: [[11,21],[2,10]], snow: null, spring: [[2,11],[2,28]] }
        },
        "Missouri": {
            tier: "medium",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[3,20]], spring: [[3,11],[3,31]] }
        },
        "Montana": {
            tier: "large",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[10,31],[4,20]], spring: [[4,21],[5,31]] }
        },
        "Nebraska": {
            tier: "medium",
            seasons: { fall: [[10,21],[10,31]], dead: [[11,1],[12,1]], snow: [[11,1],[3,31]], spring: [[4,1],[4,20]] }
        },
        "Nevada": {
            tier: "large",
            seasons: { fall: [[10,11],[10,20]], dead: [[10,21],[11,30]], snow: [[12,1],[3,20]], spring: [[3,21],[5,10]] }
        },
        "New Hampshire": {
            tier: "tiny",
            seasons: { fall: [[9,1],[10,20]], dead: [[10,21],[12,1]], snow: [[10,21],[4,30]], spring: [[5,1],[5,10]] }
        },
        "New Jersey": {
            tier: "tiny",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[12,1],[3,31]], spring: [[4,1],[4,10]] }
        },
        "New Mexico": {
            tier: "large",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[12,11],[2,28]], spring: [[3,1],[4,30]] }
        },
        "New York": {
            tier: "small",
            seasons: { fall: [[9,21],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[4,30]], spring: [[4,11],[5,10]] }
        },
        "North Carolina": {
            tier: "small",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[2,28]], spring: [[3,1],[3,20]] }
        },
        "North Dakota": {
            tier: "medium",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[10,31],[4,30]], spring: [[4,21],[5,10]] }
        },
        "Ohio": {
            tier: "small",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,11],[3,31]], spring: [[3,21],[4,20]] }
        },
        "Oklahoma": {
            tier: "medium",
            seasons: { fall: [[10,11],[11,10]], dead: [[11,11],[2,28]], snow: null, spring: [[3,1],[3,20]] }
        },
        "Oregon": {
            tier: "large",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[12,21],[3,31]], spring: [[4,1],[5,31]] }
        },
        "Pennsylvania": {
            tier: "small",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,1],[3,31]], spring: [[4,1],[4,20]] }
        },
        "Rhode Island": {
            tier: "tiny",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[12,1],[4,10]], spring: [[4,11],[4,20]] }
        },
        "South Carolina": {
            tier: "tiny",
            seasons: { fall: [[10,21],[11,10]], dead: [[11,11],[2,28]], snow: null, spring: [[3,1],[3,10]] }
        },
        "South Dakota": {
            tier: "medium",
            seasons: { fall: [[10,11],[10,31]], dead: [[11,1],[12,1]], snow: [[11,1],[4,30]], spring: [[4,21],[4,30]] }
        },
        "Tennessee": {
            tier: "small",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,10]], snow: [[12,11],[3,20]], spring: [[3,1],[3,20]] }
        },
        "Texas": {
            tier: "large",
            seasons: { fall: [[11,1],[11,30]], dead: [[12,1],[2,10]], snow: null, spring: [[2,11],[3,10]] }
        },
        "Utah": {
            tier: "large",
            seasons: { fall: [[9,21],[10,10]], dead: [[10,11],[12,1]], snow: [[11,21],[3,31]], spring: [[4,1],[5,31]] }
        },
        "Vermont": {
            tier: "tiny",
            seasons: { fall: [[9,21],[10,10]], dead: [[10,11],[12,1]], snow: [[10,21],[4,30]], spring: [[5,1],[5,10]] }
        },
        "Virginia": {
            tier: "small",
            seasons: { fall: [[10,1],[10,31]], dead: [[11,1],[12,1]], snow: [[11,21],[3,20]], spring: [[3,11],[3,20]] }
        },
        "Washington": {
            tier: "medium",
            seasons: { fall: [[10,1],[10,20]], dead: [[10,21],[12,1]], snow: [[12,1],[3,31]], spring: [[4,1],[6,30]] }
        },
        "West Virginia": {
            tier: "tiny",
            seasons: { fall: [[10,1],[10,20]], dead: [[10,21],[12,1]], snow: [[11,1],[4,10]], spring: [[3,21],[4,20]] }
        },
        "Wisconsin": {
            tier: "medium",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[12,1],[4,20]], spring: [[4,21],[5,20]] }
        },
        "Wyoming": {
            tier: "large",
            seasons: { fall: [[9,21],[10,20]], dead: [[10,21],[12,1]], snow: [[10,11],[4,20]], spring: [[4,21],[6,30]] }
        }
    };

    const SEASON_COLORS = {
        fall: ['#f3b021', '#951804'],   // colors[0] lighter (verified via luminance)
        dead: ['#ac5834', '#874233'],   // colors[0] lighter (verified via luminance -- was reversed, fixed)
        snow: ['#eef6fb', '#a9c9e0'],   // chosen from candidate set -- "crisp/fresh snow", most natural-reading
        spring: ['#4a7c3f', '#4fc3f7', '#ba68c8', '#4a7c3f'], // 4-stop meadow mix: green dominant both ends, blue+purple flower accents (multi-stop gradient, see recolorFractalGrid)
        summer: ['#4a7c3f', '#2d5016']  // fills the existing no-active-category gap, EASTERN_SUMMER_STATES only (see getActiveSeasonColors)
    };

    // States whose bulk lies east of the Mississippi River, computed against
    // the river's real geometry (each state's bounding-box center compared
    // to the river's interpolated longitude at that latitude), with
    // Louisiana and Minnesota manually corrected/decided (river cuts
    // through both diagonally/near-headwaters, making bbox math unreliable
    // or genuinely ambiguous for them specifically). Used to fill the
    // existing no-active-season gap in each state's date windows with
    // summer green fractal fill, since eastern states are typically more
    // green/fertile during that gap than western ones.
    const EASTERN_SUMMER_STATES = new Set([
        'Alabama', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Illinois',
        'Indiana', 'Kentucky', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
        'Mississippi', 'New Hampshire', 'New Jersey', 'New York', 'North Carolina',
        'Ohio', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'Tennessee',
        'Vermont', 'Virginia', 'West Virginia', 'Wisconsin'
    ]);

    // Checks whether `date` falls inside a [month,day]-[month,day] window
    // (inclusive), handling year-wraparound windows. If active, also returns
    // the actual calendar date the window most recently started on (which
    // may be in the previous calendar year for a wrapping window), needed
    // for the "most recently started wins" priority rule.
    function checkSeasonWindow(date, window) {
        if (!window) return null;
        const [[sm, sd], [em, ed]] = window;
        // Strip time-of-day so only the calendar date matters -- comparing a
        // real "now" timestamp (which almost never lands exactly at
        // midnight) against boundaries built at midnight was silently
        // excluding the last day of every window.
        date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const year = date.getFullYear();
        const mk = (y, m, d) => new Date(y, m - 1, d);

        if (sm < em || (sm === em && sd <= ed)) {
            // Non-wrapping window (e.g. Mar 1 - Apr 30)
            const start = mk(year, sm, sd);
            const end = mk(year, em, ed);
            if (date >= start && date <= end) return start;
            return null;
        } else {
            // Wrapping window (e.g. Nov 1 - Apr 30) -- check both possible
            // cycles: one starting last year (covering the Jan-through-end
            // portion of this year) and one starting this year (covering
            // the start-through-Dec31 portion).
            const startThisYear = mk(year, sm, sd);
            const endNextYear = mk(year + 1, em, ed);
            if (date >= startThisYear && date <= endNextYear) return startThisYear;

            const startLastYear = mk(year - 1, sm, sd);
            const endThisYear = mk(year, em, ed);
            if (date >= startLastYear && date <= endThisYear) return startLastYear;

            return null;
        }
    }

    // Returns {colors: [c1,c2]} for whichever category is active for this
    // state today, or null if nothing applies (falls back to the existing
    // base color). Priority: whichever active window started most recently.
    function getActiveSeasonColors(stateName, date) {
        const stateEntry = STATE_DATA[stateName];
        if (!stateEntry) return null;
        const windows = stateEntry.seasons;
        let best = null, bestStart = null;
        ['fall', 'dead', 'snow', 'spring'].forEach(cat => {
            const start = checkSeasonWindow(date, windows[cat]);
            if (start && (!bestStart || start > bestStart)) {
                bestStart = start;
                best = cat;
            }
        });
        if (best) return { category: best, colors: SEASON_COLORS[best] };
        // No fall/dead/snow/spring window active right now -- that's the
        // existing "summer" gap. Eastern states get the summer fractal
        // fill there; western states keep the plain default land color
        // exactly as before (this function returning null is what
        // triggers that fallback at the call site).
        if (EASTERN_SUMMER_STATES.has(stateName)) {
            return { category: 'summer', colors: SEASON_COLORS.summer };
        }
        return null;
    }

    // Point-in-polygon lookup, working directly in lat/lon space (no
    // projection needed). Used to find which state the plane is currently
    // over, for the cutscene's seasonal grass color -- takeoff uses the
    // plane's position when it starts rolling, landing uses its position
    // when the landing trigger fires.
    function pointInRingLatLon(lat, lon, ring) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const yi = ring[i].lat, xi = ring[i].lon;
            const yj = ring[j].lat, xj = ring[j].lon;
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    function getStateAtLatLon(lat, lon) {
        for (const state of STATE_POLYGONS) {
            for (const ring of state.rings) {
                if (pointInRingLatLon(lat, lon, ring)) return state.name;
            }
        }
        return null;
    }

    // Same idea, for Canada — used to size its fill gradient to the actual shape
    // instead of a guessed box (a hardcoded box that didn't overlap the polygon
    // was why the gradient wasn't visible before).
    const CANADA_BOUNDS = (() => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        CANADA_POLYGON.forEach(pt => {
            const p = project(pt.lat, pt.lon);
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        return { minX, maxX, minY, maxY };
    })();

    // Sets zoom/offset so the continental US fills the screen on first load
    function fitMainlandToScreen() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = 30; // px of breathing room around the edges
        const bboxW = MAINLAND_BOUNDS.maxX - MAINLAND_BOUNDS.minX;
        const bboxH = MAINLAND_BOUNDS.maxY - MAINLAND_BOUNDS.minY;

        let zoom = Math.min((w - 2 * margin) / bboxW, (h - 2 * margin) / bboxH);
        if (zoom < 0.2) zoom = 0.2;
        if (zoom > 40) zoom = 40;

        const centerX = (MAINLAND_BOUNDS.minX + MAINLAND_BOUNDS.maxX) / 2;
        const centerY = (MAINLAND_BOUNDS.minY + MAINLAND_BOUNDS.maxY) / 2;

        STATE.view.zoom = zoom;
        STATE.view.offsetX = -centerX * zoom;
        STATE.view.offsetY = -centerY * zoom;
    }

    // Puts the view back to the starting pan/zoom (same fit used on load),
    // for the Reset button under the compass.
    function resetView() {
        fitMainlandToScreen();
        clampViewOffsets();
        draw();
    }

    // Keeps at least part of the combined US landmass (mainland/Alaska/Hawaii)
    // visible on screen at all times — you can never pan or zoom it all away.
    function clampViewOffsets() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const zoom = STATE.view.zoom;
        const margin = 60; // px of the landmass bbox that must stay on-screen

        const minOffsetX = margin - w / 2 - LANDMASS_BOUNDS.maxX * zoom;
        const maxOffsetX = w / 2 - margin - LANDMASS_BOUNDS.minX * zoom;
        const minOffsetY = margin - h / 2 - LANDMASS_BOUNDS.maxY * zoom;
        const maxOffsetY = h / 2 - margin - LANDMASS_BOUNDS.minY * zoom;

        if (STATE.view.offsetX < minOffsetX) STATE.view.offsetX = minOffsetX;
        if (STATE.view.offsetX > maxOffsetX) STATE.view.offsetX = maxOffsetX;
        if (STATE.view.offsetY < minOffsetY) STATE.view.offsetY = minOffsetY;
        if (STATE.view.offsetY > maxOffsetY) STATE.view.offsetY = maxOffsetY;
    }

