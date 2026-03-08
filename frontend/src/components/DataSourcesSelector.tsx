import React from 'react';
import { DataSource, TrainingConfig } from '../types';
import { Button } from './Button';

interface DataSourcesSelectorProps {
  trainingConfig: TrainingConfig;
  onConfigChange: (config: TrainingConfig) => void;
  dataSourcesInfo?: {
    publicDataset?: { count: number; qualityScore: number; sizeBytes: number };
    creatorHistory?: { count: number; qualityScore: number; sizeBytes: number };
    customUpload?: { count: number; qualityScore: number; sizeBytes: number };
  };
  showPreview?: boolean;
}

const DATA_SOURCES: { value: DataSource; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: DataSource.Public_Dataset,
    label: 'Public Dataset', 
    description: 'Use curated public datasets for foundational training',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
  },
  { 
    value: DataSource.Creator_History,
    label: 'Creator History', 
    description: 'Train on your published content and performance data',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  },
  { 
    value: DataSource.Custom_Upload,
    label: 'Custom Upload', 
    description: 'Upload your own training data for specialized training',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
  },
  { 
    value: DataSource.Hybrid_Mode,
    label: 'Hybrid Mode', 
    description: 'Combine multiple data sources for balanced training',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
  }
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DataSourcesSelector: React.FC<DataSourcesSelectorProps> = ({
  trainingConfig,
  onConfigChange,
  dataSourcesInfo,
  showPreview = true
}) => {
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
    
    onConfigChange({
      ...trainingConfig,
      dataSources: newSources,
      weighting: newWeighting
    });
  };

  const handleWeightChange = (index: number, value: number) => {
    const newWeighting = [...trainingConfig.weighting];
    newWeighting[index] = Math.max(0.1, Math.min(1.0, value));
    onConfigChange({
      ...trainingConfig,
      weighting: newWeighting
    });
  };

  const getTotalWeight = (): number => {
    return trainingConfig.dataSources.reduce((sum, _, index) => sum + trainingConfig.weighting[index], 0);
  };

  const getDataSourceInfo = (source: DataSource) => {
    switch (source) {
      case DataSource.Public_Dataset:
        return dataSourcesInfo?.publicDataset;
      case DataSource.Creator_History:
        return dataSourcesInfo?.creatorHistory;
      case DataSource.Custom_Upload:
        return dataSourcesInfo?.customUpload;
      default:
        return undefined;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="hero-heading text-3xl font-bold text-white tracking-tight">Data Sources</h2>
          <p className="text-[15px] text-[#8A8A8E] font-medium">
            Select and configure training data sources for your agent
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#8A8A8E] uppercase tracking-widest">Total Weight</span>
          <p className="text-[13px] font-bold text-white">{getTotalWeight().toFixed(1)}</p>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_SOURCES.map((source) => {
          const isSelected = trainingConfig.dataSources.includes(source.value);
          const sourceIndex = trainingConfig.dataSources.indexOf(source.value);
          const weight = sourceIndex >= 0 ? trainingConfig.weighting[sourceIndex] : 1.0;
          const info = getDataSourceInfo(source.value);
          
          return (
            <div
              key={source.value}
              className={`p-5 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => handleDataSourceToggle(source.value)}
                  className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-white border-white text-black'
                      : 'border-white/20 text-transparent hover:border-white/40'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${isSelected ? 'text-white' : 'text-[#8A8A8E]'}`}>
                      {source.icon}
                    </div>
                    <div>
                      <p className={`font-bold text-[13px] ${isSelected ? 'text-white' : 'text-[#8A8A8E]'}`}>
                        {source.label}
                      </p>
                      <p className="text-[11px] text-[#8A8A8E]">{source.description}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="space-y-3 pt-3 border-t border-white/5">
                      {/* Weight Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-[#8A8A8E]">
                          <span className="font-medium">Weight</span>
                          <span className="font-bold">{(weight * 100).toFixed(0)}%</span>
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

                      {/* Data Source Info */}
                      {info && showPreview && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 bg-white/5 rounded-lg">
                            <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest block mb-1">Count</span>
                            <span className="text-[11px] font-bold text-white">{info.count.toLocaleString()}</span>
                          </div>
                          <div className="p-2 bg-white/5 rounded-lg">
                            <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest block mb-1">Quality</span>
                            <span className="text-[11px] font-bold text-emerald-400">{(info.qualityScore * 100).toFixed(0)}%</span>
                          </div>
                          <div className="p-2 bg-white/5 rounded-lg">
                            <span className="text-[9px] text-[#8A8A8E] uppercase tracking-widest block mb-1">Size</span>
                            <span className="text-[11px] font-bold text-white">{formatBytes(info.sizeBytes)}</span>
                          </div>
                        </div>
                      )}

                      {/* Custom Upload Preview */}
                      {source.value === 'Custom_Upload' && (
                        <div className="p-3 bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 rounded-lg">
                          <p className="text-[11px] text-[#5E6AD2]">
                            <span className="font-bold">Tip:</span> Upload JSON or CSV files with your training data
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Feedback */}
      {trainingConfig.dataSources.length === 0 && (
        <div className="p-4 bg-[#F5A623]/10 border border-[#F5A623]/20 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F5A623] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[11px] font-bold text-[#F5A623]">No data sources selected</p>
              <p className="text-[11px] text-[#8A8A8E] mt-1">
                Select at least one data source to train your agent. For best results, use multiple sources in Hybrid Mode.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quality Score Summary */}
      {trainingConfig.dataSources.length > 0 && (
        <div className="linear-card p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8A8A8E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Data Quality Summary</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trainingConfig.dataSources.map((source, index) => {
              const info = getDataSourceInfo(source);
              if (!info) return null;
              
              return (
                <div key={source} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      info.qualityScore >= 0.9 ? 'bg-emerald-500' :
                      info.qualityScore >= 0.7 ? 'bg-[#F5A623]' : 'bg-red-500'
                    }`}></div>
                    <span className="text-[#8A8A8E]">{source.replace('_', ' ')}</span>
                  </div>
                  <span className={`font-bold ${
                    info.qualityScore >= 0.9 ? 'text-emerald-400' :
                    info.qualityScore >= 0.7 ? 'text-[#F5A623]' : 'text-red-400'
                  }`}>
                    {(info.qualityScore * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
