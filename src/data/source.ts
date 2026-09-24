/**
 * The data-source seam. Screens reach data only through feature hooks →
 * data/queries.ts → this interface. Phase 1 binds FixtureDataSource
 * (src/demo); Phase 3 adds SupabaseDataSource without touching call sites.
 *
 * All methods are async so the backend implementation can slot in.
 * The interface grows milestone by milestone — add methods when a screen
 * needs them, not speculatively.
 */
import type {
  AccountSettings,
  ActivityEntry,
  BillerContact,
  Collection,
  CreditMemoSummary,
  DisputeRecord,
  DownloadEvent,
  EmailProvider,
  MemoDetail,
  OutcomeGroup,
  TeamMember,
} from '@/domain/types'

/** Account-level download history (overlays memo report states). */
export interface DownloadState {
  downloadedMemoIds: string[]
  memoDlEvents: Record<string, DownloadEvent>
}

/** An outcome row on the tracker's Credit Outcomes tab. `wholeMemo` marks
 *  the single row of a memo disputed as a whole (no finding breakdown). */
export type OutcomeRow = OutcomeGroup & {
  memoId: string
  memoVersion: string
  wholeMemo?: boolean
  /** Last "no reply yet" check on the dispute this row was sent in. */
  lastCheckedAt?: string | null
}

/** One row on the account-wide invoices index. */
export interface InvoiceIndexRow {
  id: string
  inv: string
  /** Invoice date, MM/DD/YYYY. */
  period: string
  reportPeriod: string | null
  biller: string
  carriers: string[]
  carrierText: string
  warehouse: string
  /** Original (full) invoice total. */
  amountN: number
  /** Packages on the full invoice. */
  packages: number | null
  /** Eligible parcel amount reviewed. */
  parcelN: number | null
  status: 'variance' | 'clear' | 'pending' | 'historical'
  memoId: string | null
}

/** Unsent dispute draft for a memo's findings. */
export interface DisputeContext {
  /** Finding-group ids not selected for the draft (nothing is pre-selected). */
  excludedIds: string[]
  /** Display date the draft was started, or null when no draft exists. */
  draftDate: string | null
}

/** A dispute the customer sent (connected mailbox) or confirmed sending. */
export interface SendDisputeInput {
  memoId: string
  /** 'memo' sends the complete credit memo (no finding breakdown published). */
  scope: 'groups' | 'memo'
  groupIds: string[]
  via: 'connected' | 'manual'
  to: string
  cc: string
  subject: string
  body?: string
  evidenceFile: string
  senderEmail: string | null
}

export interface AppDataSource {
  // ---- queries ----
  listMemos(): Promise<CreditMemoSummary[]>
  getMemoDetail(memoId: string): Promise<MemoDetail | null>
  getDownloadState(): Promise<DownloadState>
  getDisputeContext(memoId: string): Promise<DisputeContext>
  /** Every dispute sent for a memo, oldest first. */
  listDisputes(memoId: string): Promise<DisputeRecord[]>
  /** Finding-level dispute rows for every published memo (Credit outcomes). */
  listOutcomeRows(): Promise<OutcomeRow[]>
  listInvoiceIndex(): Promise<InvoiceIndexRow[]>
  getAccount(): Promise<AccountSettings>
  /** A memo's activity, newest first. Mutations write their own entries. */
  getActivity(memoId: string): Promise<ActivityEntry[]>

  // ---- mutations ----
  recordMemoDownload(memoId: string): Promise<void>
  /** Record a sent dispute: stores the record, marks its findings pursued
   *  (awaiting outcome), and clears the draft (nothing selected). */
  recordDisputeSent(input: SendDisputeInput): Promise<DisputeRecord>
  /** Record or edit a collection outcome on a finding group. */
  recordGroupOutcome(input: { groupId: string; collection: Collection }): Promise<void>
  /** Record or edit the outcome of a whole-memo dispute. */
  recordMemoDisputeOutcome(input: { disputeId: string; collection: Collection }): Promise<void>
  /** The customer checked and the Biller hasn't replied yet. */
  markDisputeChecked(disputeId: string): Promise<void>
  /** "Won't pursue" a finding, or undo that decision. */
  setGroupNotPursued(input: { groupId: string; notPursued: boolean }): Promise<void>
  /** Update the dispute draft (unselected groups + draft-start date). */
  setDisputeDraft(input: { excludedIds: string[]; draftDate: string | null }): Promise<void>

  // ---- account mutations ----
  inviteMember(input: { name: string; email: string }): Promise<TeamMember>
  updateMember(member: TeamMember): Promise<void>
  revokeMember(memberId: string): Promise<void>
  saveBillerContact(contact: BillerContact): Promise<void>
  setEmailAccountStatus(provider: EmailProvider, status: 'connected' | 'not_connected' | 'expired'): Promise<void>
}
