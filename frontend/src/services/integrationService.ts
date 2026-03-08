// Integration Service
// Handles cross-service communication and orchestration

import {
  AgentStatus,
  TaskType,
  getAgentProfile
} from './agentProfileService';

import { getCachedResult, setCachedResult, generateCacheKey, trackUsage } from './cacheService';
import { trackRequest, getUsageMetrics } from './usageMetricsService';
import { performInferenceWithFallback, validateTaskCompatibility, DeploymentStatus } from './deploymentService';
import { InferenceRequest, InferenceResponse, FallbackEvent } from './bedrockService';

// In-memory task queue (would use Redis/SQS in production)
const taskQueue: Array<{
  id: string;
  agentId: string;
  payload: any;
  timestamp: number;
}> = [];

// Start integration service loop
const startIntegrationServiceLoop = () => {
  setInterval(async () => {
    if (taskQueue.length > 0) {
      const task = taskQueue.shift();
      if (task) {
        try {
          // Process task asynchronously
          console.log(`Processing background task ${task.id} for agent ${task.agentId}`);

          // Implementation would depend on task type
          // For now, just log it

        } catch (error) {
          console.error(`Error processing background task ${task.id}:`, error);
          // Could implement retry logic here
        }
      }
    }
  }, 1000); // Check every second
};

// Start the loop in background (if in browser environment)
if (typeof window !== 'undefined') {
  startIntegrationServiceLoop();
}

/**
 * Route an inference request to the most appropriate agent or fallback model
 */
export const routeInferenceRequest = async (
  request: any,
  userId: string,
  forceAgentId?: string
): Promise<any> => {
  const startTime = Date.now();

  try {
    // Determine the target agent based on request or routing logic
    let targetAgentId = forceAgentId;
    
    // In MVP, we just use the forced agent or fail
    if (!targetAgentId) {
        throw new Error("No agent specified for routing");
    }
    
    // 1. Check if agent is available and compatible
    const compatibilityCheck = await validateTaskCompatibility(targetAgentId, request.taskType);
    
    if (!compatibilityCheck.compatible) {
      console.warn(`Agent ${targetAgentId} is not compatible with task ${request.taskType}. Reason: ${compatibilityCheck.reason}`);
      // In a real system, we'd find another compatible agent or fallback
      throw new Error(`Task type mismatch: ${compatibilityCheck.reason}`);
    }

    // 2. Perform inference with automatic fallback
    const result = await performInferenceWithFallback(
      { agentId: targetAgentId, prompt: request.payload?.prompt, taskType: request.taskType }
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Inference completely failed');
    }

    // 3. Track metrics
    const latency = Date.now() - startTime;
    // Estimate tokens (rough approximation)
    const promptTokens = Math.ceil(JSON.stringify(request.payload || {}).length / 4);
    const completionTokens = Math.ceil(JSON.stringify(result.output).length / 4);
    
    trackRequest(
        targetAgentId,
        request.id,
        latency,
        0.95, // Mock confidence
        request.taskType,
        undefined,
        true
    );
    
    return {
      id: `resp-${Date.now()}`,
      requestId: request.id,
      agentId: targetAgentId,
      modelId: result.modelId,
      output: result.output,
      latencyMs: latency,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens
      },
      fallback: result.fallback,
      timestamp: Date.now()
    };
    
  } catch (error: any) {
    // Failed request tracking
    const targetId = forceAgentId || 'unknown';
    trackRequest(targetId, request.id, Date.now() - startTime, 0, request.taskType, error.message, false);
    
    return {
      id: `err-${Date.now()}`,
      requestId: request.id,
      error: error.message || 'Unknown error during inference',
      latencyMs: Date.now() - startTime,
      fallback: true,
      timestamp: Date.now()
    };
  }
};

/**
 * Handle user feedback on agent performance
 */
export const handleAgentFeedback = async (
  agentId: string,
  requestId: string,
  score: number, // 0.0 to 1.0
  comments?: string
): Promise<void> => {
  try {
    // 1. Add feedback to metrics database
    trackRequest(agentId, requestId, 0, score, 'feedback', { score, comments }, true);
    
    // 2. Potentially trigger retraining if average score drops too low
    // In a full implementation, we'd check average scores over time here
    
  } catch (error) {
    console.error(`Error handling feedback for agent ${agentId}:`, error);
  }
};

/**
 * Sync metrics to usage limits and billing
 */
export const syncUsageMetrics = async (
  userId: string,
  agentId: string
): Promise<{ usage: any, limitsExceeded: boolean }> => {
  try {
    const metrics = getUsageMetrics(agentId);
    
    // In MVP, just return the metrics and say limits aren't exceeded
    return {
      usage: metrics,
      limitsExceeded: false
    };
    
  } catch (error) {
    console.error(`Error syncing usage metrics for user ${userId}:`, error);
    return { usage: {}, limitsExceeded: false };
  }
};

/**
 * Trigger an asynchronous background task
 */
export const triggerBackgroundTask = (
  agentId: string,
  taskType: TaskType,
  payload: any
): string => {
  const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  taskQueue.push({
    id: taskId,
    agentId,
    payload: { taskType, ...payload },
    timestamp: Date.now()
  });

  return taskId;
};

export const getIntegrationStatus = () => {
  return {
    queueLength: taskQueue.length,
    serviceActive: true
  };
};
