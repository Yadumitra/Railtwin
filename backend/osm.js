const axios = require('axios');

async function getKeralaStations() {
  const query = `
    [out:json][timeout:25];
    area["name"="Kerala"]["admin_level"="4"]->.searchArea;
    node["railway"="station"](area.searchArea);
    out body;
  `;
  try {
    const res = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RailTwin/1.0 (Contact: demo@example.com)'
      }
    });
    return res.data.elements.map(e => ({
      id: e.id,
      name: e.tags.name || 'Unknown',
      code: e.tags.ref || null,
      lat: e.lat,
      lng: e.lon
    })).filter(s => s.code); 
  } catch(err) {
    console.error('OSM Station Error:', err.message);
    return [];
  }
}

module.exports = { getKeralaStations };
