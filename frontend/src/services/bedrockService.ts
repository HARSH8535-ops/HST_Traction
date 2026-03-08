import { API_URL } from './config';

export interface BedrockConfig {
  modelId?: string;
  taskType?: string;
  contentType?: string;
  accept?: string;
}

export interface InferenceRequest {
  prompt: string;
  agentId: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

export interface InferenceResponse {
  output: string;
  modelId: string;
  fallback: boolean;
}

export interface FallbackEvent {
  agentId: string;
  timestamp: string;
  reason: string;
  fallbackToModel: string;
}

export enum DeploymentStatus {
  Deployed = 'Deployed',
  Deploying = 'Deploying',
  Failed = 'Failed',
  Undeployed = 'Undeployed'
}

/**
 * Calls the SageMaker-backed Lambda API for text generation.
 * The backend endpoint is /api/bedrock but internally uses SageMaker Flan-T5.
 */
export async function invokeBedrock(
  prompt: string,
  config: BedrockConfig
): Promise<string> {
  const taskType = config.taskType || "default";

  try {
    const response = await fetch(`${API_URL}/api/bedrock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        taskType,
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`AI backend error (${response.status}):`, errorText);
      throw new Error(`AI backend error: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error: any) {
    console.error('AI service call failed:', error);
    throw error;
  }
}

export async function invokeBedrockWithStream(
  prompt: string,
  config: BedrockConfig,
  onChunk: (chunk: string) => void
): Promise<void> {
  // Backend doesn't support streaming yet; fallback to standard invoke
  const result = await invokeBedrock(prompt, config);
  onChunk(result);
}

export function getModelForTask(task: string): string {
  // Model selection is handled server-side by the Lambda handler.
  // This mapping is kept for interface compatibility but is not used in API calls.
  return 'sagemaker-flan-t5';
}