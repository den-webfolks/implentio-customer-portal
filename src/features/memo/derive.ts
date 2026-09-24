/**
 * Memo-detail derivations — ports recoveryStatus (~12839), nextStepCard
 * (~12738), and the findings view-model (~13962–14075) from the prototype.
 */
import type { FindingGroup, MemoDetail, PackageRecord } from '@/domain/types'
import { fmtMoney, posMoney, r2 } from '@/domain/money'
import { excelDate } from '@/domain/dates'
import { groupExpired, groupStatusLine } from '@/domain/outcomes'
import { matchesFilter, type FilterValues } from '@/ui/Filters/Filters'
import { TONE_CHART_COLOR } from '@/features/status-tones'

const DASH = '—'

/** Charge columns: [packageField, chargeKey, label] (prototype chargeDefs). */
export const CHARGE_DEFS = [
  ['b', 'base', 'Base freight'],
  ['f', 'fuel', 'Fuel'],
  ['r', 'res', 'Residential'],
  ['d', 'das', 'DAS'],
  ['o', 'other', 'Other'],
] as const

export type ChargeField = (typeof CHARGE_DEFS)[number][0]

// ---------- recovery donut ---------------------------------------------------

export interface RecoverySlice {
  label: string
  color: string
  amount: string
  dashArray: string
  dashOffset: string
}

export interface RecoveryStatus {
  total: string
  slices: RecoverySlice[]
  eyebrow: string
}

export function recoveryStatus(groups: readonly FindingGroup[], now: Date): RecoveryStatus | null {
  if (!groups.length) return null
  const total = groups.reduce((s, g) => s + (g.varN || 0), 0)
  if (!total) return null
  let collected = 0
  let declined = 0
  let awaiting = 0
  let eligible = 0
  for (const g of groups) {
    if (g.pursuit !== 'pursued') {
      if (g.pursuit !== 'excluded' && !groupExpired(g, now)) eligible += g.varN || 0
      continue
    }
    const c = g.collection
    if (c?.status === 'full') collected += g.varN || 0
    else if (c?.status === 'not_issued') declined += g.varN || 0
    else if (c?.status === 'partial') {
      const amt = c.amountN ?? 0
      collected += amt
      awaiting += Math.max(0, (g.varN || 0) - amt)
    } else awaiting += g.varN || 0
  }
  const cats = [
    { label: 'Collected', color: TONE_CHART_COLOR.success, amt: collected },
    { label: 'Biller declined', color: TONE_CHART_COLOR.danger, amt: declined },
    { label: 'Awaiting outcome', color: TONE_CHART_COLOR.info, amt: awaiting },
    { label: 'Eligible to pursue', color: TONE_CHART_COLOR.neutral, amt: eligible },
  ]
  const CIRC = 2 * Math.PI * 50
  let cum = 0
  const slices = cats.map((c) => {
    const dash = (c.amt / total) * CIRC
    const seg: RecoverySlice = {
      label: c.label,
      color: c.color,
      amount: fmtMoney(c.amt),
      dashArray: `${dash.toFixed(2)} ${Math.max(CIRC - dash, 0).toFixed(2)}`,
      dashOffset: (-cum).toFixed(2),
    }
    cum += dash
    return seg
  })
  const resolved = awaiting <= 0.005 && eligible <= 0.005 && collected + declined > 0
  return { total: fmtMoney(total), slices, eyebrow: resolved ? 'RESOLVED' : 'RECOVERY STATUS' }
}

// ---------- next-step card ---------------------------------------------------

export interface NextStepLine {
  icon: 'prep' | 'clock' | 'check'
  text: string
}

export interface NextStepAction {
  kind: 'prep' | 'outcome' | 'view'
  variant: 'primary' | 'secondary' | 'tertiary'
  label: string
}

export interface NextStepCard {
  eyebrow: string
  heading: string
  lines: NextStepLine[]
  description: string
  actions: NextStepAction[]
  resolvedTreatment: boolean
}

export function nextStepCard(input: {
  findingGroups: readonly FindingGroup[]
  findingsUnavailable: boolean
  memoDisputeStatus: 'awaiting' | 'completed' | null
  excludedIds: readonly string[]
  provider: string
  now: Date
}): NextStepCard | null {
  const { findingGroups: groups, findingsUnavailable, memoDisputeStatus, excludedIds, provider, now } = input
  const line = (icon: NextStepLine['icon'], text: string): NextStepLine => ({ icon, text })
  const action = (
    kind: NextStepAction['kind'],
    variant: NextStepAction['variant'],
    label: string,
  ): NextStepAction => ({ kind, variant, label })
  const card = (c: Omit<NextStepCard, 'resolvedTreatment'> & { resolvedTreatment?: boolean }): NextStepCard => ({
    resolvedTreatment: false,
    ...c,
  })

  if (findingsUnavailable) {
    if (!memoDisputeStatus)
      return card({
        eyebrow: 'NEXT STEP',
        heading: `Prepare your dispute for ${provider}`,
        lines: [],
        description:
          'A variance-group breakdown is not available for this credit memo, so the complete credit memo will be sent as a single dispute.',
        actions: [action('prep', 'primary', 'Prepare dispute for Biller')],
      })
    if (memoDisputeStatus === 'awaiting')
      return card({
        eyebrow: 'NEXT STEP',
        heading: `Track your dispute with ${provider}`,
        lines: [line('clock', 'Awaiting a response from your biller')],
        description: '',
        actions: [action('outcome', 'primary', 'Update dispute outcomes')],
      })
    return card({
      eyebrow: 'RESOLVED',
      heading: `Your dispute with ${provider} is complete`,
      lines: [line('check', 'Dispute finalized')],
      description: '',
      actions: [action('view', 'primary', 'View dispute details')],
      resolvedTreatment: true,
    })
  }

  if (!groups.length) return null
  const eligible = groups.filter(
    (g) => g.pursuit !== 'pursued' && g.pursuit !== 'excluded' && !groupExpired(g, now),
  )
  const pursued = groups.filter((g) => g.pursuit === 'pursued')
  if (!eligible.length && !pursued.length) return null
  const fmtCount = (n: number) => `${n} finding${n === 1 ? '' : 's'}`
  const eligibleAmt = eligible.reduce((s, g) => s + (g.varN || 0), 0)
  let awaitingAmt = 0
  let awaitingCount = 0
  for (const g of pursued) {
    const s = g.collection?.status
    if (!s || s === 'awaiting') {
      awaitingAmt += g.varN || 0
      awaitingCount++
    } else if (s === 'partial') {
      const rem = Math.max(0, (g.varN || 0) - (g.collection?.amountN ?? 0))
      if (rem > 0.005) {
        awaitingAmt += rem
        awaitingCount++
      }
    }
  }
  const prepLabel = eligible.length && pursued.length ? 'Prepare another dispute' : 'Prepare dispute for Biller'

  if (pursued.length && eligible.length) {
    const actions = [action('prep', 'primary', prepLabel)]
    if (awaitingAmt > 0.005) actions.push(action('outcome', 'secondary', 'Update dispute outcomes'))
    return card({
      eyebrow: 'NEXT STEPS',
      heading: `Continue your work with ${provider}`,
      lines: [
        line('prep', `${fmtMoney(eligibleAmt)} across ${fmtCount(eligible.length)} remains eligible for another dispute`),
        ...(awaitingAmt > 0.005
          ? [line('clock', `${fmtMoney(awaitingAmt)} across ${fmtCount(awaitingCount)} is awaiting an outcome`)]
          : []),
      ],
      description: `A new dispute for the remaining eligible findings will not affect any dispute already sent to ${provider}.`,
      actions,
    })
  }
  if (pursued.length && !eligible.length) {
    const fullyResolved = awaitingAmt <= 0.005
    const collected = pursued.reduce(
      (s, g) =>
        s +
        (g.collection && (g.collection.status === 'full' || g.collection.status === 'partial')
          ? (g.collection.amountN ?? 0)
          : 0),
      0,
    )
    if (fullyResolved)
      return card({
        eyebrow: 'RESOLVED',
        heading: `Your dispute with ${provider} is complete`,
        lines: [line('check', `${fmtCount(pursued.length)} finalized · ${fmtMoney(collected)} collected`)],
        description: 'All findings have a final outcome.',
        actions: [action('view', 'primary', 'View previous dispute')],
        resolvedTreatment: true,
      })
    return card({
      eyebrow: 'NEXT STEP',
      heading: `Track your dispute with ${provider}`,
      lines: [line('clock', `${fmtMoney(awaitingAmt)} across ${fmtCount(awaitingCount)} awaiting an outcome`)],
      description: 'Record collection outcomes as your biller responds.',
      actions: [action('outcome', 'primary', 'Update dispute outcomes')],
    })
  }
  const excludedCount = eligible.filter((g) => excludedIds.includes(g.id)).length
  if (excludedCount > 0 && excludedCount < eligible.length) {
    const selected = eligible.filter((g) => !excludedIds.includes(g.id))
    const selAmt = selected.reduce((s, g) => s + (g.varN || 0), 0)
    return card({
      eyebrow: 'NEXT STEP',
      heading: `Continue preparing your dispute for ${provider}`,
      lines: [line('prep', `${fmtMoney(selAmt)} selected across ${fmtCount(selected.length)}`)],
      description: 'Your dispute draft has not been sent yet.',
      actions: [action('prep', 'primary', 'Continue preparing dispute')],
    })
  }
  return card({
    eyebrow: 'NEXT STEP',
    heading: `Prepare your dispute for ${provider}`,
    lines: [line('prep', `${fmtMoney(eligibleAmt)} eligible across ${fmtCount(eligible.length)}`)],
    description: 'Select the findings to include, then review and send your dispute package.',
    actions: [action('prep', 'primary', 'Prepare dispute for Biller')],
  })
}

// ---------- findings view ----------------------------------------------------

/** Per-group transient UI state kept by the summary tab. */
export interface GroupUiState {
  expanded: boolean
  detailOpen: boolean
  openRecord: string | null
  search: string
  pkgLimit: number
}

export const initialGroupUi: GroupUiState = {
  expanded: false,
  detailOpen: false,
  openRecord: null,
  search: '',
  pkgLimit: 10,
}

/** Finding filter keys (multi-select; empty = all). */
export const FINDING_FILTER_KEYS = {
  carrier: 'carrier',
  service: 'service',
  disputeStatus: 'disputeStatus',
} as const

export function serviceList(g: FindingGroup): string[] {
  return [...new Set(g.services.map((s) => s.service))]
}

export function titleCase(v: string): string {
  return v
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function serviceLabel(g: FindingGroup): string {
  const list = serviceList(g)
  if (list.length === 0) return DASH
  const first = g.services[0]
  if (!first) return DASH
  return list.length === 1 ? first.label : `${first.label} + ${list.length - 1} more`
}

export function filterGroups(
  groups: readonly FindingGroup[],
  filters: FilterValues,
  excludedIds: readonly string[],
  provider: string,
  now: Date,
): FindingGroup[] {
  const anyMatch = (key: string, candidates: readonly string[]) =>
    (filters[key]?.length ?? 0) === 0 || candidates.some((c) => matchesFilter(filters, key, c))
  return groups.filter((g) => {
    if (!anyMatch(FINDING_FILTER_KEYS.carrier, g.carriers)) return false
    if (!anyMatch(FINDING_FILTER_KEYS.service, serviceList(g))) return false
    if ((filters[FINDING_FILTER_KEYS.disputeStatus]?.length ?? 0) > 0) {
      const inDisputeSel = !excludedIds.includes(g.id)
      const sl = groupStatusLine(
        { ...g, amountN: g.varN, threePl: provider, inDisputeSel },
        now,
      )
      if (!matchesFilter(filters, FINDING_FILTER_KEYS.disputeStatus, sl.key)) return false
    }
    return true
  })
}

/** The prototype-styled "example package" sentence for a group. */
export function exampleText(g: FindingGroup): string {
  const allPkgs = g.services.flatMap((s) => s.pkgs)
  const top = [...allPkgs].sort((a, b) => b.tv - a.tv)[0]
  if (!top) return ''
  const parts = CHARGE_DEFS.map((c) => ({
    label: c[2].toLowerCase(),
    v: r2(top[c[0]][0] - top[c[0]][1]),
  }))
    .filter((x) => Math.abs(x.v) > 0.005)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .map((x) => `${x.label} ${posMoney(x.v)}${x.v < 0 ? ' favourable' : ' unfavourable'}`)
  const bits: string[] = []
  if (top.ez || top.az) bits.push(`Zone ${top.ez || top.az}`)
  if (top.wt != null) bits.push(`${Math.round((top.wt / 16) * 10) / 10} lb`)
  if (top.sv) bits.push(titleCase(top.sv))
  return `A ${bits.join(', ')} package on invoice ${top.inv} was billed ${fmtMoney(top.ti)} against ${fmtMoney(top.te)} expected — a ${posMoney(top.tv)} net variance made up of ${parts.join(', ')}.`
}

export interface ChargeCell {
  key: string
  label: string
  exp: string
  inv: string
  diff: string
  diffNegative: boolean
  diffZero: boolean
  highlighted: boolean
}

export function chargeCells(o: PackageRecord, hl: string): ChargeCell[] {
  return CHARGE_DEFS.map((c) => {
    const iv = o[c[0]][0]
    const ex = o[c[0]][1]
    const df = r2(iv - ex)
    return {
      key: c[0],
      label: c[2],
      exp: ex ? fmtMoney(ex) : DASH,
      inv: iv ? fmtMoney(iv) : DASH,
      diff: Math.abs(df) < 0.005 ? DASH : df > 0 ? posMoney(df) : '−' + posMoney(df),
      diffNegative: df < -0.005,
      diffZero: Math.abs(df) < 0.005,
      highlighted: hl === c[0],
    }
  })
}

/** Whether a package matches the highlighted charge (row highlight). */
export function packageHighlighted(o: PackageRecord, hl: string): boolean {
  if (hl === 'all') return false
  const def = CHARGE_DEFS.find((c) => c[0] === hl)
  if (!def) return false
  return Math.abs(r2(o[def[0]][0] - o[def[0]][1])) > 0.005
}

export { excelDate, DASH }

/** Build the memo rollup rows (variance groups summary table). */
export function memoRollupRows(detail: MemoDetail) {
  return detail.findingGroups.map((g) => ({
    id: g.id,
    anchor: `finding-${g.id}`,
    title: g.title,
    amount: fmtMoney(g.varN),
    packages: g.packages.toLocaleString('en-US'),
    invoices: g.invoices.toLocaleString('en-US'),
  }))
}
