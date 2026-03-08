// Usage Metrics Service
// Tracks usage statistics and performance metrics for fine-tuned AI agents
// Stores metrics in Redis cache and PostgreSQL performance_metrics table


// Redis-like storage using localStorage for browser environment
const METRICS_PREFIX = 'tp_metrics_';
const USAGE_KEY = 'tp_usage_stats_v2';
const RESPONSE_TIMES_KEY = 'tp_response_times';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Usage metrics interface matching design requirements
export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
}

// Individual request metrics for storage
export interface RequestMetric {
  id: string;
  agentId: string;
  requestId: string;
  timestamp: number;
  responseTimeMs: number;
  accuracyScore?: number;
  taskType: string;
  userFeedback?: any;
  isSuccess: boolean;
}

import { API_URL } from './config';

// Get stored usage metrics
const getStoredUsage = (): UsageMetrics => {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTimeMs: 0,
      p95ResponseTimeMs: 0,
      p99ResponseTimeMs: 0
    };
  } catch {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTimeMs: 0,
      p95ResponseTimeMs: 0,
      p99ResponseTimeMs: 0
    };
  }
};

// Get stored response times array
const getResponseTimes = (): number[] => {
  try {
    const raw = localStorage.getItem(RESPONSE_TIMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Save usage metrics to localStorage
const saveUsage = (stats: UsageMetrics) => {
  localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  window.dispatchEvent(new Event('usageUpdated'));
};

// Save response times to localStorage
const saveResponseTimes = (times: number[]) => {
  localStorage.setItem(RESPONSE_TIMES_KEY, JSON.stringify(times));
};

// Calculate percentiles
const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

// Calculate average
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

// Track a request and update metrics
export const trackRequest = (
  agentId: string,
  requestId: string,
  responseTimeMs: number,
  accuracyScore?: number,
  taskType?: string,
  userFeedback?: any,
  isSuccess: boolean = true
): void => {
  const stats = getStoredUsage();
  const responseTimes = getResponseTimes();
  
  // Update basic counts
  stats.totalRequests++;
  if (isSuccess) {
    stats.successfulRequests++;
  } else {
    stats.failedRequests++;
  }
  
  // Add response time to array
  responseTimes.push(responseTimeMs);
  
  // Keep only last 1000 response times for percentile calculations
  if (responseTimes.length > 1000) {
    responseTimes.shift();
  }
  
  // Calculate metrics
  stats.avgResponseTimeMs = calculateAverage(responseTimes);
  stats.p95ResponseTimeMs = calculatePercentile(responseTimes, 95);
  stats.p99ResponseTimeMs = calculatePercentile(responseTimes, 99);
  
  // Save to localStorage
  saveUsage(stats);
  saveResponseTimes(responseTimes);
  
  // Store in Redis-like cache
  storeInRedis(agentId, {
    id: crypto.randomUUID(),
    agentId,
    requestId,
    timestamp: Date.now(),
    responseTimeMs,
    accuracyScore,
    taskType: taskType || 'unknown',
    userFeedback,
    isSuccess
  });
  
  // Store in backend API
  storeInBackend({
    agentId,
    requestId,
    responseTimeMs,
    accuracyScore,
    taskType: taskType || 'unknown',
    userFeedback,
    isSuccess
  });
};

// Store metric in Redis cache (using localStorage as Redis equivalent)
const storeInRedis = (agentId: string, metric: RequestMetric): void => {
  try {
    const key = `${METRICS_PREFIX}${agentId}_${metric.id}`;
    const entry = {
      timestamp: Date.now(),
      data: metric
    };
    localStorage.setItem(key, JSON.stringify(entry));
    
    // Set expiration (24 hours)
    const expirationKey = `${key}_expires`;
    localStorage.setItem(expirationKey, (Date.now() + CACHE_TTL).toString());
  } catch (e) {
    console.warn('Redis cache storage failed (quota exceeded?)', e);
  }
};

// Store metric in backend API
const storeInBackend = async (metric: any): Promise<void> => {
  try {
    await fetch(`${API_URL}/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metric)
    });
  } catch (error) {
    console.error('Error storing performance metric in backend:', error);
  }
};

// Get usage metrics for an agent
export const getUsageMetrics = (agentId?: string): UsageMetrics => {
  if (agentId) {
    // For specific agent, aggregate from Redis
    const metrics = getAgentMetricsFromRedis(agentId);
    if (metrics) {
      return metrics;
    }
  }
  
  // Return global metrics
  return getStoredUsage();
};

// Get agent-specific metrics from Redis
const getAgentMetricsFromRedis = (agentId: string): UsageMetrics | null => {
  try {
    const responseTimes: number[] = [];
    let successful = 0;
    let failed = 0;
    
    // Scan localStorage for agent metrics
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`${METRICS_PREFIX}${agentId}_`) && !key.endsWith('_expires')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            const metric = parsed.data as RequestMetric;
            responseTimes.push(metric.responseTimeMs);
            if (metric.isSuccess) {
              successful++;
            } else {
              failed++;
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    });
    
    if (responseTimes.length === 0) return null;
    
    return {
      totalRequests: responseTimes.length,
      successfulRequests: successful,
      failedRequests: failed,
      avgResponseTimeMs: calculateAverage(responseTimes),
      p95ResponseTimeMs: calculatePercentile(responseTimes, 95),
      p99ResponseTimeMs: calculatePercentile(responseTimes, 99)
    };
  } catch {
    return null;
  }
};

// Get recent request metrics
export const getRecentMetrics = (agentId: string, limit: number = 100): RequestMetric[] => {
  try {
    const metrics: RequestMetric[] = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`${METRICS_PREFIX}${agentId}_`) && !key.endsWith('_expires')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            metrics.push(parsed.data as RequestMetric);
          }
        } catch {
          // Skip invalid entries
        }
      }
    });
    
    // Sort by timestamp descending and limit
    return metrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch {
    return [];
  }
};

// Get performance metrics from Backend
export const getBackendMetrics = async (
  agentId: string
): Promise<any[]> => {
  try {
    const response = await fetch(`${API_URL}/api/metrics?agentId=${agentId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching performance metrics from Backend:', error);
    return [];
  }
};

// Aggregate statistics (computed locally since backend API only returns raw items currently)
export const getAggregatedStats = async (
  agentId: string,
  period: 'hourly' | 'daily' | 'weekly' = 'daily'
): Promise<any[]> => {
  const items = await getBackendMetrics(agentId);
  // Basic mock aggregation for now
  if (!items.length) return [];

  return [{
    period: new Date().toISOString(),
    total_requests: items.length,
    successful_requests: items.filter((i: any) => i.isSuccess).length,
    failed_requests: items.filter((i: any) => !i.isSuccess).length,
    avg_response_time_ms: items.reduce((acc: number, item: any) => acc + (item.responseTimeMs || 0), 0) / items.length,
    p95_response_time_ms: 0,
    p99_response_time_ms: 0,
    avg_accuracy_score: 0
  }];
};

// Clear metrics (for testing or reset)
export const clearMetrics = (): void => {
  localStorage.removeItem(USAGE_KEY);
  localStorage.removeItem(RESPONSE_TIMES_KEY);
  
  // Clear Redis-like entries
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(METRICS_PREFIX)) {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_expires`);
    }
  });
};
