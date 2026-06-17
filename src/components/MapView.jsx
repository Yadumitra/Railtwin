import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createIcon = (status) => {
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="w-4 h-4 train-marker-${status}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const MapView = ({ trains = [], activeScenario = null, stations = [], corridor = [] }) => {
  const [map, setMap] = useState(null);

  // Center on Kerala
  const center = [10.8505, 76.2711];
  const zoom = 7;

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

        {/* Draw Rail Geometry from OSM */}
        {corridor.map((segment, i) => (
          <Polyline 
            key={`corridor-${i}`}
            positions={segment}
            color="#3B82F6"
            weight={2}
            opacity={0.6}
          />
        ))}

        {/* Draw Stations from OSM */}
        {stations.map((s, i) => (
          <Circle 
            key={`station-${i}`}
            center={[s.lat, s.lng]}
            radius={2000} // 2km radius visualization
            pathOptions={{ color: '#1E293B', fillColor: '#64748B', fillOpacity: 0.8 }}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <div className="font-bold text-text">{s.name}</div>
                <div className="font-mono text-xs text-muted">{s.code}</div>
              </div>
            </Popup>
          </Circle>
        ))}

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
                  
                  <span className="text-muted">Delay</span>
                  <span className="text-text font-mono">{train.delay} min</span>
                  
                  <span className="text-muted">Last Station</span>
                  <span className="text-text font-mono">{train.lastStation}</span>

                  <span className="text-muted">Est. Crowd</span>
                  <span className="text-text font-mono">{train.passengers}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
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
