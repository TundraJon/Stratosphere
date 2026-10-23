    // --- EARLY GPS KICKOFF (fires before anything else on the page, so the
    // loading screen's own duration counts toward this instead of adding
    // extra wait time on top of it). Used only to decide the initial
    // day/night mode -- see applyEarlyDayNightDecision() in the main app
    // script further down, which actually consumes this. Completely
    // separate from the app's regular ongoing GPS polling, which starts
    // later and drives the actual plane position. ---
    window.earlyGpsCoords = null;   // {lat, lon} once/if a fix arrives in time
    window.earlyGpsSettled = false; // true once we have an answer OR gave up
    window.earlyDecisionApplied = false; // guards against double-applying the decision
    (function () {
        function settle() {
            window.earlyGpsSettled = true;
            if (typeof window.applyEarlyDayNightDecision === 'function') {
                window.applyEarlyDayNightDecision();
            }
            // If applyEarlyDayNightDecision isn't defined yet (extremely
            // unlikely -- GPS always takes real device time, far longer than
            // parsing the rest of this page), the main script's own init
            // sequence will call it directly once it's ready anyway.
        }
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    window.earlyGpsCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    settle();
                },
                () => settle(), // denied/unavailable/timed out -> settle with no coords, falls back to clock
                { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
            );
        }
        // Hard cap regardless of the geolocation API's own timeout behavior.
        setTimeout(() => { if (!window.earlyGpsSettled) settle(); }, 3000);
    })();
