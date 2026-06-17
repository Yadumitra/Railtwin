const { getKeralaStations } = require('./osm');
const { getTrainsAtStation, getLiveTrainStatus } = require('./api');

let state = {
  stations: [],
  trains: [],
  lastUpdated: null,
  status: 'initializing' // 'initializing', 'live', 'error'
};

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
  const randomStations = [...state.stations].sort(() => 0.5 - Math.random()).slice(0, 10);
  
  let successCount = 0;

  for (const station of randomStations) {
    const trains = await getTrainsAtStation(station.code, station.lat, station.lng);
    if (trains.length > 0) successCount++;
    trains.forEach(t => activeTrainNumbers.add(t));
  }

  if (successCount === 0) {
    console.log("No live data available from API right now.");
    state.status = 'error';
    state.trains = []; // Honest empty state
    return;
  }

  console.log(`Discovered ${activeTrainNumbers.size} live trains. Fetching live status...`);
  
  const liveTrains = [];
  for (const trainNo of activeTrainNumbers) {
    const status = await getLiveTrainStatus(trainNo);
    if (status) liveTrains.push(status);
  }

  state.trains = liveTrains;
  state.lastUpdated = new Date().toISOString();
  state.status = 'live';
  console.log(`Poll complete. ${liveTrains.length} trains live on map.`);
}

function getState() {
  return state;
}

module.exports = { initEngine, getState };
