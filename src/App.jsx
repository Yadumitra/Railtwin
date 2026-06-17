import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import AlertFeed from './components/AlertFeed';
import MapView from './components/MapView';
import RailwayGPT from './components/RailwayGPT';
import DisasterSimModal from './components/DisasterSimModal';
import { INITIAL_TRAINS } from './data/trains';

const calculateStats = (trains) => {
  return trains.reduce((acc, t) => {
    acc[t.status === 'on-time' ? 'onTime' : t.status === 'delayed' ? 'delayed' : t.status === 'at-risk' ? 'atRisk' : 'stopped']++;
    acc.total++;
    return acc;
  }, { onTime: 0, delayed: 0, atRisk: 0, stopped: 0, total: 0 });
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

function App() {
  const [trains, setTrains] = useState(INITIAL_TRAINS);
  const [alerts, setAlerts] = useState([]);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  const stats = calculateStats(trains);
  const networkHealth = Math.round((stats.onTime / stats.total) * 100);

  useEffect(() => {
    const moveTimer = setInterval(() => {
      setTrains(prevTrains => prevTrains.map(t => {
        if (t.status === 'stopped') return t;
        const latChange = (Math.random() - 0.5) * 0.05;
        const lngChange = (Math.random() - 0.5) * 0.05;
        return {
          ...t,
          lat: t.lat + latChange,
          lng: t.lng + lngChange
        };
      }));
    }, 3000);
    return () => clearInterval(moveTimer);
  }, []);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      if (trains.length === 0) return;
      const targetTrain = trains[Math.floor(Math.random() * trains.length)];
      
      let type = 'info';
      let message = '';
      
      if (targetTrain.status === 'stopped') {
        type = 'critical';
        message = `CRITICAL: Train ${targetTrain.name} stopped at non-scheduled location. Duration: ${targetTrain.delay} min.`;
      } else if (targetTrain.status === 'at-risk') {
        type = 'warning';
        message = `WARNING: Train ${targetTrain.name} approaching hazard zone.`;
      } else if (targetTrain.status === 'delayed') {
        type = 'warning';
        message = `WARNING: Train ${targetTrain.name} running ${targetTrain.delay} min delayed.`;
      } else {
        const infoMsg = [
          `Track maintenance detected near ${targetTrain.from}. Speed restriction applied.`,
          `Passenger density high at ${targetTrain.to}. Platform overcrowded.`,
          `Train ${targetTrain.name} operating at optimal speed.`
        ][Math.floor(Math.random() * 3)];
        message = `INFO: ${infoMsg}`;
      }

      const newAlert = {
        id: Date.now().toString(),
        type,
        message,
        time: 'Just now',
        trainId: targetTrain.id
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 12));
    }, Math.floor(Math.random() * 7000) + 8000);
    
    return () => clearInterval(alertTimer);
  }, [trains]);

  const handleActivateScenario = (scenario) => {
    setActiveScenario(scenario);
    setIsSimModalOpen(false);

    let affectedCount = 0;
    setTrains(prevTrains => prevTrains.map(t => {
      const dist = getDistance(t.lat, t.lng, scenario.lat, scenario.lng);
      if (dist <= scenario.radius) {
        affectedCount++;
        return { ...t, status: 'stopped', speed: 0, delay: 120, riskScore: 100 };
      }
      return t;
    }));

    const newAlert = {
      id: Date.now().toString(),
      type: 'critical',
      message: `DISASTER ALERT: ${scenario.name} reported. ${affectedCount} trains halted in affected zone.`,
      time: 'Just now'
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 12));

    setChatMessages(prev => [
      ...prev,
      { role: 'assistant', content: `🚨 DISASTER ALERT: ${scenario.name} activated. Assessing impact on network... ${affectedCount} trains have been halted in the affected zone. Awaiting further operational instructions.` }
    ]);
  };

  const handleCancelScenario = () => {
    setActiveScenario(null);
    setAlerts(prev => [{
      id: Date.now().toString(),
      type: 'resolved',
      message: `DISASTER SIMULATION CANCELLED: Operations resuming normal state.`,
      time: 'Just now'
    }, ...prev].slice(0, 12));
    
    setTrains(prevTrains => prevTrains.map(t => {
      if (t.status === 'stopped' && Math.random() > 0.5) {
         return { ...t, status: 'delayed', speed: 40, delay: 45, riskScore: 50 };
      }
      return t;
    }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-primary text-text overflow-hidden">
      <TopBar 
        onSimulateClick={() => setIsSimModalOpen(true)} 
        networkHealth={networkHealth}
        totalTrains={stats.total}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <AlertFeed alerts={alerts} stats={stats} />
        
        <MapView 
          trains={trains} 
          activeScenario={activeScenario} 
        />
        
        <RailwayGPT 
          trains={trains}
          alerts={alerts}
          stats={stats}
          networkHealth={networkHealth}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
        />
      </div>

      <DisasterSimModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        onActivate={handleActivateScenario}
        activeScenario={activeScenario}
        onCancel={handleCancelScenario}
      />
    </div>
  );
}

export default App;
