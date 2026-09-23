/**
 * Domain model for the Implentio customer app.
 *
 * These types describe the entities the screens consume (via AppDataSource).
 * They are also the input for the Phase 3 database schema design.
 *
 * Money fields carry the prototype's `N` suffix convention: a number in USD
 * with cent precision (e.g. 9387.7). Dates are ISO strings (`YYYY-MM-DD`,
 * or full timestamps where the prototype records one); human-readable date
 * labels that ship as display copy in the demo data stay as plain strings.
 */

// ---------- Dispute & collection lifecycle --------------------------------

/** How a finding entered (or left) the dispute process. */
export type Pursuit = 'pursued' | 'excluded' | null

export type CollectionStatus = 'awaiting' | 'partial' | 'full' | 'not_issued'

export interface CollectionChange {
  status: CollectionStatus
  amountN: number | null
  date: string | null
  changedBy?: string
  changedAt?: string
  reason?: string
}

export interface Collection {
  status: CollectionStatus
  /** Amount actually collected; null while awaiting. */
  amountN: number | null
  /** Date the outcome was received/recorded (ISO date). */
  date: string | null
  /** Biller's stated reason, for denied ("not_issued") outcomes. */
  reason: string
  changedBy?: string
  changedAt?: string
  history: CollectionChange[]
}

/** Dispute state attached to a finding group or outcome group. */
export interface DisputeState {
  pursuit: Pursuit
  /** Last day the Biller accepts a dispute (ISO date); null = no deadline. */
  disputeDeadline: string | null
  /** Display label, e.g. "Sep 8, 2026" (prototype ships it pre-formatted). */
  pursuedAt?: string | null
  /** Machine timestamp of the pursuit. */
  pursuedTs?: string | null
  pursuedBy?: string | null
  pursuedVia?: 'connected' | 'manual' | null
  /** Which request date this group was excluded from, when pursuit === 'excluded'. */
  excludedRequestDate?: string | null
  collection: Collection | null
}

// ---------- Credit memos ---------------------------------------------------

export type MemoStatus = 'processing' | 'complete'

/** Base report lifecycle stored on a memo; 'downloaded' can also be derived
 *  from the account's download history (see deriveReportState). */
export type ReportState = 'generating' | 'ready' | 'updated' | 'downloaded'

export interface DownloadEvent {
  userFirst: string
  userLast: string
  /** ISO timestamp. */
  at: string
}

export interface ReportVersion {
  num: number
  label: string
  current?: boolean
  superseded?: boolean
  dateText: string
  changeSummary?: string
  note?: string
}

/** A finding-level row on a memo's credit-outcomes ledger. The golden memo
 *  derives these from its finding groups; older memos carry them directly. */
export interface OutcomeGroup extends DisputeState {
  id: string
  title: string
  category: string
  carrier: string
  amountN: number
  /** The Biller the dispute goes to. */
  threePl: string
}

export interface CreditMemoSummary {
  id: string
  /** Biller (3PL) name. */
  provider: string
  /** Display period, e.g. "Apr – June 2026". */
  period: string
  cadence: string
  status: MemoStatus
  /** Null while the audit is still processing. */
  invoices: number | null
  orders: number | null
  invoicedN: number | null
  expectedN?: number | null
  overN: number | null
  underN: number | null
  netN: number | null
  /** Count of invoices with no variance (shown on some memos). */
  invoicesNoVariance?: number
  /** True when the whole memo found no variance at all. */
  allNoVariance?: boolean
  report: ReportState
  version: string
  versionNum?: number
  reportVersions?: ReportVersion[]
  completedText: string
  updatedText?: string
  changeSummary?: string
  dlEvent?: DownloadEvent
  carriers: string[]
  /** True for the memo with full drill-down data (the "golden" memo). */
  detailAvailable: boolean
  /** Outcome ledger rows carried directly on the memo (older memos). */
  outcomeGroups?: OutcomeGroup[]
}

// ---------- Memo detail: invoices, orders, findings ------------------------

export type VarianceKind = 'overcharge' | 'undercharge' | 'ok'

/** One order/package row on an invoice (memo detail → invoices tab). */
export interface OrderRow {
  /** Sales order number. */
  so: string
  /** Invoice number. */
  inv: string
  /** Tracking number. */
  track: string
  month: string
  biller: string
  carrier: string
  service: string
  /** Warehouse / fulfillment node. */
  wh: string
  zip?: string
  label: string
  /** Actual zone. */
  az: string
  /** Expected zone. */
  ez: string
  /** Billed weight in ounces. */
  wt: number
  invN: number
  expN: number
  varN: number
  outcome: string
}

export interface MemoInvoice {
  id: string
  /** Invoice number. */
  inv: string
  months: string[]
  monthLabel: string
  carriers: string[]
  warehouse: string
  invN: number
  expN: number
  overN: number
  underN: number
  netN: number
  orderCount: number
  hasDoc: boolean
  kind: string
  orders: OrderRow[]
}

/** Charge-component key used across findings: base, fuel, residential, DAS, other. */
export type ChargeKey = 'base' | 'fuel' | 'res' | 'das' | 'other' | 'multi'

/** One audited package inside a finding group (compact keys mirror the
 *  prototype's data contract; each charge pair is [invoiced, expected]). */
export interface PackageRecord {
  /** Tracking number. */
  t: string
  /** Sales order number. */
  so: string
  /** Invoice number. */
  inv: string
  /** Month label, e.g. "April". */
  mo: string
  /** Carrier. */
  car: string
  /** Service level (uppercase raw). */
  sv: string
  /** Warehouse. */
  wh: string
  zip: string | null
  /** Label date as an Excel serial number (see excelDate). */
  ld: number
  /** Actual zone. */
  az: string
  /** Expected zone. */
  ez: string
  /** Billed weight, ounces. */
  wt: number
  /** Cubic/dimensional flag or volume (0 when n/a). */
  cu: number
  /** Total invoiced. */
  ti: number
  /** Total expected. */
  te: number
  /** Total net variance. */
  tv: number
  /** Base freight [invoiced, expected]. */
  b: [number, number]
  /** Fuel [invoiced, expected]. */
  f: [number, number]
  /** Residential [invoiced, expected]. */
  r: [number, number]
  /** DAS/EDAS [invoiced, expected]. */
  d: [number, number]
  /** Other charges [invoiced, expected]. */
  o: [number, number]
}

/** A carrier service-level slice of a finding group. */
export interface FindingService {
  key: string
  carrier: string
  service: string
  label: string
  packages: number
  invoices: number
  invoicedN: number
  expectedN: number
  varN: number
  pkgs: PackageRecord[]
}

/** One charge component's contribution to a finding's variance mix. */
export interface ChargeMixEntry {
  key: string
  label: string
  amount: number
  text: string
}

/** An overcharge finding ("error group") on the golden memo, including its
 *  dispute state. Display strings (examples, explanations) are derived in
 *  domain functions, not stored. */
export interface FindingGroup extends DisputeState {
  id: string
  category: string
  chargeKey: string
  driver: string
  causes: string[]
  title: string
  headline: string
  supportCopy: string
  why: string
  mixText: string
  mixUnfav: ChargeMixEntry[]
  mixFav: ChargeMixEntry[]
  primaryUnfav: string
  primaryUnfavLabel: string
  driverConfirmed: boolean
  carriers: string[]
  invoices: number
  packages: number
  invoicedN: number
  expectedN: number
  varN: number
  chargeMix: { b: number; f: number; r: number; d: number; o: number }
  services: FindingService[]
}

/** Invoice-level variance record inside an over/under variance group. */
export interface VarianceRecord {
  id: string
  inv: string
  date: string
  carrier: string
  biller: string
  warehouse: string
  invoicedN: number
  expectedN: number
  varN: number
  kind: string
  resultLabel: string
}

/** An undercharge (favourable-to-the-customer) variance group. */
export interface UnderGroup {
  id: string
  title: string
  category: string
  carrier: string
  amountN: number
  invoices: number
  orders: number
  expl: string
  records: VarianceRecord[]
}

/** Full drill-down data for the golden memo. */
export interface MemoDetail {
  memo: CreditMemoSummary
  /** Source workbook file name (shown in activity/verification). */
  file: string
  reportName: string
  preparedBy: string
  invoices: MemoInvoice[]
  findingGroups: FindingGroup[]
  underGroups: UnderGroup[]
  /** True when detailed findings could not be published for this memo. */
  findingsUnavailable: boolean
  /** True while the audit is still processing (no findings yet). */
  auditProcessing: boolean
}

// ---------- Activity & account ---------------------------------------------

export interface ActivityEntry {
  icon: 'up' | 'gen' | 'dl' | 'send'
  text: string
  time: string
}

export type TeamMemberStatus = 'Active' | 'Invited'

export interface TeamMember {
  id: string
  name: string
  email: string
  status: TeamMemberStatus
}

export interface BillerContact {
  id: string
  biller: string
  contact: string
  email: string
  cc: string
  /** Whether dispute emails go to this contact. */
  dispute: boolean
  active: boolean
}

export type EmailProvider = 'gmail' | 'outlook'
export type EmailAccountStatus = 'not_connected' | 'connected' | 'expired'

export interface EmailAccount {
  status: EmailAccountStatus
  address?: string
  connectedAt?: string
}

export interface AccountSettings {
  user: { name: string; email: string; org: string; initials: string }
  team: TeamMember[]
  billerContacts: BillerContact[]
  emailAccounts: Record<EmailProvider, EmailAccount>
  csm: { name: string; email: string }
  supportEmail: string
}

// ---------- Report-level disputes (LCC/PWV/FCM, Phase 1.5) ------------------

export type ReportDisputeStatus = 'awaiting' | 'partial' | 'full' | 'denied'

export interface ReportDispute {
  status: ReportDisputeStatus
  sentAt: string
  amountN: number
  attachments: string[]
  collectedAmountN: number | null
  receivedDate: string | null
  reason: string
}
