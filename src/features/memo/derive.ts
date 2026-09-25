/**
 * Memo-detail derivations — the recovery donut and next-step card (first
 * ported from recoveryStatus ~12839 / nextStepCard ~12738, now built on the
 * shared memo status in domain/outcomes) and the findings view-model
 * (~13962–14075).
 */
import type { Collection, DisputeRecord, DisputeState, FindingGroup, MemoDetail, PackageRecord } from '@/domain/types'
import { fmtMoney, posMoney, r2 } from '@/domain/money'
import { excelDate } from '@/domain/dates'
import { groupStatusLine, type MemoStatus } from '@/domain/outcomes'
import { plural } from '@/domain/plural'
import { findingProblem } from '@/domain/finding-copy'
import { matchesFilter, type FilterValues } from '@/ui/Filters/Filters'

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

// ---------- dispute items -----------------------------------------------------

/** One thing the customer can dispute on this memo: a finding, or the
 *  complete credit memo when no finding breakdown was published. */
export type DisputeItem = DisputeState & {
  id: string
  title: string
  amountN: number
  threePl: string
}

export const COMPLETE_MEMO_TITLE = 'Complete credit memo'

/** Disputes that were sent (the cards); prepared and discarded ones are not. */
export const sentDisputes = (disputes: readonly DisputeRecord[]) => disputes.filter((d) => d.state === 'sent')

/** The memo's one email prepared but not confirmed as sent, if any. */
export const preparedDispute = (disputes: readonly DisputeRecord[]) => disputes.find((d) => d.state === 'prepared') ?? null

export function memoDisputeItems(detail: MemoDetail, disputes: readonly DisputeRecord[]): DisputeItem[] {
  const provider = detail.memo.provider
  const sent = sentDisputes(disputes)
  const prepared = preparedDispute(disputes)
  const reserved = (id: string) => (prepared?.groupIds.includes(id) ? { prepared: true, preparedAt: prepared.preparedAt ?? null } : {})
  if (detail.findingsUnavailable) {
    const d = sent.find((x) => x.scope === 'memo')
    return [
      {
        id: d?.id ?? 'complete',
        title: COMPLETE_MEMO_TITLE,
        amountN: detail.memo.netN ?? 0,
        threePl: provider,
        pursuit: d ? 'pursued' : null,
        pursuedTs: d?.sentAt ?? null,
        disputeDeadline: null,
        collection: d?.collection ?? null,
        ...(prepared?.scope === 'memo' && !d ? { prepared: true, preparedAt: prepared.preparedAt ?? null } : {}),
      },
    ]
  }
  return detail.findingGroups.map((g) => ({
    id: g.id,
    title: g.title,
    amountN: g.varN,
    threePl: provider,
    pursuit: g.pursuit,
    disputeDeadline: g.disputeDeadline,
    pursuedAt: g.pursuedAt,
    pursuedTs: g.pursuedTs,
    pursuedBy: g.pursuedBy,
    pursuedVia: g.pursuedVia,
    collection: g.collection,
    ...reserved(g.id),
  }))
}

/** A sent dispute with the current outcome of everything it covered. */
export interface DisputeSection {
  record: DisputeRecord
  rows: { id: string; title: string; amountN: number; collection: Collection | null }[]
}

export function disputeSections(detail: MemoDetail, disputes: readonly DisputeRecord[]): DisputeSection[] {
  return sentDisputes(disputes).map((record) => ({
    record,
    rows:
      record.scope === 'memo'
        ? [{ id: record.id, title: COMPLETE_MEMO_TITLE, amountN: record.amountN, collection: record.collection }]
        : detail.findingGroups
            .filter((g) => record.groupIds.includes(g.id))
            .sort((a, b) => b.varN - a.varN)
            .map((g) => ({ id: g.id, title: findingProblem(g), amountN: g.varN, collection: g.collection })),
  }))
}

// ---------- workspace summary ------------------------------------------------

export interface WorkspaceSummary {
  /** The headline amount: what matters now, not always the total. */
  hero: { label: string; amountN: number; context: string }
  sentence: string
  /** The one action the summary offers; findings and dispute cards carry the rest. */
  action: 'send' | null
}

/** The memo workspace's headline and one-sentence guidance, driven by the
 *  shared memo status. Before anything is sent the headline is the total
 *  overcharge; after that it is what's still open, waiting, or collected. */
export function workspaceSummary(input: {
  status: MemoStatus | null
  provider: string
  totalN: number
  /** e.g. "Found across 852 packages on 16 invoices". */
  foundText: string
  wholeMemo: boolean
  hasDisputes: boolean
}): WorkspaceSummary | null {
  const { status: st, provider, totalN, foundText, wholeMemo, hasDisputes } = input
  if (!st) return null
  const findings = (n: number) => plural(n, 'finding')
  const isAre = (n: number) => (n === 1 ? 'is' : 'are')
  const ofTotal = `of ${fmtMoney(totalN)} overcharged`
  const total = { label: 'Total overcharged', amountN: totalN, context: foundText }
  if (st.prepared.count > 0) {
    const n = st.prepared.count
    return {
      hero: { label: 'In a prepared email', amountN: st.prepared.amountN, context: ofTotal },
      sentence: `${wholeMemo ? 'The complete credit memo is' : `${findings(n)} ${isAre(n)}`} in an email that isn’t confirmed as sent. Answer “Did you send it?” above${st.open.count > n ? ' before disputing more' : ''}.`,
      action: null,
    }
  }
  if (st.open.count > 0) {
    if (wholeMemo)
      return {
        hero: total,
        sentence: 'A breakdown by finding isn’t available, so you’ll dispute the complete credit memo.',
        action: 'send',
      }
    if (!hasDisputes)
      return {
        hero: total,
        sentence: `Tick the findings you want to claim back from ${provider}, then choose Review & send.`,
        action: null,
      }
    const waitingClause =
      st.waiting.count > 0
        ? `${findings(st.waiting.count)} ${isAre(st.waiting.count)} waiting on ${provider}’s answer.`
        : ''
    return {
      hero: { label: 'Still to dispute', amountN: st.open.amountN, context: ofTotal },
      sentence: [`${findings(st.open.count)} can still be disputed.`, waitingClause].filter(Boolean).join(' '),
      action: null,
    }
  }
  if (st.waiting.count > 0)
    return {
      hero: { label: `Waiting on ${provider}`, amountN: st.waiting.amountN, context: ofTotal },
      sentence: wholeMemo
        ? `Record ${provider}’s answer in the dispute below when they reply.`
        : `Record each answer in the dispute below when ${provider} replies.`,
      action: null,
    }
  return hasDisputes
    ? { hero: { label: 'Recovered', amountN: st.collectedN, context: ofTotal }, sentence: 'Every finding has a final outcome.', action: null }
    : { hero: total, sentence: 'Nothing left to dispute: the deadline has passed for every finding.', action: null }
}

/** Biggest findings first. With more than 3, show those covering 95% of the
 *  amount (at least 2) and collapse the rest; filtering shows everything. */
export function splitFindings<T extends { varN: number }>(
  groups: readonly T[],
  opts: { showAll: boolean },
): { visible: T[]; hidden: T[] } {
  const sorted = [...groups].sort((a, b) => b.varN - a.varN)
  if (opts.showAll || sorted.length <= 3) return { visible: sorted, hidden: [] }
  const total = sorted.reduce((s, g) => s + g.varN, 0)
  let covered = 0
  let n = 0
  while (n < sorted.length && (n < 2 || covered < total * 0.95)) {
    covered += sorted[n]?.varN ?? 0
    n++
  }
  return { visible: sorted.slice(0, n), hidden: sorted.slice(n) }
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
  /** Findings reserved by a prepared email (their status is "In a prepared email"). */
  preparedIds: ReadonlySet<string> = new Set(),
): FindingGroup[] {
  const anyMatch = (key: string, candidates: readonly string[]) =>
    (filters[key]?.length ?? 0) === 0 || candidates.some((c) => matchesFilter(filters, key, c))
  return groups.filter((g) => {
    if (!anyMatch(FINDING_FILTER_KEYS.carrier, g.carriers)) return false
    if (!anyMatch(FINDING_FILTER_KEYS.service, serviceList(g))) return false
    if ((filters[FINDING_FILTER_KEYS.disputeStatus]?.length ?? 0) > 0) {
      const inDisputeSel = !excludedIds.includes(g.id)
      const sl = groupStatusLine(
        { ...g, prepared: preparedIds.has(g.id), amountN: g.varN, threePl: provider, inDisputeSel },
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
