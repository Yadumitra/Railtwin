const { getKeralaStations, OFFLINE_STATIONS, OFFLINE_CORRIDOR } = require('./osm');
const { getTrainsAtStation, getLiveTrainStatus, getAllLiveTrains } = require('./api');

let state = {
  stations: [],
  trains: [],
  lastUpdated: null,
  status: 'initializing', // 'initializing', 'live', 'error'
  isSimulated: false
};

const axios = require('axios');
let lastWeatherUpdate = 0;
let weatherCache = new Map(); // coordinate string -> weather data

async function attachLiveWeather(trains) {
  const now = Date.now();
  // Poll Open-Meteo every 15 minutes (900000 ms)
  if (now - lastWeatherUpdate > 900000) {
    console.log("Polling live meteorological data for active zones...");
    
    const coordsMap = new Map();
    for (const t of trains) {
      if (t.baseLat && t.baseLng) {
        coordsMap.set(`${t.baseLat},${t.baseLng}`, { lat: t.baseLat, lng: t.baseLng });
      }
    }
    
    const uniqueCoords = Array.from(coordsMap.values());
    if (uniqueCoords.length > 0) {
      const chunks = [];
      for (let i = 0; i < uniqueCoords.length; i += 50) {
        chunks.push(uniqueCoords.slice(i, i + 50));
      }
      
      weatherCache.clear();
      
      for (const chunk of chunks) {
        const lats = chunk.map(c => c.lat).join(',');
        const lngs = chunk.map(c => c.lng).join(',');
        try {
           const res = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=precipitation,weather_code,wind_speed_10m`);
           const dataArray = Array.isArray(res.data) ? res.data : [res.data];
           
           dataArray.forEach((d, index) => {
             const c = chunk[index];
             weatherCache.set(`${c.lat},${c.lng}`, {
               precipitation: d.current.precipitation,
               windSpeed: d.current.wind_speed_10m
             });
           });
        } catch (err) {
           console.error("Open-Meteo fetch error:", err.message);
        }
      }
      lastWeatherUpdate = now;
      console.log(`Weather updated for ${uniqueCoords.length} unique coordinates.`);
    }
  }
  
  // Attach cached weather
  for (const t of trains) {
     if (t.baseLat && t.baseLng) {
        const w = weatherCache.get(`${t.baseLat},${t.baseLng}`);
        if (w) {
           t.precipitation = w.precipitation;
           t.windSpeed = w.windSpeed;
           t.weatherRisk = false;
           // If rain > 10mm/h (heavy) or wind > 60km/h
           if (w.precipitation >= 10 || w.windSpeed >= 60) {
              t.weatherRisk = true;
              t.riskScore = Math.max(t.riskScore || 0, 85);
              if (t.status === 'on-time') t.status = 'delayed';
           }
        }
     }
  }
}

const MOCK_TRAIN_NAMES = [
  { id: "12626", name: "Kerala Express" },
  { id: "20633", name: "TVC - Kasaragod Vande Bharat" },
  { id: "16348", name: "Nilambur - Shoranur Express" },
  { id: "12076", name: "Kozhikode Jan Shatabdi" },
  { id: "16604", name: "Maveli Express" },
  { id: "16343", name: "Amritha Express" },
  { id: "16629", name: "Malabar Express" },
  { id: "12617", name: "Mangala Lakshadweep Express" },
  { id: "16307", name: "Executive Express" },
  { id: "12678", name: "Ernakulam Intercity" },
  { id: "16382", name: "Kanyakumari Express" },
  { id: "16527", name: "Yesvantpur Express" }
];

let simulatedTrains = [];
const ROUTES = {};

function getClosestStationName(lat, lng) {
  const stations = state.isSimulated ? OFFLINE_STATIONS : (state.stations.length > 0 ? state.stations : OFFLINE_STATIONS);
  let closest = "Unknown";
  let minC = Infinity;
  for (const s of stations) {
    const dist = Math.sqrt(Math.pow(lat - s.lat, 2) + Math.pow(lng - s.lng, 2));
    if (dist < minC) {
      minC = dist;
      closest = s.name;
    }
  }
  return closest;
}

function initSimulation() {
  if (simulatedTrains.length > 0) return;

  // Compile continuous routes by concatenating the high-fidelity segments from OFFLINE_CORRIDOR
  ROUTES["R0"] = [
    ...OFFLINE_CORRIDOR[0], // Segment A (Kasaragod -> Shoranur)
    ...OFFLINE_CORRIDOR[1].slice(1), // Segment B (Shoranur -> Ernakulam)
    ...OFFLINE_CORRIDOR[2].slice(1), // Segment C (Ernakulam -> Alappuzha -> Kayamkulam)
    ...OFFLINE_CORRIDOR[4].slice(1)  // Segment E (Kayamkulam -> Trivandrum)
  ];
  ROUTES["R1"] = [
    ...[...OFFLINE_CORRIDOR[4]].reverse(), // Segment E reversed (Trivandrum -> Kayamkulam)
    ...[...OFFLINE_CORRIDOR[3]].reverse().slice(1), // Segment D reversed (Kayamkulam -> Kottayam -> Ernakulam)
    ...[...OFFLINE_CORRIDOR[1]].reverse().slice(1), // Segment B reversed (Ernakulam -> Shoranur)
    ...[...OFFLINE_CORRIDOR[0]].reverse().slice(1)  // Segment A reversed (Shoranur -> Kasaragod)
  ];
  ROUTES["R2"] = [ // Nilambur Road to Ernakulam
    ...[...OFFLINE_CORRIDOR[5]].reverse(), // Segment F reversed (Nilambur -> Shoranur)
    ...OFFLINE_CORRIDOR[1].slice(1) // Segment B (Shoranur -> Ernakulam)
  ];
  ROUTES["R3"] = [ // Punalur to Trivandrum
    ...[...OFFLINE_CORRIDOR[6]].reverse(), // Segment G reversed (Punalur -> Kollam)
    ...OFFLINE_CORRIDOR[4].slice(1) // Segment E from Kollam onwards
  ];
  ROUTES["R4"] = [ // Shoranur to Trivandrum via Kottayam
    ...OFFLINE_CORRIDOR[1], // Shoranur -> Ernakulam
    ...OFFLINE_CORRIDOR[3].slice(1), // Ernakulam -> Kottayam -> Kayamkulam
    ...OFFLINE_CORRIDOR[4].slice(1) // Kayamkulam -> Trivandrum
  ];
  ROUTES["R5"] = [ // Trivandrum to Ernakulam via Alappuzha
    ...[...OFFLINE_CORRIDOR[4]].reverse(), // Trivandrum -> Kayamkulam
    ...[...OFFLINE_CORRIDOR[2]].reverse().slice(1) // Kayamkulam -> Alappuzha -> Ernakulam
  ];

  simulatedTrains = MOCK_TRAIN_NAMES.map((t, i) => {
    const routeId = `R${i % 6}`;
    const coords = ROUTES[routeId];
    const startProgress = Math.floor((i / MOCK_TRAIN_NAMES.length) * coords.length) % coords.length;
    const direction = i % 2 === 0 ? 1 : -1;
    const p = coords[startProgress];

    return {
      id: t.id,
      name: t.name,
      status: 'on-time',
      delay: 0,
      passengers: Math.floor(Math.random() * 500) + 200,
      routeId: routeId,
      progress: startProgress,
      routeDirection: direction,
      speed: 0.04 + Math.random() * 0.06,
      lat: p[0],
      lng: p[1],
      lastStation: getClosestStationName(p[0], p[1])
    };
  });
  state.isSimulated = true;
  console.log("Initialized fail-safe route-following simulation with 12 trains.");
}

// Disaster simulation removed in favor of live weather

function tickSimulation() {
  simulatedTrains.forEach(train => {
    const coords = ROUTES[train.routeId];
    if (!coords || coords.length === 0) return;

    let speedMultiplier = 1;
    if (train.status === 'stopped') {
      train.status = 'on-time';
      train.delay = 0;
    }
    if (Math.random() < 0.01) {
      train.status = 'delayed';
      train.delay = Math.floor(Math.random() * 20) + 10;
    } else if (Math.random() < 0.005) {
      train.status = 'on-time';
      train.delay = 0;
    }

    train.progress += train.routeDirection * train.speed * speedMultiplier;

    if (train.progress >= coords.length - 1) {
      train.progress = coords.length - 1;
      train.routeDirection = -1;
    } else if (train.progress <= 0) {
      train.progress = 0;
      train.routeDirection = 1;
    }

    const idx1 = Math.floor(train.progress);
    const idx2 = Math.min(Math.ceil(train.progress), coords.length - 1);
    const fraction = train.progress - idx1;

    const p1 = coords[idx1];
    const p2 = coords[idx2];

    train.lat = p1[0] + (p2[0] - p1[0]) * fraction;
    train.lng = p1[1] + (p2[1] - p1[1]) * fraction;
    train.lastStation = getClosestStationName(train.lat, train.lng);
  });

  state.trains = simulatedTrains;
  state.lastUpdated = new Date().toISOString();
}

async function initEngine() {
  console.log("Fetching static OSM geometry for Kerala...");
  state.stations = await getKeralaStations();
  console.log(`Loaded ${state.stations.length} major stations.`);
  
  if (state.stations.length > 0) {
    pollLiveTrains();
    setInterval(pollLiveTrains, 60 * 1000); // Poll every 60s
  } else {
    state.status = 'error';
    console.error("Failed to load OSM data.");
  }
}

async function pollLiveTrains() {
  console.log("Polling live train data...");
  const activeTrainNumbers = new Set();
  
  // Pick 10 random stations to discover trains across Kerala without hitting rate limits
  const randomStations = [...state.stations].sort(() => 0.5 - Math.random()).slice(0, 20);
  
  let successCount = 0;

  for (const station of randomStations) {
    const trains = await getTrainsAtStation(station.code, station.lat, station.lng);
    if (trains.length > 0) successCount++;
    trains.forEach(t => activeTrainNumbers.add(t));
  }

  if (successCount === 0) {
    console.log("Live API offline. Bypassing to Simulation Fallback.");
    initSimulation();
    state.status = 'live';
    return;
  }

  // The activeTrainNumbers set only holds the trains we literally *just* polled this minute.
  // We need to fetch ALL trains from the cache to persist them on the map.
  const liveTrains = getAllLiveTrains();
  console.log(`Tracking ${liveTrains.length} total live trains.`);

  await attachLiveWeather(liveTrains);

  state.trains = liveTrains;
  state.isSimulated = false;
  state.lastUpdated = new Date().toISOString();
  state.status = 'live';
}

// Tick loop to animate trains smoothly towards their detected target stations
function tickLiveTrains() {
  if (state.isSimulated) return;

  let moved = false;
  state.trains.forEach(t => {
     if (t.baseLat && t.baseLng) {
        // Calculate distance to target base station
        const latDiff = t.baseLat - t.lat;
        const lngDiff = t.baseLng - t.lng;
        
        // If distance is significant, animate towards it
        // A train moves roughly 0.0005 degrees per second (approx 50m/s)
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        if (distance > 0.001) {
           moved = true;
           const speed = t.status === 'delayed' ? 0.0002 : 0.0005; 
           const ratio = speed / distance;
           
           // Ensure we don't overshoot
           if (ratio >= 1) {
              t.lat = t.baseLat;
              t.lng = t.baseLng;
           } else {
              t.lat += latDiff * ratio;
              t.lng += lngDiff * ratio;
           }
        } else {
           // Snap if very close
           t.lat = t.baseLat;
           t.lng = t.baseLng;
        }
     }
  });

  if (moved) {
     state.lastUpdated = new Date().toISOString();
  }
}

function getState() {
  if (state.isSimulated) {
    tickSimulation(); // Progress simulation strictly when state is requested
    return {
      ...state,
      stations: OFFLINE_STATIONS,
      corridor: OFFLINE_CORRIDOR
    };
  }
  tickLiveTrains(); // Animate real trains
  return state;
}

module.exports = { initEngine, getState };
