/** Account-wide Invoices index (template ~1627–1737). */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useInvoiceIndex } from '@/data/queries'
import type { InvoiceIndexRow } from '@/data/source'
import { fmtMoney } from '@/domain/money'
import { InfoTip } from '@/ui/InfoTip'
import { FilterChips, FilterPanel, type FilterFieldDef, type FilterValues } from '@/ui/FilterPanel/FilterPanel'
import styles from '../tracker/OutcomesTab.module.css'

const EXCEEDS_TIP =
  'The parcel amount reviewed may exceed the original invoice total when an invoice includes credits or negative adjustments. These reduce the invoice total but are excluded from the parcel review.'

const STATUS_PILL: Record<InvoiceIndexRow['status'], { label: string; style: React.CSSProperties }> = {
  variance: {
    label: 'Variance identified',
    style: { background: '#FFE9D6', color: 'var(--imp-orange-500)', borderColor: 'var(--imp-orange-300)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 },
  },
  clear: {
    label: 'No significant variance',
    style: { background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 },
  },
  pending: {
    label: 'Audit not complete',
    style: { background: 'var(--imp-warning-bg)', color: '#8a5a05', borderColor: 'var(--imp-warning)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 },
  },
  historical: {
    label: 'Historical record',
    style: { background: 'var(--imp-gray-200)', color: 'var(--imp-fg-muted)', borderColor: 'var(--imp-gray-300)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 },
  },
}

function periodSortValue(period: string): number {
  const m = period.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2])
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const rowsQ = useInvoiceIndex()
  const [search, setSearch] = useState('')
  const [metric, setMetric] = useState<'all' | 'variance' | 'clear'>('all')
  const [filters, setFilters] = useState<FilterValues>({
    ivBiller: 'all',
    ivCarrier: 'all',
    ivResult: 'all',
    ivMemo: 'all',
  })
  const [sort, setSort] = useState<'asc' | 'desc' | null>(null)

  if (!rowsQ.data) return null
  const all = rowsQ.data

  const filterFields: FilterFieldDef[] = [
    { key: 'ivBiller', label: 'Biller', allLabel: 'All billers', options: [...new Set(all.map((r) => r.biller))].map((v) => ({ value: v, label: v })) },
    { key: 'ivCarrier', label: 'Carrier', allLabel: 'All carriers', options: [...new Set(all.flatMap((r) => r.carriers))].sort().map((v) => ({ value: v, label: v })) },
    {
      key: 'ivResult',
      label: 'Parcel review status',
      allLabel: 'Any review status',
      options: [
        { value: 'variance', label: 'Variance identified' },
        { value: 'clear', label: 'No significant variance identified' },
        { value: 'pending', label: 'Audit not complete' },
        { value: 'historical', label: 'Historical record' },
        { value: 'reviewed', label: 'Parcel invoices reviewed' },
      ],
    },
    {
      key: 'ivMemo',
      label: 'Included in credit memo',
      allLabel: 'All invoices',
      options: [
        { value: 'linked', label: 'Yes' },
        { value: 'unlinked', label: 'No' },
      ],
    },
  ]

  const q = search.trim().toLowerCase()
  let rows = all.filter(
    (r) =>
      (!q || r.inv.toLowerCase().includes(q)) &&
      (filters.ivBiller === 'all' || r.biller === filters.ivBiller) &&
      (filters.ivResult === 'all' ||
        (filters.ivResult === 'reviewed'
          ? r.status === 'variance' || r.status === 'clear'
          : r.status === filters.ivResult)) &&
      (filters.ivCarrier === 'all' || r.carriers.includes(filters.ivCarrier ?? '')) &&
      (filters.ivMemo === 'all' || (filters.ivMemo === 'linked' ? !!r.memoId : !r.memoId)),
  )
  if (metric !== 'all') rows = rows.filter((r) => r.status === metric)
  if (sort) rows = [...rows].sort((a, b) => (periodSortValue(a.period) - periodSortValue(b.period)) * (sort === 'desc' ? -1 : 1))

  const metricDefs = [
    { key: 'all' as const, label: 'All invoices', value: all.length, color: 'var(--imp-purple-500)' },
    { key: 'variance' as const, label: 'Variance identified', value: all.filter((r) => r.status === 'variance').length, color: 'var(--imp-orange-500)' },
    { key: 'clear' as const, label: 'No significant variance', value: all.filter((r) => r.status === 'clear').length, color: 'var(--imp-ink)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ maxWidth: '74ch' }}>
        <h1 className="db-h1" style={{ margin: 0 }}>
          Invoices
        </h1>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          View invoices containing parcel data reviewed by Implentio. For combined invoices, the amounts below distinguish the complete source invoice from the parcel charges included in reconciliation.
        </p>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          Search and filter invoices, review their parcel review status, download original billing records, or open a related credit memo when variance was identified.
        </p>
      </div>

      <div className={styles.metricGrid}>
        {metricDefs.map((md) => (
          <button
            key={md.key}
            type="button"
            className={styles.metricBtn}
            aria-pressed={metric === md.key}
            style={{ borderTop: `3px solid ${metric === md.key ? md.color : 'transparent'}` }}
            onClick={() => setMetric(md.key)}
          >
            <div className="db-kpi-sub">{md.label}</div>
            <div className={styles.metricNum} style={{ color: md.color }}>
              {md.value}
            </div>
          </button>
        ))}
      </div>

      <div className="db-card" style={{ padding: 0, gap: 0, overflow: 'visible', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1.5px solid var(--imp-gray-200)', flexWrap: 'wrap', flex: 'none' }}>
          <input className="ia-input" placeholder="Search invoice number" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 200 }} />
          <FilterPanel fields={filterFields} values={filters} onApply={setFilters} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }} aria-live="polite">
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {rows.length} of {all.length} invoices
            </span>
          </span>
        </div>
        <FilterChips fields={filterFields} values={filters} onClear={(key) => setFilters((f) => ({ ...f, [key]: 'all' }))} />
        <div className="ia-iv-scroll" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)', minHeight: 320 }}>
          <table className="db-table db-table-compact">
            <thead>
              <tr>
                <th>Invoice</th>
                <th aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}>
                  <button
                    type="button"
                    className="ia-sort-btn"
                    onClick={() => setSort((s) => (s === null ? 'asc' : s === 'asc' ? 'desc' : null))}
                    aria-label="Sort by invoice date"
                  >
                    Invoice Date
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', transition: 'transform 120ms ease', opacity: sort ? 1 : 0.45, transform: sort === 'desc' ? 'rotate(180deg)' : 'none' }}>
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </th>
                <th>Biller</th>
                <th>Carriers</th>
                <th>Warehouse</th>
                <th className="num">Original Invoice Total</th>
                <th className="num">Eligible Parcel Amount Reviewed</th>
                <th className="num">Packages Reviewed</th>
                <th>Parcel Review Status</th>
                <th>Included in Credit Memo</th>
                <th>Report Period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.inv}</td>
                  <td className="db-muted">{r.period}</td>
                  <td className="db-muted">{r.biller}</td>
                  <td>{r.carrierText}</td>
                  <td className="db-muted">{r.warehouse}</td>
                  <td className="num">{fmtMoney(r.amountN)}</td>
                  <td className="num">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                      {r.parcelN == null ? '—' : fmtMoney(r.parcelN)}
                      {r.parcelN != null && r.parcelN > r.amountN && <InfoTip text={EXCEEDS_TIP} down />}
                    </span>
                  </td>
                  <td className="num">{r.packages == null ? '—' : r.packages.toLocaleString('en-US')}</td>
                  <td>
                    <span className="ia-pill" style={STATUS_PILL[r.status].style}>
                      {STATUS_PILL[r.status].label}
                    </span>
                  </td>
                  <td>
                    {r.memoId ? (
                      <button
                        onClick={() => navigate(`/memos/${r.memoId}`)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: '700 13px var(--imp-font-body)', color: 'var(--imp-purple-500)' }}
                      >
                        {r.memoId} →
                      </button>
                    ) : (
                      <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="db-muted">{r.reportPeriod ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="db-empty" style={{ padding: '40px 32px', textAlign: 'center' }}>
            <h3 className="db-h3">No invoices match these filters</h3>
            <p className="imp-small" style={{ maxWidth: '46ch', margin: '6px auto 0' }}>
              Filtering refines this view only. It does not change which invoices Implentio has ingested for your brand.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
