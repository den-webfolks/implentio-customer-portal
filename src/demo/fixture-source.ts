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
  SendDisputeInput,
} from '@/data/source'
import { classifyInvoice } from '@/domain/memo'
import { fmtDateShort, fmtDateTime } from '@/domain/dates'
import { fmtMoney, r2 } from '@/domain/money'
import { plural } from '@/domain/plural'
import { COLLECTION_LABELS } from '@/domain/outcomes'
import type {
  AccountSettings,
  ActivityEntry,
  BillerContact,
  Collection,
  CreditMemoSummary,
  DisputeRecord,
  MemoDetail,
  TeamMember,
} from '@/domain/types'
import type { Clock } from '@/lib/clock'
import { buildBaseSeed, demoDownloadEvent, withSeedDisputes, type SeedState } from './seed'
import { getScenario, type Scenario } from './scenarios'

export class FixtureDataSource implements AppDataSource {
  private store: SeedState
  private clock: Clock
  readonly scenario: Scenario

  constructor(scenarioId: string | null | undefined, clock: Clock) {
    this.clock = clock
    this.scenario = getScenario(scenarioId)
    this.store = withSeedDisputes(this.scenario.seed(buildBaseSeed()))
  }

  // The memo pages share the golden memo's drill-down (see getMemoDetail), so
  // the draft and the disputes sent against those findings are shared too.
  // Tracker cards and Credit outcomes use each memo's own rows.

  private golden(): CreditMemoSummary | undefined {
    return this.store.memos.find((m) => m.id === this.store.goldenMemoId)
  }

  private log(memoId: string, icon: ActivityEntry['icon'], text: string) {
    this.store.activity = [{ memoId, icon, text, time: fmtDateTime(this.clock.now()) }, ...this.store.activity]
  }

  /** Appends the previous outcome to the history and stamps the change. */
  private nextCollection(prev: Collection | null, next: Collection): Collection {
    const history = prev
      ? [
          ...prev.history,
          {
            status: prev.status,
            amountN: prev.amountN,
            date: prev.date,
            changedBy: prev.changedBy,
            changedAt: prev.changedAt,
            reason: prev.reason,
          },
        ]
      : []
    return {
      ...next,
      changedBy: this.store.account.user.name,
      changedAt: this.clock.now().toISOString(),
      history,
    }
  }

  private outcomeText(subject: string, c: Collection, pursuedN: number): string {
    const amount =
      c.status === 'full'
        ? ` ${fmtMoney(pursuedN)}`
        : c.status === 'partial'
          ? ` ${fmtMoney(c.amountN ?? 0)} of ${fmtMoney(pursuedN)}`
          : ''
    return `Outcome recorded — ${subject}: ${COLLECTION_LABELS[c.status]}${amount}`
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
        reportMonths: this.store.reportMonths,
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

  // Shared across memo pages (see above), so the memo id isn't needed.
  getDisputeContext(): Promise<DisputeContext> {
    return Promise.resolve({
      excludedIds: [...this.store.disputeExcludedIds],
      draftDate: this.store.disputeDraftDate,
    })
  }

  listDisputes(): Promise<DisputeRecord[]> {
    return Promise.resolve(structuredClone(this.store.disputes))
  }

  listOutcomeRows(): Promise<OutcomeRow[]> {
    const rows: OutcomeRow[] = []
    for (const m of this.store.memos) {
      if (m.id === this.store.goldenMemoId) {
        if (m.status !== 'complete' || this.store.auditProcessing) continue
        const base = { memoId: m.id, memoVersion: m.version, threePl: m.provider }
        if (this.store.findingsUnavailable) {
          const d = this.store.disputes.find((x) => x.scope === 'memo')
          rows.push({
            ...base,
            id: `${m.id}-complete`,
            wholeMemo: true,
            title: 'Complete credit memo',
            category: 'Complete credit memo',
            carrier: m.carriers.join(', '),
            amountN: m.netN ?? 0,
            pursuit: d ? 'pursued' : null,
            pursuedAt: d ? fmtDateShort(new Date(d.sentAt)) : null,
            pursuedTs: d?.sentAt ?? null,
            pursuedBy: d?.sentBy ?? null,
            pursuedVia: d?.via ?? null,
            disputeDeadline: null,
            collection: d?.collection ?? null,
            lastCheckedAt: d?.lastCheckedAt ?? null,
          })
          continue
        }
        for (const g of this.store.findingGroups) {
          rows.push({
            ...base,
            id: g.id,
            title: g.title,
            category: g.category,
            carrier: g.carriers.join(', '),
            amountN: g.varN,
            pursuit: g.pursuit,
            pursuedAt: g.pursuedAt ?? null,
            pursuedTs: g.pursuedTs ?? null,
            pursuedBy: g.pursuedBy ?? null,
            pursuedVia: g.pursuedVia ?? null,
            disputeDeadline: g.disputeDeadline,
            collection: g.collection,
            lastCheckedAt: this.store.disputes.find((d) => d.groupIds.includes(g.id))?.lastCheckedAt ?? null,
          })
        }
        continue
      }
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

  getActivity(memoId: string): Promise<ActivityEntry[]> {
    return Promise.resolve(structuredClone(this.store.activity.filter((a) => a.memoId === memoId)))
  }

  // ---- mutations ----

  recordMemoDownload(memoId: string): Promise<void> {
    if (!this.store.downloadedMemoIds.includes(memoId)) {
      this.store.downloadedMemoIds.push(memoId)
    }
    this.store.memoDlEvents[memoId] = demoDownloadEvent(this.clock.now())
    const memo = this.store.memos.find((m) => m.id === memoId)
    this.log(memoId, 'dl', `Credit memo downloaded — ${memo?.version ?? 'current version'}`)
    return Promise.resolve()
  }

  recordDisputeSent(input: SendDisputeInput): Promise<DisputeRecord> {
    const now = this.clock.now()
    const memo = this.store.memos.find((m) => m.id === input.memoId) ?? this.golden()
    const groupIds = input.scope === 'memo' ? [] : input.groupIds
    const groups = this.store.findingGroups.filter((g) => groupIds.includes(g.id))
    const amountN =
      input.scope === 'memo' ? (memo?.netN ?? 0) : r2(groups.reduce((s, g) => s + g.varN, 0))
    const record: DisputeRecord = {
      id: `dsp-${this.store.disputes.length + 1}`,
      memoId: input.memoId,
      memoVersion: memo?.version ?? '',
      biller: memo?.provider ?? 'Biller',
      scope: input.scope,
      groupIds,
      amountN,
      sentAt: now.toISOString(),
      sentBy: this.store.account.user.name,
      via: input.via,
      senderEmail: input.senderEmail,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      body: input.body,
      evidenceFile: input.evidenceFile,
      collection:
        input.scope === 'memo'
          ? { status: 'awaiting', amountN: null, date: null, reason: '', history: [] }
          : null,
    }
    const pursuedAt = fmtDateShort(now)
    this.store.findingGroups = this.store.findingGroups.map((g) =>
      groupIds.includes(g.id)
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
    this.store.disputes = [...this.store.disputes, record]
    // Sending clears the draft; nothing is pre-selected for the next one.
    this.store.disputeExcludedIds = this.store.findingGroups.map((g) => g.id)
    this.store.disputeDraftDate = null
    const what =
      input.scope === 'memo' ? 'complete credit memo' : plural(groups.length, 'variance group')
    this.log(
      input.memoId,
      'send',
      `${input.via === 'manual' ? 'Dispute marked as sent' : 'Dispute sent'} to ${record.biller} — ${what} · ${fmtMoney(amountN)}`,
    )
    return Promise.resolve(structuredClone(record))
  }

  recordGroupOutcome(input: { groupId: string; collection: Collection }): Promise<void> {
    const g = this.store.findingGroups.find((x) => x.id === input.groupId)
    if (!g) return Promise.resolve()
    const collection = this.nextCollection(g.collection, input.collection)
    this.store.findingGroups = this.store.findingGroups.map((x) =>
      x.id === input.groupId ? { ...x, collection } : x,
    )
    const memoId = this.store.disputes.find((d) => d.groupIds.includes(g.id))?.memoId ?? this.store.goldenMemoId
    this.log(memoId, 'outcome', this.outcomeText(g.title, collection, g.varN))
    return Promise.resolve()
  }

  recordMemoDisputeOutcome(input: { disputeId: string; collection: Collection }): Promise<void> {
    const d = this.store.disputes.find((x) => x.id === input.disputeId)
    if (!d) return Promise.resolve()
    const collection = this.nextCollection(d.collection, input.collection)
    this.store.disputes = this.store.disputes.map((x) =>
      x.id === input.disputeId ? { ...x, collection } : x,
    )
    this.log(d.memoId, 'outcome', this.outcomeText('complete credit memo', collection, d.amountN))
    return Promise.resolve()
  }

  markDisputeChecked(disputeId: string): Promise<void> {
    const d = this.store.disputes.find((x) => x.id === disputeId)
    if (!d) return Promise.resolve()
    const lastCheckedAt = this.clock.now().toISOString()
    this.store.disputes = this.store.disputes.map((x) => (x.id === disputeId ? { ...x, lastCheckedAt } : x))
    this.log(d.memoId, 'outcome', `No reply yet from ${d.biller}`)
    return Promise.resolve()
  }

  setGroupNotPursued(input: { groupId: string; notPursued: boolean }): Promise<void> {
    const g = this.store.findingGroups.find((x) => x.id === input.groupId)
    if (!g || g.pursuit === 'pursued') return Promise.resolve()
    this.store.findingGroups = this.store.findingGroups.map((x) =>
      x.id === input.groupId ? { ...x, pursuit: input.notPursued ? 'excluded' : null } : x,
    )
    if (input.notPursued && !this.store.disputeExcludedIds.includes(g.id)) {
      this.store.disputeExcludedIds = [...this.store.disputeExcludedIds, g.id]
    }
    this.log(
      this.store.goldenMemoId,
      'outcome',
      input.notPursued ? `Marked won’t pursue — ${g.title}` : `Ready to dispute again — ${g.title}`,
    )
    return Promise.resolve()
  }

  setDisputeDraft(input: { excludedIds: string[]; draftDate: string | null }): Promise<void> {
    this.store.disputeExcludedIds = [...input.excludedIds]
    this.store.disputeDraftDate = input.draftDate
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
