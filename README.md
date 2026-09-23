# Implentio Customer App

Implentio audits a brand's 3PL parcel and fulfillment invoices against
contracted carrier rate cards, publishes credit memos of overcharges, and
helps the brand dispute them and track what gets collected. This repository
is the production rebuild of the Phase-1 prototype (kept in `prototype/` as
the parity reference) — currently running on typed fixture data with a demo
scenario harness; Supabase backing arrives in a later phase (ROADMAP.md).

## Setup

```bash
npm install
npx playwright install chromium   # for tests
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` / `preview` | Production build / local preview |
| `npm run lint` / `typecheck` / `test` | ESLint / tsc / Vitest unit tests |
| `npm run e2e` | Playwright: flows, a11y, visual-regression baselines |

## Demo mode

The app ships with fixture data. Append `?demo=1` to show the scenario
harness bar and `?scenario=<id>` to seed a specific demo state, e.g.
`/memos/CM-2026-0630?scenario=dispute-awaiting&demo=1`. The demo clock is
frozen at Sep 17, 2026 so deadline countdowns render as designed.

## Deployment

Vercel static deployment; `vercel.json` carries the SPA rewrite. CI
(GitHub Actions) runs lint, typecheck, unit tests, build, and Playwright.

## Documentation

- `ARCHITECTURE.md` — stack decisions, data seam, revisit triggers
- `PRODUCT.md` — the 309 requirement notes mined from the prototype
- `DATABASE.md` — entity notes for the future Supabase schema (not a schema)
- `ROADMAP.md` — phases
- `CLAUDE.md` — working agreements for AI-assisted development
