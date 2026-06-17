/**
 * Railway Digital Twin MVP - Phase 1 Core Prediction Engine
 * Heuristics-based prediction engine optimized for real-time hackathon telemetry.
 */

// Helper to determine if a station is a major hub in Kerala
function isMajorStation(stationCode = '', stationName = '') {
  const code = (stationCode || '').toUpperCase();
  const name = (stationName || '').toUpperCase();
  const majorHubs = ['ERS', 'TVC', 'CLT', 'TCR', 'PGT', 'QLN', 'KYJ', 'CAN', 'SRR', 'ALLP'];
  
  if (majorHubs.includes(code)) return true;
  if (name.includes('JUNCTION') || name.includes('CENTRAL') || name.includes('ERNAKULAM') || name.includes('TRIVANDRUM')) {
    return true;
  }
  return false;
}

/**
 * Predicts the delay of a train at its next station.
 * @param {number} currentDelay - Current delay in minutes
 * @param {string} weatherRisk - "Low" | "Medium" | "High" | "Critical"
 * @param {string} trainType - "Express" | "Superfast" | "Passenger" | "Local"
 * @returns {object} { predictedDelay: number, confidence: number, factors: string[] }
 */
function predictDelay(currentDelay = 0, weatherRisk = 'Low', trainType = 'Express') {
  let predictedDelay = currentDelay;
  let confidence = 95;
  const factors = [];

  // 1. Weather Penalty
  if (weatherRisk === 'Critical') {
    predictedDelay += 25;
    confidence -= 15;
    factors.push('Severe weather speed restrictions (+25m)');
  } else if (weatherRisk === 'High') {
    predictedDelay += 12;
    confidence -= 8;
    factors.push('Adverse weather cautious driving (+12m)');
  } else if (weatherRisk === 'Medium') {
    predictedDelay += 4;
    confidence -= 3;
    factors.push('Mild weather signal delays (+4m)');
  }

  // 2. Train Type Priority Adjustments
  const normalizedType = (trainType || 'Express').toLowerCase();
  if (normalizedType.includes('passenger') || normalizedType.includes('local')) {
    // Low priority, gets delayed further, especially if already delayed
    const penalty = Math.round(currentDelay * 0.15) + 5;
    predictedDelay += penalty;
    factors.push(`Low-priority train routing penalty (+${penalty}m)`);
  } else {
    // Express/Superfast: Priority clearance
    if (currentDelay > 15 && weatherRisk !== 'Critical' && weatherRisk !== 'High') {
      const recovery = Math.min(10, Math.round(currentDelay * 0.08));
      predictedDelay -= recovery;
      factors.push(`Section priority delay recovery (-${recovery}m)`);
    } else {
      factors.push('High-priority routing maintained');
    }
  }

  // 3. Current Delay scaling confidence
  confidence -= Math.floor(currentDelay / 15);
  
  // Cap outcomes realistically
  predictedDelay = Math.max(0, Math.round(predictedDelay));
  confidence = Math.max(45, Math.min(98, confidence));

  return {
    predictedDelay,
    confidence,
    factors
  };
}

/**
 * Estimates station crowd level and density score.
 * @param {object|string} station - Station object (with name/code) or station code
 * @param {number} hour - Hour of day (0-23)
 * @param {string} weatherRisk - "Low" | "Medium" | "High" | "Critical"
 * @returns {object} { level: "Low" | "Medium" | "High", score: number }
 */
function estimateCrowd(station = {}, hour = 12, weatherRisk = 'Low') {
  let score = 20; // Default base score
  
  // 1. Extract station info
  let code = '';
  let name = '';
  if (typeof station === 'string') {
    code = station;
  } else if (station && typeof station === 'object') {
    code = station.code || '';
    name = station.name || '';
  }

  // 2. Station Type Weight
  const isMajor = isMajorStation(code, name);
  if (isMajor) {
    score += 35;
  }

  // 3. Peak Hour Weight
  // Peak commute hours: 08:00 - 10:00 (8, 9) and 17:00 - 19:00 (17, 18)
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
  if (isPeak) {
    score += 30;
  }

  // 4. Weather Impact
  // Heavy rain reduces station crowds as people defer travel
  if (weatherRisk === 'Critical') {
    score -= 20;
  } else if (weatherRisk === 'High') {
    score -= 10;
  } else if (weatherRisk === 'Medium') {
    score += 5; // Light rain keeps people under the platform covers
  }

  // Cap score
  score = Math.max(5, Math.min(100, score));

  // 5. Categorize
  let level = 'Low';
  if (score >= 70) {
    level = 'High';
  } else if (score >= 35) {
    level = 'Medium';
  }

  return {
    level,
    score
  };
}

/**
 * Computes maintenance risk score and actions for track segments.
 * @param {number} trackUsage - Estimate of trains per day on this track segment (1 - 60)
 * @param {string} weatherRisk - "Low" | "Medium" | "High" | "Critical"
 * @returns {object} { risk: number, recommendation: string }
 */
function maintenanceRisk(trackUsage = 15, weatherRisk = 'Low') {
  let risk = 15; // Baseline risk

  // 1. Track usage weight
  risk += Math.min(45, Math.round(trackUsage * 0.8));

  // 2. Weather risk contribution (extreme heat or heavy rain accelerates rail wear)
  if (weatherRisk === 'Critical') {
    risk += 35;
  } else if (weatherRisk === 'High') {
    risk += 20;
  } else if (weatherRisk === 'Medium') {
    risk += 8;
  }

  // Cap risk
  risk = Math.max(5, Math.min(100, risk));

  // 3. Determine recommendation
  let recommendation = 'NORMAL: Infrastructure healthy. Continue standard monitoring.';
  if (risk >= 75) {
    recommendation = 'IMMEDIATE ACTION: Suspend high-speed operations. Deploy emergency inspection crews.';
  } else if (risk >= 50) {
    recommendation = 'ALERT: Track stress elevated. Implement speed restrictions (max 50 km/h) and schedule ultrasonic scanning.';
  } else if (risk >= 30) {
    recommendation = 'ADVISORY: Routine track wear. Schedule standard maintenance window within 48 hours.';
  }

  return {
    risk,
    recommendation
  };
}

/**
 * Computes general weather risk level based on rainfall and wind speed parameters.
 * @param {number} rainfall - Precipitation in mm
 * @param {number} windSpeed - Wind speed in km/h
 * @returns {object} { level: "Low" | "Medium" | "High" | "Critical", score: number, alert: string }
 */
function weatherRisk(rainfall = 0, windSpeed = 0) {
  // Normalize parameters relative to severe thresholds (Rain: 100mm = max, Wind: 100km/h = max)
  const rainWeight = Math.min(100, (rainfall / 100) * 100) * 0.6;
  const windWeight = Math.min(100, (windSpeed / 100) * 100) * 0.4;
  
  const score = Math.round(rainWeight + windWeight);

  let level = 'Low';
  let alert = 'Normal weather conditions. Standard operating procedures.';

  if (score >= 70 || rainfall > 50 || windSpeed > 60) {
    level = 'Critical';
    alert = 'CRITICAL: Extreme weather conditions. Landslide and flash flood hazards active. Slow travel mandated.';
  } else if (score >= 40 || rainfall > 20 || windSpeed > 35) {
    level = 'High';
    alert = 'WARNING: Heavy rainfall or wind speeds. Potential track visibility issues or minor waterlogging.';
  } else if (score >= 15 || rainfall > 5 || windSpeed > 15) {
    level = 'Medium';
    alert = 'ADVISORY: Moderate weather. Normal operations with elevated caution.';
  }

  return {
    level,
    score,
    alert
  };
}

module.exports = {
  predictDelay,
  estimateCrowd,
  maintenanceRisk,
  weatherRisk
};
