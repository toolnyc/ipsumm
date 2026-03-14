import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { ApiResponse } from '../../../lib/types';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  validatePassword,
  jsonResponse,
} from '../../../lib/auth';
import { getUserById, updatePassword } from '../../../lib/db';

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return jsonResponse({ status: 'error', error: 'Not authenticated' } satisfies ApiResponse, 401);
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword) {
      return jsonResponse(
        { status: 'error', error: 'Current password and new password are required' } satisfies ApiResponse,
        400,
      );
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return jsonResponse({ status: 'error', error: passwordError } satisfies ApiResponse, 400);
    }

    const db = env.DB;
    const dbUser = await getUserById(db, user.id);
    if (!dbUser) {
      return jsonResponse({ status: 'error', error: 'User not found' } satisfies ApiResponse, 404);
    }

    const valid = await verifyPassword(currentPassword, dbUser.salt, dbUser.password_hash);
    if (!valid) {
      return jsonResponse({ status: 'error', error: 'Current password is incorrect' } satisfies ApiResponse, 401);
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    await updatePassword(db, user.id, passwordHash, salt);

    return jsonResponse({ status: 'ok' } satisfies ApiResponse);
  } catch (err) {
    console.error('Password change error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
