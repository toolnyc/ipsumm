import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getSession,
  listSessions,
  updateSession,
  deleteSession,
} from '../src/lib/session-store';
import type { Session } from '../src/lib/types';

function makeSession(overrides: Partial<Omit<Session, 'id'>> = {}) {
  return {
    mode: 'brainstorm' as const,
    timestamp: Date.now(),
    rawInput: { question: 'test input' },
    shapedPrompt: 'shaped test prompt',
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

describe('session-store', () => {
  it('creates a session with generated id', async () => {
    const session = await createSession(makeSession());
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
    expect(session.mode).toBe('brainstorm');
  });

  it('retrieves a session by id', async () => {
    const created = await createSession(makeSession());
    const fetched = await getSession(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.shapedPrompt).toBe('shaped test prompt');
  });

  it('returns undefined for non-existent session', async () => {
    const result = await getSession('non-existent-id');
    expect(result).toBeUndefined();
  });

  it('lists sessions newest first', async () => {
    await createSession(makeSession({ timestamp: 1000 }));
    await createSession(makeSession({ timestamp: 3000 }));
    await createSession(makeSession({ timestamp: 2000 }));

    const sessions = await listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(3);
    // Verify ordering (newest first)
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i - 1].timestamp).toBeGreaterThanOrEqual(
        sessions[i].timestamp,
      );
    }
  });

  it('updates a session', async () => {
    const created = await createSession(makeSession());
    const updated = await updateSession(created.id, {
      outcome: 'yes',
      reflection: 'This was useful',
    });
    expect(updated).toBeDefined();
    expect(updated!.outcome).toBe('yes');
    expect(updated!.reflection).toBe('This was useful');
    expect(updated!.mode).toBe('brainstorm'); // unchanged fields preserved
  });

  it('returns undefined when updating non-existent session', async () => {
    const result = await updateSession('nope', { outcome: 'no' });
    expect(result).toBeUndefined();
  });

  it('deletes a session', async () => {
    const created = await createSession(makeSession());
    const deleted = await deleteSession(created.id);
    expect(deleted).toBe(true);
    const fetched = await getSession(created.id);
    expect(fetched).toBeUndefined();
  });

  it('returns false when deleting non-existent session', async () => {
    const result = await deleteSession('nope');
    expect(result).toBe(false);
  });
});
