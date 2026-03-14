import type { APIRoute } from 'astro';
import type { ApiResponse } from '../../../../lib/types';
import { jsonResponse, encryptApiKey } from '../../../../lib/auth';
import { saveOpenRouterKey } from '../../../../lib/db';

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return redirect('/login', 302);
    }

    const code = url.searchParams.get('code');
    if (!code) {
      return redirect('/settings?error=missing_code', 302);
    }

    const runtime = (locals as any).runtime;
    const db = runtime.env.DB;
    const encryptionSecret = runtime.env.OPENROUTER_KEY_SECRET || 'ipsumm-default-dev-secret';

    // Exchange code for API key at OpenRouter
    const exchangeResponse = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!exchangeResponse.ok) {
      console.error('OpenRouter exchange failed:', exchangeResponse.status);
      return redirect('/settings?error=exchange_failed', 302);
    }

    const exchangeData = (await exchangeResponse.json()) as { key: string };
    if (!exchangeData.key) {
      return redirect('/settings?error=no_key', 302);
    }

    // Encrypt and store the API key
    const { encrypted, iv } = await encryptApiKey(exchangeData.key, encryptionSecret);
    await saveOpenRouterKey(db, user.id, encrypted, iv);

    return redirect('/settings?openrouter=connected', 302);
  } catch (err) {
    console.error('OpenRouter callback error:', err);
    return redirect('/settings?error=callback_error', 302);
  }
};
