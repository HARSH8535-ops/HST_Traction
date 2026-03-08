
import { PublishedContent, CreatorProfile, PerformanceMetrics } from '../types';
import { encryptData, decryptData, logAudit } from './securityService';

const HISTORY_KEY = 'tractionpal_history';
const PROFILE_KEY = 'tractionpal_profile';
const RETENTION_DAYS = 30;

const enforceRetention = (history: PublishedContent[]): PublishedContent[] => {
  const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const freshHistory = history.filter(h => h.timestamp > cutoff);
  
  if (freshHistory.length < history.length) {
    logAudit('RETENTION_CLEANUP', `Removed ${history.length - freshHistory.length} expired records`);
  }
  return freshHistory;
};

export const savePublishedContent = (content: Omit<PublishedContent, 'id' | 'timestamp'>): PublishedContent => {
  const history = getHistory();
  const newEntry: PublishedContent = {
    ...content,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  
  history.unshift(newEntry);
  
  // Enforce retention on save
  const cleanHistory = enforceRetention(history);
  
  localStorage.setItem(HISTORY_KEY, encryptData(cleanHistory));
  logAudit('CONTENT_PUBLISHED', `Published: ${content.title}`);
  return newEntry;
};

export const getHistory = (): PublishedContent[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const data = decryptData<PublishedContent[]>(raw) || [];
    
    // Check retention on read (lazy cleanup)
    const cleanData = enforceRetention(data);
    if (cleanData.length !== data.length) {
        localStorage.setItem(HISTORY_KEY, encryptData(cleanData));
    }
    
    return cleanData;
  } catch (e) {
    console.error("Failed to parse history", e);
    return [];
  }
};

export const updatePerformance = (id: string, metrics: PerformanceMetrics): PublishedContent | null => {
  const history = getHistory();
  const index = history.findIndex(h => h.id === id);
  
  if (index !== -1) {
    history[index].actualMetrics = metrics;
    localStorage.setItem(HISTORY_KEY, encryptData(history));
    logAudit('METRICS_UPDATED', `Updated metrics for ID: ${id}`);
    return history[index];
  }
  return null;
};

export const saveCreatorProfile = (profile: CreatorProfile) => {
  localStorage.setItem(PROFILE_KEY, encryptData(profile));
  logAudit('PROFILE_UPDATED', 'Creator strategy profile refreshed');
};

export const getCreatorProfile = (): CreatorProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return decryptData<CreatorProfile>(raw);
  } catch (e) {
    return null;
  }
};

export const saveRetrospective = (id: string, retrospective: string) => {
  const history = getHistory();
  const index = history.findIndex(h => h.id === id);
  if (index !== -1) {
    history[index].aiRetrospective = retrospective;
    localStorage.setItem(HISTORY_KEY, encryptData(history));
    logAudit('RETROSPECTIVE_SAVED', `AI Insight added for ID: ${id}`);
  }
};
