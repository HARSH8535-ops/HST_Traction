// Agent Integration Service
// Handles integration between fine-tuned agents and existing AI services
// Implements caching, usage tracking, and graceful fallback logic

import { getCachedResult, setCachedResult, generateCacheKey, trackUsage } from './cacheService';
import { trackRequest, getUsageMetrics } from './usageMetricsService';
import { performInferenceWithFallback, validateTaskCompatibility, DeploymentStatus } from './deploymentService';
import { getAgentProfile, AgentStatus, TaskType } from './agentProfileService';
import { InferenceRequest, InferenceResponse, FallbackEvent } from './bedrockService';

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Fallback event logging
const logFallbackEvent = (event: FallbackEvent): void => {
  console.log('Fallback event:', JSON.stringify(event));
  // In production, this would send to a logging service
};

// Generate cache key for agent inference request
export const generateAgentCacheKey = (agentId: string, prompt: string, config: any): string => {
  const params = [agentId, prompt, config];
  return generateCacheKey('agentInference', params);
};

// Check if agent is available for inference
export const checkAgentAvailability = async (agentId: string): Promise<{
  available: boolean;
  status?: AgentStatus;
  version?: number;
}> => {
  try {
    const agent = await getAgentProfile('mock-user-id', agentId);
    
    if (!agent) {
      return { available: false };
    }
    const isReady = agent.status === AgentStatus.Ready;
    
    return {
      available: isReady,
      status: agent.status,
      version: agent.version
    };
  } catch (error) {
    console.error('Error checking agent availability:', error);
    return { available: false };
  }
};

// Get previous version of agent
export const getPreviousAgentVersion = async (agentId: string): Promise<string | null> => {
  try {
    const agent = await getAgentProfile('mock-user-id', agentId);
    
    if (!agent) {
      return null;
    }
    if (agent.version && agent.version > 1) {
      // In production, this would query the database for the previous version
      // For now, return the agent ID with version suffix
      return `${agentId}-v${agent.version - 1}`;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting previous agent version:', error);
    return null;
  }
};

// Perform inference with caching
export const performInferenceWithCache = async (
  agentId: string,
  prompt: string,
  config: any = {}
): Promise<InferenceResponse> => {
  const cacheKey = generateAgentCacheKey(agentId, prompt, config);
  
  // Try to get cached result
  const cachedResult = getCachedResult<InferenceResponse>(cacheKey);
  if (cachedResult) {
    // Track usage for cache hit
    trackUsage('bedrock-claude-sonnet', prompt.length, cachedResult.output.length, true);
    return cachedResult;
  }
  
  // Perform inference with fallback
  const request: InferenceRequest = {
    prompt,
    agentId,
    maxTokens: config.maxTokens || 2048,
    temperature: config.temperature || 0.7,
    topP: config.topP || 0.9
  };
  
  const result = await performInferenceWithFallback(request);
  
  // Cache the result
  setCachedResult(cacheKey, result);
  
  // Track usage for cache miss
  trackUsage('bedrock-claude-sonnet', prompt.length, result.output.length, false);
  
  return result as unknown as InferenceResponse;
};

// Perform inference with full integration (caching + tracking + fallback)
export const performAgentInference = async (
  agentId: string,
  prompt: string,
  config: any = {}
): Promise<InferenceResponse> => {
  // Check agent availability
  const availability = await checkAgentAvailability(agentId);
  
  if (!availability.available) {
    // Log fallback event
    logFallbackEvent({
      agentId,
      timestamp: new Date().toISOString(),
      reason: 'Agent not available',
      fallbackToModel: 'bedrock-claude-sonnet'
    });
    
    // Fallback to Bedrock Claude
    return performInferenceWithFallback({
      prompt,
      agentId,
      maxTokens: config.maxTokens || 2048,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9
    });
  }
  
  // Check task compatibility
  const taskType = config.taskType as TaskType;
  if (taskType) {
    const compatibility = await validateTaskCompatibility(agentId, taskType);
    if (!compatibility.compatible) {
      console.warn(`Task type ${taskType} incompatible with agent ${agentId}: ${compatibility.reason}`);
    }
  }
  
  // Try to get cached result first
  const cacheKey = generateAgentCacheKey(agentId, prompt, config);
  const cachedResult = getCachedResult<InferenceResponse>(cacheKey);
  if (cachedResult) {
    // Track usage for cache hit
    trackUsage('bedrock-claude-sonnet', prompt.length, cachedResult.output.length, true);
    
    // Track request metrics
    trackRequest(
      agentId,
      crypto.randomUUID(),
      0, // Cache hit - no response time
      undefined,
      config.taskType,
      undefined,
      true
    );
    
    return cachedResult;
  }
  
  // Perform inference with fallback
  const request: InferenceRequest = {
    prompt,
    agentId,
    maxTokens: config.maxTokens || 2048,
    temperature: config.temperature || 0.7,
    topP: config.topP || 0.9
  };
  
  const startTime = Date.now();
  const result = await performInferenceWithFallback(request);
  const responseTime = Date.now() - startTime;
  
  // Cache the result
  setCachedResult(cacheKey, result);
  
  // Track usage for cache miss
  trackUsage('bedrock-claude-sonnet', prompt.length, result.output.length, false);
  
  // Track request metrics
  trackRequest(
    agentId,
    crypto.randomUUID(),
    responseTime,
    undefined,
    config.taskType,
    undefined,
    !result.fallback
  );
  
  return result;
};

// Invalidate cache for agent
export const invalidateAgentCache = async (agentId: string): Promise<void> => {
  // In production, this would invalidate all cache entries for this agent
  // For now, we'll just log the invalidation
  console.log(`Cache invalidated for agent: ${agentId}`);
  
  // In a real implementation, you would:
  // 1. Query all cache keys matching the agent pattern
  // 2. Delete them from localStorage/Redis
  // 3. Update cache version to invalidate all previous entries
};

// Invalidate cache for agent version
export const invalidateAgentVersionCache = async (agentId: string, version: number): Promise<void> => {
  console.log(`Cache invalidated for agent ${agentId} version ${version}`);
  
  // In a real implementation, you would:
  // 1. Query cache keys matching agentId and version pattern
  // 2. Delete them from localStorage/Redis
};

// Get usage metrics for agent
export const getAgentUsageMetrics = async (agentId: string) => {
  return getUsageMetrics(agentId);
};

// Fallback strategy enum
export enum FallbackStrategy {
  None = 'None',
  PreviousVersion = 'PreviousVersion',
  DefaultBedrock = 'DefaultBedrock'
}

// Perform inference with configurable fallback strategy
export const performInferenceWithStrategy = async (
  agentId: string,
  prompt: string,
  config: any = {},
  fallbackStrategy: FallbackStrategy = FallbackStrategy.DefaultBedrock
): Promise<InferenceResponse> => {
  // Check agent availability
  const availability = await checkAgentAvailability(agentId);
  
  if (!availability.available) {
    // Log fallback event
    logFallbackEvent({
      agentId,
      timestamp: new Date().toISOString(),
      reason: 'Agent not available',
      fallbackToModel: fallbackStrategy === FallbackStrategy.DefaultBedrock 
        ? 'bedrock-claude-sonnet' 
        : 'previous-version'
    });
    
    if (fallbackStrategy === FallbackStrategy.PreviousVersion) {
      // Try previous version
      const previousVersionId = await getPreviousAgentVersion(agentId);
      if (previousVersionId) {
        return performInferenceWithFallback({
          prompt,
          agentId: previousVersionId,
          maxTokens: config.maxTokens || 2048,
          temperature: config.temperature || 0.7,
          topP: config.topP || 0.9
        }) as unknown as InferenceResponse;
      }
    }
    
    // Fallback to Bedrock Claude
    return performInferenceWithFallback({
      prompt,
      agentId,
      maxTokens: config.maxTokens || 2048,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9
    }) as unknown as InferenceResponse;
  }
  
  // Try to get cached result first
  const cacheKey = generateAgentCacheKey(agentId, prompt, config);
  const cachedResult = getCachedResult<InferenceResponse>(cacheKey);
  if (cachedResult) {
    // Track usage for cache hit
    trackUsage('bedrock-claude-sonnet', prompt.length, cachedResult.output.length, true);
    
    // Track request metrics
    trackRequest(
      agentId,
      crypto.randomUUID(),
      0,
      undefined,
      config.taskType,
      undefined,
      true
    );
    
    return cachedResult;
  }
  
  // Perform inference with fallback
  const request: InferenceRequest = {
    prompt,
    agentId,
    maxTokens: config.maxTokens || 2048,
    temperature: config.temperature || 0.7,
    topP: config.topP || 0.9
  };
  
  const startTime = Date.now();
  const result = await performInferenceWithFallback(request);
  const responseTime = Date.now() - startTime;
  
  // Cache the result
  setCachedResult(cacheKey, result);
  
  // Track usage for cache miss
  trackUsage('bedrock-claude-sonnet', prompt.length, result.output.length, false);
  
  // Track request metrics
  trackRequest(
    agentId,
    crypto.randomUUID(),
    responseTime,
    undefined,
    config.taskType,
    undefined,
    !result.fallback
  );
  
  return result as unknown as InferenceResponse;
};
