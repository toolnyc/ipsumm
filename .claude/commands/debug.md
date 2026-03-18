# Debug Guide

Use this when something is broken and you're not sure where to look.

## Session / IndexedDB Issues

**Symptom:** Sessions not persisting, history missing, export broken.

1. Open browser DevTools → Application → IndexedDB — find the ipsumm database and inspect the object stores
2. Check `src/lib/session-store.ts` — all IndexedDB ops are here
3. Common causes:
   - Schema mismatch after a `session-store.ts` change — the existing DB has an old schema. Clear it in DevTools or bump the DB version to trigger `onupgradeneeded`
   - Serialisation error — check if `JSON.stringify` is failing on any session field (circular refs, non-serialisable types)
   - `idb` version mismatch — check `package.json` for the `idb` version

**To reset IndexedDB in dev:**
DevTools → Application → IndexedDB → right-click the database → Delete database. Reload.

## OpenRouter Streaming Issues

**Symptom:** Chat response never appears, stream hangs, or partial content.

1. Check `src/pages/api/chat.ts` — this is the streaming proxy
2. Check browser DevTools → Network → the `/api/chat` request — look at the response stream as it arrives
3. Common causes:
   - OpenRouter API key not connected — check `/api/auth/openrouter/status`
   - Streaming format mismatch — OpenRouter sends `data: [DONE]` as the final chunk; ensure the client handles it
   - Cloudflare Workers streaming — Workers requires `TransformStream` with proper backpressure. Avoid buffering the full response

**To test the streaming proxy in isolation:**
```bash
curl -X POST http://localhost:4321/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_TOKEN" \
  -d '{"mode":"brainstorm","messages":[{"role":"user","content":"hello"}]}'
```

## Auth Issues

**Symptom:** Login not working, protected routes redirecting incorrectly, OpenRouter OAuth failing.

1. Check `src/middleware.ts` — verify the route matcher includes/excludes the right paths
2. Check D1 directly:
```bash
wrangler d1 execute ipsumm-db --local --command "SELECT * FROM auth_sessions WHERE token = 'YOUR_TOKEN';"
```
3. PKCE OAuth callback issues — check browser console for redirect errors; verify the callback URL registered in OpenRouter matches exactly
4. Common causes:
   - Cookie not being sent — check `SameSite` and `Secure` cookie attributes
   - Session expired — `expires_at` in D1 is in the past; user needs to log in again
   - `ENCRYPTION_KEY` changed — existing encrypted API keys can't be decrypted; users need to reconnect

## Cloudflare Workers Runtime Issues

**Symptom:** Works in `pnpm dev` but breaks after deploy.

1. Check for Node.js built-ins — Workers doesn't support `fs`, `path`, `process.env`, etc.
2. Use `globalThis.crypto` instead of `require('crypto')`
3. Check `wrangler.toml` — verify D1 binding name matches what the code expects (`DB`)
4. Check env bindings — `context.locals.runtime.env` in Astro, not `process.env`

**View live logs after deploy:**
```bash
wrangler tail
```

## TypeScript / Build Issues

```bash
pnpm build          # Full build with type checking
npx tsc --noEmit   # Type check only (faster)
```

Check that `src/lib/types.ts` exports are up to date with any new fields you added to interfaces.

## Test Failures

```bash
pnpm test                          # All tests
pnpm test -- routing               # Just routing tests
pnpm test -- --reporter=verbose    # Verbose output
```

If a test mocks OpenRouter and it's failing, check that the mock response format still matches what the OpenRouter client in `openrouter.ts` expects (response shape, streaming format).
