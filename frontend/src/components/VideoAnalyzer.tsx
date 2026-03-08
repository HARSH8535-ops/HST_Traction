
import React, { useState } from 'react';
import { analyzeVideoContent, fileToBase64 } from '../services/awsAIService';
import { Button } from './Button';

export const VideoAnalyzer: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setAnalysis('');
    }
  };

  const handleAnalyze = async () => {
    if (!videoFile) return;
    setLoading(true);
    try {
      // Note: For production with large videos, File API upload is recommended. 
      // For this frontend-only demo, we convert to base64 which works for smaller clips.
      const base64 = await fileToBase64(videoFile);
      const result = await analyzeVideoContent(base64, videoFile.type);
      setAnalysis(result);
    } catch (error: any) {
      console.error(error);
      setAnalysis(`Error analyzing video: ${error.message}. Note: Large videos may fail in browser-only mode.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
       <div className="glass-panel p-8 rounded-3xl border-l-4 border-indigo-500">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Video Intelligence</h2>
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Powered by Nova Pro Vision</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 text-center bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                 <input 
                   type="file" 
                   accept="video/mp4,video/quicktime,video/webm"
                   onChange={handleFileChange}
                   className="block w-full text-sm text-slate-400
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-xs file:font-semibold
                     file:bg-indigo-600 file:text-white
                     file:cursor-pointer hover:file:bg-indigo-700
                   "
                 />
                 <p className="mt-4 text-xs text-slate-500">Supported: MP4, MOV, WebM (Max 50MB for browser processing)</p>
              </div>
              
              {videoFile && (
                <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{videoFile.name}</p>
                    <p className="text-xs text-slate-500">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAnalyze} 
                loading={loading}
                disabled={!videoFile}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700"
              >
                Analyze Video Content
              </Button>
            </div>

            <div className="glass-panel bg-slate-900/50 rounded-2xl p-6 min-h-[300px] flex flex-col">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Analysis Results</h3>
               {analysis ? (
                 <div className="prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[400px]">
                   <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{analysis}</p>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-3">
                   <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                   </svg>
                   <p className="text-xs">Upload a video to reveal AI insights.</p>
                 </div>
               )}
            </div>
          </div>
       </div>
    </div>
  );
};
