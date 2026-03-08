import React from 'react';
import { TrainingJob, TrainingStatus } from '../types';
import { Button } from './Button';

interface TrainingHistoryProps {
  trainingJobs: TrainingJob[];
  onSelectJob: (job: TrainingJob) => void;
  onReTrain: (agentId: string) => void;
  onRollback: (agentId: string, version: number) => void;
}

const STATUS_CONFIG = {
  Queued: { color: 'bg-[#8A8A8E]', text: 'text-[#8A8A8E]', label: 'Queued' },
  Running: { color: 'bg-[#5E6AD2]', text: 'text-[#5E6AD2]', label: 'Running' },
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

export const TrainingHistory: React.FC<TrainingHistoryProps> = ({
  trainingJobs,
  onSelectJob,
  onReTrain,
  onRollback
}) => {
  const sortedJobs = [...trainingJobs].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getJobStatus = (status: TrainingStatus) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.Queued;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="hero-heading text-3xl font-bold text-white tracking-tight">Training History</h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium">
            View past training jobs and manage agent versions
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#8A8A8E] uppercase tracking-widest">Total Jobs</span>
          <p className="text-[13px] font-bold text-white">{trainingJobs.length}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Completed</span>
          </div>
          <p className="text-[13px] font-bold text-white">
            {trainingJobs.filter(j => j.status === 'Completed').length}
          </p>
        </div>

        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Running</span>
          </div>
          <p className="text-[13px] font-bold text-white">
            {trainingJobs.filter(j => j.status === 'Running').length}
          </p>
        </div>

        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Queued</span>
          </div>
          <p className="text-[13px] font-bold text-white">
            {trainingJobs.filter(j => j.status === 'Queued').length}
          </p>
        </div>

        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Failed</span>
          </div>
          <p className="text-[13px] font-bold text-white">
            {trainingJobs.filter(j => j.status === 'Failed').length}
          </p>
        </div>
      </div>

      {/* Training Jobs List */}
      <div className="space-y-3">
        {sortedJobs.map((job) => {
          const statusConfig = getJobStatus(job.status);
          
          return (
            <div
              key={job.id}
              className="linear-card p-5 border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-3 h-3 rounded-full ${statusConfig.color} ${job.status === 'Running' ? 'animate-pulse' : ''}`}></div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-[13px] text-white">Training Job</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${statusConfig.text} bg-opacity-10`}>
                        {statusConfig.label}
                      </span>
                      {job.status === 'Completed' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500">
                          v{job.id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8A8A8E]">
                      ID: {job.id.slice(0, 8)}... • {formatTime(job.startTime)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {job.status === 'Failed' && (
                    <Button
                      variant="ghost"
                      onClick={() => onReTrain(job.agentId)}
                      className="px-3 py-1.5 text-[11px]"
                      title="Re-train"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 text-[11px]"
                    title="View Details"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8A8A8E]">Progress</span>
                  <span className="text-white font-bold">{job.progress}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      job.status === 'Completed' ? 'bg-emerald-500' :
                      job.status === 'Failed' ? 'bg-red-500' :
                      job.status === 'Running' ? 'bg-[#5E6AD2]' :
                      job.status === 'Cancelled' ? 'bg-[#F5A623]' : 'bg-[#8A8A8E]'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-1">
                  <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest">Duration</span>
                  <p className="text-[11px] text-white font-medium">{formatDuration(job.startTime, job.endTime)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest">Data Sources</span>
                  <p className="text-[11px] text-[#8A8A8E] font-medium truncate">
                    {Array.isArray(job.dataSources) 
                      ? (job.dataSources as string[]).join(', ') 
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest">Model Artifact</span>
                  <p className="text-[11px] text-[#8A8A8E] font-mono truncate">
                    {job.modelArtifactPath || 'N/A'}
                  </p>
                </div>
                {job.error && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-red-400 uppercase tracking-widest">Error</span>
                    <p className="text-[11px] text-red-400 truncate">{job.error}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {trainingJobs.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 text-[#8A8A8E]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No training history</h3>
          <p className="text-[#8A8A8E] mb-6">Start training your agent to see its history here.</p>
        </div>
      )}
    </div>
  );
};
