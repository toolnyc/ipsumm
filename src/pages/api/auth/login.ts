import type { APIRoute } from 'astro';
import type { ApiResponse, AuthResponse } from '../../../lib/types';
import {
  generateToken,
  verifyPassword,
  validateEmail,
  sessionExpiresAt,
  jsonResponse,
  setSessionCookie,
} from '../../../lib/auth';
import { getUserByEmail, createSession } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return jsonResponse({ status: 'error', error: 'Email and password are required' } satisfies ApiResponse, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      return jsonResponse({ status: 'error', error: 'Invalid email address' } satisfies ApiResponse, 400);
    }

    const db = (locals as any).runtime.env.DB;

    const user = await getUserByEmail(db, normalizedEmail);
    if (!user) {
      return jsonResponse({ status: 'error', error: 'Invalid email or password' } satisfies ApiResponse, 401);
    }

    const valid = await verifyPassword(password, user.salt, user.password_hash);
    if (!valid) {
      return jsonResponse({ status: 'error', error: 'Invalid email or password' } satisfies ApiResponse, 401);
    }

    // Create session
    const token = generateToken();
    await createSession(db, token, user.id, sessionExpiresAt());

    const responseBody: ApiResponse<AuthResponse> = {
      status: 'ok',
      data: {
        user: { id: user.id, email: user.email, created_at: user.created_at, updated_at: user.updated_at },
        token,
      },
    };

    return jsonResponse(responseBody, 200, {
      'Set-Cookie': setSessionCookie(token),
    });
  } catch (err) {
    console.error('Login error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
