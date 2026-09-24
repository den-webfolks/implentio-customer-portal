/** Credit-outcome derivations: eligibility, per-group status, memo rollup,
 *  and the tracker's outcome summaries. Ports template ~7508–7614 with
 *  semantic keys instead of inline CSS (styling belongs to components). */

import type { Collection, DisputeState, OutcomeGroup } from './types'
import { fmtMoney, r2 } from './money'
import { deadlineCountdown, fmtDateLong } from './dates'

type Groupish = DisputeState & { amountN?: number | null; threePl?: string }

/** A group can still be disputed: already pursued, no deadline, or before it. */
export function groupEligible(g: Groupish, now: Date): boolean {
  if (g.pursuit === 'pursued') return true
  if (!g.disputeDeadline) return true
  return new Date(g.disputeDeadline + 'T23:59:59').getTime() >= now.getTime()
}

export function groupExpired(g: Groupish, now: Date): boolean {
  return g.pursuit !== 'pursued' && !groupEligible(g, now)
}

// ---------- Per-group status line (outcomes ledger) ------------------------

export type GroupStatusKey =
  | 'eligible'
  | 'awaiting_outcome'
  | 'fully_collected'
  | 'partly_collected'
  | 'declined'
  | 'not_pursued'

export interface GroupStatusLine {
  key: GroupStatusKey
  label: string
  secondary: string
  actionLabel?: string
  showAction: boolean
  subtleAction?: boolean
  muted?: boolean
}

const STATUS_LABELS: Record<GroupStatusKey, string> = {
  eligible: 'Eligible to pursue',
  awaiting_outcome: 'Awaiting outcome',
  fully_collected: 'Fully collected',
  partly_collected: 'Partly collected',
  declined: 'Biller declined',
  not_pursued: 'Not pursued',
}

export function groupStatusLine(
  g: Groupish & { inDisputeSel?: boolean },
  now: Date,
): GroupStatusLine {
  if (g.pursuit === 'pursued') {
    const c = g.collection
    const sentLine = `Sent to ${g.threePl || 'Biller'}` + (g.pursuedAt ? ` on ${g.pursuedAt}` : '')
    if (c?.status === 'full')
      return {
        key: 'fully_collected',
        label: STATUS_LABELS.fully_collected,
        secondary: `${sentLine} · Collected ${fmtDateLong(c.date)}`,
        actionLabel: 'Edit outcome',
        showAction: true,
      }
    if (c?.status === 'partial')
      return {
        key: 'partly_collected',
        label: STATUS_LABELS.partly_collected,
        secondary: `${sentLine} · ${fmtMoney(c.amountN ?? 0)} collected ${fmtDateLong(c.date)}`,
        actionLabel: 'Edit outcome',
        showAction: true,
      }
    if (c?.status === 'not_issued')
      return {
        key: 'declined',
        label: STATUS_LABELS.declined,
        secondary: `${sentLine} · Updated ${fmtDateLong(c.date)}`,
        actionLabel: 'Edit outcome',
        showAction: true,
      }
    return {
      key: 'awaiting_outcome',
      label: STATUS_LABELS.awaiting_outcome,
      secondary: sentLine,
      actionLabel: 'Update outcome',
      showAction: true,
    }
  }

  const deadlineText = g.disputeDeadline
    ? `Dispute by ${fmtDateLong(g.disputeDeadline)} · ${deadlineCountdown(g.disputeDeadline, now)}`
    : ''
  if (g.pursuit === 'excluded') {
    return {
      key: 'not_pursued',
      label: STATUS_LABELS.not_pursued,
      muted: true,
      secondary:
        deadlineText +
        (g.excludedRequestDate ? ` · Excluded from the ${g.excludedRequestDate} request` : ''),
      actionLabel: 'Include in another request',
      showAction: true,
      subtleAction: true,
    }
  }
  if (g.inDisputeSel) {
    return {
      key: 'eligible',
      label: STATUS_LABELS.eligible,
      secondary: `Included in dispute package · ${deadlineText}`,
      showAction: false,
    }
  }
  return { key: 'eligible', label: STATUS_LABELS.eligible, secondary: deadlineText, showAction: false }
}

// ---------- Dispute pill (findings list) -----------------------------------

export type DisputePillTone = 'pursued' | 'expired' | 'neutral' | 'warn' | 'urgent'

export interface DisputePill {
  label: string
  sub: string
  tone: DisputePillTone
  expired: boolean
  expl?: string
}

export function disputePill(g: Groupish, now: Date): DisputePill {
  if (g.pursuit === 'pursued') {
    return {
      label: `Pursued with ${g.threePl || 'Biller'}`,
      sub:
        (g.pursuedAt ? `Sent ${g.pursuedAt}` : '') +
        (g.amountN != null ? ` · ${fmtMoney(g.amountN)} pursued` : ''),
      tone: 'pursued',
      expired: false,
    }
  }
  if (groupExpired(g, now)) {
    return {
      label: 'Expired',
      sub:
        `Dispute window closed ${fmtDateLong(g.disputeDeadline)}` +
        (g.amountN != null ? ` · ${fmtMoney(g.amountN)} not pursued` : ''),
      tone: 'expired',
      expired: true,
      expl: `This finding was not pursued before the applicable ${g.threePl || 'Biller'} dispute window closed on ${fmtDateLong(g.disputeDeadline)}.`,
    }
  }
  if (!g.disputeDeadline) return { label: 'Eligible', sub: '', tone: 'neutral', expired: false }
  const days = Math.ceil(
    (new Date(g.disputeDeadline + 'T23:59:59').getTime() - now.getTime()) / 86400000,
  )
  const tone: DisputePillTone = days <= 3 ? 'urgent' : days <= 7 ? 'warn' : 'neutral'
  return {
    label: `Dispute by ${fmtDateLong(g.disputeDeadline)}`,
    sub: deadlineCountdown(g.disputeDeadline, now),
    tone,
    expired: false,
  }
}

// ---------- Collection pill -------------------------------------------------

/** Tones follow the design-system status mapping (DESIGN-SYSTEM.md). */
export interface CollectionPill {
  label: string
  tone: 'info' | 'attention' | 'success' | 'danger'
  sub: string
}

export function collectionPill(
  g: Groupish,
): CollectionPill | null {
  const c: Collection | null = g.collection
  if (g.pursuit !== 'pursued' || !c?.status) return null
  switch (c.status) {
    case 'awaiting':
      return { label: 'Awaiting outcome', tone: 'info', sub: '' }
    case 'full':
      return { label: 'Fully collected', tone: 'success', sub: `Collected on ${fmtDateLong(c.date)}` }
    case 'partial':
      return {
        label: 'Partly collected',
        tone: 'attention',
        sub: `${fmtMoney(c.amountN ?? 0)} collected · ${fmtMoney(r2((g.amountN ?? 0) - (c.amountN ?? 0)))} remaining · ${fmtDateLong(c.date)}`,
      }
    case 'not_issued':
      return {
        label: 'Biller declined',
        tone: 'danger',
        sub: c.date ? `Reported ${fmtDateLong(c.date)}` : '',
      }
  }
}

// ---------- Memo rollup ------------------------------------------------------

export type MemoRollupKey =
  | 'outcome_recorded'
  | 'pursued'
  | 'partially_pursued'
  | 'available'
  | 'expired'

export interface MemoRollup {
  key: MemoRollupKey
  label: string
}

export function memoRollupStatus(groups: readonly Groupish[], now: Date): MemoRollup | null {
  if (!groups.length) return null
  const pursued = groups.filter((g) => g.pursuit === 'pursued')
  const eligible = groups.filter((g) => g.pursuit !== 'pursued' && !groupExpired(g, now))
  const outcomeRecorded =
    pursued.length > 0 && pursued.every((g) => g.collection && g.collection.status !== 'awaiting')
  if (pursued.length === groups.length)
    return outcomeRecorded
      ? { key: 'outcome_recorded', label: 'Outcome recorded' }
      : { key: 'pursued', label: 'Pursued with Biller' }
  if (pursued.length > 0)
    return outcomeRecorded
      ? { key: 'outcome_recorded', label: 'Outcome recorded' }
      : { key: 'partially_pursued', label: 'Partially pursued' }
  if (eligible.length > 0) return { key: 'available', label: 'Available to pursue' }
  return { key: 'expired', label: 'Expired without action' }
}

// ---------- Tracker outcome summaries ---------------------------------------

export interface OutcomeCount {
  count: number
  amount: string
}

export interface OutcomesSummary {
  identified: string
  pursued: string
  eligible: string
  collected: string
  rate: string
  counts: {
    pursued: OutcomeCount
    eligible: OutcomeCount
    awaiting: OutcomeCount
    partial: OutcomeCount
    full: OutcomeCount
    notIssued: OutcomeCount
  }
  rows: (OutcomeGroup & { memoId: string; memoVersion: string })[]
}

export function outcomesSummary(
  rows: (OutcomeGroup & { memoId: string; memoVersion: string })[],
): OutcomesSummary {
  const sum = (arr: { amountN?: number | null }[]) =>
    r2(arr.reduce((a, g) => a + (g.amountN ?? 0), 0))
  const collectedOf = (g: OutcomeGroup) => g.collection?.amountN ?? 0
  const pursuedRows = rows.filter((g) => g.pursuit === 'pursued')
  const eligibleRows = rows.filter((g) => g.pursuit !== 'pursued')
  const pursuedAmt = sum(pursuedRows)
  const collectedAmt = r2(pursuedRows.reduce((a, g) => a + collectedOf(g), 0))
  const rate = pursuedAmt > 0 ? Math.round((collectedAmt / pursuedAmt) * 100) : 0
  const withStatus = (s: Collection['status']) =>
    pursuedRows.filter((g) => g.collection?.status === s)
  const cnt = (
    arr: (OutcomeGroup & { memoId: string; memoVersion: string })[],
    amtFn?: (g: OutcomeGroup) => number,
  ): OutcomeCount => ({
    count: arr.length,
    amount: fmtMoney(r2(arr.reduce((a, g) => a + (amtFn ? amtFn(g) : (g.amountN ?? 0)), 0))),
  })
  return {
    identified: fmtMoney(sum(rows)),
    pursued: fmtMoney(pursuedAmt),
    eligible: fmtMoney(sum(eligibleRows)),
    collected: fmtMoney(collectedAmt),
    rate: rate + '%',
    counts: {
      pursued: cnt(pursuedRows),
      eligible: cnt(eligibleRows),
      awaiting: cnt(withStatus('awaiting')),
      partial: cnt(withStatus('partial'), collectedOf),
      full: cnt(withStatus('full'), collectedOf),
      notIssued: cnt(withStatus('not_issued')),
    },
    rows,
  }
}

export interface Outcomes3plRow {
  threePl: string
  category: string
  pursuedN: number
  collectedN: number
  fullOrPartial: number
  notIssued: number
  reasons: { reason: string; group: string; threePl: string }[]
  pursued: string
  collected: string
  rate: string
}

export function outcomesBy3pl(rows: readonly OutcomeGroup[]): Outcomes3plRow[] {
  const map = new Map<string, Omit<Outcomes3plRow, 'pursued' | 'collected' | 'rate'>>()
  for (const g of rows.filter((g) => g.pursuit === 'pursued')) {
    const key = `${g.threePl || '—'} · ${g.category || g.title}`
    let m = map.get(key)
    if (!m) {
      m = {
        threePl: g.threePl || '—',
        category: g.category || g.title,
        pursuedN: 0,
        collectedN: 0,
        fullOrPartial: 0,
        notIssued: 0,
        reasons: [],
      }
      map.set(key, m)
    }
    const c = g.collection
    m.pursuedN += g.amountN ?? 0
    m.collectedN += c?.amountN ?? 0
    if (c?.status === 'full' || c?.status === 'partial') m.fullOrPartial++
    if (c?.status === 'not_issued') {
      m.notIssued++
      if (c.reason) m.reasons.push({ reason: c.reason, group: g.title, threePl: g.threePl })
    }
  }
  return [...map.values()].map((m) => ({
    ...m,
    pursued: fmtMoney(m.pursuedN),
    collected: fmtMoney(m.collectedN),
    rate: m.pursuedN > 0 ? Math.round((m.collectedN / m.pursuedN) * 100) + '%' : '—',
  }))
}
