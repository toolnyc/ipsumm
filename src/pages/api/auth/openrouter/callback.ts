import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { encryptApiKey } from '../../../../lib/auth';
import { saveOpenRouterKey } from '../../../../lib/db';

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export const GET: APIRoute = async ({ request, url, locals, redirect }) => {
  try {
    const user = (locals as any).user;
    if (!user) {
      return redirect('/login', 302);
    }

    const code = url.searchParams.get('code');
    if (!code) {
      return redirect('/settings?error=missing_code', 302);
    }

    const db = env.DB;
    const encryptionSecret = env.ENCRYPTION_KEY || 'ipsumm-default-dev-secret';

    // Read PKCE verifier from cookie
    const codeVerifier = getCookie(request, 'or_verifier');

    // Exchange code for API key at OpenRouter
    const exchangeBody: Record<string, string> = { code };
    if (codeVerifier) {
      exchangeBody.code_verifier = codeVerifier;
      exchangeBody.code_challenge_method = 'S256';
    }

    const exchangeResponse = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exchangeBody),
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

    // Clear the verifier cookie and redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/settings?openrouter=connected',
        'Set-Cookie': 'or_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/openrouter; Max-Age=0',
      },
    });
  } catch (err) {
    console.error('OpenRouter callback error:', err);
    return redirect('/settings?error=callback_error', 302);
  }
};
