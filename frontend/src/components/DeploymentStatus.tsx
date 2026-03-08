import React from 'react';
import { AgentStatus } from '../types';
import { Button } from './Button';

interface DeploymentStatusProps {
  status: AgentStatus | 'Deployed' | 'Undeployed' | 'Deploying' | 'Undeploying';
  version: number;
  agentName: string;
  className?: string;
}

const STATUS_CONFIG = {
  Draft: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]', bgOpacity: 'bg-opacity-10' },
  Training: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]', bgOpacity: 'bg-opacity-10' },
  Ready: { color: 'bg-emerald-500', text: 'text-emerald-500', bgOpacity: 'bg-opacity-10' },
  Failed: { color: 'bg-red-500', text: 'text-red-500', bgOpacity: 'bg-opacity-10' },
  Retraining: { color: 'bg-[#F5A623]', text: 'text-[#F5A623]', bgOpacity: 'bg-opacity-10' },
  Deployed: { color: 'bg-emerald-500', text: 'text-emerald-500', bgOpacity: 'bg-opacity-10' },
  Undeployed: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]', bgOpacity: 'bg-opacity-10' },
  Deploying: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]', bgOpacity: 'bg-opacity-10' },
  Undeploying: { color: 'bg-[#F5A623]', text: 'text-[#F5A623]', bgOpacity: 'bg-opacity-10' }
};

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ 
  status, 
  version, 
  agentName,
  className = ''
}) => {
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Draft;
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${config.color} ${config.bgOpacity} ${config.text}`}>
        {status}
      </span>
    );
  };

  return (
    <div className={`linear-card p-6 border border-white/5 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">1</div>
        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Deployment Status</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Agent Name</span>
          <span className="text-white font-medium">{agentName}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Current Status</span>
          {getStatusBadge(status)}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Active Version</span>
          <span className="text-white font-medium">v{version}</span>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-[#8A8A8E]">i</div>
          <p className="text-[10px] text-[#8A8A8E]">Deployed agents are available for inference requests</p>
        </div>
        
        {status === 'Deployed' && (
          <div className="flex items-center gap-2 text-[10px] text-emerald-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Agent is currently active and processing requests</span>
          </div>
        )}
        
        {status === 'Undeployed' && (
          <div className="flex items-center gap-2 text-[10px] text-[#8A8A8E]">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Agent is ready but not deployed for inference</span>
          </div>
        )}
        
        {(status === 'Deploying' || status === 'Undeploying') && (
          <div className="flex items-center gap-2 text-[10px] text-[#5E6AD2]">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Deployment operation in progress...</span>
          </div>
        )}
      </div>
    </div>
  );
};
