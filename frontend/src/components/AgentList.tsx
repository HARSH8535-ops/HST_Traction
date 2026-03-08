import React, { useState } from 'react';
import { AgentProfile, AgentStatus, TaskType } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

interface AgentListProps {
  agents: AgentProfile[];
  onNewAgent: () => void;
  onSelectAgent: (agent: AgentProfile) => void;
  onEditAgent: (agent: AgentProfile) => void;
}

const STATUS_CONFIG = {
  Draft: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]' },
  Training: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]' },
  Ready: { color: 'bg-emerald-500', text: 'text-emerald-500' },
  Failed: { color: 'bg-red-500', text: 'text-red-500' },
  Retraining: { color: 'bg-[#F5A623]', text: 'text-[#F5A623]' }
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  Script_Analysis: 'Script Analysis',
  Emotional_Alignment: 'Emotional Alignment',
  Content_Generation: 'Content Generation',
  Performance_Analysis: 'Performance Analysis',
  Growth_Tactics: 'Growth Tactics',
  Thumbnail_Creation: 'Thumbnail Creation'
};

export const AgentList: React.FC<AgentListProps> = ({ agents, onNewAgent, onSelectAgent, onEditAgent }) => {
  const [filter, setFilter] = useState<string>('All');
  const { showNotification } = useNotification();

  const filteredAgents = filter === 'All' 
    ? agents 
    : agents.filter(agent => agent.status === filter);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('success', 'Copied to clipboard');
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="hero-heading text-4xl font-bold text-white tracking-tight">Agent Profiles</h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium max-w-xl">
            Manage and deploy your fine-tuned AI agents for specialized content creation tasks.
          </p>
        </div>
        <Button onClick={onNewAgent} className="px-6 py-2.5">
          Create Agent
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {['All', ...Object.keys(STATUS_CONFIG)].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${
              filter === status 
                ? 'bg-white text-black' 
                : 'bg-white/5 text-[#8A8A8E] hover:bg-white/10 hover:text-white'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map(agent => (
          <div 
            key={agent.id} 
            className="linear-card p-6 border border-white/5 hover:border-white/10 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-white tracking-tight-linear">{agent.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${STATUS_CONFIG[agent.status as AgentStatus].text} bg-opacity-10`}>
                    {agent.status}
                  </span>
                  <span className="text-[10px] text-[#8A8A8E]">v{agent.version}</span>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditAgent(agent)}
                  className="p-1.5 rounded hover:bg-white/10 text-[#8A8A8E] hover:text-white transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-[13px] text-[#8A8A8E] mb-4 line-clamp-2">{agent.description}</p>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8A8A8E]">Task Type</span>
                <span className="text-white font-medium">{TASK_TYPE_LABELS[agent.taskType]}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8A8A8E]">Last Updated</span>
                <span className="text-[#8A8A8E]">{new Date(agent.updatedAt).toLocaleDateString()}</span>
              </div>
              {agent.trainedModelId && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8A8A8E]">Model ID</span>
                  <span className="text-[#8A8A8E] font-mono">{agent.trainedModelId.slice(0, 8)}...</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-white/5">
              <Button 
                variant="secondary" 
                onClick={() => onSelectAgent(agent)}
                className="flex-1 py-2 text-[11px]"
              >
                View Details
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => handleCopy(agent.id)}
                className="px-2 py-2"
                title="Copy Agent ID"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-[#8A8A8E]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No agents found</h3>
          <p className="text-[#8A8A8E] mb-6">Create your first fine-tuned AI agent to get started.</p>
          <Button onClick={onNewAgent}>Create Agent</Button>
        </div>
      )}
    </div>
  );
};
