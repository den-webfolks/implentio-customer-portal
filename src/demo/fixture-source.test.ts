import { describe, expect, it } from 'vitest'
import { FixtureDataSource } from './fixture-source'
import { DEMO_NOW, frozenClock } from '@/lib/clock'

const make = (scenario?: string) => new FixtureDataSource(scenario ?? null, frozenClock(DEMO_NOW))

describe('FixtureDataSource', () => {
  it('serves the scenario-seeded memo list', async () => {
    const ds = make()
    const memos = await ds.listMemos()
    expect(memos).toHaveLength(8)
    expect(memos[1]?.id).toBe('CM-2026-0630')
  })

  it('shares golden drill-down data across memo pages', async () => {
    const ds = make()
    expect(await ds.getMemoDetail('nope')).toBeNull()
    const updated = await ds.getMemoDetail('CM-2026-0531')
    expect(updated?.memo.report).toBe('updated')
    const processing = await ds.getMemoDetail('CM-2026-0714')
    expect(processing?.auditProcessing).toBe(true)
  })

  it('records downloads with frozen-clock attribution', async () => {
    const ds = make('report-ready')
    await ds.recordMemoDownload('CM-2026-0630')
    const { downloadedMemoIds, memoDlEvents } = await ds.getDownloadState()
    expect(downloadedMemoIds).toEqual(['CM-2026-0630'])
    expect(memoDlEvents['CM-2026-0630']?.at).toBe(DEMO_NOW.toISOString())
  })

  it('marks groups pursued and starts an awaiting collection', async () => {
    const ds = make('report-ready')
    await ds.markGroupsPursued({ groupIds: ['eg-base', 'eg-fuel'], via: 'connected' })
    const detail = await ds.getMemoDetail('CM-2026-0630')
    const base = detail?.findingGroups.find((g) => g.id === 'eg-base')
    expect(base?.pursuit).toBe('pursued')
    expect(base?.pursuedVia).toBe('connected')
    expect(base?.collection?.status).toBe('awaiting')
    expect(detail?.findingGroups.find((g) => g.id === 'eg-res')?.pursuit).toBeNull()
  })

  it('keeps outcome edit history when recording over a previous outcome', async () => {
    // 'processing' keeps the seeded outcomes (eg-fuel starts 'partial').
    const ds = make('processing')
    await ds.recordGroupOutcome({
      groupId: 'eg-fuel',
      collection: { status: 'full', amountN: 44, date: '2026-09-17', reason: '', history: [] },
    })
    const detail = await ds.getMemoDetail('CM-2026-0630')
    const fuel = detail?.findingGroups.find((g) => g.id === 'eg-fuel')
    expect(fuel?.collection?.status).toBe('full')
    expect(fuel?.collection?.changedBy).toBe('Tori Matthews')
    expect(fuel?.collection?.history).toHaveLength(1)
    expect(fuel?.collection?.history[0]?.status).toBe('partial')
  })

  it('collects outcome rows from memos that carry ledgers', async () => {
    const ds = make()
    const rows = await ds.listOutcomeRows()
    expect(rows).toHaveLength(9)
    expect(rows.every((r) => r.memoId === 'CM-2026-0517' || r.memoId === 'CM-2026-0328')).toBe(true)
  })

  it('mutates account data through the seam', async () => {
    const ds = make()
    const invited = await ds.inviteMember({ name: 'New Person', email: 'new@implentio.com' })
    expect(invited.status).toBe('Invited')
    await ds.revokeMember(invited.id)
    await ds.setEmailAccountStatus('gmail', 'connected')
    const account = await ds.getAccount()
    expect(account.team).toHaveLength(3)
    expect(account.emailAccounts.gmail.status).toBe('connected')
    expect(account.emailAccounts.gmail.address).toBe('tori@implentio.com')
  })
})
