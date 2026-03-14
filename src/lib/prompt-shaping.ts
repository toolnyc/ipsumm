import type { Mode } from './types';

export interface IntakeQuestion {
  id: string;
  question: string;
  placeholder: string;
  required: boolean;
}

export interface IntakeConfig {
  mode: Mode;
  questions: IntakeQuestion[];
  shapePrompt: (answers: Record<string, string>) => string;
}

const brainstormIntake: IntakeConfig = {
  mode: 'brainstorm',
  questions: [
    {
      id: 'exploring',
      question: "What are you exploring?",
      placeholder: "e.g., Ideas for a weekend project, ways to improve my morning routine...",
      required: true,
    },
    {
      id: 'output',
      question: "What would a useful output look like?",
      placeholder: "e.g., A list of options with pros and cons, a rough plan to start from...",
      required: true,
    },
    {
      id: 'constraints',
      question: "Any constraints or things you already know?",
      placeholder: "e.g., Budget is under $500, I only have weekends free, I've already tried X...",
      required: false,
    },
  ],
  shapePrompt(answers) {
    let prompt = `I want to brainstorm about: ${answers.exploring}\n\n`;
    prompt += `A useful output would be: ${answers.output}\n\n`;
    if (answers.constraints?.trim()) {
      prompt += `Keep in mind: ${answers.constraints}\n\n`;
    }
    prompt += `Explore this openly. Suggest a range of ideas, not just the obvious ones. Don't finalize or pick a winner — keep things open and divergent.`;
    return prompt;
  },
};

const executeIntake: IntakeConfig = {
  mode: 'execute',
  questions: [
    {
      id: 'task',
      question: "What do you need to get done?",
      placeholder: "e.g., Write an email to my landlord, create a meal plan for the week...",
      required: true,
    },
    {
      id: 'success',
      question: "What does success look like — specifically?",
      placeholder: "e.g., A polished email ready to send, a 7-day plan with grocery list...",
      required: true,
    },
    {
      id: 'context',
      question: "What do you already have?",
      placeholder: "e.g., Some notes I jotted down, a rough draft, nothing yet...",
      required: false,
    },
  ],
  shapePrompt(answers) {
    let prompt = `I need to: ${answers.task}\n\n`;
    prompt += `Success means: ${answers.success}\n\n`;
    if (answers.context?.trim()) {
      prompt += `What I have so far: ${answers.context}\n\n`;
    }
    prompt += `Be specific and actionable. Deliver exactly what was described as success. Don't explore tangents — stay focused on the deliverable.`;
    return prompt;
  },
};

const refineIntake: IntakeConfig = {
  mode: 'refine',
  questions: [
    {
      id: 'worked',
      question: "What worked in the previous session?",
      placeholder: "e.g., The structure was good, the tone was right...",
      required: true,
    },
    {
      id: 'didnt_work',
      question: "What didn't work?",
      placeholder: "e.g., Too vague in places, missed an important angle...",
      required: true,
    },
    {
      id: 'change',
      question: "What specifically should change?",
      placeholder: "e.g., Make section 2 more concrete, cut the last paragraph...",
      required: true,
    },
  ],
  shapePrompt(answers) {
    let prompt = `Refine the previous output.\n\n`;
    prompt += `What worked: ${answers.worked}\n`;
    prompt += `What didn't: ${answers.didnt_work}\n`;
    prompt += `What should change: ${answers.change}\n\n`;
    prompt += `Improve the existing work based on this feedback. Don't start over or introduce entirely new topics — polish and tighten what's already there.`;
    return prompt;
  },
};

const intakeConfigs: Record<Mode, IntakeConfig> = {
  brainstorm: brainstormIntake,
  execute: executeIntake,
  refine: refineIntake,
};

export function getIntakeConfig(mode: Mode): IntakeConfig {
  return intakeConfigs[mode];
}

export function shapePrompt(mode: Mode, answers: Record<string, string>): string {
  return intakeConfigs[mode].shapePrompt(answers);
}
