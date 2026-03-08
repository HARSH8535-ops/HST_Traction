
import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideoContent, fileToBase64 } from '../services/awsAIService';
import { Button } from './Button';
import { VideoAnalysisResult } from '../types';
import { useNotification } from './Notification';
import anime from 'animejs';

export const VideoEditor: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { showNotification } = useNotification();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setAnalysis(null);
      showNotification('info', "Production asset injected.");
    }
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setLoading(true);
    try {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }
      const base64 = await fileToBase64(videoFile);
      const result = await analyzeVideoContent(base64, videoFile.type);
      setAnalysis(result);
      showNotification('success', "Video Intelligence synthesis complete.");
    } catch (error: any) {
      showNotification('error', `Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysis && suggestionsRef.current) {
      anime({
        targets: suggestionsRef.current.children,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(150),
        duration: 800,
        easing: 'easeOutQuart'
      });
    }
  }, [analysis]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => setCurrentTime(v.currentTime);
    const loaded = () => setDuration(v.duration);
    v.addEventListener('timeupdate', update);
    v.addEventListener('loadedmetadata', loaded);
    return () => {
      v.removeEventListener('timeupdate', update);
      v.removeEventListener('loadedmetadata', loaded);
    };
  }, [videoUrl]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
           <h2 className="text-4xl font-black text-white tracking-tighter">Video Intelligence Hub</h2>
           <p className="text-slate-500 text-lg font-medium">Deep neural understanding of production logic and audience resonance.</p>
        </div>
        <div className="flex gap-4">
           {videoFile && !analysis && (
             <Button onClick={handleAnalyze} loading={loading} variant="action" className="px-12 py-4 shadow-2xl">
               Audit Intelligence
             </Button>
           )}
           {analysis && (
             <div className="px-6 py-2 bg-white/5 border border-white/20 rounded-full flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Synthesis active</span>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Production Monitor */}
        <div className="lg:col-span-8 space-y-8">
           <div className="glass-panel p-8 rounded-[3rem] border border-white/10 bg-black/20">
              <div className="aspect-video bg-black rounded-[2rem] overflow-hidden relative border border-white/5 flex items-center justify-center">
                 {videoUrl ? (
                   <video 
                     ref={videoRef}
                     src={videoUrl}
                     className="max-h-full w-full object-contain"
                   />
                 ) : (
                   <div className="text-center space-y-6">
                      <div 
                        onClick={() => document.getElementById('vid-upload')?.click()}
                        className="w-24 h-24 rounded-[2rem] border-2 border-dashed border-white/10 hover:border-white/20 transition-all flex items-center justify-center mx-auto cursor-pointer group"
                      >
                         <svg className="w-10 h-10 text-slate-700 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Awaiting Production Asset</p>
                      <input id="vid-upload" type="file" onChange={handleFileChange} accept="video/*" className="hidden" />
                   </div>
                 )}
                 
                 {videoUrl && (
                   <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 glass-panel rounded-full border border-white/20 shadow-2xl">
                      <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                        {isPlaying ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/50">
                        <span className="text-white font-bold">{formatTime(currentTime)}</span>
                        <span>/</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                   </div>
                 )}
              </div>
           </div>

           {/* Metrics Overlay */}
           {analysis && (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Hook Resonance', value: analysis.hookScore, suffix: '%' },
                  { label: 'Pacing Vector', value: analysis.pacingScore, suffix: '%' },
                  { label: 'Visual Style', value: analysis.visualStyle, type: 'string' },
                  { label: 'Audience Impact', value: analysis.emotionalImpact, type: 'string' },
                ].map((m, i) => (
                  <div key={i} className="glass-panel p-8 rounded-[2rem] border-white/5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">{m.label}</p>
                    <p className="text-2xl font-black text-white truncate">
                      {m.type === 'string' ? m.value : `${m.value}${m.suffix}`}
                    </p>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="glass-panel p-10 rounded-[3rem] h-full border-white/5 flex flex-col">
              <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Audit Stream</h3>
                 <span className="text-[9px] text-slate-700 font-bold uppercase">Nova Pro Vision</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-10 custom-scroll pr-4" ref={suggestionsRef}>
                {analysis ? (
                  <>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-l-2 border-white pl-4 py-1">Overall Verdict</h4>
                       <p className="text-sm text-slate-400 leading-relaxed font-medium italic">"{analysis.overallFeedback}"</p>
                    </div>

                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-l-2 border-white pl-4 py-1">Timeline Points</h4>
                       {analysis.suggestions.map((s, idx) => (
                         <div key={idx} className="space-y-4 group opacity-0">
                            <div className="flex justify-between items-center">
                               <span className="text-[11px] font-black text-white bg-white/10 px-3 py-1 rounded-lg uppercase tracking-widest">{s.timestamp}</span>
                               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{s.type}</span>
                            </div>
                            <div className="space-y-3">
                               <p className="text-sm font-bold text-slate-200 leading-snug">{s.description}</p>
                               <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-[11px] leading-relaxed text-slate-400">
                                  <p className="font-black uppercase text-[8px] text-slate-600 mb-1">Impact Projection</p>
                                  {s.impact}
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                     <svg className="w-16 h-16 text-white mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                     <p className="text-[11px] font-black uppercase tracking-[0.4em]">Audit stream awaiting production deployment</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
