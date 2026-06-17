const { getKeralaStations, getKeralaCorridor } = require('./osm');
const { getTrainsAtStation, getLiveTrainStatus } = require('./api');

let state = {
  stations: [],
  corridor: [],
  trains: [],
  lastUpdated: null,
  status: 'initializing' // 'initializing', 'live', 'error'
};

async function initEngine() {
  console.log("Fetching static OSM geometry for Kerala...");
  state.stations = await getKeralaStations();
  state.corridor = await getKeralaCorridor();
  console.log(`Loaded ${state.stations.length} stations and ${state.corridor.length} rail segments.`);
  
  if (state.stations.length > 0) {
    pollLiveTrains();
    setInterval(pollLiveTrains, 60 * 1000); // Poll every 60s as requested
  } else {
    state.status = 'error';
    console.error("Failed to load OSM data.");
  }
}

async function pollLiveTrains() {
  console.log("Polling live train data...");
  const activeTrainNumbers = new Set();
  
  // Pick top 10 stations to avoid extreme rate limits
  const topStations = state.stations.slice(0, 10);
  
  let successCount = 0;

  for (const station of topStations) {
    const trains = await getTrainsAtStation(station.code);
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
