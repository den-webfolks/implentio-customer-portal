import { describe, expect, it } from 'vitest'
import type { OutcomeGroup } from './types'
import {
  bucketMatch,
  creditsRealized,
  disputeStatus,
  findingPhase,
  groupEligible,
  groupExpired,
  groupStatusLine,
  memoStatus,
  needsUpdate,
  outcomesSummary,
  recoveryBuckets,
} from './outcomes'
import { deriveReportState, classifyInvoice } from './memo'
import { fmtMoney, posMoney, r2 } from './money'
import { excelDate, daysSince, daysUntilDeadline, deadlineCountdown } from './dates'

const NOW = new Date('2026-09-17T10:00:00-04:00')

const group = (over: Partial<OutcomeGroup>): OutcomeGroup => ({
  id: 'g',
  title: 'T',
  category: 'C',
  carrier: 'UPS',
  amountN: 100,
  threePl: 'QuickBox',
  pursuit: null,
  disputeDeadline: null,
  collection: null,
  ...over,
})

describe('eligibility', () => {
  it('pursued groups stay eligible past the deadline', () => {
    const g = group({ pursuit: 'pursued', disputeDeadline: '2026-01-01' })
    expect(groupEligible(g, NOW)).toBe(true)
    expect(groupExpired(g, NOW)).toBe(false)
  })

  it('unpursued groups expire after the deadline day ends', () => {
    expect(groupExpired(group({ disputeDeadline: '2026-09-16' }), NOW)).toBe(true)
    expect(groupExpired(group({ disputeDeadline: '2026-09-17' }), NOW)).toBe(false)
    expect(groupExpired(group({}), NOW)).toBe(false)
  })
})

const awaitingC = { status: 'awaiting' as const, amountN: null, date: null, reason: '', history: [] }
const fullC = (amountN: number) => ({ status: 'full' as const, amountN, date: '2026-09-12', reason: '', history: [] })
const partialC = (amountN: number) => ({ status: 'partial' as const, amountN, date: '2026-09-13', reason: '', history: [] })
const declinedC = { status: 'not_issued' as const, amountN: 0, date: '2026-09-14', reason: 'No', history: [] }
const sent = { pursuit: 'pursued' as const, pursuedAt: 'Sep 8, 2026', pursuedTs: '2026-09-08T16:24:00' }

describe('status line', () => {
  it('maps collection statuses', () => {
    expect(groupStatusLine(group({ ...sent, collection: fullC(100) }), NOW)).toMatchObject({
      key: 'fully_collected',
      secondary: 'Sent to QuickBox on Sep 8, 2026 · Collected September 12, 2026',
    })
    expect(groupStatusLine(group({ ...sent, collection: awaitingC }), NOW).key).toBe('awaiting_outcome')
    expect(groupStatusLine(group({ ...sent, collection: partialC(40) }), NOW).secondary).toBe(
      'Sent to QuickBox on Sep 8, 2026 · $40.00 collected · $60.00 not recovered · September 13, 2026',
    )
  })

  it('offers "Won’t pursue" on open findings with a calendar-day countdown', () => {
    expect(groupStatusLine(group({ disputeDeadline: '2026-09-20' }), NOW)).toMatchObject({
      key: 'eligible',
      secondary: 'Dispute by September 20, 2026 · 3 days remaining',
      actionLabel: 'Won’t pursue',
      subtleAction: true,
    })
  })

  it('labels a passed deadline Expired', () => {
    expect(groupStatusLine(group({ disputeDeadline: '2026-09-16' }), NOW)).toMatchObject({
      key: 'expired',
      label: 'Expired',
      secondary: 'Dispute window closed September 16, 2026 · $100.00 not disputed',
      showAction: false,
    })
  })

  it('keeps "Not pursued" after the deadline and only offers Undo while it is open', () => {
    expect(groupStatusLine(group({ pursuit: 'excluded', disputeDeadline: '2026-09-20' }), NOW)).toMatchObject({
      key: 'not_pursued',
      actionLabel: 'Undo',
      showAction: true,
    })
    expect(groupStatusLine(group({ pursuit: 'excluded', disputeDeadline: '2026-09-01' }), NOW)).toMatchObject({
      key: 'not_pursued',
      secondary: 'You chose not to pursue this',
      showAction: false,
    })
  })
})

describe('finding phase', () => {
  it('sorts findings into open / waiting / closed', () => {
    expect(findingPhase(group({ disputeDeadline: '2026-09-20' }), NOW)).toBe('open')
    expect(findingPhase(group({ ...sent, collection: awaitingC }), NOW)).toBe('waiting')
    expect(findingPhase(group({ ...sent, collection: partialC(10) }), NOW)).toBe('closed')
    expect(findingPhase(group({ ...sent, collection: declinedC }), NOW)).toBe('closed')
    expect(findingPhase(group({ pursuit: 'excluded' }), NOW)).toBe('closed')
    expect(findingPhase(group({ disputeDeadline: '2026-09-01' }), NOW)).toBe('closed')
  })
})

describe('recovery buckets', () => {
  const items = [
    group({ id: 'a', amountN: 500, disputeDeadline: '2026-10-01' }),
    group({ id: 'b', amountN: 300, ...sent, collection: awaitingC }),
    group({ id: 'c', amountN: 200, ...sent, collection: fullC(200) }),
    group({ id: 'd', amountN: 100, ...sent, collection: partialC(40) }),
    group({ id: 'e', amountN: 50, ...sent, collection: declinedC }),
    group({ id: 'f', amountN: 25, disputeDeadline: '2026-09-01' }),
    group({ id: 'g', amountN: 10, pursuit: 'excluded' }),
  ]

  it('splits money into buckets that add up to the total identified', () => {
    const b = recoveryBuckets(items, NOW)
    expect(b).toEqual({ open: 500, awaiting: 300, collected: 240, notRecovered: 110, notDisputed: 35 })
    const total = items.reduce((s, g) => s + g.amountN, 0)
    expect(b.open + b.awaiting + b.collected + b.notRecovered + b.notDisputed).toBeCloseTo(total, 2)
  })

  it('matches a partly collected finding in both Collected and Not recovered', () => {
    const d = items[3]!
    expect(bucketMatch(d, 'collected', NOW)).toBe(true)
    expect(bucketMatch(d, 'notRecovered', NOW)).toBe(true)
    expect(bucketMatch(d, 'awaiting', NOW)).toBe(false)
  })
})

describe('memo status', () => {
  const open = (id: string, deadline: string) => group({ id, disputeDeadline: deadline })

  it('is null with nothing to dispute', () => {
    expect(memoStatus([], { now: NOW })).toBeNull()
  })

  it('is Ready to dispute with open findings and reports the draft selection', () => {
    const items = [open('a', '2026-09-27'), open('b', '2026-09-30')]
    expect(memoStatus(items, { now: NOW })).toMatchObject({ key: 'ready', hasDraft: false })
    expect(memoStatus(items, { draft: { excludedIds: ['a', 'b'], draftDate: null }, now: NOW })).toMatchObject({
      key: 'ready',
      hasDraft: false,
      nextDeadline: '2026-09-27',
      daysLeft: 10,
    })
    expect(memoStatus(items, { draft: { excludedIds: ['b'], draftDate: 'Sep 16, 2026' }, now: NOW })).toMatchObject({
      key: 'ready',
      hasDraft: true,
      draftDate: 'Sep 16, 2026',
      selected: { count: 1, amountN: 100 },
    })
  })

  it('is Action needed when an open finding is due within 3 days, today included', () => {
    expect(memoStatus([open('a', '2026-09-17')], { now: NOW })?.key).toBe('action_needed')
    expect(memoStatus([open('a', '2026-09-19')], { now: NOW })?.key).toBe('action_needed')
    expect(memoStatus([open('a', '2026-09-20')], { now: NOW })?.key).toBe('ready')
  })

  it('is Waiting on Biller when nothing is open and outcomes are pending', () => {
    const items = [group({ id: 'a', ...sent, collection: awaitingC }), group({ id: 'b', ...sent, collection: fullC(100) })]
    expect(memoStatus(items, { now: NOW })).toMatchObject({ key: 'waiting', waiting: { count: 1 }, closed: { count: 1 } })
  })

  it('is Done once every finding is closed — partly collected counts as final', () => {
    const items = [
      group({ id: 'a', ...sent, collection: partialC(40) }),
      group({ id: 'b', ...sent, collection: declinedC }),
      group({ id: 'c', disputeDeadline: '2026-09-01' }),
      group({ id: 'd', pursuit: 'excluded' }),
    ]
    expect(memoStatus(items, { now: NOW })).toMatchObject({ key: 'done', collectedN: 40, notRecoveredN: 160 })
  })
})

describe('dispute status', () => {
  it('summarizes the outcomes of one send', () => {
    expect(disputeStatus([awaitingC, null])).toBe('awaiting')
    expect(disputeStatus([awaitingC, fullC(1)])).toBe('partly_recorded')
    expect(disputeStatus([partialC(1), declinedC])).toBe('done')
  })
})

describe('tracker helpers', () => {
  it('sums recorded credits', () => {
    expect(
      creditsRealized([
        group({ amountN: 9200, ...sent, collection: fullC(9200) }),
        group({ amountN: 4100, ...sent, collection: partialC(2500) }),
        group({ amountN: 1200, ...sent, collection: declinedC }),
        group({ amountN: 700 }),
      ]),
    ).toBe(11700)
  })

  it('flags week-old outcomes and close deadlines', () => {
    const rows = [
      group({ id: 'old', ...sent, collection: awaitingC }),
      group({ id: 'recent', pursuit: 'pursued', pursuedTs: '2026-09-15T08:55:00', collection: awaitingC }),
      group({ id: 'legacy', pursuit: 'pursued', pursuedAt: 'Aug 22, 2026', collection: awaitingC }),
      group({ id: 'soon', disputeDeadline: '2026-09-19' }),
      group({ id: 'later', disputeDeadline: '2026-09-27' }),
    ]
    expect(needsUpdate(rows, NOW).map((n) => [n.row.id, n.reason, n.days])).toEqual([
      ['old', 'waiting', 9],
      ['legacy', 'waiting', 26],
      ['soon', 'deadline', 2],
    ])
  })
})

describe('outcomes summary', () => {
  it('totals pursued/eligible/collected and rates', () => {
    const rows = [
      group({ pursuit: 'pursued', amountN: 9200, collection: { status: 'full', amountN: 9200, date: '2026-09-01', reason: '', history: [] } }),
      group({ pursuit: 'pursued', amountN: 4100, collection: { status: 'partial', amountN: 2500, date: '2026-09-03', reason: '', history: [] } }),
      group({ amountN: 3200 }),
    ].map((g, i) => ({ ...g, id: `g${i}`, memoId: 'CM-1', memoVersion: 'Version 1' }))
    const s = outcomesSummary(rows)
    expect(s.identified).toBe('$16,500.00')
    expect(s.pursued).toBe('$13,300.00')
    expect(s.eligible).toBe('$3,200.00')
    expect(s.collected).toBe('$11,700.00')
    expect(s.rate).toBe('88%')
    expect(s.counts.partial).toEqual({ count: 1, amount: '$2,500.00' })
  })
})

describe('memo derivations', () => {
  it('overlays download state on report state', () => {
    const memo = { id: 'CM-1', status: 'complete' as const, report: 'ready' as const }
    expect(deriveReportState(memo, [])).toMatchObject({ report: 'ready', isNew: true, canDownload: true })
    expect(deriveReportState(memo, ['CM-1'])).toMatchObject({ report: 'downloaded', isNew: false })
    expect(
      deriveReportState({ id: 'CM-2', status: 'processing', report: 'generating' }, ['CM-2']),
    ).toMatchObject({ report: 'generating', canDownload: false })
  })

  it('classifies invoices by net variance', () => {
    expect(classifyInvoice({ netN: 12.345 })).toEqual({
      kind: 'overcharge',
      resultLabel: 'Potential overcharge',
      varN: 12.35,
    })
    expect(classifyInvoice({ netN: -0.36 }).kind).toBe('undercharge')
    expect(classifyInvoice({ netN: 0.004 })).toMatchObject({ kind: 'ok', varN: 0 })
  })
})

describe('formatting', () => {
  it('formats money like the prototype', () => {
    expect(fmtMoney(9387.7)).toBe('$9,387.70')
    expect(fmtMoney(-10459.83)).toBe('-$10,459.83')
    expect(posMoney(-42)).toBe('$42.00')
    expect(r2(1.006)).toBe(1.01)
  })

  it('converts Excel serial dates', () => {
    expect(excelDate(46128)).toBe('Apr 16, 2026')
    expect(excelDate('not-a-number')).toBe('not-a-number')
    expect(excelDate(null)).toBe('—')
  })

  it('counts deadlines in calendar days', () => {
    expect(daysUntilDeadline('2026-09-20', NOW)).toBe(3)
    expect(daysUntilDeadline('2026-09-17', NOW)).toBe(0)
    expect(daysUntilDeadline('2026-09-16', NOW)).toBe(-1)
    expect(daysSince(new Date('2026-09-08T16:24:00'), NOW)).toBe(9)
    expect(deadlineCountdown('2026-09-20', NOW)).toBe('3 days remaining')
    expect(deadlineCountdown('2026-09-18', NOW)).toBe('1 day remaining')
    expect(deadlineCountdown('2026-09-17', NOW)).toBe('Due today')
  })
})
