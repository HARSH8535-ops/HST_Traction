import React, { useState } from 'react';
import { generateCreativeDirections } from '../services/awsAIService';
import { CreativeDirection, ProjectConfig } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

import { ContentDirection } from '../types';

interface CreativeExplorerProps {
  projectConfig: ProjectConfig;
  onDirectionSelected: (direction: ContentDirection, draft: string) => void;
}

const SEED_TEMPLATES = [
  'Contrarian Take',
  'Process Reveal',
  'Myth Busting',
  'Rapid Tutorial',
  'Industry Shift',
  'Personal Odyssey',
  'Resource Synthesis',
  'Neural Hook Analysis',
  'Competitor Gap'
];

export const CreativeExplorer: React.FC<CreativeExplorerProps> = ({ projectConfig, onDirectionSelected }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState<CreativeDirection[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const { showNotification } = useNotification();

  const handleExplore = async (seed?: string, isRegenerate = false) => {
    const finalTopic = seed ? `${seed}: ${topic}` : topic;
    if (!topic.trim() && !seed) return;
    setLoading(true);
    try {
      const legacyConfig = {
        ...projectConfig,
        purpose: projectConfig.purposes?.[0] || 'Educate',
        emotion: projectConfig.intendedImpacts?.[0] || 'Trust'
      };

      let finalSuggestion = isRegenerate ? suggestion : undefined;
      if (isRegenerate && !suggestion.trim()) {
         // use a random seed to generate different directions if no suggestion provided
         finalSuggestion = "Please provide 3 completely different directions this time. Random factor: " + Math.random();
      }

      const data = await generateCreativeDirections(finalTopic, legacyConfig, finalSuggestion);
      setDirections(data);
      setHasGenerated(true);
      showNotification('success', 'Strategic Directions established.');
    } catch (error) {
      showNotification('error', "Exploration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-20 animate-in fade-in duration-500">
      <div className="space-y-12">
        <header className="space-y-4">
          <h2 className="hero-heading text-4xl font-bold text-white tracking-tight italic">Market Lab</h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium leading-relaxed max-w-xl tracking-tight-linear">
            Synthesize high-frequency strategic angles for your <strong>{projectConfig.platform}</strong> deployment.
          </p>
        </header>
        
        <div className="space-y-10">
           <div className="flex items-center gap-3 p-1 linear-card rounded-xl">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Initialize with a core topic..."
                className="flex-1 bg-transparent border-none focus:ring-0 px-6 py-3 text-white font-medium italic text-lg"
              />
              <Button onClick={() => handleExplore()} loading={loading} className="px-8 h-12">
                Inject topic
              </Button>
           </div>
           
           <div className="space-y-4">
              <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest pl-1">Neural Multipliers</p>
              <div className="flex flex-wrap gap-2">
                {SEED_TEMPLATES.map(seed => (
                  <button 
                    key={seed}
                    onClick={() => handleExplore(seed)}
                    className="px-4 py-2 rounded-md bg-white/5 border border-white/5 text-[11px] font-bold text-[#8A8A8E] hover:border-white/20 hover:text-white transition-all tracking-tight-linear"
                  >
                    {seed}
                  </button>
                ))}
              </div>
           </div>
        </div>
      </div>

      {hasGenerated && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-1 linear-card rounded-xl border border-white/10 bg-white/[0.02]">
            <input
              type="text"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Prefer something else? Enter a suggestion (or leave blank for random alternatives)..."
              className="flex-1 bg-transparent border-none focus:ring-0 px-6 py-3 text-white font-medium italic text-sm"
            />
            <Button onClick={() => handleExplore(undefined, true)} loading={loading} className="px-6 h-10 bg-white/10 hover:bg-white/20">
              Regenerate
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {directions.map((dir, idx) => (
          <div key={idx} className="p-10 linear-card flex flex-col justify-between min-h-[400px] hover:bg-white/[0.02] transition-colors border-l-2 border-white/20 group relative">
            <div>
              <p className="text-[10px] font-bold text-white opacity-20 mb-6 uppercase tracking-widest">Logic Vector 0{idx + 1}</p>
              <h3 className="font-bold text-2xl text-white mb-8 tracking-tight-linear italic">{dir.title}</h3>
              
              <div className="space-y-8 mb-12">
                <div>
                  <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-3">Prime Hook</p>
                  <p className="text-[15px] text-white italic leading-relaxed font-medium">"{dir.hook}"</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-3">Strategic Angle</p>
                  <p className="text-[14px] text-[#8A8A8E] leading-relaxed font-medium">{dir.angle}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-auto border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => {
                   const mappedDir: ContentDirection = {
                      id: `dir-${idx}`,
                      coreIdea: dir.title,
                      emotionalAngle: dir.angle,
                      potentialUpside: 'High alignment with chosen target audience',
                      creativeTradeOffs: 'Focuses heavily on the prime hook',
                      reasoning: 'Generated from Market Lab exploration',
                      creatorAdvice: dir.targetAudience || 'Proceed with confidence.'
                   };
                   onDirectionSelected(mappedDir, `Topic: ${topic}\nHook: ${dir.hook}`);
                }}
                className="w-full h-10 text-xs font-bold"
              >
                Proceed to Script Core
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};