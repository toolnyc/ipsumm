import type { APIRoute } from 'astro';
import type { HealthResponse } from '../../lib/types';

export const GET: APIRoute = () => {
  const body: HealthResponse = {
    status: 'ok',
    timestamp: Date.now(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
