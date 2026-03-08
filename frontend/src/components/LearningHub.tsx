
import React, { useState, useEffect } from 'react';
import { PublishedContent, PerformanceMetrics, CreatorProfile } from '../types';
import { getHistory, updatePerformance, getCreatorProfile, saveCreatorProfile, saveRetrospective } from '../services/storageService';
import { analyzePerformance, generateCreatorProfile } from '../services/awsAIService';
import { Button } from './Button';
import { useNotification } from './Notification';

export const LearningHub: React.FC = () => {
  const [history, setHistory] = useState<PublishedContent[]>([]);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({ views: 0, likes: 0, comments: 0, shares: 0, notes: '' });
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setHistory(getHistory());
    setProfile(getCreatorProfile());
  };

  const handleUpdateMetrics = async () => {
    if (!selectedContentId) return;
    setLoading(true);
    try {
      const updatedContent = updatePerformance(selectedContentId, metrics);
      if (updatedContent) {
        const retrospective = await analyzePerformance(updatedContent as any, metrics);
        saveRetrospective(selectedContentId, retrospective);
        loadData();
        setSelectedContentId(null);
        showNotification('success', "Audit complete.");
      }
    } catch (e) {
      showNotification('error', "Audit failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setProfileLoading(true);
    try {
      const fullHistory = getHistory();
      const newProfile = await generateCreatorProfile(fullHistory as any);
      saveCreatorProfile(newProfile as any);
      setProfile(newProfile as any);
      showNotification('success', "Intelligence profile updated.");
    } catch (e) {
      showNotification('error', "Profile synthesis failed.");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="space-y-2">
           <h2 className="text-4xl font-black text-white tracking-tighter">Performance Hub</h2>
           <p className="text-slate-500 text-lg font-medium">Sync results to evolve your strategic profile.</p>
         </div>
         <Button onClick={handleRefreshProfile} loading={profileLoading} variant="secondary" className="px-8 text-[10px]">
           Sync Strategy Profile
         </Button>
      </div>

      {profile ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-10 rounded-[2.5rem] border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Strategic Edge</h3>
            <ul className="space-y-4">
              {(profile.topStrengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-bold text-white">
                  <span className="text-white">●</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-10 rounded-[2.5rem] border-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Optimization Focus</h3>
            <ul className="space-y-4">
              {(profile.growthAreas || []).map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-300">
                  <span className="text-slate-500">↗</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-10 rounded-[2.5rem] border-white/5 bg-white/5">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">The Verdict</h3>
            <p className="text-sm text-white font-bold italic leading-relaxed">"{profile.strategicAdvice}"</p>
            <div className="mt-8 pt-6 border-t border-white/5">
               <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-4">High-Resonance Genres</p>
               <div className="flex flex-wrap gap-2">
                 {(profile.bestPerformingGenres || []).map((g, i) => (
                   <span key={i} className="text-[9px] px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white font-black">{g}</span>
                 ))}
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-20 text-center border-dashed border-2 border-white/5 rounded-[3rem]">
          <p className="text-slate-600 mb-8 font-medium italic">Initialize profile by tracking your first deployment results.</p>
          <Button onClick={handleRefreshProfile} loading={profileLoading} variant="action" className="px-12 py-4">Generate Strategy</Button>
        </div>
      )}

      <div className="space-y-10">
        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-6">Production Archive</h3>
        
        <div className="grid grid-cols-1 gap-6">
          {(history || []).map((item) => (
            <div key={item.id} className="glass-panel p-10 flex flex-col md:flex-row gap-10 rounded-[2.5rem] hover:bg-white/5 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className="px-3 py-1 bg-white text-slate-900 rounded-full text-[9px] uppercase font-black tracking-widest">{item.config?.platform || 'Project'}</span>
                  <span className="text-[10px] text-slate-600 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
                <h4 className="font-black text-2xl text-white mb-3 tracking-tight">{item.title || 'Draft Synthesis'}</h4>
                <p className="text-sm text-slate-400 font-medium leading-relaxed italic line-clamp-2">"{item.contentSnippet || 'Strategic data recorded.'}"</p>
                
                <div className="mt-6">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1">Resonance Prediction</span>
                     <span className="text-lg font-black text-white">{item.recommendation?.confidenceScore || 0}%</span>
                   </div>
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-80 flex flex-col justify-center">
                {item.actualMetrics ? (
                   <div className="bg-white/2 p-6 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                        <span className="text-[9px] font-black uppercase text-slate-600">Views</span>
                        <span className="text-lg font-black text-white">{item.actualMetrics.views.toLocaleString()}</span>
                      </div>
                      {item.aiRetrospective && (
                        <div className="mt-4">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-2 italic">Neural Audit</p>
                          <p className="text-xs text-slate-400 leading-relaxed font-bold italic">"{item.aiRetrospective}"</p>
                        </div>
                      )}
                   </div>
                ) : (
                  <Button 
                    onClick={() => { setSelectedContentId(item.id); setMetrics({ views: 0, likes: 0, comments: 0, shares: 0, notes: '' }); }}
                    variant="ghost"
                    className="border-2 border-dashed border-white/5 hover:border-white/20 h-full rounded-[2rem] p-8"
                  >
                    <span className="text-xs font-bold text-slate-600 uppercase">Input Actual Data</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedContentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-panel p-12 w-full max-w-lg space-y-8 rounded-[3rem]">
            <h3 className="text-2xl font-black text-white tracking-tight">Deployment Report</h3>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Views</label>
                <input 
                  type="number" 
                  value={metrics.views}
                  onChange={(e) => setMetrics({...metrics, views: parseInt(e.target.value) || 0})}
                  className="w-full glass-panel bg-white/5 p-4 rounded-xl text-white focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Engagement</label>
                <input 
                  type="number" 
                  value={metrics.likes}
                  onChange={(e) => setMetrics({...metrics, likes: parseInt(e.target.value) || 0})}
                  className="w-full glass-panel bg-white/5 p-4 rounded-xl text-white focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Strategic Takeaways</label>
              <textarea 
                value={metrics.notes}
                onChange={(e) => setMetrics({...metrics, notes: e.target.value})}
                placeholder="What happened on the platform?"
                className="w-full h-32 glass-panel bg-white/5 p-6 rounded-2xl text-white focus:ring-1 focus:ring-white/20 resize-none italic text-sm"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleUpdateMetrics} loading={loading} variant="action" className="flex-1 py-4">Confirm Audit</Button>
              <Button onClick={() => setSelectedContentId(null)} variant="ghost" className="px-8">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
