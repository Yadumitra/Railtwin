const axios = require('axios');

// High-fidelity fallback database for Kerala stations (Issue 1 & 2)
const OFFLINE_STATIONS = [
  { code: "KGQ", name: "Kasaragod", lat: 12.5103, lng: 74.9852 },
  { code: "CAN", name: "Kannur", lat: 11.8744, lng: 75.3711 },
  { code: "CLT", name: "Kozhikode", lat: 11.2459, lng: 75.7804 },
  { code: "TIR", name: "Tirur", lat: 10.9142, lng: 75.9220 },
  { code: "SRR", name: "Shoranur Junction", lat: 10.7628, lng: 76.2734 },
  { code: "NIL", name: "Nilambur Road", lat: 11.2750, lng: 76.2550 },
  { code: "TCR", name: "Thrissur", lat: 10.5186, lng: 76.2130 },
  { code: "AWY", name: "Aluva", lat: 10.1098, lng: 76.3533 },
  { code: "ERS", name: "Ernakulam Junction", lat: 9.9678, lng: 76.2863 },
  { code: "ALLP", name: "Alappuzha", lat: 9.4981, lng: 76.3262 },
  { code: "KTYM", name: "Kottayam", lat: 9.5916, lng: 76.5332 },
  { code: "KYJ", name: "Kayamkulam Junction", lat: 9.1724, lng: 76.5025 },
  { code: "QLN", name: "Kollam Junction", lat: 8.8874, lng: 76.5956 },
  { code: "PUU", name: "Punalur", lat: 9.0180, lng: 76.9250 },
  { code: "VAK", name: "Varkala Sivagiri", lat: 8.7406, lng: 76.7231 },
  { code: "TVC", name: "Trivandrum Central", lat: 8.4875, lng: 76.9525 }
];

// Preserves individual segments so branch lines do not merge (Issue 1 & 2)
const OFFLINE_CORRIDOR = [
  // Segment A: Main line north from Shoranur to Kasaragod
  [[12.5103, 74.9852], [12.3168, 75.0935], [12.1008, 75.2014], [11.8744, 75.3711], [11.7483, 75.4852], [11.2459, 75.7804], [10.9142, 75.9220], [10.7628, 76.2734]],
  // Segment B: Shoranur to Ernakulam
  [[10.7628, 76.2734], [10.5186, 76.2130], [10.3125, 76.3350], [10.1098, 76.3533], [9.9678, 76.2863]],
  // Segment C: Coastal branch (Ernakulam -> Alappuzha -> Kayamkulam)
  [[9.9678, 76.2863], [9.6845, 76.3250], [9.4981, 76.3262], [9.2842, 76.4021], [9.1724, 76.5025]],
  // Segment D: Inland branch loop (Ernakulam -> Kottayam -> Kayamkulam)
  [[9.9678, 76.2863], [9.9515, 76.3520], [9.7480, 76.4320], [9.5916, 76.5332], [9.3820, 76.5780], [9.3180, 76.6120], [9.1724, 76.5025]],
  // Segment E: Kayamkulam down to Trivandrum Central
  [[9.1724, 76.5025], [8.8874, 76.5956], [8.7406, 76.7231], [8.5874, 76.8544], [8.4875, 76.9525]],
  // Segment F: Nilambur Road Branch Line
  [[10.7628, 76.2734], [10.9782, 76.2085], [11.2750, 76.2550]],
  // Segment G: Punalur Branch Line
  [[8.8874, 76.5956], [8.9950, 76.7842], [9.0180, 76.9250]]
];

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
    const stations = res.data.elements.map(e => ({
      id: e.id,
      name: e.tags.name || 'Unknown',
      code: e.tags.ref || null,
      lat: e.lat,
      lng: e.lon
    })).filter(s => s.code);
    
    if (stations.length > 0) return stations;
  } catch(err) {
    console.error('OSM Station Error. Using local cached fallback stations:', err.message);
  }
  return OFFLINE_STATIONS;
}

module.exports = { getKeralaStations };
