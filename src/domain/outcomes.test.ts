import { describe, expect, it } from 'vitest'
import type { OutcomeGroup } from './types'
import {
  disputePill,
  groupEligible,
  groupExpired,
  groupStatusLine,
  memoRollupStatus,
  outcomesSummary,
} from './outcomes'
import { deriveReportState, classifyInvoice } from './memo'
import { fmtMoney, posMoney, r2 } from './money'
import { excelDate, deadlineCountdown } from './dates'

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

describe('status line', () => {
  it('maps collection statuses', () => {
    const pursued = { pursuit: 'pursued' as const, pursuedAt: 'Sep 8, 2026' }
    expect(
      groupStatusLine(
        group({
          ...pursued,
          collection: { status: 'full', amountN: 100, date: '2026-09-12', reason: '', history: [] },
        }),
        NOW,
      ),
    ).toMatchObject({ key: 'fully_collected', secondary: expect.stringContaining('Sent to QuickBox on Sep 8, 2026') })
    expect(groupStatusLine(group({ ...pursued, collection: { status: 'awaiting', amountN: null, date: null, reason: '', history: [] } }), NOW).key).toBe('awaiting_outcome')
    expect(groupStatusLine(group({ pursuit: 'excluded', excludedRequestDate: 'Sep 16, 2026' }), NOW)).toMatchObject({
      key: 'not_pursued',
      secondary: expect.stringContaining('Excluded from the Sep 16, 2026 request'),
    })
    expect(groupStatusLine(group({ disputeDeadline: '2026-09-20' }), NOW)).toMatchObject({
      key: 'eligible',
      secondary: 'Dispute by September 20, 2026 · 4 days remaining',
    })
  })
})

describe('dispute pill', () => {
  it('grades urgency by days remaining', () => {
    expect(disputePill(group({ disputeDeadline: '2026-09-19' }), NOW).tone).toBe('urgent')
    expect(disputePill(group({ disputeDeadline: '2026-09-23' }), NOW).tone).toBe('warn')
    expect(disputePill(group({ disputeDeadline: '2026-10-15' }), NOW).tone).toBe('neutral')
    expect(disputePill(group({ disputeDeadline: '2026-09-01' }), NOW)).toMatchObject({
      label: 'Expired',
      expired: true,
    })
  })
})

describe('memo rollup', () => {
  it('summarizes group mixes', () => {
    const pursued = group({ pursuit: 'pursued', collection: { status: 'full', amountN: 100, date: '2026-09-12', reason: '', history: [] } })
    const awaiting = group({ pursuit: 'pursued', collection: { status: 'awaiting', amountN: null, date: null, reason: '', history: [] } })
    const eligible = group({ disputeDeadline: '2026-10-01' })
    const expired = group({ disputeDeadline: '2026-05-01' })
    expect(memoRollupStatus([], NOW)).toBeNull()
    expect(memoRollupStatus([pursued], NOW)?.key).toBe('outcome_recorded')
    expect(memoRollupStatus([awaiting], NOW)?.key).toBe('pursued')
    expect(memoRollupStatus([pursued, eligible], NOW)?.key).toBe('outcome_recorded')
    expect(memoRollupStatus([awaiting, expired], NOW)?.key).toBe('partially_pursued')
    expect(memoRollupStatus([eligible, expired], NOW)?.key).toBe('available')
    expect(memoRollupStatus([expired], NOW)?.key).toBe('expired')
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

  it('renders deadline countdowns', () => {
    expect(deadlineCountdown('2026-09-20', NOW)).toBe('4 days remaining')
    expect(deadlineCountdown('2026-09-17', NOW)).toBe('1 day remaining')
    expect(deadlineCountdown('2026-09-16', NOW)).toBe('Due today')
  })
})
