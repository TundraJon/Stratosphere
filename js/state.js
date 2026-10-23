    // --- GLOBAL APP STATE ---
    const STATE = {
        plane: {
            lat: 28.5383, // Start at current location: Orlando, FL
            lon: -81.3792,
            hdg: 45,
            speed: 460,
            altitude: null // feet, median-smoothed over last 5 readings; null until a real GPS altitude has ever come in
        },
        target: {
            lat: 28.4281, // Default target: Orlando, FL
            lon: -81.3160,
            name: "KMCO (Orlando, FL)"
        },
        view: {
            zoom: 1.1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            trackUp: false
        },
        speedUnitMph: false,
        dayMode: false,
        cutscene: {
            takeoffArmed: false, // true once speed has been seen <50 MPH
            landingArmed: false, // true once speed has been seen >=400 MPH
            active: false        // true while a cutscene is currently playing
        },
        borderPreset: { day: 'white', night: 'gold' },
        homeLocation: {
            lat: null,   // null until the user enters a value -- no persistence across sessions, by design
            lon: null,
            show: false  // "Show on map" checkbox state
        },
        airportPopup: {
            open: false,
            airport: null,   // the AIRPORTS entry currently shown
            rawCode: null,   // un-stripped code (e.g. "KMSP"), used to look up AIRPORT_RUNWAYS
            // Binary Overview/Follow camera. cameraState is the CONFIRMED
            // target (0=Overview, 1=Follow); cameraBlend is the actual
            // rendered value, which animates toward cameraState over a
            // fixed 0.5s eased snap whenever cameraState changes. There is
            // no ambient/gradual easing anymore -- every transition uses
            // the same snap, in both directions.
            cameraState: 0,
            cameraBlend: 0,
            snapStartTime: null,   // performance.now() timestamp, or null if no snap in progress
            snapFromBlend: 0,      // blend value captured at the moment a snap begins
            lockedRunway: null,    // whichever runway the plane is currently on (or was just on, kept through a departure snap-out so it has something to reference) -- null once fully settled in Overview
            // Auto-open at 1nm from the destination. Manually dismissing it
            // blocks re-triggering for THAT SAME destination until the
            // plane clears 9nm or 20 minutes pass, whichever first --
            // scoped to a specific airport name so picking a new,
            // different destination isn't blocked by an old dismissal.
            autoTriggerDismissedFor: null, // airport name the dismissal applies to, or null
            autoTriggerDismissedAt: null   // Date.now() timestamp of the dismissal, for the 20-minute timer
        },
        gps: {
            recentHeadings: [],   // rolling buffer for vector-averaged heading
            recentSpeeds: [],     // rolling buffer for averaged speed
            recentAltitudes: [],  // rolling buffer (last 5, {value, time}) for median-smoothed altitude, feet -- filtered by age (60s) before use, see onGPSSuccess
            targetHeading: null,  // smoothed heading GPS mode turns toward
            lastFixError: null,
            lastAltitudeFixTime: null // timestamp of last fix that included valid (non-null) altitude -- i.e. a real 4-satellite 3D lock. Drives the altitude status light, separate from the general GPS fix dot since a fix can succeed without altitude.
        },
        toggles: {
            landmarks: false,
            airports: false,
            terminator: false,
            seasonalColors: false
        },
        seasonalDateOverride: null, // Date object, or null to use the real current date
        landmarks: [
            { name: "Disney World", emoji: "🏰", lat: 28.3852, lon: -81.5639 },
            { name: "Arlington National Cemetery", emoji: "🪦", lat: 38.87917, lon: -77.07222 },
            { name: "Dollywood", emoji: "🦋", lat: 35.80570, lon: -83.52884 },
            { name: "Epic Systems HQ", emoji: "🪐", lat: 43.0125, lon: -89.5015 },
            { name: "The White House", emoji: "🏛️", lat: 38.8977, lon: -77.0365 },
            { name: "Las Vegas Strip", emoji: "🎰", lat: 36.1147, lon: -115.1728 },
            { name: "Space Needle", emoji: "🗼", lat: 47.6205, lon: -122.3493 },
            { name: "Statue of Liberty", emoji: "🗽", lat: 40.6892, lon: -74.0445 },
            { name: "Golden Gate Bridge", emoji: "🌉", lat: 37.8199, lon: -122.4783 },
            { name: "Mount Rushmore", emoji: "🗿", lat: 43.8791, lon: -103.4591 },
            { name: "Gateway Arch", emoji: "🌆", lat: 38.6247, lon: -90.1848 },
            { name: "Hollywood Sign", emoji: "🎬", lat: 34.1341, lon: -118.3215 },
            { name: "Niagara Falls", emoji: "🌊", lat: 43.0962, lon: -79.0377 },
            { name: "Mount Rainier", emoji: "🏔️", lat: 46.8523, lon: -121.7603 },
            { name: "Old Faithful (Yellowstone)", emoji: "♨️", lat: 44.4605, lon: -110.8281 },
            { name: "El Capitan (Yosemite)", emoji: "🌲", lat: 37.7346, lon: -119.6386 },
            { name: "Mall of America", emoji: "🛍️", lat: 44.8548, lon: -93.2422 },
            { name: "Kennedy Space Center", emoji: "🚀", lat: 28.5729, lon: -80.6490 },
            { name: "French Quarter", emoji: "🎷", lat: 29.9584, lon: -90.0644 },
            { name: "Willis Tower", emoji: "🏙️", lat: 41.8789, lon: -87.6359 },
            { name: "Liberty Bell", emoji: "🔔", lat: 39.9496, lon: -75.1503 },
            { name: "Graceland", emoji: "🎸", lat: 35.0464, lon: -90.0261 },
            { name: "Zion National Park", emoji: "⛰️", lat: 37.2982, lon: -113.0263 },
            { name: "Wright Brothers Memorial", emoji: "✈️", lat: 36.0142, lon: -75.6685 },
            { name: "Pearl Harbor Memorial", emoji: "⚓", lat: 21.3649, lon: -157.9500 },
            { name: "Fenway Park", emoji: "⚾", lat: 42.3467, lon: -71.0972 },
            { name: "Multnomah Falls", emoji: "💦", lat: 45.5762, lon: -122.1158 },
            { name: "Carlsbad Caverns", emoji: "🕳️", lat: 32.1479, lon: -104.5567 },
            { name: "Superman Statue", emoji: "🦸", lat: 37.1517, lon: -88.7334 },
            { name: "Mount Shasta", emoji: "🗻", lat: 41.4092, lon: -122.1949 },
            { name: "Kilauea Volcano", emoji: "🌋", lat: 19.4069, lon: -155.2834 },
            { name: "Denali", emoji: "🏔️", lat: 63.0692, lon: -151.0070 },
            { name: "Georgia Aquarium", emoji: "🐠", lat: 33.7634, lon: -84.3951 },
            { name: "Indianapolis Motor Speedway", emoji: "🏁", lat: 39.7950, lon: -86.2347 },
            { name: "Field of Dreams", emoji: "⚾", lat: 42.4989, lon: -91.0982 },
            { name: "Mammoth Cave", emoji: "🦣", lat: 37.1862, lon: -86.1000 },
            { name: "Mackinac Island", emoji: "🚲", lat: 45.8492, lon: -84.6189 },
            { name: "Rock & Roll Hall of Fame", emoji: "🎸", lat: 41.5087, lon: -81.6950 },
            { name: "Crater Lake", emoji: "🏞️", lat: 42.9446, lon: -122.1090 },
            { name: "Great Smoky Mountains", emoji: "🌫️", lat: 35.6118, lon: -83.4895 },
            { name: "The Alamo", emoji: "🤠", lat: 29.4260, lon: -98.4861 },
            { name: "Colonial Williamsburg", emoji: "🏘️", lat: 37.2707, lon: -76.7075 }
        ]
    };

