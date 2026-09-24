import { describe, expect, it } from 'vitest'
import { buildBaseSeed } from './seed'
import { getScenario, scenarios } from './scenarios'

const FEATURED = 'CM-2026-0630'

describe('base seed', () => {
  const seed = buildBaseSeed()

  it('assembles the golden memo from cm-data.json into the second slot', () => {
    expect(seed.memos[1]?.id).toBe(FEATURED)
    expect(seed.memos[1]?.detailAvailable).toBe(true)
    expect(seed.memos[1]?.netN).toBeCloseTo(9387.7)
    expect(seed.memos).toHaveLength(8)
  })

  it('builds 5 finding groups with seeded dispute state', () => {
    expect(seed.findingGroups.map((g) => g.id)).toEqual([
      'eg-base',
      'eg-fuel',
      'eg-res',
      'eg-das',
      'eg-multi',
    ])
    expect(seed.findingGroups.every((g) => g.pursuit === 'pursued')).toBe(true)
    const base = seed.findingGroups[0]
    expect(base?.collection?.status).toBe('full')
    expect(base?.varN).toBeCloseTo(9322.2)
    expect(base?.services.length).toBeGreaterThan(0)
  })

  it('carries the golden memo invoices and orders', () => {
    expect(seed.invoices).toHaveLength(16)
    const orders = seed.invoices.reduce((a, v) => a + v.orders.length, 0)
    expect(orders).toBe(852)
  })
})

describe('scenarios', () => {
  it('defines the 17 prototype scenarios plus dispute-deadline', () => {
    expect(scenarios).toHaveLength(18)
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(18)
  })

  it('falls back to report-ready for unknown ids', () => {
    expect(getScenario('nope').id).toBe('report-ready')
    expect(getScenario(null).id).toBe('report-ready')
  })

  it.each(scenarios.map((s) => [s.id, s] as const))('%s produces its seed shape', (_, sc) => {
    const s = sc.seed(buildBaseSeed())
    switch (sc.id) {
      case 'processing':
        expect(s.auditProcessing).toBe(true)
        break
      case 'report-ready':
      case 'dispute-not-started':
        expect(s.findingGroups.every((g) => g.pursuit === null && g.collection === null)).toBe(true)
        expect(s.disputeExcludedIds).toHaveLength(5)
        break
      case 'report-downloaded':
        expect(s.downloadedMemoIds).toEqual([FEATURED])
        expect(s.memoDlEvents[FEATURED]?.userFirst).toBe('Tori')
        break
      case 'updated-v2':
        expect(sc.initialLocation).toBe('/memos/CM-2026-0531')
        break
      case 'updated-downloaded':
        expect(s.downloadedMemoIds).toEqual(['CM-2026-0531'])
        break
      case 'findings-unavailable':
        expect(s.findingGroups).toHaveLength(0)
        expect(s.findingsUnavailable).toBe(true)
        break
      case 'all-clear':
        expect(s.findingGroups).toHaveLength(0)
        expect(s.findingsUnavailable).toBe(false)
        expect(sc.initialLocation).toBe('/memos/CM-2026-0801')
        break
      case 'fcm-awaiting':
        expect(s.reportDisputes['fcm:fcm-implentio-0626']?.status).toBe('awaiting')
        break
      case 'fcm-full':
        expect(s.reportDisputes['fcm:fcm-implentio-0626']?.collectedAmountN).toBeCloseTo(12408.75)
        break
      case 'pwv-partial':
        expect(s.reportDisputes['pwv:pwv-0626']?.status).toBe('partial')
        break
      case 'lcc-denied':
        expect(s.reportDisputes['lcc:lcc-implentio-0526']?.status).toBe('denied')
        break
      case 'dispute-prep-started':
        expect(s.disputeExcludedIds.sort()).toEqual(['eg-multi', 'eg-res'])
        expect(s.disputeDraftDate).toBe('Sep 16, 2026')
        break
      case 'dispute-recorded': {
        const base = s.findingGroups.find((g) => g.id === 'eg-base')
        expect(base?.pursuit).toBe('pursued')
        expect(base?.collection?.status).toBe('awaiting')
        expect(s.findingGroups.find((g) => g.id === 'eg-fuel')?.pursuit).toBe('pursued')
        break
      }
      case 'dispute-finalized':
        expect(
          s.findingGroups
            .filter((g) => g.id !== 'eg-das')
            .every((g) => g.collection?.status === 'full'),
        ).toBe(true)
        break
      case 'dispute-awaiting':
        expect(s.findingGroups.find((g) => g.id === 'eg-base')?.collection?.status).toBe('awaiting')
        expect(s.findingGroups.find((g) => g.id === 'eg-fuel')?.collection?.status).toBe('awaiting')
        break
      case 'dispute-plus-new': {
        expect(s.findingGroups.find((g) => g.id === 'eg-res')?.pursuit).toBeNull()
        expect(s.findingGroups.find((g) => g.id === 'eg-base')?.pursuit).toBe('pursued')
        expect(s.disputeExcludedIds.sort()).toEqual(['eg-multi', 'eg-res'])
        break
      }
      case 'dispute-deadline': {
        const res = s.findingGroups.find((g) => g.id === 'eg-res')
        expect(res).toMatchObject({ pursuit: null, disputeDeadline: '2026-09-19' })
        expect(s.findingGroups.find((g) => g.id === 'eg-multi')?.disputeDeadline).toBe('2026-09-15')
        expect(s.disputeExcludedIds.sort()).toEqual(['eg-multi', 'eg-res'])
        break
      }
    }
  })
})
