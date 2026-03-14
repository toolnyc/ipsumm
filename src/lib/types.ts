export interface ApiResponse<T = unknown> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: number;
}
