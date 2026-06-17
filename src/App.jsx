import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import AlertFeed from './components/AlertFeed';
import MapView from './components/MapView';
import RailwayGPT from './components/RailwayGPT';
import DisasterSimModal from './components/DisasterSimModal';

const calculateStats = (trains) => {
  return trains.reduce((acc, t) => {
    acc[t.status === 'on-time' ? 'onTime' : t.status === 'delayed' ? 'delayed' : 'stopped']++;
    acc.total++;
    return acc;
  }, { onTime: 0, delayed: 0, stopped: 0, total: 0 });
};

function App() {
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [corridor, setCorridor] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [chatMessages, setChatMessages] = useState([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [isDisasterModalOpen, setIsDisasterModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const stats = calculateStats(trains);
  // Calculate At Risk (stopped or delayed trains)
  stats.atRisk = stats.stopped + stats.delayed;
  
  const networkHealth = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 100;

  const fetchState = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/state');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      setTrains(data.trains || []);
      setStations(data.stations || []);
      setCorridor(data.corridor || []);
      setBackendStatus(data.status); // 'live' or 'error'
      setIsSimulated(data.isSimulated || false);
      setActiveScenario(data.activeScenario || null);

      // Simple mock operational updates for alert stream
      if (data.trains && data.trains.length > 0 && Math.random() < 0.25) {
        const targetTrain = data.trains[Math.floor(Math.random() * data.trains.length)];
        const newAlert = {
          id: Date.now().toString(),
          type: targetTrain.status === 'stopped' ? 'critical' : targetTrain.status === 'delayed' ? 'warning' : 'info',
          message: targetTrain.status === 'stopped' 
            ? `CRITICAL: Train ${targetTrain.name} (${targetTrain.id}) has stopped near ${targetTrain.lastStation} due to blockages.`
            : targetTrain.status === 'delayed'
            ? `WARNING: Train ${targetTrain.name} (${targetTrain.id}) is delayed by ${targetTrain.delay} mins.`
            : `INFO: Train ${targetTrain.name} passed ${targetTrain.lastStation} on schedule.`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          trainId: targetTrain.id
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 20));
      }
    } catch (error) {
      console.error('Error fetching backend state:', error);
      setBackendStatus('error');
    }
  };

  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/state');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        setTrains(data.trains || []);
        setStations(data.stations || []);
        setBackendStatus(data.status); // 'live' or 'error'

        if (data.trains && data.trains.length > 0) {
          // Just a mock alert generation for the feed since real API doesn't have an alert stream easily
          const targetTrain = data.trains[Math.floor(Math.random() * data.trains.length)];
          const newAlert = {
            id: Date.now().toString(),
            type: targetTrain.status === 'delayed' ? 'warning' : 'info',
            message: targetTrain.status === 'delayed' 
              ? `WARNING: Train ${targetTrain.name} running ${targetTrain.delay} min delayed.`
              : `INFO: Train ${targetTrain.name} operating normally at ${targetTrain.lastStation}.`,
            time: 'Just now',
            trainId: targetTrain.id
          };
          setAlerts(prev => [newAlert, ...prev].slice(0, 12));
        }

      } catch (error) {
        console.error('Error fetching backend state:', error);
        setBackendStatus('error');
        setTrains([]);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000); // Polling every 3s for real-time movements
    return () => clearInterval(interval);
  }, []);

  const handleActivateScenario = async (scenario) => {
    try {
      const res = await fetch('http://localhost:8000/api/disaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const data = await res.json();
      if (data.success) {
        setActiveScenario(scenario);
        setIsDisasterModalOpen(false);
        // Append critical alert immediately
        const newAlert = {
          id: Date.now().toString(),
          type: 'critical',
          message: `DISASTER SIMULATION STARTED: ${scenario.name} active. Impact radius affecting regional operations.`,
          time: 'Just now',
          trainId: null
        };
        setAlerts(prev => [newAlert, ...prev]);
        fetchState();
      }
    } catch (e) {
      console.error("Failed to activate scenario:", e);
    }
  };

  const handleCancelScenario = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/disaster/clear', {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        setActiveScenario(null);
        setIsDisasterModalOpen(false);
        // Append resolution alert
        const newAlert = {
          id: Date.now().toString(),
          type: 'resolved',
          message: `SIMULATION CLEARED: All hazard zones deactivated. Re-establishing standard schedules.`,
          time: 'Just now',
          trainId: null
        };
        setAlerts(prev => [newAlert, ...prev]);
        fetchState();
      }
    } catch (e) {
      console.error("Failed to clear scenario:", e);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-primary text-text overflow-hidden relative">
      <TopBar 
        networkHealth={networkHealth}
        totalTrains={stats.total}
        backendStatus={backendStatus}
        onOpenDisasterModal={() => setIsDisasterModalOpen(true)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Force a fresh DOM tree for AlertFeed */}
        <div className="h-full z-20 shadow-xl">
          <AlertFeed alerts={alerts} stats={stats} trains={trains} />
        </div>
        
        {backendStatus === 'error' && trains.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-surface relative z-10 border-l border-r border-border">
            <div className="text-accent-red mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
          )}
          
          {isSimulated && backendStatus !== 'error' && (
            <div className="bg-accent-blue/10 border-b border-border text-accent-cyan text-xs py-2 px-4 flex items-center justify-between z-[400] font-mono shrink-0">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                ACTIVE DIGITAL TWIN SIMULATOR (Live Indian Rail API Fallback Enabled)
              </span>
            </div>
          )}
          
          <MapView 
            trains={trains} 
            stations={stations}
            activeScenario={null} 
          />
        )}

        <div className={`fixed md:static top-0 right-0 bottom-0 z-50 md:z-auto h-full w-[85vw] sm:w-[360px] md:w-[360px] transition-transform duration-300 ease-in-out transform md:transform-none bg-surface flex border-l border-border shrink-0 md:order-3 ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}>
          <RailwayGPT 
            trains={trains}
            alerts={alerts}
            stats={stats}
            networkHealth={networkHealth}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
          />
        </div>
      </div>

      <DisasterSimModal 
        isOpen={isDisasterModalOpen}
        onClose={() => setIsDisasterModalOpen(false)}
        onActivate={handleActivateScenario}
        activeScenario={activeScenario}
        onCancel={handleCancelScenario}
      />
    </div>
  );
}

export default App;
