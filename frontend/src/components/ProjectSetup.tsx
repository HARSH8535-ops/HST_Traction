import React, { useState } from 'react';
import { ProjectConfig, PlatformType, PurposeType, EmotionType, FormType, GenreType } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

const PLATFORMS: { name: PlatformType; icon: React.ReactNode }[] = [
  { 
    name: 'Instagram', 
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ) 
  },
  { 
    name: 'YouTube', 
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186c-.273-1.003-1.06-1.791-2.063-2.064-1.815-.486-9.103-.486-9.103-.486s-7.288 0-9.103.486c-1.003.273-1.79 1.061-2.064 2.064-.485 1.814-.485 5.597-.485 5.597s0 3.784.485 5.598c.274 1.003 1.061 1.79 2.064 2.063 1.815.487 9.103.487 9.103.487s7.288 0 9.103-.487c1.003-.273 1.791-1.06 2.064-2.063.485-1.814.485-5.598.485-5.598s0-3.783-.485-5.597zM9.545 15.568V8.196l6.393 3.686-6.393 3.686z" />
      </svg>
    ) 
  },
  { 
    name: 'LinkedIn', 
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ) 
  },
  { 
    name: 'TikTok', 
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.03 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.16 1.13.28 2.33 1.14 3.03.85.73 2.05.97 3.13.67 1.1-.27 2.05-1.14 2.37-2.22.1-.42.13-.85.12-1.28l.02-11.41z" />
      </svg>
    ) 
  },
  { 
    name: 'Twitter', 
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zm-1.291 19.489h2.04L6.448 3.232H4.26L17.61 20.642z" />
      </svg>
    ) 
  },
];

const PURPOSES: PurposeType[] = ['Educate', 'Inspire', 'Convert', 'Build Trust', 'Entertain'];
const EMOTIONS: EmotionType[] = ['Excitement', 'Trust', 'Curiosity', 'Empathy', 'Motivation'];
const FORMS: FormType[] = ['Short Form', 'Long Form', 'Blog', 'Vlog'];
const GENRES: GenreType[] = ['Academic', 'Lifestyle', 'Relaxation', 'Creative'];

interface ProjectSetupProps {
  onComplete: (config: ProjectConfig) => void;
  initialConfig: ProjectConfig | null;
}

export const ProjectSetup: React.FC<ProjectSetupProps> = ({ onComplete, initialConfig }) => {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Partial<ProjectConfig>>(initialConfig || {
    purposes: [],
    intendedImpacts: []
  });

  const handleToggleMulti = (key: 'purposes' | 'intendedImpacts', value: any) => {
    const current = config[key] || [];
    if (current.includes(value)) {
      setConfig(prev => ({ ...prev, [key]: current.filter(v => v !== value) }));
    } else {
      setConfig(prev => ({ ...prev, [key]: [...current, value] }));
    }
  };

  const handleSelect = (key: keyof ProjectConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const isComplete = config.platform && config.purposes?.length! > 0 && config.intendedImpacts?.length! > 0 && config.form && config.genre;

  return (
    <div className="max-w-4xl mx-auto py-20 space-y-24 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <div className="flex justify-between items-center gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-700 ${i <= step ? 'bg-white opacity-100' : 'bg-white opacity-5'}`} />
        ))}
      </div>

      <div className="min-h-[500px]">
        {step === 1 && (
          <div className="space-y-16">
            <header className="space-y-6">
              <h2 className="hero-heading text-5xl font-bold tracking-tight text-white leading-tight">Select deployment terrain</h2>
              <p className="text-lg text-[#8A8A8E] font-medium tracking-tight-linear max-w-xl">Choose the primary platform for your content intelligence synthesis.</p>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {PLATFORMS.map(p => (
                <button
                  key={p.name}
                  onClick={() => { handleSelect('platform', p.name); handleNext(); }}
                  className={`p-10 transition-all flex flex-col items-center gap-6 linear-card group ${config.platform === p.name ? 'bg-white/10 border-white/20' : 'hover:bg-white/5 hover:border-white/10'}`}
                >
                  <div className={`transition-all duration-300 ${config.platform === p.name ? 'text-white scale-110' : 'text-[#8A8A8E] group-hover:text-white'}`}>
                    {p.icon}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${config.platform === p.name ? 'text-white' : 'text-[#8A8A8E] group-hover:text-white'}`}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-16">
            <header className="space-y-6">
              <h2 className="hero-heading text-5xl font-bold tracking-tight text-white leading-tight">Architecture</h2>
              <p className="text-lg text-[#8A8A8E] font-medium tracking-tight-linear max-w-xl">Define the structural form and topical vertical of your project.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Production format</p>
                <div className="grid grid-cols-1 gap-2">
                  {FORMS.map(f => (
                    <button key={f} onClick={() => handleSelect('form', f)} className={`p-4 text-[13px] font-bold border rounded-md transition-all text-left ${config.form === f ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-[#8A8A8E] hover:border-white/10'}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Content vertical</p>
                <div className="grid grid-cols-1 gap-2">
                  {GENRES.map(g => (
                    <button key={g} onClick={() => handleSelect('genre', g)} className={`p-4 text-[13px] font-bold border rounded-md transition-all text-left ${config.genre === g ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-[#8A8A8E] hover:border-white/10'}`}>{g}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-end pt-12">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button disabled={!config.form || !config.genre} onClick={handleNext}>Next step</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-16">
            <header className="space-y-6">
              <h2 className="hero-heading text-5xl font-bold tracking-tight text-white leading-tight">Strategic intent</h2>
              <p className="text-lg text-[#8A8A8E] font-medium tracking-tight-linear max-w-xl">Determine the primary operational objectives for this session.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PURPOSES.map(p => (
                <button 
                  key={p} 
                  onClick={() => handleToggleMulti('purposes', p)} 
                  className={`p-6 text-[13px] font-bold uppercase tracking-widest border rounded-md transition-all text-center ${config.purposes?.includes(p) ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-[#8A8A8E] hover:border-white/10'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="space-y-3">
               <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Custom objective</label>
               <input 
                type="text" 
                value={config.customPurpose || ''} 
                onChange={(e) => handleSelect('customPurpose', e.target.value)}
                placeholder="Specific tactical goals..."
                className="w-full linear-input"
               />
            </div>
            <div className="flex gap-4 justify-end pt-12">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button disabled={config.purposes?.length === 0} onClick={handleNext}>Lock intents</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-16">
            <header className="space-y-6">
              <h2 className="hero-heading text-5xl font-bold tracking-tight text-white leading-tight">Intended impact</h2>
              <p className="text-lg text-[#8A8A8E] font-medium tracking-tight-linear max-w-xl">Calibrate the resonance frequency for your target demographic.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EMOTIONS.map(e => (
                <button 
                  key={e} 
                  onClick={() => handleToggleMulti('intendedImpacts', e)} 
                  className={`p-6 text-[13px] font-bold uppercase tracking-widest border rounded-md transition-all text-center ${config.intendedImpacts?.includes(e) ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-[#8A8A8E] hover:border-white/10'}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="space-y-3">
               <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Psychological target</label>
               <input 
                type="text" 
                value={config.customImpact || ''} 
                onChange={(e) => handleSelect('customImpact', e.target.value)}
                placeholder="Desired audience response..."
                className="w-full linear-input"
               />
            </div>
            <div className="flex gap-4 justify-end pt-12">
              <Button variant="ghost" onClick={handleBack}>Back</Button>
              <Button 
                disabled={!isComplete} 
                onClick={() => onComplete(config as ProjectConfig)}
                className="px-10"
              >
                Launch workspace
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};