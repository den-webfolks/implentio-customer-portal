# Architecture

Phase 1 is a parity refactor: the prototype's rendered UI and behavior,
rebuilt on a maintainable stack. Decisions below include why and what would
make us revisit them.

## Stack

| Area | Choice | Why / revisit trigger |
| --- | --- | --- |
| Framework | Vite + React + React Router (data router, **no loaders**) | Fully client-interactive dashboard, no SEO, client-SDK backend later. Revisit only if several real server needs appear; a single need becomes one Vercel function. |
| Data | Thin TanStack Query over the `AppDataSource` seam | Cross-view mutation invalidation now, Supabase-ready later. Keep it thin — no suspense/infinite/optimistic machinery without a concrete need. |
| Styling | `tokens.css` mirrors the Figma variables (`--ds-*`) + text styles (`ds-*` classes); CSS Modules per component. `--imp-*` survive only as deprecated aliases; `proto.css` keeps prototype layout classes until Phase 2b | Figma is the UI source of truth (DESIGN-SYSTEM.md). No Tailwind: the Figma variables map 1:1 to CSS custom properties. |
| Components | `src/ui/` base layer built to the Figma library. Radix underneath where it maps cleanly (Dialog, Tooltip, DropdownMenu, Select); native inputs for checkbox/radio; small table primitives, no generic DataTable; Heroicons | Radix supplies behaviour and a11y only — visuals come from Figma, never shadcn defaults. |
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
  (scroll target), `?send=1` (opens Review & send; removed on close),
  `?confirm=1` (opens it on "Did you send it?" for a prepared email),
  `?outcomes=1`/`?dispute=1` (scroll to the memo's dispute cards),
  `?scenario=`, `?demo=`.
- **Local state** — transient UI: filter panels, popovers, disclosure and
  "smaller findings" expansion, the package view.

## Scenario harness — temporary infrastructure

`src/demo/scenarios.ts` ports the prototype's 17 `applyScenario` cases as
pure seed transforms (+ initial location), plus `dispute-deadline` (Phase 1
dispute flow: a deadline two days out and one expired finding) and
`dispute-prepared` / `dispute-prepared-late` (an email that left the app and
was never confirmed as sent; the late one past its deadline). Dispute
records for seeded pursuits are derived after the transform
(`withSeedDisputes`), one per send time. The harness bar is gated by
`?demo=1` / `VITE_DEMO_TOOLS=1` and lazy-loaded so the ~1MB fixture chunk
stays out of the main bundle. **Revisit point:** when Supabase mode ships
(Phase 3), decide whether the harness moves behind a build flag or an
internal-only deployment; it must never be reachable in a customer-facing
production build.

## Testing

- **Vitest** — domain derivations, all 18 scenario seed shapes,
  FixtureDataSource mutation behavior.
- **Playwright flows** — tracker filtering, tick → Review & send →
  dispute card, one-click outcomes, whole-memo dispute, invoices, account.
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
- Dispute flow, Phase 1 (2026-09-24): one memo status shared by every screen,
  dispute records, "Won't pursue", Expired, per-memo activity — see
  DESIGN-SYSTEM.md "Parcel dispute flow — Phase 1".
- Review & send (2026-09-25): a `DisputeRecord` has a `state` — `prepared`
  (the email left the app: copied, opened in a mail app or web compose, or a
  file downloaded; findings reserved, one per memo), `sent`, or `discarded`
  (kept for the history) — plus `handoffs[]` (a version per handoff) and
  `attachments[]`. Seam methods `prepareDispute` (create or add a handoff),
  `confirmDisputeSent(id, sentOn)` (backdatable to the day it was prepared,
  flags `sentAfterDeadline`) and `discardPreparedDispute`. The email text,
  files and compose links come from `src/domain/dispute-email.ts`; the demo
  builds .csv per finding and a minimal real PDF summary in the browser
  (`lib/pdf.ts`). See DESIGN-SYSTEM.md "Review & send — steps and the
  'prepared' email".
- Tracker, Phase 2b (2026-09-25): memos grouped by the shared status, a
  summary strip on the same money buckets as Credit outcomes — see
  DESIGN-SYSTEM.md "Parcel Credit Tracker — Phase 2b". Rule: a memo's
  headline (`netN`) equals the sum of its finding rows; the fixture test
  enforces it.
- Demo limitation (kept by decision, 2026-09-25): every memo page shows the
  golden memo's findings, draft, and disputes. The tracker and Credit
  outcomes use each memo's own rows (golden findings; `outcomeGroups` on
  every other memo with overcharges), so non-golden tracker rows have real
  statuses and actions, but the page they link to shows the golden data —
  demo walkthroughs should use CM-2026-0630 and the scenarios. The Supabase
  source keys all of it by memo.
