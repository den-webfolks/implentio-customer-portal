/**
 * Fixture implementation of AppDataSource: an in-memory mutable store seeded
 * per scenario. Mutations change the store (and resolve async like a real
 * backend would); nothing persists across reloads — matching the prototype.
 */
import type {
  AppDataSource,
  DisputeContext,
  DownloadState,
  InvoiceIndexRow,
  OutcomeRow,
} from '@/data/source'
import { classifyInvoice } from '@/domain/memo'
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

  getDisputeContext(): Promise<DisputeContext> {
    return Promise.resolve({
      excludedIds: [...this.store.disputeExcludedIds],
      draftDate: this.store.disputeDraftDate,
      memoDisputeStatus: null,
    })
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

  listInvoiceIndex(): Promise<InvoiceIndexRow[]> {
    // Ports invoiceIndexData (template ~8121–8147): full-invoice totals are
    // fabricated from a hash of the invoice number (intentional demo data,
    // prototype note 96), plus four hand-written placeholder rows.
    const hash = (s: string, seed: number) => {
      let h = seed
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
      return h
    }
    const monthNum: Record<string, number> = {
      January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
      July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
    }
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    const fullDate = (monthLabel: string, inv: string) => {
      const m = monthLabel.match(/^([A-Za-z]+)\s+(\d{4})$/)
      if (!m || !m[1] || !m[2]) return monthLabel
      const mm = monthNum[m[1]] ?? 0
      const day = 1 + (hash(inv, 11) % (monthDays[mm - 1] ?? 28))
      return `${String(mm).padStart(2, '0')}/${String(day).padStart(2, '0')}/${m[2]}`
    }
    const golden = this.store.memos.find((m) => m.detailAvailable)
    const rows: InvoiceIndexRow[] = this.store.invoices.map((r) => {
      const hasVar = classifyInvoice(r).varN > 0
      const h = hash(r.inv, 7)
      return {
        id: r.id,
        inv: r.inv,
        period: fullDate(r.monthLabel, r.inv),
        reportPeriod: hasVar ? (golden?.period ?? null) : null,
        biller: golden?.provider ?? 'QuickBox',
        carriers: r.carriers,
        carrierText: r.carriers.join(', '),
        warehouse: r.warehouse,
        amountN: Math.round(r.invN * (1.9 + (h % 130) / 100) * 100) / 100,
        packages: Math.max(r.orderCount + 4, Math.round(r.orderCount * (1.7 + (h % 80) / 100))),
        parcelN: r.invN,
        status: hasVar ? 'variance' : 'clear',
        memoId: hasVar ? (golden?.id ?? null) : null,
      }
    })
    const ex = rows.find((r) => r.inv === 'QS3098017')
    if (ex) {
      ex.amountN = 2220.3
      ex.parcelN = 220.3
      ex.packages = 17
    }
    rows.push(
      { id: 'iv-c1', inv: 'QB3098215', period: '05/14/2026', reportPeriod: null, biller: 'QuickBox', carriers: ['UPS'], carrierText: 'UPS', warehouse: 'Denver', amountN: 8420.17, packages: 186, parcelN: 1180.42, status: 'clear', memoId: 'CM-2026-0517' },
      { id: 'iv-c2', inv: 'QS3098744', period: '06/09/2026', reportPeriod: null, biller: 'QuickBox', carriers: ['OSM'], carrierText: 'OSM', warehouse: 'New Jersey', amountN: 2964.08, packages: 74, parcelN: 640.75, status: 'clear', memoId: 'CM-2026-0517' },
      { id: 'iv-p1', inv: 'QB3099102', period: '07/03/2026', reportPeriod: null, biller: 'QuickBox', carriers: ['UPS', 'OSM'], carrierText: 'UPS, OSM', warehouse: 'Denver', amountN: 12108.55, packages: 240, parcelN: null, status: 'pending', memoId: null },
      { id: 'iv-p2', inv: 'QB3099140', period: '07/17/2026', reportPeriod: null, biller: 'QuickBox', carriers: ['DHL'], carrierText: 'DHL', warehouse: 'New Jersey', amountN: 3874.2, packages: 61, parcelN: null, status: 'historical', memoId: null },
    )
    return Promise.resolve(rows)
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

  setDisputeDraft(input: { excludedIds: string[]; draftDate: string | null }): Promise<void> {
    this.store.disputeExcludedIds = [...input.excludedIds]
    this.store.disputeDraftDate = input.draftDate
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
    // A biller has at most one default dispute contact at a time.
    if (contact.dispute) {
      this.store.account.billerContacts = this.store.account.billerContacts.map((c) =>
        c.biller === contact.biller && c.id !== contact.id ? { ...c, dispute: false } : c,
      )
    }
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
