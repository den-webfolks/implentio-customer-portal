/**
 * Builds the fixture store's seed state from the extracted prototype data.
 * Scenario transforms (scenarios.ts) mutate a fresh copy of this seed.
 */
import type {
  AccountSettings,
  ActivityEntry,
  CreditMemoSummary,
  DownloadEvent,
  FindingGroup,
  MemoInvoice,
  ReportDispute,
  UnderGroup,
} from '@/domain/types'
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
  findingGroups: FindingGroup[]
  underGroups: UnderGroup[]
  findingsUnavailable: boolean
  auditProcessing: boolean
  downloadedMemoIds: string[]
  memoDlEvents: Record<string, DownloadEvent>
  /** Finding-group ids excluded from the current dispute draft. */
  disputeExcludedIds: string[]
  disputeDraftDate: string | null
  /** Report-level disputes keyed `kind:id` (LCC/PWV/FCM, Phase 1.5). */
  reportDisputes: Record<string, ReportDispute>
  activity: ActivityEntry[]
  account: AccountSettings
}

export function demoDownloadEvent(at: Date): DownloadEvent {
  return { userFirst: 'Tori', userLast: 'Matthews', at: at.toISOString() }
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

  return {
    memos: [...memosBeforeGolden, golden, ...memosAfterGolden],
    goldenMemoId: golden.id,
    file: cmData.file,
    reportName: cmData.memo.reportName,
    preparedBy: cmData.memo.preparedBy,
    invoices: cmData.invoices,
    findingGroups,
    underGroups: cmData.underGroups,
    findingsUnavailable: false,
    auditProcessing: false,
    downloadedMemoIds: [],
    memoDlEvents: {},
    disputeExcludedIds: [],
    disputeDraftDate: null,
    reportDisputes: {},
    activity: [
      { icon: 'up', text: `Report ready — ${cmData.memo.version}`, time: 'Jul 6, 2026, 9:03 AM' },
      {
        icon: 'gen',
        text: `Report asset loaded — ${cmData.memo.reportName}`,
        time: 'Jul 6, 2026, 9:02 AM',
      },
    ],
    account: structuredClone(accountFixture),
  }
}
