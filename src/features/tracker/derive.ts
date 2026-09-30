/**
 * Tracker view derivations. The Credit memos tab groups memos by who moves
 * next, biggest amount first, one row and one action each (DESIGN-SYSTEM.md,
 * "Parcel Credit Tracker — Phase 2b"); the summary strip and the Credit
 * outcomes tab read the same money buckets from domain/outcomes, so the two
 * tabs agree. The outcomes-tab helpers below port the prototype's disposition
 * helpers (~12946–13010).
 */
import type { OutcomeRow } from '@/data/source'
import type { CreditMemoSummary } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { countdownText, daysSince, daysUntilDeadline, fmtDateShort } from '@/domain/dates'
import { deriveReportState } from '@/domain/memo'
import {
  RECOVERY_BUCKETS,
  bucketMatch,
  findingPhase,
  memoStatus,
  recoveryBuckets,
  sentDate,
  type DraftSelection,
  type MemoStatus,
  type RecoveryBucketKey,
  type RecoveryBuckets,
} from '@/domain/outcomes'
import { BUCKET_TONE, TONE_CHART_COLOR } from '@/features/status-tones'
import { plural } from '@/domain/plural'

// ---------- sorting ------------------------------------------------------------

export type TrackerSort = 'value' | 'deadline'

export const TRACKER_SORTS: { value: TrackerSort; label: string }[] = [
  { value: 'value', label: 'Most to dispute first' },
  { value: 'deadline', label: 'Soonest deadline first' },
]

// ---------- memo row -------------------------------------------------------------

/** Where "Check details" scrolls to on the memo page (it never opens a dialog). */
export type RowTarget = 'findings' | 'prepared' | 'outcomes' | 'dispute' | null

/** What has been done with the memo and what's next: a status chip and one or two lines. */
export interface RowStatus {
  tone: 'neutral' | 'info' | 'attention' | 'success' | 'muted'
  icon: 'prepared' | 'draft' | 'active' | 'open' | 'closed' | 'skipped'
  label: string
  detail: string[]
}

export interface MemoRowView {
  id: string
  provider: string
  period: string
  /** processing: audit not published (one line above the list); finished: nothing left or waiting. */
  place: 'list' | 'finished' | 'processing'
  /** "New" (nothing done yet) / "Updated" (a new version). */
  chip: 'New' | 'Updated' | null
  allClear: boolean
  /** Always the money left to dispute (user decision): one meaning on every row. */
  hero: { kind: RecoveryBucketKey; label: string; valueN: number } | null
  /** One line under the big number: "of $X overcharged", or a fact about the memo. */
  sub: string | null
  /** Everything the audit found overcharged on this memo. */
  totalN: number
  buckets: RecoveryBuckets | null
  /** The other non-zero buckets, in bar order. */
  facts: { key: RecoveryBucketKey; valueN: number }[]
  /** Shown instead of facts when there are none. */
  factsText: string | null
  status: RowStatus | null
  target: RowTarget
  /** Earliest deadline not yet passed among findings still open (ISO date). */
  deadline: string | null
  /** Left-to-dispute money past its deadline (still disputable). */
  pastDeadlineN: number
  /** Money is left to dispute, and all of it is past its deadline: sorts
   *  after memos with live deadlines and waiting memos (status model, option D). */
  pastOnly: boolean
  waitDays: number | null
  /** When the longest-waiting finding was sent. */
  waitSince: Date | null
  detailAvailable: boolean
  /** Prototype demo-data marker; shown only in demo mode. */
  demoLabel: string | null
  /** Position in the source list, the last tie-breaker. */
  index: number
}

/** Lower-case bucket names for the facts under the bar. */
export const BUCKET_FACT: Record<RecoveryBucketKey, string> = {
  open: 'left to dispute',
  awaiting: 'waiting',
  collected: 'recovered',
  notRecovered: 'not recovered',
  notDisputed: 'not disputed',
}

const short = (iso: string) => fmtDateShort(new Date(iso + 'T00:00:00'))

/** Days since the earliest waiting finding was sent, with its send date. */
function longestWait(rows: readonly OutcomeRow[], now: Date): { days: number; sent: Date } | null {
  let best: { days: number; sent: Date } | null = null
  for (const row of rows) {
    if (findingPhase(row) !== 'waiting') continue
    const sent = sentDate(row)
    if (!sent) continue
    const days = daysSince(sent, now)
    if (!best || days > best.days) best = { days, sent }
  }
  return best
}

const INF = Number.MAX_SAFE_INTEGER
const some = (n: number) => n > 0.005

/** One memo's tracker row: the money that needs you, where the rest is, the one date that matters. */
export function memoRowView(
  m: CreditMemoSummary,
  ctx: {
    rows: readonly OutcomeRow[]
    /** The unsent dispute draft (golden memo only). */
    draft: DraftSelection | null
    downloadedIds: readonly string[]
    now: Date
    /** Position in the source list, for a stable order. */
    index: number
  },
): MemoRowView {
  const { rows, draft, downloadedIds, now, index } = ctx
  const rs = deriveReportState(m, downloadedIds)
  const base = {
    id: m.id,
    provider: m.provider,
    period: m.period,
    chip: null,
    allClear: false,
    hero: null,
    sub: null,
    totalN: 0,
    buckets: null,
    facts: [],
    factsText: null,
    status: null,
    target: null,
    deadline: null,
    pastDeadlineN: 0,
    pastOnly: false,
    waitDays: null,
    waitSince: null,
    detailAvailable: m.detailAvailable,
    demoLabel: m.id === 'CM-2026-0801' ? null : m.detailAvailable ? 'Source-backed demo' : 'Demo placeholder',
    index,
  }

  if (m.allNoVariance) {
    const audited = (m.invoices ?? 0) + (m.invoicesNoVariance ?? 0)
    return { ...base, place: 'finished', allClear: true, sub: `${plural(audited, 'invoice')} audited` }
  }

  const st = rs.report === 'generating' || !rows.length ? null : memoStatus(rows, { draft, now })
  if (!st) return { ...base, place: 'processing' }

  const buckets = recoveryBuckets(rows)
  const totalN = r2(RECOVERY_BUCKETS.reduce((s, b) => s + buckets[b.key], 0))
  // "New" means nothing has been done with the memo yet.
  const acted = !rs.isNew || st.hasDraft || rows.some((r) => r.pursuit === 'pursued' || r.pursuit === 'excluded' || r.prepared)
  const chip = rs.isUpdated ? 'Updated' : acted ? null : 'New'
  const wholeMemo = rows.some((r) => r.wholeMemo)
  const wait = longestWait(rows, now)
  const prepared = st.prepared.count > 0
  const sentAny = rows.some((r) => r.pursuit === 'pursued')

  const open = buckets.open
  // Past-deadline money stays Left to dispute, said once under the number.
  const pastN = st.pastDeadline.amountN
  const pastOnly = some(open) && !some(open - pastN)
  const baseSub = some(totalN - open)
    ? `of ${fmtMoney(totalN)} overcharged`
    : wholeMemo
      ? 'The complete credit memo'
      : [plural(rows.length, 'finding'), m.orders != null ? plural(m.orders, 'package') : null].filter(Boolean).join(' · ')
  const sub = some(pastN) ? `${baseSub} · ${pastOnly ? 'all' : fmtMoney(pastN)} past the deadline` : baseSub

  // The rest of the memo, once each, in bar order.
  const facts = RECOVERY_BUCKETS.filter((b) => b.key !== 'open' && some(buckets[b.key])).map((b) => ({ key: b.key, valueN: buckets[b.key] }))
  const factsText = facts.length ? null : 'Nothing sent or recovered yet'

  // What has been done, and what's next — the row's status.
  // The next live deadline; else, when everything open is past it, say so.
  const deadlineLine =
    some(open) && st.nextDeadline && st.daysLeft != null
      ? `Dispute by ${short(st.nextDeadline)} · ${countdownText(st.daysLeft).toLowerCase()}`
      : pastOnly && st.pastDeadline.deadline
        ? `Past the dispute deadline (${short(st.pastDeadline.deadline)})`
        : null
  const preparedAt = rows.find((r) => r.prepared)?.preparedAt
  const activeDisputes = new Set(rows.filter((r) => findingPhase(r) === 'waiting').map((r) => r.pursuedTs ?? r.pursuedAt ?? r.id)).size
  const lastAnswer = rows.map((r) => r.collection?.date).filter((d): d is string => !!d).sort().pop()
  const status: RowStatus = prepared
    ? {
        tone: 'attention',
        icon: 'prepared',
        label: 'Email prepared, not sent',
        detail: [preparedAt ? `Prepared ${fmtDateShort(new Date(preparedAt))} · mark it sent on the memo page` : 'Mark it sent on the memo page', deadlineLine].filter(
          (x): x is string => !!x,
        ),
      }
    : st.hasDraft
      ? {
          tone: 'attention',
          icon: 'draft',
          label: 'Dispute ready, not sent',
          detail: [`${plural(st.selected.count, 'finding')} selected${st.draftDate ? ` ${st.draftDate}` : ''}`, deadlineLine].filter((x): x is string => !!x),
        }
      : some(buckets.awaiting)
        ? {
            tone: 'info',
            icon: 'active',
            label: activeDisputes > 1 ? `${activeDisputes} active disputes` : 'Active dispute',
            detail: [
              wait ? `Sent ${fmtDateShort(wait.sent)} · ${wait.days <= 0 ? 'today' : `${plural(wait.days, 'day')} ago`}` : null,
              deadlineLine ? (pastOnly ? `Still to dispute: ${deadlineLine.charAt(0).toLowerCase()}${deadlineLine.slice(1)}` : `Still to ${deadlineLine.charAt(0).toLowerCase()}${deadlineLine.slice(1)}`) : null,
            ].filter((x): x is string => !!x),
          }
        : some(open)
          ? { tone: 'neutral', icon: 'open', label: 'Not disputed yet', detail: [deadlineLine ?? 'No deadline set'] }
          : lastAnswer
            ? { tone: 'success', icon: 'closed', label: 'Closed', detail: [`Last answer ${short(lastAnswer)}`] }
            : // Only a decision closes an undisputed memo; the calendar never does.
              { tone: 'muted', icon: 'skipped', label: 'Closed, not disputed', detail: ['Your team chose not to dispute'] }

  // "Check details" opens the memo page on the part that matters — never a
  // dialog. Answers to record come before findings that are past their deadline.
  const findingsTarget: RowTarget = wholeMemo ? null : 'findings'
  const target: RowTarget = prepared
    ? 'prepared'
    : some(open - pastN)
      ? findingsTarget
      : some(buckets.awaiting)
        ? 'outcomes'
        : some(open)
          ? findingsTarget
          : sentAny
            ? 'dispute'
            : null

  return {
    ...base,
    place: some(open) || some(buckets.awaiting) ? 'list' : 'finished',
    chip,
    hero: { kind: 'open', label: 'Left to dispute', valueN: open },
    sub,
    totalN,
    buckets,
    facts,
    factsText,
    status,
    target,
    deadline: some(open) ? st.nextDeadline : null,
    pastDeadlineN: pastN,
    pastOnly,
    waitDays: wait?.days ?? null,
    waitSince: wait?.sent ?? null,
  }
}

const cmpKeys = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const deadlineKey = (r: MemoRowView) => (r.deadline ? new Date(r.deadline + 'T00:00:00').getTime() : INF)

/** "value": most left to dispute (on time) first, then most waiting.
 *  "deadline": soonest deadline first, then the longest wait. Either way,
 *  memos with nothing to do but past-deadline findings come last (option D). */
function sortKey(r: MemoRowView, sort: TrackerSort): number[] {
  const b = r.buckets
  const stale = r.pastOnly && !some(b?.awaiting ?? 0) ? 1 : 0
  const liveOpen = (b?.open ?? 0) - r.pastDeadlineN
  if (sort === 'value') return [stale, some(liveOpen) ? 0 : 1, -liveOpen, -(b?.awaiting ?? 0), -(b?.open ?? 0), r.index]
  return [stale, deadlineKey(r), -(r.waitDays ?? 0), -liveOpen, -(b?.open ?? 0), r.index]
}

/** The list (sorted) and the finished memos (biggest recovered first). */
export function sortRows(rows: readonly MemoRowView[], sort: TrackerSort = 'value'): { list: MemoRowView[]; finished: MemoRowView[] } {
  const list = rows.filter((r) => r.place === 'list').sort((a, b) => cmpKeys(sortKey(a, sort), sortKey(b, sort)))
  const finished = rows
    .filter((r) => r.place === 'finished')
    .sort((a, b) => cmpKeys([-(a.buckets?.collected ?? 0), a.allClear ? 1 : 0, a.index], [-(b.buckets?.collected ?? 0), b.allClear ? 1 : 0, b.index]))
  return { list, finished }
}

// ---------- summary --------------------------------------------------------------

export interface TrackerSummary {
  totalN: number
  buckets: RecoveryBuckets
  /** Memos with overcharges (all-clear and in-audit memos don't count). */
  memoCount: number
  toDispute: { memos: number; nextDeadline: string | null; daysLeft: number | null; pastDeadline: { amountN: number; memos: number } }
  waiting: { memos: number; oldestSent: string | null }
  /** Recovered ÷ (recovered + not recovered); null before any answer. */
  recoveryRate: number | null
}

/** "Where your money is": the rows added up, so the summary always matches the list below it. */
export function trackerSummary(rows: readonly MemoRowView[], now: Date): TrackerSummary {
  const buckets: RecoveryBuckets = { open: 0, awaiting: 0, collected: 0, notRecovered: 0, notDisputed: 0 }
  const withMoney = rows.filter((r) => r.buckets && some(r.totalN))
  for (const r of withMoney) for (const b of RECOVERY_BUCKETS) buckets[b.key] = r2(buckets[b.key] + (r.buckets?.[b.key] ?? 0))
  const open = withMoney.filter((r) => some(r.buckets?.open ?? 0))
  const nextDeadline = open.map((r) => r.deadline).filter((d): d is string => !!d).sort()[0] ?? null
  const waiting = withMoney.filter((r) => some(r.buckets?.awaiting ?? 0))
  const oldest = waiting.map((r) => r.waitSince).filter((d): d is Date => !!d).sort((x, y) => x.getTime() - y.getTime())[0]
  const answered = buckets.collected + buckets.notRecovered
  return {
    totalN: r2(RECOVERY_BUCKETS.reduce((s, b) => s + buckets[b.key], 0)),
    buckets,
    memoCount: withMoney.length,
    toDispute: {
      memos: open.length,
      nextDeadline,
      daysLeft: nextDeadline ? daysUntilDeadline(nextDeadline, now) : null,
      pastDeadline: { amountN: r2(open.reduce((s, r) => s + r.pastDeadlineN, 0)), memos: open.filter((r) => some(r.pastDeadlineN)).length },
    },
    waiting: {
      memos: waiting.length,
      oldestSent: oldest ? fmtDateShort(oldest) : null,
    },
    recoveryRate: some(answered) ? buckets.collected / answered : null,
  }
}

export { short as shortDate }
export type { MemoStatus }

// ---------- outcomes tab: dispositions & donut -------------------------------

export type DispositionKey = RecoveryBucketKey

export type DispositionAmounts = Record<DispositionKey, number>

export function dispositionAmounts(rows: readonly OutcomeRow[]): DispositionAmounts {
  return recoveryBuckets(rows)
}

export function dispositionMatch(g: OutcomeRow, key: DispositionKey): boolean {
  return bucketMatch(g, key)
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

export function dispositionDonut(rows: readonly OutcomeRow[]): DonutData {
  const amts = dispositionAmounts(rows)
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
