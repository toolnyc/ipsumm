/**
 * POST /api/chat — Proxy chat requests to OpenRouter.
 * Decrypts the user's stored API key, streams the response back via SSE.
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSessionToken, jsonResponse, decryptApiKey } from '../../lib/auth';
import { getOpenRouterConnection } from '../../lib/db';
import type { Message } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  if (!env?.DB) {
    return jsonResponse({ status: 'error', error: 'Server not configured' }, 500);
  }

  const db = env.DB;
  const token = getSessionToken(request);
  if (!token) {
    return jsonResponse({ status: 'error', error: 'Not authenticated' }, 401);
  }

  // Verify session
  const session = await db
    .prepare('SELECT user_id FROM auth_sessions WHERE token = ? AND expires_at > ?')
    .bind(token, Math.floor(Date.now() / 1000))
    .first<{ user_id: string }>();

  if (!session) {
    return jsonResponse({ status: 'error', error: 'Not authenticated' }, 401);
  }

  // Get OpenRouter API key
  const connection = await getOpenRouterConnection(db, session.user_id);
  if (!connection) {
    return jsonResponse({ status: 'error', error: 'OpenRouter not connected' }, 400);
  }

  const secret = env.ENCRYPTION_KEY || import.meta.env.ENCRYPTION_KEY || 'dev-encryption-key-not-for-prod!';
  let apiKey: string;
  try {
    apiKey = await decryptApiKey(connection.encrypted_api_key, connection.iv, secret);
  } catch {
    return jsonResponse({ status: 'error', error: 'Failed to decrypt API key' }, 500);
  }

  // Parse request body
  let body: { model: string; messages: Message[]; temperature?: number; max_tokens?: number };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ status: 'error', error: 'Invalid request body' }, 400);
  }

  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse({ status: 'error', error: 'model and messages are required' }, 400);
  }

  // Proxy to OpenRouter with streaming
  const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://ipsumm.co',
      'X-Title': 'ipsumm',
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens,
      stream: true,
    }),
  });

  if (!orResponse.ok) {
    const errBody = await orResponse.json().catch(() => ({}));
    const message = (errBody as any)?.error?.message || `OpenRouter error ${orResponse.status}`;
    return jsonResponse({ status: 'error', error: message }, orResponse.status);
  }

  // Pass through the SSE stream
  return new Response(orResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
