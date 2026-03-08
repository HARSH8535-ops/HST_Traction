import React, { useState, useEffect, useRef } from 'react';
import { analyzeContent } from '../services/awsAIService';
import { getCreatorProfile } from '../services/storageService';
import { ContentAnalysis, ProjectConfig, ContentDirection } from '../types';
import { Button } from './Button';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarLine } from 'recharts';
import { useNotification } from './Notification';
import anime from 'animejs';

interface AnalyzerProps {
  projectConfig: ProjectConfig;
  content: string;
  onContentChange: (content: string) => void;
  onDirectionSelected: (direction: ContentDirection, draft: string) => void;
}

export const Analyzer: React.FC<AnalyzerProps> = ({ projectConfig, content, onContentChange, onDirectionSelected }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContentAnalysis | null>(null);
  const [selectedDirId, setSelectedDirId] = useState<string | null>(null);
  const [extraContext, setExtraContext] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const { showNotification } = useNotification();
  
  const patternsRef = useRef<HTMLDivElement>(null);
  const directionsRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (isRegenerate = false) => {
    if (!content.trim()) return;
    setLoading(true);
    setSelectedDirId(null);
    try {
      const profile = getCreatorProfile();
      const enhancedConfig = {
        ...projectConfig,
        purpose: projectConfig.purposes?.[0] || 'Educate',
        emotion: projectConfig.intendedImpacts?.[0] || 'Trust'
      };

      let finalSuggestion = isRegenerate ? suggestion : undefined;
      if (isRegenerate && !suggestion.trim()) {
         finalSuggestion = "Please provide 3 completely different strategy vectors this time. Random factor: " + Math.random();
      }

      const data = await analyzeContent(`${content}\n\nStrategic Context: ${extraContext}`, enhancedConfig, profile as any, finalSuggestion);
      setResult(data);
      showNotification('success', 'Intelligence Synthesis Complete.');
    } catch (error) {
      showNotification('error', 'Synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      anime({
        targets: patternsRef.current?.children,
        opacity: [0, 1],
        translateY: [8, 0],
        delay: anime.stagger(40),
        duration: 600,
        easing: 'easeOutQuart'
      });

      anime({
        targets: directionsRef.current?.children,
        opacity: [0, 1],
        translateX: [12, 0],
        delay: anime.stagger(80, { start: 300 }),
        duration: 800,
        easing: 'easeOutQuart'
      });
    }
  }, [result]);

  const chartData = result ? [
    { subject: 'Traction', A: result.tractionScore },
    { subject: 'Hook', A: (result.hookStrength || 0) * 10 },
    { subject: 'Retention', A: result.retentionEstimate },
    { subject: 'Relevance', A: 90 },
  ] : [];

  return (
    <div className="space-y-24 animate-in fade-in duration-700">
      <section className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h2 className="hero-heading text-4xl font-bold text-white tracking-tighter italic">Resonance Lab</h2>
            <p className="text-[#8A8A8E] text-[15px] font-medium tracking-tight-linear">Extract high-frequency resonance markers from your production draft.</p>
          </div>
          <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-md text-[10px] font-bold uppercase tracking-widest text-[#8A8A8E]">Neural Layer v1.0</div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
             <div className="space-y-3">
               <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest pl-1">Draft Synthesis</label>
               <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="Paste content for neural audit..."
                className="w-full h-80 linear-input focus:outline-none resize-none leading-relaxed italic text-[18px]"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleAnalyze(false)} loading={loading} variant="primary" className="px-12 h-12 rounded-full font-bold">
                Execute Synthesis
              </Button>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <div className="space-y-3">
               <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest pl-1">Strategic Context</label>
               <div className="linear-card p-8 space-y-6">
                 <p className="text-[13px] text-[#8A8A8E] font-medium leading-relaxed tracking-tight-linear italic">Refine extraction with demographic targets or platform-specific goals.</p>
                 <input
                  type="text"
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder="e.g. Technical founders..."
                  className="w-full linear-input h-10 px-4"
                />
               </div>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <div className="space-y-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="linear-card p-10 min-h-[400px] flex items-center justify-center overflow-hidden border-white/5">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.03)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8A8A8E', fontSize: 11, fontWeight: 700 }} />
                    <RadarLine name="Logic" dataKey="A" stroke="#FFFFFF" fill="#FFFFFF" fillOpacity={0.03} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="linear-card p-10 flex flex-col justify-center gap-12 relative border-l-2 border-white/40">
               <div className="space-y-4">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8A8A8E]">Synthetic Viewer Intent</h3>
                 <p className="text-4xl font-bold text-white leading-tight tracking-tighter italic">“{result.viewerIntent}”</p>
               </div>
               <div className="space-y-6">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#8A8A8E]">Detected Patterns</h3>
                 <div ref={patternsRef} className="flex flex-wrap gap-2">
                   {(result.patternsDetected || []).map((p, i) => (
                     <span key={i} className="px-4 py-2 bg-white/5 border border-white/5 rounded-md text-[11px] text-white font-medium opacity-0 tracking-tight-linear">{p}</span>
                   ))}
                 </div>
               </div>
            </div>
          </div>

          <div className="space-y-12">
             <div className="space-y-2">
                <h3 className="hero-heading text-2xl font-bold text-white tracking-tight italic">Refined Strategy Vectors</h3>
                <p className="text-[#8A8A8E] text-[13px] font-medium tracking-tight-linear">Adopt a vector to proceed to production architecture.</p>
             </div>
             
             <div className="space-y-6">
               <div className="flex items-center gap-3 p-1 linear-card rounded-xl border border-white/10 bg-white/[0.02]">
                 <input
                   type="text"
                   value={suggestion}
                   onChange={(e) => setSuggestion(e.target.value)}
                   placeholder="Prefer something else? Enter a suggestion (or leave blank for random alternatives)..."
                   className="flex-1 bg-transparent border-none focus:ring-0 px-6 py-3 text-white font-medium italic text-sm"
                 />
                 <Button onClick={() => handleAnalyze(true)} loading={loading} className="px-6 h-10 bg-white/10 hover:bg-white/20">
                   Regenerate Vectors
                 </Button>
               </div>
             </div>

             <div ref={directionsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(result.directions || []).map((dir, idx) => (
                  <div 
                    key={dir.id}
                    onClick={() => setSelectedDirId(dir.id)}
                    className={`group relative p-10 linear-card transition-all duration-300 cursor-pointer opacity-0 border-white/5 ${
                      selectedDirId === dir.id 
                        ? 'bg-white/10 border-white/30 -translate-y-2' 
                        : 'hover:bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                     <div className="absolute top-6 right-8 text-7xl font-bold text-white/[0.02] pointer-events-none group-hover:text-white/[0.04] transition-all">
                       0{idx + 1}
                     </div>

                     <div className="relative z-10 space-y-6">
                        <div className={`w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center transition-all ${selectedDirId === dir.id ? 'bg-white' : ''}`}>
                           <span className={`text-sm transition-colors ${selectedDirId === dir.id ? 'text-black' : 'text-white'}`}>●</span>
                        </div>
                        <h4 className="text-2xl font-bold text-white leading-tight tracking-tight italic">{dir.coreIdea}</h4>
                        
                        <div className="py-8 border-y border-white/5 space-y-6">
                           <div className="space-y-1">
                             <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Angle</p>
                             <p className="text-[14px] text-[#8A8A8E] font-medium leading-relaxed italic tracking-tight-linear">{dir.emotionalAngle}</p>
                           </div>
                           <div className="space-y-1">
                             <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Upside</p>
                             <p className="text-[13px] text-white font-bold tracking-widest uppercase">{dir.potentialUpside}</p>
                           </div>
                        </div>

                        <p className="text-[13px] text-[#8A8A8E] italic leading-relaxed font-medium tracking-tight-linear">
                          “{dir.creatorAdvice}”
                        </p>
                     </div>
                  </div>
                ))}
             </div>
             
             {selectedDirId && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 fade-in duration-300">
                  <Button 
                    onClick={() => onDirectionSelected(result.directions.find(d => d.id === selectedDirId)!, content)}
                    className="px-24 py-4 rounded-full text-sm font-bold shadow-[0_40px_80px_rgba(0,0,0,0.8)] border-none"
                  >
                    Adopt Intelligence
                  </Button>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};