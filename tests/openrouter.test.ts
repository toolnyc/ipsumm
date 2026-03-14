import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  chatCompletion,
  chatCompletionStream,
  calculateCost,
  getModelPricing,
  OpenRouterError,
} from '../src/lib/openrouter';
import type { TokenUsage } from '../src/lib/openrouter';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('chatCompletion', () => {
  it('sends request with correct headers and body', async () => {
    const mockResponse = {
      id: 'gen-123',
      model: 'meta-llama/llama-3.3-70b-instruct',
      choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await chatCompletion('sk-test-key', {
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: 'Hi' }],
      temperature: 0.9,
    });

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
    expect(options.headers['HTTP-Referer']).toBe('https://ipsumm.co');
    expect(options.headers['X-Title']).toBe('ipsumm');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('meta-llama/llama-3.3-70b-instruct');
    expect(body.temperature).toBe(0.9);
    expect(body.stream).toBe(false);
  });

  it('throws OpenRouterError on auth failure (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    });

    try {
      await chatCompletion('bad-key', {
        model: 'test/model',
        messages: [{ role: 'user', content: 'Hi' }],
      });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect(err.code).toBe('auth_error');
      expect(err.retryable).toBe(false);
    }
  });

  it('throws on budget exceeded (402)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({ error: { message: 'Budget exceeded' } }),
    });

    try {
      await chatCompletion('key', {
        model: 'test/model',
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } catch (err: any) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect(err.code).toBe('budget_exceeded');
      expect(err.retryable).toBe(false);
    }
  });

  it('throws on model unavailable (404)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { message: 'Model not found' } }),
    });

    try {
      await chatCompletion('key', {
        model: 'nonexistent/model',
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } catch (err: any) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect(err.code).toBe('model_unavailable');
    }
  });

  it('retries on rate limit (429) with backoff', async () => {
    const successResponse = {
      id: 'gen-123',
      model: 'test/model',
      choices: [{ message: { role: 'assistant', content: 'OK' } }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: { message: 'Rate limited' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(successResponse),
      });

    const result = await chatCompletion('key', {
      model: 'test/model',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result).toEqual(successResponse);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on server error (500) and eventually throws', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal error' } }),
    });

    try {
      await chatCompletion('key', {
        model: 'test/model',
        messages: [{ role: 'user', content: 'Hi' }],
      });
    } catch (err: any) {
      expect(err).toBeInstanceOf(OpenRouterError);
      expect(err.code).toBe('server_error');
      expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES
    }
  });
});

describe('chatCompletionStream', () => {
  function makeSSEStream(chunks: string[]) {
    let index = 0;
    const encoder = new TextEncoder();
    return {
      getReader: () => ({
        read: () => {
          if (index < chunks.length) {
            return Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      }),
    };
  }

  it('parses SSE stream and calls onDelta', async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}],"usage":{"prompt_tokens":10,"completion_tokens":3,"total_tokens":13}}\n\n',
      'data: [DONE]\n\n',
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: makeSSEStream(sseChunks),
    });

    const deltas: string[] = [];
    let finalUsage: TokenUsage | undefined;

    const usage = await chatCompletionStream(
      'key',
      {
        model: 'test/model',
        messages: [{ role: 'user', content: 'Hi' }],
      },
      (delta) => {
        if (delta.content) deltas.push(delta.content);
        if (delta.usage) finalUsage = delta.usage;
      },
    );

    expect(deltas).toEqual(['Hello', ' world', '!']);
    expect(usage.prompt_tokens).toBe(10);
    expect(usage.completion_tokens).toBe(3);
    expect(finalUsage).toBeDefined();
  });

  it('throws on non-retryable error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
    });

    await expect(
      chatCompletionStream(
        'bad-key',
        { model: 'test/model', messages: [{ role: 'user', content: 'Hi' }] },
        () => {},
      ),
    ).rejects.toThrow(OpenRouterError);
  });
});

describe('calculateCost', () => {
  it('calculates cost for known model', () => {
    const usage: TokenUsage = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
    const cost = calculateCost('anthropic/claude-3.5-sonnet', usage);
    // 1000 * 0.000003 + 500 * 0.000015 = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it('calculates cost for cheap model', () => {
    const usage: TokenUsage = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
    const cost = calculateCost('meta-llama/llama-3.3-70b-instruct', usage);
    // 1000 * 0.0000004 + 500 * 0.0000004 = 0.0006
    expect(cost).toBeCloseTo(0.0006, 6);
  });

  it('uses fallback pricing for unknown model', () => {
    const usage: TokenUsage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 };
    const cost = calculateCost('unknown/model', usage);
    // 100 * 0.000001 + 50 * 0.000002 = 0.0001 + 0.0001 = 0.0002
    expect(cost).toBeCloseTo(0.0002, 6);
  });
});

describe('getModelPricing', () => {
  it('returns pricing for known model', () => {
    const pricing = getModelPricing('anthropic/claude-3.5-sonnet');
    expect(pricing).not.toBeNull();
    expect(pricing!.prompt).toBe(0.000003);
    expect(pricing!.completion).toBe(0.000015);
  });

  it('returns null for unknown model', () => {
    expect(getModelPricing('unknown/model')).toBeNull();
  });
});
