# Implentio — Product Requirements (mined from the prototype)

The Phase-1 prototype embedded 309 numbered requirement notes
("product notes") written for engineers. This file preserves them verbatim,
grouped by scope, with original note numbers for traceability. They describe
the *intended* product behavior; the parity build implements the shipped
subset, and scopes such as "Deferred to 3.0" and "Illustrative Only" mark
work that is explicitly out of Phase 1 scope.

Regenerate with: `node tools/decode-template.mts && node tools/mine-notes.mts`

## Contents

- New for 2.5 (140 notes)
- Engineering Requirement (84 notes)
- BI Concept — Proposed Change (21 notes)
- BI Concept — Engineering Validation (12 notes)
- Future Build Potential / Not App 2.5 Functional Scope (12 notes)
- Prototype Data Contract (7 notes)
- BI Concept — From Jason's Brief (6 notes)
- BI Concept — Test With Customers (6 notes)
- Deferred to 3.0 (6 notes)
- BI Concept — Illustrative Only (4 notes)
- Existing (2 notes)
- Future Build Potential / Not App 2.5 Prototype Scope (2 notes)
- Prototype UX Requirement (2 notes)
- Deferred to future (1 notes)
- Future-state source access — not required to change the current finding-card layout (1 notes)
- Intentional Low-Fidelity App 2.5 Experience / Future Product Attention Required (1 notes)
- Positioning (1 notes)
- Sequencing decision (1 notes)

## New for 2.5

### Note 1: Only human-approved findings can appear to customers

  - **Requirement:** Customers only see variance findings that an Implentio reviewer has approved.
  - **Behavior:** Findings surface in a credit memo only after internal review approval; every overcharge group shows a Human Reviewed badge with reviewer and date.
  - **Dependency:** Approved-finding records from the internal review system (Toolbelt).
  - **Constraint:** App 2.5 reads approved findings only. It does not expose the internal accept/reject workflow.
  - **Acceptance:** No unreviewed or rejected finding is ever visible in the customer app.

### Note 3: Total variance is the primary financial metric

  - **Requirement:** The primary customer-facing financial value is Total variance: the combined difference between invoiced and expected charges across the packages included in the credit memo.
  - **Behavior:** Total variance is calculated by summing the total differences for the packages included in the credit memo, and is shown on Credit Tracker cards, the credit memo summary, grouped finding summaries, and the latest report and export sections.
  - **Dependency:** Package-level invoiced and expected charges for the displayed credit memo version.
  - **Constraint:** The calculation is never depicted as potential overcharge minus potential undercharge, and no standalone potential-undercharge total appears anywhere in the interface.
  - **Acceptance:** All displayed totals are calculated from the package population associated with the displayed credit memo version.

### Note 4: The $30 threshold is an internal review threshold, not a customer credit threshold

  - **Requirement:** The $30 threshold governs internal manual review only. It must not be presented as a minimum customer credit threshold or as an audit result.
  - **Behavior:** Every identified variance is included in the credit memo and the exported customer report regardless of amount. Invoices are classified by their actual result (potential overcharge, potential undercharge, no variance identified), never as 'below $30'.
  - **Dependency:** Per-invoice signed variance and the internal review threshold configuration.
  - **Constraint:** An amount below $30 does not make a finding ineligible for recovery, and it is not sufficient on its own to mark an invoice ready for Finance approval.
  - **Acceptance:** No customer-facing screen shows 'Below $30 threshold' as an audit result, and findings under $30 still appear in totals and the report.

### Note 6: PDF preview reuses the generated report

  - **Requirement:** The in-app preview must reflect the same report generated for the customer.
  - **Behavior:** Preview Report renders the already-generated credit-memo summary; it does not regenerate or recompute.
  - **Dependency:** The generated report artifact for the current memo version.
  - **Constraint:** Preview is read-only and mirrors the exported document.
  - **Acceptance:** Preview content matches the downloadable report exactly.

### Note 8: Report previews and downloads must be tracked

  - **Requirement:** Every preview and download is recorded against the credit memo.
  - **Behavior:** Opening the preview or downloading the credit memo records a timestamped event against the credit memo and report version, adds an entry to the memo's export history, and flips the tracker card to Report Downloaded.
  - **Dependency:** Activity log store, keyed by credit memo and report version.
  - **Constraint:** Tracking is per report version within the memo.
  - **Acceptance:** Each preview and download is recorded with time, user, and report version.

### Note 9: 'Variance' is used instead of 'error'

  - **Requirement:** Customer-facing copy uses neutral finance language.
  - **Behavior:** The UI says variance, potential overcharge, and potential undercharge — never error, owed credit, or unfavorable.
  - **Dependency:** Copy standards.
  - **Constraint:** Amounts are never described as approved or guaranteed credits.
  - **Acceptance:** No customer-facing string uses error or owed-credit language.

### Note 13: The credit memo is the unit of audit, not the invoice

  - **Requirement:** The workflow begins with a credit memo that contains the invoices audited during one period.
  - **Behavior:** Credit Tracker lists credit memos; opening one reveals its invoices, findings, and report. Customers never assemble invoices into a memo.
  - **Dependency:** Completed credit memos produced by Implentio after internal review.
  - **Constraint:** App 2.5 surfaces completed memos only; it does not let customers create or edit memos.
  - **Acceptance:** Every audited invoice is reached through the credit memo that contains it.

### Note 14: Invoices are not a standalone navigation destination

  - **Requirement:** Invoices are accessed through the credit memo that contains them, not a global invoice module.
  - **Behavior:** The sidebar exposes Credit Tracker as the entry point; invoices live inside a credit memo's Invoices section.
  - **Dependency:** Credit memo → invoice association.
  - **Constraint:** App 2.5 does not add a top-level invoice-management area.
  - **Acceptance:** There is no navigation path to invoices outside of a credit memo.

### Note 15: Carrier filtering operates within the credit memo

  - **Requirement:** Carrier filtering refines the view without altering the memo.
  - **Behavior:** Filtering by UPS, DHL, or OSM updates the invoice rows and the on-screen counts and totals, but does not change which invoices belong to the memo or recalculate the saved memo totals.
  - **Dependency:** Carrier attribute per invoice; saved memo totals as system-of-record.
  - **Constraint:** The full credit memo summary remains the system-of-record view even while filtered.
  - **Acceptance:** Clearing the filter restores the complete memo totals unchanged.

### Note 16: The platform provides a scannable invoice-detail view; Excel remains complete

  - **Requirement:** Customers can inspect a useful subset of invoice and order-level fields in-app and export the full detail.
  - **Behavior:** The invoice detail shows raw-data fields (sales order, tracking, service, zones, weight, charge-level amounts). Download provides all invoice-level detail for the memo, or only selected invoices, named with the memo ID and period.
  - **Dependency:** Raw-data pivot records per invoice.
  - **Constraint:** App 2.5 does not rebuild the workbook as an editable spreadsheet experience.
  - **Acceptance:** Export filename includes the credit memo ID and audit period (for example, CM-2026-0614_Invoice_Detail_June-1-14-2026.xlsx).

### Note 18: Credit memo periods follow the customer's reporting cadence

  - **Requirement:** Credit memos are organized by reporting-cadence-based audit periods, defaulting to a two-week cadence.
  - **Behavior:** Each memo shows its audit-period start and end dates and the configured cadence; most customers follow a two-week schedule.
  - **Dependency:** Customer reporting cadence / dispute cadence configuration.
  - **Constraint:** App 2.5 displays the configured cadence; it does not manage reporting cadence configuration.
  - **Acceptance:** Every memo shows an audit period consistent with the customer's configured cadence.

### Note 24: Credit memo lifecycle: how a period enters Processing and becomes Complete (needs refinement)

  - **Requirement:** The Processing status should represent a real, timestamped commitment that Implentio owes the customer an audit for a specific reporting-cadence period (for example, a two-week window) — not a live progress bar. Once the prior period's memo is complete and ready, the next period should automatically enter Processing.
  - **Behavior:** Draft lifecycle to refine: (1) Processing is initiated as a timestamp event marking that this period's audit is owed and underway. (2) When the previous period completes and its memo is ready, the next period begins Processing. (3) Internal review happens in Toolbelt; the customer platform shows only the Processing placeholder during this time. (4) When Toolbelt sends the completed credit memo to the customer-facing platform, the status changes to Complete and Ready. (5) That delivered credit memo report is the single source that powers all related data in the platform — invoices, findings, and totals. Invoice and order counts stay '—' until the memo is delivered.
  - **Dependency:** Reporting cadence configuration per customer and Biller, Toolbelt audit-lifecycle and memo-delivery events, and the delivered credit memo report as the system of record.
  - **Constraint:** App 2.5 displays Processing and Complete as statuses driven by Toolbelt's handoff; it does not run the audit, compute the memo, or expose Toolbelt. No platform data exists for a period until Toolbelt delivers its credit memo.
  - **Acceptance:** A period shows Processing from its initiation timestamp until Toolbelt delivers the memo, then flips to Complete and Ready; all in-platform data for that period is populated only from the delivered report. This lifecycle is documented for refinement before build.

### Note 25: Reporting period includes an April carryover invoice

  - **Requirement:** Every source record must be preserved. The workbook Summary includes an April invoice (QB3093811) alongside the May and June results.
  - **Behavior:** This credit memo presents April–June 2026 as the reporting period so no source record is discarded. The April invoice is a carryover adjustment included in the completed customer report.
  - **Dependency:** The workbook Summary tab (April, May, June sections).
  - **Constraint:** App 2.5 displays the period exactly as delivered by the completed report; it does not split or drop periods.
  - **Acceptance:** The April invoice appears in Invoices, the report preview, and the memo totals; nothing from the workbook is silently discarded.

### Note 27: Finding explanations state what differed, not an unproven cause

  - **Requirement:** The workbook supports what was different and where it occurred, but may not prove why.
  - **Behavior:** Overcharge groups describe a recurring difference between invoiced and expected amounts for the affected charge category and carrier, and direct users to the exported report for calculation detail. No operational root cause (expired rate, address classification, carrier policy) is asserted unless the source supports it.
  - **Dependency:** Validated Unfavourable records grouped by carrier and charge category.
  - **Constraint:** Production customer language requires a human-approved explanation; the workbook supports the affected population and amounts but may not independently prove the operational cause.
  - **Acceptance:** No finding invents a root cause beyond what the source material supports.

### Note 29: Package inclusion and the no-double-subtraction rule

  - **Requirement:** Packages are included in the credit memo when their combined charge-level differences result in an unfavorable variance.
  - **Behavior:** A package may contain both overcharged and undercharged charge components. Those components are already reflected in that package's total variance, which is what rolls up into Total variance.
  - **Dependency:** Charge-level differences rolled up to a signed package total.
  - **Constraint:** Potential undercharges must not be subtracted from Total variance a second time. Where component-level variance cannot be reliably separated, show only the package's total variance.
  - **Acceptance:** Total variance equals the sum of the included packages' total differences, with no second netting step and no separate undercharge total displayed.

### Note 30: 'New' is an attention indicator on a ready, undownloaded report

  - **Requirement:** A completed credit memo shows a New indicator when its report is ready and has not yet been downloaded.
  - **Behavior:** Credit memos are ordered newest first by default. The New indicator draws attention to a ready report; it is not a distinct report status. Once the customer downloads the report, the indicator is removed and the memo shows the existing Downloaded status.
  - **Dependency:** Report-ready and report-downloaded events per credit memo and version; a per-memo download record for adoption measurement.
  - **Constraint:** A download confirms retrieval only. It does not confirm the report was submitted to the biller or that a credit was realized.
  - **Acceptance:** New appears only while a completed memo's report is ready and undownloaded, and disappears after the first download.

### Note 31: Download Credit Memo is available only when the report file is ready

  - **Requirement:** The Download Credit Memo action on a credit memo card is enabled only once the report file is ready.
  - **Behavior:** While a memo is auditing, both card actions — Download Credit Memo and Review findings — are visible but disabled. When the report is ready they become enabled; Download Credit Memo returns the workbook and Review findings opens the memo detail.
  - **Dependency:** Report-file-ready state per memo and version.
  - **Constraint:** The action returns the generated workbook only; it does not regenerate the report.
  - **Acceptance:** No card action is enabled for a memo whose report is still generating; both are enabled once it is ready.

### Note 34: Total variance covers only validated records

  - **Requirement:** Total variance must describe confirmed variance from packages Implentio could validate, excluding charges awaiting documentation.
  - **Behavior:** Unable-to-validate amounts are reported separately from Total variance and are never folded into it.
  - **Dependency:** Validation status per package and signed package-level variance.
  - **Constraint:** Unable-to-validate charges are always excluded from Total variance for the displayed version.
  - **Acceptance:** Total variance never includes unable-to-validate charges, and the interface states this separation.

### Note 35: Findings under $30 are included and classified by actual result

  - **Requirement:** All identified variances, including those under $30, are included in Total variance and the exported customer report.
  - **Behavior:** Affected-record tables classify each record by its actual finding (potential overcharge, potential undercharge, no variance identified) and records below $30 remain within their applicable finding group. Customer-facing finding descriptions map from the applicable Tool Belt error-group taxonomy.
  - **Dependency:** Tool Belt error-group taxonomy and human-review metadata.
  - **Constraint:** Human Reviewed is displayed only when a finding meets the defined review requirements; line-level rate calculations are provided in the exported report.
  - **Acceptance:** No sub-$30 finding is dropped from totals or the report, and no record is labeled 'Below $30 threshold'.

### Note 54: A credit memo has one stable ID and immutable sequential versions

  - **Requirement:** A credit memo represents one audit period and retains a stable credit memo ID. Revising a report does not create a second credit memo. Each newly published report under that credit memo creates an immutable, sequential version.
  - **Behavior:** Publishing Version 2 marks Version 2 as current and Version 1 as superseded. Previous report files are never deleted or overwritten. Previous versions are labeled Superseded (not Archived). Top-level Download Excel and Preview Report always open the current version, and all summary values, findings, invoices, and version metadata represent the current version.
  - **Dependency:** A versioned credit-memo data model with a stable memo ID and an ordered list of immutable report versions.
  - **Constraint:** Only authorized Implentio backend users can publish or replace report versions in App 2.5; customers cannot create, edit, or version memos.
  - **Acceptance:** One memo ID persists across revisions; the current version is authoritative for all top-level data and actions while prior versions remain intact and marked Superseded.

### Note 55: Updated is an attention indicator on a revised report

  - **Requirement:** Updated is an attention indicator, not a permanent report status, and is used only when a new version replaces a previously published customer report. For a revised report, Updated replaces New; the two are never shown together.
  - **Behavior:** A revised memo shows Updated, Report Ready, and the applicable version number, plus a customer-facing What changed callout on the credit memo summary and with the latest report in Report & Export History. After the customer downloads the latest revised version, Updated is removed and the memo shows Report Downloaded.
  - **Dependency:** Report-ready, report-updated, and report-downloaded events per credit memo and version.
  - **Constraint:** The Updated indicator is removed only after the customer downloads the current version; a download of a prior version does not clear it.
  - **Acceptance:** Updated appears only while a revised current version is undownloaded and never appears alongside New.

### Note 56: Every Version 2+ publish carries a required, customer-safe change summary

  - **Requirement:** The backend must provide a required customer-facing change_summary whenever it publishes Version 2 or later.
  - **Behavior:** The change summary may describe corrected source data, classification changes, rate-card changes, calculation corrections, or other report revisions — for example, correcting a carrier-service classification and recalculating affected invoices. It is displayed on the credit memo summary and with the latest report in Report & Export History.
  - **Dependency:** A required change_summary and a reason-for-update category on each published version.
  - **Constraint:** Change summaries must use customer-safe language and must not expose internal debugging information or Tool Belt terminology.
  - **Acceptance:** No revised version is published without a customer-safe change summary, and no summary leaks internal tooling terms.

### Note 57: Report & Export History separates the current version from previous versions

  - **Requirement:** Report & Export History is divided into a Latest report section (version number, published or updated date, report status, customer-facing change summary, Download Excel, Preview Report) and a Previous versions section (each prior version as Superseded with its published date, its own summary snapshot note, and Download Excel and Preview Report).
  - **Behavior:** Previous versions are visually secondary but remain accessible. Their actions open the files and summary snapshot associated with that version and never route the customer into current-version findings or tabs. The export history distinguishes report publication from report download.
  - **Dependency:** Per-version stored publication date, publisher, status, change summary, files, summary-value snapshot, and download activity.
  - **Constraint:** Previous versions are immutable and available for audit and comparison; downloading a report does not mean it was submitted to the biller or that a credit was realized.
  - **Acceptance:** Each version's actions resolve to that version's own files and snapshot, and publication is tracked separately from download.

### Note 64: Credit Tracker displays parcel credit memos and reconciliation type is backend-classified

  - **Requirement:** The App 2.5 Credit Tracker displays parcel credit memos. Reconciliation type must be an explicit backend classification, not something the frontend derives.
  - **Behavior:** Under Reconciliations, Credit Tracker is a parent with Parcel as its active child; both open the Parcel Credit Tracker landing page with no intermediate landing page. The landing title is Parcel Credit Tracker, the credit memo detail header carries a subtle Parcel label (secondary to memo ID, audit period, version, report status, findings, and actions), and Report & Export History shows a subtle Parcel label on latest and previous-version metadata. Individual memo cards stay clean with no Parcel pill.
  - **Dependency:** A reconciliation-type classification on every credit memo, provided by the backend.
  - **Constraint:** Only records classified as parcel may be published to this module. The frontend must not infer reconciliation type from carrier names, report filenames, workbook tabs, or report contents, and Parcel is not added to filenames unless it already exists in the underlying report filename. Direct links to a credit memo detail must retain the Parcel navigation context.
  - **Acceptance:** Every memo in Credit Tracker is a backend-classified parcel memo; navigation, landing title, detail header, and report history all reflect Parcel without the frontend guessing the type.

### Note 65: Reconciliations is the parent structure; Parcel is a standalone destination

  - **Requirement:** Parcel sits directly under Reconciliations as its own top-level destination. The intermediate Credit Tracker grouping is removed from navigation so future validated reconciliation experiences can be added as siblings of Parcel without restructuring it.
  - **Behavior:** Parcel and Invoices are the reconciliation destinations in App 2.5. Future validated reconciliation types would appear as additional siblings under Reconciliations, each opening its own landing experience. Credit tracker remains the internal concept for the parcel credit memo list, not a navigation level.
  - **Dependency:** Per-reconciliation-type routes and landing pages as they are validated and added.
  - **Constraint:** No additional reconciliation navigation options are added in App 2.5, and adding a future type must not restructure or regress the Parcel experience.
  - **Acceptance:** The navigation model supports adding a new reconciliation destination without changing Parcel's route, data, or behavior.

### Note 66: Evidence used is associated to the specific variance group it supports

  - **Requirement:** Each variance group must be linked to the specific evidence documents used to calculate its expected charges, not to a general library of documents available for the customer.
  - **Behavior:** View evidence used expands a compact inline section listing each source with its role — a rate card used to calculate expected charges and the invoice records used as the source of invoiced charges. Each association carries, when available, document name, document type, carrier or biller, effective dates, version, and a source-file reference.
  - **Dependency:** A per-variance-group evidence association emitted by the backend, keyed to the credit memo version.
  - **Constraint:** The demo attaches evidence per group and does not fabricate effective dates or versions when the source is unavailable.
  - **Acceptance:** Every variance group shows only the evidence actually used for that group, with available metadata and no invented fields.

### Note 67: View source opens the actual stored source used, or shows an unavailable state

  - **Requirement:** View source must open the actual stored source document that was used to calculate the expected charge — not merely a related document available for that customer. If the source is unavailable, no active View source action is shown.
  - **Behavior:** When a source is stored, View source opens it (the invoice records resolve to the connected workbook). When a source is not attached to this version — as with the rate card in this demo — the row shows a Source not attached state instead of an active link.
  - **Dependency:** Per-document stored file reference and availability flag per version.
  - **Constraint:** Production must never generate placeholder or inferred links; an unavailable source is shown as unavailable or omitted.
  - **Acceptance:** No active View source resolves to a fabricated document, and unavailable sources never render an active link.

### Note 68: Updating a supporting document creates a new memo version, never a silent change

  - **Requirement:** Updating a rate card or other supporting document must not silently change an already published credit memo.
  - **Behavior:** A document change triggers an Implentio recalculation that publishes an updated, immutable credit memo version; the previously published version and its evidence remain intact.
  - **Dependency:** The versioned credit-memo publishing workflow (see notes 54–61).
  - **Constraint:** App 2.5 reads published versions only; recalculation and republishing are internal Implentio actions.
  - **Acceptance:** A supporting-document change is reflected only through a new published version, never by mutating an existing one.

### Note 69: Invoice detail expands inline as an accordion of group-scoped packages

  - **Requirement:** View detail expands orders directly beneath the selected invoice row. It must not open a popup, drawer, or separate page, and it must show only the packages on that invoice that contribute to the selected variance group.
  - **Behavior:** Selecting View detail changes the action to Hide detail and reveals a Packages section indented beneath and visually connected to its parent invoice, listing only the contributing packages (never unrelated, matching, undercharged, or unable-to-validate packages). Only one invoice accordion is open at a time.
  - **Dependency:** Package-to-variance-group contribution per invoice.
  - **Constraint:** Unrelated packages on the same invoice are excluded from a confirmed variance group.
  - **Acceptance:** The accordion is inline, labeled Hide detail when open, and contains only packages contributing to that variance group.

### Note 70: Invoice totals reconcile to the contributing packages shown for the group

  - **Requirement:** Invoice-level invoiced, expected, and variance totals must reconcile to the contributing packages displayed for that variance group.
  - **Behavior:** The accordion footer sums the contributing packages shown; complete package-level detail and full invoice reconciliation are provided in the exported report. The interface renders a limited page of packages and directs the user to the export for the complete population.
  - **Dependency:** Reconciled per-package charge amounts scoped to the variance group.
  - **Constraint:** Displayed totals must never imply a reconciliation the underlying records do not support.
  - **Acceptance:** The contributing-package totals reconcile to the invoice's group contribution, with the export as the complete record.

### Note 71: Package evidence popup inherits identifiers and reads sourced values

  - **Requirement:** View evidence opens a focused popup for the selected package that inherits the credit memo ID, variance-group ID, invoice ID, tracking number, associated order number, and source-record references.
  - **Behavior:** The popup shows shipment facts and charge values drawn from the underlying reconciled record; it does not duplicate or hardcode separate calculation values. Source-document metadata shown matches the evidence associated with the parent variance group.
  - **Dependency:** The reconciled package record and its links to memo, group, invoice, order number, and source references.
  - **Constraint:** This popup is the only new modal interaction; shipment facts and charge values must come from the reconciled record in production.
  - **Acceptance:** Every value in the popup traces to the package's reconciled record and the parent group's evidence.

### Note 72: Charge-level variance uses explicit customer-facing direction

  - **Requirement:** The order evidence must show charge-level invoiced, expected, and variance amounts for every relevant charge component, using explicit customer-facing variance language such as "$1.18 potential overcharge" rather than an unexplained positive or negative sign.
  - **Behavior:** The charge comparison lists the relevant charge component for the finding and a total row; the expected charge determination names the source, the inputs (service, weight, zone, effective date), and the matching method, and points to the exported report for additional calculation detail.
  - **Dependency:** Charge-level reconciled amounts for the finding's components.
  - **Constraint:** Complete rate-cell, discount, and formula-level lineage is not asserted where the backend does not provide it.
  - **Acceptance:** No charge amount is shown as a bare negative sign, and the direction is stated in words.

### Note 73: Human reviewed gating and unable-to-validate separation in the package popup

  - **Requirement:** Human reviewed may only be displayed when the package belongs to a finding that meets the defined internal review requirements. An unable-to-validate package must not appear as a confirmed package within a variance finding.
  - **Behavior:** The popup shows Human reviewed only for packages in an approved finding. If an expected amount could not be calculated, the package is shown as Unable to validate and its amount is kept separate from Total variance — never surfaced as a confirmed package in the group.
  - **Dependency:** Per-package review status and validation status.
  - **Constraint:** Unable-to-validate amounts are always separated from confirmed overcharge and net variance.
  - **Acceptance:** No unable-to-validate package appears as a confirmed package in a finding, and Human reviewed appears only when review requirements are met.

### Note 74: Download finding evidence is scoped to a single variance group

  - **Requirement:** Download finding evidence generates an Excel workbook scoped only to the selected variance group, containing Summary, Evidence Used, Affected Invoices, Affected Packages, and Raw Data.
  - **Behavior:** The workbook includes the credit memo ID, variance-category name, plain-language explanation, human-review status, total variance for the group, affected invoice and package counts, the evidence-used document metadata, invoice-level totals, contributing-package shipment facts, associated order numbers, tracking numbers, and charge amounts, and the complete underlying records. Totals reconcile across the summary, invoice, package, and raw-data levels, and the export includes only records associated with the selected group. Filename is deterministic, for example CM-2026-0630_Base-Freight-Variance.xlsx.
  - **Dependency:** The group-scoped subset of the reconciled dataset for the current version.
  - **Constraint:** In this prototype the download is demonstrated with the source-backed workbook; production emits the group-scoped workbook described here.
  - **Acceptance:** The workbook contains only the selected group's records across all five sheets, reconciled and deterministically named.

### Note 75: The finding-level export is a separate, independently tracked download

  - **Requirement:** The finding-level export is different from the complete credit memo export and must not replace the existing Download Excel action. It must be tracked as a separate download event.
  - **Behavior:** Both actions remain available; the finding-level download records its own event capturing customer, credit memo ID, credit memo version, variance-group ID and name, user, export type, and timestamp. A download confirms retrieval only — it does not confirm submission to the biller, approval, or a realized credit.
  - **Dependency:** A download-event log distinguishing finding-level exports from full credit-memo exports, keyed to memo and version.
  - **Constraint:** The complete credit-memo Download Excel and report preview are preserved unchanged.
  - **Acceptance:** Finding-level and full-memo downloads produce distinct tracked events and never replace one another.

### Note 77: The package is the primary parcel billing record

  - **Requirement:** Parcel records are counted and described as packages, not orders. A package is the primary parcel billing record and is generally identified by its tracking number.
  - **Behavior:** The interface says Packages analyzed, Package-level detail, Affected packages, and Packages where tracking-number-level records are counted. One customer order may contain multiple packages; invoices contain one or more packages; rates and charges are calculated at the package level.
  - **Dependency:** Package records keyed by tracking number, with their associated order number and parent invoice.
  - **Constraint:** Where a package has no tracking number, use the system's durable package or shipment identifier. True order-level data must not be relabeled as package data — use terminology based on the actual record represented.
  - **Acceptance:** Every count described as packages uses distinct tracking-number-level records.

### Note 84: Findings are organized by cause, not by invoice

  - **Requirement:** Customer-facing groups are generated from the approved internal error-group or variance taxonomy, and may be defined using carrier, service level, rate card, and variance category.
  - **Behavior:** The hierarchy is credit memo to variance group to invoices to packages. Each group shows a plain-language name, a concise explanation, carrier, service level, applicable charge category, total variance, affected invoice and package counts, the human-reviewed indicator, and its evidence and export actions.
  - **Dependency:** The approved internal variance taxonomy with carrier, service level, rate card, and category attributes per finding.
  - **Constraint:** Only customer-approved or human-reviewed findings may be published. Invoice number remains available for traceability but is not the primary explanation of the finding.
  - **Acceptance:** Group totals reconcile exactly to their included package records, and all published finding-group totals roll up to the credit memo's Total variance.

### Note 85: The minimum finding key is credit memo, carrier, and variance category

  - **Requirement:** The minimum customer-facing finding key is credit memo ID plus carrier plus variance category. A finding must never contain packages from more than one carrier.
  - **Behavior:** Base freight variance therefore appears once per affected carrier — UPS base freight variance, OSM base freight variance, DHL base freight variance — and the same separation applies to every other category. Service level, applicable rate card, rate-card version or effective period, and billing rule or calculation method may create additional groups when the calculation or supporting evidence differs materially.
  - **Dependency:** Carrier, service level, rate card and version, and variance category on every reconciled package.
  - **Constraint:** Multiple service levels stay in one finding only when they share the same applicable evidence and calculation logic and the combined explanation remains accurate.
  - **Acceptance:** No published finding contains packages from more than one carrier, and every finding names exactly one carrier and one variance category.

### Note 86: Mixed-carrier invoices appear in several findings with finding-scoped amounts

  - **Requirement:** An invoice may contain packages from multiple carriers and must appear under each applicable carrier-specific finding, carrying only the packages and amounts relevant to that finding.
  - **Behavior:** Affected-invoice columns read Invoiced for this finding, Expected for this finding, and Variance for this finding, and expanding an invoice shows only the packages contributing to that carrier and charge category. Full mixed-carrier invoice totals are never presented as belonging to a single finding.
  - **Dependency:** Package-to-finding assignment and charge-scoped package amounts.
  - **Constraint:** Packages from another carrier or another variance category must never appear inside a finding's accordion.
  - **Acceptance:** Invoice QB3098098 appears under both the UPS and OSM base freight findings, each showing only that carrier's contributing packages and amounts.

### Note 90: The affected-record hierarchy is finding, service level, package

  - **Requirement:** Within a carrier and charge-category finding, packages are organized by carrier service level. Invoice is a package-level traceability attribute, not an organizing level in this view.
  - **Behavior:** Selecting View affected packages shows a service-level summary with affected package count and finding-scoped invoiced, expected and variance amounts. Selecting View packages expands an inline package table for that service level, with invoice number on every package row. Packages sharing a carrier and service level stay together regardless of which invoice contained them, so the same invoice may appear across several service-level groups.
  - **Dependency:** Carrier, service level, charge category, invoice and tracking number on every reconciled package.
  - **Constraint:** Service-level summaries include only packages contributing to the current carrier and charge-category finding, and no package is duplicated across service-level groups within one finding.
  - **Acceptance:** The visible path reads finding to service level to contributing packages to source invoice and package evidence, with no invoice-level accordion in between.

### Note 92: Affected-package amounts are not audit-period spend

  - **Requirement:** Implentio audits the complete invoice population received for the credit memo period, but the values shown on the Total variance tile describe only the affected-package population. Billed for affected packages includes only invoiced charges associated with the packages included in this credit memo, Expected for affected packages covers the identical package and charge population, and Total variance equals billed minus expected for that same population.
  - **Behavior:** The tile reads Total variance identified with the affected package count and the number of invoices containing at least one affected package, plus a compact billed and expected comparison. A tooltip states: These amounts include only packages with significant variance—not all invoices and spend reviewed during this audit period.
  - **Dependency:** Distinct affected-package and containing-invoice counts, and billed and expected charge sums scoped to that population, per credit memo version.
  - **Constraint:** No percentage is calculated or displayed unless the denominator represents the complete and reliably measured audit-period population, and the affected-package billed amount is never described as total spend audited. If complete audit-period spend becomes available later, show it separately as Total spend reviewed.
  - **Acceptance:** The landing-page card, summary tile, grouped findings and exported report all use the same authoritative values, resolving to the same credit memo ID and version.

### Note 93: Invoices is an independent index of every ingested invoice

  - **Requirement:** Display every invoice successfully ingested for the active brand, whether or not it is associated with a credit memo. Audit result and credit memo association are separate fields, and an invoice's absence from a credit memo does not automatically mean no variance was identified.
  - **Behavior:** The index shows invoice number, period, biller, carriers, warehouse, complete invoice amount, package count, audit result, and a prominent credit memo column. No significant variance identified is shown only after the invoice has completed the defined audit process; a pending or unvalidated invoice shows its own state rather than a variance conclusion.
  - **Dependency:** Per-invoice ingestion record, audit lifecycle state, and credit memo association from the backend.
  - **Constraint:** The frontend must never infer an audit result from the absence of a credit memo, and this page does not reproduce the findings investigation — variance explanations stay inside the credit memo.
  - **Acceptance:** Every ingested invoice appears with an explicit audit result, and unaudited invoices are never labeled as having no variance.

### Note 97: The calculation methodology explanation must remain consistent across all credit memos

  - **Requirement:** The Learn More content describes Implentio's product methodology, not memo-specific results. It is a single maintained explanation surfaced identically from every credit memo.
  - **Behavior:** The Findings section exposes a 'Learn how findings are calculated' action that opens a focused modal without navigating away from the credit memo.
  - **Dependency:** A single content source for the methodology explanation, versioned with the product rather than with a memo.
  - **Constraint:** The explanation must never reference memo-specific totals, carriers or findings.
  - **Acceptance:** The same content renders from every credit memo, regardless of customer, period or version.

### Note 98: Do not claim complete package coverage unless the analysis genuinely covers the eligible population

  - **Requirement:** The statement that every package included in the analysis is reviewed may only be displayed when the underlying audit genuinely processes the complete eligible package population rather than a sample.
  - **Behavior:** The methodology copy asserts full-population review.
  - **Dependency:** Audit-engine coverage reporting per credit memo period.
  - **Constraint:** If any customer or period is processed on a sampled basis, the copy must be changed before that memo is published.
  - **Acceptance:** Coverage reporting confirms the complete eligible package population was processed for every published memo.

### Note 99: Expected charge is derived from shipment facts, rate card, contract terms and effective dates

  - **Requirement:** The expected charge for a package must be rebuilt from the applicable shipment facts, the matched rate card, the contract terms in force, and the effective dates covering the ship or label date, following the carrier's own order of charges.
  - **Behavior:** Package evidence shows the expected charge and the source metadata used to produce it.
  - **Dependency:** Rate-card ingestion with effective dating, contract term configuration, and the charge-sequencing rules engine.
  - **Constraint:** An expected charge must not be produced when the applicable rate card or effective-dated term is missing; those records route to Unable to validate instead.
  - **Acceptance:** Every published expected charge resolves to a specific rate card version and effective date range.

### Note 100: A detected difference is not automatically customer-creditable

  - **Requirement:** A billed-versus-expected difference is a detection, not a credit. It must pass validation for supporting rates and evidence before it can be presented to the customer as a finding.
  - **Behavior:** Only validated differences appear in findings; unvalidated ones remain internal or route to Documentation Needed.
  - **Dependency:** Validation workflow separating supported differences from unexplained ones.
  - **Constraint:** Detected-but-unvalidated differences must never be included in Total variance presented to the customer.
  - **Acceptance:** No customer-facing finding exists without a completed validation result.

### Note 101: Internal calculation faults and missing-information conditions stay separate from customer findings

  - **Requirement:** Differences caused by missing information or by a fault in Implentio's own calculation must be held in a separate internal population and must not be published as customer credit findings.
  - **Behavior:** The customer sees supported findings in the credit memo; missing-information records are held in the internal population and are never published as customer findings.
  - **Dependency:** Fault and missing-data classification on every detected difference.
  - **Constraint:** An internal calculation fault must never be surfaced as a carrier overcharge.
  - **Acceptance:** Published findings contain zero records classified as internal fault or missing information.

### Note 102: Only findings meeting the defined evidence and publication requirements may appear in a credit memo

  - **Requirement:** A finding is publishable only when it satisfies the evidence completeness, human-review and approval requirements defined for customer-facing output.
  - **Behavior:** Unpublishable findings are withheld from the customer view entirely rather than shown in a degraded state.
  - **Dependency:** Publication gating tied to the review and approval workflow.
  - **Constraint:** Draft, failed or internal-only findings must never be exposed to customers.
  - **Acceptance:** Every finding rendered in a customer credit memo carries a completed publication record.

### Note 103: Finding groups must preserve carrier, charge category, service-level population and evidence used

  - **Requirement:** Each published group must retain its defining attributes: carrier, charge category, the service-level populations it covers, and the exact documents used to calculate expected charges, so the group can be reconstructed and audited later.
  - **Behavior:** The finding card shows the charge category and service-level breakdown, and Evidence used lists the documents applied.
  - **Dependency:** Group taxonomy records storing attributes and evidence references per published version.
  - **Constraint:** Group attributes must be immutable within a published memo version; changes require a new version.
  - **Acceptance:** A published group can be reconstructed from its stored attributes and evidence references.

### Note 104: Total variance is calculated at the included-package level and may contain both directions within one package

  - **Requirement:** Total variance sums the complete billed-versus-expected difference for every package included in the credit memo. A single package may contain both unfavorable and favorable charge components, and both are already reflected in that package's total.
  - **Behavior:** Total variance is presented as one figure and may differ from the sum of the charge-category findings shown on the page.
  - **Dependency:** Package-level variance aggregation over the included package population for the displayed version.
  - **Constraint:** Favorable components must not be subtracted a second time, and charge-category finding totals must not be presented as summing to Total variance.
  - **Acceptance:** Total variance reconciles exactly to the sum of package totals for the displayed credit memo version.

### Note 105: Customer-facing variance explanation standard

  - **Requirement:** Every published variance finding must carry a customer-facing explanation that states, in order: (1) what charge was different, (2) what the customer was billed, (3) what Implentio expected, (4) why the expected amount differs, and (5) which rate, percentage, contract term or rule supports the conclusion. The explanation template and generation prompt must require all five components in that order, and completeness must be validated before publication.
  - **Behavior:** Each finding card shows a plain-language headline followed by a concise analyst summary containing all five components, so the customer understands the finding without opening package evidence. When amounts vary across packages, the explanation says so and labels any representative package as an example.
  - **Dependency:** Explanations generated from the same calculation records, source documents and credit memo version as the displayed finding; a representative package drawn from the published finding population.
  - **Constraint:** Never generate unsupported values, rates, percentages, rules, dates or source names, and never imply a representative package's values apply to every package. Avoid internal taxonomy names, database fields and system-fault labels. If any required component cannot be supported, route the finding for internal review rather than publishing speculative copy. Explanation text is stored with the durable finding and credit memo version; regeneration must not silently alter a published version, and an updated explanation requires a new report version or a recorded customer-visible correction. The same standard applies to the finding card, report preview, PDF summary and Excel finding summary.
  - **Acceptance:** Every published finding passes a completeness check confirming all five components are present, and the same explanation text renders identically in the interface and every export for that version.

### Note 106: Variance explanation generation prompt template

  - **Requirement:** The generation prompt is a fixed requirement: “Generate a concise customer-facing variance explanation using only the supplied finding data and evidence. State, in order: (1) what charge was different, (2) what the customer was billed, (3) what Implentio expected, (4) why the expected amount differs, and (5) which rate, percentage, contract term or rule supports the conclusion. If values vary across packages, say so and use only a clearly labeled representative example. Do not infer or invent missing information. If any required element is unsupported, return the finding for internal review instead of generating publishable copy.”
  - **Behavior:** Explanations for percentage-based charges such as fuel state the basis of the calculation rather than restating the result; an effective percentage is named only when the applicable rate record supports it.
  - **Dependency:** The finding's calculation records, matched rate card, contract terms and effective dates supplied to the generator as the sole input.
  - **Constraint:** The generator must not use data from other credit memos or versions, and must never restate the result in place of an explanation (for example, 'the invoiced amount exceeded the expected amount').
  - **Acceptance:** A generated explanation containing an unsupported value or a missing component is rejected and routed to internal review.

### Note 107: Accessorial findings follow the same explanation standard

  - **Requirement:** Accessorial categories including delivery area surcharge, extended delivery area, residential, additional handling, oversize and dimensional-weight differences use the identical five-component explanation structure as base freight and fuel. The explanation format is a reusable system requirement, not copy hand-written per finding.
  - **Behavior:** Any new customer-facing variance category inherits the standard automatically, including the headline, the five ordered components and the labeled representative example.
  - **Dependency:** A shared explanation template keyed by charge category, with category-specific reasoning drawn from the applicable rule or threshold record.
  - **Constraint:** Where an accessorial expectation is $0.00 because the package attributes or destination did not meet the carrier rule, the explanation must name the rule or list that supports the $0.00 expectation rather than asserting the charge was simply unsupported.
  - **Acceptance:** Every accessorial finding renders with the same five components and passes the same completeness validation as base-freight findings.

### Note 108: Findings use progressive disclosure: concise collapsed state, full explanation on demand

  - **Requirement:** Every finding must carry both a concise collapsed explanation and an expanded full explanation. The collapsed state communicates the conclusion, the billed/expected/variance comparison, the affected-package count and the basic calculation method in no more than two short sentences outside the financial comparison. The expanded state contains all five required explanation elements in labeled sections with a distinct representative-example callout, never one uninterrupted paragraph.
  - **Behavior:** Read full explanation expands inline within the same finding card — never a modal, drawer or separate page — is keyboard accessible, and preserves the customer's expanded or collapsed state while they inspect package evidence. Collapsed cards stay scannable when several findings appear on one page.
  - **Dependency:** A single authoritative finding record supplying the billed total, expected total, variance and representative package for both states.
  - **Constraint:** Expanded and collapsed values must come from the same finding and credit memo version. The headline Total variance, billed amount and expected amount must mathematically reconcile — the header total is derived from billed minus expected, never hardcoded separately. If a charge-category variance differs from package-level Total variance, each value must be labeled explicitly and the distinction explained; conflicting totals must never be displayed without explanation.
  - **Acceptance:** For every finding, billed minus expected equals the displayed Total variance, and the expanded explanation contains all five labeled elements plus a labeled example.

### Note 109: Findings carry one consolidated financial summary

  - **Requirement:** Billed, Expected and Total variance must be drawn from the same affected-package population and resolve to the same finding and credit memo version. Total variance is the primary financial result and receives the strongest visual emphasis; Billed and Expected are supporting calculation inputs and stay visually secondary. Total variance must not appear more than once on the collapsed finding card.
  - **Behavior:** A single reusable financial-summary panel is used by every finding category: Billed and Expected side by side, Total variance as a full-width emphasized row beneath them. On narrow layouts the panel moves below the finding metadata and preserves the same metric hierarchy.
  - **Dependency:** The authoritative finding record supplying billed, expected and variance totals for the finding's package population.
  - **Constraint:** Total variance must mathematically reconcile to Billed minus Expected. If it does not, the card must not be published without an explicit supported explanation.
  - **Acceptance:** Every finding card renders exactly one Total variance value, equal to its displayed Billed minus Expected.

### Note 110: Package evidence is identified by tracking number, then order, then invoice

  - **Requirement:** A package is the primary parcel billing record and is generally identified by its tracking number. The evidence popup titles the record with the tracking number and shows the associated order number and source invoice number beneath it. One order may contain multiple packages, so a tracking-number-level record must never be labeled an order.
  - **Behavior:** Tracking number, order number and invoice number are all searchable. Package evidence resolves to the same package, finding and credit memo version as the record the customer selected.
  - **Dependency:** Package-to-order and package-to-invoice associations from ingestion.
  - **Constraint:** If a tracking number is unavailable, the durable package or shipment identifier is used and labeled accurately.
  - **Acceptance:** Opening evidence from any package row shows that package's tracking number as the title and its order and invoice beneath it.

### Note 111: Shipment facts are shown only when they are available and relevant

  - **Requirement:** Shipment facts show carrier, service level, date, warehouse, zone and billed weight, plus destination ZIP, dimensions, dimensional-weight treatment and cubic-pricing treatment when they are relevant to the finding. Billed weight is shown in both pounds and ounces because applicable carrier rate cards may use either unit, and both values must convert consistently from the same weight. Dimensions display in a consistent order and unit (length × width × height in inches).
  - **Behavior:** Optional fields are omitted rather than rendered as empty placeholders or dashes. Dimensional-weight and cubic-pricing fields appear only for carriers, services and packages where they apply; when dimensional weight applies, the divisor/factor and calculated dimensional weight are shown when available. Destination ZIP appears when it materially supports the finding, including DAS, EDAS and zone-based calculations.
  - **Dependency:** Package-level shipment attributes from ingestion, including dimensions and dimensional-weight inputs where the carrier supplies them.
  - **Constraint:** Ship date is preferred over label date when ship date is available and reliable. If ship date is unavailable, the available date is displayed with its correct label and is never silently relabeled. The prototype currently displays label date because that is the date the demo dataset carries.
  - **Acceptance:** No package evidence popup renders an empty field, and every displayed fact is sourced from the package record.

### Note 112: The calculation section adapts to the finding's charge category

  - **Requirement:** The evidence popup does not show every possible calculation field for every package. The fields rendered inside the charge-comparison area are driven by the charge category of the selected finding, and must answer what was billed, what Implentio expected, what caused the difference, and which rate, percentage or rule supports the expected amount.
  - **Behavior:** Base Freight shows service level, billed weight, zone and the applicable contracted rate used in the calculation. Fuel Surcharge shows the published carrier rate, contractual discount where applicable, expected effective rate and the charge base fuel was applied to. Residential, DAS and EDAS show the applicable contracted surcharge rate or the ZIP-code eligibility conclusion. Additional Handling and Oversize show measurements, dimensional factor and the rule evaluation that produced the conclusion.
  - **Dependency:** Charge-category calculation metadata per finding, including carrier fuel publications, ZIP-code lists and surcharge rule sets with effective periods.
  - **Constraint:** Fuel percentages must correspond to the package's carrier, service and applicable week, contractual discounts apply only when supported by the contract or rate card, and the expected fuel amount must reconcile to the effective percentage and the applicable charge base. Residential, DAS and EDAS evidence must distinguish an incorrect surcharge rate from an incorrectly applied surcharge. Additional Handling and Oversize evidence must identify the specific measurement or rule behind the conclusion and represent each qualifying surcharge separately.
  - **Acceptance:** Each charge category renders its own required fields, and no irrelevant carrier-specific attributes appear.

### Note 113: Evidence sources correspond exactly to the calculation displayed

  - **Requirement:** The source area lists the customer rate card, contract terms, carrier fuel publication, DAS or EDAS ZIP-code list, Additional Handling or Oversize rules and the source invoice, as applicable to the calculation shown. Sources use customer-facing names with effective dates, never internal filenames or taxonomy labels.
  - **Behavior:** Source metadata includes document type, effective period and version where available. If a source cannot be opened directly, it is identified clearly without rendering a broken action.
  - **Dependency:** Stored source documents and the permissions model governing rate cards, contracts and invoices.
  - **Constraint:** Access to rate cards, contracts and invoices must respect brand and user permissions. If the rate used cannot be connected to a reliable source, the calculation must not be presented as conclusive customer evidence.
  - **Acceptance:** Every source listed in a package evidence popup is one that was actually used in the displayed calculation.

### Note 114: Unavailable package facts are never invented

  - **Requirement:** Package facts, rates, percentages, dimensions and rules are displayed only when the platform holds them. Irrelevant optional fields are omitted rather than shown as misleading placeholders, and data that is unavailable but material to interpreting the finding is clearly identified as unavailable.
  - **Behavior:** If required evidence is missing, the record does not appear as a confirmed customer-creditable finding.
  - **Dependency:** Data-completeness signals per package and charge category.
  - **Constraint:** Context-sensitive evidence configuration is driven by the finding's charge category and calculation type, so future charge categories can define their own required shipment facts, comparison fields and evidence sources without redesigning the popup.
  - **Acceptance:** The popup remains usable and readable whether few or many optional evidence fields are present.

### Note 116: Least Cost Carrier and Product Weight Validator share one report-library component

  - **Requirement:** Both optimization modules deliver completed analyses through the same report-library pattern and a common report metadata model.
  - **Behavior:** Page header, explanation accordion, reporting-period filter, report card, status treatment, metric row and download placement are one component configured per analysis type.
  - **Dependency:** A shared report-delivery component and a common report metadata schema.
  - **Constraint:** A new analysis type must not require a new page pattern; the coming-soon shell is not reintroduced for a module that delivers reports.
  - **Acceptance:** Adding a third analysis type requires configuration only, not a new layout.

### Note 118: Report evidence is delivered as one Complete Evidence Package

  - **Requirement:** The summary report and the complete Excel evidence are delivered to the customer as a single downloadable package rather than separate downloads, consolidating the approved actionable findings and the advisory records that could not be analyzed. Internal working files are excluded entirely.
  - **Behavior:** The report card exposes one action, Download Complete Evidence Package, in its top-right corner. The action is enabled only when the packaged assets are ready; otherwise the card shows that the evidence package is unavailable. The card states what the package contains.
  - **Dependency:** A packaging step that assembles the published summary and consolidated customer-safe evidence into one archive per report version, with readiness tracked internally per asset.
  - **Constraint:** The customer must not be offered a partial package, internal file naming must never surface to customers, and no more than one customer-facing download action appears per report.
  - **Acceptance:** Each ready report offers exactly one download action, and the delivered package contains both the summary and the complete evidence for that report version.

### Note 122: Report metrics must reconcile to the delivered files

  - **Requirement:** Every metric displayed on a report card must be validated against the report source files before publication, and the downloads must resolve to the same analysis run and source population as the metrics shown.
  - **Behavior:** Metrics and assets are published together from one run.
  - **Dependency:** Validation step in the publication pipeline.
  - **Constraint:** A metric that cannot be reconciled to the delivered files is not published.
  - **Acceptance:** Displayed totals equal the totals in the delivered summary and workbook.

### Note 123: Version numbers appear only when more than one version is customer-visible

  - **Requirement:** A version indicator is shown only when multiple customer-visible versions exist and the distinction is meaningful. When an updated report is published, previous assets are retained in report history and the latest version is clearly marked.
  - **Behavior:** A single-version report shows period, availability date and readiness only.
  - **Dependency:** Report version history.
  - **Constraint:** Version metadata must never be the only way a customer can tell which file is current.
  - **Acceptance:** A first-and-only report shows no version label.

### Note 125: Empty, processing and unavailable states are defined

  - **Requirement:** The report library shows an empty state when no completed reports exist, and a processing or disabled state while report assets are being generated.
  - **Behavior:** Processing reports show the preparing banner with no active download actions. Internal generation states collapse into these customer-facing states: a report being prepared reads as in progress and a failed or incomplete package reads as unavailable. Report Generating and Generation Failed are never shown to a customer.
  - **Dependency:** Report readiness events.
  - **Constraint:** A report in progress must not present downloads.
  - **Acceptance:** Each state renders without a broken or misleading action.

### Note 127: Coming-soon release notification interest for Unit Economics

  - **Requirement:** The Unit Economics preview offers a single opt-in action so a customer can register interest in being notified when the module is released to their account. The action captures the authenticated user, their brand, the module, and a timestamp; it does not create a subscription to any other notification type.
  - **Behavior:** Selecting the action records the interest and immediately confirms the address that will be notified, with a cancel action that removes the registration. State persists per user and brand across sessions, and the control reflects the stored state on load rather than resetting to the unregistered view.
  - **Dependency:** An authenticated user profile with a verified email, a module-level interest store, and the outbound notification service that will send the release message.
  - **Constraint:** No email input field is exposed; the notification uses the account address on file. The opt-in must respect existing communication preferences and unsubscribe handling, and registering interest does not imply entitlement, pricing, or a delivery date for the module.
  - **Acceptance:** A registered user sees the confirmed state on return, receives exactly one release notification when Unit Economics is enabled for their brand, and can cancel at any time before release.

### Note 129: Error groups operate at the package level, not the isolated charge level

  - **Requirement:** Implentio calculates differences by charge, but the published error group is a population of packages. A group is never an isolated charge subtotal.
  - **Behavior:** Each package is evaluated across every charge on it. The charge-level differences are netted into one complete package net variance, and the package is then assigned to a single backend-defined error group. Group totals are the sum of complete package net variance for the packages assigned to that group.
  - **Dependency:** Backend package error-type and error-category assignment emitted per package per credit memo version.
  - **Constraint:** No finding may be produced by isolating one charge category and ignoring offsets from other charges on the same package. Carrier and charge category are descriptive context, not additive accounting buckets.
  - **Acceptance:** Every group total equals the sum of the complete net variance of its assigned packages, and no group total can be reproduced by summing a single charge column.

### Note 130: Only net-unfavourable packages are included in published error groups

  - **Requirement:** A package is published only when its complete net variance is unfavourable to the customer.
  - **Behavior:** Packages whose charge differences net to zero or to a favourable result are excluded from published error groups and from Total variance. In the source-backed demo every one of the 852 published packages carries Package Error Type "Unfavourable".
  - **Dependency:** Per-package net variance and the backend package error type.
  - **Constraint:** A net-favourable package is never published as a favourable finding, and a net-favourable package is never counted inside an unfavourable group.
  - **Acceptance:** No published package has a net variance of zero or less.

### Note 131: Each package belongs to no more than one published error group

  - **Requirement:** Published error groups are mutually exclusive populations.
  - **Behavior:** A package identified by tracking number and source invoice number appears in exactly one error group, one service level within that group, and one package row. The same package can never contribute financially to two findings.
  - **Dependency:** A single backend group assignment per package per credit memo version.
  - **Constraint:** Groups may share carriers, service levels and invoices, but never packages. Presentation filters must not cause a package to appear financially in more than one group.
  - **Acceptance:** The union of all group package populations equals the published package population with no duplicates; the demo verifies 852 distinct tracking-and-invoice keys across 5 groups.

### Note 132: Finding totals use complete package net variance and are labelled Group net variance

  - **Requirement:** The finding metric block shows Group net variance, Total invoiced and Total expected for the packages assigned to that group.
  - **Behavior:** Group net variance is the sum of complete package net variance for the assigned packages. Total invoiced and Total expected are the complete invoiced and expected charges for the same packages. The label is Group net variance, never Total variance, so it cannot be confused with the credit memo total.
  - **Dependency:** Package-level complete invoiced, expected and net variance for the assigned population.
  - **Constraint:** Charge-only billed, expected or variance values must never appear in the finding metric block. If reliable package-group totals are unavailable, an unavailable state is displayed instead of synthetic or allocated values.
  - **Acceptance:** The metric block reconciles to the service-level table, which reconciles to the package rows.

### Note 133: Charge-level favourable and unfavourable differences net to the package result

  - **Requirement:** A favourable difference on one charge may offset an unfavourable difference on another charge within the same net-unfavourable package.
  - **Behavior:** The finding explanation states how the charge differences net across the group, and the package evidence popup reconciles charge differences to the package net variance. Offsets are described as offsetting charge differences inside a net-unfavourable package, never as separate favourable packages or favourable findings.
  - **Dependency:** Per-charge invoiced and expected values per package.
  - **Constraint:** Favourable charge differences are never hidden, and they are never reported as a customer credit in their own right.
  - **Acceptance:** For every package, the sum of charge-level differences equals the displayed package net variance.

### Note 134: The charge breakdown must reconcile to the package totals it sits under

  - **Requirement:** Expanding a package reveals expected, invoiced and difference values for base freight, fuel, residential, delivery area surcharge and other accessorials, with the package totals kept visible.
  - **Behavior:** The breakdown is a secondary expansion inside the package row and scrolls horizontally rather than compressing the primary identity columns. Package Total expected, Total invoiced and Net variance stay pinned above the matrix and do not change when the breakdown is opened.
  - **Dependency:** Per-charge invoiced and expected values per package, from the same record that produced the package totals.
  - **Constraint:** Charge components must sum to the package totals for both invoiced and expected. Other accessorials is a defined roll-up (EDAS, peak surcharge, additional handling, address correction and other accessorials) and must be documented wherever it is displayed.
  - **Acceptance:** Automated validation confirms that the five charge components sum to the package invoiced and expected totals for every published package.

### Note 135: Filters change presentation and emphasis only; they never change published calculations

  - **Requirement:** Selecting a charge highlights the relevant charge columns and emphasises packages where that charge contributed. It does not recalculate anything.
  - **Behavior:** Selecting a charge highlights that charge in the breakdown, marks packages where the charge has a non-zero difference, and states the amount that charge contributes inside the finding. Carrier and service-level controls narrow which findings are listed. Package complete expected, invoiced and net variance are preserved, and offsetting charge differences remain accessible.
  - **Dependency:** Client-side presentation state only.
  - **Constraint:** A charge selection must not recalculate an error group, change its published financial impact, hide other charges that contribute to package net variance, or cause a package to appear financially in more than one error group. Helper text states that package totals include all charge differences and remain unchanged.
  - **Acceptance:** Group net variance, service-level totals and package totals are byte-identical before and after any filter or highlight change.

### Note 136: Charge categories describe the assigned cause; they are not independently additive totals

  - **Requirement:** The charge category on a finding names the cause the backend assigned to that package population. It does not describe the composition of the group total.
  - **Behavior:** The finding shows the assigned cause in metadata and, when the named charge is also the largest unfavourable contributor, names it as the primary variance driver. When another charge contributes more of the unfavourable amount, the finding says the cause was assigned rather than claiming a primary driver, and the charge-mix line states the real composition.
  - **Dependency:** Backend error-category assignment plus the actual per-charge aggregates for the group.
  - **Constraint:** Multi-cause categories must be emitted with a canonical, stable cause ordering; the demo normalises the two orderings of the base-freight-and-fuel category into one group and this normalisation must move to the backend. Charge-category names must never be presented as charge subtotals that sum to the credit memo total.
  - **Acceptance:** No finding name or metric implies that the group total is an isolated charge subtotal.

### Note 140: Demo and production data follow the same rules, and narratives stay human-reviewed

  - **Requirement:** Demo data and production data must follow the same calculation and roll-up rules, and customer-facing narratives require human review.
  - **Behavior:** The prototype reads one normalised representation of the authoritative workbook and applies the same package-level netting, group assignment and roll-up rules that production must apply. Finding names, headlines and explanations are generated from real group and charge aggregates, and remain subject to human review until the generation and validation workflow is proven reliable.
  - **Dependency:** The authoritative source export, parsed once, plus the review workflow.
  - **Constraint:** No demo screen may use synthetic, allocated or prorated values to keep a screen populated. Where the source cannot support a metric, the metric is shown as unavailable and the gap is recorded as a backend requirement.
  - **Acceptance:** Every number on Summary & Findings traces to the connected source export, and every generated narrative is reviewable before publication.

### Note 141: Finding explanation and Evidence used are mutually exclusive disclosure states

  - **Requirement:** A finding card exposes its supporting detail through one segmented switcher with two segments, Finding explanation and Evidence used, backed by a single shared detail area.
  - **Behavior:** Both segments are collapsed by default. Selecting a segment opens its content in the shared area and automatically closes the other. Selecting the segment that is already active collapses the shared area. The active segment carries a selected treatment and its disclosure chevron rotates.
  - **Dependency:** One disclosure value per finding card with three states: none, explanation, evidence.
  - **Constraint:** The explanation and the evidence list may never be expanded at the same time, and neither may open in a modal or on a separate page. The shared area renders at the full card width beneath the switcher.
  - **Acceptance:** At most one supporting-detail panel is open in a finding card at any time, and the default state of every card is collapsed.

### Note 142: Each finding card manages its own disclosure state independently

  - **Requirement:** Opening or closing supporting detail on one finding must not affect any other finding.
  - **Behavior:** Disclosure state is held per finding group. Several cards may sit in different disclosure states at the same time, and none of them inherits or resets another card’s state.
  - **Dependency:** Per-finding disclosure state keyed to the finding identifier.
  - **Constraint:** A page-level or shared disclosure value must not be used. Filtering, searching or pagination must not silently reset a card’s disclosure state for unrelated cards.
  - **Acceptance:** Toggling detail on one card leaves every other card’s disclosure state unchanged.

### Note 144: The Evidence used count represents customer-visible supporting sources only

  - **Requirement:** The number shown on the Evidence used segment is the count of supporting sources associated with that finding which the customer is authorised to see.
  - **Behavior:** The count is derived from the same source list rendered in the shared detail area, so the number and the list always agree. Each source shows its customer-facing name, how it contributed to the calculation, its availability state, a View source action when authorised and available, and a Source not attached state when the original document cannot be opened.
  - **Dependency:** Per-finding evidence associations filtered by the brand and role permission model.
  - **Constraint:** Internal-only sources, unauthorised sources, and internal filenames or system identifiers must never be included in the count or the list. An unavailable source still appears in the list and the count, but without an active action.
  - **Acceptance:** The displayed count always equals the number of rows in the shared evidence list for that finding.

### Note 146: The left navigation supports persistent expanded and collapsed states

  - **Requirement:** The navigation must offer two states: the full expanded navigation and a narrow icon rail.
  - **Behavior:** A collapse control at the top of the navigation switches between the two states. The expanded state keeps the existing logo, section headers, labels, icons, badges, selected states and profile area unchanged.
  - **Dependency:** One collapse preference value per user session.
  - **Constraint:** Collapsing may not change routes, authorization or feature availability.
  - **Acceptance:** Both states are reachable from either state without a page reload.

### Note 147: The collapsed rail always remains visible

  - **Requirement:** Collapsing narrows the navigation to a 68px icon rail; it never hides navigation completely.
  - **Behavior:** Every enabled destination stays present as a centered icon with a 42px target. The rail keeps the compact Implentio brand mark, the expand control and the user avatar.
  - **Dependency:** Compact brand mark asset from the Implentio design package.
  - **Constraint:** The navigation must never collapse to zero width, and the rail must not overlay page content.
  - **Acceptance:** A user can navigate to every enabled destination without expanding the navigation.

### Note 150: Unavailable destinations stay visible and non-interactive in both states

  - **Requirement:** Fulfillment Credit Memos and Rate Cards remain disabled in the expanded navigation and in the rail.
  - **Behavior:** In the rail they show their icons in the disabled treatment, carry aria-disabled, receive no hover or selected styling, and communicate availability through the word Future in the tooltip. The Future badge is not shown in the rail.
  - **Dependency:** Feature-availability flag per destination.
  - **Constraint:** Disabled destinations must never become clickable and must never route anywhere.
  - **Acceptance:** Activating a disabled rail item does nothing and no destination page exists for it.

### Note 156: Filters are consolidated behind one shared Filter component

  - **Requirement:** Parcel Credit Tracker, Least Cost Carrier Reports, Product Weight Validator Reports and Invoices use one reusable filter dropdown instead of separate rows of exposed selects.
  - **Behavior:** A compact toolbar holds persistent search where the page supports it, a Filter button with the approved filter icon, an applied-filter count badge, and the result count aligned right.
  - **Dependency:** One shared filter component consumed by every list and report-library experience.
  - **Constraint:** A page may not implement its own bespoke filter UI, and adding a filter may not require a toolbar redesign.
  - **Acceptance:** All four experiences render the same filter interaction from the same component.

### Note 158: Search is independent of the filter panel

  - **Requirement:** High-frequency search stays visible in the toolbar and is never moved into the filter panel.
  - **Behavior:** On Invoices, Search invoice number filters results immediately and independently of staged filter selections.
  - **Dependency:** Separate search state, evaluated alongside applied filters.
  - **Constraint:** Search must not be cleared by Reset, and Reset must not clear search.
  - **Acceptance:** Typing in search filters results while the filter panel is closed, open or mid-edit.

### Note 159: Filter changes are staged until Apply Filters is selected

  - **Requirement:** Selections inside the panel do not change results until the user applies them.
  - **Behavior:** Opening the panel copies the current applied values into a staged set. Apply Filters commits the staged set and closes the panel. Reset returns every field in the panel to its default. Closing without applying keeps the applied values unchanged and reopening shows them again.
  - **Dependency:** Staged filter state separate from applied filter state.
  - **Constraint:** Results, counts and populations may not change while the panel is being edited.
  - **Acceptance:** Editing fields and closing the panel without applying leaves results untouched.

### Note 166: Audit status and credit memo association are separate fields

  - **Requirement:** An invoice's audit status and its credit memo association are independent attributes and must be presented in separate columns.
  - **Behavior:** Audit status shows one of Variance identified, No significant variance identified, or Audit not complete, and is filterable from the shared Filters panel. The Credit memo column shows only the linked credit memo identifier when one exists, and an em dash when none does.
  - **Dependency:** Independent audit-status and credit-memo-association values per invoice.
  - **Constraint:** Audit-status wording must never appear inside the Credit memo column, and the absence of a credit memo must never be read as an incomplete audit.
  - **Acceptance:** An invoice can have a completed audit without being associated with a credit memo, and the table shows that state clearly.

### Note 168: Credits realized has a confirmed state and an awaiting-confirmation state

  - **Requirement:** The Credits realized metric presents two distinct states in the same position and allocated space.
  - **Behavior:** When the confirmed realized amount is greater than zero the amount appears in the green confirmed-credit panel with the money-return icon and the supporting line Confirmed from ingested Biller credit records. When no qualifying credit record has been ingested the metric reads None confirmed yet in neutral white with the supporting line Credits will appear here when a biller credit record is received and ingested. The information icon and its tooltip are present in both states.
  - **Dependency:** Confirmed realized-credit total for the active customer and period.
  - **Constraint:** The green treatment appears only when the realized amount is greater than zero. The empty state must never display $0, must never use an error or warning treatment, and must not change the metric's position or the surrounding layout.
  - **Acceptance:** Switching between a customer with confirmed credits and one without changes only the value treatment and supporting copy inside the Credits realized column.

### Note 170: Each package belongs to one primary variance group

  - **Requirement:** A package is assigned to a single published variance group, and its complete net variance sits with that group.
  - **Behavior:** Group net variance is the sum of the complete net variance of the packages assigned to it, so group amounts and package counts add up to the credit memo totals exactly.
  - **Dependency:** Mutually exclusive package-to-group assignment.
  - **Constraint:** A package may not appear in two groups, and no portion of a package's variance may be split across groups.
  - **Acceptance:** The sum of group net variances equals the credit memo total variance, and the sum of group package counts equals the credit memo package count.

### Note 173: Billed and expected totals stay out of the credit memo summary

  - **Requirement:** The summary presents total variance and its distribution only.
  - **Behavior:** Billed and expected amounts remain available in the finding detail and evidence views, where the package population they describe is explicit. They are not shown in the summary or relocated elsewhere in it.
  - **Dependency:** Finding-level and evidence-level billed and expected values.
  - **Constraint:** Summary-level billed or expected totals must not be reintroduced, because they invite comparison against audit-period spend.
  - **Acceptance:** The credit memo summary shows total variance, its package and invoice counts, and the group rollup, and nothing else.

### Note 174: The total and the variance-group rollup are one summary component

  - **Requirement:** The credit memo summary is a single component containing the total variance on the left and the variance-group rollup on the right, inside one container with one border and a shared background.
  - **Behavior:** The two sections are separated by a single subtle divider. On narrow screens the total stacks above the rollup and keeps its visual priority, and the table scrolls horizontally rather than dropping columns. Removing a column requires a documented responsive rule.
  - **Dependency:** One summary record per credit memo version, carrying the total and its group distribution.
  - **Constraint:** The two sections may not be split into separate cards, and billed or expected amounts may not appear in either section.
  - **Acceptance:** At every width the summary reads as one component, with the total variance dominant and the rollup reconciling to it.

### Note 175: Contributing packages show the complete charge breakdown without a second drill-down

  - **Requirement:** The affected-record hierarchy is finding, service level, package. Expanding a service level must display its contributing packages with the complete expected, invoiced, and variance charge breakdown inline in the package table. There is no per-package expand step for charge detail, and no separate page or modal for it. Each row represents one package-level billing record: tracking number is the primary package identifier, and order number and invoice number are traceability references. View evidence remains the package-level action and preserves the existing evidence-source behaviour.

### Note 178: Report Downloaded is a brand-level state with customer-facing download attribution

  - **Requirement:** Once any user at the brand downloads the current report, the credit memo reads as Downloaded for everyone at that brand. Before that it reads as New.
  - **Behavior:** A ready, undownloaded report shows New. After a download the card shows Report Downloaded with the attribution Downloaded by [First Last] · [Month Day, Year]. No time of day is shown to the customer.
  - **Dependency:** Download events per credit memo and report version, each recording the individual user and a full timestamp.
  - **Constraint:** User-level download events are still captured and retained in the underlying product requirement; only the brand-level state and the date-only attribution are customer-facing. A download of a superseded version does not mark the current version as downloaded.
  - **Acceptance:** A second user at the same brand sees Report Downloaded with the first user's name and date, and no time appears anywhere in the customer-facing attribution.

### Note 230: Prepare for Biller is available only for a published, customer-visible report version

  - **Requirement:** The Prepare for Biller action appears only when the current credit memo version and its Complete Excel Evidence package are published and customer-visible.
  - **Behavior:** The action is shown on report-ready credit memo cards beside the download action and in the credit memo detail header. It is disabled while an audit is in progress or when the evidence file is not ready. It is never labelled Send to Biller, because this release does not send the email.
  - **Dependency:** Report version publication state and evidence asset readiness.
  - **Constraint:** This release is a manual-send foundation. No mailbox connection, no send from Implentio, no delivery tracking, no reply management.
  - **Acceptance:** The action is unavailable in every state where an authorized, customer-visible version with a ready evidence package does not exist.

### Note 233: The biller recipient belongs to the biller, not the parcel carrier

  - **Requirement:** The recipient is associated with the biller or biller that issued the invoices, which may differ from the carriers that moved the packages.
  - **Behavior:** Recipients are populated from the brand's saved Biller contact. A credit memo may contain packages from multiple carriers while still being prepared for one Biller contact. Implentio Support is always included in CC.
  - **Dependency:** Biller contact record on the brand account.
  - **Constraint:** Editing recipients in the flow applies to this message only and must not silently change the saved account contact.
  - **Acceptance:** Recipient edits persist for the prepared message and leave the saved Biller contact unchanged.

### Note 234: The representative package is a spot-check, identified by tracking number

  - **Requirement:** The review step shows one clearly labelled representative package so the reviewer can sanity-check the finding before preparing the message.
  - **Behavior:** Tracking number is the primary package identifier, order number is a secondary reference, and invoice number is the source traceability field. Billed, expected and net variance are shown with a plain-language issue summary.
  - **Dependency:** Package-level records for the published version.
  - **Constraint:** The representative package is illustrative of the population, not a summary of it. The complete population lives in the evidence workbook.
  - **Acceptance:** The representative package resolves to a real package in the published version and its amounts match the workbook.

### Note 235: Preparation is three steps: review, prepare, ready to send

  - **Requirement:** The flow opens over the current page as a focused modal and does not introduce a permanent navigation destination.
  - **Behavior:** Step 1 reviews the package, step 2 prepares the email, step 3 confirms what is ready. A step indicator is always visible and the user can move back without losing edits.
  - **Constraint:** No dispute-management dashboard is introduced in this release.
  - **Acceptance:** The user can complete the flow, return to the originating page, and re-open it with the saved edits discarded rather than partially applied.

### Note 237: Preparing is not sending, and Implentio must never imply delivery

  - **Requirement:** Downloading or copying the prepared message does not mean the dispute was sent, received, accepted, or approved.
  - **Behavior:** The final step states that Implentio has not sent the email. No success state saying Sent is shown. If Open in email app is offered, it may pass recipients, subject and body through a mailto link but must not claim the attachment was added automatically.
  - **Constraint:** Implentio cannot confirm delivery in this foundational release.
  - **Acceptance:** No copy anywhere in the flow asserts that a message was sent, delivered, or received.

### Note 238: Account Settings lists the people associated with the brand and lets the customer invite more

  - **Requirement:** Account Settings shows the team list with name, email and account status, and lets the customer invite a new member by name and email.
  - **Behavior:** The list reads from the customer account membership record. An invited member appears immediately with an Invited status. Roles and permissions are not configurable in this release.
  - **Dependency:** Account membership record.
  - **Constraint:** This data model must support future role-based access control without a migration of identity records.
  - **Acceptance:** Every active and invited member of the brand appears with an accurate status, and a new invite is reflected in the list without a page reload.

### Note 239: Biller contacts are maintained on the account, not per credit memo

  - **Requirement:** The customer can view and maintain Biller or biller name, contact name, email, CC recipients, default dispute contact and active status.
  - **Behavior:** The preparation flow reads the default dispute contact for the biller on the credit memo. Inactive contacts are not used to populate recipients.
  - **Dependency:** Biller directory on the brand account.
  - **Constraint:** A biller may have exactly one default dispute contact at a time.
  - **Acceptance:** Changing the saved contact changes the recipients populated by the next preparation, and never rewrites a previously prepared message.

### Note 240: Gmail and Outlook are connectable per-user sending integrations

  - **Requirement:** The integrations section shows real connection states for Gmail and Outlook: Available, Connecting, Connected, Reconnect required, Administrator approval required, and Connection failed.
  - **Behavior:** Shopify displays its actual prototype state. Gmail and Outlook connect through a provider-hosted OAuth flow and never present a fake credential form inside Implentio.
  - **Dependency:** Gmail and Outlook OAuth integration.
  - **Constraint:** No mock OAuth or fake connection dialog may be shown.
  - **Acceptance:** Each row's state matches the account's real connection status at the time of display.

### Note 245: Fulfillment Credit Memos reuse the shared report-library experience

  - **Requirement:** The Fulfillment Credit Memos page reuses the existing Least Cost Carrier and Product Weight Validator report-library, report-card, filtering, status, download and instrumentation components.
  - **Behavior:** The page is a report archive and download experience. No fulfillment reconciliation workflow, findings detail, invoice drill-down or variance-group experience is introduced. Filtering is limited to what the shared component already supports.
  - **Dependency:** Shared report-library component.
  - **Constraint:** This low-fidelity repository is the foundation for a later app-native fulfillment reconciliation experience.
  - **Acceptance:** The page renders using the shared components with no fulfillment-specific styling or filtering logic.

### Note 249: Fulfillment reports use the shared report states and download attribution

  - **Requirement:** The page reuses report ready, new, downloaded, updated and no reports available exactly as Least Cost Carrier and Product Weight Validator do.
  - **Behavior:** An updated state is shown when a new customer-visible version is published. Downloaded reports show the existing customer-facing attribution, Downloaded by user on date, and the download action remains available afterwards.
  - **Dependency:** Shared report status model and download event store.
  - **Constraint:** The empty state must not display zero-valued report metrics.
  - **Acceptance:** Every state renders with the same treatment used elsewhere in the report library.

### Note 300: Selecting variance groups scopes the prepared Biller request; it never edits the published credit memo

  - **Requirement:** Deselecting a variance group changes only what is included in this prepared request. It must never modify the published credit memo, its totals, or any finding.
  - **Behavior:** Selections live in a temporary preparation-session object tied to the open flow. Closing or canceling the flow clears the selection; reopening defaults to all groups selected.
  - **Dependency:** Published credit memo version snapshot.
  - **Constraint:** No selection state may be written back to the credit memo record.
  - **Acceptance:** Toggling a group and closing the flow leaves the published credit memo and its totals unchanged.

### Note 301: All variance groups are selected by default, and at least one is required

  - **Requirement:** Every customer-facing variance group for the published version appears with its own checkbox, all selected by default.
  - **Behavior:** Deselecting a group mutes its row but keeps it visible. Continue to email is disabled with zero groups selected, and the flow shows a message asking the user to select at least one group.
  - **Constraint:** Package-level selection is out of scope for this release; selection operates at the variance-group level only.
  - **Acceptance:** A zero-selection state cannot reach step 2, and every group is selectable independent of the others.

### Note 302: Amount pursued, package count and invoice count are computed from the selection, and the evidence attachment matches it

  - **Requirement:** The dollar amount pursued sums the published net-variance totals for the selected groups. Affected packages are the distinct packages assigned to the selected groups. Affected invoices are a distinct union across those packages, since one invoice can carry packages from more than one group.
  - **Behavior:** These three values recompute immediately on selection change and are the only values that change in the locked email summary and the Ready to send step. The attached evidence file is the Complete Excel Evidence workbook when every group is selected, or a Selected Variance Evidence ZIP scoped to only the selected groups otherwise.
  - **Dependency:** Package-to-group assignment and package-to-invoice mapping for the published version. Selected-group evidence-file bundling.
  - **Constraint:** Invoice counts must never be summed from each groups displayed invoice count, since that double-counts shared invoices.
  - **Acceptance:** Changing the selection updates amount pursued, package count, invoice count, and the attached evidence file everywhere they appear.

### Note 303: The representative package always belongs to a selected variance group

  - **Requirement:** The representative package shown for spot-checking must come from the highest-value currently selected variance group and must be labelled with that group's name.
  - **Behavior:** Deselecting the group that produced the current representative package swaps it for the representative package of the next-highest-value selected group.
  - **Dependency:** Package-level records per variance group.
  - **Constraint:** A representative package from a deselected group must never be shown.
  - **Acceptance:** The representative package and its group label always match one of the currently selected groups.

### Note 305: Email connections belong to individual users, not the customer account

  - **Requirement:** A Gmail or Outlook connection is tied to the individual user who authorized it. A user may only send from an email account they personally connected.
  - **Behavior:** The connected account shown in Prepare for Biller and Account Settings reflects the signed-in user's own authorization, not a shared account-level credential.
  - **Dependency:** Per-user OAuth token storage.
  - **Constraint:** One user's connected account must never be usable to send on behalf of another user.
  - **Acceptance:** Signing in as a different user never surfaces another user's connected Gmail or Outlook account.

### Note 306: Only send-email permission is requested

  - **Requirement:** The OAuth consent requested from Gmail or Outlook is limited to sending email. Mailbox read, delete, search, contacts, calendar, and file-storage access are never requested.
  - **Behavior:** The permissions summary shown before authorization states exactly what Implentio can and cannot do, matching the scopes actually requested from the provider.
  - **Dependency:** Provider OAuth scope configuration.
  - **Constraint:** Scope creep beyond send-only access requires a new user-facing consent explanation.
  - **Acceptance:** The requested provider scopes never exceed sending email on the user's behalf.

### Note 308: Connecting an account never authorizes automatic sending

  - **Requirement:** A successful Gmail or Outlook connection only makes sending available; it does not send or schedule any message on its own.
  - **Behavior:** Every prepared message still requires the user to reach the final review and click Send. No message is dispatched as a side effect of completing authorization.
  - **Constraint:** No code path may call the send action as part of the OAuth callback.
  - **Acceptance:** Completing a connection with no other action produces zero sent messages.

### Note 312: Provider acceptance is not proof of delivery

  - **Requirement:** A successfully submitted send is labelled Request submitted, showing provider status as accepted for processing. It is never labelled Delivered unless delivery is independently confirmed.
  - **Behavior:** The submitted-state screen shows recipient, credit memo ID and version, submitted by, date and time, evidence filename, and provider status, without claiming the message was received or read.
  - **Dependency:** Provider send-status callback, where available.
  - **Constraint:** No UI copy may assert delivery, receipt, or approval based on provider submission alone.
  - **Acceptance:** No confirmation screen in this release uses the word Delivered without an independent delivery signal.

### Note 313: A failed send preserves the prepared request and keeps manual options available

  - **Requirement:** If sending fails, the prepared message, recipients, and evidence selection are preserved exactly as reviewed.
  - **Behavior:** The failure state offers Try again, Reconnect email, and Download evidence and copy email so the customer can still complete the request manually.
  - **Constraint:** A failed send must never discard the user's edits or selection state.
  - **Acceptance:** After a failed send, every field the user entered and every group they selected is unchanged.

### Note 314: Reconnect Required and Administrator Approval Required are distinct blocked states

  - **Requirement:** Expired or revoked authorization moves the integration to Reconnect Required. An administrator restriction that prevents completing authorization surfaces as Administrator Approval Required.
  - **Behavior:** Both states are shown with their own message and a Reconnect action. Manual download and copy remain available in Prepare for Biller whenever connected sending is unavailable for any reason.
  - **Dependency:** Provider token status and administrator policy signals.
  - **Constraint:** These two blocked states must never be visually identical to a normal Not Connected state.
  - **Acceptance:** A user whose token expired or whose admin blocked the app sees the specific reason, not a generic disconnected state.

### Note 315: Disconnecting revokes future access without deleting audit history

  - **Requirement:** Disconnecting a Gmail or Outlook account stops future sending from that account but does not delete previously created send records.
  - **Behavior:** The disconnect confirmation states that previously sent records remain available. Historical sends keep their original sender, recipients, and evidence references after disconnection.
  - **Dependency:** Send record retention policy.
  - **Constraint:** Disconnecting must never cascade-delete or redact a prior send record.
  - **Acceptance:** After disconnecting an account, its prior send records remain fully visible and unchanged.

### Note 318: The CSM recipient resolves from the customer-account assignment

  - **Requirement:** The Customer Success Manager offered for CC is the one assigned to the customer account, never a hand-typed or guessed contact.
  - **Behavior:** Prepare for Biller reads the assigned CSM's name and email from the account record. If no active CSM is assigned, only the configured shared support address (support@implentio.com) is offered.
  - **Dependency:** CSM assignment on the customer account.
  - **Constraint:** No placeholder, empty, or former CSM may be shown when no active assignment exists.
  - **Acceptance:** The checkbox always offers at least the shared support address, and adds the CSM only when one is actively assigned.

### Note 319: CCing Implentio support is an explicit, per-request opt-in

  - **Requirement:** The CC my Implentio support team checkbox is unchecked by default and must be selected again for each prepared request.
  - **Behavior:** The selection is not saved as an account-level recipient preference and does not carry over to a new Prepare for Biller session.
  - **Constraint:** No mechanism may pre-check this box or persist it across separate preparation sessions.
  - **Acceptance:** Reopening Prepare for Biller, including for the same credit memo, always starts with the option unchecked.

### Note 320: Both Implentio recipients are visible before sending

  - **Requirement:** The assigned CSM's customer-facing name and email, and the shared Implentio Support address, are shown next to the checkbox before the customer opts in.
  - **Behavior:** The same recipients appear again in the Final Review step's Implentio support line when selected. If no active CSM exists, only Implentio Support is listed.
  - **Dependency:** CSM assignment on the customer account.
  - **Constraint:** Neither recipient's identity may be hidden behind a generic label.
  - **Acceptance:** The customer can see exactly who they are adding before confirming the selection and again before sending.

### Note 325: Implentio receives the same message and evidence as other CC recipients

  - **Requirement:** When copied, the CSM and Implentio Support receive the identical prepared message and evidence package visible to the customer, not a separate internal version.
  - **Behavior:** No internal-only content, filenames, or notes are added for either Implentio recipient's copy.
  - **Constraint:** Implentio's copy must never diverge from what the customer reviewed and sent.
  - **Acceptance:** The message and attachment Implentio receives are identical to the ones sent to the biller and other CC recipients.

### Note 326: Copying Implentio provides support, not dispute ownership or Biller approval

  - **Requirement:** CCing the CSM or Implentio Support must never be represented as Implentio submitting the request independently, owning the dispute, confirming Biller receipt or approval, guaranteeing a response time, or making Implentio automatically responsible for all follow-up.
  - **Behavior:** No success or review copy suggests outcomes beyond support visibility into the request. Not opting in shows no warning or pressure to select the option.
  - **Constraint:** No UI state may imply Implentio ownership, submission, or approval based on this CC alone.
  - **Acceptance:** No screen in the flow asserts an outcome stronger than Implentio has visibility into this request as a CC recipient.

### Note 327: Step 1 is scope selection only; it shows no evidence filename

  - **Requirement:** The Review package step lets the customer choose variance groups without displaying an attachment name.
  - **Behavior:** The Evidence Package card is removed from Step 1. Credit memo, version, audit period, biller, and the complete credit memo totals remain visible, clearly separated from the Selected for this request summary.
  - **Constraint:** The complete published credit memo totals must never change when groups are selected or deselected.
  - **Acceptance:** Step 1 never shows a filename, and its credit memo totals are identical regardless of the current selection.

### Note 328: Selecting every published group attaches the Complete Excel Evidence workbook

  - **Requirement:** When all variance groups are selected, the prepared attachment is the existing Complete Excel Evidence workbook for the published version.
  - **Behavior:** Step 2 and Step 3 both display the workbook filename and label it as complete credit memo evidence.
  - **Dependency:** Published Complete Excel Evidence asset per version.
  - **Constraint:** The workbook must never be relabeled as a selected-scope package when every group is selected.
  - **Acceptance:** An all-groups selection always resolves to the unmodified Complete Excel Evidence workbook.

### Note 329: Selecting any subset produces a ZIP scoped to only the selected groups, including a single group

  - **Requirement:** Deselecting one or more groups produces a Selected Variance Evidence ZIP containing only the selected variance-group Excel files, with no deselected-group files inside it.
  - **Behavior:** This applies uniformly down to a single selected group, so the packaging experience is consistent regardless of how many groups remain selected.
  - **Dependency:** Per-group Excel evidence files from Toolbelt.
  - **Constraint:** The ZIP must never include a file for a group the customer deselected.
  - **Acceptance:** Every ZIP produced in this flow contains exactly the selected groups' files and nothing else.

### Note 333: The complete workbook stays independently available from the Parcel credit memo

  - **Requirement:** The Complete Excel Evidence workbook remains downloadable directly from the Parcel credit memo outside the Prepare for Biller workflow, regardless of any selection made inside that workflow.
  - **Behavior:** Download Credit Memo on the credit memo record always returns the complete workbook.
  - **Dependency:** Published Complete Excel Evidence asset.
  - **Constraint:** Prepare for Biller's selection state must never affect the credit-memo-level download.
  - **Acceptance:** The complete workbook download outside Prepare for Biller is unaffected by any variance-group selection.

### Note 336: Implentio Support is no longer CC'd automatically

  - **Requirement:** The prior always-on Implentio Support CC is removed; support@implentio.com is only added when the customer opts in.
  - **Behavior:** Step 2 no longer shows a fixed Implentio Support · always in CC pill. Support is added to the visible CC field only via the opt-in checkbox.
  - **Constraint:** No code path may add support@implentio.com to CC without the customer's explicit selection for that request.
  - **Acceptance:** With the checkbox unchecked, no Implentio address appears anywhere in the To or CC fields.

### Note 337: The shared support inbox provides continuity if the CSM is unavailable

  - **Requirement:** Implentio Support exists as a distinct, always-available recipient option so a request is never blocked on one person's availability.
  - **Behavior:** The shared inbox is offered whether or not an active CSM is assigned, and continues to be offered if the assigned CSM later leaves Implentio or changes roles.
  - **Dependency:** Configured shared support address.
  - **Constraint:** The shared inbox must never be presented as a replacement for, or announcement of, a CSM change.
  - **Acceptance:** Selecting the option always adds a working Implentio recipient, regardless of CSM staffing changes.

### Note 338: The checkbox label and copy adapt to whether an active CSM exists

  - **Requirement:** When no active CSM is assigned, the checkbox reads CC Implentio Support and only that address is offered and added.
  - **Behavior:** When an active CSM exists, the checkbox reads CC my Implentio support team and both the CSM and Implentio Support are listed and added together.
  - **Dependency:** CSM assignment on the customer account.
  - **Constraint:** The two states must never be conflated; the copy must always match which recipients will actually be added.
  - **Acceptance:** The label and the recipients added on selection always match the customer's actual CSM assignment state.

### Note 339: Final Review summarizes exactly which Implentio recipients were added

  - **Requirement:** The Implentio support summary line names the CSM and Implentio Support together when both were added, or names only Implentio Support when that is the only recipient added.
  - **Behavior:** The summary line is omitted entirely when the customer did not select the option.
  - **Constraint:** The summary must never overstate participation beyond the addresses actually present in CC.
  - **Acceptance:** The summary text always matches the CC field's system-added addresses at that step.

### Note 341: Eligibility, pursuit, and collection outcome are three separate fields

  - **Requirement:** A variance group's eligibility (Eligible/Expired), pursuit (Not pursued/Pursued with Biller), and collection outcome (Awaiting outcome/Partially collected/Fully collected/Credit not issued) are tracked as independent dimensions, never merged into one status field.
  - **Behavior:** The Credit Memo Details card and Credit Outcomes dashboard present these as one readable customer journey without exposing internal field names.
  - **Constraint:** No UI or data model may collapse the three dimensions into a single enum.
  - **Acceptance:** Every variance group's card and dashboard row can show any valid combination of the three fields.

### Note 343: Pursuit is recorded only through a successful connected send or explicit manual confirmation

  - **Requirement:** A variance group moves to Pursued with Biller only when a connected email send succeeds, or when the customer explicitly confirms Mark these findings as pursued after a manual download or copy.
  - **Behavior:** Downloading or copying the prepared evidence alone never marks a group pursued.
  - **Dependency:** Prepare for Biller send and manual-confirmation flows.
  - **Constraint:** Only the groups actually included in that request are marked; unselected eligible groups are untouched.
  - **Acceptance:** No group's pursuit status changes without a successful send or an explicit customer confirmation naming that request.

### Note 344: Collection outcomes and amounts are customer-entered

  - **Requirement:** Fully collected, Partially collected, and Credit not issued, along with their collected amounts and dates, are recorded by the customer through Update credit outcome — never inferred by Implentio.
  - **Behavior:** Fully collected defaults the collected amount to the full pursued amount but allows correction; Partially collected requires an amount strictly between zero and the pursued amount plus a date; Credit not issued sets the amount to $0 with an optional reason.
  - **Constraint:** Save is blocked until the required fields for the selected outcome are valid.
  - **Acceptance:** No collection outcome or amount appears without a customer save action.

### Note 347: Customer-entered rejection reasons belong only to that customer account

  - **Requirement:** A Credit not issued reason entered by one customer is never exposed to, or aggregated across, another customer account.
  - **Behavior:** The biller credit outcomes section shows reasons only from the viewing customer's own account, clearly labeled Customer-entered.
  - **Dependency:** Account-scoped data access.
  - **Constraint:** No cross-customer rollup of rejection reasons is permitted.
  - **Acceptance:** A customer only ever sees their own account's reasons.

### Note 349: Expired groups cannot be added to a new Biller evidence package

  - **Requirement:** A variance group with Expired eligibility is not selectable when preparing a future Biller package.
  - **Behavior:** Prepare for Biller only offers groups that are currently eligible or already pursued for the active memo.
  - **Constraint:** No workaround may let a customer include an expired, unpursued group in a new send.
  - **Acceptance:** No expired group ever appears as a selectable option in Prepare for Biller.

### Note 350: “Credit not issued” reflects the customer's report, not an Implentio determination

  - **Requirement:** Credit not issued means the customer reported that the biller did not issue the requested credit; it is never presented as Implentio's independent validation of the biller's decision.
  - **Behavior:** No screen infers or states a reason the biller rejected a credit unless the customer entered one, and any such reason is clearly labeled as customer-entered.
  - **Constraint:** Implentio must never generate or imply its own conclusion about a biller's rejection.
  - **Acceptance:** Every stated rejection reason traces to a specific customer entry, never to system inference.

### Note 352: Status breakdown slices are mutually exclusive

  - **Requirement:** The Status breakdown donut uses six mutually exclusive slices: Not pursued/eligible, Expired without pursuit, Awaiting outcome, Partially collected, Fully collected, and Credit not issued.
  - **Behavior:** Every current variance-group record is categorized into exactly one slice based on its pursuit and collection state.
  - **Constraint:** No variance group may be counted in more than one slice.
  - **Acceptance:** Summing every slice's group count equals the total number of variance groups in the filtered dataset.

### Note 353: Pursued with Biller is not a donut slice

  - **Requirement:** Pursued with Biller is excluded as a slice because it is a parent state that overlaps Awaiting outcome, Partially collected, Fully collected, and Credit not issued.
  - **Behavior:** Pursued findings are distributed across those four collection-outcome slices instead of a separate Pursued slice.
  - **Constraint:** The chart must never add a seventh slice that double-counts an already-sliced group.
  - **Acceptance:** No pursued group is represented in more than one place on the chart.

### Note 356: An empty filtered result replaces the chart with a clear empty state

  - **Requirement:** When the applied filters return no variance-group records, the donut and legend are replaced with a No credit outcomes match these filters message.
  - **Behavior:** The message includes guidance to adjust filters; the top-level summary metrics and filter controls remain visible and usable.
  - **Constraint:** No chart with a zero-value slice or a broken center total may render when the filtered set is empty.
  - **Acceptance:** Every filter combination that yields zero rows shows the empty-state message instead of an empty or malformed chart.

### Note 358: Groups become Pursued or Not Pursued only when a request completes

  - **Requirement:** Selected variance groups become Pursued only after a successful connected send or an explicit manual-send confirmation; the remaining eligible groups in that same request become Not Pursued at that same moment.
  - **Behavior:** Deselecting a group while still drafting inside Prepare for Biller does not change its status — only completing the request does.
  - **Dependency:** Prepare for Biller send and manual-confirmation flows.
  - **Constraint:** No status change may occur before the request is actually completed.
  - **Acceptance:** Closing Prepare for Biller without sending or confirming leaves every group's status exactly as it was before the session.

### Note 359: Not Pursued is a distinct decision, never Expired

  - **Requirement:** A group the customer intentionally excluded from a completed request shows Not Pursued, and is never relabeled Expired even if its dispute deadline later passes.
  - **Behavior:** Not Pursued shows which request excluded it and, when reversal is supported, an Include in another request action gated on the shared dispute deadline still being open.
  - **Constraint:** Expired only ever applies to a group that never received a customer decision before its deadline passed.
  - **Acceptance:** No group that was explicitly excluded from a request ever displays the Expired status.

### Note 360: Reversing Not Pursued only before the shared deadline

  - **Requirement:** Include in another request is offered only while the group's dispute deadline has not passed; once passed, the group stays Not Pursued with no reversal action.
  - **Behavior:** Reversing returns the group to Available to pursue so it can be included in a future Prepare for Biller request.
  - **Constraint:** A reversed group must not retain its prior Not Pursued or Excluded metadata.
  - **Acceptance:** No reversal action appears on a Not Pursued group whose dispute deadline has passed.

### Note 363: Eligible and Not Pursued are separate states

  - **Requirement:** Eligible means the customer has not yet made a decision about the variance group. Not Pursued means the customer deliberately deselected the group and completed a Prepare for Biller request that included other groups.
  - **Behavior:** Both states keep the shared credit memo dispute deadline visible — the group remains eligible to pursue until the window closes. Not Pursued additionally shows which request excluded it and offers Include in another request.
  - **Constraint:** No screen, filter, or dashboard category may combine Eligible and Not Pursued into a single label.
  - **Acceptance:** Every variance group's current state resolves to exactly one of Eligible, Not Pursued, Pursued with Biller, or Expired without pursuit, never a merged label.

### Note 364: Both Eligible and Not Pursued expire the same way

  - **Requirement:** When the shared credit memo dispute deadline passes, both Eligible and Not Pursued groups become Expired without pursuit.
  - **Behavior:** A Pursued group never expires this way — it retains its pursuit and collection-outcome status regardless of the deadline.
  - **Dependency:** Backend-provided dispute deadline per variance group.
  - **Constraint:** Expiration logic must treat Eligible and Not Pursued identically with respect to the deadline.
  - **Acceptance:** No Eligible or Not Pursued group remains in its prior state past its dispute deadline; no Pursued group is ever marked expired.

### Note 365: Credit Outcomes separates Eligible, Not Pursued, and Expired without pursuit

  - **Requirement:** The Status breakdown donut and the pursuit-status filter offer Eligible, Not pursued, Pursued with Biller, and Expired without pursuit as distinct options, alongside the existing collection-outcome slices.
  - **Behavior:** Every current variance-group record maps to exactly one of these categories, matching its Credit Memo Details status.
  - **Constraint:** The dashboard must never fold Not Pursued into the Eligible category or vice versa.
  - **Acceptance:** Selecting Eligible or Not pursued in the pursuit-status filter shows only groups in that specific state, and the donut's slice counts reconcile with the filter's results.

## Engineering Requirement

### Note 41: LCC: customer and report-file access isolation

  - **Requirement:** A customer must only see and download Least Cost Carrier reports associated with their own account.
  - **Behavior:** The report list is scoped to the authenticated customer/brand. In this prototype the Implentio report is shown as sample data because the demo account (Implentio) does not use LCC.
  - **Dependency:** Customer/brand identity on each report record and an access-control check on list and download.
  - **Constraint:** Customer and report-file isolation must be validated before launch; no cross-account report is ever listed or downloadable.
  - **Acceptance:** A customer cannot see or retrieve any report belonging to another account.

### Note 42: LCC: report-ready file gating

  - **Requirement:** Download actions appear only when the applicable report file is available.
  - **Behavior:** Report Ready shows both downloads; Partially Available enables only the available file and shows the other as unavailable; Report Preparing shows no active downloads with a preparing message; No Reports Available shows a specific empty message (not a generic error).
  - **Dependency:** Per-file availability flags and per-report status.
  - **Constraint:** No active download button is rendered for a missing file, and financial values are never defaulted to $0 when unavailable.
  - **Acceptance:** Every visible download corresponds to a file that exists for that report.

### Note 43: LCC: summary and Excel references sit behind one packaged download

  - **Requirement:** Each report retains independent summary and Excel file references internally, delivered to the customer as one evidence package.
  - **Behavior:** Readiness is evaluated per file reference; the packaged Excel workbook must retain the Summary, Invoice Overview, and LCC Detail tabs.
  - **Dependency:** Stored file references (PDF, Excel) per report and version, plus the packaging step that assembles them.
  - **Constraint:** The platform does not display or reproduce the workbook tabs; it delivers the files as-is inside the package.
  - **Acceptance:** The delivered package contains the summary and a workbook that opens with Summary, Invoice Overview, and LCC Detail intact.

### Note 44: LCC: actual-file download behavior

  - **Requirement:** Download actions must return the actual published report files, not generated or simplified replacements.
  - **Behavior:** Download Complete Evidence Package returns the published files as delivered, packaged together with no generated or simplified substitutes.
  - **Dependency:** The published binary files associated with the report.
  - **Constraint:** No placeholder or regenerated file is substituted.
  - **Acceptance:** The bytes delivered match the published source files.

### Note 45: LCC: report version

  - **Requirement:** Each report is versioned so re-published analyses are distinguishable.
  - **Behavior:** The report list shows the report version; file references and download events are tracked per version.
  - **Dependency:** A version field on each published report.
  - **Constraint:** A new analysis for the same period is a new version, not an overwrite of history.
  - **Acceptance:** The displayed version matches the delivered files.

### Note 46: LCC: newest-first ordering

  - **Requirement:** Reports are ordered newest first by date available (and optionally filterable by reporting period).
  - **Behavior:** The most recently available report appears first; a simple reporting-period filter is offered.
  - **Dependency:** Date-available timestamp per report.
  - **Constraint:** Ordering and filtering operate on the customer's own reports only.
  - **Acceptance:** The top report is the most recently available one for the account.

### Note 47: LCC: download-event tracking

  - **Requirement:** Record each download attempt for adoption and audit.
  - **Behavior:** Capture customer, user, report, report version, file type, download timestamp, and success or failure.
  - **Dependency:** A download-event log keyed to customer, report, and version.
  - **Constraint:** Tracking is per file type and per version.
  - **Acceptance:** Each PDF or Excel download produces one event with its outcome.

### Note 58: Report download tracking is version-specific

  - **Requirement:** Download status is version-specific. A download of Version 1 does not mark Version 2 as downloaded.
  - **Behavior:** Every report download records the user, timestamp, file type, and version. The Updated indicator for a version clears only when that specific current version is downloaded.
  - **Dependency:** A download-event log keyed to credit memo, report version, user, and file type.
  - **Constraint:** Tracking is per version; adoption and audit reporting read per-version download events.
  - **Acceptance:** Each version maintains its own download record and Updated state independent of other versions.

### Note 59: Publishing a new version updates all customer-facing data together

  - **Requirement:** Publishing a new version must update the current summary, findings, invoice results, report files, and version metadata together, as one atomic current-version state.
  - **Behavior:** When Implentio publishes a revised version, the customer-facing memo switches to the new version's summary values, findings, invoices, files, and metadata in a single consistent update. This remains a manual backend publishing workflow for App 2.5.
  - **Dependency:** An authorized internal publisher role and a transactional version-publish step that swaps the current-version pointer.
  - **Constraint:** Customer uploads, automated ingestion, event-driven audit regeneration, and automated update notifications are future capabilities and must not appear as functional prototype controls.
  - **Acceptance:** After a publish, no surface shows a mix of old and new version data; the current version is internally consistent across every screen.

### Note 61: Minimum backend payload for each published report version

  - **Requirement:** Each published report version must provide: credit memo ID, report version ID, sequential version number, current-version indicator, published date and time, published by, customer-facing change summary, reason-for-update category, report status, Excel file, PDF preview or summary file, summary-value snapshot, download activity, and superseded-version reference.
  - **Behavior:** The customer platform renders version history, current-version data, change summaries, and per-version downloads from this payload; it does not compute or infer version metadata.
  - **Dependency:** A backend publishing contract that emits the full version payload for every published version.
  - **Constraint:** This remains a manual backend publishing workflow for App 2.5; the platform reads the payload and does not generate reports or versions itself.
  - **Acceptance:** Every version rendered in the customer platform is backed by a complete payload with no missing required fields.

### Note 63: Publishing a new version must not change the standard credit memo information architecture

  - **Requirement:** An updated credit memo is still a complete credit memo. Publishing a new report version must not reduce or restructure the standard navigation or the executive-summary layout.
  - **Behavior:** Every version exposes the same views — Summary & Findings and Report & Export History — and all standard tabs display data from the current version. The Summary keeps its standard hierarchy: credit memo identity, audit period, reporting cadence, current version and prepared date, Total Variance, a concise explanation of the findings, Total Invoiced, Total Expected, Invoices Audited, Packages Analyzed, the grouped findings with their affected invoices and packages, and the Latest Report section. Previous-version data remains immutable and is accessible only through Report & Export History.
  - **Dependency:** The backend must provide, per current version, the full summary values, findings, invoices, and customer-facing change summary.
  - **Constraint:** Publishing a new version must not remove, reorder, or restructure the standard tab set, and the frontend must never infer a state change solely because a new version exists — every displayed value comes from the current report data.
  - **Acceptance:** A revised memo presents the identical tab set and Summary structure as any other memo, all populated from the current version, with prior versions reachable only in Report & Export History.

### Note 78: Order number remains a searchable reference

  - **Requirement:** Customers frequently locate a shipment by order number, so order number must remain searchable and visible alongside the tracking number.
  - **Behavior:** Each package row shows its tracking number and associated order number, and search resolves invoice number, order number, and tracking number.
  - **Dependency:** A maintained package-to-order association per record.
  - **Constraint:** Order number is a reference for locating a shipment; it is not the unit of parcel billing and is never used as the package count.
  - **Acceptance:** A customer can find a package by order number without the order becoming the counted record.

### Note 79: Every credit memo carries a durable ID and a defined population

  - **Requirement:** Assign a durable unique ID to every credit memo and associate it with its customer, audit period, and included invoice and package population.
  - **Behavior:** All displayed metrics, findings, records, previews, and downloads resolve to that credit memo ID and the population associated with the displayed version.
  - **Dependency:** A credit-memo record storing customer, audit period, and the included invoice and package identifiers.
  - **Constraint:** The population is fixed per published version; the frontend never derives membership from filters or report contents.
  - **Acceptance:** Every screen and export for a memo resolves to the same memo ID, version, and record population.

### Note 80: Invoice and audit-period overlap must be controlled

  - **Requirement:** Prevent unintended invoice or audit-period overlap across credit memos.
  - **Behavior:** Overlap is permitted only when it results from an intentional correction, replacement, or approved reprocessing workflow, and an updated version of an existing credit memo is always distinguished from a new credit memo.
  - **Dependency:** Overlap detection across memos on invoice and package identifiers and audit-period ranges.
  - **Constraint:** Accidental overlap must be blocked at publish time rather than reconciled after the customer sees it.
  - **Acceptance:** No two customer-visible memos claim the same invoice or package unless the overlap is an approved correction or reprocessing.

### Note 81: Version visibility, readiness, and download tracking are controlled internally

  - **Requirement:** Maintain credit memo version number and publication history, preserve all prior report assets when an updated version is published, and let authorized internal users control which version is customer-visible.
  - **Behavior:** Report readiness and customer downloads are tracked per memo and version. Drafts, failed reports, and internal-only outputs are never exposed to customers.
  - **Dependency:** Per-version publication metadata, a customer-visibility flag, and readiness and download event logs.
  - **Constraint:** A download is retrieval only. It does not confirm submission to a biller or realization of a credit.
  - **Acceptance:** Only an authorized, published, customer-visible version is reachable, and every readiness and download event is recorded against that version.

### Note 82: Findings must scale to tens of thousands of packages

  - **Requirement:** A finding group may contain thousands or tens of thousands of packages, so no view may assume the full record set is loaded at once.
  - **Behavior:** Finding groups stay collapsed by default, open with a limited page of invoices and packages, and offer visible pagination or Show more. Search operates across invoice number, order number, and tracking number, and search and pagination context is preserved when a package evidence popup is opened and closed.
  - **Dependency:** Server-side pagination or an equivalent scalable loading strategy, plus indexed search on invoice, order, and tracking identifiers.
  - **Constraint:** Totals must be calculated from the complete population, not only the rendered page, and the complete Excel export must include records not currently rendered.
  - **Acceptance:** Performance is validated on large real-world credit memos, including a finding with at least 10,000 packages.

### Note 83: The finding-level export contains the complete package population

  - **Requirement:** The finding-level export must contain the complete package population for that finding, even when the interface displays only the first page.
  - **Behavior:** Exported values reconcile to the finding-group total, and every export resolves to the same credit memo ID and version shown in the interface.
  - **Dependency:** The group-scoped subset of the reconciled dataset for the current version, retrieved server-side rather than from the rendered page.
  - **Constraint:** Finding-level and complete-report downloads are tracked separately.
  - **Acceptance:** The export row count matches the finding's complete package population and its totals match the displayed group total.

### Note 87: Finding roll-up and double-counting controls

  - **Requirement:** Package-level amounts must roll up to the affected-invoice subtotal for that finding, invoice subtotals must roll up to the finding's Total variance, and all published finding totals must roll up consistently to the credit memo's Total variance.
  - **Behavior:** A package may appear only once within the same finding group. When the same invoice appears under multiple findings, the shared invoice is never counted more than once toward a memo-level total.
  - **Dependency:** A reconciliation pass across package, invoice, finding, and memo levels for the published version.
  - **Constraint:** Double-counting checks must run at publish time, not in the customer interface.
  - **Acceptance:** Every level reconciles, and no invoice or package contributes twice to a memo-level figure.

### Note 88: Evidence, search, and exports follow the carrier-specific grouping

  - **Requirement:** Evidence, rate cards, and explanations must be associated with the specific finding group that used them — the UPS finding links to the applicable UPS rate card, the OSM finding to the OSM rate card.
  - **Behavior:** Each carrier-specific finding carries its own Evidence Used list, Download Finding Evidence export, source documents, and calculation explanation. Search and exports preserve the carrier-specific grouping and scope.
  - **Dependency:** Per-finding evidence associations keyed to carrier, category, and credit memo version.
  - **Constraint:** A single generic biller rate card must not be attached to every carrier unless that source genuinely governs every included package.
  - **Acceptance:** No finding links to a rate card that does not govern its carrier, and every export contains only that finding's records.

### Note 91: Service-level roll-up, search, and export requirements

  - **Requirement:** Service-level invoiced, expected and variance amounts must be calculated from the complete contributing package population, not only the displayed page, and pagination or incremental loading operates at the package level.
  - **Behavior:** Visible package rows roll up to the service-level subtotal when the complete population is considered, service-level subtotals roll up to the finding's Total variance, and all finding totals roll up consistently to the credit memo's Total variance. Invoice-number search returns every service-level group containing packages from that invoice.
  - **Dependency:** Server-side aggregation per service level and indexed search across service level, invoice, order and tracking number.
  - **Constraint:** Finding-level exports must retain invoice number for every package, and the complete evidence export must preserve the finding, service level, package and source invoice hierarchy.
  - **Acceptance:** Totals computed from the full population match the displayed service-level subtotals, and every exported package carries its source invoice.

### Note 94: Invoice amount is the complete invoice; credit memo amounts are not

  - **Requirement:** Invoice amount and package count must represent the complete ingested invoice, not the affected-package subset. Credit memo amounts represent only the packages and charges contributing to the credit memo, and the two must never be conflated.
  - **Behavior:** Where the two could be mistaken for one another, a tooltip states: Invoice amount represents the complete invoice. Credit memo values include only packages and charges contributing to identified variance.
  - **Dependency:** Complete invoice totals from ingestion, kept distinct from the affected-package charge sums used by the credit memo.
  - **Constraint:** The invoice index must not display credit-memo-scoped amounts, and the credit memo must not display complete invoice totals as its own.
  - **Acceptance:** An invoice's full amount and its credit memo contribution are separately labeled and never substituted for each other.

### Note 95: Invoice index linking, filtering, and lifecycle rules

  - **Requirement:** Link each associated invoice to its durable credit memo ID and published version, always resolving to the current customer-visible version while preserving version history. Draft or internal-only credit memos must never be linked from the customer invoice index.
  - **Behavior:** Invoice number remains searchable across invoice, credit memo and exported evidence experiences, and the index supports filtering by date period, biller, audit result and credit memo association.
  - **Dependency:** Invoice-to-memo association keyed by memo ID and version, plus indexed invoice search and server-side pagination for brands with large invoice histories.
  - **Constraint:** An invoice must not appear in overlapping credit memo periods unless an approved correction or reprocessing workflow allows it. The treatment of voided, duplicated, replaced or failed-ingestion invoices must be defined before surfacing them, and missing invoices must not be calculated without a reliable expected-invoice schedule or sequence.
  - **Acceptance:** Every linked memo is a published customer-visible version, and no invoice appears twice across memo periods without an approved correction.

### Note 117: Every report carries a durable identity and asset manifest

  - **Requirement:** Each report must have a durable report ID, analysis type, analysis period, prepared date, readiness status and its associated downloadable assets.
  - **Behavior:** The card renders entirely from that record; nothing is hardcoded per module.
  - **Dependency:** Report registry with per-asset records.
  - **Constraint:** A report without a durable ID or period is not publishable.
  - **Acceptance:** Every displayed report resolves to one identified analysis run.

### Note 119: The customer PDF must be a customer-safe summary

  - **Requirement:** The published PDF is a customer-facing summary of findings, financial impact and recommended actions. Internal-only language such as confidential internal-review markings must be removed before publication.
  - **Behavior:** Publication strips internal headers, reviewer notes and internal routing language.
  - **Dependency:** Report generation and publication pipeline.
  - **Constraint:** An internal draft PDF is never published to a customer.
  - **Acceptance:** No published PDF contains internal-review language.

### Note 120: Customer Excel evidence excludes internal fields

  - **Requirement:** The customer-facing workbook must exclude internal identifiers, processing fields, configuration details, implementation logic and any other customer or contract information.
  - **Behavior:** A customer-safe workbook is generated from approved outputs with customer-language sheet names.
  - **Dependency:** Export transformation and field allow-list.
  - **Constraint:** Internal workbooks are never customer-visible or customer-downloadable.
  - **Acceptance:** A published workbook contains only allow-listed customer-safe fields.

### Note 121: One consolidated evidence workbook, not three downloads

  - **Requirement:** The customer receives a single Complete Excel Evidence workbook consolidating the approved actionable findings and the advisory records that could not be analyzed or that indicate underweight observations. Internal working files are excluded entirely.
  - **Behavior:** Until consolidation exists, the interface keeps one Download Complete Excel Evidence action rather than exposing separate workbooks.
  - **Dependency:** A consolidation step that merges approved outputs into one customer-safe workbook.
  - **Constraint:** Internal file naming must never surface to customers, and no more than one customer-facing Excel action appears per report.
  - **Acceptance:** One action delivers one workbook containing the complete approved evidence.

### Note 124: Brand-level authorization gates every report asset

  - **Requirement:** Access to any report asset is authorized at the brand level before the file is served.
  - **Behavior:** Report lists and downloads are scoped to the authenticated brand.
  - **Dependency:** Authorization service.
  - **Constraint:** A user must never reach another brand’s report or asset.
  - **Acceptance:** Cross-brand asset requests are refused.

### Note 137: Package, service-level, finding and credit-memo totals must pass automated reconciliation before publication

  - **Requirement:** Four levels must reconcile: package net variance, service-level totals, error-group totals, credit memo Total variance.
  - **Behavior:** Before a credit memo version is published the platform verifies that charge components sum to each package total, package totals sum to their service level, service levels sum to their error group, and error groups sum to the credit memo Total variance. The internal verification card reports each check.
  - **Dependency:** A reconciliation step in the publishing workflow with per-level tolerances.
  - **Constraint:** Tolerance is limited to currency rounding. A failure is a publication blocker, not a warning.
  - **Acceptance:** The demo reconciles exactly: 5 groups, 852 packages, $30,668.85 invoiced, $21,281.15 expected, $9,387.70 net variance.

### Note 138: Publication is blocked when child totals do not reconcile to their parent total

  - **Requirement:** The platform must refuse to publish a credit memo version whose child totals do not roll up to their parent total.
  - **Behavior:** A failed reconciliation prevents the version from becoming the current version and raises an internal exception for review. No partially reconciled version is ever exposed to a customer, and no customer-facing screen displays a total it cannot substantiate from its own children.
  - **Dependency:** The reconciliation step in note 137 and the version-publish transaction.
  - **Constraint:** The frontend must never silently balance a discrepancy by allocating, prorating or rounding. Where a metric cannot be substantiated, an unavailable state is displayed and the missing backend requirement is recorded.
  - **Acceptance:** No published version exists in which a parent total differs from the sum of its children beyond currency rounding.

### Note 139: Billed and expected values must always use the same package population

  - **Requirement:** Every paired invoiced and expected amount is computed over an identical set of packages.
  - **Behavior:** Group, service-level and package rows show invoiced and expected totals drawn from the same population in the same query. No screen pairs an invoiced total from one population with an expected total from another.
  - **Dependency:** A single population query per displayed scope.
  - **Constraint:** Population must not vary by charge selection, search term, pagination or sort. Filters may change which rows are listed, but any total shown alongside them names the population it covers.
  - **Acceptance:** For every displayed pair, invoiced minus expected equals the displayed net variance for the same package set.

### Note 143: Supporting detail uses accessible disclosure semantics

  - **Requirement:** The segmented switcher must be operable and understandable without a mouse.
  - **Behavior:** The two segments are real buttons inside a labelled tablist. Each segment carries aria-selected and aria-expanded reflecting its state and aria-controls pointing at the shared panel. The shared panel is a labelled region referencing the active segment. Segments are reachable by keyboard in reading order, activate on Enter and Space, and show a visible focus outline.
  - **Dependency:** Accessible name, expanded and selected attributes emitted per segment and per panel.
  - **Constraint:** Focus outlines must never be removed. Labels must remain readable at narrow widths, where the segments stack or scroll horizontally rather than truncating.
  - **Acceptance:** A keyboard-only user can open, switch and collapse both sections, and assistive technology announces which section is selected and expanded.

### Note 145: Switching supporting detail must not change any finding data

  - **Requirement:** Moving between Finding explanation and Evidence used is a presentation change only.
  - **Behavior:** Switching or collapsing supporting detail must not refetch or recalculate the finding, and must not alter group net variance, total invoiced, total expected, group membership, the package population, package filters, service-level expansion state, or package evidence state.
  - **Dependency:** Client-side disclosure state only, with finding data already resolved for the current credit memo version.
  - **Constraint:** No network request, recalculation or state reset may be triggered by a disclosure change. Affected-package expansion, charge-breakdown rows and the package evidence popup keep their state across disclosure changes.
  - **Acceptance:** Every financial value and every drill-down state on a finding card is identical before and after any number of disclosure changes.

### Note 149: Every collapsed navigation icon carries a tooltip label

  - **Requirement:** Each rail icon exposes its full destination name through a tooltip.
  - **Behavior:** Tooltips appear on hover and on keyboard focus. Labels are All Invoices, Parcel Credit Memos, Fulfillment Credit Memos — Future, Least Cost Carrier, Product Weight Validator, Unit Economics — Preview, Rate Cards — Future. The avatar tooltip shows the user name and company.
  - **Dependency:** Per-destination label and availability qualifier.
  - **Constraint:** A destination may not appear in the rail without a tooltip, and tooltips must not rely on hover alone.
  - **Acceptance:** Every rail icon announces its destination to keyboard and assistive-technology users.

### Note 151: The collapse preference is persisted per browser

  - **Requirement:** The user's expanded or collapsed choice survives route changes, refreshes and later visits in the same browser.
  - **Behavior:** The preference is written on toggle and read on load. Changing routes, switching demo scenarios or reopening the profile menu never resets it.
  - **Dependency:** One persisted key per user or browser profile.
  - **Constraint:** State must not reset on navigation, and the profile menu must not force the navigation to expand.
  - **Acceptance:** After collapsing, refreshing and navigating to another destination, the navigation is still collapsed.

### Note 152: Main content width responds to the actual navigation width

  - **Requirement:** The content area must expand into the space released by the collapsed rail.
  - **Behavior:** The content pane is fluid and reflows against the live navigation width using a short width transition that respects reduced-motion preferences. Wide tables gain the additional space.
  - **Dependency:** Layout driven by the navigation's rendered width, not a fixed offset.
  - **Constraint:** No overlay of the rail on content, and no blank gap equal to the expanded navigation width.
  - **Acceptance:** At every state the content starts immediately after the navigation edge with no gap or overlap.

### Note 153: Navigation brand and icon assets come from the approved design package

  - **Requirement:** Both navigation states must use approved brand and icon assets.
  - **Behavior:** The expanded state uses the full Implentio wordmark; the collapsed state uses the packaged Implentio logomark. Destination icons are the assets already selected for the navigation and are reused unchanged in both states.
  - **Dependency:** Implentio design package logo and icon assets.
  - **Constraint:** Logos and icons may not be redrawn, retypeset, approximated in CSS or replaced with another library. Substituted icons must be recorded as substitutions.
  - **Acceptance:** Every logo and icon in the navigation resolves to an approved asset file.

### Note 154: Routes, authorization and availability are identical in both states

  - **Requirement:** Collapsing the navigation is a presentation change only.
  - **Behavior:** Selected-page logic, route targets, permission checks and feature availability behave the same in the expanded navigation and the rail, including the active destination's selected purple background.
  - **Dependency:** Existing route and authorization model.
  - **Constraint:** No destination may appear, disappear or change permissions because of the navigation width.
  - **Acceptance:** The same set of destinations is reachable, with the same authorization outcome, in both states.

### Note 155: The collapsed state must not reduce accessibility

  - **Requirement:** The rail must remain fully keyboard operable.
  - **Behavior:** The collapse control is a button with aria-expanded and an accessible label that reads Collapse navigation or Expand navigation. Enabled destinations are buttons with aria-current on the active destination, visible focus outlines, accessible target sizes and logical tab order. Tooltips appear on focus.
  - **Dependency:** Accessible names, expanded state and current-page state emitted per control.
  - **Constraint:** Focus outlines may not be removed and no enabled destination may become keyboard-unreachable when collapsed.
  - **Acceptance:** A keyboard-only user can collapse, expand and reach every enabled destination in either state.

### Note 157: Each page supplies its own filter configuration

  - **Requirement:** The shared component is configuration-driven: a page provides its field list, labels, default option labels and option sources.
  - **Behavior:** Parcel Credit Tracker supplies Biller, Report status and Audit period. Least Cost Carrier supplies Reporting period. Invoices supplies Biller, Period, Carrier and Credit memo.
  - **Dependency:** Per-page field configuration resolved at render time.
  - **Constraint:** Filtering logic, option values and result populations must remain exactly as they are today.
  - **Acceptance:** Changing a page's filter set is a configuration change only.

### Note 160: The active-filter count excludes default selections

  - **Requirement:** The badge on the Filter button counts only fields set to a non-default value.
  - **Behavior:** Fields left at their All or Any default are never counted and never produce a chip. When at least one filter is active the Filter button takes a visible active state and removable chips appear beneath the toolbar.
  - **Dependency:** Comparison of applied values against each field's default.
  - **Constraint:** A default selection must never be represented as an active filter.
  - **Acceptance:** With every field at its default the badge and the chip row are absent.

### Note 161: Result counts derive from the filtered population

  - **Requirement:** Each experience keeps its existing result count and recalculates it from the filtered rows.
  - **Behavior:** Counts read 5 credit memos, 1 report and Showing 20 of 20 invoices, update after Apply Filters or a chip removal, and are announced to assistive technology.
  - **Dependency:** Counts computed from the same population the list renders.
  - **Constraint:** Counts may not be estimated, cached or calculated from the unfiltered population.
  - **Acceptance:** The count always equals the number of rows the user can reach in the list.

### Note 163: Desktop uses an anchored popover; small screens use a responsive panel

  - **Requirement:** One component, two presentations.
  - **Behavior:** On desktop the panel opens anchored beneath the Filter button at roughly 340px wide. On small screens it becomes a full-width bottom panel with Reset and Apply Filters reachable at the bottom. Filter controls never overflow horizontally and the active-filter count is preserved at every size.
  - **Dependency:** Responsive presentation inside the shared component.
  - **Constraint:** A separate mobile filter implementation may not be created.
  - **Acceptance:** The same filter set and behavior is available at every breakpoint.

### Note 164: Filter options reflect authorized data only

  - **Requirement:** Options offered in the panel must come from supported data values the current customer is authorized to see.
  - **Behavior:** Option lists are derived from the customer's own ingested records rather than hardcoded lists, and unauthorized brands, billers or carriers never appear as options.
  - **Dependency:** Permission-filtered option source per field.
  - **Constraint:** Prototype-only hardcoded option lists must be replaced before production.
  - **Acceptance:** A customer never sees a filter option that would reveal data outside their access.

### Note 165: The filter panel is fully keyboard operable

  - **Requirement:** The Filter button, every field and both actions are reachable and operable without a mouse.
  - **Behavior:** The Filter button carries aria-haspopup and aria-expanded, the panel is a labelled dialog, Escape and outside click close it, focus returns to the Filter button on close, focus outlines stay visible and targets meet accessible size minimums.
  - **Dependency:** Accessible names and expanded state emitted per control.
  - **Constraint:** Focus outlines may not be removed and the panel may not trap focus permanently.
  - **Acceptance:** A keyboard-only user can open, edit, apply, reset and close filters on every experience.

### Note 167: Credits realized is populated from ingested Biller credit records

  - **Requirement:** Populate Credits realized from ingested billing records identified as credit invoices or credit adjustments issued by the customer's Biller.
  - **Behavior:** Sum the confirmed credit amounts for the customer while preventing duplicate records from being counted. The metric must respect the active customer and reporting-period filters. If the system can associate a credit record with a specific credit memo, preserve that relationship for future memo-level reporting; an unmatched ingested credit may still contribute to the customer-level total when it is confirmed as a valid Biller credit.
  - **Dependency:** Ingested credit invoices and credit adjustments, deduplicated per source record.
  - **Constraint:** A realized credit must never be inferred from a credit-memo download, a claim submission, or a potential variance.
  - **Acceptance:** Credits realized equals the deduplicated sum of confirmed Biller credit records for the active customer and period, and never reflects unconfirmed activity.

### Note 169: The variance-group rollup is generated from published finding groups

  - **Requirement:** The credit memo summary rollup must be populated from the same published finding-group records rendered in the Findings section.
  - **Behavior:** Each row shows a published group's customer-facing name, its group net variance, its assigned package count, and its distinct invoice count. Selecting a row moves the customer to that finding below. No group, amount or count may be created for the rollup alone.
  - **Dependency:** Published finding-group records for the active credit memo version.
  - **Constraint:** The rollup may not invent groups, merge groups, or display values that differ from the finding cards.
  - **Acceptance:** Every rollup row corresponds one-to-one with a finding card and shows identical values.

### Note 171: Invoice counts are distinct per group and are never summed

  - **Requirement:** Each rollup row shows the distinct number of invoices contributing packages to that group.
  - **Behavior:** One invoice may contribute packages to several groups, so row-level invoice counts overlap. The Total row shows the distinct invoice count for the whole credit memo, not the sum of the rows.
  - **Dependency:** Distinct invoice counts computed per group and per credit memo.
  - **Constraint:** Row invoice counts must never be added together to produce the total, and the interface must make the distinct nature of the count clear.
  - **Acceptance:** The Total invoice count equals the credit memo's distinct invoice count even when it is smaller than the sum of the rows.

### Note 172: The rollup is preserved per credit memo version

  - **Requirement:** The rollup belongs to the credit memo version it was published with.
  - **Behavior:** A superseded version keeps the rollup that was published with it, and a revised version publishes its own rollup consistent with its own findings.
  - **Dependency:** Version-scoped finding-group records.
  - **Constraint:** A rollup may never be recalculated against a different version's findings.
  - **Acceptance:** Opening an earlier version shows the rollup that was published with that version.

### Note 176: Package charge arithmetic must reconcile in both directions

  - **Requirement:** Total expected equals the sum of the applicable expected charge components for the package. Total invoiced equals the sum of the applicable invoiced charge components. Each charge variance equals invoiced minus expected for that charge. Package net variance equals total invoiced minus total expected and equals the sum of its charge-level variances. Favourable charge differences stay visible because they offset unfavourable differences inside the same package. The packages displayed under a service level must reconcile to that service level's package count and financial totals. Only charge categories supported by the source data may be exposed; an inapplicable charge renders an em dash, and $0.00 is displayed only when zero is an actual source value.

### Note 177: The wide package table must scale to large populations

  - **Requirement:** The contributing-packages table supports large package populations through server-side pagination or incremental loading, keeps service-level groups collapsed by default, and loads a limited first page with Show more packages. The table scrolls horizontally rather than compressing columns, and tracking number, order number, and invoice number remain pinned while scrolling. Search continues to match service level, invoice number, order number, and tracking number.

### Note 231: Every value in the preparation flow resolves to one credit memo version

  - **Requirement:** Totals, findings, the representative package, recipients and the evidence filename must all resolve to the same credit memo version.
  - **Behavior:** The flow reads a single version snapshot. If a newer version is published while the flow is open, the flow must be re-opened against the current version rather than mixing values.
  - **Dependency:** Versioned credit memo snapshot API.
  - **Constraint:** System-generated totals, findings, evidence references and version information are never editable in the flow.
  - **Acceptance:** Every displayed number and file reference in the three steps traces to one version identifier.

### Note 232: Internal filenames and internal-only evidence never appear in the customer workflow

  - **Requirement:** The customer-facing evidence reference is the published Complete Excel Evidence filename only.
  - **Behavior:** The flow displays the customer filename in the pattern credit memo ID, version, Complete Excel Evidence. Internal working files, internal identifiers and internal-only supporting material are excluded from the review step, the email, and the attachment reference.
  - **Dependency:** Customer-safe asset manifest per version.
  - **Acceptance:** No internal filename or internal-only evidence reference is reachable from any step of the flow.

### Note 236: Recipients and introductory copy are editable; financial content is locked

  - **Requirement:** The email preview may allow edits to recipients, subject and introductory copy. System-generated financial values and evidence references remain locked.
  - **Behavior:** The locked summary block carries the total variance, package count, invoice count, evidence description and the request for review. It is rendered read-only and travels with the copied message.
  - **Dependency:** Version snapshot values.
  - **Constraint:** No mechanism may allow the customer to alter a published figure inside a prepared message.
  - **Acceptance:** Attempting to edit the locked block is not possible in the interface, and the copied message contains the unmodified system summary.

### Note 241: Preparation analytics events and their properties

  - **Requirement:** Track prepare_for_3pl_started, prepare_for_3pl_review_completed, prepared_email_copied, prepared_evidence_downloaded, and email_app_opened when supported.
  - **Behavior:** Each event carries customer account, user, credit memo ID, version, Biller, timestamp and the source CTA that opened the flow.
  - **Dependency:** Product analytics pipeline.
  - **Constraint:** Package-level, rate-card-level and contract-level values must never be included in analytics properties.
  - **Acceptance:** Every event fires once per user action with the complete property set and no financial detail beyond the credit memo identifiers.

### Note 246: The library distributes finalized artifacts; it does not calculate fulfillment findings

  - **Requirement:** This experience stores and distributes finalized fulfillment credit memo artifacts. It does not calculate or regenerate fulfillment findings.
  - **Behavior:** Only finalized, authorized, customer-visible reports are published to the library. Draft, internal, incomplete, failed and file-not-ready reports must not appear.
  - **Dependency:** Report publication pipeline with an authorization check.
  - **Constraint:** No report editing or upload control is exposed in the customer-facing interface.
  - **Acceptance:** A report is reachable by the customer only after it is finalized, authorized and customer-visible with a ready evidence package.

### Note 247: Each fulfillment report carries a durable identity and complete metadata

  - **Requirement:** Each report must have a durable report ID, customer account, review period, available date, version, status, evidence-package asset and the five fulfillment metadata fields.
  - **Behavior:** The five displayed metrics come from the published report metadata and resolve to the same report version as the downloaded evidence package. Version-specific assets and download history are preserved.
  - **Dependency:** Report metadata service and versioned asset storage.
  - **Constraint:** Fulfillment metrics must never be recalculated in the browser.
  - **Acceptance:** Every metric on a card and the downloaded evidence package resolve to one report version identifier.

### Note 250: Fulfillment credit memo analytics events and their properties

  - **Requirement:** Track fulfillment_credit_memo_published, fulfillment_credit_memo_evidence_downloaded and fulfillment_credit_memo_updated_version_downloaded.
  - **Behavior:** Each event carries the customer account, user, report ID, report version, review period, timestamp and the source CTA.
  - **Dependency:** Product analytics pipeline.
  - **Constraint:** Order-level and invoice-level data must never appear in analytics properties.
  - **Acceptance:** Each event fires once per action with the complete property set and no order or invoice detail.

### Note 251: Publication reuses the existing report-ready notification workflow

  - **Requirement:** Customer Operations must be alerted when a fulfillment credit memo is published, using the existing report-ready notification workflow.
  - **Behavior:** Publication triggers the same notification path already used for the other report libraries. No separate fulfillment notification system is created.
  - **Dependency:** Existing report-ready notification workflow.
  - **Acceptance:** Publishing a fulfillment credit memo produces the same operational alert as publishing any other customer-visible report.

### Note 304: Variance-group selection analytics

  - **Requirement:** Track variance_group_selected, variance_group_deselected, and prepare_for_3pl_selection_completed.
  - **Behavior:** Each event carries customer account, user, credit memo ID, version, the affected or selected group IDs, selected group count, and timestamp.
  - **Dependency:** Product analytics pipeline.
  - **Constraint:** Package identifiers, rate-card data, contract data and financial values must never be included in these analytics properties.
  - **Acceptance:** Every selection change and every completed selection fires its event with the complete property set and no financial or package-level detail.

### Note 307: Authorization happens on the provider's domain; Implentio never sees the password

  - **Requirement:** Connecting Gmail or Outlook redirects to the provider's own hosted sign-in and consent screen.
  - **Behavior:** Implentio never renders a Google or Microsoft credential form inside its own interface, and never stores or transmits the user's provider password.
  - **Dependency:** Provider OAuth redirect flow.
  - **Constraint:** No in-app credential capture for Gmail or Outlook may ever be built.
  - **Acceptance:** Every connection attempt leaves Implentio's domain to complete sign-in and returns only an authorization result.

### Note 309: Every send requires a final review and explicit confirmation

  - **Requirement:** Before sending, the customer sees a complete review: from address, recipients, CC, Implentio Support CC, subject, message preview, credit memo ID and version, selected variance groups, amount pursued, distinct package and invoice counts, and the exact evidence filename.
  - **Behavior:** The Send action is a single explicit click on this review screen. Send is disabled while a request is processing to prevent duplicate submissions.
  - **Dependency:** Prepared-message and selection state.
  - **Constraint:** No connected-sending path may skip this review screen.
  - **Acceptance:** A message can only be sent after the full review has rendered and the user has clicked Send exactly once per request.

### Note 310: Sender authorization and version are validated at send time

  - **Requirement:** Before sending, the platform validates that the sender belongs to the customer account and is authorized to access the selected credit memo, and locks the send to the exact published version and evidence assets the user reviewed.
  - **Behavior:** If the underlying version changes after review but before send, the send must be blocked and the user asked to re-review.
  - **Dependency:** Account authorization service and versioned credit memo snapshot.
  - **Constraint:** A send may never be fulfilled against a version or asset set the user did not see in final review.
  - **Acceptance:** No send completes for an unauthorized sender or a version mismatch between review and submission.

### Note 311: Every send creates an immutable record and is idempotent

  - **Requirement:** Each send creates an immutable record containing sender, recipients, subject, final message, credit memo version, selected group IDs, evidence asset IDs, provider, provider message or request ID, timestamps, and status.
  - **Behavior:** Send requests are idempotent: retrying a send after a network error or duplicate click must not produce two outbound messages or two records.
  - **Dependency:** Send record store and idempotency key per prepared request.
  - **Constraint:** The record is never edited after creation, only appended to with later status updates.
  - **Acceptance:** Repeating the same send action never results in more than one delivered message or more than one send record.

### Note 316: Preparation state survives the round trip to provider authorization

  - **Requirement:** When a user leaves Prepare for Biller to authorize Gmail or Outlook, their selected variance groups, recipients, edited introduction, subject, and evidence-package selection must be exactly as they left them on return.
  - **Behavior:** The Prepare for Biller session persists underneath the connection modal and is not reset by opening or completing authorization from within the flow.
  - **Dependency:** Prepare-for-Biller session state.
  - **Constraint:** An authorization attempt, success, or failure must never reset an in-progress preparation.
  - **Acceptance:** Connecting, failing to connect, or needing admin approval mid-flow leaves every prior edit and selection intact.

### Note 317: Connection and send analytics exclude sensitive content

  - **Requirement:** Track connection and send lifecycle events with customer account, user, provider, credit memo ID and version, and timestamps.
  - **Behavior:** OAuth tokens, package-level evidence, rate-card data, and message bodies are never included in analytics event properties.
  - **Dependency:** Product analytics pipeline.
  - **Constraint:** No analytics property may carry a credential, token, or the content of a prepared message.
  - **Acceptance:** Every connection and send event fires with only identifiers and status, never sensitive content.

### Note 321: Implentio recipients are added to CC only, never BCC, and never replace other recipients

  - **Requirement:** Selecting the option adds the resolved CSM (if any) and support@implentio.com to the visible CC field alongside any customer-entered CC recipients.
  - **Behavior:** Deselecting the option removes only the system-added addresses; every customer-entered CC recipient is preserved untouched.
  - **Constraint:** Implentio recipients must never be added through BCC or otherwise hidden from the visible recipient list; system-added addresses must be distinguishable from customer-entered ones so deselection never removes a customer's own entry.
  - **Acceptance:** Every recipient list shown to the customer, copied, or sent includes both Implentio addresses in CC exactly when the option is selected, and never hides their participation.

### Note 322: The opt-in applies only to the current prepared message

  - **Requirement:** The selection is scoped to the single Prepare for Biller session in progress.
  - **Behavior:** The selection persists while the customer moves between Steps 1 through 3 of the same session, and clears when the flow is closed, canceled, or reopened.
  - **Dependency:** Prepare-for-Biller session state.
  - **Constraint:** The opt-in must never be written to the customer's saved Biller contact or account settings.
  - **Acceptance:** Closing and reopening Prepare for Biller never carries a prior selection into the new session.

### Note 323: Changing the assigned CSM never alters historical send records

  - **Requirement:** If the customer account's assigned CSM changes after a message was sent, previously sent records must keep the CSM identity that was actually copied at send time.
  - **Behavior:** The immutable send record stores the CSM's name and email, the shared support address, and the customer's opt-in selection at the moment of sending.
  - **Dependency:** Immutable send record schema.
  - **Constraint:** A CSM reassignment must never rewrite or reinterpret a prior send record.
  - **Acceptance:** Reassigning the account's CSM leaves every previously sent record's recorded recipients unchanged.

### Note 324: The send record captures both Implentio recipients and the opt-in decision

  - **Requirement:** The immutable send record created for connected sending includes whether the option was selected and, if so, the resolved CSM's name and email plus the shared support address as recorded in the CC list.
  - **Behavior:** This applies equally to messages sent through a connected Gmail or Outlook account. If the CSM assignment changes after the email is prepared but before it is sent, the customer must review the updated recipient list again before sending.
  - **Dependency:** Immutable send record schema.
  - **Constraint:** The opt-in decision must be recorded even when the customer deselects it before sending, so the record reflects the customer's final choice.
  - **Acceptance:** Every send record accurately reflects exactly which Implentio addresses were copied on that specific request.

### Note 330: Filename, included files, and financial values must resolve to the same version and selection

  - **Requirement:** The attachment filename, its included-file list, the dollar amount pursued, the package count, and the invoice count must all trace to the same published credit memo version and the same selected-group set.
  - **Behavior:** Returning to Step 1, changing the selection, and continuing back to Step 2 immediately updates the attachment type, filename, included-file count, and locked summary together.
  - **Dependency:** Versioned credit memo snapshot and per-group evidence manifest.
  - **Constraint:** No two of these values may ever reflect different selections at the same time.
  - **Acceptance:** At every point in the flow, the attachment and the financial summary describe the identical selected scope.

### Note 331: The platform bundles Toolbelt-provided files unchanged; it does not edit them

  - **Requirement:** Implentio only retrieves the Toolbelt-provided per-group Excel files and bundles the selected ones into a ZIP. It never edits, merges, filters rows within, or recalculates values inside those files.
  - **Behavior:** The Complete Excel Evidence workbook and the per-group files inside a Selected Variance Evidence ZIP are byte-for-byte the files Toolbelt published.
  - **Dependency:** Toolbelt per-group evidence file publishing.
  - **Constraint:** No in-app transformation of evidence file contents is permitted.
  - **Acceptance:** Every file inside a prepared attachment matches its Toolbelt-published source exactly.

### Note 332: A missing or failed group file blocks package preparation

  - **Requirement:** If a selected group's underlying Excel file is missing or fails to retrieve, the Selected Variance Evidence ZIP must not be produced with that group silently omitted.
  - **Behavior:** Preparation shows a failure state rather than delivering an incomplete package.
  - **Dependency:** Per-group evidence file availability.
  - **Constraint:** A ZIP must never be delivered missing a file for a group the customer believes is included.
  - **Acceptance:** A missing or failed source file always surfaces the failure state instead of a silently incomplete download.

### Note 334: Preparing your selected evidence package blocks sending and downloading until ready

  - **Requirement:** While a Selected Variance Evidence ZIP is being assembled, the interface shows Preparing your selected evidence package and disables the send and download actions.
  - **Behavior:** The prior scoped attachment is invalidated and regenerated whenever the selection changes; a failed preparation shows Try again and Back to selections without silently substituting the complete workbook.
  - **Dependency:** ZIP assembly service.
  - **Constraint:** No send or download may complete against an attachment still being prepared or one that failed to prepare.
  - **Acceptance:** Every send or download action is disabled until the correct attachment for the current selection is ready.

### Note 335: The immutable record captures the exact attachment and included group IDs

  - **Requirement:** The preparation or send record stores the exact attachment asset used, the included variance-group IDs, and the credit memo version, whether sent through a connected account or downloaded manually.
  - **Behavior:** This record is what later confirms exactly which evidence file and groups were part of a given request.
  - **Dependency:** Immutable send/preparation record schema.
  - **Constraint:** The record must reflect the attachment actually used, never the customer's full-selection default if they had deselected groups.
  - **Acceptance:** Every record's attachment reference and group IDs match what was truly sent or downloaded for that request.

### Note 340: The immutable send record captures the customer's opt-in, resolved CSM, and shared support address

  - **Requirement:** The send record stores the opt-in boolean, the resolved CSM (or its absence), the shared support address, and the complete final recipient list used at send time.
  - **Behavior:** Historical send records retain the recipients used at the time of sending even if the assigned CSM later changes.
  - **Dependency:** Immutable send record schema.
  - **Constraint:** The record must never be recomputed from the current CSM assignment after the fact.
  - **Acceptance:** Every historical send record reproduces exactly who was copied at the moment that message was sent.

### Note 342: Expiration is system-controlled and cannot be manually overridden

  - **Requirement:** A variance group becomes Expired automatically when its dispute deadline passes with no pursuit on record; customers cannot mark a group expired or un-expire one.
  - **Behavior:** Eligibility is computed from the disputed deadline and pursuit state on every render, not stored as a customer-editable field.
  - **Dependency:** Backend-provided dispute deadline per variance group.
  - **Constraint:** A pursued group never becomes Expired even after its deadline passes.
  - **Acceptance:** No customer-facing control can change a group's eligibility directly.

### Note 345: Every status change records user, timestamp, source action, version, and prior value

  - **Requirement:** Marking a group pursued and recording or correcting a collection outcome each capture the acting user, timestamp, the action that caused the change, the credit memo version, and the prior value being replaced.
  - **Behavior:** Correcting an outcome preserves the earlier outcome in a retained history rather than discarding it.
  - **Dependency:** Immutable status-change log.
  - **Constraint:** A correction must never silently overwrite history.
  - **Acceptance:** Every group with a corrected outcome shows both the current value and its prior recorded value.

### Note 346: Superseded credit memo versions must not duplicate dashboard totals

  - **Requirement:** Credit Outcomes dashboard totals are calculated from unique versioned variance-group records; a superseded version of a credit memo is excluded once a newer version publishes.
  - **Behavior:** Only the current version's variance groups for a given credit memo contribute to identified, pursued, expired, and collected totals.
  - **Dependency:** Versioned variance-group records keyed by credit memo and version.
  - **Constraint:** Republishing a version must not double-count amounts already reflected under a prior version.
  - **Acceptance:** Dashboard totals never change simply because a superseded version still exists in history.

### Note 348: Dashboard metrics aggregate variance groups, not credit memo headline totals

  - **Requirement:** Credit Outcomes totals, counts, and the collection rate are computed by summing individual variance-group records, not by reusing each credit memo's headline Total variance figure.
  - **Behavior:** Collection rate is total amount collected divided by total amount pursued only; unpursued and expired amounts are excluded from both numerator and denominator.
  - **Constraint:** A credit memo's headline total must never be substituted for its groups' summed amounts.
  - **Acceptance:** Manually summing the dashboard table's amount-pursued and amount-collected columns reproduces the displayed pursued total and collection rate.

### Note 354: Slice size is identified variance amount, not count or collected amount

  - **Requirement:** Each slice's size and percentage are computed from the sum of its groups' identified variance amount.
  - **Behavior:** Partially collected sizes by the group's full identified amount, not the portion collected so far; the collected portion appears only in the tooltip and legend detail.
  - **Constraint:** Finding count is shown as secondary context and never determines slice size.
  - **Acceptance:** Every slice's displayed amount and percentage are computed from identified variance, and the six slice amounts sum exactly to the chart's Total identified figure.

### Note 355: The donut, legend, and outcome table share one filtered dataset

  - **Requirement:** The Status breakdown donut recalculates from the same filtered variance-group rows used by the outcomes table, respecting the credit memo, Biller, variance group, pursuit status, and collection outcome filters.
  - **Behavior:** Changing any filter updates the center total, every slice's amount/percentage/count, and the legend and hover detail together.
  - **Dependency:** Shared filtered dataset.
  - **Constraint:** The chart must never read from an unfiltered or differently filtered dataset than the table.
  - **Acceptance:** For any filter combination, the six slice amounts sum to the filtered Total variance identified shown at the top of the tab.

### Note 357: Superseded credit memo versions are excluded from the donut

  - **Requirement:** The Status breakdown donut draws from the same versioned, de-duplicated variance-group records as the rest of the Credit Outcomes tab.
  - **Behavior:** A superseded version of a credit memo never contributes a slice amount once a newer version publishes.
  - **Dependency:** Versioned variance-group records keyed by credit memo and version.
  - **Constraint:** No slice amount may include a superseded version's groups.
  - **Acceptance:** Republishing a credit memo version never changes slice totals beyond the net effect of the new version's own data.

### Note 361: Pursued groups keep their pursuit status as the outcome progresses

  - **Requirement:** Recording, correcting, or leaving a collection outcome as Awaiting never changes a group's Pursued status.
  - **Behavior:** The compact status row shows Pursued as the primary status at all times for a pursued group, with the collection outcome shown only as secondary text.
  - **Constraint:** Collection-outcome updates must never rewrite the pursuit field.
  - **Acceptance:** A pursued group's primary status reads Pursued regardless of its current collection outcome.

### Note 362: The biller request updated banner and Updated indicator are temporary, page-session feedback

  - **Requirement:** The confirmation banner and per-group Updated indicator shown after completing Prepare for Biller are not a durable status — only Pursued and Not Pursued are persisted.
  - **Behavior:** The banner and indicator clear automatically after a short interval and whenever the customer navigates away from Credit Memo Details; they do not reappear on refresh.
  - **Constraint:** No persisted record may store the banner or Updated flag as if it were part of the group's status.
  - **Acceptance:** Reopening the same credit memo later never shows the prior banner or Updated indicator, while the underlying Pursued/Not Pursued statuses remain.

## BI Concept — Proposed Change

### Note 189: Narrow the first release to one outbound cost-performance workflow

  - **Requirement:** The first BI concept covers outbound cost performance end to end rather than a broad BI home dashboard across the full metric catalog.
  - **Behavior:** Two connected screens ship: an Outbound Cost Performance overview and a cost-per-order metric detail with driver investigation. Storage, receiving, returns, kitting and admin services are out of the first concept.
  - **Dependency:** The Phase 0 normalized model, limited to outbound parcel and fulfillment charges.
  - **Constraint:** Proposed change against the brief's section 6.3 home dashboard. Reversible — the broader dashboard remains the Phase 1 target once this workflow is validated.
  - **Acceptance:** The concept can be tested as one decision workflow without requiring the full metric catalog.

### Note 190: Actual against customer target is the opening frame

  - **Requirement:** The overview opens with actual cost per order compared with the customer's own target, not with a grid of unrelated KPI cards.
  - **Behavior:** The lead module states actual, target, difference from target, the monthly dollar effect at current volume, and whether performance is above or below plan.
  - **Dependency:** A customer-specific target with a defined owner, effective date and revision history.
  - **Constraint:** Proposed change based on the Implentio interview, which described annual unit-economics expectations reviewed monthly by category.
  - **Acceptance:** A user can tell within seconds whether performance is on plan, before reading any other module.

### Note 191: Implentio savings and recovered credits are secondary context

  - **Requirement:** Recovered credits and savings identified are contextual inputs to cost performance, not the organizing value of Analytics.
  - **Behavior:** Analytics states how much of the period's spend is associated with an active reconciliation and links to the credit memo. It does not restate variance groups, expected-versus-invoiced math or dispute evidence.
  - **Dependency:** A reliable association between period spend and active reconciliation findings.
  - **Constraint:** Proposed change against the brief's Implentio value metrics on every dashboard. The credit memo remains the authoritative source for billing findings.
  - **Acceptance:** Analytics is useful in a period with no findings and no credits.

### Note 192: Leader and operator are separated by disclosure, not by roles

  - **Requirement:** The accountable operations leader and the day-to-day operator need different depth from the same experience.
  - **Behavior:** The overview answers the leadership question in one screen. Driver investigation, metric lineage and contributing records sit one level deeper for the operator or analyst.
  - **Dependency:** None beyond the two screens.
  - **Constraint:** Proposed change against the brief's four separate personas. No role management, permissions or per-persona views are built in this prototype.
  - **Acceptance:** Both users are served by one navigation path with progressive depth.

### Note 193: Only customer-supported dimensions are offered

  - **Requirement:** The breakdown offers the dimensions this customer's data actually supports, not a universal dimension set.
  - **Behavior:** Carrier and service, warehouse and product category are available for this account. Sales channel is presented as unavailable with the reason stated.
  - **Dependency:** Per-customer dimension resolution and an explicit reason string for each unavailable dimension.
  - **Constraint:** Proposed change against the brief's section 6.2 universal slicing. Channel remains a real customer request and is not withdrawn from the roadmap.
  - **Acceptance:** Every offered dimension resolves from the customer's own source data.

### Note 194: Cost drivers are a structured explanation, not an AI insight

  - **Requirement:** The What changed section must not be labeled or presented as AI-generated insight.
  - **Behavior:** Drivers are presented as a structured decomposition with direction, estimated contribution, plain-language explanation, affected segment and an investigation path.
  - **Dependency:** A validated decomposition method that attributes period-over-period movement to named factors.
  - **Constraint:** Proposed change against the brief's section 6.4. Automated decomposition and narrative generation are not validated and must not be implied by the interface.
  - **Acceptance:** No customer-facing string in Analytics claims automated or AI-generated analysis.

### Note 195: Drill-down is metric lineage, not variance-group evidence

  - **Requirement:** Analytics drill-down follows metric → period → segment or driver → contributing records → source and calculation.
  - **Behavior:** The metric detail uses BI labels: How this metric is calculated, Data included, Data excluded, Source and freshness, View contributing records, Export metric detail. It does not reuse Finding Explanation, Evidence Used, or the credit memo → variance group → package → charge hierarchy.
  - **Dependency:** Metric definition metadata and record-level lineage.
  - **Constraint:** Proposed structure derived from the Misen interview. Reconciliation evidence remains in the credit memo experience.
  - **Acceptance:** No reconciliation evidence component appears inside Analytics.

### Note 196: COGS versus OPEX organization is deferred

  - **Requirement:** The first concept is organized around one workflow rather than a COGS-versus-OPEX information architecture.
  - **Behavior:** Outbound parcel and fulfillment cost is treated as one included-spend definition. Storage, receiving and returns are named in the excluded list rather than presented as a parallel OPEX branch.
  - **Dependency:** None for this concept; a full service taxonomy is required if the split is adopted later.
  - **Constraint:** Proposed change against the brief's sections 2 and 6.1. Not validated by the four interviews; reversible.
  - **Acceptance:** The workflow is testable without the customer needing to understand a COGS/OPEX split.

### Note 197: Usage cadence is an open question, not a daily-dashboard assumption

  - **Requirement:** The concept must not be designed around an assumed daily-use habit.
  - **Behavior:** The experience is built around a monthly performance period with detail available on demand. No daily pulse module, streak, alert or engagement mechanic is included.
  - **Dependency:** Adoption measurement once the concept is live with design partners.
  - **Constraint:** Proposed change against the brief's vision of opening the app each morning. Implentio reviews monthly, Implentio has no consistent habit, and Magic Mind delegates entirely.
  - **Acceptance:** The concept is valuable when opened once a month and does not degrade when opened less often.

### Note 210: Outbound Cost Performance supersedes the Unit Economics placeholder

  - **Requirement:** The Unit Economics coming-soon placeholder is replaced in navigation by the Outbound Cost Performance concept under a new Analytics group.
  - **Behavior:** Analytics is a distinct navigation group, separate from Reconciliation and Optimization, reflecting the three distinct customer jobs. The Unit Economics preview content remains in the prototype source so the original direction can be restored or expanded after review.
  - **Constraint:** This is a concept-stage navigation proposal, not a launch commitment. CPO, CPU and UPT from the original brief remain the intended metric family; this concept ships CPO first.
  - **Acceptance:** The change is reversible without rebuilding either experience.

### Note 211: Guided AI exploration is a secondary layer, never the entry point

  - **Requirement:** The customer must receive a useful, customer-specific performance answer before asking anything. Guided exploration extends that analysis; it does not replace it.
  - **Behavior:** The journey is ordered: Implentio identifies the change, Implentio explains it through the curated drivers and breakdown, the customer investigates through metric detail and records, and only then does the exploration layer extend the investigation. The Explore this performance change module sits beneath the curated analysis, offers suggested questions derived from the visible metric, period and drivers, and adds a free-text input for users who want to go further.
  - **Dependency:** The curated analysis must render first and independently of the exploration layer.
  - **Constraint:** Adapted from the CTO's Ask about this data concept. No blank-canvas analytics experience is created, and the page must remain fully valuable with the exploration module ignored.
  - **Acceptance:** A customer who never asks a question still leaves the screen knowing whether cost per order is on plan and what moved it.

### Note 214: Answer guardrails: facts, interpretation, and what an answer may never claim

  - **Requirement:** An answer leads with the calculated result, separates fact from interpretation, and stays inside the platform's trust model.
  - **Behavior:** Each answer states the calculated facts first, labels interpretation separately, shows the filters and population used, links to the relevant chart, segment or contributing records, gives access to the calculation and sources, and states when data is incomplete or unavailable. Answers link to an existing credit memo, Least Cost Carrier report or Product Weight Validator report when relevant instead of recreating those analyses.
  - **Dependency:** Metric lineage, source metadata, and existence checks against reconciliation and optimization outputs.
  - **Constraint:** An answer must not characterize a performance change as a billing error unless a validated reconciliation finding supports it, and must not produce an optimization recommendation that is not backed by an existing analysis.
  - **Acceptance:** No answer asserts a cause, a fault or a recommendation that the underlying data and existing reports do not support.

### Note 216: The assistant is personified as Implentio Analyst

  - **Requirement:** The exploration layer carries a recognizable Implentio identity so it reads as a trusted analyst rather than an anonymous search box.
  - **Behavior:** A small avatar mark, the working name Implentio Analyst and the supporting label Your guide to logistics cost performance appear in the module header and on each answer. The voice is knowledgeable, concise, practical and calm, states what it does not know, and never presents an interpretation as a confirmed fact.
  - **Dependency:** None for the prototype.
  - **Constraint:** Working name only. The permanent mascot, name and brand identity are future decisions, and the character treatment must never compete with the customer's financial information.
  - **Acceptance:** The personification is testable and removable without changing the analysis or the module structure.

### Note 217: Analysis scope is editable; authorization boundaries are not

  - **Requirement:** The customer chooses the conditions they want to investigate before asking, and security boundaries stay fixed.
  - **Behavior:** Customer identity and the authorized dataset are shown as fixed chips. Analysis period, comparison period, metric, warehouse, carrier, product category and the treatment of reconciliation-associated charges are editable controls. Changing a condition regenerates the suggested questions, updates the input placeholder, and realigns the metrics, chart, drivers, breakdown and records to one clearly identified population. A Reset to default view action restores the customer's configured default, and a Temporary exploration banner distinguishes an exploration from that default.
  - **Dependency:** A per-customer capability map that determines which conditions may be offered, and a defined customer-default view.
  - **Constraint:** Conditions the customer's data cannot support are not offered at all — sales channel is absent from the control set for this reason. Only one segment filter applies at a time in this concept.
  - **Acceptance:** No control can widen the customer's authorized data, and the page never displays a mix of populations.

### Note 219: The assistant is a floating layer over the page, not a section of it

  - **Requirement:** The page holds the durable analytics experience. Implentio Analyst is an optional intelligence layer floating above it, reached from a persistent launcher.
  - **Behavior:** A fixed launcher carrying the assistant avatar sits in the bottom-right corner and stays visible while the customer scrolls. Selecting it opens a contained panel anchored above the launcher that overlays the page without reflowing it, scrolls internally, and closes with the control, the launcher or the Escape key, returning focus to the launcher. Page scroll position, scope and analysis state survive opening and closing. Answers can scroll the relevant page section into view rather than navigating away.
  - **Dependency:** None beyond the page state the assistant reads.
  - **Constraint:** No separate assistant page, no full-screen chat canvas on desktop, and no analytics content moves when the panel opens. On narrow screens the panel becomes a near-full-width sheet. The intended sequence is: review the page, open the assistant, adjust the visible scope, ask, receive a grounded answer without leaving the page.
  - **Acceptance:** The analytics page reads completely with the assistant never opened, and opening it changes nothing about the page except what the customer explicitly selects.

### Note 220: Biller is the first breakdown dimension and the top of the investigation hierarchy

  - **Requirement:** The performance breakdown opens on Biller. Selecting a provider drills the same section into carrier and service within that provider, and warehouse and product category then respect the provider filter. The applied filter is shown with a single way back to all Billers, and the Implentio Analyst inherits the selected provider without changing page-level totals. The hierarchy is Biller, then carrier and service, then warehouse, then product category, then supporting orders.

### Note 222: Reporting window and focus month are two separate controls

  - **Requirement:** The dashboard distinguishes the reporting window being summarized from the focus month being investigated inside it. A reporting-period control sits with the freshness disclosures and offers monthly, last three months, year to date, last twelve months and custom, each with its own default comparison that the customer can override. Selecting a multi-month window summarizes the complete population with a weighted cost per order — total included spend divided by total eligible orders, never an average of monthly values. Selecting a month within the window makes every applicable section show that month against its prior month without discarding the window, and returning to the summary restores the complete population. Every existing section, drill-down and Analyst behaviour must work in both states.

### Note 223: One Implentio impact section replaces the narrow reconciliation block

  - **Requirement:** The dashboard carries a single cohesive Implentio impact section between What changed this period and Performance breakdown, organized as a value funnel: audited coverage, opportunity identified, action status, value verified, and modeled potential. These are never collapsed into one savings number. A product table covers parcel reconciliation, Least Cost Carrier and Product Weight Validator with coverage, opportunity, status, verified value, potential impact and a link to the authoritative product experience. A stage progression shows only the stages the data supports; downloading a report is engagement, not action. Identified and modeled opportunities never appear as performance drivers unless an implemented recommendation can be tied to an observed result.

### Note 226: Additional Analyst question inventory — future prioritization

  - **Requirement:** The customer interface shows at most ten suggested questions: five by default and five more on request, ordered as primary performance change, largest operational drivers, Implentio-identified value, verification and open opportunity, then supporting evidence and calculation traceability. The following authored questions are held out of the visible set: compare cost per order across my Billers; why does UPS Ground cost more through one Biller than another; what opportunities are still open; how is potential CPO impact calculated; which Implentio product identified the largest opportunity; why are these opportunities not combined; how much of the increase came from units per order; what changed after the June rate step; split cost per order by sales channel; compare this period with the same period last year; show performance excluding active reconciliation findings. These questions remain candidates for dynamic elevation when their subject becomes relevant to the active scope, page state, customer data, or identified driver. They should not all be displayed simultaneously.

### Note 227: The Analyst drawer opens on scope, questions, and a composer — not on filters

  - **Requirement:** The drawer's default state shows a two-to-three line analysis-scope summary with an Edit scope action, the highest-priority suggested questions, and the custom-question composer fixed at the bottom. Filter detail is progressive disclosure: three collapsible groups (time and comparison, logistics network, product and cost treatment) with one labeled dropdown per filter and only one group expanded at a time. Warehouse, carrier and service level are separate filters. Fixed customer, dataset and metric context is a compact line with an explanation, never large selectable chips. Dropdown changes create a pending scope that only takes effect on Apply, which collapses the panel, confirms the update, and regenerates the suggested questions. The assistant's period may differ from the dashboard's; when it does, the difference is stated with Match dashboard and Keep assistant scope, and the two populations are never mixed silently.

### Note 229: Reporting controls condense into one toolbar, and prototype coverage moves out of the customer interface

  - **Requirement:** The customer must reach the primary metrics and the trend almost immediately after the title and description. Reporting configuration and data-freshness detail belong behind progressive disclosure rather than in permanent vertical space.
  - **Behavior:** A single toolbar beneath the page description carries date range, display interval, comparison, filters and Create report. Each of the first four opens an anchored popover rather than a right-side drawer, because that space belongs to Implentio Analyst. The date-range popover carries the quick ranges, a custom start and end, and a Data details block with the data-through date, the refresh timestamp, the authorized dataset and the current population. Applied filters render as one compact chip row beneath the toolbar, collapsing overflow into a plus-more control. Changing any control updates the metrics, trend, annotations, monthly table, drivers, drill-downs, impact section, breakdown, reconciliation treatment, Analyst scope and report preview, while the selected reporting window, the selected focus month and the comparison period remain distinct.
  - **Dependency:** Anchored popover positioning that does not collide with the Analyst launcher, and a filter model expressible as customer-readable chips.
  - **Constraint:** Reporting-range coverage in this prototype: monthly and last three months are fully authored with illustrative data and fully interactive. Year to date, last twelve months and custom ranges are listed so the control model can be reviewed, but they are not authored and are presented as unavailable. Display interval offers monthly and full-period summary; quarterly is listed but not authored. Comparison offers previous period and same period last year; target and no comparison are listed but not authored. These coverage limits are prototype notes and must not appear as customer-facing analytics copy.
  - **Acceptance:** The page header carries only the eyebrow, title, description and the illustrative-data badge, no reporting-window card remains, and every unauthored range, interval or comparison is visibly unavailable rather than silently inert.

## BI Concept — Engineering Validation

### Note 200: Authoritative numerator, denominator and split-shipment rule

  - **Requirement:** The included-spend numerator and eligible-orders denominator must be defined, reproducible and reconcilable to invoices.
  - **Behavior:** The prototype states that an order shipping in multiple packages counts once in the denominator while all of its packages contribute to the numerator, and that cancelled or unshipped orders are excluded from both.
  - **Dependency:** Order-to-shipment-to-charge joins across parcel and fulfillment sources.
  - **Constraint:** Requires engineering validation before any figure is presented as real, including a parity test against a manually produced unit-economics analysis.
  - **Acceptance:** The model reproduces a manual analysis for the same period within an agreed tolerance.

### Note 201: Target source, ownership and revision history

  - **Requirement:** The customer-specific target must have a defined source, owner, effective date and revision history.
  - **Behavior:** The metric detail states who sets the target and on what cadence. The trend reflects the target in force in each month, including the change at the start of the plan year.
  - **Dependency:** A target store with effective dating, plus an agreed way for the customer to supply or revise a target.
  - **Constraint:** Customer-entered targets are not validated. This prototype does not include target entry or editing.
  - **Acceptance:** Historical periods are evaluated against the target that was in force at the time, never the current target.

### Note 202: Dimension coverage and unavailable states per customer

  - **Requirement:** Supported dimensions must be resolved per customer, and unavailable states must carry a specific reason.
  - **Behavior:** Sales channel is unavailable for this account because order channel is not present in the ingested outbound feeds. The reason is stated on screen rather than implied by an empty module.
  - **Dependency:** A per-customer capability map maintained as sources change, and reason strings that are safe to show a customer.
  - **Constraint:** Coverage will differ by account and by period. A dimension can become available or unavailable over time.
  - **Acceptance:** Every unavailable state names the missing input in customer-safe language.

### Note 203: Distinguishing reconciliation-associated spend from normal movement

  - **Requirement:** Analytics must be able to state how much of a period's spend is associated with an active reconciliation without recreating the finding.
  - **Behavior:** A single secondary line states the invoiced amount under active reconciliation, its share of period spend, and links to the credit memo.
  - **Dependency:** A reliable association between analytics period spend and validated reconciliation findings at charge level.
  - **Constraint:** If the association cannot be computed reliably for a period, the line must be omitted rather than estimated. It is never presented as a driver of performance change.
  - **Acceptance:** The stated amount reconciles to the linked credit memo's population for the same period.

### Note 204: Linkage to existing optimization outputs

  - **Requirement:** A cost driver may link to an existing Least Cost Carrier or Product Weight Validator report only when a validated report exists for a relevant period.
  - **Behavior:** Driver cross-links open the existing report library. Analytics does not recreate the analysis, restate its recommendations, or invent an optimization opportunity where no report exists.
  - **Dependency:** Report availability by customer, period and analysis type.
  - **Constraint:** In this prototype the LCC and PWV libraries contain sample reports for other accounts, so the cross-link demonstrates the pattern rather than a matched report.
  - **Acceptance:** No cross-link is rendered when no applicable report exists for the account.

### Note 212: Exploration is scoped, and it never silently recalculates the visible metric

  - **Requirement:** Every question is scoped to the authenticated customer, the current metric, the current period and the authorized dataset, and that scope is visible on screen.
  - **Behavior:** A Scoped to bar states customer, metric, period and dataset. When an answer narrows the population or changes the breakdown view, the resulting filters appear as persistent Analysis context chips, and the interface states that the headline metric and totals are unchanged. Contributing-record views carry the same context chip.
  - **Dependency:** Per-customer authorization on every query path, and a filter model that is expressible as customer-readable chips.
  - **Constraint:** An answer must never change the displayed metric population without showing the change. Cross-customer, cross-period and unauthorized-dataset queries must be impossible, not merely discouraged.
  - **Acceptance:** For any answer, a reviewer can state exactly which population it used and confirm the headline metric did not move.

### Note 221: A biller breakdown requires reliable per-order provider attribution

  - **Requirement:** The provider breakdown is offered only when every included order or shipment can be attributed to a biller from the source data. Where attribution is incomplete the section shows Unavailable — Biller attribution and states that Implentio cannot provide a reliable provider-level breakdown. A provider must never be inferred from carrier, warehouse, service or any other indirect field. Provider rows must reconcile to the same period order population and outbound spend as the rest of the page.

### Note 224: Identified, verified and modeled value must never be conflated or double counted

  - **Requirement:** Opportunities are only totaled when they cover the same period, use a compatible measurement basis, do not overlap and can be reproduced; otherwise they are shown separately with the reason stated. Verified value counts only credits matched to an Implentio-audited invoice or finding and savings observed after a confirmed implementation. An unknown outcome shows a pending state, never a zero. Modeled potential is eligible open opportunity divided by eligible orders for the same window, with overlapping findings removed and the values shown. The section must distinguish opportunity associated with activity in the period from value verified during the period, and must not present the two as a conversion rate.

### Note 225: A finding keeps its originating period while its financial impact progresses

  - **Requirement:** Every Implentio finding is attributed to the period of the audited activity it came from. Acceptance, receipt, correction and ongoing avoided cost are lifecycle events on that same finding and must never create additional identified value or a duplicate row in a later month. Accepted is never treated as received: accepted awaiting receipt equals accepted minus received and matched, and open decision value equals identified minus accepted minus adjusted or rejected. Verified value to date equals credits received and matched plus avoided cost observed after the correction effective date; forward run-rate is a projection and is excluded. Historical credit and observed avoided cost must never cover the same charges. Live views show the latest status with a status-as-of date; exported reports remain snapshots.

### Note 228: Every impact value traces to an authoritative product record

  - **Requirement:** The analytics dashboard is an executive rollup. The applicable Parcel Credit Memo, Least Cost Carrier analysis or Product Weight Validator finding remains the authoritative evidence source for every value the dashboard or QBR reports.
  - **Behavior:** Opening a finding's impact timeline exposes the underlying record: finding identifier, originating activity period, identification date, affected invoices, shipments, orders or products, the historical calculation, the accepted amount and its evidence, the received-credit match, the correction effective date, the subsequent validation, the observed avoided-cost calculation, the forward projection assumptions, the calculation version and the last refreshed date. A direct link opens the product record itself.
  - **Dependency:** Each product must expose a stable finding identifier, a versioned calculation and a refresh timestamp that the analytics layer can read rather than recompute.
  - **Constraint:** The analytics layer must never restate a value the product record cannot support, and a value shown here must carry the same identifier, dates, amounts and evidence the product record carries.
  - **Acceptance:** For any figure in the impact section or the QBR, a reviewer can reach the originating product record and confirm the identifier, calculation version and refresh date behind it.

### Note 260: Benchmark partnership, coverage and refresh cadence require validation

  - **Requirement:** The external benchmark-data partner, its brand coverage, normalization methodology and refresh cadence are not yet confirmed.
  - **Behavior:** The Benchmarks tab carries a Concept preview badge and a footer disclosure on every load. No partner name is shown until the partnership is approved for customer-facing disclosure.
  - **Dependency:** A signed benchmark-data partner agreement and validated data-sharing pipeline.
  - **Constraint:** All cohort sizes, medians and quartiles shown are illustrative and must reconcile with a real partner feed before launch.
  - **Acceptance:** No benchmark value ships to a real customer until partner coverage and normalization are validated.

### Note 261: Minimum cohort size for anonymity is not yet set

  - **Requirement:** A cohort must not be displayed if it is too small to preserve anonymity among contributing brands.
  - **Behavior:** Cohorts below the minimum threshold show 'Benchmark unavailable because the eligible cohort does not meet the minimum privacy threshold' instead of a result.
  - **Dependency:** A minimum-n policy documented and validated with the benchmark partner.
  - **Constraint:** The illustrative threshold used in this concept has not been confirmed by the partner or by legal/privacy review.
  - **Acceptance:** The minimum-n threshold is documented and enforced before any cohort ships to customers.

## Future Build Potential / Not App 2.5 Functional Scope

### Note 37: Future module: Unit Economics

  - **Requirement:** Combine fulfillment, parcel, order, and unit data to calculate normalized logistics COGS metrics such as CPO, CPU, UPT, carrier spend, fulfillment spend, and spend by fee type.
  - **Behavior:** App 2.5 displays a static Coming Soon page explaining the future module and its planned metrics. No customer metric calculations, customer data, dashboards, filters, time-period selection, carrier comparisons, drill-down, benchmarking, recommendations, downloadable reports, or AI explanations are included.
  - **Dependency:** Future data dependencies: orders shipped, units shipped, fulfillment invoices, parcel invoices, carrier mapping, fee taxonomy, order-to-invoice relationships, product and SKU data, and reliable reporting periods.
  - **Constraint:** The page positions Unit Economics as future potential; the metrics table describes future capability and is not a commitment to calculate these metrics in App 2.5.
  - **Acceptance:** Engineering implements only the static Coming Soon page for the current prototype; no metric is computed or shown from customer data.

### Note 38: Future module: Product Weight Validator

  - **Requirement:** Compare product, shipment, packaging, and carrier billing data to identify potential billed-weight differences and cost-saving opportunities. Questions the module will answer include: How much spend is exposed to billed-weight differences? Which products, SKUs, bundles, or package compositions drive a disproportionate share? Which weight pairs (expected vs. billed), weight bands, carriers, or services show recurring patterns versus isolated outliers? Which warehouses, Billers, box selections, or DIM configurations are involved? Where should the customer focus first?
  - **Behavior:** App 2.5 displays a static, single-page Coming Soon preview: a compact hero, a Quantify → Concentrate → Act value strip, four output-summary cards (Financial Impact; Product Concentration; Weight and Carrier Patterns; Fulfillment and Packaging Drivers), an outcome statement, and one Coming Soon boundary line. No product-level analysis, customer data, weight comparisons, packaging or box recommendations, carrier billing findings, savings estimates, file upload, carrier disputes, customer alerts, or downloadable reports are included. Future analytical outputs (detail): financial impact / exposure with affected packages and impact per package; product concentration by category, SKU, bundle, and package composition; weight and carrier patterns across weight pairs, weight bands, carrier, service, and outliers; fulfillment and packaging drivers by warehouse, Biller, box selection, and DIM configuration.
  - **Dependency:** Future data dependencies: product master, SKU weights, product dimensions, bundle definitions, order contents, shipment records, package dimensions, actual package weight, carrier billed weight, dimensional-weight divisor and rules, carrier service level, warehouse or Biller, and carrier billing adjustments. Calculation methodology (future): expected vs. billed weight comparison per shipment; dimensional-weight computation using the carrier divisor; multi-product allocation of shipment-level weight and cost back to constituent SKUs/bundles; aggregation into exposure, affected-package counts, and impact-per-package; pattern detection to separate recurring drivers from isolated exceptions.
  - **Constraint:** The page uses neutral language and must not imply that Implentio has already analyzed the customer's products, packaging, or billed weight, or that any carrier or Biller is overcharging the customer. Explicitly excluded from App 2.5: real analysis, customer data, weight/packaging/box recommendations, savings calculations or amounts, file upload, carrier disputes, customer alerts, and downloadable reports. Language guardrail: describe differences and exposure, not confirmed overcharges, until analysis supports that conclusion.
  - **Acceptance:** Engineering implements only the static Coming Soon page; no weight, packaging, or savings analysis is performed or shown, and no example amounts appear.

### Note 162: Filter state should survive navigation and support shareable URLs

  - **Requirement:** Applied filters persist while the user works within an experience, and should later be expressible as URL query state.
  - **Behavior:** Filters remain applied when the user opens and returns from a detail view within the same experience. A future release should encode applied filters in the URL so a filtered view can be shared or bookmarked.
  - **Dependency:** Filter state store, with a future URL-query serializer.
  - **Constraint:** Filter state must not silently reset on unrelated interactions.
  - **Acceptance:** Returning to a list from a detail view shows the same filtered population.

### Note 179: Future: invoice contribution to a credit memo version

  - **Requirement:** A future version may show the complete net variance and package count an invoice contributed to a specific credit memo version.
  - **Behavior:** The contribution is displayed on the expanded invoice detail only when the backend relationship reconciles exactly to the published memo version. It is not shown in App 2.5.
  - **Dependency:** An invoice-to-credit-memo-version relationship with reconciled variance and package totals.
  - **Constraint:** Contribution amounts must never be derived in the frontend and must never be presented as an invoice-level finding or calculation. Findings, calculations and package evidence stay within the associated credit memo.
  - **Acceptance:** A displayed contribution equals the published memo version totals for that invoice, or nothing is displayed.

### Note 180: Future: source invoice provenance

  - **Requirement:** A future version may show and open the original source invoice from the expanded invoice detail.
  - **Behavior:** Provenance is presented with a customer-safe source name. App 2.5 shows no source reference, and the internal working filename was removed from the customer experience.
  - **Dependency:** A customer-safe display name for each stored source asset, separate from the internal filename.
  - **Constraint:** Internal working filenames, storage paths and pipeline identifiers must never be shown to a customer.
  - **Acceptance:** No internal filename appears anywhere in the invoice experience.

### Note 181: Future: original invoice download

  - **Requirement:** A future version may allow customers to download the original invoice.
  - **Behavior:** The action appears only once the customer-safe source asset exists, brand-level authorization is enforced, and download tracking is in place. App 2.5 exposes no original-invoice download.
  - **Dependency:** Stored source asset, brand-level authorization, and download-event tracking.
  - **Constraint:** No partial or unauthorized source download may be offered, and the action must not appear before all three conditions are met.
  - **Acceptance:** The download action is absent unless asset, authorization and tracking are all available.

### Note 182: Future: ingestion and review populations must be meaningfully different before both are shown

  - **Requirement:** Packages Ingested is not shown alongside Packages Reviewed unless the two represent meaningfully different populations.
  - **Behavior:** App 2.5 shows Packages Reviewed only, because every ingested parcel package in scope is reviewed. If the populations diverge later, the experience must define received, eligible, reviewed, excluded and included package counts explicitly.
  - **Dependency:** Per-invoice package counts by lifecycle state, with a documented definition for each state.
  - **Constraint:** Two package counts must never be shown without a stated definition of how they differ.
  - **Acceptance:** Only one package count is shown unless every displayed count carries a defined population.

### Note 242: Future: connected sending, delivery status and reply handling

  - **Requirement:** Gmail and Outlook OAuth, sending on behalf of the user, delivery status, replies, follow-ups, approval outcomes and realized-credit matching are future capabilities.
  - **Behavior:** None in this release. The manual-send foundation is the shipping behavior.
  - **Dependency:** Mailbox provider integration and a dispute lifecycle model.
  - **Constraint:** Nothing in this release may present these capabilities as available.
  - **Acceptance:** Deferred.

### Note 243: Future: an immutable send record for connected sending

  - **Requirement:** Connected sending must create an immutable send record containing the sender, recipients, credit memo version, evidence asset, message, provider message ID, timestamp and delivery status.
  - **Behavior:** None in this release.
  - **Dependency:** Mailbox provider integration.
  - **Constraint:** The record must be immutable and reconcilable against the version snapshot that was sent.
  - **Acceptance:** Deferred.

### Note 244: Future: sending must be idempotent and authorization enforced

  - **Requirement:** Future email sending must be idempotent and must enforce customer-account authorization on every send.
  - **Behavior:** None in this release.
  - **Dependency:** Mailbox provider integration and account authorization service.
  - **Constraint:** A retried send must not produce a duplicate message or a duplicate send record.
  - **Acceptance:** Deferred.

### Note 252: Future: customer-defined cost-per-order targets

  - **Requirement:** Customers could eventually configure their own cost-per-order target so the trend chart can compare actual performance against it, instead of only against the self-calculated YTD average.
  - **Behavior:** A target could be captured through customer onboarding, an analytics settings page, or an annual planning update, and could be scoped by year, business unit, Biller, or warehouse. Each target must carry an effective date so historical charts always compare against the target that was actually in effect for that period. Once a target exists, the disabled Target option on the comparison control becomes selectable.
  - **Dependency:** A settings surface for entering and versioning targets; a resolver that picks the effective target for a given period.
  - **Constraint:** Implentio must never infer or fabricate a target on the customer's behalf. Without a configured target, the comparison option stays disabled and the chart never shows an unavailable or empty benchmark line.
  - **Acceptance:** This is illustrative and out of scope for the current prototype. The cost per order trend remains complete and useful using Actual, YTD average and Prior year alone.

### Note 262: Future: rate-tier and contract-threshold insight

  - **Requirement:** Comparing a customer's current and projected volume against their own contracted rate tiers requires customer-specific contract thresholds and qualifying-shipment definitions that benchmark data alone cannot supply.
  - **Behavior:** Benchmarks does not show an 'outgrown your rate tier' recommendation. When contract thresholds and qualifying shipment rules are available, Implentio may compare current and projected volume with the customer's applicable rate tiers.
  - **Dependency:** Customer contract terms and rate-card thresholds.
  - **Constraint:** Never project negotiation savings from benchmark data alone.
  - **Acceptance:** No rate-tier recommendation appears until contract data is available.

## Prototype Data Contract

### Note 26: Human-review population is proxied for this demo

  - **Requirement:** Customer-facing findings must be human-reviewed. This demo uses a completed customer workbook prepared by John.
  - **Behavior:** For this source-backed demonstration, records in the completed customer workbook are treated as the human-reviewed report population. Findings are shown with a Human Reviewed indicator on that basis.
  - **Dependency:** The completed customer workbook (Parcel May – June 2026 Credit Request.xlsx).
  - **Constraint:** Production App 2.5 must use an explicit reviewer, decision, and review timestamp from the internal review workflow. The workbook does not itself contain review metadata.
  - **Acceptance:** The demo does not claim the workbook contains review metadata; production requires explicit review fields.

### Note 28: Golden-path demo data and source reconciliation

  - **Requirement:** This credit memo is the single source-backed demonstration of the App 2.5 workflow. Every screen is populated from one normalized representation of the attached customer workbook.
  - **Behavior:** A reviewer can trace a real record from Credit Tracker to Credit Memo to Invoice to Order or Shipment, then locate the same record in the downloaded Excel workbook. Screens do not independently calculate or hard-code totals — they read one shared dataset.
  - **Dependency:** Parcel May – June 2026 Credit Request.xlsx, parsed once into window.CM_DATA.
  - **Constraint:** Production should use one versioned credit memo dataset or API contract. Inclusion in this completed workbook is a prototype proxy for the human-reviewed report population.
  - **Acceptance:** Credit Tracker, Summary, Invoices, findings, report preview, and the downloaded workbook all reconcile to the same numbers.

### Note 89: Carrier and charge-category amounts are derived for this demo

  - **Requirement:** Carrier-specific charge-category amounts must come from reconciled package-level charge components in production.
  - **Behavior:** The source workbook provides charge-category variance at the invoice level and carrier at the package level. For this demonstration, each invoice's category variance is allocated across its contributing packages in proportion to each package's share of that invoice's variance, then grouped by carrier. Totals reconcile at package, invoice, and finding level.
  - **Dependency:** Charge-level invoiced and expected amounts per package, per carrier, in the production dataset.
  - **Constraint:** Production must not derive carrier or category amounts by allocation; it must read reconciled charge components directly.
  - **Acceptance:** The demo states the allocation openly, and production replaces it with sourced charge-level values without changing the customer workflow.

### Note 96: Complete invoice totals and ingested package counts are demo-derived

  - **Requirement:** The source workbook backing this prototype carries only the charges and packages that contribute to identified variance, so it cannot supply a complete invoice total or a complete ingested package count. Those two columns are deterministically derived from each invoice's affected-package figures for demonstration only.
  - **Behavior:** The invoice index shows the derived complete amount and package count, and the drawer shows the credit memo contribution separately so the two scopes are visible side by side. The four rows marked as demo placeholders carry authored values.
  - **Dependency:** Production must supply the complete ingested invoice total and complete package count per invoice from the ingestion record, independent of the audit result.
  - **Constraint:** Derived values must never be presented as reconciled source data, and the complete invoice total must always be greater than or equal to the credit memo contribution for the same invoice.
  - **Acceptance:** Once ingestion supplies real totals, the derivation is removed and the invoice index reconciles to the source invoice rather than to the credit memo.

### Note 126: Product Weight Validator demo metrics come from the supplied analysis

  - **Requirement:** The June 2026 Product Weight Validation Analysis card uses the metrics provided with the supplied PWV output: $1,230.02 potential weight-related overbilling, 1,509 packages with identified overbilling, 7,374 total packages analyzed and $76,687.30 total billed.
  - **Behavior:** The prototype card displays these values, and its Download Complete Evidence Package action returns the supplied June 2026 analysis files.
  - **Dependency:** The delivered PWV summary PDF and actionable evidence workbook, attached to this prototype.
  - **Constraint:** These values must be re-validated against the delivered files before any customer-facing use.
  - **Acceptance:** Card metrics equal the published analysis totals.

### Note 248: Fulfillment metrics are illustrative, and average overbilling is backend-provided

  - **Requirement:** The metrics shown on the fulfillment card are clearly labelled illustrative demo values and must not imply a real customer report.
  - **Behavior:** Total orders, total billed, dollar amount overbilled, number of orders overbilled and average overbilling are displayed. Dollar amount overbilled carries the strongest financial emphasis; the remaining metrics stay visually secondary.
  - **Dependency:** Published report metadata.
  - **Constraint:** Average overbilling must use the backend-provided value until the business calculation and the eligible population are formally defined. The interface must not infer a formula.
  - **Acceptance:** No metric on the card is derived in the client, and the demo labelling is visible on every card.

### Note 351: Open dependency: invoice-based expiration requires backend definition

  - **Requirement:** A credit memo can contain invoices with different invoice dates and therefore different contractual dispute deadlines; whether eligibility is tracked at the invoice or package level and rolled up to each variance group, or whether one deadline applies to the whole credit memo, is not decided in this prototype.
  - **Behavior:** This prototype uses one illustrative, backend-provided dispute deadline per variance group, clearly demo data. The frontend never calculates a contractual dispute deadline independently — it is always received or computed by the backend.
  - **Dependency:** Backend definition of invoice/package-level versus memo-level eligibility rollup.
  - **Constraint:** Do not invent this calculation in the frontend; do not treat the illustrative per-group deadlines shown here as validated.
  - **Acceptance:** Before launch, Engineering confirms whether deadlines roll up from invoice/package level or apply once per credit memo, and the frontend consumes whichever the backend provides.

## BI Concept — From Jason's Brief

### Note 183: Narrative over numbers: every metric carries an explanation

  - **Requirement:** A metric is unfinished work without a why. Cost per order must be presented together with what moved it.
  - **Behavior:** The overview leads with actual against target and a structured What changed section; the metric detail carries the calculation, inputs and contributing records.
  - **Dependency:** Period-over-period metric values plus an attributable driver decomposition.
  - **Constraint:** Carried forward unchanged from the BI/Analytics Product Brief, section 2. The explanation is structured, not AI-generated (see note 194).
  - **Acceptance:** No cost-performance number is displayed without an adjacent explanation path.

### Note 184: Month-over-month and year-over-year are first-class

  - **Requirement:** Period comparisons must be present by default, never a second analysis the customer has to request.
  - **Behavior:** The overview shows change from prior month and change from the same period last year alongside the current actual, and the metric detail repeats both.
  - **Dependency:** Historical metric values at monthly grain for at least 13 months.
  - **Constraint:** Carried forward from the brief, sections 6.2 and 8. Month is the primary grain.
  - **Acceptance:** Both comparisons are visible on first load without any interaction.

### Note 185: The trend carries period annotations

  - **Requirement:** Trend lines must be annotated with the events that explain shape — rate-card changes, node changes, peak season, plan changes.
  - **Behavior:** The 13-month trend marks annotated months and lists each annotation below the chart. Selecting a month reads out actual, target and difference.
  - **Dependency:** An annotation record per event with a date, type and short customer-safe description.
  - **Constraint:** Carried forward from the brief, section 6.2. Annotations must be sourced, not inferred.
  - **Acceptance:** Every annotation shown maps to a recorded event, and unannotated months show no marker.

### Note 186: Any number reaches its contributing records

  - **Requirement:** A customer must be able to move from a summary figure to the records behind it without asking an analyst.
  - **Behavior:** The metric detail offers View contributing records and Export metric detail. The record view states the full population and the sample size shown.
  - **Dependency:** Order-level and charge-level records joined to the metric period and included-cost definition.
  - **Constraint:** Carried forward from the brief, sections 6.3 and 6.5. In this prototype only a sample of records is rendered.
  - **Acceptance:** Contributing records are reachable in one interaction from the metric value.

### Note 187: Source, period and freshness appear on every module

  - **Requirement:** Every displayed number answers what it is pulling from and how current it is.
  - **Behavior:** The overview header and the metric detail both state data-through date, last refresh and completeness. The metric detail lists each contributing source system.
  - **Dependency:** Per-source ingestion timestamps, period coverage and a completeness evaluation per period.
  - **Constraint:** Carried forward from the brief, sections 8 and 9.
  - **Acceptance:** No cost-performance screen renders without a data-through date, a refresh time and a completeness statement.

### Note 188: Views degrade gracefully when a dimension is absent

  - **Requirement:** Where a customer's data cannot support a dimension or a metric, the interface states that it is unavailable rather than estimating it.
  - **Behavior:** Sales channel is shown as an unavailable dimension for this account, and outbound cost as a percentage of revenue is shown as unavailable because revenue is not connected.
  - **Dependency:** A per-customer capability map of supported dimensions and metrics.
  - **Constraint:** Carried forward from the brief, sections 8 and 9, and reinforced by the Misen and Magic Mind interviews.
  - **Acceptance:** No unsupported dimension is populated with estimated, blended or placeholder values.

## BI Concept — Test With Customers

### Note 205: Is actual against target the right opening frame?

  - **Requirement:** Test whether opening on actual versus the customer's target is more decision-useful than a set of KPI cards.
  - **Behavior:** Observe whether the customer can state, unprompted, whether performance is on plan and what needs attention.
  - **Dependency:** A customer who maintains a target or plan figure.
  - **Constraint:** Implentio does not currently hold a target; Implentio does. Both reactions are informative.
  - **Acceptance:** The customer reaches a plan judgement before scrolling.

### Note 206: Which cost driver leads to a decision?

  - **Requirement:** Test which of the six drivers a customer would actually investigate or act on.
  - **Behavior:** Ask the customer to choose a driver and describe the next step they would take and who would take it.
  - **Constraint:** A driver that produces interest but no action is not yet product value.
  - **Acceptance:** At least one driver produces a concrete, named next action.

### Note 207: Do customers distinguish performance change from billing variance?

  - **Requirement:** Test whether the customer understands that cost per order can worsen while every bill is correct.
  - **Behavior:** Ask the customer when they would open Analytics versus Credit Memos, and what the reconciliation context line means to them.
  - **Constraint:** Confusion here is the main risk to the product distinction and would require a copy or structure change.
  - **Acceptance:** The customer can state the difference in their own words.

### Note 208: Is metric lineage sufficient to trust the number?

  - **Requirement:** Test whether the calculation, included and excluded definitions, source list and contributing records are enough for a customer to defend the number internally.
  - **Behavior:** Ask the customer to explain the metric back and to say what would still be missing before they would circulate it.
  - **Constraint:** Misen set the standard: formula, transformation, assumptions and supporting records.
  - **Acceptance:** The customer can restate the definition and identify what they would still verify.

### Note 209: Who uses this, how often, and what brings them back?

  - **Requirement:** Test the cadence and role assumptions rather than assuming a daily dashboard.
  - **Behavior:** Ask who in the organization would open this, at what point in their month, and what would prompt an unscheduled visit.
  - **Constraint:** Delegated-service accounts may never open it; that is a valid finding, not a failure of the concept.
  - **Acceptance:** A cadence and an owner are named for each interviewed account.

### Note 215: Do customers ask a question after reading the curated answer?

  - **Requirement:** Test whether exploration is used, and what customers ask once the curated analysis has already answered the obvious question.
  - **Behavior:** Observe whether the customer reaches for the exploration module unprompted, which suggested question they choose first, and whether they type a question of their own.
  - **Constraint:** Heavy use of the free-text input may indicate the curated analysis is incomplete rather than that the exploration layer is succeeding.
  - **Acceptance:** Each session records whether exploration was used, the first question asked, and whether the answer changed what the customer would do next.

## Deferred to 3.0

### Note 10: A report download does not mean a claim was submitted

  - **Requirement:** Downloading the report is not a claim submission.
  - **Behavior:** Downloads produce the artifact and a history entry only; no claim is filed with the biller.
  - **Dependency:** None beyond the generated artifact.
  - **Constraint:** Claim submission and lifecycle are out of scope for App 2.5.
  - **Acceptance:** No download action triggers any biller claim.

### Note 11: Detailed calculation UI is deferred to App 3.0

  - **Requirement:** Detailed transportation, large-package, and peak-season calculations are not rebuilt in-app for 2.5.
  - **Behavior:** Findings show a plain-language summary and direct users to the exported report for calculation detail.
  - **Dependency:** Exported report.
  - **Constraint:** In-app calculation reconstruction is deferred to App 3.0.
  - **Acceptance:** No finding exposes line-level rate math inside App 2.5 beyond the scannable invoice detail.

### Note 19: A notification system needs to be established for audit progress

  - **Requirement:** Customers should be actively notified when a credit memo begins auditing and when it completes, rather than discovering status by revisiting the page.
  - **Behavior:** For App 3.0, establish a notification system (for example, in-app and email alerts) that tells the customer when an audit starts, progresses, and is ready for review. For App 2.5 the audit-in-progress state is a passive status display only.
  - **Dependency:** A notification/eventing service, customer notification preferences, and audit-lifecycle events from the internal review system.
  - **Constraint:** No automated customer notifications are sent in App 2.5; audit progress is shown on-screen only.
  - **Acceptance:** App 2.5 displays audit-in-progress status without sending alerts; the notification system is scoped and built in App 3.0.

### Note 20: Report status must connect to the App 3.0 notification system

  - **Requirement:** Report lifecycle states shown on the Credit Tracker — including Generating and Ready — must reach the customer through a notification system rather than only appearing on the page.
  - **Behavior:** For App 3.0, connect report-status transitions to the notification system so customers are proactively told what the platform is working on (a report is generating) and when a report is ready to preview and download. In App 2.5 these statuses are displayed passively on the Credit Tracker and within each credit memo.
  - **Dependency:** A notification/eventing service, customer notification preferences, and report-lifecycle events per credit memo and report version.
  - **Constraint:** App 2.5 does not send report-status notifications; Generating and Ready are on-screen indicators only.
  - **Acceptance:** App 2.5 shows report status without alerts; App 3.0 delivers a notification when a report starts generating and when it becomes ready.

### Note 32: Credits realized is shown only on a reliable matched signal

  - **Requirement:** The executive summary shows Credits realized only when Implentio can reliably match an ingested Biller credit to its related credit request or finding.
  - **Behavior:** The summary presents a financial progression from value identified toward value recovered: potential overcharges identified, credit memos ready, reports downloaded, and credits realized when available.
  - **Dependency:** An ingested Biller-credit signal reliably matched to a credit request or finding.
  - **Constraint:** When realized-credit data is unavailable, the metric is omitted or shown in an unavailable state. It is never displayed as $0.
  - **Acceptance:** Credits realized never shows a fabricated or zero value in the absence of a matched credit.

### Note 76: Calculation lineage: expose available source-backed values now, deeper traceability later

  - **Requirement:** App 2.5 should expose the most granular source-backed values currently available — shipment facts, invoiced charges, expected charges, charge-level variances, and supporting documents — without representing complete calculation lineage as available.
  - **Behavior:** Complete traceability should eventually identify the exact rate-card version, effective date, table row or rate cell, discount, minimum charge, surcharge rule, formula, intermediate calculation, assumption, and override used. App 2.5 does not claim this lineage; it preserves the identifiers and data relationships needed to add it later without redesigning the customer workflow.
  - **Dependency:** Confirmation from engineering that rate-cell, discount, surcharge-rule, formula, and source-lineage data is captured and reliably connected to each record.
  - **Constraint:** Deeper lineage must not be presented as available in App 2.5 unless engineering confirms the required data exists.
  - **Acceptance:** No screen implies rate-cell or formula-level lineage exists in App 2.5, while identifiers needed for future lineage are preserved.

## BI Concept — Illustrative Only

### Note 198: All Analytics figures are illustrative, not a validated customer dataset

  - **Requirement:** Every number in the Outbound Cost Performance concept is illustrative and must not be read as production output.
  - **Behavior:** The experience carries a visible Illustrative customer data marker. Values are internally consistent — spend divided by orders equals the displayed cost per order, and each breakdown sums to the period totals — but they are authored for the concept.
  - **Dependency:** None. The dataset is defined in the prototype, not derived from a source system.
  - **Constraint:** The Analytics figures are unrelated to the parcel reconciliation dataset that powers Credit Tracker, Invoices and the credit memo.
  - **Acceptance:** No reviewer can mistake the Analytics figures for technically validated customer data.

### Note 199: Driver contributions are an authored decomposition

  - **Requirement:** The estimated contribution of each cost driver is authored for the concept and sums exactly to the period-over-period change.
  - **Behavior:** Six drivers account for the full change from the prior month. In production, attribution will not necessarily be complete and an unattributed residual will need a defined treatment.
  - **Dependency:** A production decomposition method, an accuracy tolerance and a residual display rule.
  - **Constraint:** The clean sum shown here is a property of the illustrative data, not a claim about production behavior.
  - **Acceptance:** Engineering treats residual handling as an open design question before this ships.

### Note 213: The exploration layer is a scripted concept, not a working AI system

  - **Requirement:** The interaction demonstrates the intended AI-native direction without implying that any production behavior has been validated.
  - **Behavior:** The prototype answers a fixed set of questions and matches free text to the nearest one. Anything outside that set returns an honest response saying so. No model is called and no dataset is queried.
  - **Dependency:** Production would require a validated query layer, an accuracy standard, a latency and cost budget, and a defined behavior for questions the system cannot answer.
  - **Constraint:** Production AI feasibility, answer accuracy, latency, cost and full-dataset query behavior are all unvalidated. The module is labeled Concept preview for this reason.
  - **Acceptance:** No reviewer concludes that a working natural-language analytics capability exists today.

### Note 218: July 2026 is a second illustrative period, including a partial-data state

  - **Requirement:** A second period exists so scope changes can be tested end to end, and it deliberately carries an incomplete-data state.
  - **Behavior:** July 2026 shows cost per order of $11.55 against the same $11.20 target, a $0.51 improvement from June, five drivers that sum to that change, and a partial-completeness state because two Flowspace invoices for the final week are outstanding. No parcel reconciliation is active for July, so the reconciliation context shows an honest empty state rather than a figure.
  - **Dependency:** None. Both periods are authored for the concept.
  - **Constraint:** July values are illustrative and internally consistent with June: breakdowns sum to the period totals and driver contributions sum to the period-over-period change. They are not a forecast and not production output.
  - **Acceptance:** Switching periods changes every dependent value on the page, and the partial state is visible before any number is read.

## Existing

### Note 7: Excel remains the complete investigation artifact

  - **Requirement:** The Excel workbook is the source of detailed calculations for the memo.
  - **Behavior:** Download Credit Memo on a Parcel Credit Tracker card and Download Excel inside the credit memo both return the full workbook (Summary, Raw Data Pivot Table, carrier tabs, No Rate Card); the app links to it for calculation detail rather than recreating it.
  - **Dependency:** Generated Excel workbook for the current memo version.
  - **Constraint:** App 2.5 does not rebuild the workbook as an editable in-app experience.
  - **Acceptance:** Detailed line-item math is available in full only via the Excel download.

### Note 12: Toolbelt remains the internal review system for App 2.5

  - **Requirement:** The internal accept/reject and review workflow stays in Toolbelt.
  - **Behavior:** The credit memo surfaces approved results only; internal review continues in Toolbelt.
  - **Dependency:** Toolbelt approved-finding output.
  - **Constraint:** App 2.5 does not replace Toolbelt or expose internal review controls.
  - **Acceptance:** No internal review action is possible from the customer app.

## Future Build Potential / Not App 2.5 Prototype Scope

### Note 49: LCC: internal report publishing process

  - **Requirement:** Product and Engineering must define the minimum internal process by which an authorized team member makes a completed PDF and Excel report available to the correct customer.
  - **Behavior:** The App 2.5 prototype does not design a full internal report-management system, but a safe operational publishing path must be identified.
  - **Dependency:** An authorized internal publisher role and a customer/period association step.
  - **Constraint:** Publishing is manual/internal for App 2.5; it is not a customer-facing capability.
  - **Acceptance:** A completed report can be safely associated with the correct customer and period before it becomes visible.

### Note 50: LCC: future app-native experience required

  - **Requirement:** Least Cost Carrier requires dedicated product discovery and design after the parcel credit reconciliation foundation is delivered.
  - **Behavior:** A future analytical hierarchy should help customers move from how packages were sent → what comparable carrier options were available → where a lower-cost option was identified → how much potential savings is concentrated there → which routing rule or Biller decision to review → whether the routing change produced realized savings.
  - **Dependency:** Automated repricing, carrier/service-level equivalence rules, rate-card selection and effective dates, surcharge-aware comparisons, and recurring analysis periods.
  - **Constraint:** None of this is built or implied in App 2.5.
  - **Acceptance:** The future scope is documented only as a Product Note, with no active controls in App 2.5.

## Prototype UX Requirement

### Note 39: Coming Soon page density and scope boundary

  - **Requirement:** The Product Weight Validator Coming Soon experience must fit within one desktop page, with at least 90% of customer-facing content visible above the fold at approximately 1440 × 900.
  - **Behavior:** Customers should understand the module's value, future analytical outputs, and intended action path without scrolling through a long product-requirements document. The customer-facing page carries only the hero, the Quantify → Concentrate → Act strip, four output cards, the outcome statement, and one Coming Soon boundary line.
  - **Dependency:** The detailed questions list, analytical-output detail, data dependencies, calculation methodology, multi-product allocation requirements, exclusions, language guardrails, and the from-insight-to-action mapping live in Product Notes (see note 38), not on the customer-facing page.
  - **Constraint:** Use concise cards and a horizontal Quantify → Concentrate → Act flow. No customer-facing section contains more than two short sentences; no output card contains more than one line of labels and one value statement; density is not achieved by shrinking typography; and no duplicated Coming Soon message appears.
  - **Acceptance:** Hero, three-stage value strip, four output cards, outcome statement, and Coming Soon boundary are visible in one standard desktop viewport (~1440×900); body text remains readable; and the detailed future requirements remain available through Product Notes.

### Note 148: Section initials in the rail are visual group labels only

  - **Requirement:** The collapsed rail shows the first letter of each section header above that section's icons: I, R, O, R.
  - **Behavior:** Initials are decorative separators, are marked aria-hidden, receive no hover or focus treatment and are not tab stops.
  - **Dependency:** Section grouping already defined by the expanded navigation.
  - **Constraint:** Initials must never be clickable and must not imply a destination.
  - **Acceptance:** Keyboard navigation moves between destination icons only, skipping initials.

## Deferred to future

### Note 48: LCC: retrieval does not equal savings realization

  - **Requirement:** A download confirms retrieval only.
  - **Behavior:** The page uses potential LCC savings and potential routing opportunity language; it never states guaranteed savings, confirmed refunds, credits owed, or carrier/Biller error.
  - **Dependency:** None beyond the published report.
  - **Constraint:** A download does not confirm the customer reviewed the analysis, that the report was submitted to a biller, that routing logic changed, that a refund was requested, or that potential savings were realized.
  - **Acceptance:** No copy or event implies realized savings from a download.

## Future-state source access — not required to change the current finding-card layout

### Note 115: Evidence Used source model, permissions and future in-app source viewing

  - **Requirement:** Evidence Used is associated with a specific variance finding and a specific credit memo version, and a finding may reference multiple evidence sources. Supported source types include the customer rate card, rate-card amendments, customer contract terms, carrier-published rate or surcharge sources, carrier ZIP-code lists, original invoices or invoice records, and any other document used in the calculation. Every source carries a customer-facing display name, source type, effective period, version and carrier where applicable, plus a record of how it was used in the finding calculation. Internal filenames, storage paths, Toolbelt labels and system identifiers are never exposed.
  - **Behavior:** Selecting View evidence used opens one compact modal, drawer or inline panel listing the sources for that finding rather than adding several document buttons to the card. Each source shows its customer-facing name, type, carrier, effective period, version, how it was used, and a View source action when a customer-safe asset exists and the user is authorized. Package-level evidence references the exact source or sources used for that package's expected calculation; finding-level Evidence Used presents the combined unique source set across every package in the finding. Carrier-published, customer-contract and invoice sources are distinguished so the list never implies every source was customer-provided.
  - **Dependency:** Source-document storage with type, version and effective-period metadata; a customer-safe asset pipeline (original upload, Toolbelt-produced copy, or platform-rendered preview); and the brand and role permission model.
  - **Constraint:** The evidence shown must match the source version used to calculate the published finding, and updating a rate card or source document must never silently change evidence attached to a previously published version. Product must decide per source type whether the customer can access the original upload, a customer-safe copy, a rendered preview, or metadata only. Brand-level and role-based permissions are enforced for contracts, rate cards and invoices; a user must never reach another brand's evidence, and original invoices are limited to users authorized for that brand's invoice data. Customer-safe copies exclude internal annotations, review decisions and system-only metadata. No upload, edit or replace-document functionality appears in the customer-facing source experience. View source, not Download, is the default action; opening a source preserves the customer's place in the credit memo.
  - **Acceptance:** When a source is unavailable, its name and effective period still display with no active action and no broken link. Source views are tracked for audit and adoption. The platform eventually supports viewing these sources in app rather than requiring the separate downloaded evidence package.

## Intentional Low-Fidelity App 2.5 Experience / Future Product Attention Required

### Note 40: App 2.5 limitation: Least Cost Carrier is report delivery, not an app-native workflow

  - **Requirement:** Least Cost Carrier is an existing service customers have purchased, but the underlying analysis remains substantially manual and the customer output is a completed PDF and Excel report. For App 2.5 the platform serves as a report-delivery location only: Implentio's internal team produces the analysis outside the app and makes the completed report files available to the correct customer account.
  - **Behavior:** Current App 2.5 workflow: (1) Implentio completes the analysis manually; (2) engineering or an authorized internal team publishes the report files; (3) files are associated with the correct customer and reporting period; (4) the customer opens Least Cost Carrier Reports; (5) the customer downloads the completed PDF or Excel report. Included in App 2.5: LCC nav under Optimization, a customer-specific report list, completed-report metadata, report-ready state, PDF download, Excel download, file-unavailable state, download-event tracking, and customer-access controls.
  - **Dependency:** Each published report must be associated with: customer or brand, analysis period, report name, report type, report version, report status, date available, internal publisher, PDF file reference (when available), Excel file reference (when available), applicable summary metadata, and download events.
  - **Constraint:** Explicitly NOT in App 2.5: running an analysis, uploading shipment data, uploading or selecting rate cards, configuring service-level equivalence, changing carrier assumptions, interactive savings exploration, shipment-level drill-down, filtering or sorting analysis results, carrier comparison dashboards, routing recommendations, scenario modeling, customer approval of recommendations, sending findings to a biller, tracking whether routing logic changed, tracking realized savings, or automated report generation/publishing. The August 15 release prioritizes accurate parcel credit reconciliation and the Credit Tracker workflow; rebuilding LCC app-native would create unacceptable scope and data-quality risk.
  - **Acceptance:** The page presents a completed-report library only, never implies the analysis runs in-app, and its low-fidelity treatment is documented as a deliberate sequencing decision. A future app-native experience (automated repricing, service-level equivalence rules, rate-card effective dates, surcharge-aware comparisons, savings distribution, shipment-level detail, interactive filtering, scenario comparison, routing recommendations, Biller collaboration, realized-savings measurement) requires dedicated discovery after the reconciliation foundation ships.

## Positioning

### Note 52: LCC is an existing purchased service, not Coming Soon

  - **Requirement:** Least Cost Carrier must not be labeled Coming Soon.
  - **Behavior:** It is presented as a completed-report library for a service customers have already purchased; the page never implies a new analysis can be run in-app.
  - **Dependency:** Completed reports published to the account.
  - **Constraint:** No Coming Soon badge appears on the Least Cost Carrier page.
  - **Acceptance:** The page reads as report delivery for an existing service, distinct from the Unit Economics and Product Weight Validator previews.

## Sequencing decision

### Note 51: LCC: parcel credit reconciliation is the App 2.5 priority

  - **Requirement:** The August 15 release prioritizes accurate parcel credit reconciliation and the customer-facing Credit Tracker workflow.
  - **Behavior:** Least Cost Carrier receives an intentionally low-fidelity report-delivery treatment for this release.
  - **Dependency:** Delivery of the reconciliation foundation first.
  - **Constraint:** LCC app-native work is deliberately sequenced after reconciliation is stable.
  - **Acceptance:** The LCC treatment does not divert scope from the reconciliation priority.

