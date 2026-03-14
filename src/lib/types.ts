export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: number;
}

export type Mode = 'brainstorm' | 'execute' | 'refine';
export type Outcome = 'yes' | 'partially' | 'no';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Session {
  id: string;
  mode: Mode;
  timestamp: number;
  rawInput: Record<string, string>;
  shapedPrompt: string;
  conversation: Message[];
  modelUsed: string;
  cost: number;
  energyEstimate: number;
  outcome: Outcome | null;
  reflection: string | null;
}
