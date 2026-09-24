/** Memo detail — Invoices tab (template ~5186–5270). Full-invoice totals
 *  are fabricated from a hash of the invoice number, exactly as the
 *  prototype does (its note 96 marks this as intentional demo behavior). */
import { useMemo, useState } from 'react'
import type { MemoDetail } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { classifyInvoice } from '@/domain/memo'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { ActionTab, ActionTabs } from '@/ui/Tabs/Tabs'
import { TextField } from '@/ui/Form/TextField'
import { EmptyState } from '@/ui/Display/Display'
import { Table, SortableHeader, nextSort, type SortDirection } from '@/ui/Table/Table'
import { useFilters, FilterButton, FilterGroup, matchesFilter, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { STATUS_PILL } from '../invoices/InvoicesPage'

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
  const [filterValues, setFilterValues] = useState<FilterValues>({ miCarrier: [], miStatus: [] })
  const [sort, setSort] = useState<SortDirection>(null)

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
  const filterFields: FilterField[] = [
    { key: 'miCarrier', label: 'Carrier', options: carriers.map((v) => ({ value: v, label: v })) },
    {
      key: 'miStatus',
      label: 'Parcel review status',
      options: [
        { value: 'variance', label: 'Variance identified' },
        { value: 'clear', label: 'No significant variance' },
      ],
    },
  ]
  const filters = useFilters(filterFields, filterValues, setFilterValues)
  const selectedCarriers = filterValues.miCarrier ?? []

  let rows = all
  const q = search.trim().toLowerCase()
  if (q) rows = rows.filter((r) => r.inv.toLowerCase().includes(q))
  if (metric !== 'all') rows = rows.filter((r) => r.status === metric)
  if (selectedCarriers.length > 0) rows = rows.filter((r) => selectedCarriers.some((c) => r.carrierText.includes(c)))
  rows = rows.filter((r) => matchesFilter(filterValues, 'miStatus', r.status))
  if (sort) rows = [...rows].sort((a, b) => (sort === 'desc' ? b.sortKey - a.sortKey : a.sortKey - b.sortKey))

  const metricDefs = [
    { key: 'all' as const, label: 'Invoices included', value: all.length, type: 'neutral' as const },
    { key: 'variance' as const, label: 'Variance identified', value: all.filter((r) => r.status === 'variance').length, type: 'negative' as const },
    { key: 'clear' as const, label: 'No significant variance', value: all.filter((r) => r.status === 'clear').length, type: 'positive' as const },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ maxWidth: '70ch' }}>
        <h2 className="ds-heading-medium" style={{ margin: 0 }}>
          Invoices in this credit memo
        </h2>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          Review the invoices included in this credit memo and see whether significant variance was identified.
        </p>
      </div>

      <ActionTabs ariaLabel="Invoice status">
        {metricDefs.map((md) => (
          <ActionTab key={md.key} label={md.label} value={md.value} type={md.type} active={metric === md.key} onClick={() => setMetric(md.key)} />
        ))}
      </ActionTabs>

      <div className="db-card" style={{ padding: 0, gap: 0, overflow: 'visible', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--ds-stroke-disabled)', flexWrap: 'wrap', flex: 'none' }}>
          <TextField
            aria-label="Search invoice number"
            placeholder="Search invoice number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            iconLeft={<MagnifyingGlassIcon aria-hidden="true" />}
            style={{ minWidth: 200 }}
          />
          <FilterButton filters={filters} />
          <span style={{ margin: '0 0 0 auto' }} aria-live="polite">
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {rows.length} of {all.length} invoices
            </span>
          </span>
        </div>
        {filters.expanded && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ds-stroke-disabled)' }}>
            <FilterGroup filters={filters} />
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <Table>
            <thead>
              <tr>
                <th>Invoice</th>
                <SortableHeader label="Invoice Date" direction={sort} onSort={() => setSort(nextSort)} />
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
                  <td style={{ fontWeight: 600 }}>{r.inv}</td>
                  <td className="ds-muted">{r.period}</td>
                  <td className="ds-muted">{r.carrierText}</td>
                  <td className="ds-muted">{r.warehouse}</td>
                  <td className="num">{fmtMoney(r.amountN)}</td>
                  <td className="num">{r.parcelN == null ? '—' : fmtMoney(r.parcelN)}</td>
                  <td className="num">{r.packages.toLocaleString('en-US')}</td>
                  <td>
                    <StatusChip tone={STATUS_PILL[r.status].tone}>{STATUS_PILL[r.status].label}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {rows.length === 0 && <EmptyState title="No results match these filters" />}
      </div>
    </div>
  )
}
