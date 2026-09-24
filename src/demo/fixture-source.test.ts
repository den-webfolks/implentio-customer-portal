import { describe, expect, it } from 'vitest'
import { FixtureDataSource } from './fixture-source'
import type { AppDataSource } from '@/data/source'
import { DEMO_NOW, frozenClock } from '@/lib/clock'

/** Exercised through the seam interface, as screens use it. */
const make = (scenario?: string): AppDataSource => new FixtureDataSource(scenario ?? null, frozenClock(DEMO_NOW))

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

  const SEND = {
    memoId: 'CM-2026-0630',
    via: 'connected' as const,
    to: 'billing@quickbox.com',
    cc: '',
    subject: 'Dispute',
    evidenceFile: 'evidence.zip',
    senderEmail: 'tori@implentio.com',
  }

  it('records a sent dispute, marks its findings pursued, and clears the draft', async () => {
    const ds = make('dispute-prep-started')
    const record = await ds.recordDisputeSent({ ...SEND, scope: 'groups', groupIds: ['eg-base', 'eg-fuel'] })
    expect(record).toMatchObject({ scope: 'groups', groupIds: ['eg-base', 'eg-fuel'], sentAt: DEMO_NOW.toISOString(), sentBy: 'Tori Matthews' })
    const detail = await ds.getMemoDetail('CM-2026-0630')
    const base = detail?.findingGroups.find((g) => g.id === 'eg-base')
    expect(base?.pursuit).toBe('pursued')
    expect(base?.pursuedVia).toBe('connected')
    expect(base?.collection?.status).toBe('awaiting')
    expect(detail?.findingGroups.find((g) => g.id === 'eg-res')?.pursuit).toBeNull()
    expect(await ds.listDisputes('CM-2026-0630')).toHaveLength(1)
    const ctx = await ds.getDisputeContext('CM-2026-0630')
    expect(ctx.draftDate).toBeNull()
    expect(ctx.excludedIds).toEqual(expect.arrayContaining(['eg-res', 'eg-das', 'eg-multi']))
    const [latest] = await ds.getActivity('CM-2026-0630')
    expect(latest).toMatchObject({ icon: 'send', text: expect.stringMatching(/^Dispute sent to QuickBox — 2 variance groups · \$/) })
  })

  it('records a whole-memo dispute and its outcome', async () => {
    const ds = make('findings-unavailable')
    const record = await ds.recordDisputeSent({ ...SEND, via: 'manual', scope: 'memo', groupIds: [] })
    expect(record.collection?.status).toBe('awaiting')
    await ds.recordMemoDisputeOutcome({
      disputeId: record.id,
      collection: { status: 'not_issued', amountN: 0, date: null, reason: 'No', history: [] },
    })
    const [d] = await ds.listDisputes('CM-2026-0630')
    expect(d?.collection).toMatchObject({ status: 'not_issued', history: [{ status: 'awaiting' }] })
    const row = (await ds.listOutcomeRows()).find((r) => r.memoId === 'CM-2026-0630')
    expect(row).toMatchObject({ title: 'Complete credit memo', pursuit: 'pursued', collection: { status: 'not_issued' } })
  })

  it('marks a finding not pursued and undoes it', async () => {
    const ds = make('dispute-prep-started')
    await ds.setGroupNotPursued({ groupId: 'eg-base', notPursued: true })
    let base = (await ds.getMemoDetail('CM-2026-0630'))?.findingGroups.find((g) => g.id === 'eg-base')
    expect(base?.pursuit).toBe('excluded')
    expect((await ds.getDisputeContext('CM-2026-0630')).excludedIds).toContain('eg-base')
    await ds.setGroupNotPursued({ groupId: 'eg-base', notPursued: false })
    base = (await ds.getMemoDetail('CM-2026-0630'))?.findingGroups.find((g) => g.id === 'eg-base')
    expect(base?.pursuit).toBeNull()
  })

  it('derives seed disputes from the pursued findings, one per send time', async () => {
    const ds = make('report-downloaded')
    const disputes = await ds.listDisputes('CM-2026-0630')
    expect(disputes.map((d) => [d.sentAt, d.groupIds])).toEqual([
      ['2026-09-08T16:24:00', ['eg-base', 'eg-fuel', 'eg-das', 'eg-multi']],
      ['2026-09-15T08:55:00', ['eg-res']],
    ])
    expect(await make('report-ready').listDisputes('CM-2026-0630')).toEqual([])
  })

  it('keeps activity per memo', async () => {
    const ds = make()
    expect((await ds.getActivity('CM-2026-0630')).map((a) => a.text)[0]).toMatch(/^Report ready/)
    expect((await ds.getActivity('CM-2026-0531')).map((a) => a.text)).toEqual([
      'Report updated — Version 2',
      'Report ready — Version 1',
    ])
    await ds.recordMemoDownload('CM-2026-0531')
    expect((await ds.getActivity('CM-2026-0531'))[0]?.text).toBe('Credit memo downloaded — Version 2')
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

  it('collects outcome rows from every published memo, including the golden findings', async () => {
    const rows = await make().listOutcomeRows()
    expect(rows).toHaveLength(14)
    expect(rows.filter((r) => r.memoId === 'CM-2026-0630').map((r) => r.id)).toEqual([
      'eg-base',
      'eg-fuel',
      'eg-res',
      'eg-das',
      'eg-multi',
    ])
    expect(await make('processing').listOutcomeRows()).toHaveLength(9)
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
