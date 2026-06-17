const { getKeralaStations, getKeralaCorridor, OFFLINE_STATIONS, OFFLINE_CORRIDOR } = require('./osm');
const { getTrainsAtStation, getLiveTrainStatus } = require('./api');

let state = {
  stations: [],
  corridor: [],
  trains: [],
  lastUpdated: null,
  status: 'initializing', // 'initializing', 'live', 'error'
  isSimulated: false,
  activeScenario: null
};

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

function getDisasterCenter(scenarioId) {
  if (scenarioId === 'WZ-Kerala') return [9.9816, 76.2999]; // Ernakulam
  if (scenarioId === 'WZ-Konkan') return [11.9, 75.3]; // North Kerala
  if (scenarioId === 'WZ-Northeast') return [11.5, 76.0]; // Wayanad/Storm
  if (scenarioId === 'WZ-Rajasthan') return [10.5, 76.2]; // Palakkad Gap
  return null;
}

function tickSimulation() {
  simulatedTrains.forEach(train => {
    const coords = ROUTES[train.routeId];
    if (!coords || coords.length === 0) return;

    let speedMultiplier = 1;
    if (state.activeScenario) {
      const center = getDisasterCenter(state.activeScenario.id);
      if (center) {
        const dist = Math.sqrt(Math.pow(train.lat - center[0], 2) + Math.pow(train.lng - center[1], 2));
        if (dist < 0.35) { // Impact radius of ~35km
          if (state.activeScenario.id === 'WZ-Kerala' || state.activeScenario.id === 'WZ-Konkan') {
            train.status = 'stopped';
            speedMultiplier = 0;
            train.delay = Math.min(train.delay + 2, 120);
          } else {
            train.status = 'delayed';
            speedMultiplier = 0.25;
            train.delay = Math.min(train.delay + 1, 75);
          }
        } else {
          train.status = train.delay > 15 ? 'delayed' : 'on-time';
        }
      }
    } else {
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
  const stations = await getKeralaStations();
  const corridor = await getKeralaCorridor();

  if (stations === OFFLINE_STATIONS || corridor === OFFLINE_CORRIDOR || !stations.length || !corridor.length) {
    console.log("OSM fallback detected. Aligning by using offline fallback for both.");
    state.stations = OFFLINE_STATIONS;
    state.corridor = OFFLINE_CORRIDOR;
  } else {
    state.stations = stations;
    state.corridor = corridor;
  }

  console.log(`Loaded ${state.stations.length} stations and ${state.corridor.length} rail segments.`);

  if (state.stations.length > 0) {
    pollLiveTrains();
    setInterval(pollLiveTrains, 60 * 1000);
    // Run simulation tick loop every 2.5 seconds
    setInterval(() => {
      if (state.isSimulated || state.trains.length === 0) {
        initSimulation();
        tickSimulation();
      }
    }, 2500);
  } else {
    state.status = 'error';
    console.error("Failed to load OSM data.");
  }
}

async function pollLiveTrains() {
  console.log("Polling live train data...");
  const activeTrainNumbers = new Set();
  const topStations = state.stations.slice(0, 10);
  let successCount = 0;

  for (const station of topStations) {
    const trains = await getTrainsAtStation(station.code);
    if (trains.length > 0) successCount++;
    trains.forEach(t => activeTrainNumbers.add(t));
  }

  if (successCount === 0) {
    console.log("Live API offline. Bypassing to Simulation Fallback.");
    initSimulation();
    state.status = 'live';
    return;
  }

  console.log(`Discovered ${activeTrainNumbers.size} live trains.`);
  const liveTrains = [];
  for (const trainNo of activeTrainNumbers) {
    const status = await getLiveTrainStatus(trainNo);
    if (status) liveTrains.push(status);
  }

  state.trains = liveTrains;
  state.isSimulated = false;
  state.lastUpdated = new Date().toISOString();
  state.status = 'live';
}

function getState() {
  if (state.isSimulated) {
    return {
      ...state,
      stations: OFFLINE_STATIONS,
      corridor: OFFLINE_CORRIDOR
    };
  }
  return state;
}

function setDisaster(scenario) {
  state.activeScenario = scenario;
  console.log("Active scenario updated:", scenario ? scenario.name : "none");
}

module.exports = { initEngine, getState, setDisaster };

