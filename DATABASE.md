# Database notes — NOT a schema

Supabase arrives in Phase 3. Nothing here is DDL; these are the entities the
Phase-1 domain model (`src/domain/types.ts`) implies, plus the open questions
that must be answered before writing migrations. Do not write SQL, RLS
policies, or auth models from this file alone.

## Working assumption

Implentio's internal pipeline ("Toolbelt") produces finished audits; the
customer app **ingests prepared results** (memos, findings, packages, report
files) and owns presentation, dispute management, and outcomes. This is the
safest reading of the prototype (memos are "Prepared by John / Implentio"
from spreadsheets) but is explicitly **undecided** — confirm before schema
work.

## Entities the UI needs persisted

- **Account / tenant** (brand) — demo shows one brand with several Billers.
- **Users & invites** — name, email, Active/Invited; no roles in this
  release ("Roles and permissions are not configurable").
- **Biller (3PL) contacts** — contact, email, cc, active, one default
  dispute contact per Biller (uniqueness enforced).
- **Credit memos** — id, Biller, period, cadence, status, totals, carriers,
  **versions** (current/superseded, change summaries) and report files
  (xlsx/pdf) per version.
- **Finding groups** — category/driver copy, totals, charge mix, service
  slices, and **packages** (852 rows on the golden memo: tracking, order,
  invoice, ship date, zone, weight, per-charge invoiced/expected pairs).
  Open question: store package level or only service-level rollups?
- **Dispute state per finding group** — pursuit, deadline, pursued at/by/via,
  and **collection outcome** (awaiting/partial/full/not_issued, amount,
  date, reason, edit history).
- **Report-level disputes** (LCC/PWV/FCM, Phase 1.5) — same lifecycle keyed
  `kind:id`.
- **Invoices index** — full-invoice totals vs eligible parcel amounts,
  review status (variance/clear/pending/historical), memo association
  (independent fields — PRODUCT.md note 166).
- **Download events** — who downloaded which memo version when (shown as
  attribution in the UI).
- **Email connections** — per-user Gmail/Outlook OAuth (notes 305, 314:
  per-user tokens; distinct reconnect-required vs admin-required states).
- **Activity log** — report versions, downloads, dispute submissions,
  outcome changes.

## Derived (compute, don't store)

Memo rollup statuses, outcome summaries and by-Biller collection rates,
recovery donut amounts, next-step card state, invoice classification, and
every formatted display string.

## Open questions (blockers for schema work)

1. Ingestion contract: how do prepared results arrive (API push, file drop,
   shared DB)? Owner: Implentio internal pipeline team.
2. Dispute deadline granularity: per invoice, per package, or per memo?
   (PRODUCT.md note 351 raises this explicitly.)
3. Tenancy model and auth (Supabase Auth?) — deferred with Phase 3.
4. Report file storage (Supabase Storage vs external) and signed-URL policy.
5. Whether memo versions are immutable snapshots (the UI strongly implies
   yes — superseded versions stay downloadable).
