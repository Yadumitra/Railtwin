import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createIcon = (status, name, id) => {
  const shortName = name.length > 20 ? name.substring(0, 18) + '...' : name;
  return L.divIcon({
    className: 'custom-icon-wrapper',
    html: `
      <div class="relative flex items-center">
        <!-- Pulsing halo background -->
        <div class="absolute -left-1.5 -top-1.5 w-7 h-7 rounded-full train-pulse-${status} opacity-60"></div>
        <!-- Center core dot -->
        <div class="relative w-4 h-4 rounded-full border-2 border-[#0A0F1E] train-marker-${status} shadow-[0_0_8px_rgba(0,0,0,0.5)]"></div>
        <!-- Floating details badge -->
        <div class="absolute left-6 bg-[#111827]/90 border border-[#1E293B] text-[10px] font-mono text-[#F1F5F9] px-2 py-0.5 rounded shadow-[0_2px_4px_rgba(0,0,0,0.3)] whitespace-nowrap pointer-events-none select-none tracking-tight flex items-center gap-1.5">
          <span class="text-[#06B6D4] font-bold">${id}</span>
          <span class="w-1.5 h-1.5 rounded-full ${status === 'on-time' ? 'bg-[#10B981]' : status === 'stopped' ? 'bg-[#EF4444] animate-pulse' : 'bg-[#F59E0B]'}"></span>
          <span class="font-sans font-medium text-[#E2E8F0]">${shortName}</span>
        </div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
};

const MapView = ({ trains = [], activeScenario = null, stations = [] }) => {
  const [map, setMap] = useState(null);

  // Center on Kerala
  const center = [10.8505, 76.2711];
  const zoom = 7.5;

  return (
    <div className="flex-1 h-full w-full relative z-0">
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

        {/* Draw Stations from OSM */}
        {stations.map((s, i) => (
          <Circle 
            key={`station-${i}`}
            center={[s.lat, s.lng]}
            radius={1500} // Pulsing outer boundary
            pathOptions={{ 
              color: '#06B6D4', 
              fillColor: '#06B6D4', 
              fillOpacity: 0.15,
              weight: 1.5,
              className: 'pulse-station'
            }}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[180px] bg-[#111827] text-[#F1F5F9] rounded-lg">
                <div className="font-display font-bold text-sm text-[#06B6D4] flex justify-between border-b border-[#1E293B] pb-1.5 mb-1.5">
                  <span>{s.name}</span>
                  <span className="font-mono text-xs text-[#64748B]">{s.code}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Type:</span>
                    <span className="font-medium text-[#F1F5F9]">Junction Hub</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Platform Load:</span>
                    <span className="font-mono font-medium text-[#10B981]">Normal (32%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Simulated Status:</span>
                    <span className="font-mono font-medium text-[#06B6D4]">Active Twin</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Disaster Hazard Zone Overlay */}
        {activeScenario && getDisasterCenter(activeScenario.id) && (
          <React.Fragment>
            {/* Pulsing red danger circle */}
            <Circle
              center={getDisasterCenter(activeScenario.id)}
              radius={30000} // 30km radius
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '6, 6',
              }}
            />
            {/* Center glowing alert ring */}
            <Circle
              center={getDisasterCenter(activeScenario.id)}
              radius={10000} // 10km inner core
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.25,
                weight: 1.5,
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 bg-[#111827] text-[#F1F5F9] rounded-lg">
                  <div className="font-bold text-[#EF4444] text-sm mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                    SIMULATED HAZARD ZONE
                  </div>
                  <div className="text-xs text-[#9CA3AF] leading-relaxed">
                    <strong>{activeScenario.name}</strong> epicenter. All trains within 30km are automatically restricted.
                  </div>
                </div>
              </Popup>
            </Circle>
          </React.Fragment>
        )}

        {/* Trains */}
        {trains.map(train => (
          <Marker 
            key={train.id}
            position={[train.lat, train.lng]}
            icon={createIcon(train.status, train.name, train.id)}
          >
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px] bg-[#111827] text-[#F1F5F9] rounded-lg">
                <div className="font-mono text-[10px] text-[#06B6D4] flex justify-between border-b border-[#1E293B] pb-1.5 mb-1.5 font-bold">
                  <span>TRAIN ID: {train.id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                    train.status === 'on-time' ? 'bg-[#10B981]/20 text-[#10B981]' : 
                    train.status === 'stopped' ? 'bg-[#EF4444]/20 text-[#EF4444] animate-pulse' : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  }`}>
                    {train.status}
                  </span>
                </div>
                <div className="font-display font-bold text-text text-sm mb-2">{train.name}</div>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Last Station:</span>
                    <span className="font-medium text-[#F1F5F9]">{train.lastStation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Coordinates:</span>
                    <span className="font-mono text-[#9CA3AF] text-[10px]">{train.lat.toFixed(4)}, {train.lng.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Active Delay:</span>
                    <span className={`font-mono font-medium ${train.delay > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>{train.delay} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Capacity:</span>
                    <span className="font-mono text-[#06B6D4]">{train.passengers} pax</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#1E293B] flex justify-between text-[10px] text-[#64748B]">
                    <span>ETA Next Stop:</span>
                    <span className="font-mono text-[#F1F5F9]">{train.status === 'stopped' ? 'HOLD' : `~${Math.max(8, 30 - train.delay)}m`}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-2">
        <button 
          onClick={() => map?.zoomIn()}
          className="w-8 h-8 bg-surface border border-border text-text rounded flex items-center justify-center hover:bg-elevated transition-colors cursor-pointer"
        >
          +
        </button>
        <button 
          onClick={() => map?.zoomOut()}
          className="w-8 h-8 bg-surface border border-border text-text rounded flex items-center justify-center hover:bg-elevated transition-colors cursor-pointer"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default MapView;

