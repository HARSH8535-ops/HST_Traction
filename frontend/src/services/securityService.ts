import { AuditLogEntry } from '../types';

// Simple key for client-side obfuscation (Not military grade, but prevents casual local snooping)
// In a real app, this would be derived from a user password or key management system.
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY || 'tp_secure_x92_key';
  return key;
};

const ENCRYPTION_KEY = getEncryptionKey();

const AUDIT_KEY = process.env.AUDIT_KEY || 'development_audit_key';

// Synchronous encryption (XOR + Base64) to maintain app performance without full async refactor
export const encryptData = (data: any): string => {
  try {
    const json = JSON.stringify(data);
    const len = json.length;
    const keyLen = ENCRYPTION_KEY.length;
    let text = '';

    for (let i = 0; i < len; i++) {
      text += String.fromCharCode(
        json.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % keyLen)
      );
    }

    return btoa(text);
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

export const decryptData = <T>(ciphertext: string | null): T | null => {
  if (!ciphertext) return null;
  try {
    const text = atob(ciphertext);
    const len = text.length;
    const keyLen = ENCRYPTION_KEY.length;
    let json = '';

    for (let i = 0; i < len; i++) {
      json += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % keyLen)
      );
    }

    return JSON.parse(json);
  } catch (e) {
    // Fallback for unencrypted legacy data if any
    try {
      return JSON.parse(ciphertext);
    } catch (e2) {
      console.warn("Decryption failed", e);
      return null;
    }
  }
};

export const logAudit = (action: string, details: string) => {
  const currentLogs = getAuditLogs();
  const newEntry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    action,
    details
  };
  
  // Keep only last 100 logs
  const updatedLogs = [newEntry, ...currentLogs].slice(0, 100);
  localStorage.setItem(AUDIT_KEY, encryptData(updatedLogs));
};

export const getAuditLogs = (): AuditLogEntry[] => {
  const raw = localStorage.getItem(AUDIT_KEY);
  return decryptData<AuditLogEntry[]>(raw) || [];
};

export const purgeAllData = () => {
  // Clear all localStorage keys related to the app
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('tractionpal_') || key.startsWith('tp_')) {
      localStorage.removeItem(key);
    }
  });
  
  // Re-initialize audit with the purge event
  logAudit('DATA_PURGE', 'User requested full permanent data deletion');
};

export const exportData = (): string => {
  const dump: Record<string, any> = {};
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('tractionpal_') || key.startsWith('tp_')) {
      const val = localStorage.getItem(key);
      // Try to decrypt for export
      const decrypted = decryptData(val);
      dump[key] = decrypted || val;
    }
  });
  return JSON.stringify(dump, null, 2);
};
