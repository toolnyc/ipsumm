import type { APIRoute } from 'astro';
import type { ApiResponse, AuthResponse } from '../../../lib/types';
import {
  generateId,
  generateToken,
  generateSalt,
  hashPassword,
  validateEmail,
  validatePassword,
  sessionExpiresAt,
  jsonResponse,
  setSessionCookie,
} from '../../../lib/auth';
import { createUser, getUserByEmail, createSession } from '../../../lib/db';

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

    const passwordError = validatePassword(password);
    if (passwordError) {
      return jsonResponse({ status: 'error', error: passwordError } satisfies ApiResponse, 400);
    }

    const db = (locals as any).runtime.env.DB;

    // Check for existing user
    const existing = await getUserByEmail(db, normalizedEmail);
    if (existing) {
      return jsonResponse({ status: 'error', error: 'An account with this email already exists' } satisfies ApiResponse, 409);
    }

    // Create user
    const id = generateId();
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = await createUser(db, id, normalizedEmail, passwordHash, salt);

    // Create session
    const token = generateToken();
    await createSession(db, token, user.id, sessionExpiresAt());

    const responseBody: ApiResponse<AuthResponse> = {
      status: 'ok',
      data: { user, token },
    };

    return jsonResponse(responseBody, 201, {
      'Set-Cookie': setSessionCookie(token),
    });
  } catch (err) {
    console.error('Signup error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
