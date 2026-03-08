import React, { useState } from 'react';
import { ProjectConfig } from '../types';
import { generateCalendarPlan } from '../services/awsAIService';
import { Button } from './Button';

interface CalendarSuiteProps {
  config: ProjectConfig | null;
}

export const CalendarSuite: React.FC<CalendarSuiteProps> = ({ config }) => {
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePlan = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const result = await generateCalendarPlan(config);
      setPlan(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-10">
        <header className="space-y-4">
          <h2 className="text-4xl font-bold text-white tracking-tight italic">Rollout Schedule</h2>
          <p className="text-[#8A8A8E] text-[15px] font-medium leading-relaxed max-w-xl tracking-tight-linear">
            Plan your production sequence for maximum audience retention and platform synergy.
          </p>
        </header>

        {config ? (
          <div className="space-y-12">
             <div className="flex items-center justify-between linear-card p-8 border-l-2 border-white/40 bg-white/[0.01]">
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-[#8A8A8E] uppercase tracking-widest">Environment</p>
                 <p className="text-xl font-bold text-white tracking-tight-linear">{config.platform} Deployment</p>
               </div>
               <Button onClick={handlePlan} loading={loading} className="px-10">Generate plan</Button>
            </div>

            <div className="space-y-2">
              {plan.length > 0 ? plan.map((item, i) => (
                <div key={i} className="flex gap-8 p-6 linear-card items-center hover:bg-white/[0.02] border-white/5">
                   <div className="w-16 text-center flex-shrink-0">
                     <span className="block text-[11px] font-bold text-white uppercase tracking-widest opacity-40">{item.day}</span>
                   </div>
                   <div className="h-8 w-px bg-white/10"></div>
                   <div className="flex-1 flex items-center gap-6">
                     <span className="text-[10px] bg-white/5 text-white px-2 py-1 rounded-sm uppercase font-bold tracking-widest border border-white/10">{item.type}</span>
                     <p className="text-[15px] font-bold text-white tracking-tight-linear italic">{item.topic}</p>
                   </div>
                </div>
              )) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                   <p className="text-[#8A8A8E] font-medium italic">Execute planning to establish your rollout cadence.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-24 text-[#8A8A8E] italic font-medium">
            Configuration establishes the foundation for Scheduling.
          </div>
        )}
      </div>
    </div>
  );
};