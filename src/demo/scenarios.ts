/**
 * The 17 demo scenarios, ported from the prototype's applyScenario()
 * (template ~7299–7368). Each scenario is a pure transform of the base seed
 * plus an optional initial location the harness navigates to on switch.
 *
 * The four LCC/PWV/FCM scenarios are defined but unavailable until Phase 1.5
 * ships those screens.
 */
import type { Collection, FindingGroup } from '@/domain/types'
import { DEMO_NOW } from '@/lib/clock'
import { demoDownloadEvent, type SeedState } from './seed'

export type ScenarioId =
  | 'processing'
  | 'report-ready'
  | 'report-downloaded'
  | 'updated-v2'
  | 'updated-downloaded'
  | 'findings-unavailable'
  | 'all-clear'
  | 'fcm-awaiting'
  | 'fcm-full'
  | 'pwv-partial'
  | 'lcc-denied'
  | 'dispute-not-started'
  | 'dispute-prep-started'
  | 'dispute-recorded'
  | 'dispute-finalized'
  | 'dispute-awaiting'
  | 'dispute-plus-new'

export interface Scenario {
  id: ScenarioId
  label: string
  available: boolean
  seed: (base: SeedState) => SeedState
  initialLocation?: string
}

export const DEFAULT_SCENARIO: ScenarioId = 'report-ready'

const FEATURED = 'CM-2026-0630'
const UPDATED = 'CM-2026-0531'

function clearDispute(g: FindingGroup): FindingGroup {
  return {
    ...g,
    pursuit: null,
    pursuedAt: null,
    pursuedBy: null,
    pursuedVia: null,
    collection: null,
  }
}

const awaiting = (): Collection => ({
  status: 'awaiting',
  amountN: null,
  date: null,
  reason: '',
  history: [],
})

const pursuedSep8 = {
  pursuit: 'pursued' as const,
  pursuedAt: 'Sep 8, 2026',
  pursuedTs: '2026-09-08T16:24:00',
  pursuedBy: 'Tori Matthews',
  pursuedVia: 'connected' as const,
}

export const scenarios: Scenario[] = [
  {
    id: 'processing',
    label: 'Audit processing',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({ ...s, auditProcessing: true }),
  },
  {
    id: 'report-ready',
    label: 'Report ready',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({
      ...s,
      findingGroups: s.findingGroups.map(clearDispute),
      disputeExcludedIds: s.findingGroups.map((g) => g.id),
      disputeDraftDate: null,
    }),
  },
  {
    id: 'report-downloaded',
    label: 'Report downloaded',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({
      ...s,
      downloadedMemoIds: [FEATURED],
      memoDlEvents: { [FEATURED]: demoDownloadEvent(DEMO_NOW) },
    }),
  },
  {
    id: 'updated-v2',
    label: 'Updated report (v2)',
    available: true,
    initialLocation: `/memos/${UPDATED}`,
    seed: (s) => s,
  },
  {
    id: 'updated-downloaded',
    label: 'Updated report downloaded',
    available: true,
    initialLocation: `/memos/${UPDATED}`,
    seed: (s) => ({
      ...s,
      downloadedMemoIds: [UPDATED],
      memoDlEvents: { [UPDATED]: demoDownloadEvent(DEMO_NOW) },
    }),
  },
  {
    id: 'findings-unavailable',
    label: 'Findings unavailable',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({ ...s, findingGroups: [], underGroups: [], findingsUnavailable: true }),
  },
  {
    id: 'all-clear',
    label: 'All clear (no variance)',
    available: true,
    initialLocation: '/memos/CM-2026-0801',
    seed: (s) => ({ ...s, findingGroups: [], underGroups: [] }),
  },
  {
    id: 'fcm-awaiting',
    label: 'FCM — awaiting outcome',
    available: false,
    initialLocation: '/reports/fcm',
    seed: (s) => ({
      ...s,
      reportDisputes: {
        'fcm:fcm-implentio-0626': {
          status: 'awaiting',
          sentAt: 'Jul 22, 2026 at 10:14 AM',
          amountN: 12408.75,
          attachments: ['Summary report (PDF)', 'Supporting evidence (Excel)'],
          collectedAmountN: null,
          receivedDate: null,
          reason: '',
        },
      },
    }),
  },
  {
    id: 'fcm-full',
    label: 'FCM — fully collected',
    available: false,
    initialLocation: '/reports/fcm',
    seed: (s) => ({
      ...s,
      reportDisputes: {
        'fcm:fcm-implentio-0626': {
          status: 'full',
          sentAt: 'Jul 22, 2026 at 10:14 AM',
          amountN: 12408.75,
          attachments: ['Summary report (PDF)', 'Supporting evidence (Excel)'],
          collectedAmountN: 12408.75,
          receivedDate: '2026-08-05',
          reason: '',
        },
      },
    }),
  },
  {
    id: 'pwv-partial',
    label: 'PWV — partially collected',
    available: false,
    initialLocation: '/reports/pwv',
    seed: (s) => ({
      ...s,
      reportDisputes: {
        'pwv:pwv-0626': {
          status: 'partial',
          sentAt: 'Aug 1, 2026 at 2:30 PM',
          amountN: 1230.02,
          attachments: ['Summary report (PDF)', 'Supporting evidence (Excel)'],
          collectedAmountN: 700,
          receivedDate: '2026-08-20',
          reason: '',
        },
      },
    }),
  },
  {
    id: 'lcc-denied',
    label: 'LCC — denied by Biller',
    available: false,
    initialLocation: '/reports/lcc',
    seed: (s) => ({
      ...s,
      reportDisputes: {
        'lcc:lcc-implentio-0526': {
          status: 'denied',
          sentAt: 'Jul 15, 2026 at 9:00 AM',
          amountN: 6945,
          attachments: ['Summary report (PDF)', 'Supporting evidence (Excel)'],
          collectedAmountN: null,
          receivedDate: '2026-07-30',
          reason: 'Carrier contract terms already reflect the lowest available service tier.',
        },
      },
    }),
  },
  {
    id: 'dispute-not-started',
    label: 'Dispute — not started',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({
      ...s,
      findingGroups: s.findingGroups.map(clearDispute),
      disputeExcludedIds: s.findingGroups.map((g) => g.id),
    }),
  },
  {
    id: 'dispute-prep-started',
    label: 'Dispute — prep started',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const keep = ['eg-base', 'eg-fuel', 'eg-das']
      return {
        ...s,
        findingGroups: s.findingGroups.map(clearDispute),
        disputeExcludedIds: s.findingGroups
          .filter((g) => !keep.includes(g.id))
          .map((g) => g.id),
        disputeDraftDate: 'Sep 16, 2026',
      }
    },
  },
  {
    id: 'dispute-recorded',
    label: 'Dispute — recorded',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({
      ...s,
      findingGroups: s.findingGroups.map((g) =>
        g.id === 'eg-base' ? { ...g, ...pursuedSep8, collection: awaiting() } : g,
      ),
    }),
  },
  {
    id: 'dispute-finalized',
    label: 'Dispute — finalized',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const now = '2026-09-16T15:00:00'
      const full = (g: FindingGroup, date: string): Collection => ({
        status: 'full',
        amountN: g.varN,
        date,
        reason: '',
        changedBy: 'Tori Matthews',
        changedAt: now,
        history: [],
      })
      return {
        ...s,
        findingGroups: s.findingGroups.map((g) => {
          if (g.id === 'eg-base') return { ...g, ...pursuedSep8, collection: full(g, '2026-09-16') }
          if (g.id === 'eg-fuel') return { ...g, collection: full(g, '2026-09-13') }
          if (g.id === 'eg-multi') return { ...g, ...pursuedSep8, collection: full(g, '2026-09-16') }
          if (g.id === 'eg-res')
            return {
              ...g,
              pursuit: 'pursued',
              pursuedAt: 'Sep 15, 2026',
              pursuedTs: '2026-09-15T08:55:00',
              pursuedBy: 'Tori Matthews',
              pursuedVia: 'connected',
              collection: full(g, '2026-09-16'),
            }
          return g
        }),
      }
    },
  },
  {
    id: 'dispute-awaiting',
    label: 'Dispute — awaiting outcomes',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => ({
      ...s,
      findingGroups: s.findingGroups.map((g) => {
        if (g.id === 'eg-fuel' || g.id === 'eg-das') return { ...g, collection: awaiting() }
        if (g.id === 'eg-base') return { ...g, ...pursuedSep8, collection: awaiting() }
        return g
      }),
    }),
  },
  {
    id: 'dispute-plus-new',
    label: 'Dispute sent + new findings',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const sent = ['eg-base', 'eg-fuel', 'eg-das']
      return {
        ...s,
        findingGroups: s.findingGroups.map((g) => (sent.includes(g.id) ? g : clearDispute(g))),
        disputeExcludedIds: [],
      }
    },
  },
]

export function getScenario(id: string | null | undefined): Scenario {
  const found = scenarios.find((s) => s.id === id)
  if (found) return found
  const fallback = scenarios.find((s) => s.id === DEFAULT_SCENARIO)
  if (!fallback) throw new Error('default scenario missing')
  return fallback
}
