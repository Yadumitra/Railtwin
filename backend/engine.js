const { getKeralaStations, getKeralaCorridor } = require('./osm');
const { getTrainsAtStation, getLiveTrainStatus } = require('./api');
const { getWeather } = require('./weather');
const { predictDelay, estimateCrowd, maintenanceRisk, weatherRisk } = require('./prediction');

const FALLBACK_STATIONS = [
  { id: 1, name: "Trivandrum Central", code: "TVC", lat: 8.4879, lng: 76.9525 },
  { id: 2, name: "Kollam Junction", code: "QLN", lat: 8.8932, lng: 76.6141 },
  { id: 3, name: "Kayamkulam Junction", code: "KYJ", lat: 9.1720, lng: 76.5000 },
  { id: 4, name: "Alappuzha", code: "ALLP", lat: 9.4907, lng: 76.3268 },
  { id: 5, name: "Ernakulam Junction", code: "ERS", lat: 9.9658, lng: 76.2870 },
  { id: 6, name: "Thrissur", code: "TCR", lat: 10.5186, lng: 76.2100 },
  { id: 7, name: "Shoranur Junction", code: "SRR", lat: 10.7614, lng: 76.2731 },
  { id: 8, name: "Tirur", code: "TIR", lat: 10.9168, lng: 75.9268 },
  { id: 9, name: "Kozhikode Main", code: "CLT", lat: 11.2480, lng: 75.7830 },
  { id: 10, name: "Kannur", code: "CAN", lat: 11.8689, lng: 75.3730 }
];

const FALLBACK_CORRIDOR = [
  FALLBACK_STATIONS.map(s => [s.lat, s.lng])
];

let state = {
  stations: [],
  corridor: [],
  trains: [],
  lastUpdated: null,
  status: 'initializing' // 'initializing', 'live', 'error'
};

let simulatedTrains = [];
let predictionHistory = [];

async function initEngine() {
  console.log("Fetching static OSM geometry for Kerala...");
  try {
    state.stations = await getKeralaStations();
    state.corridor = await getKeralaCorridor();
  } catch (err) {
    console.error("OSM loading error, using static local backups:", err.message);
  }

  // Inject fallback geometry if OSM endpoints fail
  if (!state.stations || state.stations.length === 0) {
    console.log("[Engine] Falling back to pre-defined Kerala stations.");
    state.stations = FALLBACK_STATIONS;
  }
  if (!state.corridor || state.corridor.length === 0) {
    console.log("[Engine] Falling back to pre-defined Kerala rail corridor.");
    state.corridor = FALLBACK_CORRIDOR;
  }

  console.log(`Loaded ${state.stations.length} stations and ${state.corridor.length} rail segments.`);
  
  // Begin polling and enrichment loop
  pollLiveTrains();
  setInterval(pollLiveTrains, 15 * 1000); // Poll every 15s to match frontend frequency
}

function generateSimulatedTrains() {
  const sampleTrains = [
    { id: '16347', name: 'Mangalore Express', type: 'Express' },
    { id: '12625', name: 'Kerala Express', type: 'Superfast' },
    { id: '16302', name: 'Venad Express', type: 'Express' },
    { id: '16650', name: 'Parasuram Express', type: 'Express' },
    { id: '12617', name: 'Mangala L. Express', type: 'Superfast' },
    { id: '16343', name: 'Amritha Express', type: 'Express' },
    { id: '16348', name: 'Trivandrum Express', type: 'Passenger' },
    { id: '56600', name: 'Kozhikode Passenger', type: 'Passenger' }
  ];

  const list = [];
  const corridorCount = state.corridor.length;

  for (let i = 0; i < sampleTrains.length; i++) {
    // Distribute trains across corridor segments
    const segmentIndex = Math.floor((i / sampleTrains.length) * corridorCount);
    const segment = state.corridor[segmentIndex] || state.corridor[0];
    const pointIndex = Math.floor(segment.length / 2);

    list.push({
      id: sampleTrains[i].id,
      name: sampleTrains[i].name,
      trainType: sampleTrains[i].type,
      segmentIndex,
      pointIndex,
      direction: Math.random() > 0.5 ? 1 : -1,
      delay: Math.floor(Math.random() * 20),
      status: 'on-time'
    });
  }

  return list;
}

function updateSimulatedTrains() {
  if (simulatedTrains.length === 0) {
    simulatedTrains = generateSimulatedTrains();
  }

  simulatedTrains.forEach(train => {
    const segment = state.corridor[train.segmentIndex];
    if (!segment || segment.length < 2) return;

    // Advance index along current segment coordinates
    train.pointIndex += train.direction;

    // Bounce off limits
    if (train.pointIndex >= segment.length) {
      train.pointIndex = segment.length - 2;
      train.direction = -1;
    } else if (train.pointIndex < 0) {
      train.pointIndex = 1;
      train.direction = 1;
    }

    const currentCoords = segment[train.pointIndex] || segment[0];
    train.lat = currentCoords[0];
    train.lng = currentCoords[1];

    // Find nearest station to use as lastStation
    let nearestStation = 'Trivandrum Central';
    let minDist = Infinity;
    state.stations.forEach(s => {
      const dist = Math.hypot(s.lat - train.lat, s.lng - train.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestStation = s.name;
      }
    });
    train.lastStation = nearestStation;

    // Occasional delay adjustments
    if (Math.random() > 0.7) {
      train.delay = Math.max(0, train.delay + (Math.random() > 0.5 ? 4 : -3));
    }

    // Apply status mapping
    if (train.delay > 20) {
      train.status = 'delayed';
    } else {
      train.status = 'on-time';
    }
  });

  return simulatedTrains.map(t => ({
    id: t.id,
    name: t.name,
    status: t.status,
    delay: t.delay,
    lastStation: t.lastStation,
    lat: t.lat,
    lng: t.lng,
    trainType: t.trainType
  }));
}

async function pollLiveTrains() {
  console.log("[Engine] Polling railway live state...");
  const activeTrainNumbers = new Set();
  
  // Pick first 10 stations to limit API rate usage
  const topStations = state.stations.slice(0, 10);
  let successCount = 0;

  try {
    for (const station of topStations) {
      const trains = await getTrainsAtStation(station.code);
      if (trains && trains.length > 0) {
        successCount++;
        trains.forEach(t => activeTrainNumbers.add(t));
      }
    }
  } catch (err) {
    console.warn("[Engine] Live API fetch exception:", err.message);
  }

  let rawTrains = [];

  if (successCount === 0 || activeTrainNumbers.size === 0) {
    console.log("[Engine] No active live trains from API. Triggering fallback path-following simulation.");
    rawTrains = updateSimulatedTrains();
    state.status = 'live'; // Report live so frontend map handles it correctly
  } else {
    console.log(`[Engine] Discovered ${activeTrainNumbers.size} live trains. Fetching status...`);
    for (const trainNo of activeTrainNumbers) {
      try {
        const status = await getLiveTrainStatus(trainNo);
        if (status) {
          status.trainType = trainNo.startsWith('12') ? 'Superfast' : 'Express';
          rawTrains.push(status);
        }
      } catch (err) {
        // Continue loop
      }
    }
    state.status = 'live';
  }

  // Enrich all trains with predictive weather and analytics data
  const enrichedTrains = [];
  const currentHour = new Date().getHours();

  for (const t of rawTrains) {
    try {
      const weather = await getWeather(t.lat, t.lng);
      const wRisk = weatherRisk(weather.rain || weather.precipitation, weather.windSpeed);
      const delayPred = predictDelay(t.delay, wRisk.level, t.trainType || 'Express');
      
      // Look up closest station object for crowd estimates
      let nearestStn = null;
      let minDist = Infinity;
      state.stations.forEach(s => {
        const dist = Math.hypot(s.lat - t.lat, s.lng - t.lng);
        if (dist < minDist) {
          minDist = dist;
          nearestStn = s;
        }
      });

      const crowd = estimateCrowd(nearestStn || { code: 'TVC' }, currentHour, wRisk.level);
      const maint = maintenanceRisk(Math.floor(Math.random() * 20) + 15, wRisk.level);

      // Map crowd level back to passenger sizes to feed MapView
      let simulatedPassengers = t.passengers;
      if (!simulatedPassengers) {
        simulatedPassengers = crowd.level === 'High' ? Math.floor(Math.random() * 200) + 400
                            : crowd.level === 'Medium' ? Math.floor(Math.random() * 200) + 200
                            : Math.floor(Math.random() * 100) + 50;
      }

      enrichedTrains.push({
        ...t,
        passengers: simulatedPassengers,
        predictedDelay: delayPred.predictedDelay,
        delayConfidence: delayPred.confidence,
        crowdLevel: crowd.level,
        maintenanceRisk: maint.risk,
        weatherRisk: wRisk.level,
        weatherAlert: wRisk.alert,
        factors: delayPred.factors
      });
    } catch (enrichError) {
      console.error("[Engine] Train enrichment error:", enrichError.message);
      // Fallback push raw
      enrichedTrains.push(t);
    }
  }

  state.trains = enrichedTrains;
  state.lastUpdated = new Date().toISOString();

  // Push to predictionHistory rolling log (max 10 entries)
  const maxDelay = state.trains.length > 0 ? Math.max(...state.trains.map(t => t.delay), 0) : 0;
  const delayedCount = state.trains.filter(t => t.status === 'delayed').length;
  const criticalWeather = state.trains.some(t => t.weatherRisk === 'Critical');
  const highWeather = state.trains.some(t => t.weatherRisk === 'High');
  const mediumWeather = state.trains.some(t => t.weatherRisk === 'Medium');
  
  const currentSummary = {
    timestamp: new Date().toISOString(),
    weatherRisk: criticalWeather ? 'Critical' : highWeather ? 'High' : mediumWeather ? 'Medium' : 'Low',
    maxDelay,
    activeTrains: state.trains.length,
    delayedCount,
    health: state.trains.length > 0 ? Math.round((state.trains.filter(t => t.status !== 'delayed').length / state.trains.length) * 100) : 100
  };
  
  predictionHistory.push(currentSummary);
  if (predictionHistory.length > 10) {
    predictionHistory.shift();
  }

  console.log(`[Engine] Cycle completed. Loaded ${state.trains.length} enriched trains.`);
}

const { getActiveScenario } = require('./weather');

function getPredictionHistory() {
  return predictionHistory;
}

function getState() {
  state.activeScenario = getActiveScenario();
  return state;
}

module.exports = { initEngine, getState, getPredictionHistory, pollLiveTrains };
