import type { Mode } from './types';

export interface ModelConfig {
  modelId: string;
  displayName: string;
  temperature: number;
  reason: string;
  fallbacks: string[];
}

const ROUTING: Record<Mode, ModelConfig> = {
  brainstorm: {
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B',
    temperature: 0.9,
    reason: 'Fast, creative, and energy-efficient for exploring ideas.',
    fallbacks: [
      'anthropic/claude-3-haiku',
      'deepseek/deepseek-chat',
    ],
  },
  execute: {
    modelId: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    temperature: 0.4,
    reason: 'Strong reasoning and precise output for getting things done.',
    fallbacks: [
      'deepseek/deepseek-chat',
      'openai/gpt-4o',
    ],
  },
  refine: {
    modelId: 'anthropic/claude-3.5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    temperature: 0.2,
    reason: 'Precise and controlled for polishing existing work.',
    fallbacks: [
      'openai/gpt-4o',
      'deepseek/deepseek-chat',
    ],
  },
};

/**
 * Select the optimal model for a given mode.
 */
export function selectModel(mode: Mode): ModelConfig {
  return ROUTING[mode];
}

/**
 * Get the next fallback model if the primary is unavailable.
 * Returns null if no more fallbacks.
 */
export function getNextFallback(
  mode: Mode,
  failedModelId: string,
): ModelConfig | null {
  const config = ROUTING[mode];
  const allModels = [config.modelId, ...config.fallbacks];
  const failedIndex = allModels.indexOf(failedModelId);

  if (failedIndex === -1 || failedIndex >= allModels.length - 1) {
    return null;
  }

  const nextId = allModels[failedIndex + 1];
  return {
    ...config,
    modelId: nextId,
    displayName: nextId.split('/').pop()?.replace(/-/g, ' ') ?? nextId,
    reason: `Fallback — primary model was unavailable.`,
  };
}
