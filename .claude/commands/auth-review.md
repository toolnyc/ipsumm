# Auth Security Review

Use this checklist when touching any of:
- `src/lib/auth.ts`
- `src/lib/openrouter.ts`
- `src/pages/api/auth/**`
- `src/middleware.ts`

Read the relevant files before proceeding. Do not guess at current implementation details.

## Password Hashing

- [ ] PBKDF2 iteration count is **100,000 minimum** — verify the constant in `auth.ts` is unchanged
- [ ] Salt is generated fresh per-user (random 16+ bytes) — never reused
- [ ] Hash comparison uses constant-time comparison — no early-exit string comparison
- [ ] Error messages on login failure are generic ("invalid credentials") — never leak which field was wrong

## Session Tokens

- [ ] Tokens are generated with `crypto.getRandomValues` — not `Math.random`
- [ ] Token length is 32+ bytes (64+ hex chars)
- [ ] Token validation always hits D1 — no in-memory cache that could become stale
- [ ] Expired tokens are rejected and deleted — check the `expires_at` comparison in middleware
- [ ] Logout deletes the token row from D1 — not just clearing a cookie

## OpenRouter API Key Encryption

- [ ] API key is encrypted with AES-GCM before D1 write — never plaintext
- [ ] A fresh IV is generated per-encryption — never reuse IVs
- [ ] Both `encrypted_api_key` and `iv` columns are written atomically
- [ ] Decryption errors are caught and result in a disconnect — no partial or stale state returned to client
- [ ] `ENCRYPTION_KEY` is read from `runtime.env`, not hardcoded

## PKCE OAuth Flow

- [ ] Code verifier is cryptographically random (43–128 chars, Base64URL)
- [ ] Code challenge is SHA-256 of the verifier — never send the verifier to the auth server
- [ ] State parameter is random and validated on callback — protects against CSRF
- [ ] Code verifier and state are stored temporarily (session/cookie) and deleted after use
- [ ] Token exchange only happens on the server — the API key never touches the client

## Route Protection

- [ ] `src/middleware.ts` covers all protected routes — check the matcher list
- [ ] API routes that mutate data validate the session cookie server-side before acting
- [ ] `/api/auth/openrouter/*` endpoints validate the user session — not just the presence of a cookie

## Error handling

- [ ] No stack traces leaked to API response bodies
- [ ] Auth errors return 401, not 500
- [ ] D1 errors are caught — a database failure should not result in a 200 with empty data
