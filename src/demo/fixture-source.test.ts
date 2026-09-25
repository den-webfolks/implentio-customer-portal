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
    attachments: ['Base-Freight.csv', 'Summary.pdf'],
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

  const PREPARE = {
    memoId: 'CM-2026-0630',
    scope: 'groups' as const,
    groupIds: ['eg-base', 'eg-fuel'],
    method: 'gmail' as const,
    to: 'billing@quickbox.com',
    cc: '',
    subject: 'Parcel invoice review',
    body: 'Hi',
    attachments: ['Base-Freight.csv', 'Fuel-Surcharge.csv', 'Summary.pdf'],
    recipientsChecked: true,
  }

  it('prepares a dispute on the first handoff, adds versions after, and confirms it with a backdated date', async () => {
    const ds = make('dispute-prep-started')
    const first = await ds.prepareDispute(PREPARE)
    expect(first).toMatchObject({ state: 'prepared', sentAt: null, preparedBy: 'Tori Matthews', preparedAt: DEMO_NOW.toISOString(), handoffs: [{ method: 'gmail', body: 'Hi' }] })
    // Reserved: still open money, out of the draft, no "Won't pursue".
    const rows = await ds.listOutcomeRows()
    expect(rows.find((r) => r.id === 'eg-base')).toMatchObject({ pursuit: null, prepared: true, preparedAt: DEMO_NOW.toISOString() })
    expect((await ds.getDisputeContext('CM-2026-0630')).excludedIds).toContain('eg-base')
    await ds.setGroupNotPursued({ groupId: 'eg-base', notPursued: true })
    expect((await ds.getMemoDetail('CM-2026-0630'))?.findingGroups.find((g) => g.id === 'eg-base')?.pursuit).toBeNull()

    const again = await ds.prepareDispute({ ...PREPARE, method: 'download', body: 'Hi again' })
    expect(again.id).toBe(first.id)
    expect(again.handoffs.map((h) => h.method)).toEqual(['gmail', 'download'])
    expect(again.body).toBe('Hi again')

    const sent = await ds.confirmDisputeSent({ disputeId: first.id, sentOn: '2026-09-01' })
    // Never earlier than the day it was prepared.
    expect(sent).toMatchObject({ state: 'sent', via: 'manual', sentAt: DEMO_NOW.toISOString(), sentAfterDeadline: false })
    const base = (await ds.getMemoDetail('CM-2026-0630'))?.findingGroups.find((g) => g.id === 'eg-base')
    expect(base).toMatchObject({ pursuit: 'pursued', pursuedVia: 'manual', collection: { status: 'awaiting' } })
    expect((await ds.getActivity('CM-2026-0630')).map((a) => a.text)[0]).toMatch(/^Dispute confirmed as sent to QuickBox on Sep 17, 2026/)
  })

  it('flags a confirmation dated after the deadline, and keeps a discarded email in the history', async () => {
    const late = make('dispute-prepared-late')
    const [prepared] = await late.listDisputes('CM-2026-0630')
    expect(prepared?.state).toBe('prepared')
    const sent = await late.confirmDisputeSent({ disputeId: prepared!.id, sentOn: '2026-09-16' })
    expect(sent).toMatchObject({ sentAt: new Date('2026-09-16T12:00:00').toISOString(), sentAfterDeadline: true })

    const connected = make('dispute-prepared')
    const [p] = await connected.listDisputes('CM-2026-0630')
    const viaMailbox = await connected.confirmDisputeSent({ disputeId: p!.id, sentOn: '2026-09-17', via: 'connected', senderEmail: 'tori@implentio.com', cc: 'ops@brand.com', body: 'Final text' })
    // What went out from the mailbox replaces the last-prepared snapshot.
    expect(viaMailbox).toMatchObject({ state: 'sent', via: 'connected', senderEmail: 'tori@implentio.com', cc: 'ops@brand.com', body: 'Final text', to: p!.to })

    const ds = make('dispute-prepared')
    const [rec] = await ds.listDisputes('CM-2026-0630')
    await ds.discardPreparedDispute(rec!.id)
    expect((await ds.listDisputes('CM-2026-0630')).map((d) => d.state)).toEqual(['discarded'])
    expect((await ds.listOutcomeRows()).find((r) => r.id === 'eg-base')?.prepared).toBeUndefined()
    expect((await ds.getActivity('CM-2026-0630')).map((a) => a.text)[0]).toMatch(/^Prepared dispute email discarded/)
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
    expect(rows).toHaveLength(22)
    expect(rows.filter((r) => r.memoId === 'CM-2026-0630').map((r) => r.id)).toEqual([
      'eg-base',
      'eg-fuel',
      'eg-res',
      'eg-das',
      'eg-multi',
    ])
    expect(await make('processing').listOutcomeRows()).toHaveLength(17)
  })

  it('makes every memo headline equal the sum of its findings', async () => {
    const ds = make()
    const rows = await ds.listOutcomeRows()
    for (const m of await ds.listMemos()) {
      if (m.status !== 'complete' || m.allNoVariance) continue
      const sum = rows.filter((r) => r.memoId === m.id).reduce((s, r) => s + r.amountN, 0)
      expect(sum, m.id).toBeCloseTo(m.netN ?? 0, 2)
    }
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
