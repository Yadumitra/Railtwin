import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
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

const AlertFeed = ({ alerts, stats }) => {
  return (
    <div className="w-full h-full bg-surface flex flex-col relative">
      <div className="p-4 border-b border-border bg-elevated/50 shrink-0">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-blue" />
          Live Operations Feed
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
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
        ))}
      </div>
      
      <div className="p-4 border-t border-border bg-elevated/30 shrink-0">
        <StatsPanel stats={stats} />
      </div>
    </div>
  );
};

export default AlertFeed;
