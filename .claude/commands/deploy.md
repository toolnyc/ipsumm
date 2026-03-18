# Pre-Deploy Checklist

Run through each item before deploying ipsumm to Cloudflare Workers. Do not skip steps.

## 1. Tests

```bash
pnpm test
```

All tests must pass. Fix failures before proceeding — do not deploy a broken build.

## 2. Build

```bash
pnpm build
```

Confirm the build completes without TypeScript errors. The `scripts/fix-wrangler-config.cjs` script runs automatically via `pnpm deploy` — but verify the build succeeds first.

## 3. Security check

Review any changes to these files for security regressions:
- `src/lib/auth.ts` — PBKDF2 params, session token generation
- `src/lib/openrouter.ts` — API key encryption, PKCE flow
- `src/pages/api/auth/` — auth endpoint logic
- `src/middleware.ts` — route protection coverage

If any of these changed, run `/auth-review` before deploying.

## 4. Environment

Verify the following secrets are set in Cloudflare Workers:
- `ENCRYPTION_KEY` — 32-byte hex key for AES encryption of OpenRouter API keys

```bash
wrangler secret list
```

If `ENCRYPTION_KEY` is missing or changed, any existing user connections will break (encrypted API keys won't decrypt).

## 5. Migrations

Check if new migrations need to be applied:

```bash
pnpm db:migrate
```

Migrations apply to production D1. Confirm the migration SQL is backwards-compatible (no column drops, no renames) before applying.

## 6. Deploy

```bash
pnpm deploy
```

This runs build → fix-wrangler-config → wrangler deploy. Verify the deployment URL after completion.

## 7. Smoke test

Hit the `/api/health` endpoint on the deployed URL. Confirm it returns 200.

Check the Cloudflare dashboard for any Worker errors in the first 5 minutes post-deploy.
