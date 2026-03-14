import { describe, it, expect } from 'vitest';
import { calculateCost, getModelPricing } from '../src/lib/openrouter';

describe('cost tracking', () => {
  it('cloud sessions have non-zero cost', () => {
    const cost = calculateCost('anthropic/claude-3.5-sonnet', {
      prompt_tokens: 500,
      completion_tokens: 200,
      total_tokens: 700,
    });
    expect(cost).toBeGreaterThan(0);
    // 500 * 0.000003 + 200 * 0.000015 = 0.0015 + 0.003 = 0.0045
    expect(cost).toBeCloseTo(0.0045, 6);
  });

  it('in-browser sessions have zero cost', () => {
    // browser-local has no pricing, fallback estimate with 0 tokens = $0
    const cost = calculateCost('browser-local', {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    });
    expect(cost).toBe(0);
  });

  it('cheap model costs less than expensive model for same tokens', () => {
    const usage = { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 };
    const cheapCost = calculateCost('meta-llama/llama-3.3-70b-instruct', usage);
    const expensiveCost = calculateCost('anthropic/claude-3.5-sonnet', usage);
    expect(cheapCost).toBeLessThan(expensiveCost);
  });

  it('all routed models have pricing data', () => {
    const routedModels = [
      'meta-llama/llama-3.3-70b-instruct',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'deepseek/deepseek-chat',
      'openai/gpt-4o',
    ];
    for (const model of routedModels) {
      expect(getModelPricing(model)).not.toBeNull();
    }
  });
});
