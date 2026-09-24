/** Layer ③ of a finding: every contributing package in a focused view.
 *  Opens on "Differences only" (what was billed, what it should have been,
 *  and the charges that differ); "Full breakdown" is the 26-column audit
 *  table that used to sit inline on the finding card (template ~5020–5160). */
import { useState, type CSSProperties } from 'react'
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { FindingGroup, PackageRecord } from '@/domain/types'
import { fmtMoney, posMoney, r2 } from '@/domain/money'
import { CHARGE_COPY, findingProblem } from '@/domain/finding-copy'
import { plural } from '@/domain/plural'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Banner } from '@/ui/Banner/Banner'
import { RadioGroup } from '@/ui/Form/Choice'
import { Select } from '@/ui/Form/Select'
import { TextField } from '@/ui/Form/TextField'
import { Table, TableScroll } from '@/ui/Table/Table'
import { CHARGE_DEFS, chargeCells, excelDate, packageHighlighted, titleCase } from './derive'

type View = 'diff' | 'full'

const PAGE = 25
const ALL = 'all'
const DASH = '—'

const HIGHLIGHT_BG = 'var(--ds-bg-warning-muted)'
const HL_ON: CSSProperties = { background: HIGHLIGHT_BG, boxShadow: 'inset 0 0 0 1px var(--ds-stroke-warning)' }
const GROUP_BG = {
  total: 'var(--ds-bg-disabled)',
  expected: 'var(--ds-bg-success-muted)',
  invoiced: 'var(--ds-bg-brand-disabled)',
  variance: 'var(--ds-bg-warning-muted)',
} as const
const SURFACE: CSSProperties = {
  border: '1px solid var(--ds-stroke-disabled)',
  borderRadius: 'var(--ds-radius-large)',
  background: 'var(--ds-bg-default)',
}

const diffOf = (p: PackageRecord, field: (typeof CHARGE_DEFS)[number][0]) => r2(p[field][0] - p[field][1])
const signed = (v: number) => (Math.abs(v) < 0.005 ? DASH : v > 0 ? posMoney(v) : '−' + posMoney(v))

export function PackagesModal({
  group: g,
  onExport,
  onClose,
}: {
  group: FindingGroup
  onExport: () => void
  onClose: () => void
}) {
  const [view, setView] = useState<View>('diff')
  const [service, setService] = useState<string>(ALL)
  const [search, setSearch] = useState('')
  const [hl, setHl] = useState<string>(ALL)
  const [limit, setLimit] = useState(PAGE)

  const all = g.services.flatMap((s) => s.pkgs.map((p) => ({ p, service: s.key }))).sort((a, b) => b.p.tv - a.p.tv)
  const q = search.trim().toLowerCase()
  const matched = all
    .filter((x) => service === ALL || x.service === service)
    .filter(({ p }) => !q || [p.t, p.so, p.inv].some((v) => String(v).toLowerCase().includes(q)))
    .map((x) => x.p)
  const shown = matched.slice(0, limit)
  // Only the charges that actually differ somewhere in this finding.
  const diffCharges = CHARGE_DEFS.filter((c) => all.some(({ p }) => Math.abs(diffOf(p, c[0])) > 0.005))
  const chgCols = CHARGE_DEFS.map((c) => ({ key: c[0], label: c[2], on: hl === c[0] }))
  const hlStyle = (on: boolean) => (on ? HL_ON : undefined)

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      width={1320}
      title={`All ${plural(all.length, 'package')}`}
      description={`${findingProblem(g)} · ${fmtMoney(g.varN)} in total`}
      footer={
        <Button variant="primary" size="small" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <TextField
            size="small"
            aria-label="Search tracking, order, or invoice number"
            placeholder="Search tracking, order, or invoice number"
            iconLeft={<MagnifyingGlassIcon aria-hidden="true" />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setLimit(PAGE)
            }}
          />
        </div>
        <Select
          aria-label="Service level"
          size="small"
          value={service}
          onValueChange={(v) => {
            setService(v)
            setLimit(PAGE)
          }}
          options={[{ value: ALL, label: 'All service levels' }, ...g.services.map((s) => ({ value: s.key, label: `${s.label} (${s.packages})` }))]}
        />
        <RadioGroup
          aria-label="Table view"
          bordered
          direction="row"
          value={view}
          onValueChange={setView}
          options={[
            { value: 'diff', label: 'Differences only' },
            { value: 'full', label: 'Full breakdown' },
          ]}
        />
        {view === 'full' && (
          <Select
            aria-label="Highlight charge"
            size="small"
            value={hl}
            onValueChange={setHl}
            options={[{ value: ALL, label: 'All charges' }, ...CHARGE_DEFS.map((c) => ({ value: c[0], label: `Highlight ${c[2].toLowerCase()}` }))]}
          />
        )}
        <Button size="small" iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={onExport}>
          Export
        </Button>
      </div>

      {view === 'full' && hl !== ALL && (
        <Banner type="warning" title="Highlighted charges help explain the finding. Package totals include all charge differences and remain unchanged." />
      )}

      <TableScroll className="ia-pkg-scroll" style={SURFACE}>
        {view === 'diff' ? (
          <Table>
            <thead>
              <tr>
                <th>Tracking number</th>
                <th>Order number</th>
                <th>Invoice number</th>
                <th>Ship date</th>
                <th>Service level</th>
                <th className="num">Billed</th>
                <th className="num">Should have been</th>
                <th className="num">Difference</th>
                {diffCharges.map((c) => (
                  <th key={c[0]} className="num">
                    {CHARGE_COPY[c[1]].name} difference
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={`${p.t}|${p.inv}`}>
                  <td className="nowrap" style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>{p.t}</td>
                  <td className="nowrap ds-muted">{p.so}</td>
                  <td className="nowrap" style={{ fontWeight: 600 }}>{p.inv}</td>
                  <td className="nowrap ds-muted">{excelDate(p.ld)}</td>
                  <td className="nowrap ds-muted">{titleCase(p.sv)}</td>
                  <td className="num">{fmtMoney(p.ti)}</td>
                  <td className="num">{fmtMoney(p.te)}</td>
                  <td className="num" style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600 }}>{posMoney(p.tv)}</td>
                  {diffCharges.map((c) => {
                    const d = diffOf(p, c[0])
                    return (
                      <td key={c[0]} className="num" style={d < -0.005 ? { color: 'var(--ds-fg-success)' } : undefined}>
                        {signed(d)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Table className="ia-pkg-table">
            <thead>
              <tr>
                <th className="ia-stick ia-stick-1" colSpan={3} style={{ zIndex: 5 }}>
                  Package identifiers
                </th>
                <th colSpan={5}>Package details</th>
                <th className="num" colSpan={3} style={{ textAlign: 'center', background: GROUP_BG.total }}>Package total</th>
                <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.expected }}>Expected</th>
                <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.invoiced }}>Invoiced</th>
                <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.variance }}>Variance</th>
              </tr>
              <tr>
                <th className="ia-stick ia-stick-1">Tracking number</th>
                <th className="ia-stick ia-stick-2">Order number</th>
                <th className="ia-stick ia-stick-3">Invoice number</th>
                <th>Ship date</th>
                <th>Carrier</th>
                <th>Service level</th>
                <th className="num">Billed weight</th>
                <th>Zone</th>
                <th className="num" style={{ background: GROUP_BG.total }}>Total expected</th>
                <th className="num" style={{ background: GROUP_BG.total }}>Total invoiced</th>
                <th className="num" style={{ background: GROUP_BG.total }}>Net variance</th>
                {chgCols.map((c) => (
                  <th key={`e-${c.key}`} className="num" style={{ background: GROUP_BG.expected, ...hlStyle(c.on) }}>{c.label}</th>
                ))}
                {chgCols.map((c) => (
                  <th key={`i-${c.key}`} className="num" style={{ background: GROUP_BG.invoiced, ...hlStyle(c.on) }}>{c.label}</th>
                ))}
                {chgCols.map((c) => (
                  <th key={`v-${c.key}`} className="num" style={{ background: GROUP_BG.variance, ...hlStyle(c.on) }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => {
                const cells = chargeCells(o, hl)
                const rowBg = packageHighlighted(o, hl) ? HIGHLIGHT_BG : undefined
                return (
                  <tr key={`${o.t}|${o.inv}`}>
                    <td className="ia-stick ia-stick-1" style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12, background: rowBg }}>{o.t}</td>
                    <td className="ia-stick ia-stick-2" style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.so}</td>
                    <td className="ia-stick ia-stick-3" style={{ fontWeight: 600, background: rowBg }}>{o.inv}</td>
                    <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{excelDate(o.ld)}</td>
                    <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.car}</td>
                    <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{titleCase(o.sv)}</td>
                    <td className="num" style={{ background: rowBg }}>{o.wt != null ? `${o.wt} oz` : DASH}</td>
                    <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.az || o.ez || DASH}</td>
                    <td className="num" style={{ background: rowBg ?? GROUP_BG.total }}>{fmtMoney(o.te)}</td>
                    <td className="num" style={{ background: rowBg ?? GROUP_BG.total }}>{fmtMoney(o.ti)}</td>
                    <td className="num" style={{ background: rowBg ?? GROUP_BG.total, color: 'var(--ds-fg-accent-text)', fontWeight: 600 }}>{posMoney(o.tv)}</td>
                    {cells.map((c) => (
                      <td key={`e-${c.key}`} className="num" style={{ background: rowBg, ...hlStyle(c.highlighted) }}>{c.exp}</td>
                    ))}
                    {cells.map((c) => (
                      <td key={`i-${c.key}`} className="num" style={{ background: rowBg, ...hlStyle(c.highlighted) }}>{c.inv}</td>
                    ))}
                    {cells.map((c) => (
                      <td
                        key={`v-${c.key}`}
                        className="num"
                        style={{
                          background: rowBg,
                          ...hlStyle(c.highlighted),
                          ...(c.diffZero ? {} : c.diffNegative ? { color: 'var(--ds-fg-success)', fontWeight: 600 } : { color: 'var(--ds-fg-accent-text)', fontWeight: 600 }),
                        }}
                      >
                        {c.diff}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </TableScroll>

      <p className="imp-small" style={{ margin: 0 }}>
        {view === 'diff'
          ? 'Billed is what your Biller charged for the package; “should have been” is the price under your contract. Green differences are charges billed below contract, which offset the others.'
          : 'Each row is one package-level billing record. Total expected and total invoiced are the sums of the charge components, each charge variance is invoiced minus expected, and the package net variance equals the sum of its charge variances.'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="imp-small" style={{ margin: 0 }} aria-live="polite">
          Showing {shown.length} of {plural(matched.length, 'package')}
        </span>
        {matched.length > shown.length && (
          <Button size="small" onClick={() => setLimit((l) => l + PAGE)}>
            Show more packages
          </Button>
        )}
      </div>
      {matched.length === 0 && (
        <p className="imp-small" style={{ margin: 0 }}>
          No packages in this finding match that search.
        </p>
      )}
    </Modal>
  )
}
