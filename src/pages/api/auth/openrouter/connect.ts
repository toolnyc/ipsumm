/**
 * GET /api/auth/openrouter/connect — Initiate OpenRouter OAuth with PKCE.
 * Generates a code_verifier, stores it in a short-lived cookie,
 * and redirects to OpenRouter's auth page with the code_challenge.
 */

import type { APIRoute } from 'astro';

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const GET: APIRoute = async ({ locals, redirect, url }) => {
  const user = (locals as any).user;
  if (!user) {
    return redirect('/login', 302);
  }

  // Generate PKCE code_verifier (43-128 chars, base64url-encoded)
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = base64url(verifierBytes.buffer);

  // Compute code_challenge = base64url(sha256(code_verifier))
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
  const codeChallenge = base64url(digest);

  const callbackUrl = `${url.origin}/api/auth/openrouter/callback`;
  const authUrl = new URL('https://openrouter.ai/auth');
  authUrl.searchParams.set('callback_url', callbackUrl);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Store verifier in a short-lived cookie (10 minutes)
  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      'Set-Cookie': `or_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/openrouter; Max-Age=600`,
    },
  });
};
