import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ContentDirection, ProjectConfig, EmotionalAlignment } from '../types';
import { Button } from './Button';
import { developScript, evaluateEmotionalAlignment } from '../services/awsAIService';
import { useNotification } from './Notification';
import anime from 'animejs';

interface ScriptDeveloperProps {
  direction: ContentDirection;
  config: ProjectConfig;
  draft: string;
  script: string;
  onScriptChange: (script: string) => void;
  onFinalize: (finalScript: string) => void;
}

export const ScriptDeveloper: React.FC<ScriptDeveloperProps> = ({ direction, config, draft, script, onScriptChange, onFinalize }) => {
  const [loading, setLoading] = useState(false);
  const [alignment, setAlignment] = useState<EmotionalAlignment | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { showNotification } = useNotification();
  const [hasGenerated, setHasGenerated] = useState(false);
  
  const scoreRef = useRef<HTMLSpanElement>(null);
  const prevScoreRef = useRef<number>(0);

  const handleGenerateScript = async () => {
    setLoading(true);
    try {
      const generated = await developScript(direction, config, draft);
      onScriptChange(generated);
      setHasGenerated(true);
      showNotification('success', 'Neural Draft Complete.');
    } catch (error) {
      showNotification('error', "Synthesis failed.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAlignment = useCallback(async (currentScript: string) => {
    if (!currentScript.trim() || currentScript.length < 50) return;
    setIsAnalyzing(true);
    try {
      const result = await evaluateEmotionalAlignment(currentScript, config.intendedImpacts?.[0] || 'Curiosity', config);
      setAlignment(result);
      
      const scoreObj = { value: prevScoreRef.current };
      anime({
        targets: scoreObj,
        value: result.score,
        duration: 800,
        round: 1,
        easing: 'easeOutQuart',
        update: () => {
          if (scoreRef.current) scoreRef.current.innerText = scoreObj.value.toString();
        }
      });
      prevScoreRef.current = result.score;
    } catch (error) {
      console.warn("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [config]);

  useEffect(() => {
    if (!script && !hasGenerated && draft) {
        handleGenerateScript();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (script) analyzeAlignment(script);
    }, 1500);
    return () => clearTimeout(timer);
  }, [script, analyzeAlignment]);

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row gap-10 animate-in fade-in duration-500">
      {/* Editorial Logic Surface */}
      <div className="flex-1 linear-card flex flex-col overflow-hidden bg-white/[0.01]">
        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40"></div>
             <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Active Synthesis</span>
           </div>
           <Button variant="ghost" onClick={handleGenerateScript} loading={loading} className="text-[10px] py-1 h-auto hover:text-white">Regenerate</Button>
        </div>
        <textarea
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          className="flex-1 w-full p-10 text-white font-sans text-lg focus:outline-none resize-none leading-relaxed italic bg-transparent placeholder:text-white/10"
          placeholder="Synthesizing production draft..."
          spellCheck={false}
        />
        <div className="px-6 py-2 border-t border-white/5 bg-white/[0.02] flex justify-between items-center text-[10px] text-[#8A8A8E] font-bold uppercase tracking-widest">
           <span className="font-mono">{script.split(' ').filter(x => x).length} WORDS</span>
           <span>{isAnalyzing ? 'SYNCHRONIZING...' : 'READY'}</span>
        </div>
      </div>

      {/* Intelligence HUD */}
      <div className="w-full md:w-80 flex flex-col gap-6">
        <div className="p-8 linear-card bg-white/[0.02] space-y-6 border-l-2 border-white/20">
           <h3 className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Resonance Factor</h3>
           <div className="flex items-baseline gap-1">
             <span ref={scoreRef} className="text-5xl font-bold text-white tracking-tighter">--</span>
             <span className="text-sm font-bold text-[#8A8A8E] opacity-30">/ 100</span>
           </div>
           
           <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
             <div 
               className="h-full bg-white transition-all duration-1000" 
               style={{ width: `${alignment?.score || 0}%` }}
             />
           </div>

           <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Impact Target: <span className="text-white">{config.intendedImpacts?.[0] || '—'}</span></p>
        </div>

        <div className="flex-1 linear-card flex flex-col bg-white/[0.01] overflow-hidden">
           <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02]">
             <h3 className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Pattern Alignment</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
              {alignment?.misalignedSections.map((section, idx) => (
                <div key={idx} className="space-y-3 pb-6 border-b border-white/5 last:border-0">
                  <p className="text-[13px] text-[#8A8A8E] italic leading-relaxed">“{section.text.substring(0, 80)}...”</p>
                  <div className="p-4 bg-white/[0.03] border border-white/5 rounded-md space-y-2">
                    <span className="font-bold text-white uppercase text-[9px] tracking-widest block opacity-60">Adjustment</span>
                    <p className="text-[12px] font-medium text-[#8A8A8E] leading-relaxed">{section.suggestion}</p>
                  </div>
                </div>
              ))}
              
              {!alignment?.misalignedSections.length && alignment?.isAligned && (
                 <div className="text-center py-20 space-y-4 opacity-40">
                   <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">High Resonance Established</p>
                 </div>
              )}
           </div>
        </div>

        <Button 
          variant="primary"
          className="w-full py-3"
          onClick={() => onFinalize(script)}
          disabled={!alignment || alignment.score <= 75}
        >
          {alignment?.score && alignment.score > 75 ? 'Confirm Workspace' : `Locked: Min 75% Alignment`}
        </Button>
      </div>
    </div>
  );
};