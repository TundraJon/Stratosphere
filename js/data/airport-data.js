    // 65+ State Airports representing all US Regions
    const AIRPORTS = [
        { name: "KBNA (Nashville, TN)", lat: 36.1263, lon: -86.6774, rwy: "02L/20R, 13/31" },
        { name: "KMIA (Miami, FL)", lat: 25.7959, lon: -80.2870, rwy: "08L/26R, 12/30" },
        { name: "KJFK (New York, NY)", lat: 40.6398, lon: -73.7789, rwy: "04L/22R, 13L/31R" },
        { name: "KLAX (Los Angeles, CA)", lat: 33.9416, lon: -118.4085, rwy: "06L/24R, 25L/43R" },
        { name: "KORD (Chicago, IL)", lat: 41.9742, lon: -87.9073, rwy: "10L/28R, 09R/27L" },
        { name: "KDEN (Denver, CO)", lat: 39.8561, lon: -104.6737, rwy: "07/25, 16L/34R" },
        { name: "KATL (Atlanta, GA)", lat: 33.6407, lon: -84.4277, rwy: "08L/26R, 09L/27R" },
        { name: "KSEA (Seattle, WA)", lat: 47.4502, lon: -122.3088, rwy: "16L/34R, 16C/34C" },
        { name: "KSFO (San Francisco, CA)", lat: 37.6213, lon: -122.3790, rwy: "01L/19R, 28L/10R" },
        { name: "KDFW (Dallas, TX)", lat: 32.8998, lon: -97.0403, rwy: "17R/35L, 18L/36R" },
        { name: "KANC (Anchorage, AK)", lat: 61.1744, lon: -149.9964, rwy: "07L/25R, 15/33" },
        { name: "PHNL (Honolulu, HI)", lat: 21.3187, lon: -157.9225, rwy: "08L/26R, 04R/22L" },
        { name: "KPDX (Portland, OR)", lat: 45.5886, lon: -122.5975, rwy: "10L/28R, 03/21" },
        { name: "KPHX (Phoenix, AZ)", lat: 33.4343, lon: -112.0083, rwy: "08/26, 07L/25R" },
        { name: "KSLC (Salt Lake City, UT)", lat: 40.7884, lon: -111.9778, rwy: "16L/34R, 14/32" },
        { name: "KLAS (Las Vegas, NV)", lat: 36.0840, lon: -115.1537, rwy: "01L/19R, 08L/26R" },
        { name: "KMSP (Minneapolis, MN)", lat: 44.8848, lon: -93.2223, rwy: "12L/30R, 04/22" },
        { name: "KDTW (Detroit, MI)", lat: 42.2124, lon: -83.3533, rwy: "04L/22R, 03R/21L" },
        { name: "KBOS (Boston, MA)", lat: 42.3643, lon: -71.0052, rwy: "04L/22R, 15R/33L" },
        { name: "KCLT (Charlotte, NC)", lat: 35.2140, lon: -80.9431, rwy: "18L/36R, 05/23" },
        { name: "KPHL (Philadelphia, PA)", lat: 39.8729, lon: -75.2437, rwy: "09L/27R, 17/35" },
        { name: "KDCA (Washington, DC)", lat: 38.8512, lon: -77.0377, rwy: "01/19, 15/33" },
        { name: "KIAD (Dulles, VA)", lat: 38.9531, lon: -77.4565, rwy: "01R/19L, 12/30" },
        { name: "KTPA (Tampa, FL)", lat: 27.9755, lon: -82.5332, rwy: "01L/19R, 10/28" },
        { name: "KMCO (Orlando, FL)", lat: 28.4281, lon: -81.3160, rwy: "18L/36R, 17L/35R" },
        { name: "KMSY (New Orleans, LA)", lat: 29.9911, lon: -90.2580, rwy: "11/29, 02/20" },
        { name: "KIAH (Houston, TX)", lat: 29.9902, lon: -95.3368, rwy: "15L/33R, 08L/26R" },
        { name: "KAUS (Austin, TX)", lat: 30.1945, lon: -97.6699, rwy: "17L/35R, 17R/35L" },
        { name: "KMSN (Madison, WI)", lat: 43.1398, lon: -89.3375, rwy: "18/36, 03/21" },
        { name: "KMKE (Milwaukee, WI)", lat: 42.9472, lon: -87.8967, rwy: "01L/19R, 07L/25R" },
        { name: "KCLE (Cleveland, OH)", lat: 41.4058, lon: -81.8539, rwy: "06L/24R, 10/28" },
        { name: "KCVG (Cincinnati, OH)", lat: 39.0461, lon: -84.6622, rwy: "18C/36C, 09/27" },
        { name: "KPIT (Pittsburgh, PA)", lat: 40.4914, lon: -80.2329, rwy: "10L/28R, 14/32" },
        { name: "KIND (Indianapolis, IN)", lat: 39.7173, lon: -86.2944, rwy: "05L/23R, 14/32" },
        { name: "KSTL (St. Louis, MO)", lat: 38.7477, lon: -90.3599, rwy: "12L/30R, 06/24" },
        { name: "KMCI (Kansas City, MO)", lat: 39.2976, lon: -94.7139, rwy: "01L/19R, 09/27" },
        { name: "KOMA (Omaha, NE)", lat: 41.3025, lon: -95.8941, rwy: "14L/32R, 18/36" },
        { name: "KDSM (Des Moines, IA)", lat: 41.5340, lon: -93.6631, rwy: "05/23, 13/31" },
        { name: "KOKC (Oklahoma City, OK)", lat: 35.3931, lon: -97.6007, rwy: "17L/35R, 13/31" },
        { name: "KTUL (Tulsa, OK)", lat: 36.1984, lon: -95.8881, rwy: "18L/36R, 08/26" },
        { name: "KLIT (Little Rock, AR)", lat: 34.7294, lon: -92.2247, rwy: "04L/22R, 18/36" },
        { name: "KMEM (Memphis, TN)", lat: 35.0424, lon: -89.9767, rwy: "18C/36C, 09/27" },
        { name: "KHSV (Huntsville, AL)", lat: 34.6372, lon: -86.7751, rwy: "18L/36R, 18R/36L" },
        { name: "KBHM (Birmingham, AL)", lat: 33.5629, lon: -86.7535, rwy: "06/24, 18/36" },
        { name: "KJAN (Jackson, MS)", lat: 32.3112, lon: -90.0759, rwy: "16L/34R, 16R/34L" },
        { name: "KGPT (Gulfport, MS)", lat: 30.4073, lon: -89.0701, rwy: "14/32, 18/36" },
        { name: "KBUF (Buffalo, NY)", lat: 42.9405, lon: -78.7322, rwy: "05/23, 14/32" },
        { name: "KROC (Rochester, NY)", lat: 43.1189, lon: -77.6724, rwy: "04/22, 10/28" },
        { name: "KBTV (Burlington, VT)", lat: 44.4730, lon: -73.1503, rwy: "15/33, 01/19" },
        { name: "KPWM (Portland, ME)", lat: 43.6462, lon: -70.3086, rwy: "11/29, 18/36" },
        { name: "KMHT (Manchester, NH)", lat: 42.9328, lon: -71.4357, rwy: "17/35, 06/24" },
        { name: "KPVD (Providence, RI)", lat: 41.7240, lon: -71.4282, rwy: "05/23, 16/34" },
        { name: "KBDL (Hartford, CT)", lat: 41.9389, lon: -72.6832, rwy: "06/24, 15/33" },
        { name: "KACY (Atlantic City, NJ)", lat: 39.4576, lon: -74.5772, rwy: "13/31, 04/22" },
        { name: "KILG (Wilmington, DE)", lat: 39.6787, lon: -75.6065, rwy: "09/27, 14/32" },
        { name: "KBWI (Baltimore, MD)", lat: 39.1754, lon: -76.6683, rwy: "10/28, 15R/33L" },
        { name: "KRIC (Richmond, VA)", lat: 37.5052, lon: -77.3197, rwy: "16/34, 02/20" },
        { name: "KCHS (Charleston, SC)", lat: 32.8986, lon: -80.0405, rwy: "15/33, 03/21" },
        { name: "KSAV (Savannah, GA)", lat: 32.1275, lon: -81.2021, rwy: "01/19, 10/28" },
        { name: "KBOI (Boise, ID)", lat: 43.5644, lon: -116.2228, rwy: "10L/28R, 10R/28L" },
        { name: "KGEG (Spokane, WA)", lat: 47.6199, lon: -117.5338, rwy: "03/21, 07/25" },
        { name: "KRAP (Rapid City, SD)", lat: 44.0453, lon: -103.0602, rwy: "14/32, 05/23" },
        { name: "KBIS (Bismarck, ND)", lat: 46.7727, lon: -100.7461, rwy: "13/31, 03/21" },
        { name: "KBIL (Billings, MT)", lat: 45.8077, lon: -108.5429, rwy: "10L/28R, 07/25" },
        { name: "KJAC (Jackson Hole, WY)", lat: 43.6073, lon: -110.7377, rwy: "01/19" },
        // --- 15 missing top-50 busiest airports ---
        { name: "KEWR (Newark, NJ)", lat: 40.6895, lon: -74.1745, rwy: "04L/22R, 11/29" },
        { name: "KLGA (New York, NY)", lat: 40.7769, lon: -73.8740, rwy: "04/22, 13/31" },
        { name: "KFLL (Fort Lauderdale, FL)", lat: 26.0726, lon: -80.1527, rwy: "10L/28R, 10R/28L" },
        { name: "KSAN (San Diego, CA)", lat: 32.7338, lon: -117.1933, rwy: "09/27" },
        { name: "KMDW (Chicago, IL)", lat: 41.7868, lon: -87.7522, rwy: "13C/31C, 04R/22L" },
        { name: "KDAL (Dallas, TX)", lat: 32.8471, lon: -96.8518, rwy: "13L/31R, 13R/31L" },
        { name: "KRDU (Raleigh-Durham, NC)", lat: 35.8776, lon: -78.7875, rwy: "05L/23R, 05R/23L" },
        { name: "KHOU (Houston, TX)", lat: 29.6454, lon: -95.2789, rwy: "04/22, 12L/30R" },
        { name: "KSMF (Sacramento, CA)", lat: 38.6954, lon: -121.5908, rwy: "16L/34R, 16R/34L" },
        { name: "KSNA (Santa Ana, CA)", lat: 33.6757, lon: -117.8682, rwy: "02L/20R" },
        { name: "KSJC (San Jose, CA)", lat: 37.3626, lon: -121.9291, rwy: "12L/30R, 12R/30L" },
        { name: "KSAT (San Antonio, TX)", lat: 29.5337, lon: -98.4698, rwy: "03/21, 04/22" },
        { name: "KRSW (Fort Myers, FL)", lat: 26.5362, lon: -81.7552, rwy: "06/24" },
        { name: "KDJT (West Palm Beach, FL)", lat: 26.6832, lon: -80.0956, rwy: "09L/27R, 10L/28R" }, // formerly KPBI (Palm Beach Intl), renamed 2026
        // --- 25 medium-hub / regional airports ---
        { name: "KCMH (Columbus, OH)", lat: 39.9980, lon: -82.8919, rwy: "10L/28R, 10R/28L" },
        { name: "KJAX (Jacksonville, FL)", lat: 30.4941, lon: -81.6879, rwy: "08/26, 07/25" },
        { name: "OGG (Kahului, HI)", lat: 20.8986, lon: -156.4305, rwy: "02/20, 05/23" },
        { name: "KBUR (Burbank, CA)", lat: 34.2007, lon: -118.3587, rwy: "08/26, 15/33" },
        { name: "KRNO (Reno, NV)", lat: 39.4991, lon: -119.7681, rwy: "16L/34R, 16R/34L" },
        { name: "KONT (Ontario, CA)", lat: 34.0560, lon: -117.6012, rwy: "08L/26R, 08R/26L" },
        { name: "KSYR (Syracuse, NY)", lat: 43.1112, lon: -76.1063, rwy: "10/28, 06/24" },
        { name: "KGRR (Grand Rapids, MI)", lat: 42.8808, lon: -85.5228, rwy: "08L/26R, 08R/26L" },
        { name: "KGSP (Greer, SC)", lat: 34.8957, lon: -82.2189, rwy: "04/22" },
        { name: "KTUS (Tucson, AZ)", lat: 32.1161, lon: -110.9410, rwy: "03/21, 11L/29R" },
        { name: "KLGB (Long Beach, CA)", lat: 33.8177, lon: -118.1516, rwy: "12/30, 07L/25R" },
        { name: "KMYR (Myrtle Beach, SC)", lat: 33.6797, lon: -78.9283, rwy: "18/36" },
        { name: "KTYS (Knoxville, TN)", lat: 35.8110, lon: -83.9940, rwy: "05L/23R" },
        { name: "KALB (Albany, NY)", lat: 42.7483, lon: -73.8017, rwy: "01/19, 10/28" },
        { name: "KGSO (Greensboro, NC)", lat: 36.0978, lon: -79.9373, rwy: "05L/23R, 05R/23L" },
        { name: "KELP (El Paso, TX)", lat: 31.8072, lon: -106.3781, rwy: "04/22, 08/26" },
        { name: "KICT (Wichita, KS)", lat: 37.6499, lon: -97.4331, rwy: "01L/19R, 01R/19L" },
        { name: "KFAY (Fayetteville, NC)", lat: 34.9912, lon: -78.8803, rwy: "04/22" },
        { name: "KBZN (Bozeman, MT)", lat: 45.7776, lon: -111.1530, rwy: "12/30" },
        { name: "KAVL (Asheville, NC)", lat: 35.4362, lon: -82.5418, rwy: "16/34" },
        { name: "KCHA (Chattanooga, TN)", lat: 35.0353, lon: -85.2038, rwy: "02/20" },
        { name: "KSBN (South Bend, IN)", lat: 41.7087, lon: -86.3173, rwy: "09L/27R, 09R/27L" },
        { name: "KFAT (Fresno, CA)", lat: 36.7762, lon: -119.7181, rwy: "11L/29R, 11R/29L" },
        { name: "KEYW (Key West, FL)", lat: 24.5561, lon: -81.7596, rwy: "09/27" },
        { name: "KPSC (Pasco, WA)", lat: 46.2647, lon: -119.1190, rwy: "03R/21L, 08/26" },
        { name: "KMLI (Moline, IL)", lat: 41.4485, lon: -90.5075, rwy: "09/27, 13/31" },
        { name: "KDLH (Duluth, MN)", lat: 46.8420, lon: -92.1936, rwy: "09/27, 03/21" },
        { name: "KFSD (Sioux Falls, SD)", lat: 43.5820, lon: -96.7419, rwy: "03/21, 09/27" },
        { name: "KISP (Islip, NY)", lat: 40.7952, lon: -73.1002, rwy: "06/24, 15L/33R" },
        { name: "KORF (Norfolk, VA)", lat: 36.8946, lon: -76.2012, rwy: "05/23, 14/32" },
        { name: "KECP (Panama City Beach, FL)", lat: 30.3417, lon: -85.7972, rwy: "16/34" },
        { name: "KSRQ (Sarasota/Bradenton, FL)", lat: 27.3954, lon: -82.5544, rwy: "14/32, 04/22" },
        { name: "KSDF (Louisville, KY)", lat: 38.1744, lon: -85.7364, rwy: "17R/35L, 11/29" },
        { name: "KCOS (Colorado Springs, CO)", lat: 38.8058, lon: -104.7008, rwy: "17L/35R, 13/31" },
        { name: "KHDN (Hayden/Steamboat Springs, CO)", lat: 40.4812, lon: -107.2177, rwy: "10/28" },
        { name: "KMTJ (Montrose, CO)", lat: 38.5098, lon: -107.8943, rwy: "17/35, 13/31" },
        { name: "KABQ (Albuquerque, NM)", lat: 35.0402, lon: -106.6091, rwy: "08/26, 03/21" },
        { name: "KAMA (Amarillo, TX)", lat: 35.2194, lon: -101.7059, rwy: "04/22, 13/31" },
        { name: "KCRP (Corpus Christi, TX)", lat: 27.7704, lon: -97.5012, rwy: "13/31, 17/35" },
        { name: "KLBB (Lubbock, TX)", lat: 33.6636, lon: -101.8228, rwy: "17R/35L, 08/26" },
        { name: "KMAF (Midland/Odessa, TX)", lat: 31.9425, lon: -102.2019, rwy: "10/28, 16/34" },
        { name: "KOAK (Oakland, CA)", lat: 37.7213, lon: -122.2208, rwy: "12/30, 09R/27L" },
        { name: "KPSP (Palm Springs, CA)", lat: 33.8297, lon: -116.5070, rwy: "13R/31L, 13L/31R" },
        { name: "KSBA (Santa Barbara, CA)", lat: 34.4262, lon: -119.8415, rwy: "07/25, 15L/33R" },
        { name: "KSTS (Santa Rosa, CA)", lat: 38.5090, lon: -122.8134, rwy: "14/32, 01/19" },
        { name: "KEUG (Eugene, OR)", lat: 44.1246, lon: -123.2120, rwy: "16R/34L, 16L/34R" },
        { name: "KRDM (Redmond, OR)", lat: 44.2541, lon: -121.1500, rwy: "05/23, 10/28" },
        { name: "KOA (Kona, HI)", lat: 19.7388, lon: -156.0456, rwy: "17/35" },
        { name: "LIH (Lihue, HI)", lat: 21.9760, lon: -159.3390, rwy: "03/21, 17/35" }
    ];

    // Real runway data for all 128 airports in AIRPORTS, extracted from a
    // WI/FAA-sourced GeoJSON (user-provided) -- real threshold coordinates,
    // length, width, surface type, and lighting intensity per runway, not
    // estimated. Verified: zero null critical fields across all 360 records,
    // spot-checked against independent sources (incl. the two WATER/TURF
    // surface outliers at PHNL and KBZN, both confirmed real).
    const AIRPORT_RUNWAYS = {
        "KBNA": {
            officialName: "Nashville Intl",
            runways: [
                { id: "02C/20C", lat1: 36.10333044, lon1: -86.68796083, lat2: 36.12423325, lon2: -86.67959719, len: 8001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "02L/20R", lat1: 36.11767616, lon1: -86.68647491, lat2: 36.13784227, lon2: -86.67856613, len: 7704, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "02R/20L", lat1: 36.1127135, lon1: -86.6676425, lat2: 36.13361547, lon2: -86.65927675, len: 8001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 36.1412778, lon1: -86.69535555, lat2: 36.12049575, lon2: -86.66817713, len: 11030, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMIA": {
            officialName: "Miami Intl",
            runways: [
                { id: "08L/26R", lat1: 25.80289777, lon1: -80.30154188, lat2: 25.80397788, lon2: -80.27543052, len: 8600, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "08R/26L", lat1: 25.80069936, lon1: -80.301433, lat2: 25.80201811, lon2: -80.26953561, len: 10506, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "09/27", lat1: 25.78609502, lon1: -80.31483813, lat2: 25.78773133, lon2: -80.2753253, len: 13016, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "12/30", lat1: 25.79928505, lon1: -80.30228997, lat2: 25.78661733, lon2: -80.27752236, len: 9360, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KJFK": {
            officialName: "John F Kennedy Intl",
            runways: [
                { id: "04L/22R", lat1: 40.62202094, lon1: -73.78558413, lat2: 40.65050938, lon2: -73.76332211, len: 12079, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "04R/22L", lat1: 40.62542827, lon1: -73.77034558, lat2: 40.64523697, lon2: -73.75486186, len: 8400, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "13L/31R", lat1: 40.65776444, lon1: -73.79023905, lat2: 40.64372458, lon2: -73.75927272, len: 10000, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "13R/31L", lat1: 40.64836133, lon1: -73.81671472, lat2: 40.62799441, lon2: -73.77178075, len: 14511, width: 200, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KLAX": {
            officialName: "Los Angeles Intl",
            runways: [
                { id: "06L/24R", lat1: 33.94911247, lon1: -118.43115986, lat2: 33.95210391, lon2: -118.40194891, len: 8926, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "06R/24L", lat1: 33.94681577, lon1: -118.43466783, lat2: 33.95046327, lon2: -118.399046, len: 10885, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "07L/25R", lat1: 33.93555177, lon1: -118.42206486, lat2: 33.93987788, lon2: -118.37977791, len: 12923, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "07R/25L", lat1: 33.93364938, lon1: -118.41901833, lat2: 33.93736302, lon2: -118.38271391, len: 11095, width: 200, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KORD": {
            officialName: "Chicago O'Hare Intl",
            runways: [
                { id: "04L/22R", lat1: 41.98165558, lon1: -87.91391775, lat2: 41.99753711, lon2: -87.89637122, len: 7500, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "04R/22L", lat1: 41.95332716, lon1: -87.8994185, lat2: 41.96992166, lon2: -87.8797433, len: 8075, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "09C/27C", lat1: 41.98830322, lon1: -87.93157122, lat2: 41.98831033, lon2: -87.89021005, len: 11245, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "09L/27R", lat1: 42.00283205, lon1: -87.92667608, lat2: 42.0028308, lon2: -87.89908325, len: 7500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09R/27L", lat1: 41.98389366, lon1: -87.93156908, lat2: 41.98390033, lon2: -87.89015488, len: 11260, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10C/28C", lat1: 41.96570141, lon1: -87.93152161, lat2: 41.96576577, lon2: -87.8918103, len: 10800, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "10L/28R", lat1: 41.96899488, lon1: -87.93153172, lat2: 41.96907025, lon2: -87.883729, len: 13000, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10R/28L", lat1: 41.95720111, lon1: -87.92786122, lat2: 41.95724625, lon2: -87.90028763, len: 7500, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KDEN": {
            officialName: "Denver Intl",
            runways: [
                { id: "07/25", lat1: 39.84094505, lon1: -104.72665638, lat2: 39.84065741, lon2: -104.68393644, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08/26", lat1: 39.8775558, lon1: -104.66222963, lat2: 39.87724358, lon2: -104.61948552, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "16L/34R", lat1: 39.89703613, lon1: -104.6868055, lat2: 39.86410397, lon2: -104.68718838, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "16R/34L", lat1: 39.89579694, lon1: -104.6960835, lat2: 39.85188683, lon2: -104.69658794, len: 16000, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "17L/35R", lat1: 39.86495241, lon1: -104.64130441, lat2: 39.83201963, lon2: -104.64170983, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 39.86124502, lon1: -104.66015447, lat2: 39.82831283, lon2: -104.66055113, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KATL": {
            officialName: "Hartsfield/Jackson Atlanta Intl",
            runways: [
                { id: "08L/26R", lat1: 33.64953438, lon1: -84.43902563, lat2: 33.64954208, lon2: -84.40945391, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08R/26L", lat1: 33.64678666, lon1: -84.43836208, lat2: 33.64679477, lon2: -84.40550869, len: 9999, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09L/27R", lat1: 33.63470444, lon1: -84.44796686, lat2: 33.6347025, lon2: -84.40726611, len: 12390, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09R/27L", lat1: 33.63181338, lon1: -84.44796577, lat2: 33.63182358, lon2: -84.41840083, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "10/28", lat1: 33.62027244, lon1: -84.44787705, lat2: 33.62028541, lon2: -84.4183155, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSEA": {
            officialName: "Seattle-Tacoma Intl",
            runways: [
                { id: "16C/34C", lat1: 47.46380986, lon1: -122.31098375, lat2: 47.43797127, lon2: -122.31120983, len: 9426, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "16L/34R", lat1: 47.46379522, lon1: -122.30775022, lat2: 47.43117227, lon2: -122.30803825, len: 11901, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "16R/34L", lat1: 47.46383636, lon1: -122.31785683, lat2: 47.4405338, lon2: -122.31805805, len: 8500, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSFO": {
            officialName: "San Francisco Intl",
            runways: [
                { id: "01L/19R", lat1: 37.60789786, lon1: -122.3829285, lat2: 37.62648136, lon2: -122.37060941, len: 7650, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "01R/19L", lat1: 37.60632988, lon1: -122.38104075, lat2: 37.62734219, lon2: -122.36711083, len: 8650, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "10L/28R", lat1: 37.62873872, lon1: -122.39339186, lat2: 37.61353361, lon2: -122.35714111, len: 11870, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 37.62629111, lon1: -122.39310544, lat2: 37.61171194, lon2: -122.35834916, len: 11381, width: 200, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KDFW": {
            officialName: "Dallas-Fort Worth Intl",
            runways: [
                { id: "13L/31R", lat1: 32.91255472, lon1: -97.02147836, lat2: 32.89498111, lon2: -97.00084377, len: 9000, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "13R/31L", lat1: 32.90957563, lon1: -97.08313222, lat2: 32.89026988, lon2: -97.06327647, len: 9300, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17C/35C", lat1: 32.91570669, lon1: -97.02597491, lat2: 32.87887877, lon2: -97.02617166, len: 13400, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "17L/35R", lat1: 32.89832038, lon1: -97.00977861, lat2: 32.8749593, lon2: -97.00990794, len: 8500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 32.91572211, lon1: -97.0298835, lat2: 32.87889452, lon2: -97.03008022, len: 13400, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "18L/36R", lat1: 32.91579958, lon1: -97.05073641, lat2: 32.87897144, lon2: -97.05092588, len: 13401, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 32.91581319, lon1: -97.05464552, lat2: 32.87898591, lon2: -97.05483341, len: 13400, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KANC": {
            officialName: "Ted Stevens Anchorage Intl",
            runways: [
                { id: "07L/25R", lat1: 61.16976497, lon1: -150.00833327, lat2: 61.16981116, lon2: -149.94830072, len: 10600, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "07R/25L", lat1: 61.16781155, lon1: -150.0428713, lat2: 61.16788116, lon2: -149.97264861, len: 12400, width: 200, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "15/33", lat1: 61.19973055, lon1: -150.01453055, lat2: 61.17104166, lon2: -149.99846944, len: 10865, width: 200, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "PHNL": {
            officialName: "Daniel K Inouye Intl",
            runways: [
                { id: "04L/22R", lat1: 21.31833205, lon1: -157.92332058, lat2: 21.32985261, lon2: -157.90699922, len: 6955, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "04R/22L", lat1: 21.31391788, lon1: -157.92713472, lat2: 21.32882672, lon2: -157.9060083, len: 9002, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "04W/22W", lat1: 21.31474722, lon1: -157.9129, lat2: 21.31994441, lon2: -157.90605, len: 3000, width: 150, surface: "WATER", lighting: "" },
                { id: "08L/26R", lat1: 21.3252453, lon1: -157.943378, lat2: 21.32524552, lon2: -157.90706422, len: 12360, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "08R/26L", lat1: 21.30680383, lon1: -157.94585027, lat2: 21.30680186, lon2: -157.91059777, len: 12000, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "08W/26W", lat1: 21.31134722, lon1: -157.91666666, lat2: 21.31110538, lon2: -157.90171616, len: 5090, width: 300, surface: "WATER", lighting: "" }
            ]
        },
        "KPDX": {
            officialName: "Portland Intl",
            runways: [
                { id: "03/21", lat1: 45.582425, lon1: -122.61681077, lat2: 45.59405694, lon2: -122.60023508, len: 6000, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "10L/28R", lat1: 45.596515, lon1: -122.60001613, lat2: 45.58343847, lon2: -122.56646211, len: 9825, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 45.59514852, lon1: -122.62147283, lat2: 45.58051475, lon2: -122.58390175, len: 11000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KPHX": {
            officialName: "Phoenix Sky Harbor Intl",
            runways: [
                { id: "07L/25R", lat1: 33.4310578, lon1: -112.02710163, lat2: 33.43103566, lon2: -111.99334525, len: 10300, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "07R/25L", lat1: 33.42885897, lon1: -112.02710238, lat2: 33.42884316, lon2: -112.00153922, len: 7800, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08/26", lat1: 33.44086091, lon1: -112.02979361, lat2: 33.44082341, lon2: -111.99213566, len: 11489, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSLC": {
            officialName: "Salt Lake City Intl",
            runways: [
                { id: "14/32", lat1: 40.785718, lon1: -111.97124058, lat2: 40.77375533, lon2: -111.96321986, len: 4893, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16L/34R", lat1: 40.80745272, lon1: -111.97693213, lat2: 40.77464402, lon2: -111.97312683, len: 12002, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16R/34L", lat1: 40.80777875, lon1: -111.99928561, lat2: 40.77497697, lon2: -111.9954698, len: 12000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17/35", lat1: 40.79891786, lon1: -111.96207088, lat2: 40.77258394, lon2: -111.96206933, len: 9596, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KLAS": {
            officialName: "Harry Reid Intl",
            runways: [
                { id: "01L/19R", lat1: 36.07532694, lon1: -115.17036386, lat2: 36.09966322, lon2: -115.15643405, len: 9770, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 36.07424266, lon1: -115.16748669, lat2: 36.09857558, lon2: -115.15355816, len: 9769, width: 150, surface: "CONC", lighting: "MED" },
                { id: "08L/26R", lat1: 36.07636566, lon1: -115.17127366, lat2: 36.07640647, lon2: -115.12108302, len: 14835, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08R/26L", lat1: 36.0736288, lon1: -115.1614338, lat2: 36.07365752, lon2: -115.12582402, len: 10526, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMSP": {
            officialName: "Minneapolis-St Paul Intl/Wold-Chamberlain",
            runways: [
                { id: "04/22", lat1: 44.87226611, lon1: -93.23831741, lat2: 44.8936088, lon2: -93.20828983, len: 11006, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12L/30R", lat1: 44.89295241, lon1: -93.22099072, lat2: 44.88125422, lon2: -93.19397111, len: 8200, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12R/30L", lat1: 44.88778994, lon1: -93.23413141, lat2: 44.87352222, lon2: -93.2011858, len: 10000, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "17/35", lat1: 44.88775352, lon1: -93.2422538, lat2: 44.86617683, lon2: -93.23664458, len: 8000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KDTW": {
            officialName: "Detroit Metro Wayne County",
            runways: [
                { id: "03L/21R", lat1: 42.20783558, lon1: -83.35121891, lat2: 42.22829405, lon2: -83.33614083, len: 8501, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "03R/21L", lat1: 42.1956143, lon1: -83.35180188, lat2: 42.219682, lon2: -83.33406991, len: 10001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "04L/22R", lat1: 42.20217266, lon1: -83.38400008, lat2: 42.22624502, lon2: -83.36628097, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "04R/22L", lat1: 42.20232377, lon1: -83.37126936, lat2: 42.23121233, lon2: -83.34999041, len: 12003, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "09L/27R", lat1: 42.21696725, lon1: -83.36316788, lat2: 42.21750608, lon2: -83.33103183, len: 8708, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09R/27L", lat1: 42.19901505, lon1: -83.36172911, lat2: 42.19953811, lon2: -83.33036877, len: 8500, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KBOS": {
            officialName: "General Edward Lawrence Logan Intl",
            runways: [
                { id: "04L/22R", lat1: 42.35798825, lon1: -71.01433852, lat2: 42.37829886, lon2: -71.00451386, len: 7864, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "04R/22L", lat1: 42.35105816, lon1: -71.01179388, lat2: 42.37689997, lon2: -70.99929091, len: 10006, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "09/27", lat1: 42.35575416, lon1: -71.01289408, lat2: 42.36021575, lon2: -70.98770211, len: 7001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 42.3565978, lon1: -71.02327461, lat2: 42.34859902, lon2: -71.00824558, len: 5000, width: 100, surface: "ASPH", lighting: "HIGH" },
                { id: "15L/33R", lat1: 42.37319466, lon1: -71.00861241, lat2: 42.36821641, lon2: -71.00194466, len: 2557, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "15R/33L", lat1: 42.3742708, lon1: -71.01789213, lat2: 42.35465077, lon2: -70.99158605, len: 10083, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KCLT": {
            officialName: "Charlotte/Douglas Intl",
            runways: [
                { id: "01L/19R", lat1: 35.20061944, lon1: -80.96529675, lat2: 35.22528291, lon2: -80.96741888, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 35.19999188, lon1: -80.95081175, lat2: 35.22739636, lon2: -80.95316944, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18L/36R", lat1: 35.22473386, lon1: -80.9361573, lat2: 35.20095666, lon2: -80.93411752, len: 8676, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KPHL": {
            officialName: "Philadelphia Intl",
            runways: [
                { id: "08/26", lat1: 39.87833741, lon1: -75.23001388, lat2: 39.88177291, lon2: -75.21276327, len: 5001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "09L/27R", lat1: 39.86868283, lon1: -75.25566136, lat2: 39.87522036, lon2: -75.22289697, len: 9500, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "09R/27L", lat1: 39.86080936, lon1: -75.275196, lat2: 39.86906972, lon2: -75.23381083, len: 12000, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "17/35", lat1: 39.88765872, lon1: -75.23609077, lat2: 39.8709938, lon2: -75.22781427, len: 6500, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KDCA": {
            officialName: "Ronald Reagan Washington Ntl",
            runways: [
                { id: "01/19", lat1: 38.84156819, lon1: -77.03674844, lat2: 38.86119258, lon2: -77.03872369, len: 7169, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "04/22", lat1: 38.84112622, lon1: -77.04145475, lat2: 38.853511, lon2: -77.03388077, len: 5000, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "15/33", lat1: 38.86116144, lon1: -77.04329697, lat2: 38.84980405, lon2: -77.03220911, len: 5204, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KIAD": {
            officialName: "Washington Dulles Intl",
            runways: [
                { id: "01C/19C", lat1: 38.93906625, lon1: -77.4597775, lat2: 38.97064091, lon2: -77.45931808, len: 11500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01L/19R", lat1: 38.94496652, lon1: -77.47481025, lat2: 38.97077333, lon2: -77.47444, len: 9400, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 38.92375677, lon1: -77.43644811, lat2: 38.95532963, lon2: -77.43597461, len: 11500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12/30", lat1: 38.94377491, lon1: -77.49044116, lat2: 38.933611, lon2: -77.45589602, len: 10501, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KTPA": {
            officialName: "Tampa Intl",
            runways: [
                { id: "01L/19R", lat1: 27.96329433, lon1: -82.54235541, lat2: 27.99353944, lon2: -82.54132783, len: 11002, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 27.96431033, lon1: -82.52899136, lat2: 27.98712794, lon2: -82.52821505, len: 8300, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10/28", lat1: 27.97083105, lon1: -82.53608433, lat2: 27.9702473, lon2: -82.51441058, len: 6999, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KMCO": {
            officialName: "Orlando Intl",
            runways: [
                { id: "17L/35R", lat1: 28.44369655, lon1: -81.28258075, lat2: 28.41894427, lon2: -81.28232736, len: 9001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 28.43561133, lon1: -81.29587905, lat2: 28.40811083, lon2: -81.29559188, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18L/36R", lat1: 28.44833302, lon1: -81.32230613, lat2: 28.41531975, lon2: -81.3219543, len: 12005, width: 200, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 28.44829305, lon1: -81.32697461, lat2: 28.41527983, lon2: -81.32662005, len: 12004, width: 200, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KMSY": {
            officialName: "Louis Armstrong New Orleans Intl",
            runways: [
                { id: "02/20", lat1: 29.98450127, lon1: -90.25141525, lat2: 30.0030538, lon2: -90.24551027, len: 7002, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "11/29", lat1: 29.99662694, lon1: -90.28172872, lat2: 29.98921436, lon2: -90.25096808, len: 10104, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KIAH": {
            officialName: "George Bush Intcntl/Houston",
            runways: [
                { id: "08L/26R", lat1: 30.00716155, lon1: -95.35879091, lat2: 30.00718366, lon2: -95.33035808, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08R/26L", lat1: 29.99341744, lon1: -95.35496397, lat2: 29.99343936, lon2: -95.32526497, len: 9402, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09/27", lat1: 29.97759341, lon1: -95.33410808, lat2: 29.97761308, lon2: -95.30252633, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "15L/33R", lat1: 29.98788961, lon1: -95.35787041, lat2: 29.95876402, lon2: -95.3400525, len: 12001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "15R/33L", lat1: 29.98780783, lon1: -95.36139955, lat2: 29.96354094, lon2: -95.3465503, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KAUS": {
            officialName: "Austin-Bergstrom Intl",
            runways: [
                { id: "18L/36R", lat1: 30.20383005, lon1: -97.65789105, lat2: 30.17909102, lon2: -97.65724333, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 30.21361613, lon1: -97.67936477, lat2: 30.17994322, lon2: -97.67847469, len: 12250, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMSN": {
            officialName: "Dane County Rgnl/Truax Fld",
            runways: [
                { id: "03/21", lat1: 43.13330194, lon1: -89.34175727, lat2: 43.1505803, lon2: -89.32868263, len: 7200, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "14/32", lat1: 43.14790897, lon1: -89.34156266, lat2: 43.13628641, lon2: -89.32646805, len: 5846, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18/36", lat1: 43.14913713, lon1: -89.3410255, lat2: 43.12444397, lon2: -89.342166, len: 9006, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMKE": {
            officialName: "General Mitchell Intl",
            runways: [
                { id: "01L/19R", lat1: 42.93049897, lon1: -87.89764333, lat2: 42.95769416, lon2: -87.89299313, len: 9990, width: 200, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 42.93937944, lon1: -87.89236155, lat2: 42.95076244, lon2: -87.89041327, len: 4182, width: 150, surface: "ASPH-CONC", lighting: "MED" },
                { id: "07L/25R", lat1: 42.95274711, lon1: -87.90530836, lat2: 42.95688975, lon2: -87.88830361, len: 4797, width: 100, surface: "ASPH-CONC", lighting: "MED" },
                { id: "07R/25L", lat1: 42.93907366, lon1: -87.91775325, lat2: 42.9462425, lon2: -87.88833341, len: 8300, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 42.95813241, lon1: -87.90341516, lat2: 42.94791872, lon2: -87.88810663, len: 5537, width: 150, surface: "ASPH-CONC", lighting: "MED" }
            ]
        },
        "KCLE": {
            officialName: "Cleveland-Hopkins Intl",
            runways: [
                { id: "06L/24R", lat1: 41.39987202, lon1: -81.8734895, lat2: 41.41576397, lon2: -81.84837541, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "06R/24L", lat1: 41.39774283, lon1: -81.86981997, lat2: 41.41531694, lon2: -81.84204725, len: 9953, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "10/28", lat1: 41.41701561, lon1: -81.85424561, lat2: 41.41606133, lon2: -81.83234422, len: 6018, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KCVG": {
            officialName: "Cincinnati/Northern Kentucky Intl",
            runways: [
                { id: "09/27", lat1: 39.04636247, lon1: -84.69509816, lat2: 39.04626138, lon2: -84.65284552, len: 12001, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "18C/36C", lat1: 39.06474261, lon1: -84.66861758, lat2: 39.03454311, lon2: -84.66874191, len: 11000, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "18L/36R", lat1: 39.05585502, lon1: -84.646668, lat2: 39.02840016, lon2: -84.64679338, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 39.07088155, lon1: -84.68373755, lat2: 39.04891769, lon2: -84.68382244, len: 8000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KPIT": {
            officialName: "Pittsburgh Intl",
            runways: [
                { id: "10C/28C", lat1: 40.48991636, lon1: -80.24792986, lat2: 40.48890052, lon2: -80.20921538, len: 10775, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10L/28R", lat1: 40.50233366, lon1: -80.27118575, lat2: 40.50135186, lon2: -80.23344577, len: 10502, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10R/28L", lat1: 40.48672913, lon1: -80.25190466, lat2: 40.4856455, lon2: -80.21059025, len: 11500, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "14/32", lat1: 40.49601511, lon1: -80.2248663, lat2: 40.47991388, lon2: -80.20478286, len: 8101, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KIND": {
            officialName: "Indianapolis Intl",
            runways: [
                { id: "05L/23R", lat1: 39.70639825, lon1: -86.32080625, lat2: 39.72830836, lon2: -86.29287752, len: 11200, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "05R/23L", lat1: 39.7002425, lon1: -86.30441833, lat2: 39.71980208, lon2: -86.27947911, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "14/32", lat1: 39.73422386, lon1: -86.28882327, lat2: 39.72020716, lon2: -86.27038597, len: 7278, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KSTL": {
            officialName: "St Louis Lambert Intl",
            runways: [
                { id: "06/24", lat1: 38.74668391, lon1: -90.38121761, lat2: 38.75621747, lon2: -90.35750388, len: 7603, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "11/29", lat1: 38.75995227, lon1: -90.4098723, lat2: 38.74679225, lon2: -90.38316261, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12L/30R", lat1: 38.7517933, lon1: -90.36632172, lat2: 38.73860719, lon2: -90.33958547, len: 9013, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12R/30L", lat1: 38.75390386, lon1: -90.37915886, lat2: 38.7377818, lon2: -90.34646444, len: 11020, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMCI": {
            officialName: "Kansas City Intl",
            runways: [
                { id: "01L/19R", lat1: 39.29333413, lon1: -94.72931758, lat2: 39.32223322, lon2: -94.72077319, len: 10801, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 39.28145391, lon1: -94.70899819, lat2: 39.30687136, lon2: -94.7014785, len: 9500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09/27", lat1: 39.29086083, lon1: -94.72659363, lat2: 39.28807544, lon2: -94.69322161, len: 9501, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KOMA": {
            officialName: "Eppley Airfield",
            runways: [
                { id: "14L/32R", lat1: 41.3135305, lon1: -95.90041736, lat2: 41.29456436, lon2: -95.88240644, len: 8500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "14R/32L", lat1: 41.31384169, lon1: -95.90608536, lat2: 41.29264019, lon2: -95.88595002, len: 9502, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18/36", lat1: 41.31335138, lon1: -95.89450963, lat2: 41.29097472, lon2: -95.89461938, len: 8154, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KDSM": {
            officialName: "Des Moines Intl",
            runways: [
                { id: "05/23", lat1: 41.52336788, lon1: -93.67711311, lat2: 41.53794947, lon2: -93.65056752, len: 9004, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 41.54560547, lon1: -93.67445366, lat2: 41.52896716, lon2: -93.65015452, len: 9001, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KOKC": {
            officialName: "Okc Will Rogers Intl",
            runways: [
                { id: "13/31", lat1: 35.40460825, lon1: -97.61590897, lat2: 35.38943813, lon2: -97.59742641, len: 7800, width: 150, surface: "CONC", lighting: "MED" },
                { id: "17L/35R", lat1: 35.40515663, lon1: -97.58894655, lat2: 35.37823102, lon2: -97.58892513, len: 9802, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 35.40594872, lon1: -97.60572722, lat2: 35.37902602, lon2: -97.60570122, len: 9801, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18/36", lat1: 35.39354347, lon1: -97.60772691, lat2: 35.38508627, lon2: -97.60772058, len: 3079, width: 75, surface: "ASPH", lighting: "" }
            ]
        },
        "KTUL": {
            officialName: "Tulsa Intl",
            runways: [
                { id: "08/26", lat1: 36.19543175, lon1: -95.89903052, lat2: 36.19563355, lon2: -95.87403683, len: 7376, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18L/36R", lat1: 36.21393486, lon1: -95.88131094, lat2: 36.18650869, lon2: -95.8831345, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 36.20722, lon1: -95.89909016, lat2: 36.19048772, lon2: -95.90020375, len: 6101, width: 100, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KLIT": {
            officialName: "Bill And Hillary Clinton Ntl/Adams Fld",
            runways: [
                { id: "04L/22R", lat1: 34.72251236, lon1: -92.23802336, lat2: 34.73815455, lon2: -92.21804916, len: 8273, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "04R/22L", lat1: 34.7193865, lon1: -92.22121938, lat2: 34.73498522, lon2: -92.20129519, len: 8251, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18/36", lat1: 34.73979011, lon1: -92.23809425, lat2: 34.72269575, lon2: -92.23863986, len: 6224, width: 150, surface: "CONC", lighting: "MED" }
            ]
        },
        "KMEM": {
            officialName: "Frederick W Smith Intl/Memphis",
            runways: [
                { id: "09/27", lat1: 35.05862388, lon1: -89.98573711, lat2: 35.05778133, lon2: -89.955856, len: 8946, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18C/36C", lat1: 35.05459475, lon1: -89.976171, lat2: 35.02405008, lon2: -89.97552713, len: 11120, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18L/36R", lat1: 35.04881672, lon1: -89.9729508, lat2: 35.02409377, lon2: -89.97243177, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "18R/36L", lat1: 35.0494858, lon1: -89.98744202, lat2: 35.02388477, lon2: -89.98689225, len: 9320, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KHSV": {
            officialName: "Huntsville Intl-Carl T Jones Fld",
            runways: [
                { id: "18L/36R", lat1: 34.65309847, lon1: -86.76546475, lat2: 34.62562486, lon2: -86.76601719, len: 10001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "18R/36L", lat1: 34.6527855, lon1: -86.78210047, lat2: 34.618171, lon2: -86.78279083, len: 12600, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KBHM": {
            officialName: "Birmingham-Shuttlesworth Intl",
            runways: [
                { id: "06/24", lat1: 33.55477952, lon1: -86.77156908, lat2: 33.57348041, lon2: -86.73909686, len: 12007, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "18/36", lat1: 33.57321347, lon1: -86.74719025, lat2: 33.55370516, lon2: -86.74720019, len: 7099, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KJAN": {
            officialName: "Jackson-Medgar Wiley Evers Intl",
            runways: [
                { id: "16L/34R", lat1: 32.32819425, lon1: -90.07771, lat2: 32.30653463, lon2: -90.06739644, len: 8500, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16R/34L", lat1: 32.31582097, lon1: -90.08438752, lat2: 32.29416177, lon2: -90.07407527, len: 8500, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KGPT": {
            officialName: "Gulfport-Biloxi Intl",
            runways: [
                { id: "14/32", lat1: 30.41495483, lon1: -89.08230441, lat2: 30.39747875, lon2: -89.06208586, len: 9002, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "18/36", lat1: 30.41597238, lon1: -89.06629108, lat2: 30.40240366, lon2: -89.06624602, len: 4935, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KBUF": {
            officialName: "Buffalo Niagara Intl",
            runways: [
                { id: "05/23", lat1: 42.93119961, lon1: -78.74168472, lat2: 42.94864016, lon2: -78.71880766, len: 8829, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 42.94691733, lon1: -78.7416935, lat2: 42.93518544, lon2: -78.72024169, len: 7161, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KROC": {
            officialName: "Frederick Douglass/Greater Rochester Intl",
            runways: [
                { id: "04/22", lat1: 43.10688, lon1: -77.68770927, lat2: 43.12556672, lon2: -77.67198891, len: 8001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "07/25", lat1: 43.11616883, lon1: -77.67258833, lat2: 43.12100913, lon2: -77.65914236, len: 4000, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "10/28", lat1: 43.12277922, lon1: -77.67762305, lat2: 43.12349647, lon2: -77.65366547, len: 6402, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KBTV": {
            officialName: "Patrick Leahy Burlington Intl",
            runways: [
                { id: "01/19", lat1: 44.46382586, lon1: -73.15100308, lat2: 44.474978, lon2: -73.15335213, len: 4112, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "15/33", lat1: 44.48067452, lon1: -73.16587886, lat2: 44.46575808, lon2: -73.14176269, len: 8319, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KPWM": {
            officialName: "Portland Intl Jetport",
            runways: [
                { id: "11/29", lat1: 43.645862, lon1: -70.32607363, lat2: 43.64403358, lon2: -70.2989915, len: 7200, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "18/36", lat1: 43.65447322, lon1: -70.30731936, lat2: 43.638451, lon2: -70.30066444, len: 6100, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KMHT": {
            officialName: "Manchester Boston Rgnl",
            runways: [
                { id: "06/24", lat1: 42.92829138, lon1: -71.44906066, lat2: 42.94378619, lon2: -71.42978836, len: 7651, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "17/35", lat1: 42.94176577, lon1: -71.43956863, lat2: 42.91848847, lon2: -71.42581063, len: 9250, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KPVD": {
            officialName: "Rhode Island Tf Green Intl",
            runways: [
                { id: "05/23", lat1: 41.71026161, lon1: -71.43794933, lat2: 41.73047186, lon2: -71.420981, len: 8700, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16/34", lat1: 41.73165438, lon1: -71.43217477, lat2: 41.71857933, lon2: -71.41833241, len: 6081, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KBDL": {
            officialName: "Bradley Intl",
            runways: [
                { id: "06/24", lat1: 41.93201388, lon1: -72.69658013, lat2: 41.95066533, lon2: -72.67213047, len: 9510, width: 200, surface: "ASPH", lighting: "HIGH" },
                { id: "15/33", lat1: 41.94239594, lon1: -72.69325288, lat2: 41.92925661, lon2: -72.67526547, len: 6847, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KACY": {
            officialName: "Atlantic City Intl",
            runways: [
                { id: "04/22", lat1: 39.44973666, lon1: -74.58516197, lat2: 39.46463163, lon2: -74.574946, len: 6145, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 39.46426008, lon1: -74.5910113, lat2: 39.45137069, lon2: -74.55973902, len: 10001, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KILG": {
            officialName: "New Castle",
            runways: [
                { id: "01/19", lat1: 39.66929191, lon1: -75.60382316, lat2: 39.68846538, lon2: -75.60161911, len: 7012, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "09/27", lat1: 39.67806486, lon1: -75.62058677, lat2: 39.68230452, lon2: -75.59532997, len: 7275, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 39.68024925, lon1: -75.61669022, lat2: 39.67198819, lon2: -75.60432111, len: 4602, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KBWI": {
            officialName: "Baltimore/Washington Intl Thurgood Marshall",
            runways: [
                { id: "10/28", lat1: 39.17474708, lon1: -76.689618, lat2: 39.17263205, lon2: -76.65267316, len: 10503, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15L/33R", lat1: 39.18737308, lon1: -76.66354002, lat2: 39.17623522, lon2: -76.65323075, len: 5000, width: 100, surface: "ASPH", lighting: "HIGH" },
                { id: "15R/33L", lat1: 39.1853613, lon1: -76.68199177, lat2: 39.16420308, lon2: -76.66239261, len: 9501, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KRIC": {
            officialName: "Richmond Intl",
            runways: [
                { id: "02/20", lat1: 37.49887247, lon1: -77.32965761, lat2: 37.51651872, lon2: -77.32435486, len: 6607, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16/34", lat1: 37.51663644, lon1: -77.32357658, lat2: 37.49579252, lon2: -77.30688469, len: 9003, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KCHS": {
            officialName: "Charleston Afb/Intl",
            runways: [
                { id: "03/21", lat1: 32.88481833, lon1: -80.04560272, lat2: 32.9023375, lon2: -80.03618027, len: 7000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "15/33", lat1: 32.91302255, lon1: -80.04811894, lat2: 32.89217872, lon2: -80.0323275, len: 9001, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSAV": {
            officialName: "Savannah/Hilton Head Intl",
            runways: [
                { id: "01/19", lat1: 32.11657044, lon1: -81.1999918, lat2: 32.13581622, lon2: -81.20013875, len: 7002, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "10/28", lat1: 32.12875383, lon1: -81.21879266, lat2: 32.12847458, lon2: -81.18858952, len: 9351, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KBOI": {
            officialName: "Boise Air Trml/Gowen Fld",
            runways: [
                { id: "10L/28R", lat1: 43.57021025, lon1: -116.23691161, lat2: 43.55855416, lon2: -116.20276511, len: 10000, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 43.57003461, lon1: -116.24261622, lat2: 43.55865627, lon2: -116.20927611, len: 9763, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KGEG": {
            officialName: "Spokane Intl",
            runways: [
                { id: "03/21", lat1: 47.6100808, lon1: -117.55007988, lat2: 47.63121697, lon2: -117.51826591, len: 11002, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "08/26", lat1: 47.61696352, lon1: -117.55326775, lat2: 47.61676783, lon2: -117.52002902, len: 8199, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KRAP": {
            officialName: "Rapid City Rgnl",
            runways: [
                { id: "05/23", lat1: 44.04786741, lon1: -103.06382083, lat2: 44.05252938, lon2: -103.05174925, len: 3601, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "14/32", lat1: 44.05382875, lon1: -103.06500672, lat2: 44.03279161, lon2: -103.04938877, len: 8701, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KBIS": {
            officialName: "Bismarck Muni",
            runways: [
                { id: "03/21", lat1: 46.76261705, lon1: -100.74841541, lat2: 46.77667152, lon2: -100.73182952, len: 6600, width: 100, surface: "ASPH", lighting: "HIGH" },
                { id: "13/31", lat1: 46.78395263, lon1: -100.76178622, lat2: 46.766151, lon2: -100.73811963, len: 8794, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KBIL": {
            officialName: "Billings Logan Intl",
            runways: [
                { id: "07/25", lat1: 45.807675, lon1: -108.55839722, lat2: 45.80925536, lon2: -108.53695, len: 5501, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "10L/28R", lat1: 45.812725, lon1: -108.55481666, lat2: 45.80205277, lon2: -108.51651111, len: 10518, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 45.81015466, lon1: -108.56629761, lat2: 45.80630791, lon2: -108.552452, len: 3800, width: 75, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KJAC": {
            officialName: "Jackson Hole",
            runways: [
                { id: "01/19", lat1: 43.59919425, lon1: -110.74171977, lat2: 43.61548002, lon2: -110.73377713, len: 6300, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KEWR": {
            officialName: "Newark Liberty Intl",
            runways: [
                { id: "04L/22R", lat1: 40.67538141, lon1: -74.17944877, lat2: 40.70255994, lon2: -74.16217175, len: 11000, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "04R/22L", lat1: 40.67758408, lon1: -74.17424513, lat2: 40.70228891, lon2: -74.15853766, len: 9999, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "11/29", lat1: 40.70280436, lon1: -74.18070741, lat2: 40.70119941, lon2: -74.1565435, len: 6725, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KLGA": {
            officialName: "Laguardia",
            runways: [
                { id: "04/22", lat1: 40.76916258, lon1: -73.88411902, lat2: 40.78543666, lon2: -73.87067336, len: 7002, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 40.78229586, lon1: -73.87851916, lat2: 40.77207144, lon2: -73.85711158, len: 7002, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KFLL": {
            officialName: "Fort Lauderdale/Hollywood Intl",
            runways: [
                { id: "10L/28R", lat1: 26.07694905, lon1: -80.16653836, lat2: 26.07679186, lon2: -80.13912083, len: 9000, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "10R/28L", lat1: 26.06588663, lon1: -80.15834888, lat2: 26.06574216, lon2: -80.133983, len: 8000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSAN": {
            officialName: "San Diego Intl",
            runways: [
                { id: "09/27", lat1: 32.73712241, lon1: -117.20435644, lat2: 32.7300015, lon2: -117.17497163, len: 9401, width: 200, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KMDW": {
            officialName: "Chicago Midway Intl",
            runways: [
                { id: "04L/22R", lat1: 41.7813685, lon1: -87.76119458, lat2: 41.79233711, lon2: -87.74730236, len: 5507, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "04R/22L", lat1: 41.77916233, lon1: -87.75931825, lat2: 41.7919975, lon2: -87.74305855, len: 6445, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "13L/31R", lat1: 41.79157405, lon1: -87.76107011, lat2: 41.779241, lon2: -87.74374055, len: 6522, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "13R/31L", lat1: 41.78806969, lon1: -87.75880541, lat2: 41.78077141, lon2: -87.74855138, len: 3859, width: 60, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KDAL": {
            officialName: "Dallas Love Fld",
            runways: [
                { id: "13L/31R", lat1: 32.857273, lon1: -96.85679908, lat2: 32.84204322, lon2: -96.83915186, len: 7752, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13R/31L", lat1: 32.85131702, lon1: -96.86345116, lat2: 32.83402908, lon2: -96.84341588, len: 8800, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KRDU": {
            officialName: "Raleigh-Durham Intl",
            runways: [
                { id: "05L/23R", lat1: 35.87444888, lon1: -78.80196361, lat2: 35.8938238, lon2: -78.77803327, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "05R/23L", lat1: 35.86463011, lon1: -78.79733816, lat2: 35.879162, lon2: -78.77939363, len: 7500, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 35.87503108, lon1: -78.78267852, lat2: 35.86807755, lon2: -78.77418052, len: 3570, width: 100, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KHOU": {
            officialName: "William P Hobby",
            runways: [
                { id: "04/22", lat1: 29.63910988, lon1: -95.28532211, lat2: 29.65415813, lon2: -95.26871219, len: 7602, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13L/31R", lat1: 29.65260722, lon1: -95.28387119, lat2: 29.6427823, lon2: -95.27220266, len: 5148, width: 100, surface: "CONC", lighting: "MED" },
                { id: "13R/31L", lat1: 29.6509345, lon1: -95.28551086, lat2: 29.63642383, lon2: -95.26828452, len: 7602, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KSMF": {
            officialName: "Sacramento Intl",
            runways: [
                { id: "17L/35R", lat1: 38.70713813, lon1: -121.58005902, lat2: 38.68351405, lon2: -121.58045611, len: 8605, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 38.70733988, lon1: -121.60108225, lat2: 38.68373305, lon2: -121.6014743, len: 8598, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSNA": {
            officialName: "John Wayne/Orange County",
            runways: [
                { id: "02L/20R", lat1: 33.66780841, lon1: -117.87383402, lat2: 33.68165077, lon2: -117.86506336, len: 5700, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "02R/20L", lat1: 33.67399897, lon1: -117.8680515, lat2: 33.6810075, lon2: -117.86361113, len: 2886, width: 75, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KSJC": {
            officialName: "Norman Y Mineta San Jose Intl",
            runways: [
                { id: "12L/30R", lat1: 37.37499447, lon1: -121.94017719, lat2: 37.35225911, lon2: -121.91525575, len: 11000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12R/30L", lat1: 37.37372963, lon1: -121.94198875, lat2: 37.35099355, lon2: -121.9170675, len: 11000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSAT": {
            officialName: "San Antonio Intl",
            runways: [
                { id: "04/22", lat1: 29.52323358, lon1: -98.4699045, lat2: 29.54094244, lon2: -98.45243652, len: 8505, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13L/31R", lat1: 29.540299, lon1: -98.47769833, lat2: 29.530217, lon2: -98.46472783, len: 5519, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "13R/31L", lat1: 29.54274591, lon1: -98.48554113, lat2: 29.52722327, lon2: -98.46555366, len: 8502, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KRSW": {
            officialName: "Southwest Florida Intl",
            runways: [
                { id: "06/24", lat1: 26.5264858, lon1: -81.77001922, lat2: 26.54584061, lon2: -81.74028816, len: 12000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KDJT": {
            officialName: "President Donald J Trump Intl",
            runways: [
                { id: "10L/28R", lat1: 26.68320813, lon1: -80.10836933, lat2: 26.68187327, lon2: -80.07778158, len: 10001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 26.68118944, lon1: -80.10628933, lat2: 26.68075908, lon2: -80.09645836, len: 3214, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "14/32", lat1: 26.69183222, lon1: -80.10402277, lat2: 26.67830916, lon2: -80.08906166, len: 6931, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KCMH": {
            officialName: "John Glenn Columbus Intl",
            runways: [
                { id: "10L/28R", lat1: 40.00320297, lon1: -82.90763725, lat2: 40.00159188, lon2: -82.87915811, len: 8000, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 39.99365147, lon1: -82.90917838, lat2: 39.99161394, lon2: -82.87318175, len: 10114, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KJAX": {
            officialName: "Jacksonville Intl",
            runways: [
                { id: "08/26", lat1: 30.49621647, lon1: -81.69996508, lat2: 30.50537227, lon2: -81.67002697, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "14/32", lat1: 30.49216163, lon1: -81.70083683, lat2: 30.47839961, lon2: -81.68225841, len: 7701, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "OGG": {
            officialName: "Kahului",
            runways: [
                { id: "02/20", lat1: 20.8891405, lon1: -156.43631936, lat2: 20.90492747, lon2: -156.42456786, len: 6998, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "05/23", lat1: 20.8980268, lon1: -156.43708916, lat2: 20.90380986, lon2: -156.42386888, len: 4980, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KBUR": {
            officialName: "Bob Hope",
            runways: [
                { id: "08/26", lat1: 34.19791094, lon1: -118.36914291, lat2: 34.19765038, lon2: -118.34995991, len: 5802, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "15/33", lat1: 34.21234466, lon1: -118.36046072, lat2: 34.19390519, lon2: -118.35537013, len: 6886, width: 150, surface: "ASPH-CONC", lighting: "MED" }
            ]
        },
        "KRNO": {
            officialName: "Reno/Tahoe Intl",
            runways: [
                { id: "08/26", lat1: 39.49628608, lon1: -119.77883944, lat2: 39.49621497, lon2: -119.75722161, len: 6102, width: 150, surface: "CONC", lighting: "MED" },
                { id: "17L/35R", lat1: 39.5138405, lon1: -119.76674055, lat2: 39.48913747, lon2: -119.76680475, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 39.51384391, lon1: -119.76922047, lat2: 39.48364825, lon2: -119.76929861, len: 11001, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KONT": {
            officialName: "Ontario Intl",
            runways: [
                { id: "08L/26R", lat1: 34.05687919, lon1: -117.62282183, lat2: 34.05689608, lon2: -117.58255713, len: 12197, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08R/26L", lat1: 34.05496052, lon1: -117.6162283, lat2: 34.05497258, lon2: -117.58255513, len: 10200, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSYR": {
            officialName: "Syracuse Hancock Intl",
            runways: [
                { id: "10/28", lat1: 43.10819488, lon1: -76.12618625, lat2: 43.10930486, lon2: -76.09247141, len: 9013, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15/33", lat1: 43.12122736, lon1: -76.1128335, lat2: 43.10697613, lon2: -76.09257855, len: 7499, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KGRR": {
            officialName: "Gerald R Ford Intl",
            runways: [
                { id: "08L/26R", lat1: 42.88883038, lon1: -85.54019275, lat2: 42.89090288, lon2: -85.52174847, len: 5001, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "08R/26L", lat1: 42.87663322, lon1: -85.54219002, lat2: 42.88078044, lon2: -85.50531063, len: 10001, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17/35", lat1: 42.88953069, lon1: -85.51925586, lat2: 42.86647425, lon2: -85.51446402, len: 8501, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KGSP": {
            officialName: "Greenville Spartanburg Intl",
            runways: [
                { id: "04/22", lat1: 34.88288516, lon1: -82.22863527, lat2: 34.90845616, lon2: -82.20908041, len: 11001, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KTUS": {
            officialName: "Tucson Intl",
            runways: [
                { id: "04/22", lat1: 32.11716725, lon1: -110.95904052, lat2: 32.1307613, lon2: -110.94304325, len: 7000, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "12/30", lat1: 32.12337041, lon1: -110.94791316, lat2: 32.10199011, lon2: -110.92281841, len: 10996, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KLGB": {
            officialName: "Long Beach (Daugherty Fld)",
            runways: [
                { id: "08L/26R", lat1: 33.82276025, lon1: -118.16352438, lat2: 33.82269883, lon2: -118.14313716, len: 6192, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "08R/26L", lat1: 33.81389722, lon1: -118.16130277, lat2: 33.81390555, lon2: -118.14840277, len: 3918, width: 100, surface: "ASPH", lighting: "HIGH" },
                { id: "12/30", lat1: 33.82620313, lon1: -118.16153461, lat2: 33.80686677, lon2: -118.13814352, len: 10000, width: 200, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KMYR": {
            officialName: "Myrtle Beach Intl",
            runways: [
                { id: "18/36", lat1: 33.69252336, lon1: -78.93151397, lat2: 33.66695891, lon2: -78.92513, len: 9503, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KTYS": {
            officialName: "Mc Ghee Tyson",
            runways: [
                { id: "05L/23R", lat1: 35.80337422, lon1: -84.00663402, lat2: 35.82285883, lon2: -83.98286163, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "05R/23L", lat1: 35.80007025, lon1: -84.00400325, lat2: 35.81760891, lon2: -83.98261286, len: 9000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KALB": {
            officialName: "Albany Intl",
            runways: [
                { id: "01/19", lat1: 42.73716611, lon1: -73.80425697, lat2: 42.76047594, lon2: -73.80526522, len: 8500, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10/28", lat1: 42.74915038, lon1: -73.81209138, lat2: 42.74977686, lon2: -73.78530155, len: 7200, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KGSO": {
            officialName: "Piedmont Triad Intl",
            runways: [
                { id: "05L/23R", lat1: 36.0992558, lon1: -79.95904588, lat2: 36.11643347, lon2: -79.93713536, len: 9000, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "05R/23L", lat1: 36.0910578, lon1: -79.94465819, lat2: 36.11014244, lon2: -79.92031005, len: 10001, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 36.09948, lon1: -79.95244541, lat2: 36.08705527, lon2: -79.93721758, len: 6380, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KELP": {
            officialName: "El Paso Intl",
            runways: [
                { id: "04/22", lat1: 31.80154458, lon1: -106.39985069, lat2: 31.82278088, lon2: -106.37021725, len: 12020, width: 150, surface: "ASPH-CONC", lighting: "HIGH" },
                { id: "08L/26R", lat1: 31.80703683, lon1: -106.36982766, lat2: 31.80616247, lon2: -106.35216022, len: 5499, width: 75, surface: "CONC", lighting: "MED" },
                { id: "08R/26L", lat1: 31.80204191, lon1: -106.38864813, lat2: 31.80060972, lon2: -106.35965291, len: 9025, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KICT": {
            officialName: "Wichita Dwight D Eisenhower Ntl",
            runways: [
                { id: "01L/19R", lat1: 37.63501791, lon1: -97.44599738, lat2: 37.66160175, lon2: -97.433831, len: 10302, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "01R/19L", lat1: 37.64276225, lon1: -97.426286, lat2: 37.66160302, lon2: -97.41765688, len: 7302, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "14/32", lat1: 37.657545, lon1: -97.44007583, lat2: 37.64255933, lon2: -97.42919447, len: 6301, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KFAY": {
            officialName: "Fayetteville Rgnl/Grannis Fld",
            runways: [
                { id: "04/22", lat1: 34.98434536, lon1: -78.88700875, lat2: 35.00246427, lon2: -78.87368366, len: 7709, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10/28", lat1: 34.98782247, lon1: -78.88817016, lat2: 34.98755513, lon2: -78.87214436, len: 4801, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KBZN": {
            officialName: "Bozeman Yellowstone Intl",
            runways: [
                { id: "03/21", lat1: 45.76884947, lon1: -111.15255252, lat2: 45.77391686, lon2: -111.14512052, len: 2650, width: 75, surface: "ASPH", lighting: "" },
                { id: "11/29", lat1: 45.78148888, lon1: -111.15215277, lat2: 45.77156666, lon2: -111.13835277, len: 5050, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "11G/29G", lat1: 45.78033055, lon1: -111.15186666, lat2: 45.77483333, lon2: -111.14419722, len: 2802, width: 80, surface: "TURF", lighting: "" },
                { id: "12/30", lat1: 45.78808538, lon1: -111.16648172, lat2: 45.77041438, lon2: -111.1418895, len: 8994, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KAVL": {
            officialName: "Asheville Rgnl",
            runways: [
                { id: "17/35", lat1: 35.44642897, lon1: -82.54667986, lat2: 35.42579675, lon2: -82.53741638, len: 8002, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KCHA": {
            officialName: "Lovell Fld",
            runways: [
                { id: "02/20", lat1: 35.02265169, lon1: -85.20750397, lat2: 35.04212386, lon2: -85.20039922, len: 7400, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15/33", lat1: 35.0452288, lon1: -85.20830458, lat2: 35.03260877, lon2: -85.19775005, len: 5575, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KSBN": {
            officialName: "South Bend Intl",
            runways: [
                { id: "09L/27R", lat1: 41.71394238, lon1: -86.32877783, lat2: 41.71419297, lon2: -86.31303394, len: 4300, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "09R/27L", lat1: 41.70432816, lon1: -86.32941613, lat2: 41.70481047, lon2: -86.29861805, len: 8412, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "18/36", lat1: 41.71875413, lon1: -86.31939586, lat2: 41.69927225, lon2: -86.31882583, len: 7101, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KFAT": {
            officialName: "Fresno Yosemite Intl",
            runways: [
                { id: "11L/29R", lat1: 36.78400166, lon1: -119.73008558, lat2: 36.76883966, lon2: -119.70352494, len: 9539, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "11R/29L", lat1: 36.78306158, lon1: -119.73242141, lat2: 36.7703345, lon2: -119.71012227, len: 8008, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KEYW": {
            officialName: "Key West Intl",
            runways: [
                { id: "09/27", lat1: 24.55604569, lon1: -81.767591, lat2: 24.55619336, lon2: -81.75232091, len: 5076, width: 100, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KPSC": {
            officialName: "Tri-Cities",
            runways: [
                { id: "03L/21R", lat1: 46.25595713, lon1: -119.13349163, lat2: 46.27070894, lon2: -119.11167352, len: 7707, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "03R/21L", lat1: 46.26065447, lon1: -119.12201875, lat2: 46.26911866, lon2: -119.10949547, len: 4423, width: 75, surface: "ASPH", lighting: "" },
                { id: "12/30", lat1: 46.27416241, lon1: -119.12893572, lat2: 46.25903411, lon2: -119.10767861, len: 7704, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KMLI": {
            officialName: "Quad Cities Intl",
            runways: [
                { id: "05/23", lat1: 41.44165925, lon1: -90.51577366, lat2: 41.44800408, lon2: -90.50612111, len: 3514, width: 150, surface: "CONC", lighting: "MED" },
                { id: "09/27", lat1: 41.44918577, lon1: -90.52702202, lat2: 41.4486163, lon2: -90.49054597, len: 10002, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 41.45496727, lon1: -90.5154328, lat2: 41.44280216, lon2: -90.49427238, len: 7301, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KDLH": {
            officialName: "Duluth Intl",
            runways: [
                { id: "03/21", lat1: 46.83574061, lon1: -92.18826977, lat2: 46.84910286, lon2: -92.17631191, len: 5719, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "09/27", lat1: 46.84245502, lon1: -92.22029, lat2: 46.8413043, lon2: -92.17800622, len: 10591, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KFSD": {
            officialName: "Joe Foss Fld",
            runways: [
                { id: "03/21", lat1: 43.57261705, lon1: -96.75370416, lat2: 43.59286544, lon2: -96.73427355, len: 9000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "09/27", lat1: 43.57796727, lon1: -96.74753977, lat2: 43.57599566, lon2: -96.73596238, len: 3151, width: 75, surface: "CONC", lighting: "MED" },
                { id: "15/33", lat1: 43.59312769, lon1: -96.74606436, lat2: 43.5732478, lon2: -96.7332783, len: 8000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KISP": {
            officialName: "Long Island Mac Arthur",
            runways: [
                { id: "06/24", lat1: 40.78863616, lon1: -73.11244886, lat2: 40.8022348, lon2: -73.09455744, len: 7006, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15L/33R", lat1: 40.79903427, lon1: -73.09838311, lat2: 40.79287252, lon2: -73.09027402, len: 3175, width: 75, surface: "ASPH", lighting: "" },
                { id: "15R/33L", lat1: 40.80222702, lon1: -73.10733, lat2: 40.7921595, lon2: -73.09409052, len: 5186, width: 150, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KORF": {
            officialName: "Norfolk Intl",
            runways: [
                { id: "05/23", lat1: 36.88586197, lon1: -76.20829486, lat2: 36.90539836, lon2: -76.18943316, len: 9001, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "KECP": {
            officialName: "Northwest Florida Beaches Intl",
            runways: [
                { id: "16/34", lat1: 30.37110458, lon1: -85.80119294, lat2: 30.34537691, lon2: -85.79001283, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KSRQ": {
            officialName: "Sarasota/Bradenton Intl",
            runways: [
                { id: "04/22", lat1: 27.38998541, lon1: -82.55764791, lat2: 27.40082063, lon2: -82.54812658, len: 5006, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "14/32", lat1: 27.40462213, lon1: -82.56564341, lat2: 27.386345, lon2: -82.54471947, len: 9500, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KSDF": {
            officialName: "Louisville Muhammad Ali Intl",
            runways: [
                { id: "11/29", lat1: 38.18022733, lon1: -85.74735052, lat2: 38.17305438, lon2: -85.72382305, len: 7251, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17L/35R", lat1: 38.187299, lon1: -85.73134177, lat2: 38.164556, lon2: -85.72357483, len: 8578, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 38.18698794, lon1: -85.74877958, lat2: 38.15540263, lon2: -85.738358, len: 11887, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KCOS": {
            officialName: "City Of Colorado Springs Muni",
            runways: [
                { id: "13/31", lat1: 38.82315575, lon1: -104.71535466, lat2: 38.80708177, lon2: -104.69486983, len: 8270, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "17L/35R", lat1: 38.81608688, lon1: -104.68573369, lat2: 38.77903091, lon2: -104.68579766, len: 13500, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17R/35L", lat1: 38.82407533, lon1: -104.71589466, lat2: 38.79382447, lon2: -104.71593411, len: 11022, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KHDN": {
            officialName: "Yampa Valley",
            runways: [
                { id: "10/28", lat1: 40.48670158, lon1: -107.23411533, lat2: 40.47565947, lon2: -107.20121741, len: 10000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KMTJ": {
            officialName: "Montrose Rgnl",
            runways: [
                { id: "13/31", lat1: 38.5092243, lon1: -107.90485711, lat2: 38.49356675, lon2: -107.88779161, len: 7510, width: 100, surface: "ASPH", lighting: "HIGH" },
                { id: "17/35", lat1: 38.52983163, lon1: -107.89273986, lat2: 38.50238108, lon2: -107.89262916, len: 10000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KABQ": {
            officialName: "Albuquerque Intl Sunport",
            runways: [
                { id: "03/21", lat1: 35.02224816, lon1: -106.63060152, lat2: 35.04174094, lon2: -106.60707313, len: 10000, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "08/26", lat1: 35.04435266, lon1: -106.6215885, lat2: 35.04406286, lon2: -106.575524, len: 13793, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "12/30", lat1: 35.04353344, lon1: -106.6207515, lat2: 35.03319463, lon2: -106.60514686, len: 6000, width: 150, surface: "CONC", lighting: "MED" }
            ]
        },
        "KAMA": {
            officialName: "Rick Husband Amarillo Intl",
            runways: [
                { id: "04/22", lat1: 35.20511758, lon1: -101.73270036, lat2: 35.23088955, lon2: -101.70020013, len: 13502, width: 200, surface: "CONC", lighting: "HIGH" },
                { id: "13/31", lat1: 35.22969455, lon1: -101.69689002, lat2: 35.21370205, lon2: -101.67900872, len: 7901, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KCRP": {
            officialName: "Corpus Christi Intl",
            runways: [
                { id: "13/31", lat1: 27.77897516, lon1: -97.515549, lat2: 27.76416383, lon2: -97.4993625, len: 7510, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "18/36", lat1: 27.7812978, lon1: -97.49635122, lat2: 27.7645765, lon2: -97.49605936, len: 6080, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KLBB": {
            officialName: "Lubbock Preston Smith Intl",
            runways: [
                { id: "08/26", lat1: 33.66222777, lon1: -101.82289861, lat2: 33.66235583, lon2: -101.79660347, len: 8003, width: 150, surface: "CONC", lighting: "HIGH" },
                { id: "17L/35R", lat1: 33.65981913, lon1: -101.81715466, lat2: 33.65187597, lon2: -101.817096, len: 2891, width: 74, surface: "ASPH", lighting: "" },
                { id: "17R/35L", lat1: 33.68235969, lon1: -101.82903627, lat2: 33.65076227, lon2: -101.82881708, len: 11500, width: 150, surface: "CONC", lighting: "HIGH" }
            ]
        },
        "KMAF": {
            officialName: "Midland Intl Air And Space Port",
            runways: [
                { id: "04/22", lat1: 31.93170275, lon1: -102.20375091, lat2: 31.93920161, lon2: -102.19179438, len: 4605, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "10/28", lat1: 31.94764394, lon1: -102.2163493, lat2: 31.93851308, lon2: -102.19182663, len: 8302, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16L/34R", lat1: 31.94623669, lon1: -102.19746138, lat2: 31.93457961, lon2: -102.19678377, len: 4247, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "16R/34L", lat1: 31.95940544, lon1: -102.2055163, lat2: 31.93339008, lon2: -102.20286958, len: 9501, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KOAK": {
            officialName: "Oakland San Francisco Bay",
            runways: [
                { id: "10L/28R", lat1: 37.73046922, lon1: -122.22218005, lat2: 37.72481455, lon2: -122.20470872, len: 5457, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "10R/28L", lat1: 37.72870822, lon1: -122.22590241, lat2: 37.72227386, lon2: -122.2060093, len: 6213, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "12/30", lat1: 37.72006261, lon1: -122.24211511, lat2: 37.70149319, lon2: -122.21425797, len: 10520, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15/33", lat1: 37.74029261, lon1: -122.22280947, lat2: 37.73136275, lon2: -122.21967391, len: 3376, width: 75, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KPSP": {
            officialName: "Palm Springs Intl",
            runways: [
                { id: "13L/31R", lat1: 33.83516747, lon1: -116.50966841, lat2: 33.8242425, lon2: -116.49994511, len: 4953, width: 75, surface: "ASPH", lighting: "MED" },
                { id: "13R/31L", lat1: 33.84068222, lon1: -116.51744658, lat2: 33.8186215, lon2: -116.49781438, len: 10000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KSBA": {
            officialName: "Santa Barbara Muni",
            runways: [
                { id: "07/25", lat1: 34.427499, lon1: -119.85464161, lat2: 34.42791763, lon2: -119.83457877, len: 6052, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "15L/33R", lat1: 34.43078061, lon1: -119.84036891, lat2: 34.41965252, lon2: -119.83693927, len: 4180, width: 75, surface: "ASPH", lighting: "" },
                { id: "15R/33L", lat1: 34.43054038, lon1: -119.84153694, lat2: 34.41940166, lon2: -119.8381015, len: 4184, width: 100, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KSTS": {
            officialName: "Charles M Schulz/Sonoma County",
            runways: [
                { id: "02/20", lat1: 38.50316516, lon1: -122.82096344, lat2: 38.515636, lon2: -122.81210077, len: 5202, width: 100, surface: "ASPH", lighting: "MED" },
                { id: "14/32", lat1: 38.51751761, lon1: -122.81381622, lat2: 38.50233066, lon2: -122.80568761, len: 6000, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KEUG": {
            officialName: "Mahlon Sweet Fld",
            runways: [
                { id: "16L/34R", lat1: 44.13297441, lon1: -123.20272913, lat2: 44.11651711, lon2: -123.20248516, len: 6000, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "16R/34L", lat1: 44.13544855, lon1: -123.219148, lat2: 44.11347969, lon2: -123.218816, len: 8009, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        },
        "KRDM": {
            officialName: "Roberts Fld/Redmond Muni",
            runways: [
                { id: "05/23", lat1: 44.24950936, lon1: -121.16178461, lat2: 44.25905422, lon2: -121.13844225, len: 7038, width: 150, surface: "ASPH", lighting: "HIGH" },
                { id: "11/29", lat1: 44.25893097, lon1: -121.16117794, lat2: 44.24877677, lon2: -121.13847961, len: 7006, width: 100, surface: "ASPH", lighting: "MED" }
            ]
        },
        "KOA": {
            officialName: "Ellison Onizuka Kona Intl At Keahole",
            runways: [
                { id: "17/35", lat1: 19.75385525, lon1: -156.04428863, lat2: 19.72367472, lon2: -156.04697358, len: 11000, width: 150, surface: "ASPH-CONC", lighting: "HIGH" }
            ]
        },
        "LIH": {
            officialName: "Lihue",
            runways: [
                { id: "03/21", lat1: 21.97290452, lon1: -159.34881791, lat2: 21.98555494, lon2: -159.33525175, len: 6500, width: 150, surface: "ASPH", lighting: "MED" },
                { id: "17/35", lat1: 21.98168344, lon1: -159.3358788, lat2: 21.96379008, lon2: -159.3358825, len: 6500, width: 150, surface: "ASPH", lighting: "HIGH" }
            ]
        }
    };

