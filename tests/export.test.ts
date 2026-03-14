import { describe, it, expect } from 'vitest';
import { exportSessionMarkdown } from '../src/lib/export';
import type { Session } from '../src/lib/types';

const mockSession: Session = {
  id: 'test-123',
  mode: 'brainstorm',
  timestamp: 1710374400000,
  rawInput: { exploring: 'weekend projects', output: 'list with pros and cons' },
  shapedPrompt: 'I want to brainstorm about weekend projects.',
  conversation: [
    { role: 'user', content: 'I want to brainstorm about weekend projects.' },
    { role: 'assistant', content: 'Here are some ideas:\n1. Build a birdhouse\n2. Start a garden' },
  ],
  modelUsed: 'browser-local',
  cost: 0,
  tokenUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  energyEstimate: 0,
  outcome: 'yes',
  reflection: 'Got some good ideas to start with.',
};

describe('export', () => {
  it('generates markdown with YAML frontmatter', () => {
    const md = exportSessionMarkdown(mockSession);
    expect(md).toContain('---');
    expect(md).toContain('id: test-123');
    expect(md).toContain('mode: brainstorm');
    expect(md).toContain('outcome: yes');
  });

  it('includes shaped prompt section', () => {
    const md = exportSessionMarkdown(mockSession);
    expect(md).toContain('## Shaped Prompt');
    expect(md).toContain('I want to brainstorm about weekend projects.');
  });

  it('includes conversation with role labels', () => {
    const md = exportSessionMarkdown(mockSession);
    expect(md).toContain('**You:**');
    expect(md).toContain('**AI:**');
    expect(md).toContain('Build a birdhouse');
  });

  it('includes reflection when present', () => {
    const md = exportSessionMarkdown(mockSession);
    expect(md).toContain('## Reflection');
    expect(md).toContain('Got some good ideas');
  });

  it('omits reflection section when null', () => {
    const noReflection = { ...mockSession, reflection: null };
    const md = exportSessionMarkdown(noReflection);
    expect(md).not.toContain('## Reflection');
  });

  it('includes problem and success criteria in frontmatter', () => {
    const md = exportSessionMarkdown(mockSession);
    expect(md).toContain('problem: "weekend projects"');
    expect(md).toContain('success_criteria: "list with pros and cons"');
  });
});
