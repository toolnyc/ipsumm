# CLAUDE.md — ipsumm

## What This Is

An **agent harness** built around an intentionality layer — the infrastructure that wraps LLMs
and shapes how non-technical people interact with them. Web-first, open source.
Forces you to define intent before prompting, routes to the right model, tracks outcomes.
Shows the energy and cost impact of every query.

Each mode maps to a distinct reasoning pattern: Brainstorm (Tree of Thought — explore branches),
Execute (ReAct + Reflection — think/act/observe loop with self-critique), Refine (Reflexion —
loads prior session as episodic context, stores critique as memory). Users don't see the labels;
they feel the difference in behavior.

**Project docs:** `~/Dropbox/notes/obsidian/Tool/ipsumm/` (concept doc, epics, session artifacts)

## Target Audience

**Non-technical users** — people currently using ChatGPT etc. who are sending every question
to models that are too big, too slow, or too resource-intensive for the task. Design decisions
(UX, defaults, onboarding) should be evaluated through the lens of someone who's never used
a terminal. First 100 users: AI-skeptical friends who worry about AI resource usage.

## Core Loop

1. User picks a mode (brainstorm, execute, refine)
2. Prompt shaping: guided intake that forces you to define what you actually need
3. Route to optimal model via OpenRouter based on mode + shaped intent
4. Session runs with mode-specific constraints
5. Outtake: "did you get what you needed?" — self-assessed outcome
6. Save structured session artifact (user chooses where)

## Stack

- **Framework:** Astro (fast, lightweight, not bloated)
- **Deployment:** Cloudflare (Pages + Workers) — off big tech, edge-first
- **Model routing:** OpenRouter API via OAuth PKCE (user owns their AI budget)
- **Auth:** ipsumm accounts + OpenRouter OAuth connection
- **Session storage:** Browser (IndexedDB) — working + episodic memory. Exportable, user chooses destination
- **Semantic memory:** User preferences, routing rules, energy label data — persisted as structured rules
- **No heavy backend** — thin API layer for auth + account management only
- **In-browser LLMs (WebLLM/Transformers.js):** Deprioritized — too slow for real use. May revisit as the tech matures.

## V1 Modes

| Mode | Purpose | Routes to | Reasoning pattern |
|---|---|---|---|
| Brainstorm | Explore ideas, think out loud | Fast + cheap via OpenRouter (e.g. Mistral Small, DeepSeek) | Tree of Thought — branches, explores, scores |
| Execute | Get something done | Best model for the task (DeepSeek R1, Sonnet) | ReAct + Reflection — think/act/observe loop with self-critique |
| Refine | Improve previous output | Precise, low-temperature | Reflexion — loads prior session as context, stores critique |

Names are working titles — need non-technical-friendly naming.

**Note on free tier:** In-browser LLMs are too slow to be a real free tier. Brainstorm routes to a
cheap OpenRouter model instead. The "your question never left your device" story is compelling but
premature — revisit when browser LLM tech matures.

## Key Features (V1)

- **Prompt shaping** (killer feature): Guided intake that shapes vague intent into a good prompt. The intentionality layer is non-skippable — it's a bouncer, not a tooltip.
- **Agent harness**: Each mode runs a distinct reasoning loop (ToT / ReAct+Reflection / Reflexion). Users feel the difference without needing to understand it.
- **Three-layer memory**: Working (session context), Episodic (past sessions + outcomes, searchable), Semantic (user preferences, routing rules). Refine mode loads prior episodic context automatically.
- **OpenRouter OAuth**: User connects their AI budget, sets spending limits, ipsumm never handles payments
- **Energy labels**: Each model shows an energy rating (A-E scale, based on AI Energy Score data)
- **Cost + energy dashboard**: See your usage, cost, and estimated energy impact over time
- **Session history**: Note-taking feel — browse, search, and revisit past sessions. Sessions are first-class objects, not chat logs.
- **Artifact export**: Sessions save as structured markdown, user picks destination
- **MCP-ready tool layer**: Design tool integrations against MCP standard from the start (even if v1 has zero integrations). Future-proofs against new model releases.

## Energy Transparency

Based on Hugging Face AI Energy Score research + Luccioni et al. data.
Labels on each model (not per-response). Dashboard view for aggregate stats.

## Onboarding Flow

1. Create ipsumm account (email or social)
2. Connect OpenRouter via OAuth (pre-set $5/month limit) — required to use any mode
3. Try a Brainstorm session (routes to cheapest capable model, costs fractions of a cent)
4. Full access to all modes and models

## Commands (Dev)

```bash
pnpm dev             # Run dev server
pnpm build           # Build for production
pnpm test            # Vitest
```

## Key Principles

- The intentionality layer has teeth. Not a skippable tooltip — a bouncer.
- Modes constrain behavior. Brainstorm explores. Execute delivers. Refine polishes.
- Every session produces a structured artifact, not a disposable chat.
- User owns their data and their AI budget. We never handle payments.
- Show the true cost — in dollars and energy — of every AI interaction.
- Stay off big tech infra. Cloudflare, not AWS. OpenRouter, not locked to one provider.
- Open source, lightweight, no lock-in.

## What Not To Build Yet

- CLI tool (personal project, not v1)
- Native app (later)
- Team features (later)
- Custom mode creation (later — keep 3 modes fixed for now)
- Browser extension (later)
- Paid premium tier (v1 is free, user pays OpenRouter directly)
- In-browser LLM (WebLLM/Transformers.js) — too slow, deprioritized until tech matures
- MCP tool integrations (design the layer, don't build integrations yet)

---

## Architecture Map

Key source files — what each one owns:

| File | Owns |
|---|---|
| `src/lib/auth.ts` | PBKDF2 hashing, session token generation, D1 auth queries |
| `src/lib/db.ts` | D1 database initialisation + typed query helpers |
| `src/lib/openrouter.ts` | OpenRouter API client, streaming, PKCE OAuth flow |
| `src/lib/routing.ts` | Model selection by mode, fallback chains, temperature per mode |
| `src/lib/system-prompts.ts` | Mode-specific system prompts (ToT / ReAct+Reflection / Reflexion) |
| `src/lib/prompt-shaping.ts` | Intake form config, shaped prompt construction |
| `src/lib/session-store.ts` | IndexedDB session CRUD (browser-only) |
| `src/lib/energy-data.ts` | A–E energy ratings per model |
| `src/lib/export.ts` | Session → structured markdown/JSON artifact |
| `src/lib/types.ts` | Shared TypeScript interfaces (User, Session, Message, etc.) |
| `src/middleware.ts` | Route protection — validates session token from cookie via D1 |
| `src/pages/api/chat.ts` | Thin OpenRouter streaming proxy |
| `src/pages/api/auth/openrouter/` | PKCE OAuth endpoints (connect, callback, disconnect, status) |

## Safety Rules

These are hard rules. Do not bend them.

1. **Never commit `.env`** — `ENCRYPTION_KEY` must not appear in git history.
2. **OpenRouter API keys must be encrypted at rest** — AES-GCM with a random IV before writing to D1. Never store plaintext.
3. **Session token validation is server-side only** — middleware must query D1 on every protected request. No client-side-only auth logic.
4. **PBKDF2 iterations stay at 100k minimum** — never reduce for performance reasons.
5. **Never log tokens, API keys, or password hashes** — sanitise error messages before returning to clients.
6. **PKCE code verifier is single-use** — delete from temporary storage immediately after the token exchange.
7. **Migrations are backwards-compatible** — no dropping or renaming columns in production. Add only.
8. **D1 is for structured server data only** — auth, sessions, connections. IndexedDB is for browser session content. Don't mix them.

## Development Patterns

**Cloudflare Workers context** — no Node.js built-ins (`fs`, `path`, `crypto` from node). Use `globalThis.crypto` (Web Crypto API). Env bindings (D1, secrets) come from `context.locals.runtime.env` in Astro API routes, not `process.env`.

**Browser-only code** — `session-store.ts` and anything touching `idb` / `window` / `IndexedDB` must never be imported from server-side code. Guard with `typeof window !== 'undefined'` or keep it in client-side `.ts` files not referenced by API routes.

**Streaming responses** — use `ReadableStream` + `TransformStream` with SSE format (`data: ...\n\n`). Not WebSockets. The `chat.ts` API route pipes OpenRouter's stream directly to the client.

**API routes** — all in `src/pages/api/`. They are Astro server endpoints (export `GET`/`POST` async functions). Access runtime via `context.locals.runtime`.

**Adding a new model** — update `src/lib/routing.ts` (add to the mode's candidate list + fallback chain) AND `src/lib/energy-data.ts` (add its A–E rating). Both or neither.

## Testing

Tests live in `tests/` and run with Vitest (`pnpm test`).

- Mock OpenRouter streaming responses — never make real API calls in tests.
- Auth tests use in-memory mocks for D1 — see existing patterns in `tests/auth.test.ts`.
- Run tests before every commit and before deploying.
- Use `/deploy` command for the full pre-deploy checklist.

## Custom Commands

Project-specific Claude Code slash commands are in `.claude/commands/`:

| Command | Use when |
|---|---|
| `/deploy` | About to deploy — runs preflight checklist |
| `/auth-review` | Touching auth.ts or openrouter OAuth endpoints |
| `/routing` | Updating model selection or adding a new model |
| `/energy` | Updating energy ratings or model list |
| `/debug` | Session/storage/streaming issues |
