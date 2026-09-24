# Design-system alignment

Working document for aligning the app's shared UI with the Figma library
**"Implentio Library (Copy)"** (`oUoO45rZLwUB0rNJpIAyrX`). Scope is set by what
the app uses, not by what Figma contains. Phase 2a (components) implemented
2026-09-24; see *Migration status* below. Live reference: `/dev/components`.

- **2a — components** (this phase): foundations + shared components.
- **2b — layouts**: page shells, grids, headers, sidebar, feature hierarchy.

## Figma file map (relevant pages only)

| Page | Node | Use |
| --- | --- | --- |
| ℹ️ Typography & Colors | `7:15` | Mirrors the variables/text styles below; no extra rules |
| ℹ️ Icons | `2:41` | **"As a base icons library we are using Heroicons"** (296 × 24px outline + a few custom) |
| ℹ️ Design Change Log | `27:4916` | Empty |
| ❖ Button `34:4` · Tab `111:605` · Chips `109:113` · Text Input `111:1416` · Select & Filters `83:1481` · Checkbox `78:1751` · Radio `116:650` · Tooltip `132:1171` · Link `140:41` · Avatar `174:12085` · Stepper `413:17955` · Toast `416:19777` · Popover `5760:5358` · Popup `4533:25` · Tables `504:18454` · Row & Cols `119:1812` · Stat Summary `1979:54650` · Truncated `4141:38031` | | Component sources for this phase |
| workspace → SECTION FOR IMPLEMENTATION | `7885:28979` | PROTOTYPE vs UPDATED frames of another Implentio screen: shows the intended approach (same layout, DS components swapped in) |

## Foundations (Figma → code)

Figma has three variable collections (Base Colors 32, Colors 64 semantic,
"Funtcional" 5 radii), 23 text styles, 6 effect styles. **No spacing scale** —
the 4px grid lives in code as `--ds-space-*`.

### Typography

Figma uses **Inter** only (Regular 400 / Medium 500 / Semi Bold 600). It replaced
the prototype's Sora (display) + Montserrat (body) globally in 2a.

| Figma style | Spec | Replaces (code) |
| --- | --- | --- |
| heading/huge | 36/1.32, −3% | — |
| heading/x-large | 30/1.32, −3% | `.db-h1` (Sora 30) |
| heading/large | 25/1.30, −3% | — |
| heading/medium | 21/1.32, −3% | ad-hoc 22px `<h2>`s |
| heading/small | 17/1.30, −3% | `.db-h3` (Sora 18) |
| heading/tiny | 14/1.16, −3% | — |
| body/medium | 16/1.50, −1% | `.imp-body` |
| body/base | 14/1.46, −1% | `.imp-small`, table cells |
| body/small | 12/1.64, −1% | 12px metadata |
| caption/small | 12/1.30, +5% | eyebrows / uppercase labels |
| caption/tiny | 10/1.16, +5% | `.db-kpi-sub`, table headers, pills |

### Colors

Neutral ramp is effectively the same palette, renormalized (direct mapping).
Purple/orange/support ramps differ; semantic colors change hue.

| Figma variable | Value | Prototype token | Mapping |
| --- | --- | --- | --- |
| neutral/900…100 | #10103E … #F6F4FE | `--imp-gray-900…100`, `--imp-ink` | Direct (≤2% drift, except gray-300 #D6D4E8 → #E0DFEC) |
| neutral/shades/50 | #F7F6F9 | — | New (disabled bg) |
| neutral/shades/900-24/16/01 | ink @ 24/16/10% | `--imp-gray-300` borders | New: strokes become translucent ink |
| purple/500 | #5642CE | `--imp-purple-500` | Direct |
| purple/100, /300 | #EEECFA, #BBB3EB | #E3E1FA, #ABA6EF | Replace |
| purple/600, /700 | #4535A5, #34287C | — | New (hover/pressed) |
| purple-200, -400 | — | #DAD8FF, #8174DF | Deprecate |
| orange/500 | #F25E0A | `--imp-orange-500` | Direct |
| orange/100, /700 | #FEEFE6, #913806 | peach ramp 100–400 | Replace; deprecate 200–400 |
| support/green 500/100 | #3A802F / #D3EDCE | success #1F8A4C / #DDF1E3 | Replace |
| support/red 500/100 | #AA261B / #FBD8D6 | error #C8341A / #FBDED7 | Replace |
| support/dark-yellow 500/100 | #9C6D11 / #FFEAC2 | warning #F2A20A / #FFF1CF | Replace (warning *text* is dark yellow) |
| support/blue 800/500/300/100 | #1F4366 … #D9ECFF | info = purple-400 | Replace (info becomes blue); blue/300 = focus ring |
| — | — | `--imp-paper` #FBF5EB | Unused; deprecate |

Semantic layer (`bg-color/*`, `fg-color/*`, `stroke/*`, `icons/*`, `status/*`,
`info-message/*`) aliases the base ramps; code should consume the semantic names.
Figma typos (`defult-reverse`, `bf-default`, `Funtcional`, `innter/…`) are
corrected in code names and noted here.

### Radii, borders, shadows

| Figma | Value | Prototype equivalent |
| --- | --- | --- |
| border-radius/small, medium, large, xlarge, full | 4, 6, 8, 12, 1000 | 4/8/16/24 tokens + raw 3–14px in proto.css |
| stroke | 1px, translucent ink (`stroke/muted` 16%, `stroke/emphasis` 24%) | 1.5–2px solid ink / gray-300 |
| shadow/muted | 0 1px 0 rgba(27,31,35,.12) | hard offset `3px 3px 0 ink` |
| shadow/disabled | 0 1px 0 rgba(27,31,35,.04) | — |
| shadow/popover | 0 1px 0 .12 + 0 4px 12px .08 + inset hairline | `--imp-shadow-soft-md` |
| inner/focus + stroke/focus | inset 4px white + #9DCAF5 border | 2px purple-300 outline |
| inner/pressed (emphasis/muted) | inset 0 2px 0 rgba(20,70,32,.2/.08) | translate(3px,3px) press |

## Figma → code mapping

Statuses: Matches · Mostly matches · Needs restyling · Needs structural update ·
Missing but required · Duplicate · Figma only / out of scope · Unclear.

| Figma | Code before 2a | Usage | Status (pre-2a) | Dev guidance (Figma) | Action |
| --- | --- | --- | --- | --- | --- |
| button (primary/secondary/danger/success/attention × small 32/medium 36 × 5 states × emphasis) | `.db-btn` classes only; ~10 inline button styles; destructive ×3 inline; disabled via inline opacity | Very high | Needs structural update | 2 types: Primary, Secondary; Secondary variations Emphasis (secondary action), Danger (reject/delete), Success (approve/accept). States default/focus/hover/pressed/disabled. Sizes 32/36 (36 default). New "attention" state | Create `Button` (variant, size, emphasis, icon slots, loading); replace inline variants |
| icon-button (tiny 24/small 32/medium 36/large 44) | `.db-icon-btn`, 2 inline chevron squares (OM), ghost × | Medium | Missing but required | Tooltip lives in Tooltip component | Create `IconButton` (requires `aria-label`) |
| link (default/accent/muted × s/m/l × bold × underline, icon slots) | `.db-link` (unused), `.ia-crumb`, `.db-row-btn`, `.ia-tracker-secondary-link`, ~12 inline text links | High | Duplicate | 3 variants + bold/underline modifiers | Create `Link` (renders `<a>`/router link or `<button>`) |
| tab (active/default/hover/focus/disabled, left/center, icon, attention dot) + tab-group | `UnderlineTabs`; `SecNav` (0 users — MemoPage inlines `.ia-secnav`); `.db-tabs` (unused) | Medium | Needs restyling + Duplicate | Alignment center/left; states incl. disabled | One `Tabs` (underline); delete SecNav/db-tabs |
| actionTab (negative/positive/neutral/special × resting/hover/active; stats 2nd row, "–" when empty) | Metric tiles `OutcomesTab.module.css` `.metricBtn` shared by 3 screens | Medium | Needs restyling (semantics match) | "A button setting a specific set of filters"; 2nd row color by type; empty sum → "–" | Create `ActionTab` in `src/ui`, move off tracker module |
| input (medium/small; label?, caption?, icon L/R, prepend/append; validation none/invalid/warning/success) | `.ia-input` raw; errors as separate `<p>`, no `aria-invalid`; search fields w/o icon | High (22) | Needs structural update | Validation = border color + message below; **focus border overrides validation**; label for complex forms; icons for meaning or actions (clear) | Create `TextField` (+ `Textarea`) with label/caption/error wiring |
| select (trigger) + select-menu / action-list | Native `<select class="ia-input">` ×4; custom inaccessible dropdown in OutcomeModal | High | Needs structural update | Filter fields show "A, B +N" for multi-value | Create custom `Select` (Radix) |
| checkbox (regular / spacing-box, multiple) + checkbox-group (border-box) | 3 native looks + custom-drawn FindingCard box (no focus/disabled state) editing the same state | Medium (4) | Missing but required | Two types: regular, withOutline | Create `Checkbox` (border-box variant = FindingCard chip) |
| radio / .base-radio | None; OutcomeModal bulk outcome grid + dropdown radio circles (no ARIA) | Low (2) | Missing but required (semantics) | States incl. checked-disabled | Create `RadioGroup` (bordered option grid) |
| status-chip (filled/text-only, icon?, tones neutral/success/danger/attention/info) | `.ia-pill` ×12 with ~10 inline tone combos, 4 tone maps, `.db-badge` (unused), NEW/UPDATED/DOWNLOADED badges; same status coloured 3 ways | High | Needs structural update | Radius 6 (not pill), body/small medium, sentence case; fixed status catalog from another product | Create `StatusChip` (tone, filled, icon) + one domain status→tone map |
| tag-chip (no-action only) | Carrier tags (MemosTab) | Low | Needs restyling | — | Create `Tag` (no action variant only) |
| filter-chip (with value, remove) + .on-remove | `FilterChips` (`.ia-chip`) | Medium | Needs restyling | Filter group keeps active state until collapsed | Restyle `FilterChips` |
| Filter system (filter-chip + filter-group + action-list, and/or connectors) | `FilterPanel` (button + staged panel of selects) | 7 screens | Needs structural update / Unclear | Inline chip filters, each opening an action-list | Adopt Figma filter group (decided) |
| popover (6 directions, caret, 4px offset; icon/close/text/action optional) | FilterPanel panel (hand-rolled) | Low | Needs restyling | 4px from trigger, caret for alignment | Create `Popover` (Radix) — FilterPanel on top |
| action-list / action-list.item (check/radio/text/icon-text; danger/positive/selected) | Sidebar profile menu; OutcomeModal outcome dropdown | Low (2) | Missing but required | Navigation "NEW Menu" uses action-list for Log out | Create `Menu` (Radix DropdownMenu) |
| tooltip (dark, pointer 4 sides, multi-line) + info-icon | `InfoTip` (CSS-only), raw `.ia-tip` ×3 in Sidebar | Medium | Needs restyling | Left/right/top/bottom; multi-row supported | Rebuild `InfoTip` on a `Tooltip` primitive (Radix for collision) |
| Popup: medium (max-w 668, max-h 644, pad 24) / large (max-w 1320, max-h 712, pad 32) | `Modal` (Radix Dialog, width 420–1080) + **3 hand-rolled dialogs** (DisputeWizard, OutcomeModal, ReportPreview) without focus trap/scroll lock | High | Needs restyling + Duplicate | **Max 2 stacked modals**; scroll when content exceeds max-height; 32px page padding around large popup at 1200px | Restyle `Modal` to spec (size prop); migrate the 3 dialogs onto it |
| toast (neutral/danger/positive, withAction) | `ToastProvider` ok/warn (warn used only for failures) | Medium | Needs restyling | neutral / negative (system errors) / positive | ok→positive, warn→danger; add neutral |
| banner (info/success/warning/error) | ~17 inline callouts, no error banner | High | Missing but required | — | Create `Banner`; migrate simple notices only; complex next-step cards stay feature-level (2b) |
| stepper / stage / step (default/active/passed) | DisputeWizard step header; memo dispute tracker (`.ia-dt-*`) | Low (2) | Needs restyling / Unclear | **"Step isn't clickable, it is simple indicator"** | Create `Stepper`; wizard header first; tracker is **Unclear** (has dates + actions) |
| avatar (small/large/huge; default = initial on colour) | `.db-avatar` ×2 + 2 hand-built initial circles | Low | Duplicate | Fallback: background colour + first letter | Create `Avatar` |
| statistic (+ text-group positive/negative/neutral, label, emphasis) | `db-kpi-sub` + inline value ×33, big-number heroes; `.db-kpi-card` (unused) | High | Missing but required | Reused across pages with tweaks: up to 4 text items, number size may shrink | Create `Statistic`; delete `.db-kpi-*` |
| Table primitives: table-label (sortable header), col types, value-difference, table-row.bg, empty-state, sticky header | `.db-table*` classes, `.ia-sort-btn` (two different sort cycles), total rows, no sticky header | High (8 tables) | Needs restyling | Sort asc/desc by clicking label; filter icons on hover; one active filter column; value-difference negative (overpay)/positive (save); **sticky header until footer**; summary/highlight rows only on static tables | Create `Table`, `SortableHeader`, `ValueDiff` cell; unify sort cycle |
| empty-state (with-filters / without; title, subtitle, button?) | `.db-empty` ×5 + 2 hand-built | Medium | Needs restyling | Copy pattern "Currently, you don't have any [items] by selected filters" | Create `EmptyState` (existing copy kept) |
| Truncated | none (tables nowrap) | — | Missing (low) | Single long value → ellipsis; multi-value → "+N"; tooltip shows full | Add truncation to table cell primitive |
| Icons: Heroicons | Custom SVG files + ~8 pasted chevrons, pasted send/check icons | High | Needs structural update | Explicit: Heroicons | Adopt Heroicons (`@heroicons/react`) via one `Icon` usage pattern; brand logos stay assets |

### No Figma equivalent (keep, flag)

- **Spinner / loading** — 16px spinner ×2, 44px ×1. Keep a `Spinner` on tokens.
- **Donut chart** (Summary, Outcomes) — Figma: "we don't focus on the design for graph". Keep.
- **Key-value rows**, **section eyebrows** — typography tokens only.

## Available in Figma — not currently required

Global Search · Notification · Invoice Details · Error Summary (progress/stat bars) ·
Table Control (counter/pagination) · Pagination · Page Heading (2b) · Bulk Edit ·
Status Action (accept/reject group) · DatePicker · Toggle · Chat · Filtration
[design only] · filter-connector (and/or) · tag-chip action/add views ·
input-group (prepend/append positions) · collapsible-graph / graph-button ·
btn-icon-check / btn-icon-x · Navigation (deferred to 2b as shell layout) ·
stepper presets `errors|tags|email` (request-credit flow).

## Migration status (Phase 2a)

| Component | Code | Status |
| --- | --- | --- |
| Foundations | `src/styles/tokens.css` (`--ds-*`, `ds-*` text classes), Inter via `@fontsource-variable/inter` | Migrated — `--imp-*` remain only as aliases for Phase 2b layout code |
| Button / IconButton | `src/ui/Button` | Migrated — all `.db-btn` and inline buttons replaced |
| Link | `src/ui/Link` | Migrated — crumbs, row links, text actions |
| TextField / TextArea | `src/ui/Form/TextField.tsx` | Migrated — errors via `validation` + `message` (aria wired) |
| Select | `src/ui/Form/Select.tsx` (Radix) | Migrated — native selects + outcome dropdown replaced |
| Checkbox / RadioGroup | `src/ui/Form/Choice.tsx` | Migrated — incl. bordered variant (finding inclusion, outcome grid) |
| StatusChip / Tag | `src/ui/Chip` + `features/status-tones.ts` | Migrated — one status→tone map |
| Filters | `src/ui/Filters` | Migrated — Figma filter group on tracker, outcomes, memo findings, memo invoices, invoices |
| Tabs / ActionTab | `src/ui/Tabs` | Migrated — UnderlineTabs/SecNav/metric tiles replaced |
| Statistic / Stepper / Avatar / EmptyState / Spinner | `src/ui/Display` | Migrated |
| Tooltip / InfoTip | `src/ui/Tooltip` (Radix) | Migrated — incl. collapsed-rail tooltips |
| Menu (action-list) | `src/ui/Menu` (Radix) | Migrated — filter menus, profile menu |
| Modal (Popup) | `src/ui/Modal` (Radix) | Migrated — dispute wizard, outcome modal, report preview now use it |
| Toast | `src/ui/Toast` | Migrated — ok→positive, warn→danger |
| Banner | `src/ui/Banner` | Migrated — simple notices; bespoke cards restyled with tokens |
| Table primitives | `src/ui/Table` | Migrated — one sort cycle, sticky header on invoices |
| Popover | — | Built, then removed: no screen needed it (menus cover every overlay) |

Removed: `FilterPanel`, `UnderlineTabs`/`SecNav`, old `InfoTip`, `/dev/tokens`, Sora/Montserrat
fonts, and every unused prototype class (`proto.css` now holds only layout helpers for 2b).

## Behaviour changes (intentional)

- **Filters** follow Figma: Filter → filter type → chip with a multi-select value list; values
  apply immediately; "Filter: N active" when collapsed (was: staged panel, one value per field).
- **Charge highlight** on memo findings is a single-value Select next to Filter (it highlights
  columns, it doesn't filter rows, so it can't be a multi-select filter chip).
- **Sorting**: every sortable column cycles none → ascending → descending.
- **Status colours** unified (see `features/status-tones.ts`).
- **Dialogs**: the three hand-rolled dialogs gained focus trap, scroll lock, focus return and
  Escape handling; the wizard's header "Close" is now the Figma × button.
- **Menus**: profile and filter menus are real `menu`/`menuitem`s with arrow-key support.

## Interface review fixes (2026-09-24)

A cross-discipline review (accessibility, layout, writing, typography, colour, UI polish) was run
and its findings implemented at the user's request. This pulls some Phase 2b layout work forward
and changes copy — each item below is a deliberate deviation or behaviour change.

**Pending Figma confirmation (colour values chosen to pass WCAG AA from existing primitives):**
- `--ds-fg-accent-text` → `orange-700` for money text (orange-500 was 3.29:1 on white, 2.93:1 on
  orange-100). `--ds-fg-accent` stays for fills and large numbers on white / the navy hero.
- Success / attention chip text = the Figma fg mixed 80/20 with neutral-900 (5.17:1 / 5.24:1;
  Figma pairs measured 3.89:1 / 3.86:1). Figma has no green-700 / yellow-700 step.
- `--ds-fg-disabled` is no longer used for readable text (2.78:1); those uses are `--ds-fg-muted`.
- axe `color-contrast` is re-enabled in `tests/a11y/axe.spec.ts` and passes.

**Layout (Phase 2b items pulled forward):**
- Compact shell below 720px (`src/shell/useCompactShell.ts`): top bar + off-canvas nav drawer
  (Radix Dialog) instead of the fixed 240px sidebar that overflowed every page at mobile widths.
- Page-level breakpoints in `proto.css` are container queries on the `page` container
  (AppLayout's page column) and the outcome modal's `om` container, not viewport media queries.
- `TableScroll` (src/ui/Table) wraps wide tables with edge fades; the Modal body shows the same
  cue when content is scrolled out of view (`useScrollEdges`).
- Identifier / date / money cells don't wrap (`num`, `nowrap`); account grids stack below 520px.
- Logical properties replace left/right across src (except the demo harness).
- 12px (`--ds-space-3`) between adjacent bordered controls (modal footer, card action rows,
  outcome choice grid, outcome select + disclosure).

**Behaviour changes:**
- Route navigation is real links: sidebar items, route tabs (`Tabs linkTo`), memo-card actions
  and table row actions (`ButtonLink`). Cmd-click / new tab / copy link now work.
- Sidebar icons are Heroicons (`currentColor`); nav state styling moved from inline styles to
  CSS so hover / active / disabled render. The old `public/brand/nav-*.svg` assets are removed.
- Finding-card status is a `StatusChip`, not a bordered block that read as a button.
- Danger toasts stay until dismissed; toasts pause on hover/focus; announcements go through
  persistent live regions.
- "Revoke access" asks for confirmation.
- Finding jump respects `prefers-reduced-motion` and moves focus to the finding.
- Forced-colors mode gets a system-colour focus outline on every focus stop and highlighted item.
- Inputs render at 16px on touch devices (iOS zoom); pointer devices keep 14px.

**Copy (writing review; product to confirm):**
- One outcome vocabulary everywhere: "Biller declined", "Partly collected", "Unresolved".
- Sentence case for table headers, tabs, buttons and chips ("Credit memos", "Download credit
  memo", "Ready to dispute"); status/eyebrow strings stored in natural case, uppercased by CSS.

**Second pass (same day):**
- Dispute vocabulary: the object is a "dispute" (not request / package), the selectable items
  are "variance groups", the attachment is the "evidence package"; every step advances with
  "Continue" and the flow ends with "Done" (now also shown after the manual path).
- Wizard errors say how to recover ("Unable to send dispute… reconnect your email in Account
  settings", copy and download failures); ActivityTab no longer offers a "Review summary"
  button that always failed — it says the preview isn't available for superseded versions.
- Filter empty states offer "Clear filters"; the Memos empty state names the real filters.
- Counts pluralise through `plural()` (src/domain/plural.ts): "1 invoice", "1 package".
- Skip link to `<main>`; per-route `document.title` (`usePageTitle`); row-specific names on
  Account "Edit" buttons; the placeholder page no longer nests a second `<main>`.
- `text-wrap: balance` on headings, `pretty` on body/description classes.
- Scaled-down outline icons get a CSS stroke width (2 at 16px, 2.5 at 12px); per-call
  `strokeWidth` props removed.
- The finding disclosure fade is gone (instant toggle); the nav drawer animates in and out
  only under `prefers-reduced-motion: no-preference`; the finding flash is a steady ring under
  reduced motion.
- Inner boxes nested in 8px surfaces use `--ds-radius-small`.

## Parcel dispute flow — Phase 1 (2026-09-24)

Flow and copy changes from Phase 1 of the parcel-credit-memo improvement plan ("make the current
flow trustworthy"), made at the user's request. Decisions referenced as D1–D8 are the user's
answers of 2026-09-24. No page layout changed; everything uses existing `src/ui` components.

**One status everywhere** (`memoStatus` in `src/domain/outcomes.ts`): the tracker card, the
memo's next-step card and Credit outcomes read the same derivation. Memo statuses:
*Action needed* (attention; an open finding is due today, tomorrow or the day after) · *Ready
to dispute* (neutral) · *Waiting on Biller* (info) · *Done* (success). They replace the
tracker's six labels ("Dispute draft", "More findings available", "Awaiting Biller response",
"Outcomes partly recorded", "Dispute completed") and the next-step eyebrows ("Next step",
"Next steps", "Resolved"). A draft now shows as supporting text under *Ready to dispute*.

**Behaviour changes:**
- Deadline line "Dispute by {date} · N days remaining" on the tracker card and the next-step card
  while findings are open. Countdown uses calendar days (it read one day too many; a passed
  deadline read "Due today").
- Findings left out of a dispute stay *Eligible to pursue* until their deadline (D1). New subtle
  action **Won't pursue** → status *Not pursued* (muted) with **Undo** while the deadline is open.
  A finding whose deadline passed unsent shows **Expired** (muted) — "Dispute window closed
  {date} · {amount} not disputed". *Not pursued* never turns into *Expired* (note n359).
- *Partly collected* is a final outcome (D5); the unpaid part is **Not recovered**. The memo is
  *Done* once every finding is collected, partly collected, declined, not pursued or expired.
- Every send is stored as a dispute record (D2), including the whole-memo (findings-unavailable)
  dispute, which now moves the memo to *Waiting on Biller* and takes its own outcome.
- New read-only **Dispute details** dialog (per dispute: status, sent by/method, date, to, cc,
  subject, evidence package, findings with outcomes). Opened by "View dispute details" on the
  tracker card (`?dispute=1`, previously ignored), the next-step card (previously opened the edit
  modal), Credit outcomes rows and Activity entries.
- Outcome modal groups findings by the dispute they were sent in, each with its own status and
  "Apply one outcome to all" (it said "across 1 dispute" for sends on Sep 8 and Sep 15). Bulk
  apply no longer offers *Partly collected* (it saved every finding with no amount).
- `?prep=1` / `?outcomes=1` / `?dispute=1` are removed when the dialog closes, so switching tabs
  no longer reopens it.
- Activity is per memo and written by the actions themselves: sends, manual-send confirmations,
  outcomes, won't-pursue / undo, downloads; dispute entries link to the details.
- Credit outcomes covers every published memo, including the golden memo's findings. Its five
  metric tabs and donut slices — *Eligible to pursue*, *Awaiting outcome*, *Collected*, *Not
  recovered*, *Not disputed* — never overlap and add up to *Total identified* (the memo recovery
  donut uses the same five). Pursuit filter gains *Not pursued* and *Expired*; the Outcome
  column shows *Expired* / *Not pursued* instead of always "Eligible to pursue".
- Credit outcomes shows a warning banner "N findings need your update" (outcome not recorded 7+
  days after sending, or deadline within 3 days) with "Show them" to filter the table. Row
  actions: *Record outcome* (awaiting), *View dispute* (other sent), *Review finding* (rest).
- The dispute wizard lists open findings biggest first, never pre-selected (D6), and leaves out
  findings marked *Not pursued*. Sending clears the draft to nothing selected.

**Copy (product to confirm):**
- "Credits realized" = sum of recorded collected amounts (D8), caption "Recorded by your team"
  (was a fixed $9,294.74 "Confirmed from ingested Biller credit records"); tooltip says Implentio
  doesn't read Biller credit records yet.
- "Unresolved" (outcome modal) is replaced by *Awaiting outcome* and *Not recovered*.
- Done card: "Your dispute with {Biller} is complete · N findings closed · $X collected · $Y not
  recovered"; all-expired memo: "Nothing left to dispute with {Biller}".
- "Variance group" naming is unchanged (D7 still open).

**Demo scaffolding:** new scenario `dispute-deadline` (Action needed + Expired). Placeholder memos
without dispute data keep the old static card ("Ready to dispute" → prepare).

## Parcel dispute flow — Phase 2 (2026-09-24)

"Shorten the path" from the improvement plan, at the user's request. **This redesigns the memo
Summary & findings layout ahead of Phase 2b** (rule 4), for this page only. It was **built in code
with no Figma frames yet** — recreate in Figma on request. Only existing `src/ui` components and
`--ds-*` tokens are used. Wording is plain language, **pending PM** (one copy file:
`src/domain/finding-copy.ts`, plus the status labels in `src/domain/outcomes.ts`).

**Memo page as one workspace** (`SummaryTab`): a compact summary block — status and deadline; a
**headline that follows the state** (Total overcharged before anything is sent → *Still to
dispute* / *Waiting on QuickBox* / *Collected*, each "of $X overcharged"), where the money is once
it's split, one guiding sentence; and a "Biggest findings" table (amount, status; the small ones
fold into one row; a row jumps to its card) → one highlighted card per sent dispute → findings biggest first (with
more than 3, those covering 95% of the amount show and the rest collapse into "N smaller
findings") → Latest report. A sticky selection bar appears on the first tick with the total, the
deadline and **Review & send**. Findings are chosen once, never pre-selected (D6).

**Finding cards in layers:** ① everyday problem ("Shipping price higher than your contract rate")
with the industry term as a tag, carriers/packages, one example line, amount and status; ② "Show me
why": billed / should have been / difference, one example in words plus the expert sentence, how
it was worked out; ③ "See all N packages" opens a focused package view — "Differences only" by
default (billed, should have been, difference, and only the charges that differ), "Full breakdown"
= the old 26-column table, service-level filter, search, charge highlight, Export.

**Review & send** (`ReviewSendModal`) replaces the 3-step wizard: what's included (with Change),
To/CC, CC-support toggle, subject, the whole message editable as the Biller will see it (a reason
line per finding, "Reset to suggested text"), and how to send — from a connected Gmail/Outlook, or
"Download the email" (`.eml` with the evidence attached, `X-Unsent` so Outlook opens a draft; web
Gmail can't open it) followed by "I sent it". Link: `?send=1` (was `?prep=1`).

**Dispute cards** (`DisputeCard`), one per send, tinted and accented while waiting: "Dispute sent to
QuickBox · Sep 8, 2026 · 4 findings · $9,365.06 · Waiting 9 days" and the Biller's answer recorded
**finding by finding, in place**, with a single-choice toggle per row (`RadioGroup`, bordered,
row): **Fully collected** and **Denied** save on click; **Partly collected** opens one compact
"$ ___ of $35.10 · Save · Cancel" line (Enter saves, Escape cancels). Only one row is open at a
time, rows keep fixed columns (finding | amount | answer), and a recorded row shows its outcome with
**Change** (and **Add reason** after a denial). **No reply
yet** records the check and resets the 7-day nudge. **What was sent** expands in the card (sender,
date, to, cc, subject, evidence). There is no whole-dispute "collected in full" shortcut — answers
are recorded per finding (user feedback, 2026-09-24). **Show details** holds the rest on demand:
sender and method, date, To/CC as mailto links, subject, the evidence file with Download, the
message as sent (stored on the dispute record), outcome history (who recorded what, when, and what
it was before), and a link to the memo's activity. Finding names in the card link to their cards.

**Fewer dialogs:** the outcome editor and "Dispute details" dialogs are gone from the memo page —
both live in the dispute cards. `?outcomes=1` / `?dispute=1` links (tracker, Credit outcomes,
Activity) scroll to the dispute cards; `?dispute=1` also opens "What was sent". Remaining dialogs:
Review & send, the package view, the report preview, and "How findings are calculated".

**Removed:** the next-step card, the page-level charge highlight, the inline service-level table
and package drill on cards, the wizard (`DisputeWizard`), `OutcomeModal` and `DisputeDetailsModal`,
and the recovery donut (replaced by the "where the money is" list). The rollup table returned as
the summary's findings table. The
`Stepper` component is no longer used by the app (still in the gallery).

**Wording changes (pending PM):** Awaiting outcome → *Waiting on Biller*; Biller declined →
*Denied*; Eligible to pursue → *Ready to dispute*; Not pursued → *Won't pursue*; Outcomes partly
recorded → *Some outcomes recorded*; Pursued → *Disputed* (Credit outcomes). *Fully collected* /
*Partly collected* / *Collected* stay (user decision, 2026-09-24 — not "credited"). Tracker card actions:
*Choose findings to dispute* / *Review & send* / *Record outcome* / *View dispute details*. The
dispute email is written in the customer's voice ("We reviewed our parcel invoices…"). "Variance
group" is unchanged (D7).

**Other:** ticking a finding updates immediately (optimistic draft update).

## Follow-ups

- Reverted at user request: "View affected packages", the tracker card CTA, and "Review summary"
  are back to `variant="primary"` (were `emphasis`, per the review's one-filled-primary-per-view
  finding). Multiple filled primaries can appear together again on the memo and tracker pages.
- Colour meaning: brand purple on some static text (eyebrows, next-step lines) and orange
  carrying money / "new" stripe / in-progress; Banner mixes 20/solid and 24/outline icons.
- Dark-navy primary button (Figma primary, emphasis off) has no documented use — not built.
- Phase 2b: page headers, section spacing, remaining `proto.css` layout classes, the remaining
  `--imp-*` aliases.

## Decisions

- Radix stays the low-level primitive where it maps (Dialog, Tooltip, Popover,
  DropdownMenu, possibly Select). Visuals come from Figma, never shadcn defaults.
- Code token names mirror Figma's semantic names (typos corrected); legacy
  `--imp-*` become aliases during migration and are removed with their last user.
- Behaviour is preserved unless Figma guidance requires a change; every such
  change is listed here.

- User decisions (2026-09-23): follow Figma everywhere (retire the brutalist style globally);
  status tones as mapped; adopt the Figma filter pattern; custom (Radix) Select; Heroicons;
  outcome choice grid → bordered RadioGroup.
- Figma's Banner has no container stroke; code adds a 1px `stroke-disabled` border so white
  descriptions stay legible on white cards.
- Card padding/gaps are page layout and stay as-is until 2b; only the card surface changed.
