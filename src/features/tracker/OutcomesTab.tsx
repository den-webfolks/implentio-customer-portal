/** Parcel Credit Tracker — Credit Outcomes tab (template ~1406–1563). */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { fmtMoney } from '@/domain/money'
import { fmtDateLong } from '@/domain/dates'
import { collectionPill, outcomesBy3pl } from '@/domain/outcomes'
import type { OutcomeRow } from '@/data/source'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { EmptyState } from '@/ui/Display/Display'
import { ActionTab, ActionTabs, type ActionTabType } from '@/ui/Tabs/Tabs'
import { Table } from '@/ui/Table/Table'
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

const METRIC_DEFS: { key: SliceFilter; label: string; type: ActionTabType }[] = [
  { key: 'all', label: 'Total identified', type: 'neutral' },
  { key: 'eligible', label: 'Eligible to pursue', type: 'neutral' },
  { key: 'awaiting', label: 'Awaiting outcome', type: 'neutral' },
  { key: 'collected', label: 'Collected', type: 'positive' },
  { key: 'denied', label: 'Denied by Biller', type: 'negative' },
]

const PURSUIT_OPTIONS = [
  { value: 'eligible', label: 'Eligible to pursue' },
  { value: 'pursued', label: 'Pursued with Biller' },
]

const OUTCOME_OPTIONS = [
  { value: 'awaiting', label: 'Awaiting outcome' },
  { value: 'partial', label: 'Partially collected' },
  { value: 'full', label: 'Fully collected' },
  { value: 'not_issued', label: 'Denied by Biller' },
]

function sameValues(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  const x = a ?? []
  const y = b ?? []
  return x.length === y.length && x.every((v) => y.includes(v))
}

export function OutcomesTab() {
  const navigate = useNavigate()
  const rowsQ = useOutcomeRows()
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

  const shownValues: FilterValues =
    disposition === 'all'
      ? filterValues
      : {
          ...filterValues,
          ocPursuit: [disposition === 'eligible' ? 'eligible' : 'pursued'],
          ocOutcome: disposition === 'denied' ? ['not_issued'] : (filterValues.ocOutcome ?? []),
        }

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

  let rows = allRows.filter(
    (g) =>
      matchesFilter(filterValues, 'ocPeriod', g.memoId) &&
      matchesFilter(filterValues, 'ocProvider', g.threePl) &&
      matchesFilter(filterValues, 'ocGroup', g.category || g.title),
  )
  const donutRows = rows
  if (disposition !== 'all') {
    rows = rows.filter((g) => dispositionMatch(g, disposition))
  } else {
    rows = rows.filter(
      (g) =>
        matchesFilter(filterValues, 'ocPursuit', g.pursuit === 'pursued' ? 'pursued' : 'eligible') &&
        matchesFilter(filterValues, 'ocOutcome', g.collection?.status ?? ''),
    )
  }

  const disp = dispositionAmounts(donutRows)
  const donut = dispositionDonut(donutRows)
  const identified = fmtMoney(disp.eligible + disp.awaiting + disp.collected + disp.denied)
  const metricValue: Record<SliceFilter, string> = {
    all: identified,
    eligible: fmtMoney(disp.eligible),
    awaiting: fmtMoney(disp.awaiting),
    collected: fmtMoney(disp.collected),
    denied: fmtMoney(disp.denied),
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
    const ci = collectionPill(g)
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

  const openMemo = (memoId: string, pursued: boolean) => {
    void pursued
    navigate(`/memos/${memoId}`)
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
          <EmptyState title="No credit outcomes match these filters" subtitle="Adjust your filters to view another set of credit outcomes." />
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
                <div style={{ font: 'var(--ds-weight-semi) 22px var(--ds-font)', color: 'var(--ds-fg-default)', fontVariantNumeric: 'tabular-nums' }}>
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
                    <span style={{ display: 'block', font: 'var(--ds-weight-semi) 13px var(--ds-font)', color: 'var(--ds-fg-default)' }}>{s.label}</span>
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
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setFilterValues(EMPTY_FILTERS)
                setDisposition('all')
                setSelectedSlice(null)
                setOpenNotesId(null)
              }}
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
          Review the current status of each variance group, including the credit memo and dispute in which it was pursued.
        </p>
      </div>

      {/* Findings table */}
      <div className="db-card" style={{ gap: 0, padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th>Variance group</th>
                <th>Credit memo</th>
                <th>Biller</th>
                <th className="num">Identified</th>
                <th className="num">Pursued</th>
                <th className="num">Collected</th>
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
                  key={`${g.memoId}-${g.id}`}
                  g={g}
                  ci={ci}
                  reason={reason}
                  isNotIssued={isNotIssued}
                  canExpand={canExpand}
                  notesOpen={notesOpen}
                  onToggleNotes={() => setOpenNotesId((cur) => (cur === g.id ? null : g.id))}
                  onOpenMemo={() => openMemo(g.memoId, g.pursuit === 'pursued')}
                />
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Biller credit outcomes */}
      <div className="db-card" style={{ gap: 14 }}>
        <div className="db-eyebrow">Biller credit outcomes</div>
        <p className="imp-small" style={{ margin: 0 }}>
          Which findings your biller accepts or rejects, by Biller and variance-group category.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th>Biller</th>
                <th>Variance group</th>
                <th className="num">Amount pursued</th>
                <th className="num">Amount collected</th>
                <th className="num">Fully / partially collected</th>
                <th className="num">Credit not issued</th>
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
        </div>
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
  onOpenMemo,
}: {
  g: OutcomeRow
  ci: ReturnType<typeof collectionPill>
  reason: { text: string; author: string; when: string } | null
  isNotIssued: boolean
  canExpand: boolean
  notesOpen: boolean
  onToggleNotes: () => void
  onOpenMemo: () => void
}) {
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
        <td className="ds-muted">{g.memoId}</td>
        <td className="ds-muted">{g.threePl || DASH}</td>
        <td className="num">{fmtMoney(g.amountN ?? 0)}</td>
        <td className="num">{g.pursuit === 'pursued' ? fmtMoney(g.amountN ?? 0) : DASH}</td>
        <td className="num">{g.collection?.amountN != null ? fmtMoney(g.collection.amountN) : DASH}</td>
        <td className="ds-muted">{g.disputeDeadline ? fmtDateLong(g.disputeDeadline) : DASH}</td>
        <td className="ds-muted">
          {g.pursuit === 'pursued' ? `${g.threePl || 'Biller'} dispute · ${g.pursuedAt ?? DASH}` : DASH}
        </td>
        <td>
          <StatusChip tone={ci ? ci.tone : 'neutral'}>{ci ? ci.label : 'Eligible to pursue'}</StatusChip>
        </td>
        <td className="ds-muted">{g.collection?.date ? fmtDateLong(g.collection.date) : DASH}</td>
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
          <Button size="small" iconRight={<ArrowRightIcon aria-hidden="true" />} style={{ whiteSpace: 'nowrap' }} onClick={onOpenMemo}>
            {g.pursuit === 'pursued' ? 'View dispute' : 'Review finding'}
          </Button>
        </td>
      </tr>
      {notesOpen && reason && (
        <tr>
          <td colSpan={12} style={{ background: 'var(--ds-bg-disabled)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '70ch' }}>
              <span style={{ font: 'var(--ds-weight-semi) 12px var(--ds-font)', color: 'var(--ds-fg-muted)' }}>Why the credit was not issued</span>
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
