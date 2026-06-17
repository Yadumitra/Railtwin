# API Contract: Railway Digital Twin Backend Services

This document details the Express API contract for the Node.js backend running on port `8000`. These services are ready to be consumed by other modules (Dev 1 and Dev 3).

---

## 1. Network State & Geometry
### `GET /api/state`
Returns the active train state (live or simulated fallback), loaded Overpass station coordinates, track segments, and predictive telemetry.

*   **Query Parameters**: None
*   **Response Headers**: `Content-Type: application/json`
*   **Response Payload**:
    ```json
    {
      "stations": [
        {
          "id": 1,
          "name": "Trivandrum Central",
          "code": "TVC",
          "lat": 8.4879,
          "lng": 76.9525
        }
      ],
      "corridor": [
        [
          [8.4879, 76.9525],
          [8.8932, 76.6141]
        ]
      ],
      "trains": [
        {
          "id": "16347",
          "name": "Mangalore Express",
          "status": "on-time",
          "delay": 4,
          "lastStation": "Kollam Junction",
          "lat": 8.8932,
          "lng": 76.6141,
          "trainType": "Express",
          "passengers": 128,
          "predictedDelay": 4,
          "delayConfidence": 95,
          "crowdLevel": "Low",
          "maintenanceRisk": 31,
          "weatherRisk": "Low",
          "weatherAlert": "Normal weather conditions. Standard operating procedures.",
          "factors": [
            "High-priority routing maintained"
          ]
        }
      ],
      "lastUpdated": "2026-06-17T11:30:00.000Z",
      "status": "live"
    }
    ```

---

## 2. Weather & Disaster Risk Analytics
### `GET /api/weather-risk`
Calculates weather risk levels based on real-time wind speeds and rainfall fetched from Open-Meteo.

*   **Query Parameters**:
    *   `lat` (float, optional): Latitude (defaults to `10.8505`)
    *   `lng` (float, optional): Longitude (defaults to `76.2711`)
*   **Response Payload**:
    ```json
    {
      "latitude": 9.9816,
      "longitude": 76.2999,
      "temperature": 28.5,
      "rainfall": 15.2,
      "windSpeed": 18.4,
      "weatherRisk": "Medium",
      "weatherScore": 23,
      "alertMessage": "ADVISORY: Moderate weather. Normal operations with elevated caution.",
      "isSimulated": false
    }
    ```

---

## 3. Station Crowd Density Estimation
### `GET /api/crowd-level`
Estimates crowd levels at any given station code, accounting for station importance, peak commute periods, and rainy weather conditions.

*   **Query Parameters**:
    *   `stationCode` (string, required): Station identifier (e.g. `ERS`, `TVC`)
    *   `timeOfDay` (int, optional): Hour in 24-hour format (defaults to current IST hour)
*   **Response Payload**:
    ```json
    {
      "stationCode": "ERS",
      "stationName": "Ernakulam Junction",
      "hour": 9,
      "weatherRisk": "Low",
      "crowdLevel": "High",
      "crowdScore": 85
    }
    ```

---

## 4. Train Arrival Delay Predictor
### `GET /api/delay-prediction`
Calculates predicted delay arrival deviations based on weather conditions at the train's location and priority classing.

*   **Query Parameters**:
    *   `trainNo` (string, required): Train identifier (e.g., `12625`)
    *   `currentDelay` (int, required): Current delay in minutes
    *   `lat` (float, optional): Latitude
    *   `lng` (float, optional): Longitude
    *   `trainType` (string, optional): `Express` | `Superfast` | `Passenger` (defaults to `Express`)
*   **Response Payload**:
    ```json
    {
      "trainNo": "12625",
      "trainType": "Superfast",
      "currentDelay": 20,
      "weatherRisk": "High",
      "predictedDelay": 32,
      "confidence": 82,
      "factors": [
        "Adverse weather cautious driving (+12m)",
        "Section priority delay recovery (-1m)"
      ]
    }
    ```

---

## 5. Segment Maintenance Risk Analysis
### `GET /api/maintenance-risk`
Predicts maintenance stress factors and speed limits for any specific track sector.

*   **Query Parameters**:
    *   `segmentId` (string, required): Segment identifier
    *   `trackUsage` (int, optional): Standard train count per day (defaults to `20`)
    *   `lat` (float, optional): Segment center latitude
    *   `lng` (float, optional): Segment center longitude
*   **Response Payload**:
    ```json
    {
      "segmentId": "rail_way_10294",
      "trackUsage": 35,
      "weatherRisk": "Critical",
      "maintenanceRisk": 78,
      "recommendation": "IMMEDIATE ACTION: Suspend high-speed operations. Deploy emergency inspection crews."
    }
    ```

---

## 6. Executive Operations Summary
### `GET /api/ai-summary`
Aggregates network state data to produce warning summaries, high risk flags, and raw text alerts for operator warning feeds and chatbot guidance.

*   **Query Parameters**: None
*   **Response Payload**:
    ```json
    {
      "weatherRisk": "High",
      "delayPrediction": 45,
      "crowdLevel": "High",
      "maintenanceRisk": 65,
      "summary": "WEATHER WARNING: Active precipitation causing track drainage delays. Delay predictions peaking at 45 minutes. Hub crowd density is High. Track maintenance indicators are elevated.",
      "stats": {
        "totalTrains": 8,
        "delayedTrains": 3,
        "stoppedTrains": 0,
        "maxCurrentDelay": 35
      }
    }
    ```
