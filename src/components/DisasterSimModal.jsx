import React from 'react';
import { X, CloudLightning, Waves, Mountain, Wind } from 'lucide-react';

const SCENARIOS = [
  {
    id: "WZ-Kerala",
    name: "Kerala Flood",
    icon: <Waves className="w-6 h-6 text-accent-blue" />,
    desc: "Heavy flooding reported near Ernakulam. 4 trains at risk.",
    color: "hover:border-accent-blue/50 hover:bg-accent-blue/5"
  },
  {
    id: "WZ-Konkan",
    name: "Konkan Landslide",
    icon: <Mountain className="w-6 h-6 text-accent-amber" />,
    desc: "Landslide detected on Konkan Railway route. Track blocked.",
    color: "hover:border-accent-amber/50 hover:bg-accent-amber/5"
  },
  {
    id: "WZ-Northeast",
    name: "Northeast Storm",
    icon: <CloudLightning className="w-6 h-6 text-accent-cyan" />,
    desc: "Cyclonic storm approaching. Visibility near zero.",
    color: "hover:border-accent-cyan/50 hover:bg-accent-cyan/5"
  },
  {
    id: "WZ-Rajasthan",
    name: "Rajasthan Sandstorm",
    icon: <Wind className="w-6 h-6 text-accent-red" />,
    desc: "Severe sandstorm. Track visibility compromised.",
    color: "hover:border-accent-red/50 hover:bg-accent-red/5"
  }
];

const DisasterSimModal = ({ isOpen, onClose, onActivate, activeScenario, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border bg-elevated">
          <div>
            <h2 className="text-xl font-display font-bold text-text flex items-center gap-2">
              <CloudLightning className="w-5 h-5 text-accent-amber" />
              Disaster Simulation Engine
            </h2>
            <p className="text-sm text-muted mt-1">Simulate real-world hazard scenarios to test network resilience</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg text-muted hover:text-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[60vh]">
          {SCENARIOS.map(s => {
            const isActive = activeScenario?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onActivate(s)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  isActive 
                    ? 'border-accent-red bg-accent-red/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                    : `border-border bg-elevated ${s.color}`
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-accent-red/20' : 'bg-surface'}`}>
                    {s.icon}
                  </div>
                  <h3 className={`font-bold ${isActive ? 'text-accent-red' : 'text-text'}`}>
                    {s.name}
                  </h3>
                </div>
                <p className="text-sm text-muted leading-snug">{s.desc}</p>
                {isActive && (
                  <div className="mt-3 text-xs font-bold text-accent-red uppercase tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse"></div>
                    Active Scenario
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {activeScenario && (
          <div className="p-5 border-t border-border bg-elevated flex justify-end">
            <button
              onClick={() => {
                onCancel();
                onClose();
              }}
              className="px-4 py-2 bg-surface hover:bg-accent-red/10 border border-border hover:border-accent-red text-text hover:text-accent-red rounded-lg text-sm font-medium transition-colors"
            >
              Cancel Active Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisasterSimModal;
