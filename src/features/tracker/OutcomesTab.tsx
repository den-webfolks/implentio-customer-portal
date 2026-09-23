/** Parcel Credit Tracker — Credit Outcomes tab (template ~1406–1563). */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { fmtMoney } from '@/domain/money'
import { fmtDateLong } from '@/domain/dates'
import { collectionPill, outcomesBy3pl } from '@/domain/outcomes'
import type { OutcomeRow } from '@/data/source'
import { useOutcomeRows } from './api'
import { dispositionAmounts, dispositionDonut, dispositionMatch, type DispositionKey } from './derive'
import styles from './OutcomesTab.module.css'

const DASH = '—'

type SliceFilter = DispositionKey | 'all'

interface OcFilters {
  ocPeriod: string
  ocProvider: string
  ocGroup: string
  ocPursuit: string
  ocOutcome: string
}

const INITIAL_FILTERS: OcFilters = {
  ocPeriod: 'all',
  ocProvider: 'all',
  ocGroup: 'all',
  ocPursuit: 'all',
  ocOutcome: 'all',
}

const METRIC_DEFS: { key: SliceFilter; label: string; color: string }[] = [
  { key: 'all', label: 'Total identified', color: 'var(--imp-ink)' },
  { key: 'eligible', label: 'Eligible to pursue', color: 'var(--imp-purple-500)' },
  { key: 'awaiting', label: 'Awaiting outcome', color: 'var(--imp-orange-500)' },
  { key: 'collected', label: 'Collected', color: 'var(--imp-success)' },
  { key: 'denied', label: 'Denied by Biller', color: '#B8756D' },
]

export function outcomePillStyle(tone: 'success' | 'warn' | 'muted' | 'eligible'): React.CSSProperties {
  switch (tone) {
    case 'success':
      return { background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)' }
    case 'warn':
      return { background: 'var(--imp-warning-bg)', color: '#8a5a05', borderColor: 'var(--imp-warning)' }
    case 'muted':
      return { background: 'var(--imp-gray-200)', color: 'var(--imp-fg-muted)', borderColor: 'var(--imp-gray-300)' }
    case 'eligible':
      return { background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', borderColor: 'var(--imp-purple-300)' }
  }
}

export function OutcomesTab() {
  const navigate = useNavigate()
  const rowsQ = useOutcomeRows()
  const [filters, setFilters] = useState<OcFilters>(INITIAL_FILTERS)
  const [disposition, setDisposition] = useState<SliceFilter>('all')
  const [hoverSlice, setHoverSlice] = useState<DispositionKey | null>(null)
  const [selectedSlice, setSelectedSlice] = useState<DispositionKey | null>(null)
  const [openNotesId, setOpenNotesId] = useState<string | null>(null)

  if (!rowsQ.data) return null
  const allRows = rowsQ.data

  const opts = (vals: string[]) =>
    [...new Set(vals)].sort().map((v) => ({ value: v, label: v }))
  const memoOpts = opts(allRows.map((g) => g.memoId))
  const provOpts = opts(allRows.map((g) => g.threePl).filter(Boolean))
  const groupOpts = opts(allRows.map((g) => g.category || g.title))

  let rows = allRows
  if (filters.ocPeriod !== 'all') rows = rows.filter((g) => g.memoId === filters.ocPeriod)
  if (filters.ocProvider !== 'all') rows = rows.filter((g) => g.threePl === filters.ocProvider)
  if (filters.ocGroup !== 'all') rows = rows.filter((g) => (g.category || g.title) === filters.ocGroup)
  const donutRows = rows
  if (disposition !== 'all') {
    rows = rows.filter((g) => dispositionMatch(g, disposition))
  } else {
    if (filters.ocPursuit !== 'all')
      rows = rows.filter((g) => (g.pursuit === 'pursued' ? 'pursued' : 'eligible') === filters.ocPursuit)
    if (filters.ocOutcome !== 'all') rows = rows.filter((g) => g.collection?.status === filters.ocOutcome)
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
    legendBg: s.key === activeKey ? 'var(--imp-gray-100)' : 'transparent',
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
      setFilters((f) => ({ ...f, ocPursuit: 'all', ocOutcome: 'all' }))
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
  const activeCount =
    Object.values(filters).filter((v) => v !== 'all').length + (disposition !== 'all' ? 1 : 0)
  const hasFilters = activeCount > 0

  const filterDefs = [
    { key: 'ocPeriod' as const, label: 'Credit memo', allLabel: 'All credit memos', options: memoOpts, value: filters.ocPeriod, active: filters.ocPeriod !== 'all' },
    { key: 'ocProvider' as const, label: 'Biller', allLabel: 'All Billers', options: provOpts, value: filters.ocProvider, active: filters.ocProvider !== 'all' },
    { key: 'ocGroup' as const, label: 'Variance group', allLabel: 'All variance groups', options: groupOpts, value: filters.ocGroup, active: filters.ocGroup !== 'all' },
    {
      key: 'ocPursuit' as const,
      label: 'Pursuit status',
      allLabel: 'All pursuit statuses',
      options: [
        { value: 'eligible', label: 'Eligible to pursue' },
        { value: 'pursued', label: 'Pursued with Biller' },
      ],
      value: disposition === 'eligible' ? 'eligible' : disposition !== 'all' ? 'pursued' : filters.ocPursuit,
      active: filters.ocPursuit !== 'all' || disposition !== 'all',
    },
    {
      key: 'ocOutcome' as const,
      label: 'Collection outcome',
      allLabel: 'All collection outcomes',
      options: [
        { value: 'awaiting', label: 'Awaiting outcome' },
        { value: 'partial', label: 'Partially collected' },
        { value: 'full', label: 'Fully collected' },
        { value: 'not_issued', label: 'Denied by Biller' },
      ],
      value: disposition === 'denied' ? 'not_issued' : filters.ocOutcome,
      active: filters.ocOutcome !== 'all' || (disposition !== 'all' && disposition !== 'eligible'),
    },
  ]

  const openMemo = (memoId: string, pursued: boolean) => {
    void pursued
    navigate(`/memos/${memoId}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* KPI segments */}
      <div className={styles.metricGrid}>
        {METRIC_DEFS.map((md) => {
          const active = disposition === md.key
          return (
            <button
              key={md.key}
              type="button"
              className={styles.metricBtn}
              aria-pressed={active}
              style={{ borderTop: `3px solid ${active ? md.color : 'transparent'}` }}
              onClick={() => (md.key === 'all' ? (setDisposition('all'), setSelectedSlice(null)) : onSliceClick(md.key))}
            >
              <div className="db-kpi-sub">{md.label}</div>
              <div className={styles.metricNum} style={{ color: md.color }}>
                {metricValue[md.key]}
              </div>
            </button>
          )
        })}
      </div>

      {/* Status breakdown donut */}
      <div className="db-card" style={{ gap: 12 }}>
        <div className="db-eyebrow">Status breakdown</div>
        <p className="imp-small" style={{ margin: 0 }}>
          See where identified billing variance currently sits across all of your parcel credit memos.
        </p>
        {donut.empty ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ font: '600 15px var(--imp-font-body)', color: 'var(--imp-ink)' }}>
              No credit outcomes match these filters
            </div>
            <p className="imp-small" style={{ margin: '6px 0 0' }}>
              Adjust your filters to view another set of credit outcomes.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 220, height: 220, flex: 'none' }}>
              <svg viewBox="0 0 160 160" width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="68" fill="none" stroke="#FFFFFF" strokeWidth="18" />
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
                <div className="db-kpi-sub">Total identified</div>
                <div style={{ font: '600 22px var(--imp-font-display)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>
                  {donut.total}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, width: '100%' }}>
              {slicesVisible.map((s) => (
                <div
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setHoverSlice(s.key)}
                  onMouseLeave={() => setHoverSlice(null)}
                  onClick={() => onSliceClick(s.key)}
                  onKeyDown={(e) => e.key === 'Enter' && onSliceClick(s.key)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: s.legendBg }}
                >
                  <span style={{ width: 11, height: 11, borderRadius: 999, background: s.color, flex: 'none', marginTop: 3 }} />
                  <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{s.label}</div>
                    <div className="imp-small" style={{ margin: 0 }}>
                      {s.amount} · {s.pct}
                    </div>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="db-card" style={{ gap: 14 }}>
        <div className="db-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <img src="/brand/filter.svg" alt="" style={{ width: 13, height: 13 }} />
          Filters
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {filterDefs.map((f) => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>{f.label}</span>
              <select
                className="ia-input"
                value={f.value}
                style={{
                  padding: '8px 10px',
                  width: '100%',
                  ...(f.active ? { borderColor: 'var(--imp-purple-400)', boxShadow: '0 0 0 1px var(--imp-purple-200)' } : {}),
                }}
                onChange={(e) => {
                  const v = e.target.value
                  if (f.key === 'ocPursuit' || f.key === 'ocOutcome') {
                    setDisposition('all')
                    setSelectedSlice(null)
                  }
                  setFilters((prev) => ({ ...prev, [f.key]: v }))
                }}
              >
                <option value="all">{f.allLabel}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="imp-small" style={{ margin: 0 }}>
            {activeCount} active filter{activeCount === 1 ? '' : 's'} · Showing {table.length} of {allRows.length} findings
          </span>
          {hasFilters && (
            <button
              type="button"
              className="db-btn db-btn-secondary db-btn-sm"
              onClick={() => {
                setFilters(INITIAL_FILTERS)
                setDisposition('all')
                setSelectedSlice(null)
                setOpenNotesId(null)
              }}
            >
              Clear all
            </button>
          )}
        </div>
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
          <table className="db-table db-table-compact">
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
          </table>
        </div>
      </div>

      {/* Biller credit outcomes */}
      <div className="db-card" style={{ gap: 14 }}>
        <div className="db-eyebrow">Biller credit outcomes</div>
        <p className="imp-small" style={{ margin: 0 }}>
          Which findings your biller accepts or rejects, by Biller and variance-group category.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="db-table db-table-compact">
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
                  <td style={{ fontWeight: 700 }}>{r.threePl}</td>
                  <td className="db-muted">{r.category}</td>
                  <td className="num">{r.pursued}</td>
                  <td className="num">{r.collected}</td>
                  <td className="num">{r.fullOrPartial}</td>
                  <td className="num">{r.notIssued}</td>
                  <td className="num">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const chevron = (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style={{ color: 'var(--imp-purple-500)', transform: notesOpen ? 'rotate(90deg)' : undefined, transition: 'transform 120ms' }}
    >
      <path d="M2 1L7 5L2 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <>
      <tr>
        <td style={{ fontWeight: 700 }}>
          {canExpand ? (
            <button
              type="button"
              onClick={onToggleNotes}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, font: '700 13px var(--imp-font-body)', color: 'var(--imp-ink)', cursor: 'pointer', textAlign: 'left' }}
            >
              {chevron}
              {g.title}
            </button>
          ) : (
            g.title
          )}
        </td>
        <td className="db-muted">{g.memoId}</td>
        <td className="db-muted">{g.threePl || DASH}</td>
        <td className="num">{fmtMoney(g.amountN ?? 0)}</td>
        <td className="num">{g.pursuit === 'pursued' ? fmtMoney(g.amountN ?? 0) : DASH}</td>
        <td className="num">{g.collection?.amountN != null ? fmtMoney(g.collection.amountN) : DASH}</td>
        <td className="db-muted">{g.disputeDeadline ? fmtDateLong(g.disputeDeadline) : DASH}</td>
        <td className="db-muted">
          {g.pursuit === 'pursued' ? `${g.threePl || 'Biller'} dispute · ${g.pursuedAt ?? DASH}` : DASH}
        </td>
        <td>
          <span className="ia-pill" style={outcomePillStyle(ci ? ci.tone : 'eligible')}>
            {ci ? ci.label : 'Eligible to pursue'}
          </span>
        </td>
        <td className="db-muted">{g.collection?.date ? fmtDateLong(g.collection.date) : DASH}</td>
        <td>
          {reason ? (
            <button
              type="button"
              onClick={onToggleNotes}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-purple-500)', cursor: 'pointer' }}
            >
              View reason
              {chevron}
            </button>
          ) : isNotIssued ? (
            <span className="db-muted">No reason provided</span>
          ) : (
            <span className="db-muted">—</span>
          )}
        </td>
        <td>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={onOpenMemo}>
            {g.pursuit === 'pursued' ? 'View dispute' : 'Review finding'} →
          </button>
        </td>
      </tr>
      {notesOpen && reason && (
        <tr>
          <td colSpan={12} style={{ background: 'var(--imp-gray-100)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '70ch' }}>
              <span style={{ font: '700 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
                Why the credit was not issued
              </span>
              <p className="imp-body" style={{ margin: 0, fontSize: 14, color: 'var(--imp-ink)' }}>
                “{reason.text}”
              </p>
              <span className="imp-small" style={{ margin: 0, color: 'var(--imp-fg-muted)' }}>
                Added by {reason.author} · {reason.when}
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
