
import React, { useEffect, useState } from 'react';
import { getUsageStats, UsageStats } from '../services/cacheService';

export const CostMonitor: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({ requests: 0, inputTokens: 0, outputTokens: 0, cacheHits: 0, savedTokens: 0, costEstimate: 0 });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Initial load
    setStats(getUsageStats());

    // Listen for updates
    const handleUpdate = () => setStats(getUsageStats());
    window.addEventListener('usageUpdated', handleUpdate);
    return () => window.removeEventListener('usageUpdated', handleUpdate);
  }, []);

  const formatTokens = (num: number) => {
    if (num > 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num > 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const calculateEfficiency = () => {
    const totalCalls = stats.requests + stats.cacheHits;
    if (totalCalls === 0) return 0;
    return Math.round((stats.cacheHits / totalCalls) * 100);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${expanded ? 'translate-y-0' : 'translate-y-0'}`}>
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {expanded ? (
          <div className="w-64 p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Efficiency Monitor</h3>
                <button onClick={() => setExpanded(false)} className="text-slate-500 hover:text-white">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
             </div>

             <div className="space-y-4">
               <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                 <span className="text-sm text-slate-300">Est. Cost</span>
                 <span className="text-lg font-mono font-bold text-green-400">${stats.costEstimate.toFixed(4)}</span>
               </div>
               
               <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                   <span className="text-slate-500">Cache Rate</span>
                   <span className="text-blue-400 font-bold">{calculateEfficiency()}%</span>
                 </div>
                 <div className="w-full bg-slate-800 rounded-full h-1.5">
                   <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${calculateEfficiency()}%` }}></div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-slate-800 p-2 rounded">
                   <p className="text-slate-500 mb-1">In Tokens</p>
                   <p className="text-slate-200 font-mono">{formatTokens(stats.inputTokens)}</p>
                 </div>
                 <div className="bg-slate-800 p-2 rounded">
                   <p className="text-slate-500 mb-1">Out Tokens</p>
                   <p className="text-slate-200 font-mono">{formatTokens(stats.outputTokens)}</p>
                 </div>
               </div>
               
               <div className="text-[10px] text-center text-slate-600">
                 Saved {formatTokens(stats.savedTokens)} tokens via local caching
               </div>
             </div>
          </div>
        ) : (
          <button 
            onClick={() => setExpanded(true)}
            className="flex items-center gap-3 px-4 py-2 hover:bg-slate-800 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${stats.requests > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Ops Cost</span>
              <span className="text-xs font-mono text-slate-300">${stats.costEstimate.toFixed(3)}</span>
            </div>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <div className="flex flex-col items-start">
               <span className="text-[10px] text-slate-500 font-bold uppercase">Efficiency</span>
               <span className="text-xs font-mono text-blue-400">{calculateEfficiency()}%</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
