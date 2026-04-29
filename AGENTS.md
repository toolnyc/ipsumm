# ipsumm — Agent Instructions

## What This Is

An **agent harness** built around an intentionality layer — the infrastructure that wraps LLMs
and shapes how non-technical people interact with them. Web-first, open source.
Forces you to define intent before prompting, routes to the right model, tracks outcomes.
Shows the energy and cost impact of every query.

Each mode maps to a distinct reasoning pattern: Brainstorm (Tree of Thought — explore branches),
Execute (ReAct + Reflection — think/act/observe loop with self-critique), Refine (Reflexion —
loads prior session as episodic context, stores critique as memory). Users don't see the labels;
they feel the difference in behavior.

**Project docs:** `~/Dropbox/Notes/Obsidian/Tool/ipsumm/`

## Target Audience

**Non-technical users** — people currently using ChatGPT etc. who are sending every question
to models that are too big, too slow, or too resource-intensive for the task. First 100 users:
AI-skeptical friends who worry about AI resource usage.

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
- **Session storage:** Browser (IndexedDB) — working + episodic memory. Exportable
- **Semantic memory:** User preferences, routing rules, energy label data
- **No heavy backend** — thin API layer for auth + account management only

## V1 Modes

| Mode | Purpose | Routes to | Reasoning pattern |
|---|---|---|---|
| Brainstorm | Explore ideas, think out loud | Fast + cheap via OpenRouter | Tree of Thought — branches, explores, scores |
| Execute | Get something done | Best model for the task | ReAct + Reflection — think/act/observe loop with self-critique |
| Refine | Improve previous output | Precise, low-temperature | Reflexion — loads prior session as context, stores critique |

## Key Features (V1)

- **Prompt shaping** (killer feature): Guided intake that shapes vague intent into a good prompt
- **Agent harness**: Each mode runs a distinct reasoning loop (ToT / ReAct+Reflection / Reflexion)
- **Three-layer memory**: Working (session context), Episodic (past sessions + outcomes), Semantic (user preferences, routing rules)
- **OpenRouter OAuth**: User connects their AI budget, sets spending limits
- **Energy labels**: Each model shows an energy rating (A-E scale, based on AI Energy Score data)
- **Cost + energy dashboard**: See your usage, cost, and estimated energy impact over time
- **Session history**: Note-taking feel — browse, search, and revisit past sessions
- **Artifact export**: Sessions save as structured markdown, user picks destination
- **MCP-ready tool layer**: Design tool integrations against MCP standard from the start

## Commands

```bash
pnpm dev             # Run dev server
pnpm build           # Build for production
pnpm test            # Vitest
```

## Architecture Map

| File | Owns |
|---|---|
| `src/lib/auth.ts` | PBKDF2 hashing, session token generation, D1 auth queries |
| `src/lib/db.ts` | D1 database initialisation + typed query helpers |
| `src/lib/openrouter.ts` | OpenRouter API client, streaming, PKCE OAuth flow |
| `src/lib/routing.ts` | Model selection by mode, fallback chains, temperature per mode |
| `src/lib/system-prompts.ts` | Mode-specific system prompts (ToT / ReAct+Reflection / Reflexion) |
| `src/lib/prompt-shaping.ts` | Intake form config, shaped prompt construction |
| `src/lib/session-store.ts` | IndexedDB session CRUD (browser-only) |
| `src/lib/energy-data.ts` | A-E energy ratings per model |
| `src/lib/export.ts` | Session -> structured markdown/JSON artifact |
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/middleware.ts` | Route protection — validates session token from cookie via D1 |
| `src/pages/api/chat.ts` | Thin OpenRouter streaming proxy |
| `src/pages/api/auth/openrouter/` | PKCE OAuth endpoints |

## Safety Rules

1. **Never commit `.env`** — `ENCRYPTION_KEY` must not appear in git history.
2. **OpenRouter API keys must be encrypted at rest** — AES-GCM with a random IV before writing to D1.
3. **Session token validation is server-side only** — no client-side-only auth logic.
4. **PBKDF2 iterations stay at 100k minimum.**
5. **Never log tokens, API keys, or password hashes.**
6. **PKCE code verifier is single-use** — delete after token exchange.
7. **Migrations are backwards-compatible** — add only.
8. **D1 is for structured server data only** — IndexedDB for browser session content.

## Development Patterns

**Cloudflare Workers context** — no Node.js built-ins. Use Web Crypto API. Env bindings come from `context.locals.runtime.env`.

**Browser-only code** — `session-store.ts` and anything touching IndexedDB must never be imported from server-side code.

**Streaming responses** — use `ReadableStream` + `TransformStream` with SSE format. Not WebSockets.

**Adding a new model** — update `src/lib/routing.ts` AND `src/lib/energy-data.ts`. Both or neither.

## Key Principles

- The intentionality layer has teeth. Not a skippable tooltip — a bouncer.
- Modes constrain behavior. Brainstorm explores. Execute delivers. Refine polishes.
- Every session produces a structured artifact, not a disposable chat.
- User owns their data and their AI budget. We never handle payments.
- Show the true cost — in dollars and energy — of every AI interaction.
- Stay off big tech infra. Cloudflare, not AWS. OpenRouter, not locked to one provider.
- Open source, lightweight, no lock-in.

## What Not To Build Yet

- CLI tool, native app, browser extension
- Team features
- Custom mode creation (keep 3 modes fixed)
- In-browser LLM (too slow, revisit when tech matures)
- MCP tool integrations (design the layer, don't build integrations)
