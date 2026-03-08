// Handles CRUD operations for agent profiles with validation

import { startTraining, getTrainingStatus, TrainingStatus } from './trainingService';
import { trackRequest } from './usageMetricsService';
import { API_URL } from './config';

// Task Types
export enum TaskType {
  Script_Analysis = "Script_Analysis",
  Emotional_Alignment = "Emotional_Alignment",
  Content_Generation = "Content_Generation",
  Performance_Analysis = "Performance_Analysis",
  Growth_Tactics = "Growth_Tactics",
  Thumbnail_Creation = "Thumbnail_Creation"
}

// Agent Status values
export enum AgentStatus {
  Draft = "Draft",
  Training = "Training",
  Ready = "Ready",
  Failed = "Failed",
  Retraining = "Retraining"
}

// Data Source Types
export enum DataSource {
  Public_Dataset = "Public_Dataset",
  Creator_History = "Creator_History",
  Custom_Upload = "Custom_Upload",
  Hybrid_Mode = "Hybrid_Mode"
}

// Types and Interfaces
export interface PersonaConfig {
  tone: string;
  style: string;
  responseLength: "short" | "medium" | "long";
  domainKnowledge: string[];
}

export interface TrainingConfig {
  dataSources: DataSource[];
  weighting: number[];
  minConfidenceThreshold: number;
  maxTokens: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  description?: string;
  taskType: TaskType;
  persona: PersonaConfig;
  trainingConfig: TrainingConfig;
  status: AgentStatus;
  version: number;
  trainedModelId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Default configurations
const DEFAULT_PERSONA: PersonaConfig = {
  tone: "professional",
  style: "analytical",
  responseLength: "medium",
  domainKnowledge: ["general_content_creation"]
};

const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  dataSources: [DataSource.Public_Dataset],
  weighting: [1.0],
  minConfidenceThreshold: 0.7,
  maxTokens: 2048
};

// Validate agent profile properties
export const validateAgentProfile = (profile: Partial<AgentProfile>): ValidationResult => {
  const errors: string[] = [];

  // Required fields
  if (!profile.name || profile.name.trim() === '') {
    errors.push('Agent name is required');
  } else if (profile.name.length > 50) {
    errors.push('Agent name must be 50 characters or less');
  }

  if (!profile.taskType) {
    errors.push('Task type is required');
  } else if (!Object.values(TaskType).includes(profile.taskType as TaskType)) {
    errors.push('Invalid task type');
  }

  // Persona validation
  if (profile.persona) {
    if (!profile.persona.tone) errors.push('Persona tone is required');
    if (!profile.persona.style) errors.push('Persona style is required');
    if (!['short', 'medium', 'long'].includes(profile.persona.responseLength)) {
      errors.push('Invalid response length. Must be short, medium, or long');
    }
  }

  // Training config validation
  if (profile.trainingConfig) {
    if (!profile.trainingConfig.dataSources || profile.trainingConfig.dataSources.length === 0) {
      errors.push('At least one data source is required');
    }
    
    if (profile.trainingConfig.minConfidenceThreshold < 0 || profile.trainingConfig.minConfidenceThreshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }
    
    if (profile.trainingConfig.weighting) {
      const sum = profile.trainingConfig.weighting.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1.0) > 0.01) {
        errors.push('Weighting array must sum to approximately 1.0');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Create a new agent profile
export const createAgentProfile = async (
  userId: string,
  data: Partial<AgentProfile>
): Promise<{ agent?: AgentProfile, error?: string }> => {
  const startTime = Date.now();
  
  try {
    const validation = validateAgentProfile(data);
    if (!validation.isValid) {
      return { error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    // Check for duplicate names for this user (simulated)
    const existing = await getAgentProfiles(userId);
    if (existing.some(a => a.name === data.name)) {
        return { error: 'An agent with this name already exists' };
    }

    const newAgent = {
      ...data,
      userId,
      persona: data.persona || DEFAULT_PERSONA,
      trainingConfig: data.trainingConfig || DEFAULT_TRAINING_CONFIG,
      status: AgentStatus.Draft,
      version: 1,
      isActive: false
    };

    const response = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent)
    });
    
    if (!response.ok) {
        throw new Error('Failed to create agent');
    }

    const createdAgent = await response.json();
    trackRequest('system', 'create_agent', Date.now() - startTime, undefined, 'agent_management', undefined, true);
    
    return { agent: createdAgent };
  } catch (error: any) {
    trackRequest('system', 'create_agent', Date.now() - startTime, undefined, 'agent_management', error.message, false);
    return { error: `Failed to create agent: ${error.message}` };
  }
};

// Get all agent profiles for a user
export const getAgentProfiles = async (userId: string): Promise<AgentProfile[]> => {
  try {
    const response = await fetch(`${API_URL}/api/agents?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    return await response.json();
  } catch (error) {
    console.error('Error fetching agent profiles:', error);
    return [];
  }
};

// Get a specific agent profile
export const getAgentProfile = async (userId: string, agentId: string): Promise<AgentProfile | null> => {
  try {
    const response = await fetch(`${API_URL}/api/agents?userId=${userId}&id=${agentId}`);
    if (!response.ok) throw new Error('Failed to fetch agent');
    return await response.json();
  } catch (error) {
    console.error(`Error fetching agent ${agentId}:`, error);
    return null;
  }
};

// Update an agent profile
export const updateAgentProfile = async (
  userId: string,
  agentId: string,
  updates: Partial<AgentProfile>
): Promise<{ success: boolean, agent?: AgentProfile, error?: string }> => {
  const startTime = Date.now();

  try {
    const current = await getAgentProfile(userId, agentId);
    if (!current) return { success: false, error: 'Agent not found' };
    
    // Cannot update while training
    if (current.status === AgentStatus.Training || current.status === AgentStatus.Retraining) {
      return { success: false, error: 'Cannot update agent while training is in progress' };
    }

    const updatedData = { ...current, ...updates, id: agentId, userId };
    
    const validation = validateAgentProfile(updatedData);
    if (!validation.isValid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    const response = await fetch(`${API_URL}/api/agents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });
    
    if (!response.ok) throw new Error('Failed to update agent');

    const updatedAgent = await response.json();
    trackRequest('system', 'update_agent', Date.now() - startTime, undefined, 'agent_management', undefined, true);
    
    return { success: true, agent: updatedAgent };
  } catch (error: any) {
    trackRequest('system', 'update_agent', Date.now() - startTime, undefined, 'agent_management', error.message, false);
    return { success: false, error: `Failed to update agent: ${error.message}` };
  }
};

// Delete an agent profile
export const deleteAgentProfile = async (
  userId: string,
  agentId: string
): Promise<{ success: boolean, error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/agents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: agentId })
    });
    
    if (!response.ok) throw new Error('Failed to delete agent');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Failed to delete agent: ${error.message}` };
  }
};

// Start training process for an agent
export const initiateAgentTraining = async (
  userId: string,
  agentId: string
): Promise<{ success: boolean, jobId?: string, error?: string }> => {
  try {
    const agent = await getAgentProfile(userId, agentId);
    
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }
    
    if (agent.status === AgentStatus.Training || agent.status === AgentStatus.Retraining) {
      return { success: false, error: 'Agent is already training' };
    }

    // Determine new status
    const newStatus = agent.status === AgentStatus.Ready ? AgentStatus.Retraining : AgentStatus.Training;
    
    // Update agent status
    await updateAgentProfile(userId, agentId, { status: newStatus });
    
    // Start the actual training job
    const trainingResult = await startTraining(agentId, agent.trainingConfig);
    
    if (!trainingResult.success) {
      // Revert status on failure
      await updateAgentProfile(userId, agentId, { status: agent.status });
      return { success: false, error: trainingResult.error };
    }
    
    return { success: true, jobId: trainingResult.jobId };
    
  } catch (error: any) {
    return { success: false, error: `Failed to initiate training: ${error.message}` };
  }
};

// Sync agent status with its active training job
export const syncAgentStatus = async (userId: string, agentId: string): Promise<void> => {
  try {
    const agent = await getAgentProfile(userId, agentId);
    
    if (!agent) return;
    
    // Only check if we think it's training
    if (agent.status === AgentStatus.Training || agent.status === AgentStatus.Retraining) {
      const activeJob = await getTrainingStatus(agentId);

      if (activeJob) {
        if (activeJob.status === TrainingStatus.Completed) {
          await updateAgentProfile(userId, agentId, {
            status: AgentStatus.Ready,
            trainedModelId: activeJob.modelArtifactPath,
            version: agent.version + 1
          });
        } else if (activeJob.status === TrainingStatus.Failed || activeJob.status === TrainingStatus.Cancelled) {
          // If it was retraining, it falls back to Ready (previous version still works)
          // If it was initial training, it goes to Failed
          const newStatus = agent.status === AgentStatus.Retraining ? AgentStatus.Ready : AgentStatus.Failed;
          await updateAgentProfile(userId, agentId, { status: newStatus });
        }
      }
    }
  } catch (error) {
    console.error(`Error syncing status for agent ${agentId}:`, error);
  }
};
