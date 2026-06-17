import React, { useState, useEffect } from 'react';
import { Train, Activity, Zap, MessageSquare } from 'lucide-react';

const TopBar = ({ networkHealth, totalTrains, backendStatus, onOpenDisasterModal, isChatOpen, onToggleChat }) => {
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
    <div className="h-auto md:h-16 bg-surface border-b border-border flex flex-col md:flex-row items-center justify-between p-4 md:px-6 gap-3 md:gap-0 shrink-0">
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-blue/20 rounded-lg flex items-center justify-center">
            <Train className="text-accent-blue w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-text tracking-tight flex items-baseline gap-2">
              RailTwin
              <span className="text-xs font-normal text-muted tracking-normal font-sans hidden sm:inline">
                Live Kerala Network
              </span>
            </h1>
          </div>
        </div>
        
        {/* Mobile indicators only */}
        <div className="flex md:hidden items-center gap-2">
          <div className={`w-2 h-2 ${dotColor} rounded-full ${backendStatus === 'live' ? 'animate-pulse-dot' : ''}`}></div>
          <span className="text-[10px] font-mono text-muted">{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
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

      <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 w-full md:w-auto">
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-muted text-[10px] sm:text-xs">Total Trains</span>
            <span className="font-mono font-medium text-text">{totalTrains} Active</span>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="flex flex-col items-start md:items-end">
            <span className="text-muted text-[10px] sm:text-xs">Network Health</span>
            <span className="font-mono font-medium flex items-center gap-1 text-accent-cyan">
              <Activity className="w-3 h-3" />
              {networkHealth}%
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenDisasterModal}
            className="bg-accent-amber/15 hover:bg-accent-amber/25 border border-accent-amber/40 hover:border-accent-amber text-accent-amber text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disaster Sim</span>
            <span className="sm:hidden">Sim</span>
          </button>
          
          <button 
            onClick={onToggleChat}
            className={`md:hidden p-1.5 rounded-lg border transition-all cursor-pointer ${
              isChatOpen 
                ? 'bg-accent-blue/20 border-accent-blue text-accent-cyan' 
                : 'bg-elevated border-border text-muted'
            }`}
            title="Toggle AI Operations Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
