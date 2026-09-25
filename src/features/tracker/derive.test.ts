import { describe, expect, it } from 'vitest'
import type { OutcomeRow } from '@/data/source'
import type { CreditMemoSummary } from '@/domain/types'
import { memoRowView, sortRows, trackerSummary } from './derive'

const NOW = new Date('2026-09-17T10:00:00-04:00')

const awaitingC = { status: 'awaiting' as const, amountN: null, date: null, reason: '', history: [] }
const fullC = (amountN: number) => ({ status: 'full' as const, amountN, date: '2026-09-12', reason: '', history: [] })
const sentSep8 = { pursuit: 'pursued' as const, pursuedTs: '2026-09-08T16:24:00' }
const sentSep15 = { pursuit: 'pursued' as const, pursuedTs: '2026-09-15T08:55:00' }

const memo = (over: Partial<CreditMemoSummary> = {}): CreditMemoSummary =>
  ({
    id: 'CM-1',
    provider: 'QuickBox',
    period: 'Apr 16 – Apr 30, 2026',
    status: 'complete',
    report: 'downloaded',
    detailAvailable: false,
    ...over,
  }) as CreditMemoSummary

const row = (id: string, over: Partial<OutcomeRow>): OutcomeRow => ({
  id,
  memoId: 'CM-1',
  memoVersion: 'Version 1',
  title: 'T',
  category: 'C',
  carrier: 'UPS',
  amountN: 100,
  threePl: 'QuickBox',
  pursuit: null,
  disputeDeadline: '2026-10-01',
  collection: null,
  ...over,
})

const view = (rows: OutcomeRow[], m = memo(), draft: { excludedIds: string[]; draftDate: string | null } | null = null) =>
  memoRowView(m, { rows, draft, downloadedIds: [m.id], now: NOW, index: 0 })

describe('tracker memo row', () => {
  it('always leads with the money left to dispute, and says it is not disputed yet', () => {
    const v = view([row('a', { disputeDeadline: '2026-09-19', amountN: 300 }), row('b', { amountN: 200 })], memo({ orders: 12 }))
    expect(v).toMatchObject({
      place: 'list',
      hero: { kind: 'open', label: 'Left to dispute', valueN: 500 },
      sub: '2 findings · 12 packages',
      facts: [],
      factsText: 'Nothing sent or recovered yet',
      status: { tone: 'neutral', label: 'Not disputed yet', detail: ['Dispute by Sep 19, 2026 · 2 days remaining'] },
      target: 'findings',
    })
  })

  it('lists the rest once each, and shows an active dispute with the deadline for the rest', () => {
    const v = view([
      row('open', { disputeDeadline: '2026-09-19', amountN: 35 }),
      row('won', { ...sentSep8, collection: fullC(9000), amountN: 9000 }),
      row('wait', { ...sentSep15, collection: awaitingC, amountN: 300 }),
    ])
    expect(v).toMatchObject({ hero: { valueN: 35 }, sub: 'of $9,335.00 overcharged', totalN: 9335 })
    expect(v.facts).toEqual([
      { key: 'awaiting', valueN: 300 },
      { key: 'collected', valueN: 9000 },
    ])
    expect(v.status).toEqual({
      tone: 'info',
      icon: 'active',
      label: 'Active dispute',
      detail: ['Sent Sep 15, 2026 · 2 days ago', 'Still to dispute by Sep 19, 2026 · 2 days remaining'],
    })
  })

  it('shows $0.00 left to dispute once everything is sent, with the active disputes', () => {
    const v = view([
      row('a', { ...sentSep8, collection: awaitingC, amountN: 2700 }),
      row('b', { ...sentSep15, collection: awaitingC, amountN: 100 }),
      row('c', { ...sentSep8, collection: fullC(100) }),
    ])
    expect(v).toMatchObject({
      place: 'list',
      hero: { label: 'Left to dispute', valueN: 0 },
      sub: 'of $2,900.00 overcharged',
      facts: [
        { key: 'awaiting', valueN: 2800 },
        { key: 'collected', valueN: 100 },
      ],
      status: { label: '2 active disputes', detail: ['Sent Sep 8, 2026 · 9 days ago'] },
      target: 'outcomes',
    })
  })

  it('shows a dispute that is ready but not sent, and a New chip only while nothing is done', () => {
    const draft = { excludedIds: ['b'], draftDate: 'Sep 16, 2026' }
    const v = memoRowView(memo({ report: 'ready' }), { rows: [row('a', {}), row('b', {})], draft, downloadedIds: [], now: NOW, index: 0 })
    expect(v).toMatchObject({
      chip: null,
      status: { tone: 'attention', label: 'Dispute ready, not sent', detail: ['1 finding selected Sep 16, 2026', 'Dispute by Oct 1, 2026 · 14 days remaining'] },
      target: 'findings',
    })
    const fresh = memoRowView(memo({ report: 'ready' }), { rows: [row('a', {})], draft: null, downloadedIds: [], now: NOW, index: 0 })
    expect(fresh.chip).toBe('New')
    const skipped = memoRowView(memo({ report: 'ready' }), { rows: [row('a', {}), row('b', { pursuit: 'excluded' })], draft: null, downloadedIds: [], now: NOW, index: 0 })
    expect(skipped.chip).toBeNull()
  })

  it('closes a memo once every finding is answered or past its deadline', () => {
    const v = view([row('a', { ...sentSep8, collection: fullC(100) }), row('b', { disputeDeadline: '2026-09-01', amountN: 50 })])
    expect(v).toMatchObject({
      place: 'finished',
      hero: { valueN: 0 },
      facts: [
        { key: 'collected', valueN: 100 },
        { key: 'notDisputed', valueN: 50 },
      ],
      status: { tone: 'success', label: 'Closed', detail: ['Last answer Sep 12, 2026'] },
      target: 'dispute',
    })
    expect(view([row('a', { disputeDeadline: '2026-09-01' })]).status).toMatchObject({ label: 'Closed, not disputed', detail: ['The deadline passed'] })
    expect(view([row('a', { pursuit: 'excluded' })]).status).toMatchObject({ detail: ['Your team chose not to dispute'] })
  })

  it('files an all-clear memo under Finished and a memo without findings yet as in audit', () => {
    expect(view([], memo({ allNoVariance: true, invoicesNoVariance: 32, invoices: 0 }))).toMatchObject({ place: 'finished', allClear: true, sub: '32 invoices audited', target: null })
    expect(view([], memo({ status: 'processing', report: 'generating' }))).toMatchObject({ place: 'processing' })
  })
})

describe('tracker memo row: prepared email', () => {
  it('says the email is prepared but not sent, and opens the memo on that card', () => {
    const v = view([
      row('a', { amountN: 9322.2, prepared: true, preparedAt: '2026-09-17T09:12:00', disputeDeadline: '2026-09-20' }),
      row('b', { amountN: 35.1, prepared: true, preparedAt: '2026-09-17T09:12:00', disputeDeadline: '2026-09-20' }),
      row('c', { amountN: 22.64 }),
    ])
    expect(v).toMatchObject({
      hero: { label: 'Left to dispute', valueN: 9379.94 },
      status: {
        tone: 'attention',
        label: 'Email prepared, not sent',
        detail: ['Prepared Sep 17, 2026 · mark it sent on the memo page', 'Dispute by Sep 20, 2026 · 3 days remaining'],
      },
      target: 'prepared',
    })
  })
})

describe('tracker list and summary', () => {
  const at = (id: string, index: number, rows: OutcomeRow[]) =>
    memoRowView(memo({ id }), { rows: rows.map((r) => ({ ...r, memoId: id })), draft: null, downloadedIds: [id], now: NOW, index })
  const views = [
    at('small-due', 0, [row('a', { amountN: 400, disputeDeadline: '2026-09-18' })]),
    at('big', 1, [row('b', { amountN: 9000 })]),
    at('mixed', 2, [row('c', { amountN: 3000, disputeDeadline: '2026-09-25' }), row('c2', { amountN: 500, ...sentSep8, collection: awaitingC })]),
    at('wait-old', 3, [row('d', { amountN: 5000, ...sentSep8, collection: awaitingC })]),
    at('wait-new', 4, [row('e', { amountN: 700, ...sentSep15, collection: awaitingC })]),
    at('done', 5, [row('g', { amountN: 800, ...sentSep8, collection: fullC(800) }), row('h', { amountN: 200, ...sentSep8, collection: { ...fullC(0), status: 'not_issued' as const, amountN: null } })]),
  ]

  it('puts most left to dispute first, then most waiting, and folds the finished memos', () => {
    const { list, finished } = sortRows(views, 'value')
    expect(list.map((x) => x.id)).toEqual(['big', 'mixed', 'small-due', 'wait-old', 'wait-new'])
    expect(finished.map((x) => x.id)).toEqual(['done'])
  })

  it('sorts by the soonest deadline when asked, waiting memos by the longest wait', () => {
    expect(sortRows(views, 'deadline').list.map((x) => x.id)).toEqual(['small-due', 'mixed', 'big', 'wait-old', 'wait-new'])
  })

  it('every row adds up: left to dispute plus the rest is the memo total', () => {
    for (const v of views) {
      const rest = v.facts.reduce((t, f) => t + f.valueN, 0)
      expect(Math.round(((v.hero?.valueN ?? 0) + rest) * 100) / 100).toBe(v.totalN)
    }
  })

  it('adds the rows up, so the summary always matches the list', () => {
    const s = trackerSummary(views, NOW)
    expect(s.buckets).toEqual({ open: 12400, awaiting: 6200, collected: 800, notRecovered: 200, notDisputed: 0 })
    expect(s.totalN).toBe(19600)
    expect(s.memoCount).toBe(6)
    expect(s.toDispute).toEqual({ memos: 3, nextDeadline: '2026-09-18', daysLeft: 1 })
    expect(s.waiting).toEqual({ memos: 3, oldestSent: 'Sep 8, 2026' })
    expect(s.recoveryRate).toBeCloseTo(0.8)
  })
})
