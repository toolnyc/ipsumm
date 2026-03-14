import * as webllm from '@mlc-ai/web-llm';

// Small, fast model suitable for brainstorming
const MODEL_ID = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

let engine: webllm.MLCEngine | null = null;

export type ProgressCallback = (progress: {
  text: string;
  progress: number;
}) => void;

export type StreamCallback = (token: string) => void;

/**
 * Check if the browser supports WebGPU.
 */
export function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Check if the model is loaded and ready.
 */
export function isLoaded(): boolean {
  return engine !== null;
}

/**
 * Load the in-browser model. Calls onProgress with download/init updates.
 */
export async function loadModel(
  onProgress?: ProgressCallback,
): Promise<void> {
  if (engine) return; // already loaded

  if (!isSupported()) {
    throw new Error('WebGPU is not supported in this browser');
  }

  engine = new webllm.MLCEngine();

  engine.setInitProgressCallback((report) => {
    onProgress?.({
      text: report.text,
      progress: report.progress,
    });
  });

  await engine.reload(MODEL_ID);
}

/**
 * Generate a response from the in-browser model with streaming.
 */
export async function generate(
  prompt: string,
  systemPrompt: string,
  onToken?: StreamCallback,
): Promise<string> {
  if (!engine) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }

  const messages: webllm.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  let fullResponse = '';

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.8,
    max_tokens: 1024,
  });

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullResponse += delta;
      onToken?.(delta);
    }
  }

  return fullResponse;
}

/**
 * Generate a response with multi-turn conversation history.
 */
export async function generateWithHistory(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  onToken?: StreamCallback,
): Promise<string> {
  if (!engine) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }

  let fullResponse = '';

  const chunks = await engine.chat.completions.create({
    messages: messages as webllm.ChatCompletionMessageParam[],
    stream: true,
    temperature: 0.8,
    max_tokens: 1024,
  });

  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) {
      fullResponse += delta;
      onToken?.(delta);
    }
  }

  return fullResponse;
}

/**
 * Unload the model and free memory.
 */
export async function unloadModel(): Promise<void> {
  if (engine) {
    await engine.unload();
    engine = null;
  }
}

/**
 * Get the model ID being used.
 */
export function getModelId(): string {
  return MODEL_ID;
}
