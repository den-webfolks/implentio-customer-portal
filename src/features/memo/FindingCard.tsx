/** One overcharge finding card with its expandable package drill
 *  (template ~4925–5169). */
import { useState, type CSSProperties } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { FindingGroup } from '@/domain/types'
import { fmtMoney, posMoney, r2 } from '@/domain/money'
import { groupExpired, groupStatusLine } from '@/domain/outcomes'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { Checkbox } from '@/ui/Form/Choice'
import { TextField } from '@/ui/Form/TextField'
import { Statistic } from '@/ui/Display/Display'
import { Table, TableScroll } from '@/ui/Table/Table'
import { GROUP_STATUS_TONE } from '@/features/status-tones'
import { StatusChip } from '@/ui/Chip/StatusChip'
import {
  CHARGE_DEFS,
  chargeCells,
  exampleText,
  excelDate,
  packageHighlighted,
  serviceLabel,
  titleCase,
} from './derive'
import { plural } from '@/domain/plural'

const SVC_TIP =
  'Packages are grouped by carrier service level so you can review where this variance is concentrated. Amounts are complete package totals for the packages in each service level.'

const SEARCH_LABEL = 'Search service level, invoice, order, or tracking number'

const HIGHLIGHT_BG = 'var(--ds-bg-warning-muted)'

const HL_ON: CSSProperties = {
  background: HIGHLIGHT_BG,
  boxShadow: 'inset 0 0 0 1px var(--ds-stroke-warning)',
}

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
  boxShadow: 'var(--ds-shadow-disabled)',
}

export function FindingCard({
  group: g,
  provider,
  excludedIds,
  highlightedCharge: hl,
  highlightLabel,
  now,
  onToggleInclusion,
  onIncludeInAnotherRequest,
}: {
  group: FindingGroup
  provider: string
  excludedIds: readonly string[]
  highlightedCharge: string
  highlightLabel: string | null
  now: Date
  onToggleInclusion: (groupId: string, include: boolean) => void
  onIncludeInAnotherRequest: (groupId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [explOpen, setExplOpen] = useState(false)
  const [openRecord, setOpenRecord] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pkgLimit, setPkgLimit] = useState(10)

  const inDisputeSel = !excludedIds.includes(g.id)
  const sl = groupStatusLine({ ...g, amountN: g.varN, threePl: provider, inDisputeSel }, now)
  const inDispute = g.pursuit === 'pursued' ? true : inDisputeSel
  const disputeLocked = g.pursuit === 'pursued' || groupExpired(g, now)
  const disputeControlLabel =
    g.pursuit === 'pursued'
      ? 'Included in dispute'
      : excludedIds.includes(g.id)
        ? 'Add to dispute'
        : 'Included in dispute'

  const q = search.trim().toLowerCase()
  const pkgMatch = (o: FindingGroup['services'][number]['pkgs'][number]) =>
    !q ||
    String(o.so).toLowerCase().includes(q) ||
    String(o.t).toLowerCase().includes(q) ||
    String(o.inv).toLowerCase().includes(q)
  const allRecs = g.services.filter(
    (rec) => !q || rec.label.toLowerCase().includes(q) || rec.pkgs.some(pkgMatch),
  )
  const mixEntry = hl === 'all' ? null : [...g.mixUnfav, ...g.mixFav].find((x) => x.key === hl)

  const chgCols = CHARGE_DEFS.map((c) => ({ key: c[0], label: c[2], on: hl === c[0] }))

  const inclusionCheckbox = (
    <Checkbox
      bordered
      label={disputeControlLabel}
      checked={inDispute}
      disabled={disputeLocked}
      onCheckedChange={(checked) => onToggleInclusion(g.id, checked)}
    />
  )

  return (
    <div className="db-card" id={`finding-${g.id}`} tabIndex={-1} style={{ gap: 14, scrollMarginTop: 88 }}>
      <div className="ia-fcard">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <h3 className="db-h3" style={{ margin: 0 }}>
              {g.title}
            </h3>
            <div className="ds-body-small ds-muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>
                Carrier <strong className="ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>{g.carriers.join(', ')}</strong>
              </span>
              <span>
                Service level <strong className="ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>{serviceLabel(g)}</strong>
              </span>
              <span>
                Variance group <strong className="ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>{g.category}</strong>
              </span>
            </div>
            <div className="ds-body-small ds-muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{plural(g.invoices, 'invoice')}</span>
              <span>{plural(g.packages, 'package')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '78ch' }}>
            <p className="ds-body-base ds-muted" style={{ margin: 0 }}>
              {g.supportCopy}
            </p>
            {mixEntry && highlightLabel && (
              <p className="imp-small" style={{ margin: 0, color: 'var(--ds-fg-accent-text)', fontWeight: 'var(--ds-weight-semi)' }}>
                {highlightLabel} contributes {posMoney(mixEntry.amount)}
                {mixEntry.amount < 0 ? ' favourable' : ' unfavourable'} inside this finding — the group net variance of {posMoney(g.varN)} is unchanged.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 14 }}>
            <Link
              variant="accent"
              bold
              aria-expanded={explOpen}
              iconRight={explOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
              onClick={() => setExplOpen((o) => !o)}
              className="ia-disclosure"
            >
              {explOpen ? 'Hide how we identified this finding' : 'How we identified this finding'}
            </Link>

            {explOpen && (
              <div style={{ marginTop: 10 }}>
                <Banner type="info" title="How we calculated this finding">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div className="ds-body-base ds-w-semi">What was billed</div>
                      <p className="imp-small" style={{ margin: '3px 0 0' }}>
                        {provider} billed {fmtMoney(g.invoicedN)} in total charges across the {plural(g.packages, 'package')} assigned to this finding.
                      </p>
                    </div>
                    <div>
                      <div className="ds-body-base ds-w-semi">What Implentio expected</div>
                      <p className="imp-small" style={{ margin: '3px 0 0' }}>
                        Implentio expected {fmtMoney(g.expectedN)} for those same packages, a {posMoney(g.varN)} net variance.
                      </p>
                    </div>
                    <div>
                      <div className="ds-body-base ds-w-semi">Why the amounts differ</div>
                      <p className="imp-small" style={{ margin: '3px 0 0' }}>
                        {g.why}
                      </p>
                    </div>
                    <div>
                      <div className="ds-body-base ds-w-semi">How the charge differences net</div>
                      <p className="imp-small" style={{ margin: '3px 0 0' }}>
                        {g.mixText}
                      </p>
                    </div>
                    {exampleText(g) && (
                      <div style={{ border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-small)', background: 'var(--ds-bg-disabled)', padding: '12px 14px' }}>
                        <div className="db-eyebrow" style={{ margin: '0 0 4px' }}>
                          Example package
                        </div>
                        <p className="imp-small" style={{ margin: 0 }}>
                          {exampleText(g)}
                        </p>
                      </div>
                    )}
                    <p className="imp-small" style={{ margin: 0 }}>
                      Every package belongs to exactly one finding. Favourable charge differences are netted against unfavourable differences on the same package, and only net-unfavourable packages are published.
                    </p>
                  </div>
                </Banner>
              </div>
            )}
          </div>

          {!expanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', flexWrap: 'wrap', marginTop: 11 }}>
              <Button variant="primary" size="small" aria-expanded={expanded} iconRight={<ChevronDownIcon aria-hidden="true" />} onClick={() => setExpanded(true)}>
                View affected packages
              </Button>
              {inclusionCheckbox}
            </div>
          )}
        </div>

        <div className="ia-fcard-fin" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...SURFACE, overflow: 'hidden' }}>
            <Statistic
              bare
              size="large"
              type="accent"
              label="Group net variance"
              value={fmtMoney(g.varN)}
              sub="Complete net variance for this group"
              className="ia-fcard-stat"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--ds-stroke-disabled)' }}>
              <div style={{ padding: '9px 14px' }}>
                <Statistic bare size="small" label="Total invoiced" value={fmtMoney(g.invoicedN)} />
              </div>
              <div style={{ padding: '9px 14px', borderInlineStart: '1px solid var(--ds-stroke-disabled)' }}>
                <Statistic bare size="small" label="Total expected" value={fmtMoney(g.expectedN)} />
              </div>
            </div>
          </div>
          {/* A status chip, not a bordered block: the block read as a button beside the real ones. */}
          <span style={{ alignSelf: 'flex-start' }}>
            <StatusChip tone={GROUP_STATUS_TONE[sl.key]}>{sl.label}</StatusChip>
          </span>
          {sl.secondary && (
            <span className="imp-small" style={{ margin: 0 }}>
              {sl.secondary}
            </span>
          )}
          {sl.subtleAction && (
            <Link variant="accent" size="small" bold onClick={() => onIncludeInAnotherRequest(g.id)} style={{ alignSelf: 'flex-start' }}>
              {sl.actionLabel}
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="db-eyebrow" style={{ margin: 0 }}>
              Affected service levels
            </div>
            <InfoTip text={SVC_TIP} />
            <div style={{ minWidth: 290 }}>
              <TextField
                size="small"
                aria-label={SEARCH_LABEL}
                placeholder={SEARCH_LABEL}
                iconLeft={<MagnifyingGlassIcon aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {allRecs.length} of {allRecs.length} service levels
            </span>
          </div>
          <p className="imp-small" style={{ margin: '0 0 10px' }}>
            Amounts include the complete invoiced and expected charges for packages assigned to this finding. Charge-level differences are shown in the package details below.
          </p>
          <TableScroll style={SURFACE}>
            <Table className="ia-svc-table">
              <thead>
                <tr>
                  <th>Service level</th>
                  <th className="num">Affected packages</th>
                  <th className="num">Total invoiced</th>
                  <th className="num">Total expected</th>
                  <th className="num">Net variance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allRecs.map((rec) => {
                  const open = openRecord === rec.key
                  const svcMatch = !q || rec.label.toLowerCase().includes(q)
                  const matched = svcMatch ? rec.pkgs : rec.pkgs.filter(pkgMatch)
                  const shownPkgs = matched.slice(0, pkgLimit)
                  return (
                    <RecRows
                      key={rec.key}
                      rec={rec}
                      g={g}
                      open={open}
                      chgCols={chgCols}
                      hl={hl}
                      matchedCount={matched.length}
                      shownPkgs={shownPkgs}
                      onToggle={() => setOpenRecord(open ? null : rec.key)}
                      onShowMore={() => setPkgLimit((l) => l + 25)}
                    />
                  )
                })}
                {allRecs.length > 0 && (
                  <tr className="total-row">
                    <td>All service levels ({allRecs.length})</td>
                    <td className="num">{allRecs.reduce((a, r) => a + r.packages, 0).toLocaleString('en-US')}</td>
                    <td className="num">{fmtMoney(r2(allRecs.reduce((a, r) => a + r.invoicedN, 0)))}</td>
                    <td className="num">{fmtMoney(r2(allRecs.reduce((a, r) => a + r.expectedN, 0)))}</td>
                    <td className="num">{posMoney(r2(allRecs.reduce((a, r) => a + r.varN, 0)))}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableScroll>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <Button size="small" aria-expanded={expanded} iconRight={<ChevronUpIcon aria-hidden="true" />} onClick={() => setExpanded(false)}>
              Hide affected packages
            </Button>
            {inclusionCheckbox}
          </div>
          {allRecs.length === 0 && (
            <p className="imp-small" style={{ margin: '12px 0 0' }}>
              No service levels, invoices, order numbers, or tracking numbers in this finding match that search.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function RecRows({
  rec,
  g,
  open,
  chgCols,
  hl,
  matchedCount,
  shownPkgs,
  onToggle,
  onShowMore,
}: {
  rec: FindingGroup['services'][number]
  g: FindingGroup
  open: boolean
  chgCols: { key: string; label: string; on: boolean }[]
  hl: string
  matchedCount: number
  shownPkgs: FindingGroup['services'][number]['pkgs']
  onToggle: () => void
  onShowMore: () => void
}) {
  const hlStyle = (on: boolean) => (on ? HL_ON : undefined)
  return (
    <>
      <tr>
        <td style={{ fontWeight: 600 }}>{rec.label}</td>
        <td className="num">{rec.packages}</td>
        <td className="num">{fmtMoney(rec.invoicedN)}</td>
        <td className="num">{fmtMoney(rec.expectedN)}</td>
        <td className="num">{posMoney(rec.varN)}</td>
        <td>
          <Link
            variant="accent"
            aria-expanded={open}
            iconRight={open ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
            onClick={onToggle}
          >
            {open ? 'Hide packages' : 'Show packages'}
          </Link>
        </td>
      </tr>
      {open && (
        <tr>
          <td className="ia-svc-detail" colSpan={6} style={{ padding: 0, background: 'var(--ds-bg-disabled)', borderInlineStart: '3px solid var(--ds-stroke-brand-emphasis)' }}>
            <div style={{ padding: '14px 16px 16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div className="db-eyebrow" style={{ margin: 0 }}>
                  Contributing packages
                </div>
                <span className="imp-small" style={{ margin: 0 }}>
                  {g.carriers.join(', ')} {rec.label} · {g.title}
                </span>
              </div>
              <TableScroll className="ia-pkg-scroll" style={SURFACE}>
                <Table className="ia-pkg-table">
                  <thead>
                    <tr>
                      <th className="ia-stick ia-stick-1" colSpan={3} style={{ zIndex: 5 }}>
                        Package identifiers
                      </th>
                      <th colSpan={5}>Package details</th>
                      <th className="num" colSpan={3} style={{ textAlign: 'center', background: GROUP_BG.total }}>
                        Package total
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.expected }}>
                        Expected
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.invoiced }}>
                        Invoiced
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.variance }}>
                        Variance
                      </th>
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
                    {shownPkgs.map((o) => {
                      const cells = chargeCells(o, hl)
                      const rowHl = packageHighlighted(o, hl)
                      const rowBg = rowHl ? HIGHLIGHT_BG : undefined
                      return (
                        <tr key={`${o.t}|${o.inv}`}>
                          <td className="ia-stick ia-stick-1" style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12, background: rowBg }}>{o.t}</td>
                          <td className="ia-stick ia-stick-2" style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.so}</td>
                          <td className="ia-stick ia-stick-3" style={{ fontWeight: 600, background: rowBg }}>{o.inv}</td>
                          <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{excelDate(o.ld)}</td>
                          <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.car}</td>
                          <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{titleCase(o.sv)}</td>
                          <td className="num" style={{ background: rowBg }}>{o.wt != null ? `${o.wt} oz` : '—'}</td>
                          <td style={{ color: 'var(--ds-fg-muted)', background: rowBg }}>{o.az || o.ez || '—'}</td>
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
                    {matchedCount > 0 && matchedCount <= shownPkgs.length && (
                      <tr className="total-row">
                        <td className="ia-stick ia-stick-1" colSpan={3}>
                          Contributing packages shown ({shownPkgs.length})
                        </td>
                        <td colSpan={5}></td>
                        <td className="num">{fmtMoney(r2(shownPkgs.reduce((a, x) => a + x.te, 0)))}</td>
                        <td className="num">{fmtMoney(r2(shownPkgs.reduce((a, x) => a + x.ti, 0)))}</td>
                        <td className="num" style={{ color: 'var(--ds-fg-accent-text)' }}>{posMoney(r2(shownPkgs.reduce((a, x) => a + x.tv, 0)))}</td>
                        {CHARGE_DEFS.map((c) => (
                          <td key={`re-${c[0]}`} className="num">{sumCell(shownPkgs, c[0], 1)}</td>
                        ))}
                        {CHARGE_DEFS.map((c) => (
                          <td key={`ri-${c[0]}`} className="num">{sumCell(shownPkgs, c[0], 0)}</td>
                        ))}
                        {CHARGE_DEFS.map((c) => (
                          <td key={`rv-${c[0]}`} className="num">{diffCell(shownPkgs, c[0])}</td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </Table>
              </TableScroll>
              <p className="imp-small" style={{ margin: '8px 0 0' }}>
                Each row is one package-level billing record. Total expected and total invoiced are the sums of the applicable charge components, each charge variance is invoiced minus expected, and the package net variance equals the sum of its charge variances. Favourable differences appear in green because they offset unfavourable charges within the same package.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <span className="imp-small" style={{ margin: 0 }}>
                  Showing {shownPkgs.length} of {matchedCount} packages
                </span>
                {matchedCount > shownPkgs.length && (
                  <Button size="small" onClick={onShowMore}>
                    Show more packages
                  </Button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

type Pkg = FindingGroup['services'][number]['pkgs'][number]

function sumCell(pkgs: Pkg[], field: (typeof CHARGE_DEFS)[number][0], idx: 0 | 1): string {
  const v = r2(pkgs.reduce((a, p) => a + (p[field][idx] || 0), 0))
  return v ? fmtMoney(v) : '—'
}

function diffCell(pkgs: Pkg[], field: (typeof CHARGE_DEFS)[number][0]): string {
  const iv = r2(pkgs.reduce((a, p) => a + (p[field][0] || 0), 0))
  const ex = r2(pkgs.reduce((a, p) => a + (p[field][1] || 0), 0))
  const df = r2(iv - ex)
  if (Math.abs(df) < 0.005) return '—'
  return df > 0 ? posMoney(df) : '−' + posMoney(df)
}
