import type { Session } from './types';

/**
 * Export a session as structured markdown with YAML frontmatter.
 */
export function exportSessionMarkdown(session: Session): string {
  const date = new Date(session.timestamp).toISOString();

  // Extract success criteria from raw input
  const problem =
    session.rawInput.exploring ||
    session.rawInput.task ||
    'N/A';
  const successCriteria =
    session.rawInput.output ||
    session.rawInput.success ||
    session.rawInput.change ||
    'N/A';

  const lines: string[] = [
    '---',
    `id: ${session.id}`,
    `mode: ${session.mode}`,
    `problem: "${escapeYaml(problem)}"`,
    `success_criteria: "${escapeYaml(successCriteria)}"`,
    `model: ${session.modelUsed}`,
    `cost: ${session.cost}`,
    `tokens_prompt: ${session.tokenUsage?.prompt_tokens ?? 0}`,
    `tokens_completion: ${session.tokenUsage?.completion_tokens ?? 0}`,
    `energy_kwh: ${session.energyEstimate}`,
    `outcome: ${session.outcome ?? 'null'}`,
    `timestamp: ${date}`,
    '---',
    '',
    '## Shaped Prompt',
    '',
    session.shapedPrompt,
    '',
    '## Conversation',
    '',
  ];

  session.conversation.forEach((msg) => {
    const label = msg.role === 'user' ? '**You:**' : '**AI:**';
    lines.push(`${label}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  });

  if (session.reflection) {
    lines.push('## Reflection');
    lines.push('');
    lines.push(session.reflection);
    lines.push('');
  }

  return lines.join('\n');
}

function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
}
