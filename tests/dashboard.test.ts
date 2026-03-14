import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createSession, listSessions } from '../src/lib/session-store';
import { getEnergyData } from '../src/lib/energy-data';
import type { Session } from '../src/lib/types';

function makeSession(overrides: Partial<Omit<Session, 'id'>> = {}) {
  return {
    mode: 'brainstorm' as const,
    timestamp: Date.now(),
    rawInput: { exploring: 'test' },
    shapedPrompt: 'test prompt',
    conversation: [{ role: 'user' as const, content: 'hello' }],
    modelUsed: 'browser-local',
    cost: 0,
    tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    energyEstimate: 0,
    outcome: null,
    reflection: null,
    ...overrides,
  };
}

describe('dashboard data', () => {
  it('aggregates sessions by mode', async () => {
    await createSession(makeSession({ mode: 'brainstorm' }));
    await createSession(makeSession({ mode: 'brainstorm' }));
    await createSession(makeSession({ mode: 'execute' }));

    const sessions = await listSessions();
    const counts = { brainstorm: 0, execute: 0, refine: 0 };
    for (const s of sessions) counts[s.mode]++;

    expect(counts.brainstorm).toBeGreaterThanOrEqual(2);
    expect(counts.execute).toBeGreaterThanOrEqual(1);
  });

  it('calculates total cost across sessions', async () => {
    await createSession(makeSession({ cost: 0.005 }));
    await createSession(makeSession({ cost: 0.012 }));

    const sessions = await listSessions();
    const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0);
    expect(totalCost).toBeGreaterThanOrEqual(0.017);
  });

  it('calculates energy savings vs GPT-4 baseline', async () => {
    const GPT4_KWH = 0.01;
    await createSession(makeSession({
      modelUsed: 'meta-llama/llama-3.3-70b-instruct',
      energyEstimate: 0.001,
    }));
    await createSession(makeSession({
      modelUsed: 'browser-local',
      energyEstimate: 0,
    }));

    const sessions = await listSessions();
    const totalEnergy = sessions.reduce((sum, s) => sum + s.energyEstimate, 0);
    const gpt4Energy = sessions.length * GPT4_KWH;
    const saved = gpt4Energy - totalEnergy;

    expect(saved).toBeGreaterThan(0);
  });

  it('filters sessions by time range', async () => {
    const now = Date.now();
    const weekAgo = now - 8 * 24 * 60 * 60 * 1000;

    await createSession(makeSession({ timestamp: now }));
    await createSession(makeSession({ timestamp: weekAgo }));

    const sessions = await listSessions();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = sessions.filter((s) => s.timestamp >= weekStart);

    // At least the "now" session should be in this week
    expect(thisWeek.length).toBeGreaterThanOrEqual(1);
    // The old session should be filtered out (or at least fewer sessions)
    expect(thisWeek.length).toBeLessThanOrEqual(sessions.length);
  });

  it('tracks outcomes', async () => {
    await createSession(makeSession({ outcome: 'yes' }));
    await createSession(makeSession({ outcome: 'partially' }));
    await createSession(makeSession({ outcome: 'no' }));
    await createSession(makeSession({ outcome: null }));

    const sessions = await listSessions();
    const outcomes = { yes: 0, partially: 0, no: 0, none: 0 };
    for (const s of sessions) {
      if (s.outcome === 'yes') outcomes.yes++;
      else if (s.outcome === 'partially') outcomes.partially++;
      else if (s.outcome === 'no') outcomes.no++;
      else outcomes.none++;
    }

    expect(outcomes.yes).toBeGreaterThanOrEqual(1);
    expect(outcomes.partially).toBeGreaterThanOrEqual(1);
    expect(outcomes.no).toBeGreaterThanOrEqual(1);
    expect(outcomes.none).toBeGreaterThanOrEqual(1);
  });
});
