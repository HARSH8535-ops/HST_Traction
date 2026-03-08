// Handles agent deployment, scaling, and endpoint management

import { trackRequest } from './usageMetricsService';
import { API_URL } from './config';

export enum DeploymentStatus {
  Pending = "Pending",
  Deploying = "Deploying",
  Active = "Active",
  Failed = "Failed",
  Stopped = "Stopped"
}

export interface DeploymentConfig {
  minInstances: number;
  maxInstances: number;
  targetConcurrency: number;
  timeoutSeconds: number;
}

export interface DeploymentRecord {
  id: string;
  agentId: string;
  version: number;
  environment: string;
  status: DeploymentStatus;
  endpointUrl?: string;
  config: DeploymentConfig;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

const DEFAULT_DEPLOYMENT_CONFIG: DeploymentConfig = {
  minInstances: 1,
  maxInstances: 5,
  targetConcurrency: 10,
  timeoutSeconds: 30
};

// Deploy a trained agent to an environment
export const deployAgent = async (
  agentId: string,
  version: number,
  environment: string = 'production',
  config: Partial<DeploymentConfig> = {}
): Promise<{ success: boolean, deployment?: DeploymentRecord, error?: string }> => {
  const startTime = Date.now();

  try {
    const deploymentConfig = { ...DEFAULT_DEPLOYMENT_CONFIG, ...config };
    
    const newDeployment = {
      agentId,
      version,
      environment,
      status: DeploymentStatus.Deploying,
      config: deploymentConfig,
    };
    
    const response = await fetch(`${API_URL}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDeployment)
    });
    
    if (!response.ok) throw new Error('Failed to start deployment');
    const createdDeployment = await response.json();

    // Simulate async deployment process (success after 5 seconds)
    simulateDeploymentCompletion(createdDeployment.id, agentId, environment);

    trackRequest('system', 'deploy_agent', Date.now() - startTime, undefined, 'deployment', undefined, true);
    return { success: true, deployment: createdDeployment };
  } catch (error: any) {
    trackRequest('system', 'deploy_agent', Date.now() - startTime, undefined, 'deployment', error.message, false);
    return { success: false, error: `Deployment failed: ${error.message}` };
  }
};

// Background task to simulate deployment completion
const simulateDeploymentCompletion = async (deploymentId: string, agentId: string, environment: string) => {
  setTimeout(async () => {
    try {
      const endpointUrl = `https://api.tractionpal.com/v1/agents/${agentId}/invoke`;

      const updateData = {
          agentId,
          environment,
          status: DeploymentStatus.Active,
          endpointUrl,
          id: deploymentId
      };

      await fetch(`${API_URL}/api/deployments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
      });
      console.log(`Simulated deployment completion for ${agentId}`);
    } catch (error) {
      console.error('Failed to simulate deployment completion', error);
    }
  }, 5000);
};

// Get deployment status for an agent
export const getDeploymentStatus = async (
  agentId: string,
  environment: string = 'production'
): Promise<DeploymentRecord | null> => {
  try {
    const response = await fetch(`${API_URL}/api/deployments?agentId=${agentId}&environment=${environment}`);
    if (!response.ok) throw new Error('Failed to fetch deployment');
    return await response.json();
  } catch (error) {
    console.error(`Error fetching deployment for agent ${agentId}:`, error);
    return null;
  }
};

// Stop a deployment (undeploy)
export const stopDeployment = async (
  agentId: string,
  environment: string = 'production'
): Promise<{ success: boolean, error?: string }> => {
  try {
    const deployment = await getDeploymentStatus(agentId, environment);
    if (!deployment) return { success: false, error: 'Deployment not found' };
    
    const response = await fetch(`${API_URL}/api/deployments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, environment, status: DeploymentStatus.Stopped, id: deployment.id })
    });

    if (!response.ok) throw new Error('Failed to stop deployment');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Failed to stop deployment: ${error.message}` };
  }
};

// Test an active deployment endpoint
export const testDeploymentEndpoint = async (
  agentId: string,
  payload: any,
  environment: string = 'production'
): Promise<{ success: boolean, response?: any, latencyMs?: number, error?: string }> => {
  const startTime = Date.now();

  try {
    // Check deployment status
    const deployment = await getDeploymentStatus(agentId, environment);
    
    if (!deployment) {
      return { success: false, error: `No active deployment found for agent ${agentId}` };
    }
    
    if (deployment.status !== DeploymentStatus.Active) {
      return { success: false, error: `Agent is not active (Status: ${deployment.status})` };
    }
    
    if (!deployment.endpointUrl) {
      return { success: false, error: 'Missing deployment endpoint URL' };
    }

    // Simulate calling the endpoint (in MVP, we'd actually call Bedrock directly or through our API Gateway)
    // Here we'll just simulate a successful response
    const latency = Math.floor(Math.random() * 500) + 200; // 200-700ms mock latency
    
    await new Promise(resolve => setTimeout(resolve, latency));
    
    const mockResponse = {
      result: `Mocked response from ${agentId} at version ${deployment.version}`,
      confidence: 0.95,
      processingTimeMs: latency
    };
    
    trackRequest(agentId, `test-${Date.now()}`, Date.now() - startTime, 0.95, payload.taskType, undefined, true);
    
    return {
      success: true,
      response: mockResponse,
      latencyMs: Date.now() - startTime
    };

  } catch (error: any) {
    trackRequest(agentId, `test-${Date.now()}`, Date.now() - startTime, 0, payload.taskType, error.message, false);
    return { success: false, error: `Endpoint test failed: ${error.message}` };
  }
};

// Validate if an agent can perform a specific task based on its type and training
export const validateTaskCompatibility = async (
  agentId: string,
  taskType: string
): Promise<{ compatible: boolean, reason?: string }> => {
  try {
    // In a real implementation, we would check the agent's profile and capabilities
    // For MVP, assume it's valid if we can't find specific reasons it isn't
    return { compatible: true };
  } catch (error) {
    console.error('Error validating task compatibility:', error);
    // Fail open for MVP
    return { compatible: true };
  }
};

// Perform inference with fallback to base model if agent fails or isn't ready
export const performInferenceWithFallback = async (
  payload: any
): Promise<{ success: boolean, output: string, modelId: string, fallback: boolean, error?: string }> => {
  try {
    const agentId = payload.agentId;
    const fallbackBaseModelId = 'bedrock-claude-sonnet';
    // Try to use the agent first
    const agentResponse = await testDeploymentEndpoint(agentId, payload);
    
    if (agentResponse.success) {
      return {
        success: true,
        output: JSON.stringify(agentResponse.response),
        modelId: agentId,
        fallback: false
      };
    }
    
    // If agent fails or isn't deployed, fallback to base model
    console.warn(`Agent ${agentId} failed or unavailable, falling back to ${fallbackBaseModelId}. Reason: ${agentResponse.error}`);
    
    // In a real app, call the Bedrock base model here using bedrockService
    // For MVP, return mock
    return {
      success: true,
      output: JSON.stringify({ fallbackResult: `Mocked response from base model ${fallbackBaseModelId}` }),
      modelId: fallbackBaseModelId,
      fallback: true
    };

  } catch (error: any) {
    return { success: false, output: '', modelId: 'unknown', fallback: true, error: `Inference completely failed: ${error.message}` };
  }
};
