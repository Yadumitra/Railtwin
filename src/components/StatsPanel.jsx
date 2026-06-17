import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const StatsPanel = ({ stats }) => {
  const data = [
    { name: 'On Time', value: stats.onTime, color: '#10B981' },
    { name: 'Delayed', value: stats.delayed, color: '#F59E0B' },
    { name: 'At Risk', value: stats.atRisk, color: '#F59E0B' },
    { name: 'Stopped', value: stats.stopped, color: '#EF4444' },
  ];

  return (
    <div className="bg-surface rounded-xl border border-border p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-text mb-4">Network Status Overview</h3>
      
      <div className="flex items-center">
        <div className="w-24 h-24 shrink-0 flex items-center justify-center">
          <PieChart width={96} height={96}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={45}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A2235', borderColor: '#1E293B', color: '#F1F5F9' }}
              itemStyle={{ color: '#F1F5F9' }}
            />
          </PieChart>
        </div>
        
        <div className="flex-grow ml-4 grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted text-xs flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-green"></div> On Time
            </span>
            <span className="font-mono font-medium">{stats.onTime}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted text-xs flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-amber"></div> Delayed
            </span>
            <span className="font-mono font-medium">{stats.delayed}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted text-xs flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-amber"></div> At Risk
            </span>
            <span className="font-mono font-medium">{stats.atRisk}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted text-xs flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></div> Stopped
            </span>
            <span className="font-mono font-medium">{stats.stopped}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-sm">
        <span className="text-muted">Total Active Trains</span>
        <span className="font-mono font-bold text-text bg-elevated px-2 py-1 rounded">{stats.total}</span>
      </div>
    </div>
  );
};

export default StatsPanel;
