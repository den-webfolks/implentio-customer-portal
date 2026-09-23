# Roadmap

## Phase 1 — Production parity refactor (this repo, done)

Core reconciliation at parity on the production stack: app shell + nav,
Parcel Credit Tracker (memos + outcomes), memo detail (findings drill,
dispute wizard, outcome recording, invoices, activity), invoices index,
account settings, 17-scenario demo harness, tests (unit / flows / a11y /
VRT). Fixture data only; no auth (demo tool).

## Phase 1.5 — Remaining report products

LCC, PWV, and FCM screens (routes are reserved, scenarios exist but are
marked unavailable, report assets are already extracted). They reuse the
tracker/outcomes patterns and the report-dispute lifecycle already modeled
in `reportDisputes`.

## Phase 2 — Figma design-system migration

The in-progress Figma system becomes authoritative for tokens, components,
and styling. Work lands in `tokens.css` + component styles behind the same
markup; consider Tailwind only if the Figma tokens arrive Tailwind-mapped.
Also the moment to fix logged design debt (e.g. color contrast excluded from
axe in Phase 1).

## Phase 3 — Supabase + auth

`SupabaseDataSource` implements `AppDataSource`; Supabase Auth + tenancy;
schema per DATABASE.md once the ingestion contract and deadline-granularity
questions are answered. Migrations + RLS from day one. Decide the scenario
harness's fate (internal-only or removed from customer builds). Real email
send (Gmail/Outlook OAuth) replaces the simulation.

## Phase 4 — Product improvements

UX changes, redesigns, performance, new features — including the BI
("Logistics Cost Performance") area, which the prototype marks as largely
illustrative and which stays a placeholder until then.
