/**
 * OpenRouter API client for cloud model inference.
 * Sends requests using the user's stored API key.
 * Supports streaming via SSE and returns token usage.
 */

import type { Message } from './types';

export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: { message: { role: string; content: string } }[];
  usage: TokenUsage;
}

export interface StreamDelta {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryable: boolean,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

const API_BASE = 'https://openrouter.ai/api/v1';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function classifyError(status: number, body: any): OpenRouterError {
  const message = body?.error?.message || body?.message || `HTTP ${status}`;

  if (status === 401 || status === 403) {
    return new OpenRouterError(message, 'auth_error', status, false);
  }
  if (status === 429) {
    return new OpenRouterError(message, 'rate_limit', status, true);
  }
  if (status === 402) {
    return new OpenRouterError(message, 'budget_exceeded', status, false);
  }
  if (status === 404) {
    return new OpenRouterError(message, 'model_unavailable', status, false);
  }
  if (status >= 500) {
    return new OpenRouterError(message, 'server_error', status, true);
  }
  return new OpenRouterError(message, 'unknown', status, false);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a non-streaming chat completion request.
 */
export async function chatCompletion(
  apiKey: string,
  request: OpenRouterRequest,
): Promise<OpenRouterResponse> {
  const body = {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens,
    stream: false,
  };

  let lastError: OpenRouterError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0 && lastError?.retryable) {
      await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
    }

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ipsumm.co',
        'X-Title': 'ipsumm',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return (await res.json()) as OpenRouterResponse;
    }

    const errorBody = await res.json().catch(() => ({}));
    lastError = classifyError(res.status, errorBody);

    if (!lastError.retryable) {
      throw lastError;
    }
  }

  throw lastError!;
}

/**
 * Send a streaming chat completion request.
 * Yields content deltas and final usage stats via callback.
 */
export async function chatCompletionStream(
  apiKey: string,
  request: OpenRouterRequest,
  onDelta: (delta: StreamDelta) => void,
): Promise<TokenUsage> {
  const body = {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens,
    stream: true,
  };

  let lastError: OpenRouterError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0 && lastError?.retryable) {
      await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
    }

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://ipsumm.co',
        'X-Title': 'ipsumm',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      lastError = classifyError(res.status, errorBody);
      if (!lastError.retryable) throw lastError;
      continue;
    }

    // Parse SSE stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            onDelta({ content, done: false });
          }
          // OpenRouter sends usage in the final chunk
          if (data.usage) {
            usage = {
              prompt_tokens: data.usage.prompt_tokens ?? 0,
              completion_tokens: data.usage.completion_tokens ?? 0,
              total_tokens: data.usage.total_tokens ?? 0,
            };
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    onDelta({ content: '', done: true, usage });
    return usage;
  }

  throw lastError!;
}

/**
 * Model pricing data (cost per token in USD).
 * Source: OpenRouter pricing page. Updated periodically.
 */
const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
  'meta-llama/llama-3.3-70b-instruct': { prompt: 0.0000004, completion: 0.0000004 },
  'anthropic/claude-3.5-sonnet': { prompt: 0.000003, completion: 0.000015 },
  'anthropic/claude-3-haiku': { prompt: 0.00000025, completion: 0.00000125 },
  'deepseek/deepseek-chat': { prompt: 0.00000014, completion: 0.00000028 },
  'openai/gpt-4o': { prompt: 0.0000025, completion: 0.00001 },
  'openai/gpt-4': { prompt: 0.00003, completion: 0.00006 },
  'anthropic/claude-3-opus': { prompt: 0.000015, completion: 0.000075 },
};

/**
 * Calculate the cost of a response based on token usage and model pricing.
 */
export function calculateCost(modelId: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    // Fallback: estimate based on a mid-range model
    return usage.prompt_tokens * 0.000001 + usage.completion_tokens * 0.000002;
  }
  return usage.prompt_tokens * pricing.prompt + usage.completion_tokens * pricing.completion;
}

/**
 * Get pricing info for a model.
 */
export function getModelPricing(modelId: string): { prompt: number; completion: number } | null {
  return MODEL_PRICING[modelId] ?? null;
}
