// Handles training job orchestration, progress tracking, and data management

import { AgentStatus, DataSource, TaskType } from './agentProfileService';

import { API_URL } from './config';

// Training status values
export enum TrainingStatus {
  Queued = "Queued",
  Running = "Running",
  Completed = "Completed",
  Failed = "Failed",
  Cancelled = "Cancelled"
}

export interface TrainingJob {
  id: string;
  agentId: string;
  status: TrainingStatus;
  progress: number;
  estimatedCompletionTime?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
  modelArtifactPath?: string;
  dataSources?: string[];
  createdAt?: string;
}

// Start a new training job for an agent
export const startTraining = async (
  agentId: string,
  config: any
): Promise<{ success: boolean, jobId?: string, error?: string }> => {
  try {
    const newJob = {
      agentId,
      status: TrainingStatus.Queued,
      progress: 0,
      dataSources: config.dataSources || [],
    };
    
    const response = await fetch(`${API_URL}/api/training_jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
    });
    
    if (!response.ok) throw new Error('Failed to create training job');
    const createdJob = await response.json();

    // Start background simulation of training progress
    simulateTrainingProgress(createdJob.id, agentId);

    return { success: true, jobId: createdJob.id };
  } catch (error: any) {
    return { success: false, error: `Failed to start training: ${error.message}` };
  }
};

// Simulate training progress asynchronously
const simulateTrainingProgress = async (jobId: string, agentId: string) => {
  let progress = 0;

  const interval = setInterval(async () => {
    progress += Math.floor(Math.random() * 15) + 5; // Increment by 5-20%
    
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      try {
        const updateData = {
          agentId,
          id: jobId,
          status: TrainingStatus.Completed,
          progress,
          endTime: new Date().toISOString(),
          modelArtifactPath: `s3://tractionpal-models/${agentId}/v2/model.bin`
        };

        await fetch(`${API_URL}/api/training_jobs`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
      } catch (error) {
        console.error('Error updating training job to Completed:', error);
      }
    } else {
        try {
            const updateData = {
              agentId,
              id: jobId,
              status: TrainingStatus.Running,
              progress
            };

            await fetch(`${API_URL}/api/training_jobs`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error('Error updating training progress:', error);
        }
    }
  }, 2000); // Update every 2 seconds
};


// Get training status for an agent
export const getTrainingStatus = async (
  agentId: string,
  jobId?: string
): Promise<TrainingJob | null> => {
  try {
    let url = `${API_URL}/api/training_jobs?agentId=${agentId}`;
    if (jobId) url += `&id=${jobId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch training status');
    
    const data = await response.json();
    
    if (jobId) {
        return data; // returns specific job item
    } else {
        // Return latest job if query by agentId
        if (data && data.length > 0) {
            return data.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
        }
        return null;
    }
  } catch (error) {
    console.error(`Error fetching training status for agent ${agentId}:`, error);
    return null;
  }
};

// Get training history for an agent
export const getTrainingHistory = async (
  agentId: string
): Promise<TrainingJob[]> => {
  try {
    const response = await fetch(`${API_URL}/api/training_jobs?agentId=${agentId}`);
    if (!response.ok) throw new Error('Failed to fetch training history');
    const jobs = await response.json();
    return jobs.sort((a: any, b: any) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error(`Error fetching training history for agent ${agentId}:`, error);
    return [];
  }
};

// Cancel an active training job
export const cancelTrainingJob = async (
  agentId: string,
  jobId: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    const job = await getTrainingStatus(agentId, jobId);
    
    if (!job) return { success: false, error: 'Job not found' };
    
    if (job.status === TrainingStatus.Completed || job.status === TrainingStatus.Failed || job.status === TrainingStatus.Cancelled) {
      return { success: false, error: `Cannot cancel job in ${job.status} state` };
    }
    
    const response = await fetch(`${API_URL}/api/training_jobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, id: jobId, status: TrainingStatus.Cancelled })
    });
    
    if (!response.ok) throw new Error('Failed to cancel job');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Failed to cancel job: ${error.message}` };
  }
};

// ... keep mock functionality for datasets
export interface TrainingDataSummary {
  source: DataSource;
  count: number;
  qualityScore: number;
  sizeBytes: number;
}

export const analyzeTrainingData = async (
  dataSources: DataSource[]
): Promise<TrainingDataSummary[]> => {
  // Mock data analysis
  return dataSources.map(source => ({
    source,
    count: Math.floor(Math.random() * 5000) + 500,
    qualityScore: (Math.floor(Math.random() * 30) + 70) / 100, // 0.70 to 0.99
    sizeBytes: Math.floor(Math.random() * 50000000) + 10000000 // 10MB to 60MB
  }));
};

export const syncCreatorData = async (
  creatorId: string,
  platform: string
): Promise<{ success: boolean, dataPointsSynced?: number, error?: string }> => {
  try {
    const syncedPoints = Math.floor(Math.random() * 200) + 50;
    return { success: true, dataPointsSynced: syncedPoints };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
