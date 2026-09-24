/** Account-wide Invoices index (template ~1627–1737). */
import { useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useInvoiceIndex } from '@/data/queries'
import type { InvoiceIndexRow } from '@/data/source'
import { fmtMoney } from '@/domain/money'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { StatusChip, type StatusTone } from '@/ui/Chip/StatusChip'
import { ActionTab, ActionTabs } from '@/ui/Tabs/Tabs'
import { TextField } from '@/ui/Form/TextField'
import { Link } from '@/ui/Link/Link'
import { EmptyState } from '@/ui/Display/Display'
import { Table, TableScroll, SortableHeader, nextSort, type SortDirection } from '@/ui/Table/Table'
import { useFilters, FilterButton, FilterGroup, matchesFilter, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { Button } from '@/ui/Button/Button'
import { usePageTitle } from '@/shell/usePageTitle'

const EXCEEDS_TIP =
  'The parcel amount reviewed may exceed the original invoice total when an invoice includes credits or negative adjustments. These reduce the invoice total but are excluded from the parcel review.'

export const STATUS_PILL: Record<InvoiceIndexRow['status'], { label: string; tone: StatusTone }> = {
  variance: { label: 'Variance identified', tone: 'attention' },
  clear: { label: 'No significant variance', tone: 'success' },
  pending: { label: 'Audit not complete', tone: 'info' },
  historical: { label: 'Historical record', tone: 'muted' },
}

function periodSortValue(period: string): number {
  const m = period.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return 0
  return Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2])
}

function matchesResult(values: FilterValues, status: InvoiceIndexRow['status']): boolean {
  const selected = values.ivResult ?? []
  if (selected.length === 0) return true
  return selected.some((v) => v === status || (v === 'reviewed' && (status === 'variance' || status === 'clear')))
}

function matchesCarrier(values: FilterValues, carriers: readonly string[]): boolean {
  const selected = values.ivCarrier ?? []
  return selected.length === 0 || carriers.some((c) => selected.includes(c))
}

export function InvoicesPage() {
  const rowsQ = useInvoiceIndex()
  usePageTitle('Invoices')
  const [search, setSearch] = useState('')
  const [metric, setMetric] = useState<'all' | 'variance' | 'clear'>('all')
  const [filterValues, setFilterValues] = useState<FilterValues>({ ivBiller: [], ivCarrier: [], ivResult: [], ivMemo: [] })
  const [sort, setSort] = useState<SortDirection>(null)

  const all = rowsQ.data ?? []
  const filterFields: FilterField[] = [
    { key: 'ivBiller', label: 'Biller', options: [...new Set(all.map((r) => r.biller))].map((v) => ({ value: v, label: v })) },
    { key: 'ivCarrier', label: 'Carrier', options: [...new Set(all.flatMap((r) => r.carriers))].sort().map((v) => ({ value: v, label: v })) },
    {
      key: 'ivResult',
      label: 'Parcel review status',
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
      options: [
        { value: 'linked', label: 'Yes' },
        { value: 'unlinked', label: 'No' },
      ],
    },
  ]
  const filters = useFilters(filterFields, filterValues, setFilterValues)

  if (!rowsQ.data) return null

  const q = search.trim().toLowerCase()
  let rows = all.filter(
    (r) =>
      (!q || r.inv.toLowerCase().includes(q)) &&
      matchesFilter(filterValues, 'ivBiller', r.biller) &&
      matchesResult(filterValues, r.status) &&
      matchesCarrier(filterValues, r.carriers) &&
      matchesFilter(filterValues, 'ivMemo', r.memoId ? 'linked' : 'unlinked'),
  )
  if (metric !== 'all') rows = rows.filter((r) => r.status === metric)
  if (sort) rows = [...rows].sort((a, b) => (periodSortValue(a.period) - periodSortValue(b.period)) * (sort === 'desc' ? -1 : 1))

  const metricDefs = [
    { key: 'all' as const, label: 'All invoices', value: all.length, type: 'neutral' as const },
    { key: 'variance' as const, label: 'Variance identified', value: all.filter((r) => r.status === 'variance').length, type: 'negative' as const },
    { key: 'clear' as const, label: 'No significant variance', value: all.filter((r) => r.status === 'clear').length, type: 'positive' as const },
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

      <ActionTabs ariaLabel="Invoice status">
        {metricDefs.map((md) => (
          <ActionTab key={md.key} label={md.label} value={md.value} type={md.type} active={metric === md.key} onClick={() => setMetric(md.key)} />
        ))}
      </ActionTabs>

      <div className="db-card" style={{ padding: 0, gap: 0, overflow: 'visible', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--ds-stroke-disabled)', flexWrap: 'wrap', flex: 'none' }}>
          <div style={{ flex: '0 1 252px', minWidth: 0 }}>
            <TextField
              aria-label="Search invoice number"
              placeholder="Search invoice number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              iconLeft={<MagnifyingGlassIcon aria-hidden="true" />}
            />
          </div>
          <FilterButton filters={filters} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginInlineStart: 'auto' }} aria-live="polite">
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
        <TableScroll scrollStyle={{ maxHeight: 'calc(100vh - 300px)', minHeight: 320 }}>
          <Table stickyHeader>
            <thead>
              <tr>
                <th>Invoice</th>
                <SortableHeader label="Invoice date" direction={sort} onSort={() => setSort(nextSort)} />
                <th>Biller</th>
                <th>Carriers</th>
                <th>Warehouse</th>
                <th className="num">Original invoice total</th>
                <th className="num">Eligible parcel amount reviewed</th>
                <th className="num">Packages reviewed</th>
                <th>Parcel review status</th>
                <th>Included in credit memo</th>
                <th>Report period</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.inv}</td>
                  <td className="ds-muted">{r.period}</td>
                  <td className="ds-muted">{r.biller}</td>
                  <td>{r.carrierText}</td>
                  <td className="ds-muted">{r.warehouse}</td>
                  <td className="num">{fmtMoney(r.amountN)}</td>
                  <td className="num">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                      {r.parcelN == null ? '—' : fmtMoney(r.parcelN)}
                      {r.parcelN != null && r.parcelN > r.amountN && <InfoTip text={EXCEEDS_TIP} side="bottom" />}
                    </span>
                  </td>
                  <td className="num">{r.packages == null ? '—' : r.packages.toLocaleString('en-US')}</td>
                  <td>
                    <StatusChip tone={STATUS_PILL[r.status].tone}>{STATUS_PILL[r.status].label}</StatusChip>
                  </td>
                  <td>
                    {r.memoId ? (
                      <Link to={`/memos/${r.memoId}`} variant="accent" bold>
                        {r.memoId} →
                      </Link>
                    ) : (
                      <span className="ds-muted">—</span>
                    )}
                  </td>
                  <td className="ds-muted">{r.reportPeriod ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
        {rows.length === 0 && (
          <EmptyState
            title="No invoices match these filters"
            subtitle="Filtering refines this view only. It does not change which invoices Implentio has ingested for your brand."
            action={
              <Button
                size="small"
                onClick={() => {
                  filters.clear()
                  setSearch('')
                  setMetric('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
