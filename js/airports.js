    // Populate Airport Dropdown dynamically on load
    // Strips a leading K or P from an airport identifier for display
    // (e.g. "KMIA (Miami, FL)" -> "MIA (Miami, FL)"). Most US identifiers
    // follow this K/P-nation-prefix + IATA-code pattern, but a few don't:
    // OGG/LIH are stored unprefixed already (nothing to strip). KOA is
    // trickier — its real IATA code itself starts with "K", so blind
    // stripping would wrongly eat part of the actual code. Exempted here
    // instead of relying on a fragile naming trick.
    const AIRPORT_CODES_NO_STRIP = new Set(['KOA']);
    function formatAirportDisplay(fullName) {
        const parts = fullName.split(' ');
        let code = parts[0];
        if (!AIRPORT_CODES_NO_STRIP.has(code)) {
            code = code.replace(/^[KP]/, '');
        }
        return [code, ...parts.slice(1)].join(' ');
    }

    function populateAirports() {
        const select = document.getElementById('sel-airport');
        // Sort alphabetically by city/state code
        const sorted = [...AIRPORTS].sort((a,b) => a.name.localeCompare(b.name));
        sorted.forEach(ap => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ lat: ap.lat, lon: ap.lon, name: ap.name });
            opt.textContent = formatAirportDisplay(ap.name);
            // Default select Miami
            if (ap.name.includes("Orlando")) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    document.addEventListener("DOMContentLoaded", populateAirports);
