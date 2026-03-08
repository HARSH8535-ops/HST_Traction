
const CACHE_PREFIX = 'tp_cache_v1_';
const USAGE_KEY = 'tp_usage_stats';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface UsageStats {
  requests: number;
  inputTokens: number; // Estimated
  outputTokens: number; // Estimated
  cacheHits: number;
  savedTokens: number;
  costEstimate: number;
}

const getStoredUsage = (): UsageStats => {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : { requests: 0, inputTokens: 0, outputTokens: 0, cacheHits: 0, savedTokens: 0, costEstimate: 0 };
  } catch {
    return { requests: 0, inputTokens: 0, outputTokens: 0, cacheHits: 0, savedTokens: 0, costEstimate: 0 };
  }
};

export const getUsageStats = (): UsageStats => getStoredUsage();

const saveUsage = (stats: UsageStats) => {
  localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  // Dispatch event for UI updates
  window.dispatchEvent(new Event('usageUpdated'));
};

export const trackUsage = (model: string, inputChars: number, outputChars: number, isCacheHit: boolean) => {
  const stats = getStoredUsage();
  const inputTok = Math.ceil(inputChars / 4);
  const outputTok = Math.ceil(outputChars / 4);
  
  // Rough pricing estimation (per 1M tokens)
  // Flash: $0.075 in, $0.30 out
  // Pro: $3.50 in, $10.50 out
  const isPro = model.includes('pro');
  const priceIn = isPro ? 3.50 : 0.075;
  const priceOut = isPro ? 10.50 : 0.30;

  if (isCacheHit) {
    stats.cacheHits++;
    stats.savedTokens += (inputTok + outputTok);
    // We saved the cost of generating this
    // stats.costEstimate doesn't increase
  } else {
    stats.requests++;
    stats.inputTokens += inputTok;
    stats.outputTokens += outputTok;
    
    const cost = (inputTok / 1000000 * priceIn) + (outputTok / 1000000 * priceOut);
    stats.costEstimate += cost;
  }

  saveUsage(stats);
};

export const generateCacheKey = (functionName: string, params: any[]): string => {
  const str = JSON.stringify(params);
  // Simple hash for shorter keys
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${CACHE_PREFIX}${functionName}_${hash}`;
};

export const getCachedResult = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

export const setCachedResult = <T>(key: string, data: T) => {
  try {
    const entry = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Cache storage failed (quota exceeded?)', e);
  }
};

export const clearCache = () => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
};
