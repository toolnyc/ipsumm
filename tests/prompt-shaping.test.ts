import { describe, it, expect } from 'vitest';
import { getIntakeConfig, shapePrompt } from '../src/lib/prompt-shaping';

describe('prompt-shaping', () => {
  describe('getIntakeConfig', () => {
    it('returns brainstorm config with 3 questions', () => {
      const config = getIntakeConfig('brainstorm');
      expect(config.mode).toBe('brainstorm');
      expect(config.questions).toHaveLength(3);
      expect(config.questions[0].id).toBe('exploring');
    });

    it('returns execute config with 3 questions', () => {
      const config = getIntakeConfig('execute');
      expect(config.mode).toBe('execute');
      expect(config.questions).toHaveLength(3);
      expect(config.questions[0].id).toBe('task');
    });

    it('returns refine config with 3 questions', () => {
      const config = getIntakeConfig('refine');
      expect(config.mode).toBe('refine');
      expect(config.questions).toHaveLength(3);
    });

    it('execute requires success criteria', () => {
      const config = getIntakeConfig('execute');
      const successQ = config.questions.find((q) => q.id === 'success');
      expect(successQ?.required).toBe(true);
    });
  });

  describe('shapePrompt', () => {
    it('shapes brainstorm prompt from answers', () => {
      const prompt = shapePrompt('brainstorm', {
        exploring: 'weekend project ideas',
        output: 'a list with pros and cons',
        constraints: 'budget under $100',
      });
      expect(prompt).toContain('weekend project ideas');
      expect(prompt).toContain('a list with pros and cons');
      expect(prompt).toContain('budget under $100');
      expect(prompt).toContain('divergent');
    });

    it('shapes brainstorm prompt without optional fields', () => {
      const prompt = shapePrompt('brainstorm', {
        exploring: 'ideas',
        output: 'a list',
        constraints: '',
      });
      expect(prompt).toContain('ideas');
      expect(prompt).not.toContain('Keep in mind');
    });

    it('shapes execute prompt with success criteria', () => {
      const prompt = shapePrompt('execute', {
        task: 'write an email',
        success: 'polished email ready to send',
        context: 'some notes',
      });
      expect(prompt).toContain('write an email');
      expect(prompt).toContain('polished email ready to send');
      expect(prompt).toContain('actionable');
    });

    it('shapes refine prompt with feedback', () => {
      const prompt = shapePrompt('refine', {
        worked: 'good structure',
        didnt_work: 'too vague',
        change: 'make section 2 concrete',
      });
      expect(prompt).toContain('good structure');
      expect(prompt).toContain('too vague');
      expect(prompt).toContain('make section 2 concrete');
      expect(prompt).toContain('polish');
    });
  });
});
