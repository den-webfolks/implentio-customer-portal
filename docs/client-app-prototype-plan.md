# Client-app prototype plan — findings, disputes, outcomes, learning

**Date:** 2026-09-28 · **Status:** planning only. Nothing here changes the app.
**Scope:** the parcel credit memo flow: finding → evidence → dispute → outcome → history.
Invoices, Activity, navigation and global styling are out of scope.
**Visual explorations:** `prototype-planning/00-overview.html` (start there) and one file per
feature, `01`–`06`.

**Sources, in priority order.** When sources disagree, the higher one wins until someone decides
otherwise.

1. Established decisions: the D1–D8 answers (2026-09-24) and the decisions logged in
   DESIGN-SYSTEM.md (2026-09-24/25).
2. Product notes mined from the prototype (PRODUCT.md, cited as nNNN) and the current code
   (`src/domain/outcomes.ts`, `src/features/memo/*`, `src/features/tracker/*`).
3. The latest client meeting, as summarised in the request for this plan.
4. Examples and ideas from that meeting.
5. My proposals, labelled **Proposed** below.

**Labels used throughout**

| Label | Meaning |
| --- | --- |
| **Existing** | Built today, or previously decided |
| **Newly confirmed** | A clear decision from the latest meeting |
| **Proposed** | My recommendation to meet the requirement. Not approved |
| **Unresolved** | Needs an answer before it goes into the production app |

Conflicts between the meeting and existing knowledge are classified as **Confirmed change**,
**Compatible addition**, **Potential conflict** or **Needs verification** (section B2).

---

## A. Current state

The app already models most of the lifecycle the meeting describes, under different names. The
meeting's example labels map onto existing concepts almost one-to-one. The real changes are in
three places:

- the **Expired** rule;
- **who owns** a dispute;
- **what Credit outcomes is for**.

### A1. The lifecycle as built (Existing)

Finding level. The status comes from `groupStatusLine` in `src/domain/outcomes.ts`. The data
behind it has three separate fields, per n341: pursuit, deadline and collection.

```
Finding published (reviewed by Implentio; backend sets disputeDeadline per finding)
  │
  ▼
READY TO DISPUTE ───────────────┬── tick → in the dispute draft (a selection, not a status;
  │  "Dispute by {date} · N days  │         the card says "Included in dispute")
  │   remaining"                  ├── Won't pursue → WON'T PURSUE (muted; Undo only while the
  │                               │                  deadline is open, n360)
  │                               └── deadline passes unsent → EXPIRED (muted, final; not
  │                                   selectable, "no workaround", n349)
  ▼ Review & send (3 steps)
  ├─ connected Gmail/Outlook → sent ───────────────────────────────┐
  └─ manual: any part of the email leaves the app                  │
       → IN A PREPARED EMAIL (reserved; never Expired while it waits)
           ├─ "I sent it" (date, may be flagged "sent after the deadline") ┤
           └─ "I didn't send it" → back to Ready to dispute (or Expired)   │
                                                                           ▼
                                                        WAITING ON BILLER (a dispute card per send)
                                                             ├─ Fully collected   (one click, date = today)
                                                             ├─ Partly collected  (amount; final, D5)
                                                             └─ Denied            (one click; optional "Add reason" afterwards)
```

- **Memo status**, shared by the tracker, the memo page and Credit outcomes: *Ready to dispute*
  (any open finding) → *Waiting on Biller* → *Done* (every finding collected, partly collected,
  denied, won't pursue or expired).
- **Money buckets**, which never overlap and add up to the total: *Left to dispute* · *Waiting on
  Biller* · *Recovered* · *Not recovered* · *Not disputed* (Expired + Won't pursue).
- **Dispute record** (`DisputeRecord.state`): `prepared` → `sent`, or `discarded`. Each record
  keeps handoff versions, attachments, the body as sent, `sentBy` and `via`.
- **Finding evidence**, in three layers (DS "Parcel dispute flow — Phase 2"):
  - ① a plain problem title with the industry term as a tag, carriers, packages, invoices, one
    example line, the amount and the status;
  - ② "Show me why", inline: billed / should have been / difference, one example with an expert
    sentence, and "How we worked it out";
  - ③ "See all N packages" dialog: *Differences only* by default, *Full breakdown* (26 columns),
    service filter, search, charge highlight and Export.
- **Credit outcomes** (tracker tab):
  - six metric tiles, then a donut that repeats the same numbers;
  - filters and a 12-column finding ledger with the reason in an expandable row;
  - a "Biller credit outcomes" table by Biller × variance group: disputed, recovered, full or
    partial count, denied count, and a collection rate computed as collected ÷ disputed.
- **Implentio's role today:** an opt-in "CC my Implentio support team" checkbox. n326 says a CC
  must never read as Implentio owning or submitting the dispute. Delegation was deferred (D3).

Demo data:

- The golden memo CM-2026-0630 (Biller QuickBox) has five findings with real package rows:
  - Shipping price, 510 packages, $9,322.20;
  - Fuel, 172 packages, $35.10;
  - Home-delivery fee, 13 packages, $22.64;
  - Remote-area fee, 3 packages, $4.68;
  - Shipping price and fuel, 154 packages, $3.08.
- The other five memos have only finding-level rows (`outcomeGroups`): category, amount and
  outcome, no packages.
- Across all memos: 22 findings, 3 Billers with outcomes, 3 recorded answers and 4 still waiting.

### A2. Where the current lifecycle is ambiguous, dead-ended or duplicated

| # | Finding | Type |
| --- | --- | --- |
| L1 | **Expired is terminal because of the calendar, not because of a decision.** A customer who wants to try a late dispute can't (n349). This is what the meeting objects to | Conflicts with the meeting |
| L2 | **Nothing closes a dispute the Biller never answers.** A dispute waits forever, or the customer records a false *Denied*. "No reply yet" was removed on 2026-09-25, but that was a nudge, not a closing state | Dead end, missing state |
| L3 | **The answer date is always the day it was recorded.** One-click answers stamp `today`, and the date can't be edited. n344 requires a date for partial answers. Any "how fast does this Biller answer" metric would really measure how late the customer logged it | Missing data |
| L4 | **The denial reason is optional and only asked after the fact** ("Add reason" appears after Denied is saved). A partial answer has a `reason` field but no UI to fill it | Weak capture |
| L5 | **Two different rates.** Credit outcomes shows "Collection rate" = collected ÷ disputed (n348), which counts disputes still waiting as failures (ShipBob shows 0% while waiting). The tracker shows "Recovery rate" = recovered ÷ answered | Duplicated concept, conflict |
| L6 | **Two word families for the same money.** Answers say *Fully / Partly collected*; money buckets say *Recovered / Not recovered*. Both were decided deliberately (2026-09-24/25) | Terminology (kept, flagged) |
| L7 | **Credit outcomes repeats the tracker's totals.** The tiles and donut show the same five buckets as the tracker's "Where your money is" strip. The only learning-oriented part (Biller × variance group) sits at the bottom, uses technical category names, and hides reasons | Duplicated, weak purpose |
| L8 | **Nobody owns the dispute in the data.** `sentBy` is a person, `via` is connected or manual, and there is no owner field. A CSM who sends for a customer has no way to record it (open question Q5 of the 2026-09-24 lifecycle doc) | Unclear ownership |
| L9 | **The source is thin in the evidence layers.** n105 requires "which rate, percentage, contract term or rule supports the conclusion". Layer ② has only a generic `why` sentence. The rate card version, fuel index week and DAS ZIP list are not in the data (n76 defers that lineage) | Missing data, trust |
| L10 | **Packages Implentio couldn't check aren't shown.** The golden memo has `docGroups` ("Updated UPS rate card required": 4 invoices, 6 records). Nothing renders it (n73 wants them kept separate) | Missing state |
| L11 | **The package view is a dialog.** n108, n141 and n175 say evidence expands inline and never in a modal; n115 allows a modal or drawer. DS chose a dialog on 2026-09-24 | Conflicting requirements |
| L12 | **Only the golden memo has package data.** Five of six memos' findings have no layer ② or ③ data. "Minimal evidence" is the normal case in the demo | Demo limitation, real risk |
| L13 | **A memo whose open findings are all "Won't pursue" shows Done** while Undo is still possible (known follow-up) | Ambiguous |

---

## B. Problems: what needs to change, and why

### B1. Meeting input, classified

| Meeting input | Classification | Existing position | Notes |
| --- | --- | --- | --- |
| The redesign so far is a good start. Condensed financials, the cleaner dispute flow and the cleaner email flow are liked | **Newly confirmed** | DS Phase 2, the tracker and Review & send (2026-09-24/25) | Keep them. Don't restart |
| A finding shouldn't become undisputable just because the dispute period passed. Closure comes from a business outcome | **Confirmed change** | n342, n349, n364 and D1: Expired is automatic and final | A business-logic change with knock-on effects on memo *Done*, money buckets, the tracker and Credit outcomes. Its consequences are **Unresolved** (F1) |
| Closing outcomes: denied, dismissed or not pursued, "another explicit resolution" | **Compatible addition** | *Denied* and *Won't pursue* exist | "Another explicit resolution" is undefined. A closing state for "no answer" is missing (L2) |
| Two dispute paths: customer-managed and Implentio-managed | **Confirmed change** (direction) | D3 (2026-09-24) deferred "Ask Implentio to send it". n326 says CC ≠ ownership. n242 marks sending on the customer's behalf as future | It reverses a deferral, so release timing and scope are **Unresolved**. The earlier lifecycle doc said CSMs already "can do the customer's steps", and the BI interviews mention delegating accounts ("Magic Mind delegates entirely") |
| Capture why a dispute was denied (free text is enough for now) | **Compatible addition** | The `reason` field and "Add reason" exist; n344 says optional; n347 says account-scoped | The change is to ask for it at the moment of denial and store the answer date |
| Denial data should become reusable knowledge | **Compatible addition**, within one account; **Potential conflict** across customers | n347: "No cross-customer rollup of rejection reasons is permitted" | Anything that pools other customers' outcomes needs a decision (Q-D3) |
| "Show me why" is one of the largest UX problems | **Needs verification** | Three layers already built (2026-09-24) | Did the client react to the current build or to the prototype's nested tables? The answer changes F2's starting point (Q-E1) |
| Show where the numbers came from | **Compatible addition** that needs data | n105 requires the supporting rate or rule; n11 and n76 defer full calculation lineage | The UI can be designed now. The data must come from Implentio's audit pipeline ("Toolbelt") (Q-E2) |
| Credit outcomes as historical intelligence, not another dashboard | **Newly confirmed** direction | Known follow-ups: the donut repeats the tiles, technical titles, the 12-column table. The PM wants a "Biller performance table" | The page's purpose changes; the ledger can stay as a secondary view |
| Example labels ("Available to dispute", "Recovered", "Partially recovered", "Dismissed", "Implentio-managed") | **Examples, not requirements** | Existing: *Ready to dispute*, *Fully / Partly collected*, *Won't pursue*; money words *Recovered / Not recovered* | Keep the existing terms (see the table in C3) |
| Implentio may later use agents to manage disputes | Context, not a requirement | — | Constraint: the model must record *who acted* without assuming a person (F3) |

### B2. Conflict register

**C1 — Expired.**

- Meeting: aged findings stay disputable.
- Existing: n342 and n349 say "no workaround". D1 says the finding shows Expired at the deadline.
- Code: `groupEligible` is false after the deadline, so the finding is `closed`, has no checkbox,
  and its money sits in *Not disputed*.
- **Classification:** Confirmed change.
- **Recommendation:** the deadline becomes a **warning flag, not a state**. How past-deadline
  findings count toward memo *Done* and the money buckets is a product decision for you and the
  client. 01 shows four options (C2) and recommends none of them.

**C2 — Undoing "Won't pursue".**

- Existing: Undo only before the deadline (n360). n364 contradicts n359 on whether Won't pursue
  expires.
- Under C1, the natural reading is that Undo is always allowed.
- **Classification:** Needs verification (inferred).

**C3 — Implentio-managed disputes.**

- Existing: D3 deferred; n326 bans implying Implentio ownership through a CC.
- Meeting: support both paths.
- **Classification:** Confirmed change of direction.
- **Recommendation:** make ownership **explicit and recorded**, so n326 still holds for the CC
  case: CC-ing Implentio never equals handing the dispute over.
- **First, confirm the level the meeting meant:** per dispute, per Biller or per whole account
  (Q-O8). Delegation was once my own extrapolation (D3's history), and accounts that "delegate
  entirely" never tick findings. The level decides the design.

**C4 — Pooled knowledge.**

- n347 forbids rolling up reasons across customers.
- The meeting's "Which Billers respond?" could be read as data pooled across Implentio's
  customers.
- **Classification:** Potential conflict, in two parts:
  - pooled *denial reasons* are forbidden by n347;
  - pooled, anonymised *outcome rates* per Biller aren't covered by n347 and are undecided.
- **Recommendation:** design everything as **your account's history**. Show pooled outcome rates
  only as an explicitly separate, anonymised, Implentio-authored source, and only if the business
  approves it (Q-D3a/b). Account-only history may stay thin for most customers (Q-D4).

**C5 — Rate definition.**

- n348 defines collected ÷ pursued. The tracker defines recovered ÷ answered.
- **Classification:** Potential conflict.
- **Recommendation:** **Recovery rate = recovered ÷ amount disputed and answered**. Show
  "waiting" separately and never count it as a failure. This changes n348's definition and needs
  sign-off.

**C6 — Where evidence opens.**

- n108 and n141 say inline only. n115 allows a modal or drawer. The app uses a dialog for layer ③.
- **Classification:** Needs verification. 02 compares the options.

**C7 — Labels.** The meeting's "Recovered / Partially recovered" versus the app's *Fully / Partly
collected*.

- **Classification:** Needs verification.
- **Recommendation:** keep the existing terms (decided 2026-09-24) until the PM names them
  (Q-T1).

**C8 — Denied is final?**

- Meeting: denial truly closes the finding.
- The 2026-09-24 improvement plan said the customer "can start a new dispute for" the unpaid part
  of a partial answer. Lifecycle Q12 asks whether a denied finding can be disputed again.
- **Classification:** Needs verification.

**C9 — "No answer" closing state.**

- It is needed for "Which Billers respond?".
- 2026-09-25 removed "No reply yet" and the 7-day nudge ("keep only what the prototype had").
- **Classification:** Potential conflict. A closing state is not a nudge, but it is new.

**C10 — Credits realized when Implentio manages the dispute.**

- D8 says customer-reported. n167 and n32 want ingested Biller credit records.
- Who records the outcome of an Implentio-managed dispute?
- **Classification:** Needs verification.

**C11 — Answers recorded by Implentio** (raised by the plan review).

- n344 says "No collection outcome or amount appears without a customer save action" and outcomes
  are "never inferred by Implentio".
- n350 says *Denied* is the customer's report. n347 labels reasons "Customer-entered". D8 labels
  credits "Recorded by your team".
- An Implentio-managed dispute where Implentio records the answers breaks all four.
- **Classification:** Potential conflict.
- **Options:**
  - (a) Implentio records the answer, and the customer can confirm or correct it;
  - (b) Implentio reports the Biller's answer, and the customer confirms it to record it.
- In both, every answer shows its source, and *Credits realized* is labelled by source. This is a
  product decision (Q-O4).

---

## C. Proposed target lifecycle

### C1. Three dimensions instead of one status (Proposed; keeps n341)

The meeting's list mixes three different things. Keeping them apart makes the rules simple, and
they combine into one status label per finding:

1. **Stage**, where the finding is: *Ready to dispute* → *(in a draft)* → *In a prepared email* or
   *With Implentio* → *Waiting on Biller* → *Closed*.
2. **Result**, how it closed: *Fully collected* · *Partly collected* · *Denied* · *Won't pursue* ·
   *Closed, no answer* (Proposed, C9).
3. **Flags**, facts that change nothing about what's allowed:
   - *Past the dispute deadline*: replaces Expired (C1);
   - *Sent after the deadline*: already exists;
   - **Handled by**: *you* or *Implentio*, on the dispute rather than the finding.

```
             ┌──────────── Won't pursue (customer) ─────────────┐   Undo → Ready
             │                                                   ▼
 Published → READY TO DISPUTE ── (flag: past deadline — still allowed) ─┐
             │                                                          │
             ├─ Customer handles → IN A PREPARED EMAIL ─ I sent it ─────┤
             │                         └─ I didn't send it → READY      │
             ├─ connected send ─────────────────────────────────────────┤
             └─ Implentio handles → WITH IMPLENTIO ─ Implentio sends ───┤
                                       └─ take back (before sending) → READY
                                                                        ▼
                                                  WAITING ON BILLER (handled by you | Implentio)
                                                        ├─ Fully collected   ┐
                                                        ├─ Partly collected  │ CLOSED
                                                        ├─ Denied  (reason)  │ (answer date,
                                                        └─ Closed, no answer ┘  who recorded it)
                                                                        ▼
                                         HISTORY → Credit outcomes (patterns) → Guidance
                                                     (before the next dispute)
```

**Terminal states:**

- **Final:** the three Biller answers and *Closed, no answer*. They are still editable through
  *Change*, with history (n345). Whether a new dispute can follow is C8.
- **Reversible:** *Won't pursue*, through Undo.

**Non-terminal states:** everything else. Past the deadline is **not** a state.

### C2. Memo status and money under the new Expired rule (Unresolved — a product decision)

| Option | Past-deadline, undecided finding | Memo status | Money | Risk |
| --- | --- | --- | --- | --- |
| A — flag only (the literal reading of the meeting) | Ready to dispute, with a warning | *Ready to dispute* until every finding is decided | *Left to dispute* | Old memos never reach Done; "Left to dispute" fills with money the customer has given up on |
| B — past deadline, separate | Ready to dispute, with a warning, listed as past deadline | Doesn't hold the memo in *Ready to dispute*. The memo can be *Done* with "2 findings past deadline can still be disputed" | Its own **Past deadline** bucket, kept out of *Left to dispute* | **Brings calendar closure back one level up** (plan review F1): the memo reads Done, the tracker row shows $0.00 in grey and folds into Finished. A late dispute moves the memo from Done back to Waiting |
| C — ask once | At the deadline it asks "Dispute anyway or won't pursue?" | A "Needs a decision" status | *Left to dispute* until answered | Brings back the "Action needed" status removed on 2026-09-25 |
| D — open, aged (added after review) | Ready to dispute, with a warning | Stays *Ready to dispute* | Stays in *Left to dispute*, with a labelled sub-line: "of which $X past the deadline" | Age changes sorting and folding (old, past-deadline-only memos sort last), not status. Still never reaches Done without a decision |

**No recommendation yet.** The meeting's principle ("closure comes from a business outcome")
favours A or D; B is tidier but closes by the calendar in the UI. In every option a **"Won't pursue
the rest"** action lets a customer close an old memo on purpose. 01 shows each option on the
tracker row, memo headline and money.

### C2b. What every state means for the memo, the money and whose move it is

The plan review (F7) found new states with no memo or money mapping. Proposed mapping (01 makes
it inspectable):

| Finding state | Memo status contribution | Money bucket | Whose move | In the recovery rate? |
| --- | --- | --- | --- | --- |
| Ready to dispute | Ready to dispute | Left to dispute | Customer (or Implentio in a delegated account, Q-O8) | No |
| Ready to dispute, past deadline | Per C2 option | Per C2 option | Same as above | No |
| In a prepared email | Ready to dispute (today) | Left to dispute | Customer: "Did you send it?" | No |
| With Implentio | **Waiting** (Proposed; not "Your move") | Waiting on Biller, or its own "With Implentio" line | Implentio | No |
| Waiting on Biller | Waiting on Biller | Waiting on Biller | Biller (customer records the answer) | No |
| Fully / Partly collected | Done (closed) | Recovered (+ Not recovered for the rest) | — | Yes |
| Denied | Done (closed) | Not recovered | — | Yes |
| Closed, no answer | Done (closed) | **Unresolved:** Not recovered, or its own line | — | **Unresolved (Q-S3):** never silently counted as a failure |
| Won't pursue | Done (closed; Undo reopens) | Not disputed | — | No |
| Implentio needs something (added after re-review, N5) | Waiting on Biller, with a flag | Waiting on Biller | Customer: answer Implentio's request | No |
| Answer to confirm (C11 option b) | **Not** "Waiting on Biller" — the Biller has answered. A customer to-do, "Answer to confirm" | Waiting until confirmed | Customer | Not until confirmed |
| Left out by Implentio (M2) | Ready to dispute (Q-03a) | Left to dispute | Customer, or Implentio marks Won't pursue (Q-03a) | No |
| Implentio couldn't take it | Ready to dispute (the findings come back) | Left to dispute | Customer | No |

### C3. Terminology (keep existing; flag for the PM)

| Meeting example | Use (existing unless marked) |
| --- | --- |
| Available to dispute | *Ready to dispute* |
| Selected / preparing dispute | Draft selection ("N selected" in the bar) · *In a prepared email* |
| Dispute in progress | *Waiting on Biller*, plus "Handled by Implentio" when true |
| Recovered / Partially recovered | *Fully collected* / *Partly collected* (answers) · *Recovered* (money) |
| Denied by biller | *Denied* |
| Dismissed / not pursued | *Won't pursue* |
| Implentio-managed | **Proposed:** *Handled by Implentio* (status line) and *With Implentio* (stage before Implentio sends) |
| (none) | **Proposed:** *Past deadline* (flag) · *Closed, no answer* (result) |

---

## D. Feature breakdown

Six features, kept as the brief suggested. I considered other splits and rejected them:

- **01 separate from 04.** 01 is the rules everything else reads; 04 is the capture UI that
  produces the data 05 and 06 need. They change at different speeds and can be refined
  separately.
- **05 separate from 06.** 06 appears on four screens and its hard problem is how confident to
  sound; 05 is one page. 06 reuses 05's metric definitions and is refined after it.
- **No separate "terminology" feature.** Terms travel with 01, the rules they describe.

| # | Feature | Core question | File |
| --- | --- | --- | --- |
| 01 | Status & dispute eligibility model | What states exist, what moves between them, what counts as closed, and what past-deadline means | `01-status-model.html` |
| 02 | Findings evidence ("Show me why") | How a customer goes from *what* to *why* to *which records*, from one package to hundreds, without long pages | `02-findings-evidence.html` |
| 03 | Dispute ownership | Where and how the customer chooses *you* or *Implentio*, and how everyone sees who's responsible | `03-dispute-ownership.html` |
| 04 | Outcome capture | How an answer is recorded with amount, date and reason, fast enough to actually happen | `04-outcome-capture.html` |
| 05 | Credit outcomes as intelligence | What we learned by variance type and by Biller, instead of totals | `05-credit-outcomes.html` |
| 06 | Historical guidance | Where "what should I know before disputing this?" appears, and how confident it sounds | `06-historical-guidance.html` |

### F1 — Status & dispute eligibility model

- **Scope:** the stage/result/flag model (C1); the past-deadline options (C2); *Closed, no answer*;
  Undo after the deadline; *With Implentio* as a stage; memo status and money buckets; the
  terminology table.
- **Main flow:** Ready → selected → prepared or handed off → waiting → answered → history.
- **Key states:** Ready to dispute (and past deadline); In a prepared email; With Implentio;
  Waiting on Biller; the four results; Won't pursue.
- **Edge cases:**
  - a prepared email discarded after the deadline (today it becomes Expired at once);
  - a memo whose open findings are all Won't pursue (L13);
  - an old memo with everything past the deadline;
  - a whole-memo dispute (no deadline);
  - an answer changed after closing;
  - a partial answer followed by a new dispute for the rest (C8).
- **Classification:** business logic plus UI; touches `outcomes.ts`, the tracker, the memo page,
  Credit outcomes, and scenarios and tests.
- **Not as small as it looks:**
  - Q-S4 (dispute a finding again) changes the data model 04–06 build on. Today one `collection`
    lives on the finding, so a second attempt would overwrite the first denial or double-count
    the amount.
  - **Proposed:** store answers per dispute attempt (`DisputeRecord.items[] {findingId, amountN,
    answer}`). Either answer to Q-S4 then fits without a migration.
  - **If Q-S4 = yes** (from the re-review, N4): a finding's result *combines* its attempts. For
    example, $20 of $35.10 recovered, with the rest disputed again and denied, is still *Partly
    collected*, with a note. The recovery rate counts each finding's money once; attempts count
    only for history and time to answer.

### F2 — Findings evidence ("Show me why")

- **Scope:** the three layers; where layers ② and ③ live (inline, dialog, drawer or page); a
  "Sources" part (rate card, fuel index, DAS list, invoice) with honest "not available" states;
  packages Implentio couldn't check (`docGroups`); findings with no package data; a variance
  spread ("most packages were off by $X; a few by much more").
- **Density cases:**
  - 1 package (mock);
  - 3 packages ($4.68);
  - 13 packages ($22.64);
  - 172 tiny variances ($35.10: lots of packages, little money);
  - 510 packages ($9,322.20);
  - a mixed-charge finding (154 packages, base freight plus fuel);
  - a finding with no package data (non-golden memo);
  - records Implentio couldn't check.
- **Content first, container second** (revised after the plan review, F6).
  - The trust gap is mostly **missing sources in layer ②** (L9), not the container.
  - 02 therefore leads with what layer ② says, for example one sourced line: "Contract rate:
    QuickBox rate card v3 (Mar 2026) · zone 5 · 2 lb = $8.12". It also leads with the hard cases:
    findings with no package data, and records Implentio couldn't check.
- **Layer ③ stays "Records" only.** It doesn't duplicate the explanation.
- **Container options compared:**
  - A. Today's inline ② and dialog ③.
  - B. Inline ② with ③ as a full-height dialog plus a deep link.
  - C. A dedicated finding page.
  - D. A side panel.
  - E. Inline ③ (n108, n141, n175).
- **No container is recommended until Q-E1 is answered:** what did the client try to find and
  couldn't? Did they see the current build?
- n108 and n141 ("never a modal") conflict with A, B and D, which is C6.
- **Classification:** mainly UI; sources and lineage need data from Toolbelt (Q-E2).

### F3 — Dispute ownership

- **The level comes first** (Q-O8, plan review F2). 03 shows two peer models and recommends
  neither until the meeting's scope is confirmed:
  - **M1, per dispute.** Same starting point: ticked findings → *Dispute with QuickBox*. Step 1
    asks **"Who will contact QuickBox?"** with two options, *I'll send it* (today's flow) or
    *Implentio handles it*. Variant: two buttons in the selection bar.
  - **M2, per Biller or account.** "Implentio handles our disputes with QuickBox". The customer
    doesn't tick findings; Implentio selects and decides; a per-dispute override stays possible.
    03 shows what the tracker's **Your move** card, the deadlines and *Won't pursue* say when the
    move is Implentio's, and how D6 (no pre-selection) applies.
- **Implentio path:**
  - Step 2 becomes **"What Implentio will do"**: who they'll contact, what they'll send (the same
    evidence and claim text, read-only), and a "Note for Implentio" field.
  - Step 3 becomes **Hand over to Implentio** → confirmation.
  - Stage *With Implentio* → *Waiting on Biller · handled by Implentio* → answers, shown with
    their source. Who is allowed to record them is C11, Unresolved.
  - Handed-over findings count as **waiting**, not "Your move" (C2b).
  - The dispute card shows a progress timeline (handed over · sent to QuickBox · answers) and
    "Implentio needs something from you" when a request is open.
- **Changing owner (Proposed, from plan review F8):**
  - The owner choice locks once any part of the email has left the app. The customer first answers
    "Did you send it?" or discards the prepared email.
  - A hand-over reserves its findings, like a prepared email. A memo has at most one open
    prepared email or hand-over.
  - *Take it back* works only until Implentio confirms it has started.
  - If the deadline passes while Implentio holds the dispute, the record keeps who held it, so
    "sent after the deadline" isn't blamed on the customer.
- **Customer-managed path:** unchanged. "CC my Implentio support team" stays and still never
  means ownership (n326).
- **Agents later:** the dispute stores `handledBy: 'customer' | 'implentio'`, and each event
  stores an actor (a person, Implentio staff, or later an Implentio agent). The UI talks about
  "Implentio", never a named person or bot, so an agent can take over without a UX change.
- **Classification:** business model plus workflow plus data. Most answers aren't in the code
  (Q-O1 to Q-O8).

### F4 — Outcome capture

- **Kept:** answers recorded per finding, in place, on the dispute card (liked; no bulk "all
  collected", per 2026-09-24 feedback).
- **Proposed:**
  - **Denied** opens one short inline form before saving: *What did QuickBox say?* (free text,
    optional but asked for) and *When did they answer?* (defaults to today).
  - **Partly collected** asks for amount, date, and *Why not the full amount?* (optional). This
    restores n344's date requirement.
  - **Fully collected** stays one click, but every answer row shows **"Answered on [today ▾]"**
    inline while answering, not hidden behind a later *Change date* (plan review F4). Without the
    Biller's real answer date, "time to answer" in 05 and 06 would measure the customer's logging
    lag.
  - Answers are stored **per dispute attempt**, so a second dispute on the same finding keeps both
    attempts (see F1, Q-S4).
  - New **Closed, no answer** (C9), available after N days, with an optional note.
  - "Use the same reason for the other denied findings in this dispute?"
  - Paste or attach the Biller's reply (later).
- **Where it shows later:** the dispute card, the finding's status line, Credit outcomes (05) and
  guidance (06), with the label "Recorded by {name}" or "Recorded by Implentio".
- **Classification:** UI plus data (answer date, reason on partial, a new result).

### F5 — Credit outcomes as intelligence

- **Top:** no tiles and no donut. One line of scope ("14 disputes answered since Mar 2026 ·
  4 still waiting"), with a link to the tracker for the money.
- **Two views:** **By variance type** and **By Biller**.
  - Each row: disputes answered, an outcome mix bar (fully / partly / denied / no answer, with
    waiting shown apart), recovery rate (C5), typical time to answer, most common denial reason,
    and a **sample-size marker**.
  - A row opens a detail panel: the Biller × type breakdown, recent cases, and denial reasons
    quoted with a link to each dispute.
- **Denial patterns:** reasons grouped (manually, or by keyword in the mock) with counts and
  cases.
- **Recent history:** the latest answers.
- **Every finding:** today's ledger, kept as a secondary tab.
- **Thin data is the normal state:** the real demo has 3 answers (and 4 waiting) across 3 Billers. The page
  must look right with 4 answers and with 60. The mock shows both.
- **Not trustworthy yet: time to answer.** Today's data has only recording dates. Until 04
  captures the Biller's answer date, show it as "not measured yet", or label it "recorded after
  N days" (plan review F4).
- **Answered % is left out of v1** (Q-D2, re-review N2). It would measure whether customers close
  stale disputes, not how responsive the Biller is. If it's wanted later, count disputes waiting
  longer than N days as unanswered for this metric only, without changing any status.
- **Pattern labels** ("usually paid in full") only at the Pattern tier (re-review N1):
  - at least 6 answers, and at least 75% with the *same* answer;
  - worded as counts, with the time window;
  - using the same tier function and 12-month window as 06.
- **Rates show their counts:** "3 of 4 answered · 91% of the money". The rate is by amount;
  guidance (06) uses counts.
- **Attempts, not findings:** "answered" counts dispute attempts for history. Money in the rate
  counts once per finding (N4).
- **Mixed-charge findings** (for example shipping price and fuel) need a type rule (Q-D5).
- **Classification:** new page purpose; aggregation and metric definitions; depends on F4's data.

### F6 — Historical guidance

- **Where it appears:**
  - the finding card (layer ②, "Past disputes like this");
  - step 1 of *Dispute with QuickBox*;
  - the past-deadline flag, only if a "late disputes with this Biller" slice is defined and
    reaches the Pattern tier; otherwise nothing (re-review N7; Q-G1);
  - the Implentio hand-over;
  - Credit outcomes detail panels.
- **Confidence tiers (Proposed; thresholds are Q-G1). Counts everywhere, never percentages:**

  | Tier | When | What it shows |
  | --- | --- | --- |
  | None | fewer than 3 answered cases | Nothing, or "No past disputes like this yet" in Credit outcomes only |
  | Early signal | 3–5 cases | Counts, not percentages: "2 of your 3 fuel-charge disputes with QuickBox were paid in full" |
  | Mixed (added after review) | 6 or more cases, under 75% the same way | Only the counts ("5 paid in full, 2 partly, 2 denied"), with no pattern sentence |
  | Pattern | 6 or more cases and at least 75% the same way | A still-past-tense sentence, the time window, and a link to the cases |

- **Where the customer decides what to include** (dispute step 1, the past-deadline flag): show
  only the Pattern tier, collapsed, so guidance doesn't steer the selection (plan review F9).
  Early signals appear only in layer ② and in Credit outcomes.
- **Excluded until 04 captures answer dates:** response time and "how often they answer".

- **Never:**
  - predictions ("likely to be approved", "87% chance");
  - traffic-light verdicts;
  - hiding or de-selecting findings. D6 says no pre-selection; guidance never steers the
    selection.
- **Tips from denials:** a denial reason that repeats becomes a *what helped / what was missing*
  note, linked to the cases. Implentio-written Biller notes are a separate, labelled source
  (Q-G2).
- **Classification:** UI plus rules. No recommendation engine. Depends on 05's definitions and
  04's data.

---

## E. Dependencies

| Feature | Depends on | Unblocks | Can start now, independently |
| --- | --- | --- | --- |
| 01 Status model | Decisions only (C1, C2, C8, C9). Q-S4 decides the answer data shape | 03, 04, 05, 06 | Yes. Decision-heavy; logic is small, but Q-S4 shapes 04's data |
| 02 Evidence | Q-E1 (what the client couldn't find) decides the container; data answers for sources (Q-E2); 01 only for the status chip | 06 (placement inside layer ②) | **Yes. Fully parallel** |
| 03 Ownership | 01 (the *With Implentio* stage, owner field); business answers (Q-O*) | 05 (filter by who handled it), 06 (hand-over guidance) | Design yes; build waits on Q-O1–Q-O4 |
| 04 Outcome capture | 01 (*Closed, no answer*, answer date) | 05, 06 (the data they read) | Yes, once 01 settles C9 |
| 05 Credit outcomes | 04 (answer dates, reasons); 01 (clean results); C5 (rate) | 06 | Design yes; real value needs 04's data |
| 06 Guidance | 05 (definitions, tiers), 04 (reasons), 02 and 03 (where it appears) | — | Wording and tiers can be drafted now |

---

## F. Open questions

Grouped by owner. None is answered in this plan.

**Status and eligibility (Implentio product and ops)**

- **Q-S1:** Past the deadline — which option (C2 A/B/C/D)? Should the deadline still be shown at
  all, or only as a warning?
- **Q-S2:** Can Won't pursue be undone after the deadline (C2)?
- **Q-S3:** Is a *Closed, no answer* result wanted? After how long can it be chosen? Does it count
  in the recovery rate as a failure or apart?
- **Q-S4:** Can a denied finding, or the unpaid part of a partial answer, be disputed again (C8)?
  Is that a new dispute on the same finding?
- **Q-S5:** What counts as "another explicit resolution"? For example, the Biller corrects the
  next invoice instead of issuing a credit.
- **Q-S6 (still open from n351):** the deadline granularity — per finding, invoice or memo.

**Evidence (Implentio audit pipeline)**

- **Q-E1:** Did the client's "Show me why" feedback refer to the current three-layer build or to
  the prototype? What did they try to find and couldn't?
- **Q-E2:** Which sources can Toolbelt attach per finding: rate card name, version and effective
  date; fuel index and week; DAS ZIP list version; contract clause? Per finding or per package?
- **Q-E3:** Should records Implentio couldn't check ("rate card required") be shown to customers,
  and with what call to action?
- **Q-E4:** Do layers ② and ③ need to be shareable outside the app (for the Biller or a
  colleague)? This decides dialog versus page.

**Ownership (Implentio business)**

- **Q-O8 (ask first):** is the choice made per dispute, per Biller, or per account? What exactly
  did the meeting mean? This decides M1 versus M2 in 03.
- **Q-O1:** Is Implentio-managed a paid service, included in a plan, or per request? Can every
  account use it?
- **Q-O2:** Does the Biller accept disputes from Implentio? Is an authorisation letter or
  agent-of-record needed? From which mailbox does Implentio send (its own, or the customer's
  connected one)?
- **Q-O3:** What's the service promise, for example "Implentio sends within 2 business days"? What
  if the hand-over is 1 day before the deadline?
- **Q-O4:** Who records outcomes and confirms the credit actually arrived (C10, C11)? Does the
  customer confirm answers Implentio reports, given n344 and n350?
- **Q-O5:** Can the customer take it back after Implentio sent it?
- **Q-O6:** Does the customer see Implentio's correspondence with the Biller, or a summary?
- **Q-O7:** Can a dispute mix owners (some findings Implentio, some the customer)? Proposed: no,
  one owner per dispute, and different findings can go in different disputes.
- **Q-O9:** In a delegated account (M2), who may mark *Won't pursue*? What does the customer see
  for deadlines?

**Intelligence and guidance**

- **Q-D1:** Recovery rate: recovered ÷ answered (proposed) or n348's collected ÷ pursued?
- **Q-D2:** "Response rate" needs the Biller's answer date and a no-answer result (F4). Is
  measuring it wanted?
- **Q-D3a:** Pooled denial reasons across customers are forbidden by n347. Confirm that still
  holds.
- **Q-D3b:** Are pooled, anonymised outcome rates per Biller allowed? Not covered by n347.
- **Q-D4:** How many answered disputes does a typical account have per Biller × type per year?
  The Pattern tier (6 or more) may be months away for most accounts.
- **Q-D5:** How are findings typed for history when the title and the charge mix disagree?
  - Explicitly mixed findings: for example "Shipping price and fuel".
  - A "Home-delivery fee" finding whose home-delivery charges were $48.36 *below* contract.
  - $1,322.77 of "Shipping price" that is actually fuel.

  Linked to Q-E7 (re-review N8).
- **Q-G1:** Minimum sample for any guidance (proposed: 3 for an early signal, 6 for a pattern)?
- **Q-G2:** Can Implentio staff write Biller notes ("QuickBox needs the rate sheet attached")? Who
  maintains them?

**Terminology (PM)**

- **Q-T1:** *collected* versus *recovered*; *Handled by Implentio*; *Closed, no answer*; *Past
  deadline*; the name for a variance group (D7, still open).

---

## G. Data implications

Legend:

- **Have:** in the domain model or fixtures today.
- **Verify:** probably exists in Implentio's pipeline; confirm.
- **Missing:** not available.
- **New field:** what production needs.

| Feature | Have | Verify | Missing | New fields (proposed) |
| --- | --- | --- | --- | --- |
| 01 | `pursuit`, `disputeDeadline`, `collection.status`, `prepared`, `sentAfterDeadline`, record `state` | Whether deadlines are contractual per Biller | Closing reason for no answer; past-deadline decision | `collection.status += 'no_answer'`; `pastDeadlineAt` derived (not stored); `DisputeRecord.state += 'handed_off'` |
| 02 | Per package: tracking, SO, invoice, month, carrier, service, warehouse, ZIP, label date, zones, weight, the five charge pairs; per service slices; `why`, `driver`, `mixUnfav`, `chargeMix`; `docGroups` (fixture only) | Rate card name, version and effective date; fuel index week and %; DAS list version; the contract clause per finding; a reviewer and date (n1) | Rate-cell lineage (n76); package data for non-golden memos; formula inputs per package | `finding.sources[] {kind, name, version, effectiveDate, fileRef?}`; `finding.reviewedBy/At`; `uncheckedRecords` in the domain |
| 03 | `sentBy`, `via`, `senderEmail`, CSM on the account, CC-support flag | CSM workflow today (how CSMs send for customers now) | Owner, hand-over time, Implentio's send, requests to the customer | `DisputeRecord.handledBy`, `handedOffAt/By`, `noteForImplentio`, `state += 'handed_off' / 'returned'`, `heldByAtDeadline`, `events[] {at, actor {type: person / implentio / agent}, kind, text}`, `openRequest?`, `answer.confirmedBy` (C11 option a), `account.delegation {level: dispute / biller / account, billers[]}` (M2) |
| 04 | `collection {status, amountN, date, reason, changedBy/At, history}` (one per finding) | — | The Biller's answer date as distinct from the recording date; a partial-answer reason in the UI; the reply itself; more than one attempt per finding | Answer per attempt: `DisputeRecord.items[] {findingId, amountN, answer {status, amountN, answeredOn, reason, note, recordedBy {type}, history}}`; the finding's result combines its attempts (N4); `attachments[]` (later) |
| 05 | Biller, category, amounts, status, date, reason per finding; `sentAt` per dispute; `outcomesBy3pl()` | Enough history per account to be useful | Answer dates (see 04); reason groups; owner (see 03) | Derived only: recovery rate (C5), days to answer, sample size. Optional `reasonTag` (later, only if free text proves hard to group) |
| 06 | Whatever 05 derives | Implentio-authored Biller notes | Pooled benchmarks (n347) | `billerNotes[] {biller, text, author, updatedAt}` (only if Q-G2 = yes) |

---

## H. Recommended order

Three separate views, then the recommendation.

| | Logical dependency | UX priority (client emphasis) | Implementation complexity |
| --- | --- | --- | --- |
| 1 | 01 Status model | 02 Evidence ("one of the largest problems") | 04 Outcome capture (low–medium) |
| 2 | 04 Outcome capture | 05 Credit outcomes | 01 Status model (medium: logic in one file, used everywhere) |
| 3 | 03 Ownership | 01 Status model (the Expired change) | 06 Guidance (medium: wording and thresholds) |
| 4 | 05 Credit outcomes | 03 Ownership | 02 Evidence (medium–high: data unknowns) |
| 5 | 06 Guidance | 04 Outcome capture | 05 Credit outcomes (medium–high: new page and aggregation) |
| 6 | 02 Evidence (independent) | 06 Guidance | 03 Ownership (high: business process and back office) |

**Recommended sequence:**

1. **01 Status model:** refine first. It's mostly decisions, and four features read it. The
   Expired change is a confirmed client decision whose consequences need choosing (C2), and Q-S4
   fixes the answer data shape 04 needs.
2. **02 Evidence:** in parallel with 01. It's independent and highest UX value. Ask Q-E1 and
   Q-E2 first: they decide the container and how much of the "Sources" part can be real.
3. **04 Outcome capture:** cheap, and it **starts collecting the data 05 and 06 need**. Every week
   without an answer date and reason is history lost.
4. **05 Credit outcomes:** once 04 settles what's captured.
5. **03 Ownership:** design alongside 04 and 05; build only after the business answers Q-O1–Q-O4.
   This is the biggest unknown and the least UI-bound.
6. **06 Guidance:** last. It's only as good as 04's data and 05's definitions.

**Open first:** `prototype-planning/00-overview.html`, then `01-status-model.html`.

---

## I. Plan review log (ui-ux-adversary, plan mode, 2026-09-28)

**Verdict:** keep, with targeted changes.

F1, F2 and F3 were flagged as **product-logic issues**. They are now decisions for you and the
client (C2, Q-O8, C11), not settled in this plan.

| ID | Severity | Decision | What changed |
| --- | --- | --- | --- |
| F1 | HIGH | Accept | Option B (then recommended) closed memos by the calendar in the UI. Added option D; C2 no longer recommends an option |
| F2 | HIGH | Accept | The ownership level is now the first question (Q-O8). 03 shows per-dispute (M1) and account/Biller delegation (M2) as peers, with "whose move" for delegated accounts |
| F3 | HIGH | Accept | New conflict C11: Implentio-recorded answers versus n344, n350, n347 and D8. Two options; every answer shows its source |
| F4 | HIGH | Accept | The answer date shows inline on every answer. Time-to-answer and response metrics stay "not measured yet" until it's captured |
| F5 | HIGH | Accept | Answers stored per dispute attempt, so Q-S4 can go either way without a migration |
| F6 | HIGH | Accept | 02 is content first (sourced layer ②, no-package and unchecked cases); ③ is Records only; no container pick until Q-E1 |
| F7 | MEDIUM | Accept | New C2b matrix: state → memo status, money, whose move, counted in the rate |
| F8 | MEDIUM | Accept | Owner-change rules: locked after a handoff, hand-over reserves findings, take-back window, who held it at the deadline |
| F9 | MEDIUM | Accept | Mixed tier; counts everywhere; only the collapsed Pattern tier at selection points |
| F10 | MEDIUM | Accept | Q-D3 split into Q-D3a (reasons, forbidden) and Q-D3b (outcome rates, undecided); new Q-D4 (volumes) and Q-D5 (mixed-charge types) |

Dropped as LOW, noted here:

- A deep link into a dialog is inconsistent with "Check details never opens a dialog". This
  matters only if 02 picks a dialog.
- The *N days* before *Closed, no answer* is unspecified (Q-S3).
- An always-available Undo means memos can flip back from Done. Listed in 01's edge cases.

**Re-review, round 1 (after the explorations were built).** All six HIGH fixes hold in the plan
and in 00–06. New findings, all accepted; none changes the interaction model:

| ID | Severity | Decision | What changed |
| --- | --- | --- | --- |
| N1 | HIGH | Accept | 05's "Usually paid / Often denied" fired from 3 answers. Now Pattern tier only, with 06's tier function and 12-month window |
| N2 | MEDIUM | Accept | Answered % left out of 05 v1 (Q-D2) |
| N3 | MEDIUM | Accept | Reasons labelled by who recorded them, not always "Customer-entered" (03–05) |
| N4 | MEDIUM | Accept | A finding's result combines its attempts; money counted once in the rate |
| N5 | MEDIUM | Accept | Four more rows in C2b and 01: Answer to confirm, Implentio needs something, Left out by Implentio, Implentio couldn't take it |
| N6 | MEDIUM | Accept (product logic → the user) | 03 shows the M2 + option A/D + C11(b) combination as a risk for the user to decide; service-promise wording tagged Q-O3 |
| N7 | MEDIUM | Accept | Stale examples fixed (past-deadline guidance, 01 late path, 00 option wording) |
| N8 | MEDIUM | Accept | Q-D5 widened to titles that disagree with the charge mix; linked to Q-E7 |

---

## Appendix — files and conventions

- `prototype-planning/*.html` are self-contained and need no network.
- They are styled with the app's `--ds-*` token values (copied from `src/styles/tokens.css`) so
  mock UI looks like the product; annotations use a separate dashed "planning note" style.
- Every claim is tagged *Existing* / *Newly confirmed* / *Proposed* / *Unresolved*.
- Sample data:
  - Amounts and counts on the golden memo come from the demo fixtures.
  - Package rows are **synthetic**, generated to match those counts. Tracking numbers are fake,
    because the fixture rows come from a real customer's invoices.
  - History data in 05 and 06 is **mock**, labelled as such, alongside a "your real data today"
    view.
