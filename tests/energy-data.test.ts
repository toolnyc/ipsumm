import { describe, it, expect } from 'vitest';
import {
  getEnergyData,
  getBrowserModelEnergy,
  getAllKnownModels,
} from '../src/lib/energy-data';

describe('energy-data', () => {
  it('returns known model data', () => {
    const data = getEnergyData('anthropic/claude-3.5-sonnet');
    expect(data.rating).toBe('D');
    expect(data.kwhPerQuery).toBe(0.004);
    expect(data.analogy).toContain('microwave');
  });

  it('returns A rating for small models', () => {
    const data = getEnergyData('meta-llama/llama-3.2-1b-instruct');
    expect(data.rating).toBe('A');
    expect(data.kwhPerQuery).toBeLessThan(0.0001);
  });

  it('returns browser model as zero energy', () => {
    const data = getEnergyData('browser-local');
    expect(data.rating).toBe('local');
    expect(data.kwhPerQuery).toBe(0);
    expect(data.analogy).toContain('zero cloud energy');
  });

  it('getBrowserModelEnergy returns local rating', () => {
    const data = getBrowserModelEnergy();
    expect(data.rating).toBe('local');
    expect(data.kwhPerQuery).toBe(0);
  });

  it('estimates unknown models from parameter count', () => {
    const data = getEnergyData('some-provider/mystery-7b');
    expect(data.rating).toBe('A');
    expect(data.analogy).toContain('estimated');
  });

  it('estimates large unknown models as high energy', () => {
    const data = getEnergyData('some-provider/big-400b');
    expect(data.rating).toBe('E');
  });

  it('defaults to C rating when no param count found', () => {
    const data = getEnergyData('some-provider/unknown-model');
    expect(data.rating).toBe('B');
  });

  it('getAllKnownModels returns all entries', () => {
    const models = getAllKnownModels();
    expect(models.length).toBeGreaterThanOrEqual(7);
    expect(models.every((m) => m.modelId && m.rating && m.analogy)).toBe(true);
  });
});
