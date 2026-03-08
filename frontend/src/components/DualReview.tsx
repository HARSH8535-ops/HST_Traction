import React, { useState, useRef } from 'react';
import { ProjectConfig, DualReviewResponse, ReviewPoint, PublishingRecommendation } from '../types';
import { generateDualReview, generatePublishingDecision, fileToBase64 } from '../services/awsAIService';
import { savePublishedContent } from '../services/storageService';
import { Button } from './Button';
import { useNotification } from './Notification';

interface FeedbackItemProps {
  point: ReviewPoint;
  type: 'positive' | 'critical';
}

const FeedbackItem: React.FC<FeedbackItemProps> = ({ point, type }) => (
  <div className="p-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
    <div className="flex justify-between items-start mb-2">
      <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-white">{point.item}</h4>
      {point.timestamp && <span className="text-[10px] font-mono text-[#8A8A8E] font-bold">{point.timestamp}</span>}
    </div>
    <p className="text-sm text-[#8A8A8E] leading-relaxed mb-4">{point.details}</p>
    {point.actionable && (
      <div className={`text-[11px] font-semibold p-3 rounded-md ${type === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        <span className="font-black uppercase text-[9px] mr-3 opacity-60">Adjustment</span>
        {point.actionable}
      </div>
    )}
  </div>
);

interface DualReviewProps {
  config: ProjectConfig;
}

export const DualReview: React.FC<DualReviewProps> = ({ config }) => {
  const [inputType, setInputType] = useState<'text' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [review, setReview] = useState<DualReviewResponse | null>(null);
  const [recommendation, setRecommendation] = useState<PublishingRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleReview = async () => {
    if (inputType === 'text' && !textContent.trim()) return;
    if (inputType === 'video' && !videoFile) return;
    setLoading(true);
    setReview(null);
    setRecommendation(null);
    try {
      const content = inputType === 'video' ? await fileToBase64(videoFile!) : textContent;
      const result = await generateDualReview(content, inputType, videoFile?.type || 'text/plain', config);
      setReview(result);
      showNotification('success', 'Critique synthesized.');
    } catch (error) {
      showNotification('error', "Review synthesis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetDecision = async () => {
    if (!review) return;
    setDecisionLoading(true);
    try {
      const result = await generatePublishingDecision(review, config);
      setRecommendation(result);
    } catch (error) {
      showNotification('error', "Verdict generation failed.");
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <div className="space-y-16 pb-32">
      {!review && (
        <div className="max-w-2xl mx-auto space-y-12">
           <header className="text-center space-y-2">
             <h2 className="text-3xl font-black text-white">Review Board</h2>
             <p className="text-lg text-[#8A8A8E]">Synthesize your draft via multi-perspective strategic critique.</p>
           </header>
           
           <div className="flex gap-1 p-1.5 bg-white/5 rounded-lg border border-white/10">
              <button 
                onClick={() => setInputType('text')}
                className={`flex-1 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${inputType === 'text' ? 'bg-white text-black shadow-sm' : 'text-[#8A8A8E] hover:text-white'}`}
              >
                Text Script
              </button>
              <button 
                onClick={() => setInputType('video')}
                className={`flex-1 py-2.5 rounded-md text-xs font-black uppercase tracking-widest transition-all ${inputType === 'video' ? 'bg-white text-black shadow-sm' : 'text-[#8A8A8E] hover:text-white'}`}
              >
                Video Data
              </button>
           </div>

           <div className="p-10 linear-card min-h-[400px] flex flex-col justify-center border-dashed border-2 border-white/10 bg-white/[0.01]">
              {inputType === 'text' ? (
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste script data for analysis..."
                  className="w-full h-80 border-0 bg-transparent text-lg focus:ring-0 resize-none text-center leading-relaxed italic text-white placeholder:text-white/20"
                />
              ) : (
                <div className="flex flex-col items-center gap-6">
                   <input type="file" onChange={(e) => {
                     if(e.target.files?.[0]) {
                       setVideoFile(e.target.files[0]);
                       setVideoPreview(URL.createObjectURL(e.target.files[0]));
                     }
                   }} accept="video/*" className="hidden" id="vid-upload"/>
                   <label htmlFor="vid-upload" className="cursor-pointer border-2 border-white/10 px-10 py-3 rounded-md text-xs font-black uppercase tracking-widest text-[#8A8A8E] hover:bg-white/5 hover:text-white transition-colors">Select Video Asset</label>
                   {videoPreview && <video src={videoPreview} className="mt-8 max-h-56 rounded-lg shadow-md border border-white/10" controls />}
                </div>
              )}
           </div>

           <Button onClick={handleReview} loading={loading} variant="primary" className="w-full py-4 text-base shadow-lg">
             Request Strategic Analysis
           </Button>
        </div>
      )}

      {review && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="linear-card overflow-hidden border-t-2 border-emerald-500">
              <div className="px-8 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Strategic Strengths</h3>
                 <span className="text-[9px] text-[#8A8A8E] font-black uppercase">Resonance Focus</span>
              </div>
              <div className="p-6 bg-emerald-500/5 border-b border-white/5 text-sm text-white font-semibold italic leading-relaxed">
                "{review.positive.summary}"
              </div>
              <div className="divide-y divide-white/5">
                 {review.positive.points.map((p, i) => <FeedbackItem key={i} point={p} type="positive" />)}
              </div>
           </div>

           <div className="linear-card overflow-hidden border-t-2 border-red-400">
              <div className="px-8 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-400">Critical Friction</h3>
                 <span className="text-[9px] text-[#8A8A8E] font-black uppercase">Production Logic</span>
              </div>
              <div className="p-6 bg-red-500/5 border-b border-white/5 text-sm text-white font-semibold italic leading-relaxed">
                "{review.critical.summary}"
              </div>
              <div className="divide-y divide-white/5">
                 {review.critical.points.map((p, i) => <FeedbackItem key={i} point={p} type="critical" />)}
              </div>
           </div>
        </div>
      )}

      {review && (
        <div className="fixed bottom-0 left-64 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 flex items-center justify-between z-40 shadow-2xl">
           <div className="flex gap-12 items-center">
              <div>
                <p className="text-[9px] font-black text-[#8A8A8E] uppercase tracking-[0.25em] mb-1">Status</p>
                <p className="text-sm font-black text-white">{recommendation ? recommendation.decision.replace('_', ' ') : 'Processing Verdict'}</p>
              </div>
              {recommendation && (
                <div>
                  <p className="text-[9px] font-black text-[#8A8A8E] uppercase tracking-[0.25em] mb-1">Confidence</p>
                  <p className="text-sm font-black text-emerald-400">{recommendation.confidenceScore}%</p>
                </div>
              )}
           </div>
           <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setReview(null)} className="px-6">New Review</Button>
              {!recommendation ? (
                <Button onClick={handleGetDecision} loading={decisionLoading} variant="action" className="px-10">Generate Final Verdict</Button>
              ) : (
                <Button 
                  onClick={() => savePublishedContent({ config, title: 'Project Archive', contentSnippet: '', predictedScore: recommendation.confidenceScore, recommendation })}
                  variant="primary"
                  className="px-10"
                >
                  Execute Deployment
                </Button>
              )}
           </div>
        </div>
      )}
    </div>
  );
};