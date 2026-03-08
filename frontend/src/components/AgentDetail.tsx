import React, { useState } from 'react';
import { AgentProfile, AgentStatus, TaskType, PersonaConfig, TrainingConfig, DataSource } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

interface AgentDetailProps {
  agent: AgentProfile;
  onBack: () => void;
  onEdit: () => void;
  onDeploy: () => void;
  onUndeploy: () => void;
  onTrain: () => void;
  onRetrain: () => void;
}

const STATUS_CONFIG = {
  Draft: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]', bgOpacity: 'bg-opacity-10' },
  Training: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]', bgOpacity: 'bg-opacity-10' },
  Ready: { color: 'bg-emerald-500', text: 'text-emerald-500', bgOpacity: 'bg-opacity-10' },
  Failed: { color: 'bg-red-500', text: 'text-red-500', bgOpacity: 'bg-opacity-10' },
  Retraining: { color: 'bg-[#F5A623]', text: 'text-[#F5A623]', bgOpacity: 'bg-opacity-10' }
};

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  Script_Analysis: 'Script Analysis',
  Emotional_Alignment: 'Emotional Alignment',
  Content_Generation: 'Content Generation',
  Performance_Analysis: 'Performance Analysis',
  Growth_Tactics: 'Growth Tactics',
  Thumbnail_Creation: 'Thumbnail Creation'
};

const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  Public_Dataset: 'Public Dataset',
  Creator_History: 'Creator History',
  Custom_Upload: 'Custom Upload',
  Hybrid_Mode: 'Hybrid Mode'
};

export const AgentDetail: React.FC<AgentDetailProps> = ({ 
  agent, 
  onBack, 
  onEdit, 
  onDeploy, 
  onUndeploy, 
  onTrain, 
  onRetrain 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'configuration' | 'training' | 'analytics'>('overview');
  const { showNotification } = useNotification();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('success', 'Copied to clipboard');
  };

  const getStatusBadge = (status: AgentStatus) => (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${STATUS_CONFIG[status].color} ${STATUS_CONFIG[status].bgOpacity} ${STATUS_CONFIG[status].text}`}>
      {status}
    </span>
  );

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOverviewTab = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Agent Header */}
      <div className="linear-card p-8 border border-white/5">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white tracking-tight">{agent.name}</h2>
              {getStatusBadge(agent.status)}
            </div>
            <p className="text-[15px] text-[#8A8A8E] font-medium max-w-2xl">{agent.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onEdit} className="px-4 py-2 text-[11px]">
              Edit
            </Button>
            {agent.status === 'Ready' ? (
              <Button variant="danger" onClick={onUndeploy} className="px-4 py-2 text-[11px]">
                Undeploy
              </Button>
            ) : (
              <Button variant="primary" onClick={onDeploy} className="px-4 py-2 text-[11px]">
                Deploy
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-white/5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Task Type</p>
            <p className="text-white font-medium">{TASK_TYPE_LABELS[agent.taskType]}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Version</p>
            <p className="text-white font-medium">v{agent.version}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Created</p>
            <p className="text-[#8A8A8E]">{formatTimestamp(agent.createdAt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Last Updated</p>
            <p className="text-[#8A8A8E]">{formatTimestamp(agent.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="linear-card p-6 border border-white/5 hover:border-white/10 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-white mb-2">Start Training</h3>
          <p className="text-[11px] text-[#8A8A8E] mb-4">Initiate training for this agent using configured data sources</p>
          <Button 
            variant="secondary" 
            onClick={onTrain}
            disabled={agent.status === 'Training' || agent.status === 'Retraining'}
            className="w-full py-2 text-[11px]"
          >
            {agent.status === 'Training' || agent.status === 'Retraining' ? 'Training in Progress' : 'Start Training'}
          </Button>
        </div>

        <div className="linear-card p-6 border border-white/5 hover:border-white/10 transition-all">
          <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="font-bold text-white mb-2">Retrain Agent</h3>
          <p className="text-[11px] text-[#8A8A8E] mb-4">Update agent with new data while maintaining previous version</p>
          <Button 
            variant="secondary" 
            onClick={onRetrain}
            disabled={agent.status !== 'Ready'}
            className="w-full py-2 text-[11px]"
          >
            {agent.status === 'Ready' ? 'Start Retraining' : 'Not Available'}
          </Button>
        </div>

        <div className="linear-card p-6 border border-white/5 hover:border-white/10 transition-all">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-white mb-2">Deployment Status</h3>
          <p className="text-[11px] text-[#8A8A8E] mb-4">Manage agent deployment and availability</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8A8A8E]">Deployed</span>
              <span className={agent.status === 'Ready' ? 'text-emerald-500' : 'text-[#8A8A8E]'}>
                {agent.status === 'Ready' ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8A8A8E]">Active Version</span>
              <span className="text-white">v{agent.version}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfigurationTab = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Persona Configuration */}
      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">1</div>
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Persona Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Tone</p>
              <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium capitalize">{agent.persona.tone}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Style</p>
              <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium capitalize">{agent.persona.style}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Response Length</p>
              <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium capitalize">{agent.persona.responseLength}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Domain Knowledge</p>
              <div className="flex flex-wrap gap-2">
                {agent.persona.domainKnowledge.length > 0 ? (
                  agent.persona.domainKnowledge.map((domain, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-[#8A8A8E]">
                      {domain}
                    </span>
                  ))
                ) : (
                  <p className="text-[#8A8A8E] text-[11px]">No domain knowledge configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Training Configuration */}
      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">2</div>
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Training Configuration</h3>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Data Sources</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agent.trainingConfig.dataSources.map((source, idx) => (
                <div key={idx} className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{DATA_SOURCE_LABELS[source as DataSource]}</span>
                    <span className="text-[#8A8A8E] text-[10px]">{(agent.trainingConfig.weighting[idx] * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#5E6AD2]" 
                      style={{ width: `${agent.trainingConfig.weighting[idx] * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Min Confidence Threshold</p>
              <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium">{(agent.trainingConfig.minConfidenceThreshold * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Max Tokens</p>
              <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-white font-medium">{agent.trainingConfig.maxTokens}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Information */}
      {agent.trainedModelId && (
        <div className="linear-card p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">3</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Model Information</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Trained Model ID</span>
              <div className="flex items-center gap-2">
                <span className="text-[#8A8A8E] font-mono text-[11px]">{agent.trainedModelId}</span>
                <button 
                  onClick={() => handleCopy(agent.trainedModelId)}
                  className="text-[#8A8A8E] hover:text-white transition-colors"
                  title="Copy Model ID"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Model Status</span>
              <span className="text-emerald-500 text-[11px] font-medium">Available</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTrainingTab = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Training History */}
      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">1</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Training History</h3>
          </div>
          <span className="text-[10px] text-[#8A8A8E]">Version {agent.version}</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-[13px]">Initial Training</h4>
                <span className="text-[10px] text-[#8A8A8E]">{formatTimestamp(agent.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-500">Completed</span>
                <span className="text-[#8A8A8E]">v{agent.version}</span>
                <span className="text-[#8A8A8E]">•</span>
                <span className="text-[#8A8A8E]">{agent.trainingConfig.dataSources.length} data sources</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Training Status */}
      {agent.status === 'Training' || agent.status === 'Retraining' ? (
        <div className="linear-card p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center text-[#5E6AD2] text-[10px] font-bold">2</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Current Training Progress</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A8A8E]">Training Status</span>
              <span className="text-[#5E6AD2] font-medium">{agent.status}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#8A8A8E]">Progress</span>
                <span className="text-white font-medium">75%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#5E6AD2] rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-[#8A8A8E]">Data Processed</p>
                <p className="text-white text-[13px]">1,250 examples</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-[#8A8A8E]">Epochs</p>
                <p className="text-white text-[13px]">3/5</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="linear-card p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">2</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Training Status</h3>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#8A8A8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[#8A8A8E]">No active training sessions</p>
            <p className="text-[11px] text-[#8A8A8E] mt-2">Ready to start training</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">1</div>
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Performance Overview</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Total Requests</p>
            <p className="text-3xl font-bold text-white">1,247</p>
            <p className="text-[10px] text-emerald-500 mt-1">+23% this week</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Avg Accuracy</p>
            <p className="text-3xl font-bold text-white">92.4%</p>
            <p className="text-[10px] text-emerald-500 mt-1">+1.2% this week</p>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5">
            <p className="text-[10px] text-[#8A8A8E] uppercase tracking-widest mb-2">Avg Response Time</p>
            <p className="text-3xl font-bold text-white">245ms</p>
            <p className="text-[10px] text-[#F5A623] mt-1">+12ms this week</p>
          </div>
        </div>
      </div>

      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">2</div>
          <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Usage by Task Type</h3>
        </div>

        <div className="space-y-4">
          {Object.values(TASK_TYPE_LABELS).map((task, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8A8A8E]">{task}</span>
                <span className="text-white font-medium">{Math.floor(Math.random() * 100)} requests</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#5E6AD2]" 
                  style={{ width: `${Math.random() * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[11px] font-bold text-[#8A8A8E] hover:text-white uppercase tracking-widest transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Agents
      </button>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 border-b border-white/5 pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'configuration', label: 'Configuration' },
          { id: 'training', label: 'Training' },
          { id: 'analytics', label: 'Analytics' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-[#5E6AD2]'
                : 'text-[#8A8A8E] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'configuration' && renderConfigurationTab()}
      {activeTab === 'training' && renderTrainingTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}
    </div>
  );
};
