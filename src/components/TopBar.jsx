import React, { useState, useEffect } from 'react';
import { Train, Activity, Zap } from 'lucide-react';

const TopBar = ({ networkHealth, totalTrains, backendStatus }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  let statusColor = 'text-accent-amber';
  let statusText = 'CONNECTING';
  let dotColor = 'bg-accent-amber';

  if (backendStatus === 'live') {
    statusColor = 'text-accent-green';
    statusText = 'NETWORK LIVE';
    dotColor = 'bg-accent-green';
  } else if (backendStatus === 'error') {
    statusColor = 'text-accent-red';
    statusText = 'API OFFLINE';
    dotColor = 'bg-accent-red';
  }

  return (
    <div className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center">
          <Train className="text-accent-blue w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-text tracking-tight flex items-baseline gap-2">
            RailTwin
            <span className="text-xs font-normal text-muted tracking-normal font-sans">
              Live Kerala Network
            </span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-elevated px-4 py-1.5 rounded-full border border-border">
          <div className={`w-2.5 h-2.5 ${dotColor} rounded-full ${backendStatus === 'live' ? 'animate-pulse-dot' : ''}`}></div>
          <span className={`text-sm font-medium ${statusColor} tracking-wide`}>{statusText}</span>
        </div>
        
        <div className="text-sm font-mono text-text">
          {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
          <span className="mx-2 text-muted">|</span>
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-sm mr-4">
          <div className="flex flex-col items-end">
            <span className="text-muted text-xs">Total Trains</span>
            <span className="font-mono font-medium">{totalTrains} Active</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-end">
            <span className="text-muted text-xs">Network Health</span>
            <span className="font-mono font-medium flex items-center gap-1 text-accent-cyan">
              <Activity className="w-3 h-3" />
              {networkHealth}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
