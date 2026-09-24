/**
 * Tracker view derivations — ports the prototype's renderVals tracker
 * section (template ~13816–13870), trackerDisputeCta (~12646) and the
 * outcomes-tab disposition helpers (~12946–13010) with semantic tones
 * instead of inline CSS.
 */
import type { OutcomeRow } from '@/data/source'
import type { CreditMemoSummary, DownloadEvent, FindingGroup } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { fmtDateShort } from '@/domain/dates'
import { deriveReportState } from '@/domain/memo'
import { groupExpired } from '@/domain/outcomes'
import { TONE_CHART_COLOR } from '@/features/status-tones'
import { plural } from '@/domain/plural'

const DASH = '—'

// ---------- memo card CTA (golden memo only) --------------------------------

export type CtaColor = 'purple' | 'amber' | 'green'
export type CtaKind = 'prep' | 'draft' | 'outcome' | 'view'

export interface TrackerCta {
  key: string
  statusLabel: string
  color: CtaColor
  supporting: string
  primaryKind: CtaKind
  primaryLabel: string
  contextual?: { text: string; link: string } | null
}

export function trackerDisputeCta(input: {
  findingGroups: readonly FindingGroup[]
  findingsUnavailable: boolean
  memoDisputeStatus: 'awaiting' | 'completed' | null
  excludedIds: readonly string[]
  draftDate: string | null
  now: Date
}): TrackerCta | null {
  const { findingGroups, findingsUnavailable, memoDisputeStatus, excludedIds, draftDate, now } =
    input
  if (findingsUnavailable) {
    if (!memoDisputeStatus)
      return {
        key: 'ready',
        statusLabel: 'Ready to dispute',
        color: 'purple',
        supporting: 'No dispute has been started.',
        primaryKind: 'prep',
        primaryLabel: 'Prepare dispute for Biller',
      }
    if (memoDisputeStatus === 'awaiting')
      return {
        key: 'awaiting',
        statusLabel: 'Awaiting Biller response',
        color: 'amber',
        supporting: 'Awaiting a response from your biller.',
        primaryKind: 'outcome',
        primaryLabel: 'Update dispute outcomes',
      }
    return {
      key: 'completed',
      statusLabel: 'Dispute completed',
      color: 'green',
      supporting: 'This dispute has been finalized.',
      primaryKind: 'view',
      primaryLabel: 'View dispute details',
    }
  }
  if (!findingGroups.length) return null
  const eligible = findingGroups.filter(
    (g) => g.pursuit !== 'pursued' && g.pursuit !== 'excluded' && !groupExpired(g, now),
  )
  const pursued = findingGroups.filter((g) => g.pursuit === 'pursued')
  if (!eligible.length && !pursued.length) return null
  const fmtCount = (n: number) => `${n} finding${n === 1 ? '' : 's'}`
  let awaitingCount = 0
  let finalizedCount = 0
  for (const g of pursued) {
    const s = g.collection?.status
    if (!s || s === 'awaiting') awaitingCount++
    else finalizedCount++
  }
  const excludedCount = eligible.filter((g) => excludedIds.includes(g.id)).length
  const hasDraft = !pursued.length && excludedCount > 0 && excludedCount < eligible.length

  if (hasDraft)
    return {
      key: 'draft',
      statusLabel: 'Dispute draft',
      color: 'purple',
      supporting: `Started ${draftDate ?? fmtDateShort(now)} · Not yet sent.`,
      primaryKind: 'draft',
      primaryLabel: 'Continue preparing dispute',
    }
  if (eligible.length && pursued.length)
    return {
      key: 'more',
      statusLabel: 'More findings available',
      color: 'purple',
      supporting: `${fmtCount(eligible.length)} ${eligible.length === 1 ? 'has' : 'have'} not been submitted.`,
      primaryKind: 'prep',
      primaryLabel: 'Prepare another dispute',
      contextual:
        awaitingCount > 0
          ? { text: `${fmtCount(awaitingCount)} awaiting an outcome`, link: 'Update outcomes' }
          : null,
    }
  if (eligible.length)
    return {
      key: 'ready',
      statusLabel: 'Ready to dispute',
      color: 'purple',
      supporting: 'No dispute has been started.',
      primaryKind: 'prep',
      primaryLabel: 'Prepare dispute for Biller',
    }
  if (awaitingCount === 0)
    return {
      key: 'completed',
      statusLabel: 'Dispute completed',
      color: 'green',
      supporting: `${pursued.length} of ${plural(pursued.length, 'finding')} finalized.`,
      primaryKind: 'view',
      primaryLabel: 'View dispute details',
    }
  if (finalizedCount > 0)
    return {
      key: 'partial',
      statusLabel: 'Outcomes partly recorded',
      color: 'amber',
      supporting: `${finalizedCount} of ${plural(pursued.length, 'finding')} finalized.`,
      primaryKind: 'outcome',
      primaryLabel: 'Update dispute outcomes',
    }
  return {
    key: 'awaiting',
    statusLabel: 'Awaiting Biller response',
    color: 'amber',
    supporting: `${fmtCount(awaitingCount)} awaiting an outcome.`,
    primaryKind: 'outcome',
    primaryLabel: 'Update dispute outcomes',
  }
}

// ---------- memo cards -------------------------------------------------------

export interface MemoCardView {
  id: string
  provider: string
  period: string
  cadence: string
  carriers: string[]
  generating: boolean
  downloaded: boolean
  isNew: boolean
  isUpdated: boolean
  downloadedBy: string | null
  allNoVariance: boolean
  hasVariance: boolean
  showFinancials: boolean
  allClearLine1: string | null
  showCoverage: boolean
  coverageText: string | null
  actionsEnabled: boolean
  cta: TrackerCta
  versionLabel: string | null
  preparedText: string | null
  over: string
  overSub: string
  billedSub: string
  accent: 'warning' | 'orange' | 'none' | 'gray'
  detailAvailable: boolean
  /** Prototype demo-data marker ("Source-backed demo" / "Demo placeholder"). */
  demoLabel: string | null
}

function dlAttribution(ev: DownloadEvent | undefined): string | null {
  if (!ev) return null
  const d = new Date(ev.at)
  const date = isNaN(d.getTime()) ? '' : fmtDateShort(d)
  return `Downloaded by ${ev.userFirst} ${ev.userLast} · ${date}`
}

const DEFAULT_CTA: TrackerCta = {
  key: 'ready',
  statusLabel: 'Ready to dispute',
  color: 'purple',
  supporting: 'No dispute has been started.',
  primaryKind: 'prep',
  primaryLabel: 'Prepare dispute for Biller',
}

export interface TrackerFilters {
  tProvider: string
  tReport: string
  tRange: string
}

export function filterMemos(
  memos: readonly CreditMemoSummary[],
  downloadedIds: readonly string[],
  f: TrackerFilters,
): CreditMemoSummary[] {
  let out = memos.map((m) => ({ ...m, report: deriveReportState(m, downloadedIds).report }))
  if (f.tReport !== 'all') out = out.filter((m) => m.report === f.tReport)
  if (f.tProvider !== 'all') out = out.filter((m) => m.provider === f.tProvider)
  if (f.tRange !== 'all') {
    const cut = { '30': 2, '60': 3, '90': 4, '365': 5 }[f.tRange] ?? out.length
    out = out.slice(0, cut)
  }
  return out
}

export function memoCardView(
  m: CreditMemoSummary,
  downloadedIds: readonly string[],
  memoDlEvents: Record<string, DownloadEvent>,
  goldenCta: TrackerCta | null,
): MemoCardView {
  const rs = deriveReportState(m, downloadedIds)
  const report = rs.report
  const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  const allNoVariance = !!m.allNoVariance
  const noVar = m.invoicesNoVariance ?? 0
  const audited = m.invoicesNoVariance != null ? (m.invoices ?? 0) + noVar : null
  const showCoverage = !allNoVariance && audited != null && noVar > 0
  const prepared =
    report === 'generating'
      ? null
      : 'Report prepared ' + m.completedText.replace(/^Completed /, '').replace(/^Prepared /, '')
  const cta = (m.detailAvailable ? goldenCta : null) ?? DEFAULT_CTA
  return {
    id: m.id,
    provider: m.provider,
    period: m.period,
    cadence: m.cadence,
    carriers: m.carriers,
    generating: report === 'generating',
    downloaded: report === 'downloaded',
    isNew: rs.isNew,
    isUpdated: report === 'updated',
    downloadedBy: dlAttribution(memoDlEvents[m.id] ?? m.dlEvent),
    allNoVariance,
    hasVariance: !allNoVariance,
    showFinancials: (report === 'ready' || report === 'downloaded' || report === 'updated') && !allNoVariance,
    allClearLine1: allNoVariance && audited != null ? pl(audited, 'invoice') + ' audited' : null,
    showCoverage,
    coverageText:
      showCoverage && audited != null
        ? `${pl(audited, 'invoice')} audited · ${noVar} had no significant variance`
        : null,
    actionsEnabled: report === 'ready' || report === 'downloaded' || report === 'updated',
    cta,
    versionLabel:
      m.versionNum && m.versionNum > 1
        ? report === 'downloaded'
          ? `${m.version} · Downloaded`
          : m.completedText
        : null,
    preparedText: m.versionNum && m.versionNum > 1 ? null : prepared,
    over: m.netN == null ? DASH : fmtMoney(m.netN),
    overSub: `${m.orders == null ? `${DASH} affected packages` : plural(m.orders, 'affected package')} on ${m.invoices == null ? `${DASH} invoices` : plural(m.invoices, 'invoice')}`,
    billedSub: `${m.invoicedN == null ? DASH : fmtMoney(m.invoicedN)} billed · ${
      m.expectedN != null
        ? fmtMoney(m.expectedN)
        : m.invoicedN == null
          ? DASH
          : fmtMoney(m.invoicedN - (m.netN ?? 0))
    } expected`,
    accent:
      report === 'generating'
        ? 'warning'
        : rs.isNew || report === 'updated'
          ? 'orange'
          : report === 'downloaded'
            ? 'none'
            : 'gray',
    detailAvailable: m.detailAvailable,
    demoLabel:
      m.id === 'CM-2026-0801'
        ? null
        : m.detailAvailable
          ? 'Source-backed demo'
          : 'Demo placeholder',
  }
}

// ---------- executive summary ------------------------------------------------

export interface ExecSummary {
  count: number
  over: string
  invoiced: string
  memosReady: number
  reportsDownloaded: number
}

export function execSummary(
  memos: readonly CreditMemoSummary[],
  downloadedIds: readonly string[],
): ExecSummary {
  let net = 0
  let invoiced = 0
  for (const m of memos) {
    net += m.netN ?? 0
    invoiced += m.invoicedN ?? 0
  }
  const reports = memos.map((m) => deriveReportState(m, downloadedIds).report)
  return {
    count: memos.length,
    over: fmtMoney(net),
    invoiced: fmtMoney(invoiced),
    memosReady: memos.filter((m) => m.status === 'complete').length,
    reportsDownloaded: reports.filter((r) => r === 'downloaded').length,
  }
}

// ---------- outcomes tab: dispositions & donut -------------------------------

export type DispositionKey = 'eligible' | 'awaiting' | 'collected' | 'denied'

export interface DispositionAmounts {
  eligible: number
  awaiting: number
  collected: number
  denied: number
}

export function dispositionAmounts(rows: readonly OutcomeRow[]): DispositionAmounts {
  let eligible = 0
  let awaiting = 0
  let collected = 0
  let denied = 0
  for (const g of rows) {
    const amt = g.amountN ?? 0
    if (g.pursuit !== 'pursued') {
      eligible += amt
      continue
    }
    const c = g.collection
    if (c?.status === 'full') collected += amt
    else if (c?.status === 'not_issued') denied += amt
    else if (c?.status === 'partial') {
      const coll = c.amountN ?? 0
      collected += coll
      awaiting += Math.max(0, r2(amt - coll))
    } else awaiting += amt
  }
  return { eligible: r2(eligible), awaiting: r2(awaiting), collected: r2(collected), denied: r2(denied) }
}

export function dispositionMatch(g: OutcomeRow, key: DispositionKey): boolean {
  if (g.pursuit !== 'pursued') return key === 'eligible'
  const c = g.collection
  if (key === 'denied') return c?.status === 'not_issued'
  if (key === 'collected')
    return c?.status === 'full' || (c?.status === 'partial' && (c.amountN ?? 0) > 0.005)
  if (key === 'awaiting') {
    if (c?.status === 'partial') return r2((g.amountN ?? 0) - (c.amountN ?? 0)) > 0.005
    return !c?.status || c.status === 'awaiting'
  }
  return false
}

export interface DonutSlice {
  key: DispositionKey
  label: string
  color: string
  amountN: number
  amount: string
  pct: string
  dashArray: string
  dashOffset: string
}

export interface DonutData {
  slices: DonutSlice[]
  total: string
  empty: boolean
}

const DONUT_DEFS: { key: DispositionKey; label: string; color: string }[] = [
  { key: 'eligible', label: 'Eligible to pursue', color: TONE_CHART_COLOR.neutral },
  { key: 'awaiting', label: 'Awaiting outcome', color: TONE_CHART_COLOR.info },
  { key: 'collected', label: 'Collected', color: TONE_CHART_COLOR.success },
  { key: 'denied', label: 'Biller declined', color: TONE_CHART_COLOR.danger },
]

export function dispositionDonut(rows: readonly OutcomeRow[]): DonutData {
  const amts = dispositionAmounts(rows)
  const total = r2(amts.eligible + amts.awaiting + amts.collected + amts.denied)
  const R = 68
  const CIRC = 2 * Math.PI * R
  const GAP = 3
  const MIN_DASH = 26
  const MAX_STROKE = 18
  const base = DONUT_DEFS.map((cd) => {
    const amt = amts[cd.key]
    const rawDash = total > 0 ? (amt / total) * CIRC : 0
    return { cd, amt, dash: amt > 0 ? Math.max(rawDash, MIN_DASH) : 0 }
  })
  const dashSum = base.reduce((a, b) => a + b.dash, 0)
  const scale = total > 0 && dashSum > 0 ? CIRC / dashSum : 1
  let cum = 0
  const slices = base.map(({ cd, amt, dash: rawDash }) => {
    const dash = rawDash * scale
    const pctN = total > 0 ? (amt / total) * 100 : 0
    const gap = Math.min(GAP + MAX_STROKE, dash * 0.85)
    const visDash = Math.max(dash - gap, 0)
    const seg: DonutSlice = {
      key: cd.key,
      label: cd.label,
      color: cd.color,
      amountN: amt,
      amount: fmtMoney(amt),
      pct: Math.round(pctN) + '%',
      dashArray: `${visDash.toFixed(2)} ${Math.max(CIRC - visDash, 0).toFixed(2)}`,
      dashOffset: (-cum).toFixed(2),
    }
    cum += dash
    return seg
  })
  return { slices, total: fmtMoney(total), empty: total <= 0 || rows.length === 0 }
}
