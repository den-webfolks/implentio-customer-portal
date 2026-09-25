/**
 * Builds the fixture store's seed state from the extracted prototype data.
 * Scenario transforms (scenarios.ts) mutate a fresh copy of this seed.
 */
import type {
  AccountSettings,
  ActivityEntry,
  CreditMemoSummary,
  DisputeRecord,
  DownloadEvent,
  FindingGroup,
  MemoInvoice,
  ReportDispute,
  ReportMonth,
  UnderGroup,
} from '@/domain/types'
import { fmtDateTime } from '@/domain/dates'
import { r2 } from '@/domain/money'
import { SUMMARY_FILE_NAME, attachmentNames, buildEmailBlocks, claimFileName, claimFromFinding, defaultSubject, emailText } from '@/domain/dispute-email'
import { parseCmData, parseCmPkg } from './fixtures/schema'
import cmDataRaw from './fixtures/cm-data.json'
import cmPkgRaw from './fixtures/cm-pkg.json'
import { memosAfterGolden, memosBeforeGolden } from './fixtures/memos'
import { accountFixture } from './fixtures/account'
import { defaultDisputeState, outcomeSeed } from './fixtures/outcome-seed'

export interface SeedState {
  memos: CreditMemoSummary[]
  /** The golden memo's drill-down data, shared by the memo screen. */
  goldenMemoId: string
  file: string
  reportName: string
  preparedBy: string
  invoices: MemoInvoice[]
  reportMonths: ReportMonth[]
  findingGroups: FindingGroup[]
  underGroups: UnderGroup[]
  findingsUnavailable: boolean
  auditProcessing: boolean
  downloadedMemoIds: string[]
  memoDlEvents: Record<string, DownloadEvent>
  /** Finding-group ids not selected for the current dispute draft. */
  disputeExcludedIds: string[]
  disputeDraftDate: string | null
  /** Disputes sent against the shared drill-down findings, oldest first.
   *  Left empty by the seed and scenarios; derived by withSeedDisputes. */
  disputes: DisputeRecord[]
  /** Report-level disputes keyed `kind:id` (LCC/PWV/FCM, Phase 1.5). */
  reportDisputes: Record<string, ReportDispute>
  activity: ActivityEntry[]
  account: AccountSettings
}

export function demoDownloadEvent(at: Date): DownloadEvent {
  return { userFirst: 'Tori', userLast: 'Matthews', at: at.toISOString() }
}

/** "Completed May 16, 2026 by Implentio" → "May 16, 2026". */
const dateFromText = (text: string) =>
  text.replace(/^.*?(Completed|Prepared|Published|Updated)\s+/, '').replace(/\s+by Implentio$/, '')

/** Seed activity for the non-golden memos: one entry per published report
 *  version, plus the seeded download (newest first). */
function memoActivity(m: CreditMemoSummary): ActivityEntry[] {
  if (m.status !== 'complete') return []
  const out: ActivityEntry[] = []
  if (m.dlEvent) {
    out.push({ memoId: m.id, icon: 'dl', text: `Credit memo downloaded — ${m.version}`, time: fmtDateTime(new Date(m.dlEvent.at)) })
  }
  const versions = m.reportVersions ?? [{ num: 1, label: m.version, dateText: m.completedText }]
  for (const v of [...versions].sort((a, b) => b.num - a.num)) {
    out.push({
      memoId: m.id,
      icon: v.num > 1 ? 'up' : 'gen',
      text: v.num > 1 ? `Report updated — ${v.label}` : `Report ready — ${v.label}`,
      time: dateFromText(v.dateText),
    })
  }
  return out
}

/**
 * Derives the dispute records implied by the pursued findings (one dispute
 * per send time), so every scenario's seeded pursuit has matching records
 * without hand-writing them. Runs after the scenario transform.
 */
export function withSeedDisputes(state: SeedState): SeedState {
  if (state.disputes.length) return state
  const memo = state.memos.find((m) => m.id === state.goldenMemoId)
  if (!memo) return state
  const contact = state.account.billerContacts.find((c) => c.biller === memo.provider && c.dispute)
  const bySend = new Map<string, FindingGroup[]>()
  for (const g of state.findingGroups) {
    if (g.pursuit !== 'pursued') continue
    const key = g.pursuedTs ?? g.pursuedAt ?? ''
    bySend.set(key, [...(bySend.get(key) ?? []), g])
  }
  const disputes = [...bySend.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([sentAt, groups], i): DisputeRecord => {
      const first = groups[0]
      const via = first?.pursuedVia ?? 'connected'
      const sender = first?.pursuedBy ?? state.account.user.name
      const amountN = r2(groups.reduce((s, g) => s + g.varN, 0))
      const email = {
        provider: memo.provider,
        greetingName: contact?.contact ?? `${memo.provider} billing team`,
        memoId: memo.id,
        period: memo.period,
        claims: groups.map((g) => claimFromFinding(g, claimFileName(g, 'csv'))),
        amountN,
        summaryFile: SUMMARY_FILE_NAME,
        completeFile: null,
        sender,
      }
      return {
        id: `dsp-seed-${i + 1}`,
        memoId: memo.id,
        memoVersion: memo.version,
        biller: memo.provider,
        state: 'sent',
        scope: 'groups',
        groupIds: groups.map((g) => g.id),
        amountN,
        sentAt,
        sentBy: sender,
        via,
        senderEmail: via === 'connected' ? state.account.user.email : null,
        to: contact?.email ?? '',
        cc: contact?.cc ?? '',
        subject: defaultSubject(email),
        body: emailText(buildEmailBlocks(email)),
        attachments: attachmentNames(email),
        handoffs: [],
        collection: null,
      }
    })
  return { ...state, disputes }
}

export function buildBaseSeed(): SeedState {
  const cmData = parseCmData(cmDataRaw)
  const cmPkg = parseCmPkg(cmPkgRaw)

  const golden: CreditMemoSummary = {
    id: cmData.memo.id,
    provider: cmData.memo.biller,
    period: cmData.memo.period,
    cadence: cmData.memo.cadence,
    status: 'complete',
    invoices: cmData.memo.invoicesCount,
    orders: cmData.memo.ordersCount,
    invoicedN: cmData.memo.invoicedN,
    expectedN: cmData.memo.expectedN,
    overN: cmData.memo.overN,
    underN: cmData.memo.underN,
    netN: cmData.memo.netN,
    report: 'ready',
    version: cmData.memo.version,
    completedText: cmData.memo.completedText,
    carriers: cmData.memo.carriers,
    detailAvailable: true,
  }

  const findingGroups: FindingGroup[] = cmPkg.groups.map((g) => ({
    id: g.id,
    category: g.category,
    chargeKey: g.chargeKey,
    driver: g.driver,
    causes: g.causes,
    title: g.title,
    headline: g.headline,
    supportCopy: g.supportCopy,
    why: g.why,
    mixText: g.mixText,
    mixUnfav: g.mixUnfav,
    mixFav: g.mixFav,
    primaryUnfav: g.primaryUnfav,
    primaryUnfavLabel: g.primaryUnfavLabel,
    driverConfirmed: g.driverConfirmed,
    carriers: g.carriers,
    invoices: g.invoices,
    packages: g.packages,
    invoicedN: g.invoicedN,
    expectedN: g.expectedN,
    varN: g.varN,
    chargeMix: g.chargeMix,
    services: g.services,
    ...(outcomeSeed[g.id] ?? defaultDisputeState),
  }))

  const memos = [...memosBeforeGolden, golden, ...memosAfterGolden]
  return {
    memos,
    goldenMemoId: golden.id,
    file: cmData.file,
    reportName: cmData.memo.reportName,
    preparedBy: cmData.memo.preparedBy,
    invoices: cmData.invoices,
    reportMonths: cmData.reportMonths,
    findingGroups,
    underGroups: cmData.underGroups,
    findingsUnavailable: false,
    auditProcessing: false,
    downloadedMemoIds: [],
    memoDlEvents: {},
    disputeExcludedIds: [],
    disputeDraftDate: null,
    disputes: [],
    reportDisputes: {},
    activity: [
      { memoId: golden.id, icon: 'up', text: `Report ready — ${cmData.memo.version}`, time: 'Jul 6, 2026, 9:03 AM' },
      {
        memoId: golden.id,
        icon: 'gen',
        text: `Report asset loaded — ${cmData.memo.reportName}`,
        time: 'Jul 6, 2026, 9:02 AM',
      },
      ...memos.filter((m) => m.id !== golden.id).flatMap(memoActivity),
    ],
    account: structuredClone(accountFixture),
  }
}
