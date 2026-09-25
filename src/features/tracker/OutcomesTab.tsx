/** Parcel Credit Tracker — Credit Outcomes tab (template ~1406–1563). */
import { useState } from 'react'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { fmtMoney } from '@/domain/money'
import { fmtDateLong } from '@/domain/dates'
import {
  COLLECTION_LABELS,
  STATUS_LABELS,
  RECOVERY_BUCKETS,
  groupStatusLine,
  outcomesBy3pl,
} from '@/domain/outcomes'
import type { OutcomeRow } from '@/data/source'
import { useClock } from '@/lib/clock'
import { COLLECTION_TONE, GROUP_STATUS_TONE } from '@/features/status-tones'
import type { StatusTone } from '@/ui/Chip/StatusChip'
import { Button, ButtonLink } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { EmptyState } from '@/ui/Display/Display'
import { ActionTab, ActionTabs, type ActionTabType } from '@/ui/Tabs/Tabs'
import { Table, TableScroll } from '@/ui/Table/Table'
import {
  FilterButton,
  FilterGroup,
  activeFilterCount,
  matchesFilter,
  useFilters,
  type FilterField,
  type FilterValues,
} from '@/ui/Filters/Filters'
import { useOutcomeRows } from './api'
import { dispositionAmounts, dispositionDonut, dispositionMatch, type DispositionKey } from './derive'
import styles from './OutcomesTab.module.css'

const DASH = '—'

type SliceFilter = DispositionKey | 'all'

const EMPTY_FILTERS: FilterValues = {
  ocPeriod: [],
  ocProvider: [],
  ocGroup: [],
  ocPursuit: [],
  ocOutcome: [],
}

const METRIC_TYPE: Partial<Record<DispositionKey, ActionTabType>> = { collected: 'positive', notRecovered: 'negative' }

const METRIC_DEFS: { key: SliceFilter; label: string; type: ActionTabType }[] = [
  { key: 'all', label: 'Total identified', type: 'neutral' },
  ...RECOVERY_BUCKETS.map((b) => ({ key: b.key, label: b.label, type: METRIC_TYPE[b.key] ?? 'neutral' })),
]

const PURSUIT_OPTIONS = [
  { value: 'eligible', label: STATUS_LABELS.eligible },
  { value: 'pursued', label: 'Disputed' },
  { value: 'not_pursued', label: STATUS_LABELS.not_pursued },
  { value: 'expired', label: STATUS_LABELS.expired },
]

/** The filter chips a donut slice stands for (display only; rows are
 *  filtered by the slice itself). */
const SLICE_CHIPS: Record<DispositionKey, { ocPursuit: string[]; ocOutcome: string[] }> = {
  open: { ocPursuit: ['eligible'], ocOutcome: [] },
  awaiting: { ocPursuit: ['pursued'], ocOutcome: ['awaiting'] },
  collected: { ocPursuit: ['pursued'], ocOutcome: ['full', 'partial'] },
  notRecovered: { ocPursuit: ['pursued'], ocOutcome: ['partial', 'not_issued'] },
  notDisputed: { ocPursuit: ['not_pursued', 'expired'], ocOutcome: [] },
}

const rowKey = (g: OutcomeRow) => `${g.memoId}-${g.id}`

const OUTCOME_OPTIONS = [
  { value: 'awaiting', label: COLLECTION_LABELS.awaiting },
  { value: 'partial', label: COLLECTION_LABELS.partial },
  { value: 'full', label: COLLECTION_LABELS.full },
  { value: 'not_issued', label: COLLECTION_LABELS.not_issued },
]

function sameValues(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  const x = a ?? []
  const y = b ?? []
  return x.length === y.length && x.every((v) => y.includes(v))
}

export function OutcomesTab() {
  const rowsQ = useOutcomeRows()
  const now = useClock().now()
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_FILTERS)
  const [disposition, setDisposition] = useState<SliceFilter>('all')
  const [hoverSlice, setHoverSlice] = useState<DispositionKey | null>(null)
  const [selectedSlice, setSelectedSlice] = useState<DispositionKey | null>(null)
  const [openNotesId, setOpenNotesId] = useState<string | null>(null)

  const allRows = rowsQ.data ?? []
  const opts = (vals: string[]) => [...new Set(vals)].sort().map((v) => ({ value: v, label: v }))
  const filterFields: FilterField[] = [
    { key: 'ocPeriod', label: 'Credit memo', options: opts(allRows.map((g) => g.memoId)) },
    { key: 'ocProvider', label: 'Biller', options: opts(allRows.map((g) => g.threePl).filter(Boolean)) },
    { key: 'ocGroup', label: 'Variance group', options: opts(allRows.map((g) => g.category || g.title)) },
    { key: 'ocPursuit', label: 'Pursuit status', options: PURSUIT_OPTIONS },
    { key: 'ocOutcome', label: 'Collection outcome', options: OUTCOME_OPTIONS },
  ]

  const shownValues: FilterValues = disposition === 'all' ? filterValues : { ...filterValues, ...SLICE_CHIPS[disposition] }

  const onFilterChange = (next: FilterValues) => {
    const statusTouched = !sameValues(next.ocPursuit, shownValues.ocPursuit) || !sameValues(next.ocOutcome, shownValues.ocOutcome)
    if (statusTouched) {
      setDisposition('all')
      setSelectedSlice(null)
      setFilterValues(next)
    } else {
      setFilterValues({ ...next, ocPursuit: filterValues.ocPursuit ?? [], ocOutcome: filterValues.ocOutcome ?? [] })
    }
  }

  const filters = useFilters(filterFields, shownValues, onFilterChange)

  if (!rowsQ.data) return null

  // Pursuit filter value: pursued, or the unpursued state (eligible / not pursued / expired).
  const pursuitKey = (g: OutcomeRow) => (g.pursuit === 'pursued' ? 'pursued' : groupStatusLine(g, now).key)

  let rows = allRows.filter(
    (g) =>
      matchesFilter(filterValues, 'ocPeriod', g.memoId) &&
      matchesFilter(filterValues, 'ocProvider', g.threePl) &&
      matchesFilter(filterValues, 'ocGroup', g.category || g.title),
  )
  const donutRows = rows
  if (disposition !== 'all') {
    rows = rows.filter((g) => dispositionMatch(g, disposition, now))
  } else {
    rows = rows.filter(
      (g) =>
        matchesFilter(filterValues, 'ocPursuit', pursuitKey(g)) &&
        matchesFilter(filterValues, 'ocOutcome', g.collection?.status ?? ''),
    )
  }

  const disp = dispositionAmounts(donutRows, now)
  const donut = dispositionDonut(donutRows, now)
  const metricValue: Record<SliceFilter, string> = {
    all: donut.total,
    open: fmtMoney(disp.open),
    awaiting: fmtMoney(disp.awaiting),
    collected: fmtMoney(disp.collected),
    notRecovered: fmtMoney(disp.notRecovered),
    notDisputed: fmtMoney(disp.notDisputed),
  }
  const activeKey = hoverSlice ?? selectedSlice
  const slicesWithUi = donut.slices.map((s) => ({
    ...s,
    strokeWidth: s.key === activeKey ? 18 : 14,
    highlighted: s.key === activeKey,
  }))
  const slicesZVisible = [...slicesWithUi].sort((a, b) => b.amountN - a.amountN).filter((s) => s.amountN > 0)
  const slicesVisible = slicesWithUi.filter((s) => s.amountN > 0)

  const onSliceClick = (k: DispositionKey) => {
    if (disposition === k) {
      setDisposition('all')
      setSelectedSlice(null)
    } else {
      setDisposition(k)
      setSelectedSlice(k)
      setFilterValues((f) => ({ ...f, ocPursuit: [], ocOutcome: [] }))
    }
  }

  const table = rows.map((g) => {
    const sl = groupStatusLine(g, now)
    const ci: { label: string; tone: StatusTone } =
      g.pursuit === 'pursued'
        ? { label: COLLECTION_LABELS[g.collection?.status ?? 'awaiting'], tone: COLLECTION_TONE[g.collection?.status ?? 'awaiting'] }
        : { label: sl.label, tone: GROUP_STATUS_TONE[sl.key] }
    const reason =
      g.collection?.status === 'not_issued' && g.collection.reason
        ? {
            text: g.collection.reason,
            author: g.collection.changedBy ?? 'Tori Matthews',
            when: g.collection.changedAt ?? '',
          }
        : null
    const isNotIssued = g.collection?.status === 'not_issued'
    return {
      g,
      ci,
      reason,
      isNotIssued,
      canExpand: !!reason,
      notesOpen: !!reason && openNotesId === g.id,
    }
  })

  const oc3pl = outcomesBy3pl(allRows)
  const activeCount = activeFilterCount(filterValues) + (disposition !== 'all' ? 1 : 0)
  const groupClearVisible = filters.expanded && activeFilterCount(shownValues) > 0
  const showClearAll = activeCount > 0 && !groupClearVisible
  const clearAll = () => {
    setFilterValues(EMPTY_FILTERS)
    setDisposition('all')
    setSelectedSlice(null)
    setOpenNotesId(null)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ActionTabs ariaLabel="Credit outcome totals">
        {METRIC_DEFS.map((md) => (
          <ActionTab
            key={md.key}
            label={md.label}
            value={metricValue[md.key]}
            type={md.type}
            active={disposition === md.key}
            onClick={() => {
              if (md.key === 'all') {
                setDisposition('all')
                setSelectedSlice(null)
              } else {
                onSliceClick(md.key)
              }
            }}
          />
        ))}
      </ActionTabs>

      {/* Status breakdown donut */}
      <div className="db-card" style={{ gap: 12 }}>
        <div className="db-eyebrow">Status breakdown</div>
        <p className="imp-small" style={{ margin: 0 }}>
          See where identified billing variance currently sits across all of your parcel credit memos.
        </p>
        {donut.empty ? (
          <EmptyState
            title="No credit outcomes match these filters"
            subtitle="Adjust your filters to view another set of credit outcomes."
            action={
              <Button size="small" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 220, height: 220, flex: 'none' }}>
              <svg viewBox="0 0 160 160" width="220" height="220" aria-hidden="true" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="var(--ds-bg-default)" strokeWidth="18" />
                {slicesZVisible.map((s) => (
                  <g
                    key={s.key}
                    onMouseEnter={() => setHoverSlice(s.key)}
                    onMouseLeave={() => setHoverSlice(null)}
                    onClick={() => onSliceClick(s.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx="80"
                      cy="80"
                      r="68"
                      fill="none"
                      stroke={s.color}
                      strokeLinecap="round"
                      strokeWidth={s.strokeWidth}
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                      style={{ transition: 'stroke-width 120ms ease' }}
                    />
                  </g>
                ))}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                <div className="ds-caption-tiny" style={{ color: 'var(--ds-fg-muted)', textTransform: 'uppercase' }}>
                  Total identified
                </div>
                <div style={{ font: 'var(--ds-weight-semi) 21px/1.32 var(--ds-font)', color: 'var(--ds-fg-default)', fontVariantNumeric: 'tabular-nums' }}>
                  {donut.total}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, width: '100%' }}>
              {slicesVisible.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={disposition === s.key}
                  className={[styles.legendBtn, s.highlighted ? styles.legendBtnActive : ''].filter(Boolean).join(' ')}
                  onMouseEnter={() => setHoverSlice(s.key)}
                  onMouseLeave={() => setHoverSlice(null)}
                  onClick={() => onSliceClick(s.key)}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 'var(--ds-radius-full)', background: s.color, flex: 'none', marginTop: 3 }} />
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <span style={{ display: 'block', font: 'var(--ds-weight-semi) 14px/1.46 var(--ds-font)', color: 'var(--ds-fg-default)' }}>{s.label}</span>
                    <span className="imp-small" style={{ display: 'block', margin: 0 }}>
                      {s.amount} · {s.pct}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="db-card" style={{ gap: 14 }}>
        <div className="db-eyebrow">Filters</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <FilterButton filters={filters} />
          <span className="imp-small" style={{ margin: 0 }}>
            {activeCount} active filter{activeCount === 1 ? '' : 's'} · Showing {table.length} of {allRows.length} findings
          </span>
          {showClearAll && (
            <Button
              size="small"
              style={{ marginInlineStart: 'auto' }}
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>
        <FilterGroup filters={filters} />
      </div>

      <div>
        <h3 className="db-h3" style={{ margin: 0 }}>
          Credit memo findings and dispute outcomes
        </h3>
        <p className="imp-small" style={{ margin: '6px 0 0' }}>
          Review the current status of each variance group, including the credit memo and the dispute it was sent in.
        </p>
      </div>

      {/* Findings table */}
      <div className="db-card" style={{ gap: 0, padding: 0 }}>
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <th>Variance group</th>
                <th>Credit memo</th>
                <th>Biller</th>
                <th className="num">Identified</th>
                <th className="num">Disputed</th>
                <th className="num">Recovered</th>
                <th>Dispute deadline</th>
                <th>Dispute</th>
                <th>Outcome</th>
                <th>Outcome date</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {table.map(({ g, ci, reason, isNotIssued, canExpand, notesOpen }) => (
                <RowGroup
                  key={rowKey(g)}
                  g={g}
                  ci={ci}
                  reason={reason}
                  isNotIssued={isNotIssued}
                  canExpand={canExpand}
                  notesOpen={notesOpen}
                  onToggleNotes={() => setOpenNotesId((cur) => (cur === g.id ? null : g.id))}
                />
              ))}
            </tbody>
          </Table>
        </TableScroll>
      </div>

      {/* Biller credit outcomes */}
      <div className="db-card" style={{ gap: 14 }}>
        <div className="db-eyebrow">Biller credit outcomes</div>
        <p className="imp-small" style={{ margin: 0 }}>
          Which findings your billers pay back or deny, by Biller and variance-group category.
        </p>
        <TableScroll>
          <Table>
            <thead>
              <tr>
                <th>Biller</th>
                <th>Variance group</th>
                <th className="num">Amount disputed</th>
                <th className="num">Amount recovered</th>
                <th className="num">Fully / partly collected</th>
                <th className="num">Denied</th>
                <th className="num">Collection rate</th>
              </tr>
            </thead>
            <tbody>
              {oc3pl.map((r) => (
                <tr key={`${r.threePl}-${r.category}`}>
                  <td style={{ fontWeight: 600 }}>{r.threePl}</td>
                  <td className="ds-muted">{r.category}</td>
                  <td className="num">{r.pursued}</td>
                  <td className="num">{r.collected}</td>
                  <td className="num">{r.fullOrPartial}</td>
                  <td className="num">{r.notIssued}</td>
                  <td className="num">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      </div>
    </div>
  )
}

function RowGroup({
  g,
  ci,
  reason,
  isNotIssued,
  canExpand,
  notesOpen,
  onToggleNotes,
}: {
  g: OutcomeRow
  ci: { label: string; tone: StatusTone }
  reason: { text: string; author: string; when: string } | null
  isNotIssued: boolean
  canExpand: boolean
  notesOpen: boolean
  onToggleNotes: () => void
}) {
  const awaiting = g.pursuit === 'pursued' && (!g.collection || g.collection.status === 'awaiting')
  const action =
    g.pursuit !== 'pursued'
      ? { to: `/memos/${g.memoId}`, label: 'Review finding' }
      : awaiting
        ? { to: `/memos/${g.memoId}?outcomes=1`, label: 'Record outcome' }
        : { to: `/memos/${g.memoId}?dispute=1`, label: 'View dispute' }
  const chevron = notesOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />
  return (
    <>
      <tr>
        <td style={{ fontWeight: 600 }}>
          {canExpand ? (
            <Link bold iconLeft={chevron} aria-expanded={notesOpen} onClick={onToggleNotes}>
              {g.title}
            </Link>
          ) : (
            g.title
          )}
        </td>
        <td className="ds-muted nowrap">{g.memoId}</td>
        <td className="ds-muted">{g.threePl || DASH}</td>
        <td className="num">{fmtMoney(g.amountN ?? 0)}</td>
        <td className="num">{g.pursuit === 'pursued' ? fmtMoney(g.amountN ?? 0) : DASH}</td>
        <td className="num">{g.collection?.amountN != null ? fmtMoney(g.collection.amountN) : DASH}</td>
        <td className="ds-muted nowrap">{g.disputeDeadline ? fmtDateLong(g.disputeDeadline) : DASH}</td>
        <td className="ds-muted nowrap">
          {g.pursuit === 'pursued' ? (
            <>
              {g.threePl || 'Biller'} dispute
              <br />
              {g.pursuedAt ?? DASH}
            </>
          ) : (
            DASH
          )}
        </td>
        <td>
          <StatusChip tone={ci.tone}>{ci.label}</StatusChip>
        </td>
        <td className="ds-muted nowrap">{g.collection?.date ? fmtDateLong(g.collection.date) : DASH}</td>
        <td>
          {reason ? (
            <Link variant="accent" size="small" bold iconRight={chevron} aria-expanded={notesOpen} onClick={onToggleNotes}>
              View reason
            </Link>
          ) : isNotIssued ? (
            <span className="ds-muted">No reason provided</span>
          ) : (
            <span className="ds-muted">—</span>
          )}
        </td>
        <td>
          <ButtonLink to={action.to} size="small" iconRight={<ArrowRightIcon aria-hidden="true" />} style={{ whiteSpace: 'nowrap' }}>
            {action.label}
          </ButtonLink>
        </td>
      </tr>
      {notesOpen && reason && (
        <tr>
          <td colSpan={12} style={{ background: 'var(--ds-bg-disabled)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '70ch' }}>
              <span style={{ font: 'var(--ds-weight-semi) 12px/1.64 var(--ds-font)', color: 'var(--ds-fg-muted)' }}>Why the Biller declined</span>
              <p className="ds-body-base" style={{ margin: 0, color: 'var(--ds-fg-default)' }}>
                “{reason.text}”
              </p>
              <span className="imp-small" style={{ margin: 0, color: 'var(--ds-fg-muted)' }}>
                Added by {reason.author} · {reason.when}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
