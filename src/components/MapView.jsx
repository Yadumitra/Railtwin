import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STATIONS } from '../data/stations';

// Need custom icons since default leaflet icons don't work easily with webpack/vite without extra setup
const createIcon = (status) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="w-4 h-4 train-marker-${status}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const MapView = ({ trains, activeScenario, stations = STATIONS }) => {
  const [map, setMap] = useState(null);

  // Center of India roughly
  const center = [20.5937, 78.9629];
  const zoom = 5;

  return (
    <div className="flex-1 h-[calc(100vh-64px)] relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="w-full h-full bg-[#0A0F1E]"
        zoomControl={false}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw routes between major stations - simple star pattern or sequential */}
        {stations.map((s, i) => {
          if (i === 0) return null;
          return (
            <Polyline 
              key={`route-${i}`}
              positions={[
                [stations[i-1].lat, stations[i-1].lng],
                [s.lat, s.lng]
              ]}
              color="#1E293B"
              weight={2}
              opacity={0.5}
            />
          );
        })}

        {/* Active Disaster Zone */}
        {activeScenario && (
          <Circle
            center={[activeScenario.lat, activeScenario.lng]}
            radius={activeScenario.radius * 1000} // radius is in km, leafet takes meters
            pathOptions={{ 
              color: activeScenario.type === 'flood' ? '#06B6D4' : '#EF4444', 
              fillColor: activeScenario.type === 'flood' ? '#06B6D4' : '#EF4444', 
              fillOpacity: 0.2 
            }}
          />
        )}

        {/* Trains */}
        {trains.map(train => (
          <Marker 
            key={train.id}
            position={[train.lat, train.lng]}
            icon={createIcon(train.status)}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[150px]">
                <div className="font-mono text-xs text-muted mb-1">{train.id}</div>
                <div className="font-bold text-text mb-2">{train.name}</div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted">Status</span>
                  <span className={`font-medium ${
                    train.status === 'on-time' ? 'text-accent-green' : 
                    train.status === 'stopped' ? 'text-accent-red' : 'text-accent-amber'
                  } capitalize`}>
                    {train.status}
                  </span>
                  
                  <span className="text-muted">Speed</span>
                  <span className="text-text font-mono">{train.speed} km/h</span>
                  
                  <span className="text-muted">Delay</span>
                  <span className="text-text font-mono">{train.delay} min</span>
                  
                  <span className="text-muted">Passengers</span>
                  <span className="text-text font-mono">{train.passengers}</span>
                  
                  <span className="text-muted">Risk</span>
                  <span className="text-text font-mono">{train.riskScore}/100</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Zoom controls overlaid manually to match dark theme */}
      <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => map?.zoomIn()}
          className="w-8 h-8 bg-surface border border-border text-text rounded flex items-center justify-center hover:bg-elevated transition-colors"
        >
          +
        </button>
        <button 
          onClick={() => map?.zoomOut()}
          className="w-8 h-8 bg-surface border border-border text-text rounded flex items-center justify-center hover:bg-elevated transition-colors"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default MapView;
