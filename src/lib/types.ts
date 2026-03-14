export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: number;
}

// Auth types
export interface User {
  id: string;
  email: string;
  created_at: number;
  updated_at: number;
}

export interface AuthSession {
  token: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface OpenRouterConnection {
  user_id: string;
  connected_at: number;
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
