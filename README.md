# RailTwin 🚄

RailTwin is a cutting-edge Digital Twin and AI Operations Platform designed for the Indian Railway Network. Currently mapping the entire state of Kerala (160+ major stations), RailTwin provides real-time situational awareness, predictive weather tracking, and an integrated LLM assistant for railway operators.

![RailTwin Dashboard](.github/preview.png)

## 🌟 Key Features

### 1. Hybrid Real-Time Tracking Engine
RailTwin utilizes a custom hybrid tracking architecture to bypass the need for expensive enterprise GPS feeds. 
- **Live Scraper**: Periodically polls live departure boards across random stations using `erail.in`.
- **Intelligent Time-Filtering**: Discards historical ghost trains and future distant ETA estimates.
- **Node Interpolation Tick**: Smoothly animates train coordinates (`lat/lng`) between known checkpoints, providing a visual experience identical to "Where is My Train" or FlightRadar24.

### 2. Live Weather Radar Integration
RailTwin abandons fake mock scenarios for true atmospheric monitoring.
- Integrated with the **Open-Meteo API** to fetch real-time precipitation (mm/h) and wind speed (km/h) for every active train's exact coordinates.
- Trains passing through severe rain (>10mm/h) or dangerous winds (>60km/h) are automatically flagged as "At Risk (Weather)" on the map.

### 3. RailwayGPT: AI Operations Assistant
A built-in AI assistant for operators to query network status naturally.
- **Powered by Groq**: Utilizes `llama-3.3-70b-versatile` for lightning-fast, high-reasoning inference.
- **Context Aware**: The frontend injects the live JSON state (train coordinates, delays, passenger estimates, and live weather) directly into the prompt context.
- **Strict Boundaries**: System prompted to forcefully reject non-railway operations queries, acting strictly as a professional operational tool.

## 🛠️ Architecture Stack

- **Frontend**: React, Vite, Tailwind CSS, `react-leaflet` (CartoDB Dark Tiles)
- **Backend Engine**: Node.js, Express (FastAPI equivalent)
- **Scraping**: `axios`, `cheerio`
- **AI Integration**: Groq API
- **Geospatial Data**: Overpass API (OpenStreetMap) for exact station geocoding.

## 🚀 Getting Started

### 1. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
npm install
```
Create a `.env` file and add your Groq API key:
```env
PORT=8000
GROQ_API_KEY=gsk_your_api_key_here
```
Start the backend engine:
```bash
node server.js
```

### 2. Frontend Setup
In a new terminal window, navigate to the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## 💡 How the Backend Works
The Node.js backend serves two purposes:
1. **The Polling Engine**: It continuously scrapes departure boards, runs the `tickLiveTrains()` interpolation math, and maintains the `trainCache`.
2. **The Secure Proxy**: It securely proxies the AI chat requests to Groq so your API key is never exposed to the client browser.
