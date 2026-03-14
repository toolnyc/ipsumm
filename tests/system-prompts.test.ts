import { describe, it, expect } from 'vitest';
import { getSystemPrompt, buildSystemPrompt } from '../src/lib/system-prompts';

describe('system-prompts', () => {
  it('brainstorm prompt encourages divergent thinking', () => {
    const prompt = getSystemPrompt('brainstorm');
    expect(prompt).toContain('divergent');
    expect(prompt).toContain('explore');
  });

  it('execute prompt focuses on deliverables', () => {
    const prompt = getSystemPrompt('execute');
    expect(prompt).toContain('specific');
    expect(prompt).toContain('actionable');
  });

  it('refine prompt preserves existing work', () => {
    const prompt = getSystemPrompt('refine');
    expect(prompt).toContain('don\'t start over');
    expect(prompt).toContain('polish');
  });

  it('buildSystemPrompt adds prior context for refine mode', () => {
    const prompt = buildSystemPrompt('refine', 'Previous output here');
    expect(prompt).toContain('Previous session output');
    expect(prompt).toContain('Previous output here');
  });

  it('buildSystemPrompt ignores prior context for non-refine modes', () => {
    const prompt = buildSystemPrompt('brainstorm', 'should not appear');
    expect(prompt).not.toContain('Previous session output');
  });
});
