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
  HandoffMethod,
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

/** A dispute sent from a connected mailbox. */
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
  attachments: string[]
  senderEmail: string | null
}

/** A handoff: the email (or part of it) left the app for a manual send. The
 *  first one creates the prepared record; later ones add a version to it. */
export interface PrepareDisputeInput {
  memoId: string
  scope: 'groups' | 'memo'
  groupIds: string[]
  method: HandoffMethod
  to: string
  cc: string
  subject: string
  body: string
  attachments: string[]
  /** The recipients were valid at this handoff. */
  recipientsChecked: boolean
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
  /** The email left the app: creates the memo's prepared dispute (reserving
   *  its findings and clearing the draft) or adds a handoff to it. */
  prepareDispute(input: PrepareDisputeInput): Promise<DisputeRecord>
  /** "Yes, I sent it": the prepared dispute becomes sent on `sentOn` (ISO
   *  date, no earlier than the day it was prepared). A connected send of a
   *  prepared email passes `via: 'connected'`, the mailbox, and what was
   *  actually sent, which replaces the last-prepared snapshot. */
  confirmDisputeSent(input: { disputeId: string; sentOn: string; via?: 'connected' | 'manual'; senderEmail?: string | null; to?: string; cc?: string; subject?: string; body?: string; attachments?: string[] }): Promise<DisputeRecord>
  /** "I didn't send it": the prepared dispute is kept as discarded and its
   *  findings become selectable again. */
  discardPreparedDispute(disputeId: string): Promise<void>
  /** Record or edit a collection outcome on a finding group. */
  recordGroupOutcome(input: { groupId: string; collection: Collection }): Promise<void>
  /** Record or edit the outcome of a whole-memo dispute. */
  recordMemoDisputeOutcome(input: { disputeId: string; collection: Collection }): Promise<void>
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
