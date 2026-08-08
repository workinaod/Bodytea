# NAOD V3 — Hybrid Athlete Training Companion

A phone-first PWA that turns the NAOD V3 16-week hybrid athlete plan into a
day-by-day coach: guided sessions with full exercise tutorials, automatic
deload weeks, busy-week fallback tiers, protein-first meal logging, progress
tracking — and a drill-sergeant accountability layer that demands calendar
proof before it lets a skipped day slide.

**Live app:** https://workinaod.github.io/Bodytea/
(open on your phone → Share → **Add to Home Screen**)

## What it does

- **Today** — the resolved session for any date: 4-week block rotation,
  A/B week alternation, deloads every 4th week, readiness-check downgrades
  on CNS days, DJ-gig and bad-sleep adjustments. Per-set logging with
  weight prefills, auto rest timer, step-by-step exercise guides
  (how / what it targets / why it's in the plan / mistakes / video),
  and a post-session debrief (recap, recovery, eat-now with live protein
  numbers, sleep, tomorrow preview) driven by a data-aware insight engine.
- **Week** — tier picker (full 5-day / 3-day fallback / 2-day minimum),
  tier-2/3 day placement, gig flags, cardio-backup planner for no-ball weeks.
- **Meals** — protein + calorie rings vs auto training/rest targets, one-tap
  PDF meal templates, food chips, supplements, grocery list.
- **Progress** — weekly check-ins (weight/waist/chest/arms/thigh/vert +
  photos), e1RM and measurement charts, adherence heatmap, photo compare.
- **Coach** — the record of everything, excuse ledger with proof receipts,
  motivation library, the full plan readable in-app, settings, and one-tap
  backup export/import.

All data stays on-device (localStorage + IndexedDB). Export/import moves
everything between devices as a single JSON file.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # vitest — engine/data/store suites (the program-logic contract)
npm run build      # typecheck + production build (dist/)
npm run e2e        # Playwright smoke vs built preview (PW_CHROMIUM_PATH to point at a browser)
node scripts/visual-check.mjs   # screenshot walkthrough of every screen
```

Pushes to `main` (and the active feature branch) deploy to GitHub Pages via
`.github/workflows/deploy.yml`.

## Architecture

```
src/plan/      the NAOD V3 program as typed DATA (exercises, templates,
               rotation, foods, messages, guide) — content edits live here
src/engine/    pure functions: resolveDay pipeline, transforms, coach
               escalation, insight rules, stats, reconcile — fully unit-tested
src/store/     localStorage envelope (versioned + zod-validated), IndexedDB
               photos, export/import
src/screens/   the five tabs + onboarding + reconcile gate
```
