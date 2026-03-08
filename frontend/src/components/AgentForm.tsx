import React, { useState, useEffect } from 'react';
import { AgentProfile, AgentStatus, TaskType, PersonaConfig, TrainingConfig, DataSource } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';

interface AgentFormProps {
  initialData?: AgentProfile;
  onSubmit: (data: Partial<AgentProfile>) => Promise<void>;
  onCancel: () => void;
}

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { 
    value: TaskType.Script_Analysis,
    label: 'Script Analysis', 
    description: 'Analyze scripts for traction patterns and improvement opportunities' 
  },
  { 
    value: TaskType.Emotional_Alignment,
    label: 'Emotional Alignment', 
    description: 'Match emotional tone to audience preferences and content context' 
  },
  { 
    value: TaskType.Content_Generation,
    label: 'Content Generation', 
    description: 'Generate high-performing content based on proven patterns' 
  },
  { 
    value: TaskType.Performance_Analysis,
    label: 'Performance Analysis', 
    description: 'Analyze performance metrics and provide actionable insights' 
  },
  { 
    value: TaskType.Growth_Tactics,
    label: 'Growth Tactics', 
    description: 'Develop growth strategies and engagement optimization' 
  },
  { 
    value: TaskType.Thumbnail_Creation,
    label: 'Thumbnail Creation', 
    description: 'Create compelling thumbnails optimized for click-through rates' 
  }
];

const STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: AgentStatus.Draft, label: 'Draft' },
  { value: AgentStatus.Training, label: 'Training' },
  { value: AgentStatus.Ready, label: 'Ready' },
  { value: AgentStatus.Failed, label: 'Failed' },
  { value: AgentStatus.Retraining, label: 'Retraining' }
];

const RESPONSE_LENGTHS = ['short', 'medium', 'long'] as const;

const DATA_SOURCES: { value: DataSource; label: string; description: string }[] = [
  { 
    value: DataSource.Public_Dataset,
    label: 'Public Dataset', 
    description: 'Use curated public datasets for foundational training' 
  },
  { 
    value: DataSource.Creator_History,
    label: 'Creator History', 
    description: 'Train on your published content and performance data' 
  },
  { 
    value: DataSource.Custom_Upload,
    label: 'Custom Upload', 
    description: 'Upload your own training data for specialized training' 
  },
  { 
    value: DataSource.Hybrid_Mode,
    label: 'Hybrid Mode', 
    description: 'Combine multiple data sources for balanced training' 
  }
];

export const AgentForm: React.FC<AgentFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [taskType, setTaskType] = useState<TaskType>(initialData?.taskType || TaskType.Script_Analysis);
  const [status, setStatus] = useState<AgentStatus>(initialData?.status || AgentStatus.Draft);
  const [version, setVersion] = useState(initialData?.version || 1);
  const [trainedModelId, setTrainedModelId] = useState(initialData?.trainedModelId || '');
  
  const [persona, setPersona] = useState<PersonaConfig>(
    initialData?.persona || {
      tone: 'professional',
      style: 'analytical',
      responseLength: 'medium',
      domainKnowledge: []
    }
  );
  
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(
    initialData?.trainingConfig || {
      dataSources: [DataSource.Creator_History],
      weighting: [1.0],
      minConfidenceThreshold: 0.8,
      maxTokens: 2048
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (initialData) {
      setVersion(initialData.version);
      setStatus(initialData.status);
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Agent name is required';
    } else if (name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    } else if (description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    if (!taskType) {
      newErrors.taskType = 'Task type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('error', 'Please fix the errors in the form');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        id: initialData?.id,
        name,
        description,
        taskType,
        status,
        version,
        trainedModelId: trainedModelId || undefined,
        persona,
        trainingConfig,
        createdAt: initialData?.createdAt,
        updatedAt: new Date().toISOString()
      });
      
      showNotification('success', initialData ? 'Agent updated successfully' : 'Agent created successfully');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to save agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDataSourceToggle = (source: DataSource) => {
    const currentSources = trainingConfig.dataSources;
    const currentIndex = currentSources.indexOf(source);
    
    let newSources, newWeighting;
    
    if (currentIndex === -1) {
      // Add source
      newSources = [...currentSources, source];
      newWeighting = [...trainingConfig.weighting, 1.0];
    } else {
      // Remove source
      newSources = currentSources.filter((_, i) => i !== currentIndex);
      newWeighting = trainingConfig.weighting.filter((_, i) => i !== currentIndex);
    }
    
    setTrainingConfig(prev => ({
      ...prev,
      dataSources: newSources,
      weighting: newWeighting
    }));
  };

  const handleWeightChange = (index: number, value: number) => {
    const newWeighting = [...trainingConfig.weighting];
    newWeighting[index] = Math.max(0.1, Math.min(1.0, value));
    setTrainingConfig(prev => ({ ...prev, weighting: newWeighting }));
  };

  const getTaskTypeHelp = (type: TaskType): string => {
    const helpTexts: Record<TaskType, string> = {
      Script_Analysis: 'Best for analyzing script structure, hook strength, and retention patterns',
      Emotional_Alignment: 'Best for matching emotional tone to audience preferences',
      Content_Generation: 'Best for generating new content based on proven patterns',
      Performance_Analysis: 'Best for analyzing performance metrics and providing insights',
      Growth_Tactics: 'Best for developing growth strategies and engagement tactics',
      Thumbnail_Creation: 'Best for creating compelling thumbnails optimized for CTR'
    };
    return helpTexts[type] || '';
  };

  return (
    <div className="max-w-4xl mx-auto py-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="hero-heading text-3xl font-bold text-white tracking-tight">
            {initialData ? 'Edit Agent Profile' : 'Create New Agent'}
          </h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium">
            {initialData 
              ? 'Update your agent configuration and training parameters' 
              : 'Configure your fine-tuned AI agent for specialized content creation'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">1</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Basic Information</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest flex items-center gap-2">
                Agent Name
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Script Analyzer Pro"
                className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${errors.name ? 'border-red-500' : 'border-white/10'} text-white placeholder-[#8A8A8E] focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent outline-none transition-all`}
              />
              {errors.name && <p className="text-red-500 text-[11px]">{errors.name}</p>}
              <p className="text-[11px] text-[#8A8A8E]">Unique identifier for your agent profile</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest flex items-center gap-2">
                Description
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your agent's purpose and capabilities..."
                rows={3}
                className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${errors.description ? 'border-red-500' : 'border-white/10'} text-white placeholder-[#8A8A8E] focus:ring-2 focus:ring-[#5E6AD2] focus:border-transparent outline-none transition-all`}
              />
              {errors.description && <p className="text-red-500 text-[11px]">{errors.description}</p>}
              <p className="text-[11px] text-[#8A8A8E]">Brief overview of what this agent does</p>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">2</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest flex items-center gap-2">
                Task Type
                <span className="text-red-500">*</span>
              </label>
              
              <div className="space-y-2">
                {TASK_TYPES.map((task) => (
                  <button
                    key={task.value}
                    type="button"
                    onClick={() => setTaskType(task.value)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      taskType === task.value
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold text-[13px] ${taskType === task.value ? 'text-white' : 'text-[#8A8A8E]'}`}>
                        {task.label}
                      </span>
                      {taskType === task.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8A8A8E]">{task.description}</p>
                  </button>
                ))}
              </div>
              
              <div className="p-4 bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 rounded-lg">
                <p className="text-[11px] text-[#5E6AD2]">
                  <span className="font-bold">Tip:</span> {getTaskTypeHelp(taskType)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((statusOption) => (
                  <button
                    key={statusOption.value}
                    type="button"
                    onClick={() => setStatus(statusOption.value)}
                    className={`px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                      status === statusOption.value
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-[#8A8A8E] hover:bg-white/10'
                    }`}
                  >
                    {statusOption.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Persona Configuration */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">3</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Persona Configuration</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Tone</label>
              <select
                value={persona.tone}
                onChange={(e) => setPersona({ ...persona, tone: e.target.value as string })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#5E6AD2] outline-none"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="analytical">Analytical</option>
                <option value="empathetic">Empathetic</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Style</label>
              <select
                value={persona.style}
                onChange={(e) => setPersona({ ...persona, style: e.target.value as string })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#5E6AD2] outline-none"
              >
                <option value="analytical">Analytical</option>
                <option value="storytelling">Storytelling</option>
                <option value="instructional">Instructional</option>
                <option value="conversational">Conversational</option>
                <option value="persuasive">Persuasive</option>
                <option value="humorous">Humorous</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Response Length</label>
              <div className="grid grid-cols-3 gap-2">
                {RESPONSE_LENGTHS.map((length) => (
                  <button
                    key={length}
                    type="button"
                    onClick={() => setPersona({ ...persona, responseLength: length })}
                    className={`py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                      persona.responseLength === length
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-[#8A8A8E] hover:bg-white/10'
                    }`}
                  >
                    {length}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Domain Knowledge</label>
            <div className="flex flex-wrap gap-2">
              {['scriptwriting', 'video editing', 'analytics', 'growth', 'emotional intelligence'].map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => {
                    const current = persona.domainKnowledge;
                    if (current.includes(domain)) {
                      setPersona({ ...persona, domainKnowledge: current.filter(d => d !== domain) });
                    } else {
                      setPersona({ ...persona, domainKnowledge: [...current, domain] });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                    persona.domainKnowledge.includes(domain)
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/5 text-[#8A8A8E] hover:bg-white/10'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8A8A8E]">Select relevant domains for your agent's expertise</p>
          </div>
        </div>

        {/* Training Configuration */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">4</div>
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Training Configuration</h3>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Data Sources</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATA_SOURCES.map((source) => {
                const isSelected = trainingConfig.dataSources.includes(source.value);
                const sourceIndex = trainingConfig.dataSources.indexOf(source.value);
                const weight = sourceIndex >= 0 ? trainingConfig.weighting[sourceIndex] : 1.0;
                
                return (
                  <div
                    key={source.value}
                    className={`p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleDataSourceToggle(source.value)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-white border-white text-black'
                            : 'border-white/20 text-transparent hover:border-white/40'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      
                      <div className="flex-1">
                        <p className={`font-bold text-[13px] ${isSelected ? 'text-white' : 'text-[#8A8A8E]'}`}>
                          {source.label}
                        </p>
                        <p className="text-[11px] text-[#8A8A8E]">{source.description}</p>
                        
                        {isSelected && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-[#8A8A8E] mb-1">
                              <span>Weight</span>
                              <span>{(weight * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={weight}
                              onChange={(e) => handleWeightChange(sourceIndex, parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5E6AD2]"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Min Confidence Threshold</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={trainingConfig.minConfidenceThreshold}
                  onChange={(e) => setTrainingConfig({
                    ...trainingConfig,
                    minConfidenceThreshold: parseFloat(e.target.value)
                  })}
                  className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#5E6AD2]"
                />
                <span className="text-white font-bold text-[13px] w-16 text-right">
                  {(trainingConfig.minConfidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[11px] text-[#8A8A8E]">Minimum confidence required for agent responses</p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Max Tokens</label>
              <input
                type="number"
                min="256"
                max="8192"
                step="256"
                value={trainingConfig.maxTokens}
                onChange={(e) => setTrainingConfig({
                  ...trainingConfig,
                  maxTokens: parseInt(e.target.value)
                })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-[#5E6AD2] outline-none"
              />
              <p className="text-[11px] text-[#8A8A8E]">Maximum response length in tokens</p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/5">
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit as any}
            loading={isSubmitting}
            className="px-8"
          >
            {initialData ? 'Update Agent' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </div>
  );
};
