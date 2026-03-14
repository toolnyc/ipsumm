import { defineMiddleware } from 'astro:middleware';
import { getSessionToken } from './lib/auth';

// Routes that require authentication
const PROTECTED_ROUTES = ['/settings', '/api/auth/password', '/api/auth/account', '/api/auth/openrouter'];

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, url, redirect } = context;
  const runtime = (locals as any).runtime;

  // Only run DB-dependent auth logic if runtime/DB is available (i.e., on Cloudflare)
  if (runtime?.env?.DB) {
    const db = runtime.env.DB;
    const token = getSessionToken(request);

    if (token) {
      const session = await db
        .prepare('SELECT * FROM auth_sessions WHERE token = ?')
        .bind(token)
        .first();

      if (session && session.expires_at * 1000 > Date.now()) {
        const user = await db
          .prepare('SELECT id, email, created_at, updated_at FROM users WHERE id = ?')
          .bind(session.user_id)
          .first();

        if (user) {
          (locals as any).user = user;
        }
      }
    }

    // Protect routes
    if (isProtected(url.pathname) && !(locals as any).user) {
      // API routes return 401, pages redirect
      if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ status: 'error', error: 'Not authenticated' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return redirect('/login', 302);
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute(url.pathname) && (locals as any).user) {
      return redirect('/', 302);
    }
  }

  return next();
});
