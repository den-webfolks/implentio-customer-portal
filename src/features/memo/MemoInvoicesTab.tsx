/** Memo detail — Invoices tab (template ~5186–5270). Full-invoice totals
 *  are fabricated from a hash of the invoice number, exactly as the
 *  prototype does (its note 96 marks this as intentional demo behavior). */
import { useMemo, useState } from 'react'
import type { MemoDetail } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { classifyInvoice } from '@/domain/memo'
import { FilterChips, FilterPanel, type FilterFieldDef, type FilterValues } from '@/ui/FilterPanel/FilterPanel'
import styles from '../tracker/OutcomesTab.module.css'

interface Row {
  id: string
  inv: string
  period: string
  sortKey: number
  carrierText: string
  warehouse: string
  amountN: number
  packages: number
  parcelN: number | null
  status: 'variance' | 'clear'
}

function hash(s: string, seed: number): number {
  let h = seed
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const MONTH_NUM: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
}
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function fullInvoiceDate(monthLabel: string, inv: string): { label: string; sortKey: number } {
  const m = monthLabel.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (!m || !m[1] || !m[2]) return { label: monthLabel, sortKey: 0 }
  const mm = MONTH_NUM[m[1]] ?? 0
  const h = hash(inv, 11)
  const maxDay = MONTH_DAYS[mm - 1] ?? 28
  const day = 1 + (h % maxDay)
  return {
    label: `${String(mm).padStart(2, '0')}/${String(day).padStart(2, '0')}/${m[2]}`,
    sortKey: Number(m[2]) * 10000 + mm * 100 + day,
  }
}

export function MemoInvoicesTab({ detail }: { detail: MemoDetail }) {
  const [search, setSearch] = useState('')
  const [metric, setMetric] = useState<'all' | 'variance' | 'clear'>('all')
  const [filters, setFilters] = useState<FilterValues>({ miCarrier: 'all', miStatus: 'all' })
  const [sortDesc, setSortDesc] = useState<boolean | null>(null)

  const all: Row[] = useMemo(() => {
    const rows = detail.invoices.map((r) => {
      const h = hash(r.inv, 7)
      const cls = classifyInvoice(r)
      const date = fullInvoiceDate(r.monthLabel, r.inv)
      const row: Row = {
        id: r.id,
        inv: r.inv,
        period: date.label,
        sortKey: date.sortKey,
        carrierText: r.carriers.join(', '),
        warehouse: r.warehouse,
        amountN: Math.round(r.invN * (1.9 + (h % 130) / 100) * 100) / 100,
        packages: Math.max(r.orderCount + 4, Math.round(r.orderCount * (1.7 + (h % 80) / 100))),
        parcelN: r.invN,
        status: cls.varN > 0 ? 'variance' : 'clear',
      }
      return row
    })
    const ex = rows.find((r) => r.inv === 'QS3098017')
    if (ex) {
      ex.amountN = 2220.3
      ex.parcelN = 220.3
      ex.packages = 17
    }
    return rows
  }, [detail.invoices])

  const carriers = [...new Set(detail.invoices.flatMap((r) => r.carriers))].sort()
  const filterFields: FilterFieldDef[] = [
    { key: 'miCarrier', label: 'Carrier', allLabel: 'All carriers', options: carriers.map((v) => ({ value: v, label: v })) },
    {
      key: 'miStatus',
      label: 'Parcel review status',
      allLabel: 'Any review status',
      options: [
        { value: 'variance', label: 'Variance identified' },
        { value: 'clear', label: 'No significant variance' },
      ],
    },
  ]

  let rows = all
  const q = search.trim().toLowerCase()
  if (q) rows = rows.filter((r) => r.inv.toLowerCase().includes(q))
  if (metric !== 'all') rows = rows.filter((r) => r.status === metric)
  if (filters.miCarrier !== 'all') rows = rows.filter((r) => r.carrierText.includes(filters.miCarrier ?? ''))
  if (filters.miStatus !== 'all') rows = rows.filter((r) => r.status === filters.miStatus)
  if (sortDesc != null) rows = [...rows].sort((a, b) => (sortDesc ? b.sortKey - a.sortKey : a.sortKey - b.sortKey))

  const metricDefs = [
    { key: 'all' as const, label: 'Invoices included', value: all.length, color: 'var(--imp-purple-500)' },
    { key: 'variance' as const, label: 'Variance identified', value: all.filter((r) => r.status === 'variance').length, color: 'var(--imp-orange-500)' },
    { key: 'clear' as const, label: 'No significant variance', value: all.filter((r) => r.status === 'clear').length, color: 'var(--imp-ink)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ maxWidth: '70ch' }}>
        <h2 style={{ margin: 0, font: '600 22px var(--imp-font-display)', letterSpacing: '-0.01em', color: 'var(--imp-ink)' }}>
          Invoices in this credit memo
        </h2>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          Review the invoices included in this credit memo and see whether significant variance was identified.
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
          <span style={{ margin: '0 0 0 auto' }} aria-live="polite">
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {rows.length} of {all.length} invoices
            </span>
          </span>
        </div>
        <FilterChips fields={filterFields} values={filters} onClear={(key) => setFilters((f) => ({ ...f, [key]: 'all' }))} />
        <div style={{ overflowX: 'auto' }}>
          <table className="db-table db-table-compact">
            <thead>
              <tr>
                <th>Invoice</th>
                <th aria-sort={sortDesc == null ? undefined : sortDesc ? 'descending' : 'ascending'}>
                  <button type="button" className="ia-sort-btn" onClick={() => setSortDesc((s) => (s == null ? true : !s))} aria-label="Sort by invoice date">
                    Invoice Date
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: sortDesc === false ? 'rotate(180deg)' : undefined, opacity: sortDesc == null ? 0.4 : 1 }}>
                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </th>
                <th>Carriers</th>
                <th>Warehouse</th>
                <th className="num">Original Invoice Total</th>
                <th className="num">Eligible Parcel Amount Reviewed</th>
                <th className="num">Packages Reviewed</th>
                <th>Parcel Review Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.inv}</td>
                  <td className="db-muted">{r.period}</td>
                  <td className="db-muted">{r.carrierText}</td>
                  <td className="db-muted">{r.warehouse}</td>
                  <td className="num">{fmtMoney(r.amountN)}</td>
                  <td className="num">{r.parcelN == null ? '—' : fmtMoney(r.parcelN)}</td>
                  <td className="num">{r.packages.toLocaleString('en-US')}</td>
                  <td>
                    <span
                      className="ia-pill"
                      style={
                        r.status === 'variance'
                          ? { background: '#FFE9D6', color: 'var(--imp-orange-500)', borderColor: 'var(--imp-orange-300)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }
                          : { background: 'var(--imp-success-bg)', color: 'var(--imp-success)', borderColor: 'var(--imp-success)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }
                      }
                    >
                      {r.status === 'variance' ? 'Variance identified' : 'No significant variance'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="db-empty" style={{ padding: '40px 32px', textAlign: 'center' }}>
            <h3 className="db-h3">No results match these filters</h3>
          </div>
        )}
      </div>
    </div>
  )
}
