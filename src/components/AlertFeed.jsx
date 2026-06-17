import React, { useState } from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, Activity, Clock } from 'lucide-react';
import StatsPanel from './StatsPanel';

const getIconForType = (type) => {
  switch (type) {
    case 'critical': return <ShieldAlert className="w-4 h-4 text-accent-red" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-accent-amber" />;
    case 'info': return <Info className="w-4 h-4 text-accent-blue" />;
    case 'resolved': return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
    default: return <Info className="w-4 h-4" />;
  }
};

const getBorderColor = (type) => {
  switch (type) {
    case 'critical': return 'border-l-accent-red';
    case 'warning': return 'border-l-accent-amber';
    case 'info': return 'border-l-accent-blue';
    case 'resolved': return 'border-l-accent-green';
    default: return 'border-l-border';
  }
};

const AlertFeed = ({ alerts = [], stats = {}, trains = [] }) => {
  const [activeTab, setActiveTab] = useState('alerts');
  
  const delayedTrains = trains.filter(t => t.delay > 10).sort((a, b) => b.delay - a.delay);

  return (
    <div className="w-[280px] shrink-0 bg-surface border-r border-border flex flex-col h-[calc(100vh-64px)] z-10 relative">
      <div className="flex border-b border-border bg-elevated/50 shrink-0">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'alerts' 
              ? 'border-accent-blue text-accent-blue bg-accent-blue/5' 
              : 'border-transparent text-muted hover:text-text hover:bg-elevated'
          }`}
        >
          <Activity className="w-4 h-4" />
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('delayed')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === 'delayed' 
              ? 'border-accent-red text-accent-red bg-accent-red/5' 
              : 'border-transparent text-muted hover:text-text hover:bg-elevated'
          }`}
        >
          <Clock className="w-4 h-4" />
          Delayed
          {delayedTrains.length > 0 && (
            <span className="bg-accent-red text-surface text-[10px] px-1.5 py-0.5 rounded-full ml-1">
              {delayedTrains.length}
            </span>
          )}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col relative">
        
        {/* ALERTS TAB CONTENT */}
        <div className={`flex flex-col space-y-3 ${activeTab === 'alerts' ? 'block' : 'hidden'}`}>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div 
                key={`alert-${alert.id}`}
                className={`bg-elevated rounded-r-lg border border-l-4 border-y-border border-r-border ${getBorderColor(alert.type)} p-3 animate-[slideInLeft_0.3s_ease-out] shadow-sm`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getIconForType(alert.type)}
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      {alert.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">{alert.time}</span>
                </div>
                
                <p className="text-sm text-text leading-snug mb-2">
                  {alert.message}
                </p>
                
                {alert.trainId && (
                  <div className="inline-block bg-surface px-2 py-0.5 rounded border border-border text-xs font-mono text-accent-cyan">
                    {alert.trainId}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted text-center mt-10 italic">No recent alerts.</div>
          )}
        </div>

        {/* DELAYED TAB CONTENT */}
        <div className={`flex flex-col space-y-3 ${activeTab === 'delayed' ? 'block' : 'hidden'}`}>
          {delayedTrains.length > 0 ? (
            delayedTrains.map(train => (
              <div 
                key={`delayed-${train.id}`}
                className="bg-elevated rounded-lg border border-border p-3 flex flex-col shadow-sm animate-[slideInLeft_0.3s_ease-out]"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-mono text-sm font-bold text-text">{train.id}</div>
                  <div className="text-xs font-bold text-accent-red flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {train.delay}m Late
                  </div>
                </div>
                <div className="text-xs text-muted font-medium truncate">{train.name}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted text-center mt-10 italic">No delayed trains detected.</div>
          )}
        </div>

      </div>
      
      <div className="p-4 border-t border-border bg-elevated/30 shrink-0">
        <StatsPanel stats={stats} />
      </div>
    </div>
  );
};

export default AlertFeed;
