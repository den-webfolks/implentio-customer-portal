/**
 * Fixture implementation of AppDataSource: an in-memory mutable store seeded
 * per scenario. Mutations change the store (and resolve async like a real
 * backend would); nothing persists across reloads — matching the prototype.
 */
import type { AppDataSource, DownloadState, OutcomeRow } from '@/data/source'
import type {
  AccountSettings,
  ActivityEntry,
  BillerContact,
  Collection,
  CreditMemoSummary,
  MemoDetail,
  TeamMember,
} from '@/domain/types'
import type { Clock } from '@/lib/clock'
import { buildBaseSeed, demoDownloadEvent, type SeedState } from './seed'
import { getScenario, type Scenario } from './scenarios'

export class FixtureDataSource implements AppDataSource {
  private store: SeedState
  private clock: Clock
  readonly scenario: Scenario

  constructor(scenarioId: string | null | undefined, clock: Clock) {
    this.clock = clock
    this.scenario = getScenario(scenarioId)
    this.store = this.scenario.seed(buildBaseSeed())
  }

  // ---- queries ----

  listMemos(): Promise<CreditMemoSummary[]> {
    return Promise.resolve(structuredClone(this.store.memos))
  }

  getMemoDetail(memoId: string): Promise<MemoDetail | null> {
    const memo = this.store.memos.find((m) => m.id === memoId)
    if (!memo) return Promise.resolve(null)
    // The prototype shares the golden memo's drill-down data across memo
    // pages (only the golden memo has real data; other pages demo states
    // like "updated" or "all clear" against it).
    return Promise.resolve(
      structuredClone({
        memo,
        file: this.store.file,
        reportName: this.store.reportName,
        preparedBy: this.store.preparedBy,
        invoices: this.store.invoices,
        findingGroups: this.store.findingGroups,
        underGroups: this.store.underGroups,
        findingsUnavailable: this.store.findingsUnavailable,
        auditProcessing: this.store.auditProcessing || memo.status === 'processing',
      }),
    )
  }

  getDownloadState(): Promise<DownloadState> {
    return Promise.resolve(
      structuredClone({
        downloadedMemoIds: this.store.downloadedMemoIds,
        memoDlEvents: this.store.memoDlEvents,
      }),
    )
  }

  listOutcomeRows(): Promise<OutcomeRow[]> {
    const rows: OutcomeRow[] = []
    for (const m of this.store.memos) {
      for (const g of m.outcomeGroups ?? []) {
        rows.push({ ...g, memoId: m.id, memoVersion: m.version })
      }
    }
    return Promise.resolve(structuredClone(rows))
  }

  getAccount(): Promise<AccountSettings> {
    return Promise.resolve(structuredClone(this.store.account))
  }

  getActivity(): Promise<ActivityEntry[]> {
    return Promise.resolve(structuredClone(this.store.activity))
  }

  // ---- mutations ----

  recordMemoDownload(memoId: string): Promise<void> {
    if (!this.store.downloadedMemoIds.includes(memoId)) {
      this.store.downloadedMemoIds.push(memoId)
    }
    this.store.memoDlEvents[memoId] = demoDownloadEvent(this.clock.now())
    return Promise.resolve()
  }

  markGroupsPursued(input: { groupIds: string[]; via: 'connected' | 'manual' }): Promise<void> {
    const now = this.clock.now()
    const pursuedAt = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    this.store.findingGroups = this.store.findingGroups.map((g) =>
      input.groupIds.includes(g.id)
        ? {
            ...g,
            pursuit: 'pursued',
            pursuedAt,
            pursuedTs: now.toISOString(),
            pursuedBy: this.store.account.user.name,
            pursuedVia: input.via,
            collection: { status: 'awaiting', amountN: null, date: null, reason: '', history: [] },
          }
        : g,
    )
    return Promise.resolve()
  }

  recordGroupOutcome(input: { groupId: string; collection: Collection }): Promise<void> {
    this.store.findingGroups = this.store.findingGroups.map((g) => {
      if (g.id !== input.groupId) return g
      const history = g.collection
        ? [
            ...g.collection.history,
            {
              status: g.collection.status,
              amountN: g.collection.amountN,
              date: g.collection.date,
              changedBy: g.collection.changedBy,
              changedAt: g.collection.changedAt,
              reason: g.collection.reason,
            },
          ]
        : []
      return {
        ...g,
        collection: {
          ...input.collection,
          changedBy: this.store.account.user.name,
          changedAt: this.clock.now().toISOString(),
          history,
        },
      }
    })
    return Promise.resolve()
  }

  includeGroupInAnotherRequest(groupId: string): Promise<void> {
    this.store.findingGroups = this.store.findingGroups.map((g) =>
      g.id === groupId ? { ...g, pursuit: null, excludedRequestDate: null } : g,
    )
    return Promise.resolve()
  }

  addActivity(entry: ActivityEntry): Promise<void> {
    this.store.activity = [entry, ...this.store.activity]
    return Promise.resolve()
  }

  // ---- account mutations ----

  inviteMember(input: { name: string; email: string }): Promise<TeamMember> {
    const member: TeamMember = {
      id: `tm-${this.store.account.team.length + 1}-${input.email.split('@')[0] ?? 'member'}`,
      name: input.name,
      email: input.email,
      status: 'Invited',
    }
    this.store.account.team.push(member)
    return Promise.resolve(structuredClone(member))
  }

  updateMember(member: TeamMember): Promise<void> {
    this.store.account.team = this.store.account.team.map((m) =>
      m.id === member.id ? { ...member } : m,
    )
    return Promise.resolve()
  }

  revokeMember(memberId: string): Promise<void> {
    this.store.account.team = this.store.account.team.filter((m) => m.id !== memberId)
    return Promise.resolve()
  }

  saveBillerContact(contact: BillerContact): Promise<void> {
    const existing = this.store.account.billerContacts.findIndex((c) => c.id === contact.id)
    if (existing >= 0) this.store.account.billerContacts[existing] = { ...contact }
    else this.store.account.billerContacts.push({ ...contact })
    return Promise.resolve()
  }

  setEmailAccountStatus(
    provider: 'gmail' | 'outlook',
    status: 'connected' | 'not_connected' | 'expired',
  ): Promise<void> {
    const account = this.store.account.emailAccounts[provider]
    this.store.account.emailAccounts[provider] = {
      ...account,
      status,
      ...(status === 'connected'
        ? { address: this.store.account.user.email, connectedAt: this.clock.now().toISOString() }
        : {}),
    }
    return Promise.resolve()
  }
}
