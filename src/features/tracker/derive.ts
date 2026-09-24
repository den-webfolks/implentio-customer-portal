/**
 * Tracker view derivations — ports the prototype's renderVals tracker
 * section (template ~13816–13870) and the outcomes-tab disposition helpers
 * (~12946–13010). Card status and dispositions come from the shared memo
 * status and money buckets in domain/outcomes.
 */
import type { OutcomeRow } from '@/data/source'
import type { CreditMemoSummary, DownloadEvent } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { countdownText, fmtDateShort } from '@/domain/dates'
import { deriveReportState } from '@/domain/memo'
import {
  MEMO_STATUS_LABELS,
  RECOVERY_BUCKETS,
  bucketMatch,
  recoveryBuckets,
  type MemoStatus,
  type MemoStatusKey,
  type RecoveryBucketKey,
} from '@/domain/outcomes'
import { BUCKET_TONE, TONE_CHART_COLOR } from '@/features/status-tones'
import { plural } from '@/domain/plural'

const DASH = '—'

// ---------- memo card CTA ------------------------------------------------------

export type CtaKind = 'prep' | 'send' | 'outcome' | 'view'

export interface TrackerCta {
  statusKey: MemoStatusKey
  statusLabel: string
  supporting: string
  /** "Dispute by Sep 20, 2026 · 3 days remaining" while findings are open. */
  deadline: string | null
  /** Null when there is nothing further to do (e.g. every finding expired unsent). */
  primaryKind: CtaKind | null
  primaryLabel: string
  contextual?: { text: string; link: string } | null
}

/** "Sep 20, 2026" from an ISO date. */
const shortDate = (iso: string) => fmtDateShort(new Date(iso + 'T00:00:00'))

/** The memo card's status block, from the shared memo status. */
export function trackerCta(st: MemoStatus, opts: { wholeMemo?: boolean } = {}): TrackerCta {
  const findings = (n: number) => plural(n, 'finding')
  const base = { statusKey: st.key, statusLabel: st.label, deadline: null, contextual: null }
  if (st.key === 'ready' || st.key === 'action_needed') {
    const deadline =
      st.nextDeadline && st.daysLeft != null ? `Dispute by ${shortDate(st.nextDeadline)} · ${countdownText(st.daysLeft)}` : null
    const contextual =
      st.waiting.count > 0 ? { text: `${findings(st.waiting.count)} waiting on the Biller`, link: 'Record outcome' } : null
    if (st.hasDraft)
      return {
        ...base,
        deadline,
        contextual,
        supporting: `${findings(st.selected.count)} selected, not sent yet.`,
        primaryKind: 'send',
        primaryLabel: 'Review & send',
      }
    if (opts.wholeMemo)
      return {
        ...base,
        deadline,
        contextual,
        supporting: 'The complete credit memo is disputed as one.',
        primaryKind: 'send',
        primaryLabel: 'Review & send',
      }
    const another = st.total.count > st.open.count
    return {
      ...base,
      deadline,
      contextual,
      supporting: another
        ? `${findings(st.open.count)} can still be disputed.`
        : 'No dispute has been started.',
      primaryKind: 'prep',
      primaryLabel: 'Choose findings to dispute',
    }
  }
  if (st.key === 'waiting')
    return {
      ...base,
      supporting: `${st.waiting.count} of ${findings(st.total.count)} waiting on the Biller.`,
      primaryKind: 'outcome',
      primaryLabel: 'Record outcome',
    }
  const disputed = st.collectedN + st.notRecoveredN > 0.005
  return {
    ...base,
    supporting: disputed
      ? [`${fmtMoney(st.collectedN)} collected`, st.notRecoveredN > 0.005 ? `${fmtMoney(st.notRecoveredN)} not recovered` : null]
          .filter(Boolean)
          .join(' · ') + '.'
      : 'No findings were disputed before the deadline.',
    primaryKind: disputed ? 'view' : null,
    primaryLabel: 'View dispute details',
  }
}

/** Placeholder memos carry no dispute data; their card keeps the prototype's
 *  static call to action (demo limitation, see ARCHITECTURE.md). */
export const PLACEHOLDER_CTA: TrackerCta = {
  statusKey: 'ready',
  statusLabel: MEMO_STATUS_LABELS.ready,
  supporting: 'No dispute has been started.',
  deadline: null,
  primaryKind: 'prep',
  primaryLabel: 'Choose findings to dispute',
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
  /** Null when the memo has nothing to dispute. */
  cta: TrackerCta | null
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
  cta: TrackerCta | null,
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

export type DispositionKey = RecoveryBucketKey

export type DispositionAmounts = Record<DispositionKey, number>

export function dispositionAmounts(rows: readonly OutcomeRow[], now: Date): DispositionAmounts {
  return recoveryBuckets(rows, now)
}

export function dispositionMatch(g: OutcomeRow, key: DispositionKey, now: Date): boolean {
  return bucketMatch(g, key, now)
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

const DONUT_DEFS: { key: DispositionKey; label: string; color: string }[] = RECOVERY_BUCKETS.map((b) => ({
  ...b,
  color: TONE_CHART_COLOR[BUCKET_TONE[b.key]],
}))

export function dispositionDonut(rows: readonly OutcomeRow[], now: Date): DonutData {
  const amts = dispositionAmounts(rows, now)
  const total = r2(RECOVERY_BUCKETS.reduce((s, b) => s + amts[b.key], 0))
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
