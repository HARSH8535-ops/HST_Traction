import React, { useState, useEffect, useRef } from 'react';
import { TabType, ProjectConfig, ContentDirection, AgentProfile } from './types';
import { Dashboard } from './components/Dashboard';
import { Analyzer } from './components/Analyzer';
import { CreativeExplorer } from './components/CreativeExplorer';
import { ProjectSetup } from './components/ProjectSetup';
import { ScriptDeveloper } from './components/ScriptDeveloper';
import { LiveConversation } from './components/LiveConversation';
import { VideoEditor } from './components/VideoEditor';
import { DualReview } from './components/DualReview';
import { LearningHub } from './components/LearningHub';
import { CostMonitor } from './components/CostMonitor';
import { NotificationProvider } from './components/Notification';
import { PrivacyControls } from './components/PrivacyControls';
import { VisualsSuite } from './components/VisualsSuite';
import { GrowthSuite } from './components/GrowthSuite';
import { CalendarSuite } from './components/CalendarSuite';
import { AgentList } from './components/AgentList';
import { AgentForm } from './components/AgentForm';
import { AgentDetail } from './components/AgentDetail';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { Button } from './components/Button';
import anime from 'animejs';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.DASHBOARD);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback for environments without aistudio global
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  // Load agents from backend on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { API_URL } = await import('./services/config');
        const response = await fetch(`${API_URL}/api/agents?userId=user123`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setAgents(data);
          }
        }
      } catch (e) {
        console.warn('Could not load agents from backend:', e);
      }
    };
    loadAgents();
  }, []);

  // Check if onboarding should be shown for first-time agent management users
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('tractionpal_onboarding_seen');
    if (!hasSeenOnboarding && activeTab === TabType.AGENT_MANAGEMENT) {
      setShowOnboarding(true);
    }
  }, [activeTab]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Proceed after triggering dialog
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('tractionpal_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const [analyzerContent, setAnalyzerContent] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<{dir: ContentDirection, draft: string} | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [finalScript, setFinalScript] = useState<string | null>(null);

  const handleSetupComplete = (config: ProjectConfig) => {
    setProjectConfig(config);
    setActiveTab(TabType.RESEARCH);
  };

  const handleDirectionSelection = (direction: ContentDirection, draft: string) => {
    setSelectedDirection({ dir: direction, draft });
    setActiveTab(TabType.SCRIPTING);
  };

  const handleFinalizeScript = (script: string) => {
    setFinalScript(script);
    setScriptContent(script);
    setActiveTab(TabType.VISUALS);
  };

  const startNewProject = () => {
    if (projectConfig && !confirm("Discard current workspace?")) return;
    setProjectConfig(null);
    setSelectedDirection(null);
    setFinalScript(null);
    setAnalyzerContent('');
    setScriptContent('');
    setActiveTab(TabType.SETUP);
  };

  useEffect(() => {
    if (contentRef.current) {
      anime({
        targets: contentRef.current,
        opacity: [0, 1],
        translateY: [4, 0],
        duration: 400,
        easing: 'easeOutQuart'
      });
    }
  }, [activeTab]);

  const Icon = ({ path }: { path: string }) => (
    <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );

  const SidebarItem = ({ tab, iconPath, label, isLocked = false }: { tab: TabType, iconPath: string, label: string, isLocked?: boolean }) => (
    <button
      onClick={() => { if (!isLocked) setActiveTab(tab) }}
      className={`sidebar-item-linear w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium tracking-tight-linear transition-all ${activeTab === tab ? 'active' : ''} ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}`}
    >
      <Icon path={iconPath} />
      <span className="truncate flex-1 text-left">{label}</span>
      {isLocked && (
        <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-50" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      )}
      {activeTab === tab && !isLocked && <div className="w-1 h-1 rounded-full bg-white opacity-40"></div>}
    </button>
  );

  const hasSetup = !!projectConfig;
  const hasDirection = !!selectedDirection;
  const hasScript = !!(finalScript || scriptContent);

  return (
    <NotificationProvider>
      {hasApiKey === false ? (
        <div className="h-screen w-full bg-[#080808] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-8">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#5E6AD2]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white tracking-tight-linear">Connect Strategic Intelligence</h2>
              <p className="text-[#8A8A8E] text-[15px] leading-relaxed">
                To access advanced AI models like Nova Canvas and Nova Pro, you must select an API key from a paid AWS project.
              </p>
            </div>
            <div className="pt-4 space-y-4">
              <Button variant="primary" onClick={handleSelectKey} className="w-full py-3 text-[15px]">
                Select API Key
              </Button>
              <a 
                href="https://aws.amazon.com/bedrock/pricing/"
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-[12px] text-[#8A8A8E] hover:text-white transition-colors underline underline-offset-4"
              >
                Learn about AWS Bedrock pricing
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden bg-[#080808]">
          {/* ... existing sidebar ... */}
        <aside className="w-64 bg-[#080808] border-r border-white/5 flex-shrink-0 flex flex-col z-20 h-full">
          <div className="p-6 flex items-center gap-3 mb-4">
            <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white">TractionPal</h1>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 custom-scroll">
            <div>
              <p className="px-3 text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-3">System</p>
              <SidebarItem tab={TabType.DASHBOARD} iconPath="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Workspace" />
              <SidebarItem tab={TabType.SETUP} iconPath="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" label="Deployment" />
              <SidebarItem tab={TabType.AGENT_MANAGEMENT} iconPath="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" label="AI Agents" />
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-3">Production</p>
              <SidebarItem tab={TabType.RESEARCH} iconPath="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" label="Market Lab" isLocked={!hasSetup} />
              <SidebarItem tab={TabType.SCRIPTING} iconPath="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" label="Script Core" isLocked={!hasSetup || !hasDirection} />
              <SidebarItem tab={TabType.VISUALS} iconPath="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" label="Visual Logic" isLocked={!hasSetup || !hasScript} />
              <SidebarItem tab={TabType.PUBLISHING} iconPath="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" label="Review Board" isLocked={!hasSetup || !hasScript} />
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest mb-3">Insights</p>
              <SidebarItem tab={TabType.ANALYTICS} iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Performance" isLocked={!hasSetup} />
              <SidebarItem tab={TabType.GROWTH} iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" label="Growth Flow" isLocked={!hasSetup} />
              <SidebarItem tab={TabType.CALENDAR} iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Calendar Plan" isLocked={!hasSetup} />
            </div>
          </div>

          <div className="mt-auto border-t border-white/5 p-4 space-y-2">
             <SidebarItem tab={TabType.LIVE_VOICE} iconPath="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" label="Strategy Voice" />
             <button 
                onClick={() => setShowPrivacy(true)}
                className="w-full text-[10px] text-[#8A8A8E] hover:text-white text-left px-3 py-2 font-bold uppercase tracking-widest transition-colors"
             >
               Privacy Panel
             </button>
          </div>
        </aside>

        {/* Dynamic Content Surface */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div ref={contentRef} className="max-w-6xl mx-auto py-16 px-12 min-h-full">
            {activeTab === TabType.DASHBOARD && (
              <Dashboard 
                onNavigate={setActiveTab} 
                activeProject={projectConfig}
                onNewProject={startNewProject}
              />
            )}

            {activeTab === TabType.SETUP && (
              <ProjectSetup onComplete={handleSetupComplete} initialConfig={projectConfig} />
            )}

            {activeTab === TabType.RESEARCH && (
              <div className="space-y-32">
                <CreativeExplorer
                  projectConfig={projectConfig || {} as any}
                  onDirectionSelected={handleDirectionSelection}
                />
                {projectConfig && (
                  <div className="border-t border-white/5 pt-24">
                    <Analyzer 
                        projectConfig={projectConfig} 
                        content={analyzerContent}
                        onContentChange={setAnalyzerContent}
                        onDirectionSelected={handleDirectionSelection} 
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === TabType.SCRIPTING && (
              projectConfig && selectedDirection ? (
                <ScriptDeveloper 
                  direction={selectedDirection.dir} 
                  config={projectConfig} 
                  draft={selectedDirection.draft}
                  script={scriptContent}
                  onScriptChange={setScriptContent}
                  onFinalize={handleFinalizeScript}
                />
              ) : <EmptyState onNav={() => setActiveTab(TabType.RESEARCH)} label="Return to Lab" />
            )}

            {activeTab === TabType.VISUALS && (
              (projectConfig && (finalScript || scriptContent))
                ? <VisualsSuite config={projectConfig} script={finalScript || scriptContent} />
                : <EmptyState onNav={() => setActiveTab(TabType.SCRIPTING)} label="Return to Scripting" />
            )}

            {activeTab === TabType.PUBLISHING && (
              projectConfig ? <DualReview config={projectConfig} /> : <EmptyState onNav={() => setActiveTab(TabType.SETUP)} label="Setup Session" />
            )}

            {activeTab === TabType.ANALYTICS && (
              projectConfig ? (
                <div className="space-y-32">
                  <VideoEditor />
                  <div className="border-t border-white/5 pt-24">
                    <LearningHub />
                  </div>
                </div>
              ) : <EmptyState onNav={() => setActiveTab(TabType.SETUP)} label="Setup Session" />
            )}

            {activeTab === TabType.GROWTH && (
              projectConfig ? <GrowthSuite config={projectConfig} /> : <EmptyState onNav={() => setActiveTab(TabType.SETUP)} label="Setup Session" />
            )}
            
            {activeTab === TabType.CALENDAR && (
              projectConfig ? <CalendarSuite config={projectConfig} /> : <EmptyState onNav={() => setActiveTab(TabType.SETUP)} label="Setup Session" />
            )}
            {activeTab === TabType.LIVE_VOICE && <LiveConversation />}
            
            {activeTab === TabType.AGENT_MANAGEMENT && (
              <div className="space-y-8">
                {!showAgentForm && !selectedAgent && (
                  <AgentList 
                    agents={agents} 
                    onNewAgent={() => { setEditingAgent(null); setShowAgentForm(true); }}
                    onSelectAgent={setSelectedAgent}
                    onEditAgent={(agent) => { setEditingAgent(agent); setShowAgentForm(true); }}
                  />
                )}
                
                {showAgentForm && (
                  <AgentForm 
                    initialData={editingAgent || undefined}
                    onSubmit={async (data) => {
                      if (editingAgent) {
                        const updatedAgent = { ...editingAgent, ...data, updatedAt: new Date().toISOString() };
                        const updatedAgents = agents.map(a => 
                          a.id === editingAgent.id ? updatedAgent : a
                        );
                        setAgents(updatedAgents);
                        // Persist to backend
                        try {
                          const { API_URL } = await import('./services/config');
                          await fetch(`${API_URL}/api/agents`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedAgent)
                          });
                        } catch (e) { console.error('Failed to persist agent update:', e); }
                      } else {
                        const newAgent: AgentProfile = {
                          id: Math.random().toString(36).substr(2, 9),
                          userId: 'user123',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          isActive: false,
                          ...data
                        };
                        setAgents([...agents, newAgent]);
                        // Persist to backend
                        try {
                          const { API_URL } = await import('./services/config');
                          await fetch(`${API_URL}/api/agents`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newAgent)
                          });
                        } catch (e) { console.error('Failed to persist new agent:', e); }
                      }
                      setShowAgentForm(false);
                      setEditingAgent(null);
                    }}
                    onCancel={() => {
                      setShowAgentForm(false);
                      setEditingAgent(null);
                    }}
                  />
                )}
                
                {selectedAgent && (
                  <AgentDetail 
                    agent={selectedAgent}
                    onBack={() => setSelectedAgent(null)}
                    onEdit={() => { setEditingAgent(selectedAgent); setShowAgentForm(true); }}
                    onDeploy={async () => {
                      try {
                        const { deployAgent } = await import('./services/deploymentService');
                        const result = await deployAgent(selectedAgent.id, 1);
                        if (result.success) {
                          setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, isActive: true } : a));
                          setSelectedAgent({ ...selectedAgent, isActive: true });
                        }
                      } catch (e) { console.error('Deploy failed:', e); }
                    }}
                    onUndeploy={async () => {
                      try {
                        const { stopDeployment } = await import('./services/deploymentService');
                        const result = await stopDeployment(selectedAgent.id);
                        if (result.success) {
                          setAgents(prev => prev.map(a => a.id === selectedAgent.id ? { ...a, isActive: false } : a));
                          setSelectedAgent({ ...selectedAgent, isActive: false });
                        }
                      } catch (e) { console.error('Undeploy failed:', e); }
                    }}
                    onTrain={async () => {
                      try {
                        const { startTraining } = await import('./services/trainingService');
                        await startTraining(selectedAgent.id, {});
                      } catch (e) { console.error('Training failed:', e); }
                    }}
                    onRetrain={async () => {
                      try {
                        const { startTraining } = await import('./services/trainingService');
                        await startTraining(selectedAgent.id, { isRetrain: true });
                      } catch (e) { console.error('Retrain failed:', e); }
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </main>

        <CostMonitor />
        {showPrivacy && <PrivacyControls onClose={() => setShowPrivacy(false)} onPurge={startNewProject} />}
        {showOnboarding && <OnboardingTutorial onClose={handleOnboardingComplete} />}
      </div>
      )}
    </NotificationProvider>
  );
};

const EmptyState = ({ onNav, label }: { onNav: () => void, label: string }) => (
  <div className="h-[70vh] flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 text-[#8A8A8E]">
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight-linear">Workspace Locked</h3>
    <p className="text-[#8A8A8E] max-w-sm mb-10 text-[15px] font-medium leading-relaxed">Initialize parameters to access this strategic module.</p>
    <Button variant="primary" onClick={onNav} className="px-10 py-2.5">
      {label}
    </Button>
  </div>
);

export default App;