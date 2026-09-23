/** Default dispute/collection state for the golden memo's finding groups —
 *  ported from outcomeSeed() (template ~7498–7506). */
import type { DisputeState } from '@/domain/types'

export const outcomeSeed: Record<string, DisputeState> = {
  'eg-base': {
    pursuit: 'pursued',
    disputeDeadline: '2026-09-20',
    pursuedAt: 'Sep 8, 2026',
    pursuedTs: '2026-09-08T16:24:00',
    pursuedBy: 'Tori Matthews',
    pursuedVia: 'connected',
    collection: {
      status: 'full',
      amountN: 9322.2,
      date: '2026-09-12',
      reason: '',
      changedBy: 'Tori Matthews',
      changedAt: '2026-09-12T09:46:00',
      history: [],
    },
  },
  'eg-fuel': {
    pursuit: 'pursued',
    disputeDeadline: '2026-09-20',
    pursuedAt: 'Sep 8, 2026',
    pursuedTs: '2026-09-08T16:24:00',
    pursuedBy: 'Tori Matthews',
    pursuedVia: 'connected',
    collection: {
      status: 'partial',
      amountN: 20,
      date: '2026-09-13',
      reason: '',
      changedBy: 'Tori Matthews',
      changedAt: '2026-09-13T14:31:00',
      history: [],
    },
  },
  'eg-res': {
    pursuit: 'pursued',
    disputeDeadline: '2026-09-27',
    pursuedAt: 'Sep 15, 2026',
    pursuedTs: '2026-09-15T08:55:00',
    pursuedBy: 'Tori Matthews',
    pursuedVia: 'connected',
    collection: { status: 'awaiting', amountN: null, date: null, reason: '', history: [] },
  },
  'eg-das': {
    pursuit: 'pursued',
    disputeDeadline: '2026-09-20',
    pursuedAt: 'Sep 8, 2026',
    pursuedTs: '2026-09-08T16:24:00',
    pursuedBy: 'Tori Matthews',
    pursuedVia: 'connected',
    collection: {
      status: 'not_issued',
      amountN: 0,
      date: '2026-09-14',
      reason:
        'Biller said the surcharge was applied per contract addendum and declined the request.',
      changedBy: 'Tori Matthews',
      changedAt: '2026-09-14T11:18:00',
      history: [],
    },
  },
  'eg-multi': {
    pursuit: 'pursued',
    disputeDeadline: '2026-09-20',
    pursuedAt: 'Sep 8, 2026',
    pursuedTs: '2026-09-08T16:24:00',
    pursuedBy: 'Tori Matthews',
    pursuedVia: 'connected',
    collection: { status: 'awaiting', amountN: null, date: null, reason: '', history: [] },
  },
}

export const defaultDisputeState: DisputeState = {
  pursuit: null,
  disputeDeadline: null,
  collection: null,
}
