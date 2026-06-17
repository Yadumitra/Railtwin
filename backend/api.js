const axios = require('axios');

const INDIAN_RAIL_API_KEY = process.env.INDIAN_RAIL_API_KEY || 'demo';

async function getTrainsAtStation(stationCode) {
  try {
    // Attempt Indian Rail API primary
    const url = `https://indianrailapi.com/api/v2/AllTrainOnStation/apikey/${INDIAN_RAIL_API_KEY}/stationcode/${stationCode}/`;
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data && res.data.Trains) {
      return res.data.Trains.map(t => t.TrainNo);
    }
    return [];
  } catch(err) {
    return [];
  }
}

async function getLiveTrainStatus(trainNo) {
  try {
    const url = `https://indianrailapi.com/api/v2/livetrainstatus/apikey/${INDIAN_RAIL_API_KEY}/trainno/${trainNo}/date/today/`;
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data && res.data.CurrentStation) {
      return {
        id: trainNo,
        name: res.data.TrainName || `Train ${trainNo}`,
        status: res.data.DelayInMinutes > 30 ? 'delayed' : 'on-time',
        delay: parseInt(res.data.DelayInMinutes) || 0,
        lastStation: res.data.CurrentStation.StationName,
        lat: parseFloat(res.data.CurrentStation.Lat) || 10.8505,
        lng: parseFloat(res.data.CurrentStation.Lng) || 76.2711,
        passengers: Math.floor(Math.random() * 500) + 200 // Placeholder for crowd API
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = { getTrainsAtStation, getLiveTrainStatus };
