import React from 'react';
import { TrainingJob, TrainingStatus } from '../types';
import { Button } from './Button';

interface TrainingProgressProps {
  trainingJob: TrainingJob;
  onCancel?: () => void;
}

const STATUS_CONFIG = {
  Queued: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]', label: 'Queued' },
  Running: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]', label: 'Training' },
  Completed: { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'Completed' },
  Failed: { color: 'bg-red-500', text: 'text-red-500', label: 'Failed' },
  Cancelled: { color: 'bg-[#F5A623]', text: 'text-[#F5A623]', label: 'Cancelled' }
};

const formatTime = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const formatDuration = (start?: string, end?: string): string => {
  if (!start) return 'N/A';
  
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const durationMs = endDate.getTime() - startDate.getTime();
  
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export const TrainingProgress: React.FC<TrainingProgressProps> = ({ trainingJob, onCancel }) => {
  const { status, progress, estimatedCompletionTime, startTime, endTime, error } = trainingJob;
  const statusConfig = STATUS_CONFIG[status as TrainingStatus] || STATUS_CONFIG.Queued;

  const getProgressColor = (pct: number): string => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-[#5E6AD2]';
    if (pct >= 50) return 'bg-[#F5A623]';
    return 'bg-[#8A8A8E]';
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!estimatedCompletionTime || status !== 'Running') return 'Calculating...';
    
    const now = new Date().getTime();
    const completionTime = new Date(estimatedCompletionTime).getTime();
    const remainingMs = completionTime - now;
    
    if (remainingMs <= 0) return 'Less than 1 minute';
    
    const hours = Math.floor(remainingMs / 3600000);
    const minutes = Math.floor((remainingMs % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="hero-heading text-3xl font-bold text-white tracking-tight">Training Progress</h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium">
            Monitor your agent training progress and estimated completion time
          </p>
        </div>
        {status === 'Running' && onCancel && (
          <Button variant="danger" onClick={onCancel}>
            Cancel Training
          </Button>
        )}
      </div>

      {/* Status Card */}
      <div className="linear-card p-6 border border-white/5">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusConfig.color} animate-pulse`}></div>
              <span className={`text-[13px] font-bold uppercase tracking-widest ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-[15px] text-white">
              {status === 'Completed' && 'Training completed successfully'}
              {status === 'Failed' && 'Training failed'}
              {status === 'Cancelled' && 'Training cancelled'}
              {status === 'Running' && 'Training in progress'}
              {status === 'Queued' && 'Training queued'}
            </p>
          </div>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-[11px] text-red-400 font-medium">Error: {error}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8A8A8E]">Progress</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8A8E] uppercase tracking-widest">Started</span>
            <p className="text-[11px] text-white font-medium">{formatTime(startTime)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8A8E] uppercase tracking-widest">Duration</span>
            <p className="text-[11px] text-white font-medium">{formatDuration(startTime, endTime)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8A8E] uppercase tracking-widest">Est. Completion</span>
            <p className="text-[11px] text-white font-medium">
              {status === 'Running' ? getEstimatedTimeRemaining() : formatTime(estimatedCompletionTime)}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-[#8A8A8E] uppercase tracking-widest">Model Artifact</span>
            <p className="text-[11px] text-[#8A8A8E] font-mono truncate">
              {trainingJob.modelArtifactPath || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8A8A8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Status</span>
          </div>
          <p className={`text-[13px] font-bold ${statusConfig.text}`}>
            {statusConfig.label}
          </p>
        </div>

        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8A8A8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Progress</span>
          </div>
          <p className="text-[13px] font-bold text-white">{progress}% Complete</p>
        </div>

        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8A8A8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Speed</span>
          </div>
          <p className="text-[13px] font-bold text-white">
            {status === 'Running' ? 'Calculating...' : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};
