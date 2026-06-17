const express = require('express');
const cors = require('cors');
const { initEngine, getState, pollLiveTrains } = require('./engine');
const { getWeather } = require('./weather');
const { predictDelay, estimateCrowd, maintenanceRisk, weatherRisk } = require('./prediction');

const app = express();
app.use(cors());
app.use(express.json());

// Main state endpoint
app.get('/api/state', (req, res) => {
  res.json(getState());
});

// GET /api/weather-risk
app.get('/api/weather-risk', async (req, res) => {
  const lat = parseFloat(req.query.lat) || 10.8505;
  const lng = parseFloat(req.query.lng) || 76.2711;
  const weather = await getWeather(lat, lng);
  const risk = weatherRisk(weather.rain || weather.precipitation, weather.windSpeed);
  res.json({
    latitude: lat,
    longitude: lng,
    temperature: weather.temperature,
    rainfall: weather.rain || weather.precipitation,
    windSpeed: weather.windSpeed,
    weatherRisk: risk.level,
    weatherScore: risk.score,
    alertMessage: risk.alert,
    isSimulated: weather.isSimulated
  });
});

// GET /api/crowd-level
app.get('/api/crowd-level', async (req, res) => {
  const stationCode = (req.query.stationCode || '').toUpperCase();
  const state = getState();
  const station = state.stations.find(s => s.code.toUpperCase() === stationCode) || { code: stationCode, lat: 10.8505, lng: 76.2711, name: 'Trivandrum Central' };
  
  let hour = parseInt(req.query.timeOfDay);
  if (isNaN(hour) || hour < 0 || hour > 23) {
    const istTime = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    hour = istTime.getUTCHours();
  }

  const weather = await getWeather(station.lat, station.lng);
  const wRisk = weatherRisk(weather.rain || weather.precipitation, weather.windSpeed);
  const crowd = estimateCrowd(station, hour, wRisk.level);

  res.json({
    stationCode,
    stationName: station.name || 'Unknown Station',
    hour,
    weatherRisk: wRisk.level,
    crowdLevel: crowd.level,
    crowdScore: crowd.score
  });
});

// GET /api/delay-prediction
app.get('/api/delay-prediction', async (req, res) => {
  const trainNo = req.query.trainNo || 'Unknown';
  const currentDelay = parseInt(req.query.currentDelay) || 0;
  const lat = parseFloat(req.query.lat) || 10.8505;
  const lng = parseFloat(req.query.lng) || 76.2711;
  const trainType = req.query.trainType || 'Express';

  const weather = await getWeather(lat, lng);
  const wRisk = weatherRisk(weather.rain || weather.precipitation, weather.windSpeed);
  const prediction = predictDelay(currentDelay, wRisk.level, trainType);

  res.json({
    trainNo,
    trainType,
    currentDelay,
    weatherRisk: wRisk.level,
    predictedDelay: prediction.predictedDelay,
    confidence: prediction.confidence,
    factors: prediction.factors
  });
});

// GET /api/maintenance-risk
app.get('/api/maintenance-risk', async (req, res) => {
  const segmentId = req.query.segmentId || 'segment_default';
  const trackUsage = parseInt(req.query.trackUsage) || 20;
  const lat = parseFloat(req.query.lat) || 10.8505;
  const lng = parseFloat(req.query.lng) || 76.2711;

  const weather = await getWeather(lat, lng);
  const wRisk = weatherRisk(weather.rain || weather.precipitation, weather.windSpeed);
  const maint = maintenanceRisk(trackUsage, wRisk.level);

  res.json({
    segmentId,
    trackUsage,
    weatherRisk: wRisk.level,
    maintenanceRisk: maint.risk,
    recommendation: maint.recommendation
  });
});

// GET /api/ai-summary
app.get('/api/ai-summary', async (req, res) => {
  const state = getState();
  const trains = state.trains || [];
  const total = trains.length;
  
  let maxDelay = 0;
  let delayedCount = 0;
  let stoppedCount = 0;
  let weatherRiskLevels = { Low: 0, Medium: 0, High: 0, Critical: 0 };

  for (const t of trains) {
    if (t.delay > maxDelay) maxDelay = t.delay;
    if (t.status === 'delayed') delayedCount++;
    if (t.status === 'stopped') stoppedCount++;
    const wRisk = t.weatherRisk || 'Low';
    weatherRiskLevels[wRisk] = (weatherRiskLevels[wRisk] || 0) + 1;
  }

  // Generate aggregate metrics
  const delayPrediction = Math.round(maxDelay * 1.1 + (delayedCount > 0 ? 5 : 0));
  
  let overallWeatherRisk = 'Low';
  if (weatherRiskLevels.Critical > 0) overallWeatherRisk = 'Critical';
  else if (weatherRiskLevels.High > 0) overallWeatherRisk = 'High';
  else if (weatherRiskLevels.Medium > 0) overallWeatherRisk = 'Medium';

  const maintenanceRiskValue = Math.min(100, 30 + (delayedCount * 5) + (overallWeatherRisk === 'Critical' ? 40 : overallWeatherRisk === 'High' ? 20 : 0));
  
  let crowdLevel = 'Medium';
  if (total > 0) {
    const highCrowdCount = trains.filter(t => t.crowdLevel === 'High').length;
    const lowCrowdCount = trains.filter(t => t.crowdLevel === 'Low').length;
    if (highCrowdCount > total / 2) crowdLevel = 'High';
    else if (lowCrowdCount > total / 2) crowdLevel = 'Low';
  }

  let summaryBrief = "AI Operations Brief: Kerala rail network operating under normal parameters. Minor delays reported. System health index at 94%.";
  if (overallWeatherRisk === 'Critical') {
    summaryBrief = `CRITICAL ALERT: Heavy rain and wind patterns detected in central nodes. System-wide speed restrictions applied. High maintenance risk (${maintenanceRiskValue}%) flagged for track segments. Anticipate delay escalations up to ${delayPrediction} minutes.`;
  } else if (overallWeatherRisk === 'High') {
    summaryBrief = `WEATHER WARNING: Active precipitation causing track drainage delays. Delay predictions peaking at ${delayPrediction} minutes. Hub crowd density is High. Track maintenance indicators are elevated.`;
  } else if (delayedCount > 2) {
    summaryBrief = `OPERATIONS ADVISORY: Cascading delays detected. ${delayedCount} trains running behind schedule. AI predicts stabilization within 45 minutes if track speeds are maintained at 80 km/h.`;
  }

  res.json({
    weatherRisk: overallWeatherRisk,
    delayPrediction: delayPrediction,
    crowdLevel: crowdLevel,
    maintenanceRisk: maintenanceRiskValue,
    summary: summaryBrief,
    stats: {
      totalTrains: total,
      delayedTrains: delayedCount,
      stoppedTrains: stoppedCount,
      maxCurrentDelay: maxDelay
    }
  });
});

// GET /api/network-health
app.get('/api/network-health', (req, res) => {
  const state = getState();
  const trains = state.trains || [];
  const total = trains.length;
  const delayedCount = trains.filter(t => t.status === 'delayed').length;
  const stoppedCount = trains.filter(t => t.status === 'stopped').length;
  
  const healthIndex = total > 0 ? Math.round(((total - delayedCount) / total) * 100) : 100;
  
  let riskAssessment = "Low Risk Profile. Network flow optimization operating normally.";
  if (healthIndex < 60) {
    riskAssessment = "High Risk. Cascading delays observed on central Kerala segments. Immediate dispatch of traffic controller advised.";
  } else if (healthIndex < 85) {
    riskAssessment = "Medium Risk. Elevated schedule deviations detected. Commuter waiting indexes elevated.";
  }

  res.json({
    healthIndex,
    efficiencyScore: Math.max(45, healthIndex - (stoppedCount * 15)),
    activeTrains: total,
    delayedTrains: delayedCount,
    stoppedTrains: stoppedCount,
    riskAssessment,
    safetyIndicator: healthIndex > 75 ? "Safe" : "Caution Required"
  });
});

// GET /api/prediction-history
app.get('/api/prediction-history', (req, res) => {
  const { getPredictionHistory } = require('./engine');
  res.json({
    history: getPredictionHistory()
  });
});

// Scenario override control endpoints
const { setActiveScenario, getActiveScenario } = require('./weather');

app.get('/api/scenario', (req, res) => {
  res.json({ activeScenario: getActiveScenario() });
});

app.post('/api/scenario', async (req, res) => {
  const { scenarioId, scenarioName } = req.body || {};
  if (!scenarioId) {
    setActiveScenario(null);
    await pollLiveTrains();
    return res.json({ success: true, activeScenario: null });
  }
  
  const scenarioObj = { id: scenarioId, name: scenarioName || scenarioId };
  setActiveScenario(scenarioObj);
  await pollLiveTrains();
  res.json({ success: true, activeScenario: scenarioObj });
});

app.get('/api/scenario/activate', async (req, res) => {
  const id = req.query.id;
  const name = req.query.name || id;
  if (!id) {
    return res.status(400).json({ error: "Missing scenario 'id' query parameter" });
  }
  
  const scenarioObj = { id, name };
  setActiveScenario(scenarioObj);
  await pollLiveTrains();
  res.json({ success: true, activeScenario: scenarioObj });
});

app.get('/api/scenario/cancel', async (req, res) => {
  setActiveScenario(null);
  await pollLiveTrains();
  res.json({ success: true, activeScenario: null });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`FastAPI-equivalent Node backend running on port ${PORT}`);
  initEngine();
});

