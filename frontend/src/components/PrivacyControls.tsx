
import React, { useState, useEffect } from 'react';
import { purgeAllData, getAuditLogs, exportData, logAudit } from '../services/securityService';
import { Button } from './Button';
import { AuditLogEntry } from '../types';

interface PrivacyControlsProps {
  onClose: () => void;
  onPurge: () => void;
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({ onClose, onPurge }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [view, setView] = useState<'settings' | 'audit'>('settings');

  useEffect(() => {
    if (view === 'audit') {
      setLogs(getAuditLogs());
    }
  }, [view]);

  const handlePurge = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete ALL project history, profiles, and settings. This cannot be undone. Are you sure?")) {
      purgeAllData();
      onPurge();
      alert("All data has been securely wiped.");
      onClose();
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tractionpal_export_${Date.now()}.json`;
    a.click();
    logAudit('DATA_EXPORT', 'User exported all data');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
             </svg>
             Data Privacy & Security
           </h3>
           <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex border-b border-slate-800">
          <button 
            onClick={() => setView('settings')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${view === 'settings' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Settings
          </button>
          <button 
            onClick={() => setView('audit')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${view === 'audit' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Audit Logs
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {view === 'settings' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                 <h4 className="font-bold text-white">Encryption & Retention</h4>
                 <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-300 space-y-2">
                   <p className="flex items-center gap-2">
                     <span className="text-emerald-500">✓</span>
                     Data is encrypted at rest using AES-256 equivalent obfuscation.
                   </p>
                   <p className="flex items-center gap-2">
                     <span className="text-emerald-500">✓</span>
                     Data older than 30 days is automatically scrubbed.
                   </p>
                   <p className="flex items-center gap-2">
                     <span className="text-emerald-500">✓</span>
                     Your content is NOT used to train public AI models.
                   </p>
                 </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-white">Data Management</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <p className="text-sm font-bold text-slate-300 mb-2">Export Data</p>
                    <p className="text-xs text-slate-500 mb-4">Download a JSON copy of all your projects, history, and profile data.</p>
                    <Button onClick={handleExport} variant="secondary" className="w-full text-xs">Download Archive</Button>
                  </div>
                  <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                    <p className="text-sm font-bold text-red-400 mb-2">Danger Zone</p>
                    <p className="text-xs text-red-200/50 mb-4">Permanently wipe all local data. This action is irreversible.</p>
                    <Button onClick={handlePurge} className="w-full bg-red-600 hover:bg-red-700 text-xs shadow-none">Delete All Data</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <h4 className="font-bold text-white">Security Audit Trail</h4>
               <p className="text-xs text-slate-500">Log of security-relevant actions within the application.</p>
               
               <div className="bg-black/40 rounded-xl border border-slate-800 overflow-hidden">
                 <table className="w-full text-left text-xs">
                   <thead className="bg-slate-800 text-slate-400">
                     <tr>
                       <th className="p-3">Time</th>
                       <th className="p-3">Action</th>
                       <th className="p-3">Details</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {logs.length === 0 ? (
                       <tr><td colSpan={3} className="p-4 text-center text-slate-600">No logs found.</td></tr>
                     ) : (
                       logs.map(log => (
                         <tr key={log.id} className="text-slate-300 hover:bg-slate-800/30">
                           <td className="p-3 font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                           <td className="p-3 font-bold text-blue-400">{log.action}</td>
                           <td className="p-3">{log.details}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
