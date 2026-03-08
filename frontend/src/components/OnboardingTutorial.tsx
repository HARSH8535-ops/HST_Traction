import React, { useState, useEffect } from 'react';
import { AgentProfile, TaskType, PersonaConfig, TrainingConfig, DataSource } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  examples?: ExampleItem[];
  bestPractices?: string[];
}

interface ExampleItem {
  title: string;
  description: string;
  taskType: TaskType;
  persona: PersonaConfig;
  trainingConfig: TrainingConfig;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Create Your First Agent',
    description: 'Start by creating an agent profile with a clear purpose and description.',
    icon: 'M12 4v16m8-8H4'
  },
  {
    id: 2,
    title: 'Choose the Right Task Type',
    description: 'Select a task type that matches your content creation goals.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  {
    id: 3,
    title: 'Configure Agent Persona',
    description: 'Define how your agent should sound and respond to your audience.',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  },
  {
    id: 4,
    title: 'Select Training Data',
    description: 'Choose data sources that will help your agent learn effectively.',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    id: 5,
    title: 'Train and Deploy',
    description: 'Train your agent and deploy it to start using its specialized capabilities.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
];

const EXAMPLE_AGENTS: ExampleItem[] = [
  {
    title: 'Script Analyzer Pro',
    description: 'Analyzes scripts for traction patterns and improvement opportunities',
    taskType: TaskType.Script_Analysis,
    persona: {
      tone: 'professional',
      style: 'analytical',
      responseLength: 'medium',
      domainKnowledge: ['scriptwriting', 'analytics']
    },
    trainingConfig: {
      dataSources: [DataSource.Creator_History, DataSource.Public_Dataset],
      weighting: [0.7, 0.3],
      minConfidenceThreshold: 0.85,
      maxTokens: 2048
    }
  },
  {
    title: 'Emotional Alignment Expert',
    description: 'Matches emotional tone to audience preferences and content context',
    taskType: TaskType.Emotional_Alignment,
    persona: {
      tone: 'empathetic',
      style: 'storytelling',
      responseLength: 'medium',
      domainKnowledge: ['emotional intelligence', 'psychology']
    },
    trainingConfig: {
      dataSources: [DataSource.Creator_History],
      weighting: [1.0],
      minConfidenceThreshold: 0.9,
      maxTokens: 1536
    }
  },
  {
    title: 'Content Generation Assistant',
    description: 'Generates high-performing content based on proven patterns',
    taskType: TaskType.Content_Generation,
    persona: {
      tone: 'enthusiastic',
      style: 'conversational',
      responseLength: 'long',
      domainKnowledge: ['content creation', 'social media']
    },
    trainingConfig: {
      dataSources: [DataSource.Creator_History, DataSource.Public_Dataset],
      weighting: [0.6, 0.4],
      minConfidenceThreshold: 0.8,
      maxTokens: 3072
    }
  },
  {
    title: 'Growth Tactics Specialist',
    description: 'Develops growth strategies and engagement optimization tactics',
    taskType: TaskType.Growth_Tactics,
    persona: {
      tone: 'authoritative',
      style: 'instructional',
      responseLength: 'short',
      domainKnowledge: ['growth', 'analytics', 'strategy']
    },
    trainingConfig: {
      dataSources: [DataSource.Creator_History, DataSource.Public_Dataset],
      weighting: [0.8, 0.2],
      minConfidenceThreshold: 0.88,
      maxTokens: 1024
    }
  }
];

const BEST_PRACTICES = [
  'Start with a clear, specific purpose for your agent',
  'Use Creator_History data for personalized training',
  'Set confidence thresholds based on your accuracy requirements',
  'Test your agent with sample inputs before full deployment',
  'Monitor performance metrics and retrain periodically'
];

export const OnboardingTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const [showBestPractices, setShowBestPractices] = useState(false);
  const { showNotification } = useNotification();

  const currentTutorialStep = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      showNotification('success', 'Onboarding complete! You\'re ready to create your first agent.');
      onClose();
    }
  };

  const handleSkip = () => {
    showNotification('info', 'You can always revisit the tutorial from the help menu.');
    onClose();
  };

  const handleExampleClick = (example: ExampleItem) => {
    showNotification('success', `Loaded example: ${example.title}`);
    // In a real implementation, this would populate the AgentForm with the example data
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-[85vh] bg-[#0D0D0D] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#0D0D0D] to-[#131313]">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Fine-Tuned AI Agent Onboarding</h2>
            <p className="text-[13px] text-[#8A8A8E]">Step {currentStep + 1} of {TUTORIAL_STEPS.length}</p>
          </div>
          <button
            onClick={handleSkip}
            className="text-[11px] font-bold text-[#8A8A8E] hover:text-white uppercase tracking-widest transition-colors"
          >
            Skip Tutorial
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 py-4 bg-[#0D0D0D]">
          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    index <= currentStep
                      ? 'bg-[#5E6AD2] text-white'
                      : 'bg-white/5 text-[#8A8A8E]'
                  }`}
                >
                  {index < currentStep ? '✓' : step.id}
                </div>
                {index < TUTORIAL_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      index < currentStep ? 'bg-[#5E6AD2]' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Tutorial Content */}
            <div className="lg:col-span-2 space-y-8 animate-in fade-in duration-500">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#5E6AD2]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentTutorialStep.icon} />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-white tracking-tight">{currentTutorialStep.title}</h3>
                <p className="text-[15px] text-[#8A8A8E] font-medium leading-relaxed">
                  {currentTutorialStep.description}
                </p>
              </div>

              {/* Step-Specific Content */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                    <h4 className="font-bold text-white mb-3">What to include in your agent name:</h4>
                    <ul className="space-y-2 text-[13px] text-[#8A8A8E]">
                      <li className="flex items-start gap-2">
                        <span className="text-[#5E6AD2] mt-0.5">•</span>
                        <span>Be specific about the agent's purpose (e.g., "Script Analyzer Pro")</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#5E6AD2] mt-0.5">•</span>
                        <span>Avoid generic names like "AI Assistant" or "Helper"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#5E6AD2] mt-0.5">•</span>
                        <span>Include the task type or domain if helpful</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-6 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/10">
                    <h4 className="font-bold text-white mb-3">Common mistakes to avoid:</h4>
                    <ul className="space-y-2 text-[13px] text-[#8A8A8E]">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <span>Creating multiple agents with overlapping purposes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <span>Using vague descriptions that don't explain the agent's capabilities</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <span>Forgetting to update the description after creating the agent</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { type: 'Script_Analysis', desc: 'Best for analyzing script structure and traction patterns' },
                      { type: 'Emotional_Alignment', desc: 'Best for matching emotional tone to audience preferences' },
                      { type: 'Content_Generation', desc: 'Best for generating new content based on proven patterns' },
                      { type: 'Performance_Analysis', desc: 'Best for analyzing performance metrics and insights' },
                      { type: 'Growth_Tactics', desc: 'Best for developing growth strategies and engagement tactics' },
                      { type: 'Thumbnail_Creation', desc: 'Best for creating compelling thumbnails optimized for CTR' }
                    ].map((task) => (
                      <div key={task.type} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#5E6AD2]/30 transition-all">
                        <h4 className="font-bold text-white mb-1">{task.type.replace('_', ' ')}</h4>
                        <p className="text-[11px] text-[#8A8A8E]">{task.desc}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-6 rounded-xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                    <h4 className="font-bold text-white mb-2">Pro Tip:</h4>
                    <p className="text-[13px] text-[#8A8A8E]">
                      Choose one task type per agent for best results. Specialized agents perform better than general-purpose ones.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-bold text-white mb-3">Tone Options</h4>
                        <div className="flex flex-wrap gap-2">
                          {['Professional', 'Casual', 'Enthusiastic', 'Analytical', 'Empathetic', 'Authoritative'].map((tone) => (
                            <span key={tone} className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-[#8A8A8E]">
                              {tone}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-bold text-white mb-3">Style Options</h4>
                        <div className="flex flex-wrap gap-2">
                          {['Analytical', 'Storytelling', 'Instructional', 'Conversational', 'Persuasive', 'Humorous'].map((style) => (
                            <span key={style} className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-[#8A8A8E]">
                              {style}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6 rounded-xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                      <h4 className="font-bold text-white mb-3">Response Length Guidelines</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[11px] font-bold text-white mb-1">Short (256-512 tokens)</p>
                          <p className="text-[11px] text-[#8A8A8E]">Best for quick answers, summaries, and bullet points</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white mb-1">Medium (512-1536 tokens)</p>
                          <p className="text-[11px] text-[#8A8A8E]">Best for detailed explanations and analysis</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white mb-1">Long (1536-3072+ tokens)</p>
                          <p className="text-[11px] text-[#8A8A8E]">Best for comprehensive guides and detailed content</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { source: 'Creator_History', desc: 'Train on your published content for personalized training', bestFor: 'Personalized, creator-specific training' },
                      { source: 'Public_Dataset', desc: 'Use curated public datasets for foundational knowledge', bestFor: 'General knowledge and baseline training' },
                      { source: 'Custom_Upload', desc: 'Upload your own data for specialized training', bestFor: 'Unique data not in public datasets' },
                      { source: 'Hybrid_Mode', desc: 'Combine multiple data sources for balanced training', bestFor: 'Comprehensive training with diverse data' }
                    ].map((source) => (
                      <div key={source.source} className="p-5 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="font-bold text-white mb-2">{source.source.replace('_', ' ')}</h4>
                        <p className="text-[13px] text-[#8A8A8E] mb-3">{source.desc}</p>
                        <div className="p-3 rounded-lg bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                          <p className="text-[11px] text-[#5E6AD2] font-medium">Best for:</p>
                          <p className="text-[11px] text-[#8A8A8E]">{source.bestFor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-6 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/10">
                    <h4 className="font-bold text-white mb-3">Data Source Weighting Tips:</h4>
                    <ul className="space-y-2 text-[13px] text-[#8A8A8E]">
                      <li className="flex items-start gap-2">
                        <span className="text-[#F5A623] mt-0.5">•</span>
                        <span>Use Creator_History at 70-90% for personalized training</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#F5A623] mt-0.5">•</span>
                        <span>Add Public_Dataset at 10-30% for broader knowledge</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#F5A623] mt-0.5">•</span>
                        <span>Use Custom_Upload when you have unique, high-quality data</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-white mb-2">1. Start Training</h4>
                      <p className="text-[11px] text-[#8A8A8E]">Initiate training using your configured data sources</p>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-[#F5A623]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-white mb-2">2. Monitor Progress</h4>
                      <p className="text-[11px] text-[#8A8A8E]">Watch real-time progress and estimated completion time</p>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="font-bold text-white mb-2">3. Deploy Agent</h4>
                      <p className="text-[11px] text-[#8A8A8E]">Deploy when training completes and status is "Ready"</p>
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                    <h4 className="font-bold text-white mb-3">Training Time Estimates:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-bold text-white mb-1">Small Dataset (&lt;100 examples)</p>
                        <p className="text-[11px] text-[#8A8A8E]">15-30 minutes</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white mb-1">Medium Dataset (100-1000 examples)</p>
                        <p className="text-[11px] text-[#8A8A8E]">1-2 hours</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white mb-1">Large Dataset (1000+ examples)</p>
                        <p className="text-[11px] text-[#8A8A8E]">2-4 hours</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white mb-1">Very Large Dataset (10000+ examples)</p>
                        <p className="text-[11px] text-[#8A8A8E]">4-8 hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Examples Section */}
              {showExamples && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h4 className="font-bold text-white">Example Agent Configurations:</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {EXAMPLE_AGENTS.map((example, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleExampleClick(example)}
                        className="p-5 rounded-xl bg-white/5 border border-white/10 hover:border-[#5E6AD2]/30 hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-white group-hover:text-[#5E6AD2] transition-colors">{example.title}</h4>
                            <p className="text-[11px] text-[#8A8A8E] mt-1">{example.description}</p>
                          </div>
                          <div className="px-2 py-1 rounded bg-[#5E6AD2]/10 border border-[#5E6AD2]/20">
                            <span className="text-[10px] font-bold text-[#5E6AD2] uppercase tracking-widest">
                              {example.taskType.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-[10px] text-[#8A8A8E]">
                          <div>
                            <p className="font-bold text-[#8A8A8E] mb-1">Persona:</p>
                            <p>{example.persona.tone} • {example.persona.style}</p>
                          </div>
                          <div>
                            <p className="font-bold text-[#8A8A8E] mb-1">Training:</p>
                            <p>{example.trainingConfig.dataSources.join(', ')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best Practices Section */}
              {showBestPractices && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <h4 className="font-bold text-white">Best Practices:</h4>
                  <div className="space-y-3">
                    {BEST_PRACTICES.map((practice, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-5 h-5 rounded-full bg-[#5E6AD2]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-[#5E6AD2]">{idx + 1}</span>
                        </div>
                        <p className="text-[13px] text-[#8A8A8E] leading-relaxed">{practice}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="p-6 rounded-xl bg-[#0D0D0D] border border-white/5">
                <h4 className="font-bold text-white mb-4 text-[11px] uppercase tracking-widest">Quick Actions</h4>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group"
                  >
                    <span className="text-[11px] font-bold text-[#8A8A8E] group-hover:text-white transition-colors">
                      View Examples
                    </span>
                    <svg className="w-4 h-4 text-[#8A8A8E] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setShowBestPractices(!showBestPractices)}
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-between group"
                  >
                    <span className="text-[11px] font-bold text-[#8A8A8E] group-hover:text-white transition-colors">
                      Best Practices
                    </span>
                    <svg className="w-4 h-4 text-[#8A8A8E] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contextual Help */}
              <div className="p-6 rounded-xl bg-[#5E6AD2]/5 border border-[#5E6AD2]/10">
                <h4 className="font-bold text-[#5E6AD2] mb-3 text-[11px] uppercase tracking-widest">Need Help?</h4>
                <p className="text-[13px] text-[#8A8A8E] mb-4">
                  If you have questions about any step, check out our detailed documentation or reach out to our support team.
                </p>
                <Button variant="secondary" className="w-full py-2 text-[11px]">
                  View Documentation
                </Button>
              </div>

              {/* Progress Summary */}
              <div className="p-6 rounded-xl bg-[#0D0D0D] border border-white/5">
                <h4 className="font-bold text-white mb-4 text-[11px] uppercase tracking-widest">Your Progress</h4>
                <div className="space-y-3">
                  {TUTORIAL_STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          index <= currentStep ? 'bg-[#5E6AD2]' : 'bg-white/10'
                        }`}
                      />
                      <span className={`text-[11px] transition-colors ${
                        index <= currentStep ? 'text-white' : 'text-[#8A8A8E]'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/5 bg-[#0D0D0D] flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-[11px] font-bold text-[#8A8A8E] hover:text-white uppercase tracking-widest transition-colors"
          >
            Skip for Now
          </button>
          
          <div className="flex items-center gap-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-[#8A8A8E] hover:bg-white/10 hover:text-white transition-all"
              >
                Back
              </button>
            )}
            
            <Button
              onClick={handleNext}
              className="px-6 py-2.5"
            >
              {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next Step'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
