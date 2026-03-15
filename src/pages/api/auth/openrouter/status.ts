import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { ApiResponse } from '../../../../lib/types';
import { jsonResponse, decryptApiKey } from '../../../../lib/auth';
import { getOpenRouterConnection } from '../../../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return jsonResponse({ status: 'error', error: 'Not authenticated' } satisfies ApiResponse, 401);
    }

    const db = env.DB;
    const encryptionSecret = env.ENCRYPTION_KEY || 'ipsumm-default-dev-secret';

    const connection = await getOpenRouterConnection(db, user.id);
    if (!connection) {
      return jsonResponse({
        status: 'ok',
        data: { connected: false },
      } satisfies ApiResponse);
    }

    // Try to fetch budget info from OpenRouter
    let budget = null;
    try {
      const apiKey = await decryptApiKey(connection.encrypted_api_key, connection.iv, encryptionSecret);
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { data: { limit: number | null; usage: number } };
        budget = {
          limit: data.data.limit,
          usage: data.data.usage,
          remaining: data.data.limit != null ? data.data.limit - data.data.usage : null,
        };
      }
    } catch {
      // Budget fetch is optional
    }

    return jsonResponse({
      status: 'ok',
      data: {
        connected: true,
        connected_at: connection.connected_at,
        budget,
      },
    } satisfies ApiResponse);
  } catch (err) {
    console.error('OpenRouter status error:', err);
    return jsonResponse({ status: 'error', error: 'Internal server error' } satisfies ApiResponse, 500);
  }
};
