import type { APIRoute } from 'astro';
import type { ApiResponse } from '../../../lib/types';
import { getSessionToken, jsonResponse, clearSessionCookie } from '../../../lib/auth';
import { deleteSession } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = (locals as any).runtime.env.DB;
    const token = getSessionToken(request);

    if (token) {
      await deleteSession(db, token);
    }

    return jsonResponse({ status: 'ok' } satisfies ApiResponse, 200, {
      'Set-Cookie': clearSessionCookie(),
    });
  } catch (err) {
    console.error('Logout error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
