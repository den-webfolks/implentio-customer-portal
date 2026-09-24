# Claude Code guide — implentio-customer-app

Production rebuild of the Implentio customer app (billing-audit & recovery
for e-commerce brands). Phase 1 rebuilt the prototype in `prototype/` at
parity; Phase 2a aligns the shared components with the Figma design library
(DESIGN-SYSTEM.md); Phase 2b will restyle page layouts. See ARCHITECTURE.md for
decisions, PRODUCT.md for the mined requirements, ROADMAP.md for phases.

## Commands

- `npm run dev` — Vite dev server
- `npm run lint` / `npm run typecheck` / `npm test` — ESLint, tsc, Vitest
- `npm run e2e` — full Playwright suite (e2e + a11y + VRT); `npx playwright
  test tests/vrt --update-snapshots` after an intentional visual change
- `node tools/decode-template.mts` — regenerate `.local/template-decoded.html`
  (the readable prototype source; git-ignored, needed by other tools)
- `node tools/extract-fixtures.mts` / `extract-assets.mts` — re-extract
  fixture JSON / binary assets from the prototype bundle
- `node tools/mine-notes.mts` — regenerate PRODUCT.md from the prototype
- `node tools/capture-prototype-refs.mts` — refresh the prototype reference
  screenshots in `tests/reference-prototype/`
- `node tools/screenshot.mts <url> <out.png> [w] [h]` — ad-hoc screenshot for
  side-by-side parity review
- `/dev/components` — dev-server-only component gallery (`src/dev/`), incl.
  the Figma foundations; not routed in production builds. Add a section to
  `ComponentGallery.tsx` when you add or change a shared component.

## Hard rules

1. **Data seam:** screens call feature hooks (`src/features/*/api.ts`) →
   `src/data/queries.ts` → the `AppDataSource` interface. Never import
   `src/demo/fixtures/*`, `fixture-source`, `seed`, or `scenarios` outside
   `src/data`/`src/demo` (lint-enforced). Supabase lands in Phase 3 as a
   second `AppDataSource` implementation — do not wire it into screens.
2. **Frozen clock:** feature/UI/domain code never calls `new Date()` /
   `Date.now()` (lint-enforced); read time via `lib/clock.ts`. Fixture mode
   freezes "now" at `DEMO_NOW` (Sep 17, 2026) so the 2026 demo deadlines
   render as designed and VRT stays deterministic.
3. **Figma is the UI source of truth:** Figma library `oUoO45rZLwUB0rNJpIAyrX`
   (mapping in DESIGN-SYSTEM.md). Use the shared components in `src/ui/` and
   the `--ds-*` tokens / `ds-*` text classes from `src/styles/tokens.css`;
   never new hex values, never `--imp-*` (deprecated aliases) in new code.
   Fix a shared component rather than adding per-screen overrides. Icons are
   Heroicons (`@heroicons/react`).
4. **Components now, layouts later:** until Phase 2b, don't redesign page
   layout, grids, section spacing, or page headers. The responsive shell
   (compact nav below 720px) and container-query breakpoints already landed —
   adapt page helpers to the `page` container, not the viewport. Don't change
   copy or flows unless Figma guidance or the user requires it — record such
   changes in DESIGN-SYSTEM.md.
5. The prototype in `prototype/` is a frozen reference — never edit it.

## Demo/scenario harness (temporary infrastructure)

`?demo=1` shows the scenario picker; `?scenario=<id>` seeds the fixture store
(17 scenarios, see `src/demo/scenarios.ts`). Useful URLs:
`/tracker/memos?demo=1`, `/memos/CM-2026-0630?scenario=dispute-awaiting&demo=1`.
Playwright tests use these as setup. Revisit/remove before any
customer-facing deployment (see ARCHITECTURE.md).

## Reference

- Runnable prototype: `prototype/original/Implentio App End to End
  (standalone).html` (open in a browser; its harness selects scenarios).
- Decoded app source: `.local/template-decoded.html` — markup lines
  1031–7228, DCLogic component 7230+, requirement notes 7664–7987.
- Demo data quirks that are intentional: invoice-index full totals are
  hash-fabricated (note 96); the golden memo is the only one with real
  drill-down data; LCC/PWV sample files come from other real Implentio
  customers (Promix, Tushy) — do not show externally.
- Known prototype bug NOT replicated: `_ensureData` reseeded findings over a
  scenario's cleared state on first load.
