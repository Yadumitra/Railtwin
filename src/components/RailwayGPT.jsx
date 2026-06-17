import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Lock, BrainCircuit, Loader2 } from 'lucide-react';

const SYSTEM_PROMPT_TEMPLATE = `You are RailwayGPT, the AI operations assistant for RailTwin — India's next-generation railway operations platform.

You have access to live data for 30 trains currently operating across India's railway network.

CURRENT TRAIN DATA:
{TRAIN_DATA}

CURRENT ALERTS:
{ALERTS_DATA}

NETWORK STATUS:
- Total trains: 30
- On time: {ON_TIME}
- Delayed: {DELAYED}  
- At risk: {AT_RISK}
- Stopped: {STOPPED}
- Network health: {HEALTH}%

You answer questions from railway operations managers. Be specific, professional, and reference actual train IDs and names from the data. Keep responses concise (3-5 sentences max unless a detailed breakdown is requested). Format lists clearly. Always prioritize safety-critical information. You may suggest operational decisions but always note they require human authorization.

If the user asks about a disaster simulation or flood/landslide scenario, describe the impact on trains in the affected zone based on their current positions.`;

const QUICK_ACTIONS = [
  "Which trains are at risk right now?",
  "Simulate flood in Kerala — what's the impact?",
  "Show me the most delayed trains",
  "What's the current network health?"
];

const WelcomeMessage = `Welcome to RailwayGPT. I'm monitoring 30 active trains across India's railway network.

Current status: {ON_TIME} trains on time, {DELAYED} delayed, {AT_RISK} at risk, {STOPPED} stopped.

Network health is at {HEALTH}%. I've flagged {AT_RISK} trains for immediate attention. Ask me anything about current operations, delays, or safety risks.`;

const RailwayGPT = ({ trains, alerts, stats, networkHealth, chatMessages, setChatMessages }) => {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      const msg = WelcomeMessage
        .replace('{ON_TIME}', stats.onTime)
        .replace('{DELAYED}', stats.delayed)
        .replace('{AT_RISK}', stats.atRisk)
        .replace('{STOPPED}', stats.stopped)
        .replace('{HEALTH}', networkHealth)
        .replace('{AT_RISK}', stats.atRisk);
        
      setChatMessages([{ role: 'assistant', content: msg }]);
    }
  }, []); // Only run once on mount

  const handleSend = async (textOverride) => {
    const textToProcess = textOverride || input;
    if (!textToProcess.trim()) return;
    
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    const newUserMsg = { role: 'user', content: textToProcess };
    const newHistory = [...chatMessages, newUserMsg];
    
    setChatMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = SYSTEM_PROMPT_TEMPLATE
        .replace('{TRAIN_DATA}', JSON.stringify(trains, null, 2))
        .replace('{ALERTS_DATA}', JSON.stringify(alerts.slice(0, 5), null, 2))
        .replace('{ON_TIME}', stats.onTime)
        .replace('{DELAYED}', stats.delayed)
        .replace('{AT_RISK}', stats.atRisk)
        .replace('{STOPPED}', stats.stopped)
        .replace('{HEALTH}', networkHealth);

      const apiMessages = newHistory.filter(m => m.role === 'user' || m.role === 'assistant');

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1000,
          system: systemPrompt,
          messages: apiMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setChatMessages([...newHistory, { role: 'assistant', content: data.content[0].text }]);
      
    } catch (err) {
      console.error(err);
      setChatMessages([...newHistory, { 
        role: 'assistant', 
        content: `Error connecting to Claude API. Please check your API key and try again. (${err.message})` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[360px] shrink-0 bg-surface border-l border-border flex flex-col h-[calc(100vh-64px)] z-10 relative">
      {/* Header */}
      <div className="p-4 border-b border-border bg-elevated/50 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-accent-blue/20 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-accent-blue" />
          </div>
          <div>
            <h2 className="font-display font-bold text-text leading-none">RailwayGPT</h2>
            <span className="text-[10px] text-muted">Powered by Claude</span>
          </div>
        </div>
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded transition-colors ${apiKey ? 'text-accent-green bg-accent-green/10' : 'text-muted hover:text-text hover:bg-elevated'}`}
          title="API Settings"
        >
          {apiKey ? <Lock className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 left-0 right-0 bg-elevated border-b border-border p-4 shadow-lg z-20 animate-[fadeIn_0.2s_ease-out]">
          <label className="block text-xs text-muted mb-1">Anthropic API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent-blue"
          />
          <p className="text-[10px] text-muted mt-2 leading-tight">
            Key is stored locally in React state and sent directly to Anthropic.
          </p>
          <div className="flex justify-end mt-3">
            <button 
              onClick={() => setShowSettings(false)}
              className="bg-accent-blue hover:bg-accent-blue/90 text-white text-xs px-3 py-1.5 rounded"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}>
            <div 
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-accent-blue text-white rounded-tr-sm' 
                  : 'bg-elevated border border-border text-text rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-elevated border border-border rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-accent-blue animate-spin" />
              <span className="text-xs text-muted">RailwayGPT is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSend(action)}
              className="shrink-0 bg-elevated hover:bg-surface border border-border px-3 py-1.5 rounded-full text-[11px] text-muted hover:text-text transition-colors whitespace-nowrap"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 pt-0 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about network status..."
            className="w-full bg-elevated border border-border rounded-xl pl-4 pr-10 py-3 text-sm text-text focus:outline-none focus:border-accent-blue transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 text-muted hover:text-accent-blue disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RailwayGPT;
