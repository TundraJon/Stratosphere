    // --- LOADING SCREEN (own scope, all names prefixed "load" so nothing
    // here can collide with the map's own canvas/ctx/draw/etc.) ---
    const loadCanvas = document.getElementById('load-canvas-el');
    const loadCtx = loadCanvas.getContext('2d');
    const loadStatusText = document.getElementById('load-status-desc');
    const loadProgressBar = document.getElementById('load-progress-bar');
    const loadOverlay = document.getElementById('loader-overlay');

    const loadWidth = loadCanvas.width;
    const loadHeight = loadCanvas.height;
    const loadCenterX = loadWidth / 2;
    const loadCenterY = loadHeight / 2;

    let loadStartTime = null;
    const loadMinDuration = 2000; // 2s floor - never fades before this even if the map is ready sooner

    // window.loadMapReady is set to true by the map's own init code (in the
    // second script block) right after its first real draw() completes.
    window.loadMapReady = false;

    // Flight-related loading phrases - one shown at a time, minimum 1s each,
    // picked randomly (never immediately repeating the same one), cycling
    // until the fade-out condition (map ready AND 2s floor) is met.
    const loadPhrases = [
        "CONNECTING TO ADS-B NETWORK...",
        "CALIBRATING ALTIMETER...",
        "SYNCHRONIZING RADAR VECTORS...",
        "ACQUIRING GPS SATELLITES...",
        "INITIALIZING TRANSPONDER...",
        "CROSS-CHECKING FLIGHT PLAN...",
        "SPINNING UP GYROSCOPE...",
        "ESTABLISHING DATALINK...",
        "SCANNING AIRSPACE...",
        "TUNING VOR FREQUENCY...",
        "RUNNING PREFLIGHT DIAGNOSTICS..."
    ];
    let loadCurrentPhraseIdx = -1;
    let loadLastPhraseChangeTime = 0;
    const loadPhraseHoldMs = 1000;

    function loadPickNextPhrase() {
        let next = loadCurrentPhraseIdx;
        while (next === loadCurrentPhraseIdx) {
            next = Math.floor(Math.random() * loadPhrases.length);
        }
        loadCurrentPhraseIdx = next;
        loadStatusText.innerText = loadPhrases[loadCurrentPhraseIdx];
    }
    loadPickNextPhrase(); // show a first phrase immediately, don't wait 1s for the first swap

    function loadDraw(timestamp) {
        if (!loadStartTime) loadStartTime = timestamp;
        const elapsed = timestamp - loadStartTime;

        // Progress bar is a visual approximation of the 2s floor (not tied to
        // any real "% loaded", since everything here loads synchronously -
        // there's nothing slow to actually measure).
        const barProgress = Math.min(elapsed / loadMinDuration, 1.0);
        loadProgressBar.style.width = `${barProgress * 100}%`;

        if (elapsed - loadLastPhraseChangeTime >= loadPhraseHoldMs) {
            loadPickNextPhrase();
            loadLastPhraseChangeTime = elapsed;
        }

        loadCtx.clearRect(0, 0, loadWidth, loadHeight);

        // --- 1. OUTER RADAR / GYRO RINGS ---
        loadCtx.save();
        loadCtx.translate(loadCenterX, loadCenterY);

        // Outer static ring
        loadCtx.beginPath();
        loadCtx.arc(0, 0, 130, 0, Math.PI * 2);
        loadCtx.strokeStyle = "rgba(56, 189, 248, 0.15)";
        loadCtx.lineWidth = 1;
        loadCtx.setLineDash([4, 6]);
        loadCtx.stroke();
        loadCtx.setLineDash([]);

        // Rotating Outer Compass Ring
        loadCtx.save();
        loadCtx.rotate((elapsed * 0.0004) % (Math.PI * 2));
        loadCtx.beginPath();
        loadCtx.arc(0, 0, 118, 0, Math.PI * 2);
        loadCtx.strokeStyle = "rgba(56, 189, 248, 0.3)";
        loadCtx.lineWidth = 1.5;
        loadCtx.stroke();

        // Compass Cardinal Marks
        for (let i = 0; i < 12; i++) {
            loadCtx.rotate(Math.PI / 6);
            loadCtx.beginPath();
            loadCtx.moveTo(0, -118);
            loadCtx.lineTo(0, -112);
            loadCtx.strokeStyle = "rgba(56, 189, 248, 0.5)";
            loadCtx.lineWidth = i % 3 === 0 ? 2 : 1;
            loadCtx.stroke();
        }
        loadCtx.restore();

        // --- 2. SWEEPING RADAR LINE (real conic gradient - bright at the
        // leading edge, fading to fully transparent at the trailing edge,
        // like a real radar/sonar comet-tail sweep) ---
        loadCtx.save();
        const sweepAngle = (elapsed * 0.003) % (Math.PI * 2);
        loadCtx.rotate(sweepAngle);

        if (loadCtx.createConicGradient) {
            // startAngle 0 = the leading edge (drawn at angle 0 in this
            // rotated frame); sweep runs backward (clockwise negative) over
            // ~90deg (Math.PI/2) before fading out completely.
            const sweepGradient = loadCtx.createConicGradient(-Math.PI / 2, 0, 0);
            sweepGradient.addColorStop(0, "rgba(56, 189, 248, 0.35)");
            sweepGradient.addColorStop(0.25, "rgba(56, 189, 248, 0.12)");
            sweepGradient.addColorStop(1, "rgba(56, 189, 248, 0)");
            loadCtx.beginPath();
            loadCtx.moveTo(0, 0);
            loadCtx.arc(0, 0, 110, -Math.PI / 2, 0);
            loadCtx.closePath();
            loadCtx.fillStyle = sweepGradient;
            loadCtx.fill();
        } else {
            // Fallback for browsers without createConicGradient support
            loadCtx.beginPath();
            loadCtx.moveTo(0, 0);
            loadCtx.arc(0, 0, 110, -Math.PI / 4, 0);
            loadCtx.closePath();
            loadCtx.fillStyle = "rgba(56, 189, 248, 0.08)";
            loadCtx.fill();
        }

        // Leading radar edge line
        loadCtx.beginPath();
        loadCtx.moveTo(0, 0);
        loadCtx.lineTo(110, 0);
        loadCtx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        loadCtx.lineWidth = 1.5;
        loadCtx.stroke();
        loadCtx.restore();

        // --- 3. HORIZON / ARTIFICIAL HORIZON TICKS ---
        const loadCycleProgress = (elapsed % loadMinDuration) / loadMinDuration;
        const horizonOffset = Math.sin(loadCycleProgress * Math.PI * 2) * 8;
        loadCtx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        loadCtx.lineWidth = 1;

        // Left horizon bracket
        loadCtx.beginPath();
        loadCtx.moveTo(-90, horizonOffset);
        loadCtx.lineTo(-50, horizonOffset);
        loadCtx.lineTo(-50, horizonOffset + 10);
        loadCtx.stroke();

        // Right horizon bracket
        loadCtx.beginPath();
        loadCtx.moveTo(90, horizonOffset);
        loadCtx.lineTo(50, horizonOffset);
        loadCtx.lineTo(50, horizonOffset + 10);
        loadCtx.stroke();

        // --- 4. VECTOR WING LOGO (Stratosphere Main Mark) ---
        loadCtx.save();
        const loadTilt = Math.sin(loadCycleProgress * Math.PI * 1.5) * 0.08;
        loadCtx.rotate(loadTilt);

        // Wing Glow
        loadCtx.shadowColor = "#38bdf8";
        loadCtx.shadowBlur = 15;

        // Right Wing
        loadCtx.beginPath();
        loadCtx.moveTo(0, -22);
        loadCtx.lineTo(42, 8);
        loadCtx.lineTo(18, 4);
        loadCtx.lineTo(0, -4);
        loadCtx.fillStyle = "#38bdf8";
        loadCtx.fill();

        // Left Wing (Slightly darker for depth)
        loadCtx.beginPath();
        loadCtx.moveTo(0, -22);
        loadCtx.lineTo(-42, 8);
        loadCtx.lineTo(-18, 4);
        loadCtx.lineTo(0, -4);
        loadCtx.fillStyle = "#0284c7";
        loadCtx.fill();

        // Center Core Jet Trail
        loadCtx.shadowBlur = 8;
        loadCtx.beginPath();
        loadCtx.moveTo(0, -4);
        loadCtx.lineTo(-8, 18);
        loadCtx.lineTo(0, 14);
        loadCtx.lineTo(8, 18);
        loadCtx.closePath();
        loadCtx.fillStyle = "#f0f4f8";
        loadCtx.fill();

        loadCtx.restore(); // Restore Logo
        loadCtx.restore(); // Restore Canvas center translation

        // Option B: fade out once the map has drawn its first real frame,
        // the 2s minimum floor has passed, AND the early GPS-based day/night
        // decision has settled (resolves within at most 3s by construction --
        // see the GPS kickoff script above) - whichever combination finishes
        // last. Not a fixed duration, since there's no real "% loaded" to
        // track here.
        if (window.loadMapReady && elapsed >= loadMinDuration && window.earlyGpsSettled) {
            loadProgressBar.style.width = "100%";
            loadOverlay.classList.add('fade-out');
        } else {
            requestAnimationFrame(loadDraw);
        }
    }

    requestAnimationFrame(loadDraw);
