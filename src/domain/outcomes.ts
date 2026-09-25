/** Credit-outcome derivations: eligibility, per-finding status, the one memo
 *  status every screen shows, the money buckets that reconcile to the total
 *  identified, and the tracker's outcome summaries. Started as a port of
 *  template ~7508–7614; Phase 1 of the dispute-flow plan (DESIGN-SYSTEM.md)
 *  made it the single source for dispute status. */

import type { Collection, CollectionStatus, DisputeState, OutcomeGroup } from './types'
import { fmtMoney, r2 } from './money'
import { daysUntilDeadline, deadlineCountdown, fmtDateLong } from './dates'

type Groupish = DisputeState & { amountN?: number | null; threePl?: string }

/** A group can still be disputed: already pursued, no deadline, or before it. */
export function groupEligible(g: Groupish, now: Date): boolean {
  if (g.pursuit === 'pursued') return true
  if (!g.disputeDeadline) return true
  return daysUntilDeadline(g.disputeDeadline, now) >= 0
}

/** The dispute window closed before the group was pursued. A finding in a
 *  prepared email is never Expired until the customer says whether it was
 *  sent (decision, 2026-09-25). */
export function groupExpired(g: Groupish, now: Date): boolean {
  return g.pursuit !== 'pursued' && !g.prepared && !groupEligible(g, now)
}

/** Reserved by an email prepared but not confirmed as sent. */
export function groupPrepared(g: Groupish): boolean {
  return !!g.prepared && g.pursuit !== 'pursued'
}

// Status wording is plain language, pending PM confirmation (DESIGN-SYSTEM.md,
// "Parcel dispute flow — Phase 2"); the keys keep their original meaning.
export const COLLECTION_LABELS: Record<CollectionStatus, string> = {
  awaiting: 'Waiting on Biller',
  full: 'Fully collected',
  partial: 'Partly collected',
  not_issued: 'Denied',
}

/** A new collection outcome for something disputed for `pursuedN`. A partial
 *  collection equal to the full amount is recorded as fully collected. */
export function outcomeCollection(
  status: CollectionStatus,
  pursuedN: number,
  opts: { amountN?: number; date?: string | null; reason?: string } = {},
): Collection {
  const amt = opts.amountN ?? 0
  const final: CollectionStatus = status === 'partial' && Math.abs(amt - pursuedN) < 0.005 ? 'full' : status
  return {
    status: final,
    amountN: final === 'full' ? pursuedN : final === 'not_issued' ? 0 : final === 'partial' ? r2(amt) : null,
    date: opts.date ?? null,
    reason: final === 'not_issued' || final === 'partial' ? (opts.reason ?? '') : '',
    history: [],
  }
}

/** Amount recorded as collected on a pursued group (full or partial). */
function collectedOf(g: Groupish): number {
  const c = g.collection
  if (g.pursuit !== 'pursued' || !c) return 0
  if (c.status === 'full') return c.amountN ?? g.amountN ?? 0
  if (c.status === 'partial') return Math.min(c.amountN ?? 0, g.amountN ?? 0)
  return 0
}

// ---------- Per-finding status line ----------------------------------------

export type GroupStatusKey =
  | 'eligible'
  | 'awaiting_outcome'
  | 'fully_collected'
  | 'partly_collected'
  | 'declined'
  | 'not_pursued'
  | 'expired'
  | 'prepared'

export interface GroupStatusLine {
  key: GroupStatusKey
  label: string
  secondary: string
  actionLabel?: string
  showAction: boolean
  subtleAction?: boolean
  muted?: boolean
}

export const STATUS_LABELS: Record<GroupStatusKey, string> = {
  eligible: 'Ready to dispute',
  awaiting_outcome: COLLECTION_LABELS.awaiting,
  fully_collected: COLLECTION_LABELS.full,
  partly_collected: COLLECTION_LABELS.partial,
  declined: COLLECTION_LABELS.not_issued,
  not_pursued: 'Won’t pursue',
  expired: 'Expired',
  prepared: 'In a prepared email',
}

const joinParts = (parts: (string | null | false | undefined)[]) =>
  parts.filter(Boolean).join(' · ')

function deadlineText(g: Groupish, now: Date): string {
  return g.disputeDeadline
    ? `Dispute by ${fmtDateLong(g.disputeDeadline)} · ${deadlineCountdown(g.disputeDeadline, now)}`
    : ''
}

export function groupStatusLine(
  g: Groupish & { inDisputeSel?: boolean },
  now: Date,
): GroupStatusLine {
  if (g.pursuit === 'pursued') {
    const c = g.collection
    const sentLine = `Sent to ${g.threePl || 'Biller'}` + (g.pursuedAt ? ` on ${g.pursuedAt}` : '')
    const on = c?.date ? fmtDateLong(c.date) : null
    const edit = { actionLabel: 'Edit outcome', showAction: true }
    if (c?.status === 'full')
      return {
        key: 'fully_collected',
        label: STATUS_LABELS.fully_collected,
        secondary: joinParts([sentLine, on ? `Collected ${on}` : 'Collected']),
        ...edit,
      }
    if (c?.status === 'partial') {
      const collected = collectedOf(g)
      const notRecovered = r2((g.amountN ?? 0) - collected)
      return {
        key: 'partly_collected',
        label: STATUS_LABELS.partly_collected,
        secondary: joinParts([
          sentLine,
          `${fmtMoney(collected)} collected`,
          notRecovered > 0.005 && `${fmtMoney(notRecovered)} not recovered`,
          on,
        ]),
        ...edit,
      }
    }
    if (c?.status === 'not_issued')
      return {
        key: 'declined',
        label: STATUS_LABELS.declined,
        secondary: joinParts([sentLine, on && `Updated ${on}`]),
        ...edit,
      }
    return {
      key: 'awaiting_outcome',
      label: STATUS_LABELS.awaiting_outcome,
      secondary: sentLine,
      actionLabel: 'Update outcome',
      showAction: true,
    }
  }

  // Reserved until the customer says whether the prepared email was sent.
  if (groupPrepared(g)) {
    return {
      key: 'prepared',
      label: STATUS_LABELS.prepared,
      secondary: joinParts(['Not confirmed as sent', deadlineText(g, now)]),
      showAction: false,
    }
  }
  // A customer decision is never relabelled Expired (product note n359);
  // it can be undone only while the window is open (n360).
  if (g.pursuit === 'excluded') {
    const open = groupEligible(g, now)
    return {
      key: 'not_pursued',
      label: STATUS_LABELS.not_pursued,
      muted: true,
      secondary: joinParts(['You chose not to pursue this', open && deadlineText(g, now)]),
      actionLabel: 'Undo',
      showAction: open,
      subtleAction: open,
    }
  }
  if (groupExpired(g, now)) {
    return {
      key: 'expired',
      label: STATUS_LABELS.expired,
      muted: true,
      secondary: joinParts([
        `Dispute window closed ${fmtDateLong(g.disputeDeadline)}`,
        g.amountN != null && `${fmtMoney(g.amountN)} not disputed`,
      ]),
      showAction: false,
    }
  }
  return {
    key: 'eligible',
    label: STATUS_LABELS.eligible,
    secondary: joinParts([g.inDisputeSel && 'Included in dispute', deadlineText(g, now)]),
    actionLabel: 'Won’t pursue',
    showAction: true,
    subtleAction: true,
  }
}

// ---------- Finding phase -----------------------------------------------------

/** Where a finding sits in the customer's work: still open to dispute,
 *  waiting on the Biller, or closed (collected, partly collected, declined,
 *  not pursued, or expired). */
export type FindingPhase = 'open' | 'waiting' | 'closed'

export function findingPhase(g: Groupish, now: Date): FindingPhase {
  if (g.pursuit === 'pursued')
    return !g.collection || g.collection.status === 'awaiting' ? 'waiting' : 'closed'
  if (g.pursuit === 'excluded') return 'closed'
  return groupExpired(g, now) ? 'closed' : 'open'
}

// ---------- Recovery buckets -------------------------------------------------

/** Five non-overlapping money buckets; together they equal the total
 *  identified. A partly collected finding splits across Collected and Not
 *  recovered (partly collected is final — decision 5). */
export type RecoveryBucketKey = 'open' | 'awaiting' | 'collected' | 'notRecovered' | 'notDisputed'

export type RecoveryBuckets = Record<RecoveryBucketKey, number>

export const RECOVERY_BUCKETS: { key: RecoveryBucketKey; label: string }[] = [
  { key: 'open', label: 'Left to dispute' },
  { key: 'awaiting', label: 'Waiting on Biller' },
  { key: 'collected', label: 'Recovered' },
  { key: 'notRecovered', label: 'Not recovered' },
  { key: 'notDisputed', label: 'Not disputed' },
]

function itemBuckets(g: Groupish, now: Date): Partial<RecoveryBuckets> {
  const amt = g.amountN ?? 0
  if (g.pursuit !== 'pursued')
    return findingPhase(g, now) === 'open' ? { open: amt } : { notDisputed: amt }
  switch (g.collection?.status) {
    case 'full':
      return { collected: amt }
    case 'not_issued':
      return { notRecovered: amt }
    case 'partial': {
      const collected = collectedOf(g)
      return { collected, notRecovered: r2(amt - collected) }
    }
    default:
      return { awaiting: amt }
  }
}

export function recoveryBuckets(items: readonly Groupish[], now: Date): RecoveryBuckets {
  const out: RecoveryBuckets = { open: 0, awaiting: 0, collected: 0, notRecovered: 0, notDisputed: 0 }
  for (const g of items) {
    const b = itemBuckets(g, now)
    for (const k of Object.keys(b) as RecoveryBucketKey[]) out[k] += b[k] ?? 0
  }
  for (const k of Object.keys(out) as RecoveryBucketKey[]) out[k] = r2(out[k])
  return out
}

/** Whether an item carries money in a bucket (table filtering by slice). */
export function bucketMatch(g: Groupish, key: RecoveryBucketKey, now: Date): boolean {
  return (itemBuckets(g, now)[key] ?? 0) > 0.005
}

// ---------- Memo status -------------------------------------------------------

export type MemoStatusKey = 'ready' | 'waiting' | 'done'

export const MEMO_STATUS_LABELS: Record<MemoStatusKey, string> = {
  ready: 'Ready to dispute',
  waiting: 'Waiting on Biller',
  done: 'Done',
}

interface CountAmount {
  count: number
  amountN: number
}

export interface MemoStatus {
  key: MemoStatusKey
  label: string
  total: CountAmount
  open: CountAmount
  waiting: CountAmount
  closed: CountAmount
  /** Open findings selected in the unsent dispute draft. */
  selected: CountAmount
  /** Open findings reserved by a prepared email, not confirmed as sent. */
  prepared: CountAmount
  hasDraft: boolean
  draftDate: string | null
  collectedN: number
  notRecoveredN: number
  /** Earliest deadline among open findings (ISO date), and days left to it. */
  nextDeadline: string | null
  daysLeft: number | null
}

/** The unsent dispute draft: findings not in `excludedIds` are selected. */
export interface DraftSelection {
  excludedIds: readonly string[]
  draftDate: string | null
}

/** The one memo-level dispute status, shared by the tracker, the memo page,
 *  and Credit outcomes. Null when there is nothing to dispute. Without a
 *  draft, nothing is selected. Urgency is the prototype's deadline countdown
 *  on each finding (`deadlineUrgency`), not a status of its own. */
export function memoStatus(
  items: readonly (Groupish & { id: string })[],
  ctx: { draft?: DraftSelection | null; now: Date },
): MemoStatus | null {
  if (!items.length) return null
  const { draft = null, now } = ctx
  const tally = (arr: readonly Groupish[]): CountAmount => ({
    count: arr.length,
    amountN: r2(arr.reduce((s, g) => s + (g.amountN ?? 0), 0)),
  })
  const open = items.filter((g) => findingPhase(g, now) === 'open')
  const waiting = items.filter((g) => findingPhase(g, now) === 'waiting')
  const closed = items.filter((g) => findingPhase(g, now) === 'closed')
  const prepared = open.filter(groupPrepared)
  const selected = draft ? open.filter((g) => !groupPrepared(g) && !draft.excludedIds.includes(g.id)) : []
  const deadlines = open.map((g) => g.disputeDeadline).filter((d): d is string => !!d).sort()
  const nextDeadline = deadlines[0] ?? null
  const daysLeft = nextDeadline ? daysUntilDeadline(nextDeadline, now) : null
  const buckets = recoveryBuckets(items, now)

  const key: MemoStatusKey = open.length ? 'ready' : waiting.length ? 'waiting' : 'done'
  return {
    key,
    label: MEMO_STATUS_LABELS[key],
    total: tally(items),
    open: tally(open),
    waiting: tally(waiting),
    closed: tally(closed),
    selected: tally(selected),
    prepared: tally(prepared),
    hasDraft: selected.length > 0,
    draftDate: selected.length > 0 ? (draft?.draftDate ?? null) : null,
    collectedN: buckets.collected,
    notRecoveredN: buckets.notRecovered,
    nextDeadline,
    daysLeft,
  }
}

// ---------- One sent dispute ----------------------------------------------------

export type DisputeStatusKey = 'awaiting' | 'partly_recorded' | 'done'

export const DISPUTE_STATUS_LABELS: Record<DisputeStatusKey, string> = {
  awaiting: 'Waiting on Biller',
  partly_recorded: 'Some outcomes recorded',
  done: 'Done',
}

/** Status of one sent dispute from the collection outcomes of what it covered. */
export function disputeStatus(collections: readonly (Collection | null)[]): DisputeStatusKey {
  const waiting = collections.filter((c) => !c || c.status === 'awaiting').length
  if (waiting === 0) return 'done'
  return waiting === collections.length ? 'awaiting' : 'partly_recorded'
}

// ---------- Tracker helpers -------------------------------------------------------

/** Credits the customer has recorded as received (decision 8: customer-
 *  reported until Implentio ingests Biller credit records). */
export function creditsRealized(rows: readonly Groupish[]): number {
  return r2(rows.reduce((s, g) => s + collectedOf(g), 0))
}

/** When a waiting finding was sent. */
export function sentDate(g: Groupish): Date | null {
  const raw = g.pursuedTs ?? g.pursuedAt
  const d = raw ? new Date(raw) : null
  return d && !isNaN(d.getTime()) ? d : null
}

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
  const collectedAmtOf = (g: OutcomeGroup) => g.collection?.amountN ?? 0
  const pursuedRows = rows.filter((g) => g.pursuit === 'pursued')
  const eligibleRows = rows.filter((g) => g.pursuit !== 'pursued')
  const pursuedAmt = sum(pursuedRows)
  const collectedAmt = r2(pursuedRows.reduce((a, g) => a + collectedAmtOf(g), 0))
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
      partial: cnt(withStatus('partial'), collectedAmtOf),
      full: cnt(withStatus('full'), collectedAmtOf),
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
