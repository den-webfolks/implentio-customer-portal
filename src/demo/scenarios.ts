/**
 * The demo scenarios: 17 ported from the prototype's applyScenario()
 * (template ~7299–7368), plus 'dispute-deadline' (Phase 1 dispute flow). Each scenario is a pure transform of the base seed
 * plus an optional initial location the harness navigates to on switch.
 *
 * The four LCC/PWV/FCM scenarios are defined but unavailable until Phase 1.5
 * ships those screens.
 */
import type { Collection, DisputeRecord, FindingGroup } from '@/domain/types'
import { SUMMARY_FILE_NAME, attachmentNames, buildEmailBlocks, claimFileName, claimFromFinding, defaultSubject, emailText } from '@/domain/dispute-email'
import { r2 } from '@/domain/money'
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
  | 'dispute-deadline'
  | 'dispute-prepared'
  | 'dispute-prepared-late'

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

/** An email for `groupIds` that left the app (Gmail compose) at `preparedAt`
 *  and was never confirmed as sent (Review & send plan, slice A). */
function preparedEmail(s: SeedState, groupIds: string[], preparedAt: string): DisputeRecord {
  const memo = s.memos.find((m) => m.id === s.goldenMemoId)
  const contact = s.account.billerContacts.find((c) => c.biller === memo?.provider && c.dispute)
  const groups = s.findingGroups.filter((g) => groupIds.includes(g.id))
  const amountN = r2(groups.reduce((t, g) => t + g.varN, 0))
  const email = {
    provider: memo?.provider ?? 'QuickBox',
    greetingName: contact?.contact ?? 'QuickBox billing team',
    memoId: memo?.id ?? FEATURED,
    period: memo?.period ?? '',
    claims: groups.map((g) => claimFromFinding(g, claimFileName(g, 'csv'))),
    amountN,
    summaryFile: SUMMARY_FILE_NAME,
    completeFile: null,
    sender: s.account.user.name,
  }
  const snapshot = { to: contact?.email ?? '', cc: contact?.cc ?? '', subject: defaultSubject(email), body: emailText(buildEmailBlocks(email)), attachments: attachmentNames(email) }
  return {
    id: 'dsp-prepared',
    memoId: email.memoId,
    memoVersion: memo?.version ?? 'Version 1',
    biller: email.provider,
    state: 'prepared',
    scope: 'groups',
    groupIds,
    amountN,
    sentAt: null,
    sentBy: s.account.user.name,
    via: 'manual',
    senderEmail: null,
    ...snapshot,
    collection: null,
    preparedAt,
    preparedBy: s.account.user.name,
    recipientsChecked: true,
    handoffs: [{ at: preparedAt, by: s.account.user.name, method: 'gmail', ...snapshot }],
  }
}

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
        // Nothing is pre-selected for the next dispute (decision 6).
        disputeExcludedIds: s.findingGroups.filter((g) => !sent.includes(g.id)).map((g) => g.id),
      }
    },
  },
  {
    // Phase 1 addition (not in the prototype): exercises the deadline
    // countdown and the "Expired" label. One finding is due in 2 days, one expired unsent.
    id: 'dispute-deadline',
    label: 'Dispute — deadline close / expired',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const sent = ['eg-base', 'eg-fuel', 'eg-das']
      return {
        ...s,
        findingGroups: s.findingGroups.map((g) => {
          if (sent.includes(g.id)) return g
          if (g.id === 'eg-res') return { ...clearDispute(g), disputeDeadline: '2026-09-19' }
          return { ...clearDispute(g), disputeDeadline: '2026-09-15' }
        }),
        disputeExcludedIds: s.findingGroups.filter((g) => !sent.includes(g.id)).map((g) => g.id),
      }
    },
  },
]

scenarios.push(
  {
    // Review & send plan: an email left the app this morning and nobody has
    // said whether it was sent. Its findings are reserved.
    id: 'dispute-prepared',
    label: 'Dispute — email prepared, not confirmed',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const cleared = s.findingGroups.map(clearDispute)
      const next = { ...s, findingGroups: cleared, disputeExcludedIds: cleared.map((g) => g.id), disputeDraftDate: null }
      return { ...next, disputes: [preparedEmail(next, ['eg-base', 'eg-fuel'], '2026-09-17T09:12:00')] }
    },
  },
  {
    // The same, prepared five days ago; the deadline for its findings has
    // since passed, so the prompt asks whether it went on or before it.
    id: 'dispute-prepared-late',
    label: 'Dispute — prepared, deadline passed',
    available: true,
    initialLocation: `/memos/${FEATURED}`,
    seed: (s) => {
      const cleared = s.findingGroups.map((g) => (['eg-base', 'eg-fuel'].includes(g.id) ? { ...clearDispute(g), disputeDeadline: '2026-09-15' } : clearDispute(g)))
      const next = { ...s, findingGroups: cleared, disputeExcludedIds: cleared.map((g) => g.id), disputeDraftDate: null }
      return { ...next, disputes: [preparedEmail(next, ['eg-base', 'eg-fuel'], '2026-09-12T16:40:00')] }
    },
  },
)

export function getScenario(id: string | null | undefined): Scenario {
  const found = scenarios.find((s) => s.id === id)
  if (found) return found
  const fallback = scenarios.find((s) => s.id === DEFAULT_SCENARIO)
  if (!fallback) throw new Error('default scenario missing')
  return fallback
}
