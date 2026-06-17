import { STATIONS } from './stations.js';

const TRAIN_NAMES = [
  "Kerala Express", "Rajdhani Express", "Shatabdi Express", "Duronto Express",
  "Garib Rath", "Jan Shatabdi", "Humsafar Express", "Tejas Express",
  "Vande Bharat", "Deccan Queen", "Flying Ranee", "Konkan Kanya",
  "Mangala Express", "Island Express", "Parasuram Express", "Netravati Express",
  "Malabar Express", "Ernad Express", "Intercity Express", "Sabari Express",
  "Chennai Mail", "Mumbai Mail", "Howrah Express", "Bengaluru Express",
  "Golden Temple Mail", "Punjab Mail", "Bombay Express", "Coromandel Express",
  "Gitanjali Express", "Brindavan Express"
];

// 30 trains distributed: 16 on-time, 7 delayed, 5 at-risk, 2 stopped.
const STATUS_DISTRIBUTION = [
  ...Array(16).fill("on-time"),
  ...Array(7).fill("delayed"),
  ...Array(5).fill("at-risk"),
  ...Array(2).fill("stopped")
];

// Helper to get random item
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateTrains = () => {
  const trains = [];
  const statusPool = [...STATUS_DISTRIBUTION];

  for (let i = 0; i < 30; i++) {
    const fromStation = getRandom(STATIONS);
    let toStation = getRandom(STATIONS);
    while (toStation.id === fromStation.id) {
      toStation = getRandom(STATIONS);
    }

    // Assign status without replacement
    const statusIdx = Math.floor(Math.random() * statusPool.length);
    const status = statusPool.splice(statusIdx, 1)[0];

    // Interpolate lat/lng somewhere between from and to
    const progress = Math.random(); // 0.1 to 0.9
    const lat = fromStation.lat + (toStation.lat - fromStation.lat) * progress;
    const lng = fromStation.lng + (toStation.lng - fromStation.lng) * progress;

    let delay = 0;
    let riskScore = Math.floor(Math.random() * 20); // 0-19 default
    const riskReasons = [];

    if (status === "delayed") {
      delay = getRandBetween(15, 45);
      riskScore = getRandBetween(20, 50);
    } else if (status === "at-risk") {
      delay = getRandBetween(10, 30);
      riskScore = getRandBetween(60, 90);
      riskReasons.push(getRandom(["Weather alert ahead", "Track obstruction reported", "High passenger density at next station"]));
    } else if (status === "stopped") {
      delay = getRandBetween(45, 120);
      riskScore = getRandBetween(90, 100);
      riskReasons.push("Emergency stop");
    }

    let speed = status === "stopped" ? 0 : getRandBetween(60, 140);
    if (status === "delayed") speed = getRandBetween(40, 80);

    trains.push({
      id: `TR-${getRandBetween(1000, 9999)}`,
      name: TRAIN_NAMES[i % TRAIN_NAMES.length],
      from: fromStation.id,
      to: toStation.id,
      status,
      speed,
      delay,
      lat,
      lng,
      passengers: getRandBetween(200, 1200),
      lastUpdate: new Date().toISOString(),
      riskScore,
      riskReasons
    });
  }
  return trains;
};

export const INITIAL_TRAINS = generateTrains();
