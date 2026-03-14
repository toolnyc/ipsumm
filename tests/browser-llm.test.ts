import { describe, it, expect, vi } from 'vitest';

// WebLLM has CJS dependencies that don't load in vitest's ESM context,
// so we test the module's pure functions by importing them dynamically
// and test the interface contract rather than the WebLLM internals.

vi.mock('@mlc-ai/web-llm', () => ({
  MLCEngine: class MockEngine {
    setInitProgressCallback() {}
    async reload() {}
    chat = {
      completions: {
        create: async () => ({ [Symbol.asyncIterator]: async function* () {} }),
      },
    };
    async unload() {}
  },
}));

describe('browser-llm', () => {
  it('module exports the expected interface', async () => {
    const mod = await import('../src/lib/browser-llm');
    expect(typeof mod.isSupported).toBe('function');
    expect(typeof mod.isLoaded).toBe('function');
    expect(typeof mod.loadModel).toBe('function');
    expect(typeof mod.generate).toBe('function');
    expect(typeof mod.generateWithHistory).toBe('function');
    expect(typeof mod.unloadModel).toBe('function');
    expect(typeof mod.getModelId).toBe('function');

    expect(mod.isLoaded()).toBe(false);
    expect(mod.getModelId()).toContain('Phi');
  });
});
