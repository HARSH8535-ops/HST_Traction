import React, { useState } from 'react';
import { ProjectConfig } from '../types';
import { generateGrowthTactics } from '../services/awsAIService';
import { Button } from './Button';
import { useNotification } from './Notification';

interface GrowthSuiteProps {
  config: ProjectConfig | null;
}

const tacticIcons = [
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
];

const tacticLabels = ['Algorithmic Lever', 'Audience Expansion', 'Viral Multiplier'];

export const GrowthSuite: React.FC<GrowthSuiteProps> = ({ config }) => {
  const [tactics, setTactics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleGrowth = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const result = await generateGrowthTactics(config);
      setTactics(result);
      showNotification('success', 'Growth tactics synthesized.');
    } catch (e) {
      console.error(e);
      showNotification('error', 'Tactic synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-10">
        <header className="space-y-4">
          <h2 className="text-4xl font-bold text-white tracking-tight italic">Growth Flow</h2>
          <p className="text-[#8A8A8E] text-[15px] font-medium leading-relaxed max-w-xl tracking-tight-linear">
            Unlock viral potential and expand demographic reach using algorithmic growth intelligence.
          </p>
        </header>

        {config ? (
          <div className="space-y-12">
            <div className="flex items-center justify-between linear-card p-8 border-l-2 border-white/40 bg-white/[0.01]">
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Active Context</p>
                 <p className="text-xl font-bold text-white tracking-tight-linear">{config.platform} • <span className="text-[#8A8A8E]">{config.genre}</span></p>
               </div>
               <Button onClick={handleGrowth} loading={loading} className="px-10">Synthesize tactics</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tactics.length > 0 ? tactics.map((tactic, i) => (
                <div key={i} className="linear-card p-10 hover:bg-white/[0.03] transition-all duration-300 border-white/5 group relative overflow-hidden">
                  {/* Card number watermark */}
                  <div className="absolute top-4 right-6 text-7xl font-black text-white/[0.02] group-hover:text-white/[0.04] transition-all pointer-events-none">
                    0{i + 1}
                  </div>
                  
                  <div className="relative z-10 space-y-6">
                    {/* Icon + Label */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:bg-white/10 transition-all">
                        {tacticIcons[i % 3]}
                      </div>
                      <span className="text-[10px] font-black text-[#8A8A8E] uppercase tracking-[0.2em]">
                        {tacticLabels[i % 3]}
                      </span>
                    </div>

                    {/* Tactic content */}
                    <p className="text-[15px] text-white font-bold leading-relaxed tracking-tight-linear italic">
                      "{tactic}"
                    </p>

                    {/* Platform badge */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-black text-[#8A8A8E] uppercase tracking-widest">
                        {config.platform} Optimized
                      </span>
                      <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-emerald-400 transition-colors"></div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="md:col-span-3 py-20 text-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                   <p className="text-[#8A8A8E] font-medium italic">Execute synthesis to reveal growth trajectories.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-24 text-[#8A8A8E] italic font-medium">
            Project configuration required to initialize Growth Suite.
          </div>
        )}
      </div>
    </div>
  );
};