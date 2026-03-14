import { describe, it, expect } from 'vitest';
import { selectModel, getNextFallback } from '../src/lib/routing';

describe('routing', () => {
  it('selects a fast model for brainstorm', () => {
    const config = selectModel('brainstorm');
    expect(config.modelId).toContain('llama');
    expect(config.temperature).toBeGreaterThan(0.7);
    expect(config.reason).toBeTruthy();
  });

  it('selects a strong model for execute', () => {
    const config = selectModel('execute');
    expect(config.modelId).toContain('sonnet');
    expect(config.temperature).toBeLessThan(0.6);
  });

  it('uses low temperature for refine', () => {
    const config = selectModel('refine');
    expect(config.temperature).toBeLessThanOrEqual(0.3);
  });

  it('returns fallback when primary fails', () => {
    const primary = selectModel('brainstorm');
    const fallback = getNextFallback('brainstorm', primary.modelId);
    expect(fallback).not.toBeNull();
    expect(fallback!.modelId).not.toBe(primary.modelId);
    expect(fallback!.reason).toContain('Fallback');
  });

  it('returns null when no more fallbacks', () => {
    const config = selectModel('brainstorm');
    const lastFallback = config.fallbacks[config.fallbacks.length - 1];
    const result = getNextFallback('brainstorm', lastFallback);
    expect(result).toBeNull();
  });
});
