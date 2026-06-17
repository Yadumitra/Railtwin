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
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Map Container first in Mobile view layout order */}
        <div className="flex-grow flex flex-col relative overflow-hidden order-1 md:order-2 h-[55vh] md:h-full w-full">
          {backendStatus === 'error' && (
            <div className="bg-accent-red/20 border-b border-accent-red/40 text-accent-red text-xs py-2 px-4 flex items-center justify-between z-[400] font-mono shrink-0">
              <span className="flex items-center gap-2 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent-red animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                OFFLINE MODE — UNABLE TO CONNECT TO NODE BACKEND API (Verify server is running on port 8000)
              </span>
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
            corridor={corridor}
            activeScenario={activeScenario} 
          />
        </div>

        {/* AlertFeed Container below Map in mobile */}
        <div className="w-full md:w-[280px] h-[45vh] md:h-full order-2 md:order-1 border-t md:border-t-0 md:border-r border-border shrink-0 flex flex-col overflow-hidden">
          <AlertFeed alerts={alerts} stats={stats} />
        </div>
        
        {/* Backdrop overlay for Mobile Chat Drawer */}
        {isChatOpen && (
          <div 
            onClick={() => setIsChatOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-45"
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
