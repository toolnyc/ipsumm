# Energy Labels Guide

Use this when updating model energy ratings or auditing the energy label system.

Read `src/lib/energy-data.ts` before making changes.

## The A–E Scale

Based on Hugging Face AI Energy Score research (Luccioni et al.).

| Label | Meaning | Typical models |
|---|---|---|
| A | Most efficient | Small/quantised local models, tiny specialised models |
| B | Efficient | Mid-size open models (7–13B), optimised inference |
| C | Moderate | Large open models (70B+), mid-size closed models |
| D | High energy | Large closed models, heavy inference |
| E | Highest energy | Largest frontier models (GPT-4 scale+) |

Labels are **per model**, not per response. The label reflects the model's general energy footprint — not any specific query.

## Data Sources

1. **Hugging Face AI Energy Score** — primary source; published per-model scores
2. **Luccioni et al. papers** — academic baseline data
3. **OpenRouter model cards** — sometimes include efficiency notes
4. **Estimation** — if no published data, estimate conservatively (lean towards worse rating) and mark as `estimated: true` in the data

## Adding a New Model

1. Find the model's published energy data (links above)
2. Add an entry to `src/lib/energy-data.ts` with:
   - OpenRouter model ID (exact slug)
   - Rating: `'A' | 'B' | 'C' | 'D' | 'E'`
   - `estimated: true` if no published data was found
   - Source reference (URL or paper citation)
3. If estimated, add a TODO comment noting what data would confirm the rating

**A model in routing.ts with no energy-data.ts entry will show no label in the UI.** This is a gap — always add both together.

## Auditing the Label List

Check that every model referenced in `src/lib/routing.ts` has an entry in `src/lib/energy-data.ts`:

```bash
# Quick manual check: compare model IDs across both files
```

Also check that label data reflects current model versions — providers sometimes update models under the same name (e.g. claude-3-5-sonnet-20241022 vs earlier versions have different profiles).

## Displaying Labels

Energy labels are displayed:
- On the mode selector (per recommended model)
- On the session header (active model)
- On the dashboard (aggregate cost + energy over time)

The A–E label is the user-facing representation. Non-technical users don't know what "70B parameters" means — they do understand "this is like an A-rated appliance vs. a hairdryer."
