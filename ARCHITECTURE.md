# Architecture

Phase 1 is a parity refactor: the prototype's rendered UI and behavior,
rebuilt on a maintainable stack. Decisions below include why and what would
make us revisit them.

## Stack

| Area | Choice | Why / revisit trigger |
| --- | --- | --- |
| Framework | Vite + React + React Router (data router, **no loaders**) | Fully client-interactive dashboard, no SEO, client-SDK backend later. Revisit only if several real server needs appear; a single need becomes one Vercel function. |
| Data | Thin TanStack Query over the `AppDataSource` seam | Cross-view mutation invalidation now, Supabase-ready later. Keep it thin — no suspense/infinite/optimistic machinery without a concrete need. |
| Styling | `tokens.css` (prototype's `--imp-*` verbatim) + ported `proto.css` classes + CSS Modules for new structure | Pixel parity with least churn. The Figma design system becomes authoritative in Phase 2; consider Tailwind then only if the Figma tokens arrive Tailwind-mapped. |
| Components | Radix per-component where it maps cleanly (Dialog = yes: focus trap/aria the prototype lacked). Hand-rolled ports elsewhere; small table primitives, no generic DataTable | If a Radix overlay can't match prototype behavior, hand-roll that one component. |
| Forms | Controlled components + tiny validators | 4 small forms. Schema validation (zod) exists where an untrusted boundary exists today: the fixture JSON parsed by `src/demo/fixtures/schema.ts`. Supabase responses get the same treatment in Phase 3. |
| TypeScript | strict + `noUncheckedIndexedAccess`, discriminated unions, no `as`/`!` escape hatches | Domain types are the Phase 3 schema input. |

## Layering (the one mechanically enforced rule)

```
UI components
  → feature hooks (src/features/*/api.ts)
    → data/queries.ts (TanStack Query keys/hooks)
      → AppDataSource interface (src/data/source.ts)
        → FixtureDataSource (src/demo, Phase 1)  |  SupabaseDataSource (Phase 3)
```

ESLint bars importing demo fixtures/seed/scenarios outside `src/data` and
`src/demo`. The `Clock` abstraction (`lib/clock.ts`) is separate from the
data source; direct `new Date()`/`Date.now()` is lint-barred in feature code.

## Routing responsibility

- **Paths** — navigation, major tabs, selected entities:
  `/tracker/{memos,outcomes}`, `/memos/:memoId{,/invoices,/activity}`,
  `/invoices`, `/account`, reserved `/reports/{lcc,pwv,fcm}`, `/bi`
  (placeholder while the BI area is deferred).
- **Query params** — contextual selections and dev state: `?finding=`
  (scroll target), `?prep=1`/`?outcomes=1` (open memo dialogs),
  `?scenario=`, `?demo=`.
- **Local state** — transient UI: filter panels, wizard steps, popovers,
  drill expansion.

## Scenario harness — temporary infrastructure

`src/demo/scenarios.ts` ports the prototype's 17 `applyScenario` cases as
pure seed transforms (+ initial location). The harness bar is gated by
`?demo=1` / `VITE_DEMO_TOOLS=1` and lazy-loaded so the ~1MB fixture chunk
stays out of the main bundle. **Revisit point:** when Supabase mode ships
(Phase 3), decide whether the harness moves behind a build flag or an
internal-only deployment; it must never be reachable in a customer-facing
production build.

## Testing

- **Vitest** — domain derivations, all 17 scenario seed shapes,
  FixtureDataSource mutation behavior.
- **Playwright flows** — tracker filtering, memo drill, dispute wizard
  (manual + connected paths), outcome recording, invoices, account.
- **VRT** — CI gates on the app's own `toHaveScreenshot` baselines
  (`tests/vrt`, deterministic via frozen clock + disabled animations).
  Parity vs the prototype is a human review against
  `tests/reference-prototype/` (cross-implementation pixel-diffing is
  permanently noisy, so it is not auto-gated).
- **A11y** — axe on every route and open overlay (color-contrast excluded
  until the Phase 2 design pass), plus keyboard/focus-return specs.

## Deliberate differences from the prototype

- The `_ensureData` bug (findings reseeded over a scenario's cleared state on
  slow data load) is not replicated.
- Deadlines/countdowns use the frozen demo clock instead of the wall clock,
  so the 2026 demo data doesn't visibly expire.
- Modals gained focus traps, labeled controls, and Escape ordering — the
  invisible a11y baseline the prototype lacked.
- The in-app "Product Notes" overlay was mined into PRODUCT.md, not rebuilt.
- Exports that were toast-only in the prototype remain toast-only, and the
  one real workbook backs every memo download, exactly as before.
