
import React, { useState, useRef } from 'react';
import { submitVideoRequestWithLambda, checkMediaStatusFromLambda, fileToBase64 } from '../services/awsAIService';
import { Button } from './Button';
import { useNotification } from './Notification';

export const VeoStudio: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const base64 = await fileToBase64(file);
      setImagePreview(`data:${file.type};base64,${base64}`);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      showNotification('error', 'Please provide a motion instruction.');
      return;
    }
    
    setLoading(true);
    setStatus('Initializing Neural Engine...');
    setVideoUrl(null);

    try {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setStatus('Waiting for API Key selection...');
          await (window as any).aistudio.openSelectKey();
        }
      }

      const base64Image = image ? await fileToBase64(image) : undefined;
      setStatus('Submitting Request to Neural Engine...');
      
      const requestId = await submitVideoRequestWithLambda(prompt, aspectRatio, base64Image);
      
      if (!requestId) {
        setStatus('Synthesis Failed');
        showNotification('error', 'Request submission failed.');
        return;
      }

      let finalUrl = undefined;
      let hasFailed = false;

      // Poll for completion
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusData = await checkMediaStatusFromLambda(requestId);
        
        if (statusData.status === 'completed' && statusData.url) {
           finalUrl = statusData.url;
           break;
        } else if (statusData.status === 'failed') {
           hasFailed = true;
           break;
        } else {
           setStatus(`Synthesizing... ${statusData.progress_percent || 0}%`);
        }
      }
      
      if (finalUrl) {
        setVideoUrl(finalUrl);
        setStatus('Ready');
        showNotification('success', 'Neural asset synthesized successfully.');
      } else {
        setStatus('Synthesis Failed');
        showNotification('error', 'Generation timed out or failed.');
      }
    } catch (error: any) {
      console.error(error);
      setStatus('Error');
      showNotification('error', `Generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-6xl mx-auto">
      <div className="glass-panel p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
        </div>

        <header className="mb-12 space-y-2">
           <h2 className="text-3xl font-black text-white tracking-tight">Neural Video Engine</h2>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Veo 3.1 Prompt Synthesis</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-8">
             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Format Vector</label>
               <div className="flex gap-2">
                 <button 
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${aspectRatio === '16:9' ? 'bg-white text-dark-charcoal border-white shadow-lg' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}
                 >
                   16:9 Landscape
                 </button>
                 <button 
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${aspectRatio === '9:16' ? 'bg-white text-dark-charcoal border-white shadow-lg' : 'bg-white/5 text-slate-500 border-white/10 hover:border-white/20'}`}
                 >
                   9:16 Portrait
                 </button>
               </div>
             </div>

             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motion Instruction</label>
               <textarea
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 placeholder="A cinematic drone shot of a neon cyberpunk city in the rain..."
                 className="w-full h-40 glass-panel bg-white/2 border border-white/10 rounded-[1.5rem] p-6 text-slate-200 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none text-sm placeholder:text-slate-700"
               />
             </div>

             <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Reference (Optional)</label>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className={`border-2 border-dashed rounded-[1.5rem] h-48 flex flex-col items-center justify-center cursor-pointer transition-all ${imagePreview ? 'border-white bg-white/5' : 'border-white/10 hover:border-white/30 bg-white/2'}`}
               >
                 {imagePreview ? (
                   <div className="relative h-full w-full p-4 group">
                     <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/80 px-4 py-2 rounded-full text-[9px] font-black text-white uppercase tracking-widest">Replace Frame</span>
                     </div>
                   </div>
                 ) : (
                   <div className="text-center space-y-3">
                     <svg className="w-8 h-8 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Drop Reference Image</p>
                   </div>
                 )}
                 <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
               </div>
             </div>

             <div className="pt-4">
                <Button 
                  onClick={handleGenerate} 
                  loading={loading}
                  disabled={!prompt}
                  variant="action"
                  className="w-full py-5 rounded-full text-sm font-black tracking-widest uppercase shadow-[0_20px_50px_rgba(255,255,255,0.05)]"
                >
                  Execute Synthesis
                </Button>
                {status && <p className="mt-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] animate-pulse">{status}</p>}
             </div>
          </div>

          {/* Monitor */}
          <div className="lg:col-span-7">
             <div className={`relative bg-black/40 rounded-[2.5rem] border border-white/10 overflow-hidden flex items-center justify-center shadow-inner ${aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[700px] mx-auto' : 'aspect-video'}`}>
                {videoUrl ? (
                  <video controls autoPlay loop className="w-full h-full object-contain">
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="text-center p-12 space-y-6">
                    <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center mx-auto opacity-20">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">Ready for Neural Stream</p>
                  </div>
                )}
             </div>
             {videoUrl && (
               <div className="mt-6 flex justify-between items-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Asset Ready</span>
                 <a href={videoUrl} download="tractionpal_neural_asset.mp4" className="text-[10px] font-black text-slate-400 hover:text-white transition-colors uppercase underline underline-offset-4">Download MP4</a>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
