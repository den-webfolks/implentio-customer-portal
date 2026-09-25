import { describe, expect, it } from 'vitest'
import type { DisputeRecord, FindingGroup, MemoDetail } from '@/domain/types'
import { memoStatus } from '@/domain/outcomes'
import { memoDisputeItems, workspaceSummary } from './derive'

const NOW = new Date('2026-09-17T10:00:00-04:00')

const awaiting = { status: 'awaiting' as const, amountN: null, date: null, reason: '', history: [] }

const finding = (over: Partial<FindingGroup>): FindingGroup =>
  ({ id: 'g', title: 'T', varN: 100, pursuit: null, disputeDeadline: '2026-10-01', collection: null, ...over }) as FindingGroup

const detail = (groups: FindingGroup[]): MemoDetail =>
  ({ memo: { id: 'CM-1', provider: 'QuickBox', netN: 300 }, findingGroups: groups, findingsUnavailable: false }) as MemoDetail

const dispute = (over: Partial<DisputeRecord>): DisputeRecord =>
  ({ id: 'd1', state: 'sent', scope: 'groups', groupIds: ['sent'], sentAt: '2026-09-08T16:24:00', collection: null, handoffs: [], ...over }) as DisputeRecord

const sentGroup = finding({ id: 'sent', pursuit: 'pursued', pursuedTs: '2026-09-08T16:24:00', collection: awaiting })

const summary = (d: MemoDetail, disputes: DisputeRecord[]) => {
  const status = memoStatus(memoDisputeItems(d, disputes), { now: NOW })
  return { status, ws: workspaceSummary({ status, provider: 'QuickBox', totalN: 300, foundText: '', wholeMemo: false, hasDisputes: true }) }
}

describe('memo page status', () => {
  it('waits on the Biller however long ago it was sent', () => {
    const { status, ws } = summary(detail([sentGroup]), [dispute({})])
    expect(status?.key).toBe('waiting')
    expect(ws?.hero.label).toBe('Waiting on QuickBox')
    expect(ws?.sentence).toBe('Record each answer in the dispute below when QuickBox replies.')
  })

  it('keeps offering the open findings while an answer is waiting', () => {
    const { status, ws } = summary(detail([sentGroup, finding({ id: 'open', varN: 200 })]), [dispute({})])
    expect(status?.key).toBe('ready')
    expect(ws?.hero).toMatchObject({ label: 'Still to dispute', amountN: 200 })
    expect(ws?.sentence).toBe('1 finding can still be disputed. 1 finding is waiting on QuickBox’s answer.')
  })

  it('leads with a prepared email that nobody has confirmed as sent', () => {
    const prepared = dispute({ id: 'p1', state: 'prepared', groupIds: ['open'], sentAt: null, preparedAt: '2026-09-17T09:12:00', preparedBy: 'Tori Matthews' })
    const { status, ws } = summary(detail([finding({ id: 'open', varN: 200, disputeDeadline: '2026-09-15' }), finding({ id: 'other', varN: 100 })]), [prepared])
    expect(status?.key).toBe('ready')
    // Reserved, not selectable, and not Expired though its deadline has passed.
    expect(status?.prepared).toEqual({ count: 1, amountN: 200 })
    expect(status?.open.count).toBe(2)
    expect(ws?.hero).toMatchObject({ label: 'In a prepared email', amountN: 200 })
    expect(ws?.sentence).toBe('1 finding is in an email that isn’t confirmed as sent. Answer “Did you send it?” above before disputing more.')
  })
})
