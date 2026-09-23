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

/** An outcome row on the tracker's Credit Outcomes tab. */
export type OutcomeRow = OutcomeGroup & { memoId: string; memoVersion: string }

export interface AppDataSource {
  // ---- queries ----
  listMemos(): Promise<CreditMemoSummary[]>
  getMemoDetail(memoId: string): Promise<MemoDetail | null>
  getDownloadState(): Promise<DownloadState>
  listOutcomeRows(): Promise<OutcomeRow[]>
  getAccount(): Promise<AccountSettings>
  getActivity(): Promise<ActivityEntry[]>

  // ---- mutations ----
  recordMemoDownload(memoId: string): Promise<void>
  /** Mark finding groups pursued (dispute sent). */
  markGroupsPursued(input: {
    groupIds: string[]
    via: 'connected' | 'manual'
  }): Promise<void>
  /** Record or edit a collection outcome on a finding group. */
  recordGroupOutcome(input: { groupId: string; collection: Collection }): Promise<void>
  /** Return an excluded group to the eligible pool. */
  includeGroupInAnotherRequest(groupId: string): Promise<void>
  addActivity(entry: ActivityEntry): Promise<void>

  // ---- account mutations ----
  inviteMember(input: { name: string; email: string }): Promise<TeamMember>
  updateMember(member: TeamMember): Promise<void>
  revokeMember(memberId: string): Promise<void>
  saveBillerContact(contact: BillerContact): Promise<void>
  setEmailAccountStatus(provider: EmailProvider, status: 'connected' | 'not_connected' | 'expired'): Promise<void>
}
