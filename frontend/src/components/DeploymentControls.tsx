import React, { useState } from 'react';
import { AgentStatus } from '../types';
import { Button } from './Button';
import { useNotification } from './Notification';
import { deployAgent, stopDeployment, DeploymentStatus as DeploymentServiceStatus } from '../services/deploymentService';

interface DeploymentControlsProps {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  version: number;
  onStatusChange?: (newStatus: DeploymentServiceStatus | AgentStatus) => void;
  className?: string;
}

export const DeploymentControls: React.FC<DeploymentControlsProps> = ({ 
  agentId, 
  agentName, 
  status, 
  version,
  onStatusChange,
  className = ''
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isUndeploying, setIsUndeploying] = useState(false);
  const { showNotification } = useNotification();

  const handleDeploy = async () => {
    if (status !== AgentStatus.Ready) {
      showNotification('error', 'Agent must be ready before deployment');
      return;
    }

    setIsDeploying(true);

    try {
      const result = await deployAgent(agentId, version);
      
      if (result.error) {
        showNotification('error', result.error);
        return;
      }

      showNotification('success', 'Deployment initiated successfully');
      if (result.deployment) {
        onStatusChange?.(result.deployment.status);
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUndeploy = async () => {
    setIsUndeploying(true);

    try {
      const result = await stopDeployment(agentId);
      
      if (result.error) {
        showNotification('error', result.error);
        return;
      }

      showNotification('success', 'Agent undeployed successfully');
      onStatusChange?.(DeploymentServiceStatus.Stopped);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Undeployment failed');
    } finally {
      setIsUndeploying(false);
    }
  };

  const canDeploy = status === AgentStatus.Ready;
  const canUndeploy = status === AgentStatus.Ready;

  return (
    <div className={`linear-card p-6 border border-white/5 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-[10px] font-bold">3</div>
        <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Deployment Controls</h3>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#8A8A8E]">Current Deployment Status</span>
            <span className={`text-[11px] font-bold ${
              status === AgentStatus.Ready ? 'text-emerald-500' : 
              status === AgentStatus.Training ? 'text-[#5E6AD2]' : 
              status === AgentStatus.Failed ? 'text-red-500' : 
              'text-[#8A8A8E]'
            }`}>
              {status}
            </span>
          </div>
          
          <p className="text-[10px] text-[#8A8A8E] mb-4">
            {status === AgentStatus.Ready 
              ? 'Agent is ready for deployment. Deploy to make it available for inference requests.'
              : status === AgentStatus.Training
              ? 'Agent is currently training. Wait for training to complete before deployment.'
              : status === AgentStatus.Failed
              ? 'Agent deployment failed. Check configuration and retry.'
              : 'Agent is not ready for deployment.'}
          </p>

          <div className="flex gap-3">
            {canDeploy && (
              <Button 
                variant="primary" 
                onClick={handleDeploy}
                loading={isDeploying}
                className="flex-1 py-2.5"
              >
                Deploy Agent
              </Button>
            )}

            {canUndeploy && (
              <Button 
                variant="danger" 
                onClick={handleUndeploy}
                loading={isUndeploying}
                className="flex-1 py-2.5"
              >
                Undeploy Agent
              </Button>
            )}

            {!canDeploy && !canUndeploy && (
              <div className="flex-1 flex items-center justify-center text-[10px] text-[#8A8A8E]">
                Deployment not available for current status
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-[#8A8A8E] uppercase tracking-widest">Validation Rules</p>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-[10px] text-[#8A8A8E]">
              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${
                canDeploy ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#8A8A8E]/20 text-[#8A8A8E]'
              }`}>
                {canDeploy && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>}
              </div>
              <span>Agent must have status "Ready" for deployment</span>
            </div>
            
            <div className="flex items-start gap-2 text-[10px] text-[#8A8A8E]">
              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center ${
                canUndeploy ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#8A8A8E]/20 text-[#8A8A8E]'
              }`}>
                {canUndeploy && <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>}
              </div>
              <span>Deployed agents can be undeployed</span>
            </div>
            
            <div className="flex items-start gap-2 text-[10px] text-[#8A8A8E]">
              <div className="mt-0.5 w-4 h-4 rounded flex items-center justify-center bg-[#8A8A8E]/20 text-[#8A8A8E]">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Deployment may take a few minutes to complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
