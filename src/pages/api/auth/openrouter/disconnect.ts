import type { APIRoute } from 'astro';
import type { ApiResponse } from '../../../../lib/types';
import { jsonResponse } from '../../../../lib/auth';
import { deleteOpenRouterConnection } from '../../../../lib/db';

export const POST: APIRoute = async ({ locals }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return jsonResponse({ status: 'error', error: 'Not authenticated' } satisfies ApiResponse, 401);
    }

    const db = (locals as any).runtime.env.DB;
    await deleteOpenRouterConnection(db, user.id);

    return jsonResponse({ status: 'ok' } satisfies ApiResponse);
  } catch (err) {
    console.error('OpenRouter disconnect error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
