import React from 'react';
import { UsageMetrics } from '../services/usageMetricsService';
import { Button } from './Button';

interface AgentUsageMetricsProps {
  metrics: UsageMetrics;
  agentName: string;
  className?: string;
}

export const AgentUsageMetrics: React.FC<AgentUsageMetricsProps> = ({ 
  metrics, 
  agentName,
  className = ''
}) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getSuccessRate = () => {
    if (metrics.totalRequests === 0) return 100;
    return ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1);
  };

  return (
    <div className={`linear-card p-6 border border-white/5 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">2</div>
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Usage Metrics</h3>
        </div>
        <span className="text-[10px] text-[#8A8A8E]">{agentName}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Total Requests</p>
          <p className="text-2xl font-bold text-white">{formatNumber(metrics.totalRequests)}</p>
          <p className="text-[10px] text-emerald-500 mt-1">{getSuccessRate()}% success rate</p>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Successful</p>
          <p className="text-2xl font-bold text-emerald-500">{formatNumber(metrics.successfulRequests)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">Requests processed</p>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Failed</p>
          <p className="text-2xl font-bold text-red-500">{formatNumber(metrics.failedRequests)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">Requests failed</p>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Avg Response</p>
          <p className="text-2xl font-bold text-[#5E6AD2]">{formatTime(metrics.avgResponseTimeMs)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">Average latency</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">P95 Response Time</p>
          <p className="text-xl font-bold text-white">{formatTime(metrics.p95ResponseTimeMs)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">95% of requests faster</p>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">P99 Response Time</p>
          <p className="text-xl font-bold text-white">{formatTime(metrics.p99ResponseTimeMs)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">99% of requests faster</p>
        </div>
        
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Cost per Request</p>
          <p className="text-xl font-bold text-white">{formatCost(0.0025)}</p>
          <p className="text-[10px] text-[#8A8A8E] mt-1">Estimated cost</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-[#8A8A8E]">i</div>
          <p className="text-[10px] text-[#8A8A8E]">Metrics are updated in real-time as requests are processed</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8A8A8E]">Request Volume</span>
              <span className="text-white font-medium">{metrics.totalRequests > 0 ? 'Active' : 'No activity yet'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5E6AD2]" 
                style={{ 
                  width: metrics.totalRequests > 0 
                    ? Math.min(100, (metrics.totalRequests / 1000) * 100) 
                    : 0 
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#8A8A8E]">Performance Health</span>
              <span className={metrics.avgResponseTimeMs < 500 ? 'text-emerald-500' : 'text-[#F5A623]'} font-medium>
                {metrics.avgResponseTimeMs < 500 ? 'Healthy' : 'Needs Attention'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full" 
                style={{ 
                  width: metrics.avgResponseTimeMs < 500 ? '100%' : '50%',
                  backgroundColor: metrics.avgResponseTimeMs < 500 ? '#10B981' : '#F5A623'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
