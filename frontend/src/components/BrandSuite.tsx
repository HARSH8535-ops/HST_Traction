
import React, { useState, useEffect } from 'react';
import { ProjectConfig, CreatorProfile } from '../types';
import { generateBrandAudit } from '../services/awsAIService';
import { getCreatorProfile } from '../services/storageService';
import { Button } from './Button';

interface BrandSuiteProps {
  config: ProjectConfig | null;
}

export const BrandSuite: React.FC<BrandSuiteProps> = ({ config }) => {
  const [audit, setAudit] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);

  useEffect(() => {
    setProfile(getCreatorProfile());
  }, []);

  const handleAudit = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const result = await generateBrandAudit(config, profile);
      setAudit(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="glass-panel p-8 rounded-3xl border-l-4 border-amber-500">
        <h2 className="text-2xl font-bold text-white mb-4">Brand & Business Suite</h2>
        <p className="text-slate-400 mb-6">Ensure every piece of content aligns with your core identity and business goals.</p>

        {config ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl">
               <div>
                 <p className="text-xs font-bold text-slate-500 uppercase">Current Context</p>
                 <p className="font-bold text-amber-400">{config.platform} • {config.purpose}</p>
               </div>
               <Button onClick={handleAudit} loading={loading}>Run Brand Alignment Check</Button>
            </div>

            {audit && (
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 prose prose-invert max-w-none">
                <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest mb-4">Audit Results</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{audit}</p>
              </div>
            )}
            
            {profile && (
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-800/30 rounded-xl">
                   <p className="text-xs text-slate-500 uppercase font-bold mb-2">Core Strengths</p>
                   <div className="flex flex-wrap gap-2">
                     {profile.topStrengths.map((s, i) => (
                       <span key={i} className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-1 rounded border border-amber-500/20">{s}</span>
                     ))}
                   </div>
                 </div>
                 <div className="p-4 bg-slate-800/30 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Strategic North Star</p>
                    <p className="text-xs text-slate-300 italic">"{profile.strategicAdvice}"</p>
                 </div>
               </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Initialize a project to perform a Brand Audit.
          </div>
        )}
      </div>
    </div>
  );
};
