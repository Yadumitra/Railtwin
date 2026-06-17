const axios = require('axios');
const cheerio = require('cheerio');

// In-memory cache to store train details scraped during station polling
const trainCache = new Map();

async function getTrainsAtStation(stationCode, stationLat, stationLng) {
  try {
    const res = await axios.get(`https://erail.in/station-live/${stationCode}?req=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const $ = cheerio.load(res.data);
    const trains = [];
    
    // erail.in stores trains in table rows where class contains TrainNo
    $('tr').each((i, el) => {
      const trainNoElem = $(el).find('.TrainNo');
      if (trainNoElem.length > 0) {
        const trainNo = trainNoElem.text().trim();
        const trainNameText = $(el).find('.name').text().trim();
        const trainName = trainNameText.replace(trainNo, '').trim() || `Train ${trainNo}`;
        
        // If the train has reached its destination or hasn't departed source, remove it from tracking.
        const rowText = $(el).text();
        if (rowText.includes('DSTN') || rowText.includes('SRC')) {
          if (trainCache.has(trainNo)) {
            trainCache.delete(trainNo);
          }
          return; // Skip processing this train
        }

        // Parse Departure Time to ensure we don't track ghost trains that passed through hours ago
        const tds = $(el).find('td');
        let depTimeStr = $(tds[2]).text().replace(/[^\d:]/g, '').trim();
        if (!depTimeStr) depTimeStr = $(tds[1]).text().replace(/[^\d:]/g, '').trim();
        
        if (depTimeStr && depTimeStr.includes(':')) {
          const [hours, mins] = depTimeStr.split(':').map(Number);
          const now = new Date();
          const trainTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins);
          
          if (now.getHours() < 6 && hours > 18) trainTime.setDate(trainTime.getDate() - 1);
          else if (now.getHours() > 18 && hours < 6) trainTime.setDate(trainTime.getDate() + 1);
          
          const diffMinutes = (now - trainTime) / (1000 * 60);
          
          // If the train departed this station more than 90 minutes ago, consider this a stale historical record.
          if (diffMinutes > 90) {
            return; // Skip processing
          }
        }

        // Find delay (usually in red text or spanning)
        let delay = 0;
        // Search specifically for the span that has the 'm' suffix without other text
        $(el).find('span').each((_, span) => {
          const t = $(span).text().trim();
          if (t && t.includes('m') && !t.includes('TrainNo')) {
            const match = t.match(/(?:(\d+)h)?(\d+)m/);
            if (match && match[0] === t) { // ensure it's precisely the delay string
              delay = (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0);
            }
          }
        });

        trains.push(trainNo);
        
        // Create a deterministic small offset based on the train number so it doesn't bounce around on every poll
        const hash = parseInt(trainNo.replace(/\D/g, '') || '0');
        const latOffset = ((hash % 100) / 100 - 0.5) * 0.05;
        const lngOffset = (((hash * 7) % 100) / 100 - 0.5) * 0.05;

        // If we already track this train, only update its status/delay, preserve its smooth location
        if (trainCache.has(trainNo)) {
          const existing = trainCache.get(trainNo);
          existing.delay = delay;
          existing.status = delay > 10 ? 'delayed' : 'on-time';
          existing.lastStation = stationCode;
          existing.lastSeen = Date.now();
          // Smoothly snap to new station if it actually moved, otherwise keep stable coordinates
          if (existing.baseLat !== stationLat || existing.baseLng !== stationLng) {
             existing.baseLat = stationLat;
             existing.baseLng = stationLng;
             existing.lat = stationLat + latOffset;
             existing.lng = stationLng + lngOffset;
          }
        } else {
          // Cache new train
          trainCache.set(trainNo, {
            id: trainNo,
            name: trainName,
            status: delay > 10 ? 'delayed' : 'on-time',
            delay: delay,
            lastStation: stationCode,
            baseLat: stationLat,
            baseLng: stationLng,
            lat: stationLat + latOffset,
            lng: stationLng + lngOffset,
            passengers: Math.floor(hash % 800) + 200,
            riskScore: delay > 60 ? 80 : 10,
            lastSeen: Date.now()
          });
        }
      }
    });

    return trains;
  } catch(err) {
    console.error(`Scrape error for ${stationCode}:`, err.message);
    return [];
  }
}

async function getLiveTrainStatus(trainNo) {
  // Return the cached data we just grabbed during the station scrape
  if (trainCache.has(trainNo)) {
    return trainCache.get(trainNo);
  }
  return null;
}

// Every 15 minutes, purge trains from the cache that haven't been seen anywhere in the last 2 hours.
// This prevents trains that left the state from being stuck on the border forever.
setInterval(() => {
  const now = Date.now();
  for (const [trainNo, data] of trainCache.entries()) {
    if (now - data.lastSeen > 2 * 60 * 60 * 1000) {
      trainCache.delete(trainNo);
    }
  }
}, 15 * 60 * 1000);

module.exports = { getTrainsAtStation, getLiveTrainStatus };
