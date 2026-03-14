import { describe, it, expect } from 'vitest';
import { GET } from '../src/pages/api/health';
import type { HealthResponse } from '../src/lib/types';

function createRequest(url: string) {
  return new Request(url);
}

describe('GET /api/health', () => {
  it('returns status ok with timestamp', async () => {
    const request = createRequest('http://localhost/api/health');
    const response = await GET({ request } as any);
    const body: HealthResponse = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });

  it('returns JSON content type', async () => {
    const request = createRequest('http://localhost/api/health');
    const response = await GET({ request } as any);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
