import React from 'react';
import { TabType } from '../types';

interface WorkflowStepperProps {
  currentTab: TabType;
  onTabSelect: (tab: TabType) => void;
  maxReachedStep: TabType;
}

const STEPS = [
  { id: TabType.SETUP, label: 'Strategy', icon: '1' },
  { id: TabType.RESEARCH, label: 'Research', icon: '2' },
  { id: TabType.SCRIPTING, label: 'Scripting', icon: '3' },
  { id: TabType.VISUALS, label: 'Visuals', icon: '4' },
  { id: TabType.PUBLISHING, label: 'Publishing', icon: '5' }
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentTab, onTabSelect, maxReachedStep }) => {
  const currentIdx = STEPS.findIndex(s => s.id === currentTab);
  const maxIdx = STEPS.findIndex(s => s.id === maxReachedStep);

  return (
    <div className="w-full overflow-x-auto pb-4 pt-2">
      <div className="flex items-center justify-between min-w-[600px] relative px-4 md:px-10">
        {/* Progress Line Background */}
        <div className="absolute left-4 right-4 md:left-10 md:right-10 top-5 h-0.5 bg-slate-800 -z-10"></div>
        {/* Progress Line Active */}
        <div 
          className="absolute left-4 md:left-10 top-5 h-0.5 bg-blue-600 -z-10 transition-all duration-500 ease-out"
          style={{ width: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 40px)` }}
        ></div>

        {STEPS.map((step, idx) => {
          const isActive = currentTab === step.id;
          const isCompleted = idx < currentIdx;
          const isAccessible = idx <= maxIdx;

          return (
            <button
              key={step.id}
              onClick={() => isAccessible && onTabSelect(step.id)}
              disabled={!isAccessible}
              className={`group flex flex-col items-center gap-2 relative transition-all duration-300 ${!isAccessible ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-100'}`}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 z-10 ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-110' 
                    : isCompleted 
                      ? 'bg-slate-900 border-blue-500 text-blue-500' 
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};