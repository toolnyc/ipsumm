# Model Routing Guide

Use this when reviewing or updating model selection logic in `src/lib/routing.ts`.

Read `src/lib/routing.ts` and `src/lib/energy-data.ts` before making changes.

## Current Routing Logic

Each mode selects a primary model + ordered fallback chain. Routing uses:
- **Mode** (brainstorm / execute / refine) → determines model tier
- **Temperature** — set per mode, not per model
- **Fallback chain** — ordered list of alternatives if the primary is unavailable or rate-limited

### Temperature Guide

| Mode | Temperature | Why |
|---|---|---|
| Brainstorm | ~0.9 | High — we want creative branching, unexpected connections |
| Execute | ~0.4 | Medium — accurate, not creative |
| Refine | ~0.2 | Low — precise edits, deterministic rewrites |

### Current Models (as of last audit — verify in routing.ts)

| Mode | Primary | Fallbacks |
|---|---|---|
| Brainstorm | Llama 3.3 70B | (check routing.ts) |
| Execute | Claude 3.5 Sonnet | (check routing.ts) |
| Refine | Claude 3.5 Sonnet | (check routing.ts) |

## Adding a New Model

1. **Add to routing.ts** — insert into the relevant mode's candidate list and/or fallback chain
2. **Add to energy-data.ts** — every model in routing must have an A–E energy rating. Missing = build error (or at minimum a UX gap showing no label)
3. **Check the OpenRouter model ID format** — OpenRouter uses `provider/model-name` slugs. Verify the exact ID at openrouter.ai/models
4. **Verify streaming support** — most OpenRouter models support streaming, but confirm before adding to execute/refine which rely on it

## Changing a Mode's Primary Model

- Reasoning pattern must still work with the new model — e.g. brainstorm uses Tree of Thought prompting; check the system prompt in `system-prompts.ts` makes sense for the new model's capabilities
- Temperature may need adjustment — some models behave differently at the same temperature
- Run the system prompt tests: `pnpm test -- system-prompts`

## Model Evaluation Criteria

When choosing a model for a mode, consider:
1. **Energy rating** — prefer A or B rated models, especially for brainstorm (high-volume)
2. **Cost per token** — brainstorm is the highest volume mode; keep it cheap
3. **Context window** — refine needs enough context to hold the prior session
4. **OpenRouter availability** — check model uptime/reliability on openrouter.ai

## Energy Label Requirement

Every model exposed to users needs an entry in `src/lib/energy-data.ts`. The A–E scale is:
- **A** — most efficient (small, quantised, or highly optimised models)
- **B** — efficient
- **C** — moderate
- **D** — high energy
- **E** — highest energy (large frontier models)

Source: Hugging Face AI Energy Score / Luccioni et al. If a model has no published data, estimate conservatively and mark as estimated.
