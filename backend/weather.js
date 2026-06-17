const axios = require('axios');

// In-memory weather cache: key -> { data, timestamp }
const weatherCache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Active simulation scenario state
let activeScenario = null;

function setActiveScenario(scenario) {
  activeScenario = scenario;
  // Clear cache when scenario changes to ensure immediate update across the map
  weatherCache.clear();
  console.log(`[Weather] Active scenario updated to: ${JSON.stringify(scenario)}`);
}

function getActiveScenario() {
  return activeScenario;
}

/**
 * Returns weather overrides based on active disaster simulation scenario.
 */
function getScenarioWeather(scenarioId) {
  switch (scenarioId) {
    case 'WZ-Kerala': // Kerala Flood
      return {
        temperature: 24,
        precipitation: 82.5,
        rain: 82.5,
        windSpeed: 42.0,
        isSimulated: true,
        scenarioName: 'Kerala Flood Simulation'
      };
    case 'WZ-Konkan': // Konkan Landslide
      return {
        temperature: 21,
        precipitation: 64.0,
        rain: 64.0,
        windSpeed: 25.0,
        isSimulated: true,
        scenarioName: 'Konkan Landslide Simulation'
      };
    case 'WZ-Northeast': // Northeast Storm
      return {
        temperature: 19,
        precipitation: 48.0,
        rain: 48.0,
        windSpeed: 88.0,
        isSimulated: true,
        scenarioName: 'Northeast Storm Simulation'
      };
    case 'WZ-Rajasthan': // Rajasthan Sandstorm
      return {
        temperature: 39,
        precipitation: 0.0,
        rain: 0.0,
        windSpeed: 72.0,
        isSimulated: true,
        scenarioName: 'Rajasthan Sandstorm Simulation'
      };
    default:
      return null;
  }
}

/**
 * Returns a mock weather structure in case of network failure or offline demo environments.
 */
function getSimulatedWeather(lat, lng) {
  const seed = (Math.abs(lat) + Math.abs(lng)) % 10;
  const isRainy = seed > 4; // 50% chance of rain in Kerala simulation
  
  const temp = Math.round(26 + (seed % 6)); // 26°C to 32°C
  const wind = Math.round(5 + (seed * 3)); // 5 to 35 km/h
  const rain = isRainy ? Math.round((seed * 3.5) * 10) / 10 : 0.0; // 0 or up to 31.5mm
  
  return {
    temperature: temp,
    precipitation: rain,
    rain: rain,
    windSpeed: wind,
    isSimulated: true
  };
}

/**
 * Fetches current weather from Open-Meteo for a given latitude and longitude.
 * Includes caching, scenario overrides, and simulated fallbacks.
 */
async function getWeather(lat = 10.8505, lng = 76.2711) {
  // 1. Check if a disaster scenario is active to override weather variables
  if (activeScenario && activeScenario.id) {
    const scenarioWeather = getScenarioWeather(activeScenario.id);
    if (scenarioWeather) {
      return scenarioWeather;
    }
  }

  // 2. Resolve cached coordinate data
  const cacheKey = `${parseFloat(lat).toFixed(1)},${parseFloat(lng).toFixed(1)}`;
  const now = Date.now();

  if (weatherCache.has(cacheKey)) {
    const cached = weatherCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_DURATION_MS) {
      return cached.data;
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,rain,wind_speed_10m&timezone=auto`;
    const res = await axios.get(url, { timeout: 3500 });
    
    if (res.data && res.data.current) {
      const current = res.data.current;
      const data = {
        temperature: current.temperature_2m ?? 28.0,
        precipitation: current.precipitation ?? 0.0,
        rain: current.rain ?? 0.0,
        windSpeed: current.wind_speed_10m ?? 10.0,
        isSimulated: false
      };
      
      weatherCache.set(cacheKey, { data, timestamp: now });
      return data;
    }
    
    throw new Error('Invalid Open-Meteo response structure');
  } catch (err) {
    const simulated = getSimulatedWeather(lat, lng);
    weatherCache.set(cacheKey, { data: simulated, timestamp: now - CACHE_DURATION_MS + 60000 });
    return simulated;
  }
}

module.exports = {
  getWeather,
  setActiveScenario,
  getActiveScenario
};
