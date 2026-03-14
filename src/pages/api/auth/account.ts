import type { APIRoute } from 'astro';
import type { ApiResponse } from '../../../lib/types';
import { jsonResponse, clearSessionCookie } from '../../../lib/auth';
import { deleteUser } from '../../../lib/db';

export const DELETE: APIRoute = async ({ locals }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return jsonResponse({ status: 'error', error: 'Not authenticated' } satisfies ApiResponse, 401);
    }

    const db = (locals as any).runtime.env.DB;
    await deleteUser(db, user.id);

    return jsonResponse({ status: 'ok' } satisfies ApiResponse, 200, {
      'Set-Cookie': clearSessionCookie(),
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
