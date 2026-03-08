import React, { useState } from 'react';
import { ProjectConfig } from '../types';
import { VeoStudio } from './VeoStudio';
import { generateThumbnailIdeas, generateImageWithLambda } from '../services/awsAIService';
import { Button } from './Button';
import { useNotification } from './Notification';

interface VisualsSuiteProps {
  config: ProjectConfig | null;
  script?: string;
}

export const VisualsSuite: React.FC<VisualsSuiteProps> = ({ config, script }) => {
  const [view, setView] = useState<'thumbnail' | 'veo'>('veo');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleIdeas = async () => {
    if (!config || !script) return;
    setLoading(true);
    try {
      const result = await generateThumbnailIdeas(config, script);
      setIdeas(result);
      showNotification('success', 'Visual concepts synthesized.');
    } catch (e) {
      showNotification('error', 'Concept synthesis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (idea: string) => {
    setGenLoading(true);
    try {
      const url = await generateImageWithLambda(idea);
      if (url) {
        setGeneratedImages(prev => [url, ...prev]);
        showNotification('success', 'Neural asset rendered.');
      }
    } catch (e) {
      showNotification('error', 'Render operation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-white tracking-tight italic">Visual Logic</h2>
          <p className="text-[15px] font-medium text-[#8A8A8E] tracking-tight-linear uppercase">Synthesize Assets & CTR Vectors</p>
        </div>
        <div className="flex p-1 bg-white/5 rounded-md border border-white/5">
          <button 
            onClick={() => setView('veo')}
            className={`px-5 py-1.5 rounded-sm text-[12px] font-bold tracking-tight-linear transition-all ${view === 'veo' ? 'bg-white text-black' : 'text-[#8A8A8E] hover:text-white'}`}
          >
            Video Engine
          </button>
          <button 
            onClick={() => setView('thumbnail')}
            className={`px-5 py-1.5 rounded-sm text-[12px] font-bold tracking-tight-linear transition-all ${view === 'thumbnail' ? 'bg-white text-black' : 'text-[#8A8A8E] hover:text-white'}`}
          >
            CTR Lab
          </button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {view === 'veo' ? (
          <VeoStudio />
        ) : (
          <div className="space-y-16 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-10">
               <div className="max-w-xl space-y-4">
                 <h3 className="text-2xl font-bold text-white tracking-tight-linear italic">Neural Hook Synthesis</h3>
                 <p className="text-[#8A8A8E] text-[15px] leading-relaxed font-medium tracking-tight-linear">
                   Architect high-resonance visual anchors and thumbnail vectors based on production logic.
                 </p>
               </div>
               
               {config && script ? (
                 <div className="space-y-16">
                    <Button onClick={handleIdeas} loading={loading} className="px-12 py-3 rounded-full text-sm font-bold shadow-2xl">
                      Generate Concepts
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {ideas.map((idea, i) => (
                        <div key={i} className="linear-card p-10 flex flex-col justify-between hover:bg-white/[0.02] transition-colors border-l-2 border-white/20">
                          <div>
                            <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-6 opacity-30">Concept {i+1}</p>
                            <p className="text-[15px] text-white italic leading-relaxed font-bold mb-10 tracking-tight-linear">“{idea}”</p>
                          </div>
                          <Button 
                            onClick={() => handleGenerateImage(idea)} 
                            loading={genLoading}
                            variant="secondary" 
                            className="w-full text-[11px] h-10 border-white/5 hover:border-white/20"
                          >
                            Render Asset
                          </Button>
                        </div>
                      ))}
                    </div>

                    {generatedImages.length > 0 && (
                      <div className="space-y-10 pt-16 border-t border-white/5">
                        <h3 className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Neural Assets</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {generatedImages.map((img, i) => (
                            <div key={i} className="linear-card rounded-lg overflow-hidden border-white/10 group">
                              <img src={img} alt="Neural Asset" className="w-full aspect-video object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">SYNTHETIC_ASSET_{generatedImages.length - i}</span>
                                 <a href={img} download={`asset_${i}.png`} className="text-[10px] font-bold text-white uppercase underline underline-offset-4 tracking-tight-linear">Save</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
               ) : (
                 <div className="p-24 text-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <p className="text-[15px] text-[#8A8A8E] font-medium italic tracking-tight-linear">Finalize production logic to unlock CTR tools.</p>
                 </div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};