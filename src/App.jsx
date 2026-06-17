import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import AlertFeed from './components/AlertFeed';
import MapView from './components/MapView';
import RailwayGPT from './components/RailwayGPT';

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

  const stats = calculateStats(trains);
  const networkHealth = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;

  useEffect(() => {
    const fetchState = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/state');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        setTrains(data.trains || []);
        setStations(data.stations || []);
        setCorridor(data.corridor || []);
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
    const interval = setInterval(fetchState, 15000); // Check backend every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-primary text-text overflow-hidden">
      <TopBar 
        networkHealth={networkHealth}
        totalTrains={stats.total}
        backendStatus={backendStatus}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <AlertFeed alerts={alerts} stats={stats} />
        
        {backendStatus === 'error' && trains.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-surface relative z-10 border-l border-r border-border">
            <div className="text-accent-red mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">No Live Data Available</h2>
            <p className="text-muted text-center max-w-md">
              Unable to connect to live tracking APIs or the backend server is unreachable. We don't simulate data. Please check your API keys or ensure the FastAPI/Node server is running on port 8000.
            </p>
          </div>
        ) : (
          <MapView 
            trains={trains} 
            stations={stations}
            corridor={corridor}
            activeScenario={null} 
          />
        )}
        
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
  );
}

export default App;
