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

## Phase 2 — Figma design-system alignment

**2a — components (in progress).** Figma foundations (Inter, semantic colour
variables, radii, effects, text styles) and the shared components the app
uses are rebuilt to the Figma library and adopted by every screen; unused
Figma components stay out of scope. Mapping, decisions and status live in
DESIGN-SYSTEM.md.

**2b — layouts.** Page shells, grids, containers, page headings, sidebar,
section spacing and responsive composition move to the Figma design
language. Already landed early (interface review, 2026-09-24): the compact
shell with a navigation drawer, container-query breakpoints, table scroll
cues, and axe colour-contrast checks (re-enabled and passing).

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
