# CLAUDE.md — ipsumm

## What This Is

Intentionality and cost-optimization layer between users and LLMs. Web-first, open source.
Forces you to define intent before prompting, routes to the right model, tracks outcomes.
Shows the energy and cost impact of every query.

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
- **In-browser models:** WebLLM / Transformers.js for free tier (zero server cost, zero water)
- **Auth:** ipsumm accounts + OpenRouter OAuth connection
- **Session storage:** Browser (IndexedDB) by default, exportable, user chooses destination
- **No heavy backend** — thin API layer for auth + account management only

## V1 Modes

| Mode | Purpose | Routes to | Constraints |
|---|---|---|---|
| Brainstorm | Explore ideas, think out loud | Fast + cheap (small models, in-browser option) | No finalizing, encourages divergent thinking |
| Execute | Get something done | Best model for the task (Sonnet, DeepSeek) | Requires clear intent from prompt shaping |
| Refine | Improve previous output | Precise, low-temperature | Must reference a previous session |

Names are working titles — need non-technical-friendly naming.

## Key Features (V1)

- **Prompt shaping** (killer feature): Guided intake that shapes vague intent into a good prompt
- **OpenRouter OAuth**: User connects their AI budget, sets spending limits, ipsumm never handles payments
- **In-browser LLM**: Free tier runs entirely in user's browser — "your question never left your device"
- **Energy labels**: Each model shows an energy rating (A-E scale, based on AI Energy Score data)
- **Cost + energy dashboard**: See your usage, cost, and estimated energy impact over time
- **Session history**: Note-taking feel — browse, search, and revisit past sessions
- **Artifact export**: Sessions save as structured markdown, user picks destination

## Energy Transparency

Based on Hugging Face AI Energy Score research + Luccioni et al. data.
Labels on each model (not per-response). Dashboard view for aggregate stats.
In-browser models show as "zero cloud energy" to contrast with cloud models.

## Onboarding Flow

1. Create ipsumm account (email or social)
2. Try a brainstorm session in-browser (free, no OpenRouter needed, runs on-device)
3. "Want more powerful models?" → Connect OpenRouter via OAuth (pre-set $5/month limit)
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
