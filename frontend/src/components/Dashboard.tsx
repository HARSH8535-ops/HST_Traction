import React from 'react';
import { ProjectConfig, TabType } from '../types';
import { Button } from './Button';

interface DashboardProps {
  onNavigate: (tab: TabType) => void;
  activeProject: ProjectConfig | null;
  onNewProject: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, activeProject, onNewProject }) => {
  return (
    <div className="min-h-screen flex flex-col items-center pt-24 pb-48 animate-in fade-in duration-1000">
      
      {/* Subtle top navigation mockup */}
      <div className="fixed top-0 left-0 right-0 h-14 border-b border-white/5 bg-black/60 backdrop-blur-xl z-50 flex items-center px-10">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-[13px] tracking-tight text-white">TractionPal</span>
        </div>
        <nav className="ml-10 hidden md:flex items-center gap-6">
          {['Product', 'Method', 'Customers', 'Intelligence', 'Pricing'].map((item) => (
            <button key={item} className="text-[12px] text-[#8A8A8E] hover:text-white transition-colors tracking-tight-linear font-medium">
              {item}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <button className="text-[12px] text-[#8A8A8E] hover:text-white px-3 font-medium">Log in</button>
          <button onClick={onNewProject} className="bg-white text-black text-[12px] font-bold px-3 py-1.5 rounded hover:bg-[#E5E5E5] transition-all">Sign up</button>
        </div>
      </div>

      {/* Landing Hero Section */}
      <div className="max-w-4xl w-full text-left space-y-12 mb-32 px-6">
        <div className="space-y-8">
          <h1 className="hero-heading">
            TractionPal is a purpose-built system for content intelligence
          </h1>
          <p className="text-[#8A8A8E] text-[18px] md:text-[21px] max-w-2xl leading-relaxed tracking-tight-linear font-medium">
            Decipher the hidden patterns of high-performance media. 
            Synthesize strategy, engineer resonance, and deploy with confidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button 
            onClick={activeProject ? () => onNavigate(TabType.RESEARCH) : onNewProject}
            className="px-6 py-2.5 rounded text-[13px] font-bold flex items-center gap-2"
          >
            {activeProject ? 'Launch workspace' : 'Start building'}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          <button className="px-6 py-2.5 rounded text-[13px] font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all tracking-tight-linear">
            View methodology
          </button>
        </div>
      </div>

      {/* Stylized App Canvas Preview */}
      <div className="relative w-full max-w-6xl mx-auto px-6">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-transparent blur-3xl opacity-30"></div>
        <div className="relative linear-card rounded-xl overflow-hidden aspect-[16/10] shadow-[0_40px_100px_rgba(0,0,0,0.9)] bg-black">
          {/* Internal App Frame */}
          <div className="w-full h-full flex flex-col">
            <div className="h-9 border-b border-white/5 bg-white/[0.03] flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/5"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-white/5"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-white/5"></div>
              </div>
              <div className="mx-auto text-[9px] text-[#8A8A8E] font-mono tracking-widest opacity-30 uppercase">TRACTIONPAL.CLOUD / INTEL_SESSION_V2.5</div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              {/* Mock Sidebar */}
              <div className="w-44 border-r border-white/5 bg-white/[0.01] p-6 space-y-6">
                <div className="h-3 w-20 bg-white/5 rounded"></div>
                <div className="space-y-4">
                  <div className="h-1.5 w-28 bg-white/10 rounded"></div>
                  <div className="h-1.5 w-24 bg-white/10 rounded"></div>
                  <div className="h-1.5 w-32 bg-white/10 rounded"></div>
                </div>
              </div>
              {/* Mock Core Interface */}
              <div className="flex-1 p-10 space-y-12 overflow-hidden bg-gradient-to-br from-white/[0.01] to-transparent">
                <div className="space-y-4">
                  <div className="h-10 w-80 bg-white/20 rounded shadow-sm"></div>
                  <div className="h-3 w-full bg-white/5 rounded"></div>
                  <div className="h-3 w-2/3 bg-white/5 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="h-56 linear-card bg-white/[0.02]"></div>
                  <div className="h-56 linear-card bg-white/[0.02]"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overlay Element mimicking the Linear screenshot's right-side circle UI */}
          <div className="absolute top-1/2 -right-10 translate-y-[-50%] w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl z-20 hidden lg:flex">
             <div className="w-6 h-1 bg-black rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Secondary Feature Blocks */}
      <div className="mt-48 max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-24 px-6">
        <div className="space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8A8A8E]">The Core Intelligence</p>
          <h3 className="text-3xl font-bold tracking-tight-linear text-white">Decide before deployment</h3>
          <p className="text-[#8A8A8E] text-[16px] leading-relaxed font-medium tracking-tight-linear">
            Traditional tools show you what happened yesterday. TractionPal simulates tomorrow. 
            By modeling audience resonance, we eliminate the guesswork of production.
          </p>
        </div>
        <div className="space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#8A8A8E]">Integrated Methodology</p>
          <h3 className="text-3xl font-bold tracking-tight-linear text-white">Workflow for impact</h3>
          <p className="text-[#8A8A8E] text-[16px] leading-relaxed font-medium tracking-tight-linear">
            Streamline your pipeline with research hubs, script generators, and visual suites. 
            Focus on creative execution while our intelligence layer handles the strategy.
          </p>
        </div>
      </div>
      
      {/* Minimalist Footer */}
      <footer className="mt-64 border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center w-full max-w-5xl px-6 opacity-40 text-[#8A8A8E]">
        <div className="flex items-center gap-3 mb-6 md:mb-0">
          <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-[11px] font-bold tracking-tight">© 2024 TRACTIONPAL SYSTEMS INC.</span>
        </div>
        <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest">
          <span className="hover:text-white cursor-pointer transition-colors">X</span>
          <span className="hover:text-white cursor-pointer transition-colors">Discord</span>
          <span className="hover:text-white cursor-pointer transition-colors">Security</span>
        </div>
      </footer>
    </div>
  );
};