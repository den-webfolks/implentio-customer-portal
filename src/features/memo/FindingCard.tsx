/** One overcharge finding card with its expandable package drill
 *  (template ~4925–5169). */
import { useState } from 'react'
import type { FindingGroup } from '@/domain/types'
import { fmtMoney, posMoney, r2 } from '@/domain/money'
import { groupExpired, groupStatusLine } from '@/domain/outcomes'
import { InfoTip } from '@/ui/InfoTip'
import {
  CHARGE_DEFS,
  chargeCells,
  exampleText,
  excelDate,
  packageHighlighted,
  reconcileText,
  serviceLabel,
  STATUS_COLORS,
  titleCase,
} from './derive'

const SVC_TIP =
  'Packages are grouped by carrier service level so you can review where this variance is concentrated. Amounts are complete package totals for the packages in each service level.'

const HL_ON: React.CSSProperties = {
  background: 'var(--imp-warning-bg)',
  boxShadow: 'inset 0 0 0 1px var(--imp-orange-300)',
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
  const colors = STATUS_COLORS[sl.key]
  const inDispute = g.pursuit === 'pursued' ? true : inDisputeSel
  const disputeLocked = g.pursuit === 'pursued' || groupExpired(g, now)
  const disputeControlLabel =
    g.pursuit === 'pursued'
      ? 'Included in dispute package'
      : excludedIds.includes(g.id)
        ? 'Add variance group to dispute package'
        : 'Included in dispute package'

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
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 10px', border: '1.5px solid var(--imp-gray-300)', borderRadius: 8, background: '#fff', position: 'relative' }}>
      <span style={{ width: 18, height: 18, flex: 'none', borderRadius: 5, border: '1.5px solid var(--imp-purple-500)', background: inDispute ? 'var(--imp-purple-500)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {inDispute && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5 9-10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={inDispute}
        disabled={disputeLocked}
        onChange={(e) => onToggleInclusion(g.id, e.target.checked)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer', zIndex: 1 }}
      />
      <span style={{ font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{disputeControlLabel}</span>
    </label>
  )

  return (
    <div className="db-card" id={`finding-${g.id}`} style={{ gap: 14, scrollMarginTop: 88 }}>
      <div className="ia-fcard">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <h3 className="db-h3" style={{ margin: 0 }}>
              {g.title}
            </h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', font: '500 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
              <span>
                Carrier <strong style={{ color: 'var(--imp-ink)' }}>{g.carriers.join(', ')}</strong>
              </span>
              <span>
                Service level <strong style={{ color: 'var(--imp-ink)' }}>{serviceLabel(g)}</strong>
              </span>
              <span>
                Variance group <strong style={{ color: 'var(--imp-ink)' }}>{g.category}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', font: '500 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
              <span>{g.invoices} invoices</span>
              <span>{g.packages} packages</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '78ch' }}>
            <p className="imp-body" style={{ margin: 0, fontSize: 14, color: 'var(--imp-fg-muted)' }}>
              {g.supportCopy}
            </p>
            {mixEntry && highlightLabel && (
              <p className="imp-small" style={{ margin: 0, color: 'var(--imp-orange-500)', fontWeight: 600 }}>
                {highlightLabel} contributes {posMoney(mixEntry.amount)}
                {mixEntry.amount < 0 ? ' favourable' : ' unfavourable'} inside this finding — the group net variance of {posMoney(g.varN)} is unchanged.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setExplOpen((o) => !o)}
              style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', font: '600 13px var(--imp-font-body)', color: 'var(--imp-purple-500)', padding: 0 }}
            >
              <span>{explOpen ? 'Hide how we identified this finding' : 'How we identified this finding'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: explOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {explOpen && (
              <div style={{ animation: 'imp-fade-in 0.2s ease', marginTop: 10, border: '1.5px solid var(--imp-purple-300)', borderRadius: 10, background: 'var(--imp-purple-100)', padding: '16px 18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="db-eyebrow" style={{ margin: 0 }}>
                    How we calculated this finding
                  </div>
                  <div>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>What was billed</div>
                    <p className="imp-small" style={{ margin: '3px 0 0' }}>
                      {provider} billed {fmtMoney(g.invoicedN)} in total charges across the {g.packages.toLocaleString('en-US')} packages assigned to this finding.
                    </p>
                  </div>
                  <div>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>What Implentio expected</div>
                    <p className="imp-small" style={{ margin: '3px 0 0' }}>
                      Implentio expected {fmtMoney(g.expectedN)} for those same packages, a {posMoney(g.varN)} net variance.
                    </p>
                  </div>
                  <div>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Why the amounts differ</div>
                    <p className="imp-small" style={{ margin: '3px 0 0' }}>
                      {g.why}
                    </p>
                  </div>
                  <div>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>How the charge differences net</div>
                    <p className="imp-small" style={{ margin: '3px 0 0' }}>
                      {g.mixText}
                    </p>
                  </div>
                  {exampleText(g) && (
                    <div style={{ border: '1.5px solid var(--imp-purple-300)', borderRadius: 10, background: '#fff', padding: '12px 14px' }}>
                      <div className="db-eyebrow" style={{ margin: '0 0 4px' }}>
                        Example package
                      </div>
                      <p className="imp-small" style={{ margin: 0 }}>
                        {exampleText(g)}
                      </p>
                    </div>
                  )}
                  <p className="imp-small" style={{ margin: 0, color: 'var(--imp-fg-subtle)' }}>
                    Every package belongs to exactly one finding. Favourable charge differences are netted against unfavourable differences on the same package, and only net-unfavourable packages are published.
                  </p>
                </div>
              </div>
            )}
          </div>

          {!expanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 11 }}>
              <button className="db-btn db-btn-primary db-btn-sm" aria-expanded={expanded} onClick={() => setExpanded(true)}>
                View affected packages
              </button>
              {inclusionCheckbox}
            </div>
          )}
        </div>

        <div className="ia-fcard-fin" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ border: '1.5px solid var(--imp-gray-300)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
            <div style={{ background: 'var(--imp-warning-bg)', padding: '11px 14px' }}>
              <div className="db-kpi-sub" style={{ color: 'var(--imp-orange-500)' }}>
                Group net variance
              </div>
              <div style={{ font: '600 28px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--imp-orange-500)', lineHeight: 1.1, marginTop: 2 }}>
                {fmtMoney(g.varN)}
              </div>
              <div style={{ font: '500 11px var(--imp-font-body)', color: 'var(--imp-fg-muted)', marginTop: 3 }}>
                Complete net variance for this group
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1.5px solid var(--imp-gray-300)' }}>
              <div style={{ padding: '9px 14px' }}>
                <div className="db-kpi-sub">Total invoiced</div>
                <div style={{ font: '600 14px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)', marginTop: 2 }}>{fmtMoney(g.invoicedN)}</div>
              </div>
              <div style={{ padding: '9px 14px', borderLeft: '1.5px solid var(--imp-gray-300)' }}>
                <div className="db-kpi-sub">Total expected</div>
                <div style={{ font: '600 14px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)', marginTop: 2 }}>{fmtMoney(g.expectedN)}</div>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid', borderRadius: 10, boxSizing: 'border-box', borderColor: colors.fg, background: colors.bg }}>
            <span style={{ font: '600 14px var(--imp-font-body)', color: colors.fg }}>{sl.label}</span>
          </div>
          {sl.secondary && (
            <span className="imp-small" style={{ margin: 0 }}>
              {sl.secondary}
            </span>
          )}
          {sl.subtleAction && (
            <button
              type="button"
              onClick={() => onIncludeInAnotherRequest(g.id)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', font: '600 12px var(--imp-font-body)', color: 'var(--imp-purple-500)', padding: 0 }}
            >
              {sl.actionLabel}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ animation: 'imp-fade-in 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="db-eyebrow" style={{ margin: 0 }}>
              Affected service levels
            </div>
            <InfoTip text={SVC_TIP} size={15} />
            <input
              className="ia-input"
              placeholder="Search service level, invoice, order, or tracking number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 290, padding: '7px 10px' }}
            />
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {allRecs.length} of {allRecs.length} service levels
            </span>
          </div>
          <p className="imp-small" style={{ margin: '0 0 10px' }}>
            Amounts include the complete invoiced and expected charges for packages assigned to this finding. Charge-level differences are shown in the package details below.
          </p>
          <div style={{ overflowX: 'auto', border: '1.5px solid var(--imp-gray-300)', borderRadius: 10 }}>
            <table className="db-table db-table-compact ia-svc-table">
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
                  <tr className="db-total-row">
                    <td>All service levels ({allRecs.length})</td>
                    <td className="num">{allRecs.reduce((a, r) => a + r.packages, 0).toLocaleString('en-US')}</td>
                    <td className="num">{fmtMoney(r2(allRecs.reduce((a, r) => a + r.invoicedN, 0)))}</td>
                    <td className="num">{fmtMoney(r2(allRecs.reduce((a, r) => a + r.expectedN, 0)))}</td>
                    <td className="num">{posMoney(r2(allRecs.reduce((a, r) => a + r.varN, 0)))}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setExpanded(false)}>
              Hide affected packages
            </button>
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
        <td style={{ fontWeight: 700 }}>{rec.label}</td>
        <td className="num">{rec.packages}</td>
        <td className="num">{fmtMoney(rec.invoicedN)}</td>
        <td className="num">{fmtMoney(rec.expectedN)}</td>
        <td className="num">{posMoney(rec.varN)}</td>
        <td>
          <button className="db-row-btn" onClick={onToggle}>
            {open ? 'Hide packages' : 'Show packages'}
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td className="ia-svc-detail" colSpan={6} style={{ padding: 0, background: 'var(--imp-gray-100)', borderLeft: '3px solid var(--imp-purple-400)' }}>
            <div style={{ padding: '14px 16px 16px 22px', animation: 'imp-fade-in 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div className="db-eyebrow" style={{ margin: 0 }}>
                  Contributing packages
                </div>
                <span className="imp-small" style={{ margin: 0 }}>
                  {g.carriers.join(', ')} {rec.label} · {g.title}
                </span>
              </div>
              <div className="ia-pkg-scroll" style={{ overflowX: 'auto', border: '1.5px solid var(--imp-gray-300)', borderRadius: 10, background: '#fff' }}>
                <table className="db-table db-table-compact ia-pkg-table">
                  <thead>
                    <tr>
                      <th className="ia-stick ia-stick-1" colSpan={3} style={{ zIndex: 5 }}>
                        Package identifiers
                      </th>
                      <th colSpan={5}>Package details</th>
                      <th className="num" colSpan={3} style={{ textAlign: 'center', background: 'var(--imp-gray-100)' }}>
                        Package total
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: '#EEF7F1' }}>
                        Expected
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: 'var(--imp-purple-100)' }}>
                        Invoiced
                      </th>
                      <th colSpan={5} style={{ textAlign: 'center', background: 'var(--imp-warning-bg)' }}>
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
                      <th className="num" style={{ background: 'var(--imp-gray-100)' }}>Total expected</th>
                      <th className="num" style={{ background: 'var(--imp-gray-100)' }}>Total invoiced</th>
                      <th className="num" style={{ background: 'var(--imp-gray-100)' }}>Net variance</th>
                      {chgCols.map((c) => (
                        <th key={`e-${c.key}`} className="num" style={{ background: '#EEF7F1', ...hlStyle(c.on) }}>{c.label}</th>
                      ))}
                      {chgCols.map((c) => (
                        <th key={`i-${c.key}`} className="num" style={{ background: 'var(--imp-purple-100)', ...hlStyle(c.on) }}>{c.label}</th>
                      ))}
                      {chgCols.map((c) => (
                        <th key={`v-${c.key}`} className="num" style={{ background: 'var(--imp-warning-bg)', ...hlStyle(c.on) }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shownPkgs.map((o) => {
                      const cells = chargeCells(o, hl)
                      const rowHl = packageHighlighted(o, hl)
                      const stickyBg = rowHl ? 'var(--imp-warning-bg)' : '#fff'
                      void reconcileText
                      return (
                        <tr key={`${o.t}|${o.inv}`} style={rowHl ? { background: 'var(--imp-warning-bg)' } : undefined}>
                          <td className="ia-stick ia-stick-1" style={{ fontFamily: 'var(--imp-font-mono)', fontSize: 11, background: stickyBg }}>{o.t}</td>
                          <td className="ia-stick ia-stick-2 db-muted" style={{ background: stickyBg }}>{o.so}</td>
                          <td className="ia-stick ia-stick-3" style={{ fontWeight: 600, background: stickyBg }}>{o.inv}</td>
                          <td className="db-muted">{excelDate(o.ld)}</td>
                          <td className="db-muted">{o.car}</td>
                          <td className="db-muted">{titleCase(o.sv)}</td>
                          <td className="num">{o.wt != null ? `${o.wt} oz` : '—'}</td>
                          <td className="db-muted">{o.az || o.ez || '—'}</td>
                          <td className="num" style={{ background: 'var(--imp-gray-100)' }}>{fmtMoney(o.te)}</td>
                          <td className="num" style={{ background: 'var(--imp-gray-100)' }}>{fmtMoney(o.ti)}</td>
                          <td className="num" style={{ background: 'var(--imp-gray-100)', color: 'var(--imp-orange-500)', fontWeight: 700 }}>{posMoney(o.tv)}</td>
                          {cells.map((c) => (
                            <td key={`e-${c.key}`} className="num" style={{ background: '#F5FBF7', ...hlStyle(c.highlighted) }}>{c.exp}</td>
                          ))}
                          {cells.map((c) => (
                            <td key={`i-${c.key}`} className="num" style={{ background: 'var(--imp-purple-050, #FAF9FF)', ...hlStyle(c.highlighted) }}>{c.inv}</td>
                          ))}
                          {cells.map((c) => (
                            <td
                              key={`v-${c.key}`}
                              className="num"
                              style={{
                                background: '#FFFBF4',
                                ...hlStyle(c.highlighted),
                                ...(c.diffZero ? {} : c.diffNegative ? { color: 'var(--imp-success)', fontWeight: 700 } : { color: 'var(--imp-orange-500)', fontWeight: 700 }),
                              }}
                            >
                              {c.diff}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                    {matchedCount > 0 && matchedCount <= shownPkgs.length && (
                      <tr className="db-total-row">
                        <td className="ia-stick ia-stick-1" colSpan={3} style={{ background: 'var(--imp-gray-200)' }}>
                          Contributing packages shown ({shownPkgs.length})
                        </td>
                        <td colSpan={5}></td>
                        <td className="num">{fmtMoney(r2(shownPkgs.reduce((a, x) => a + x.te, 0)))}</td>
                        <td className="num">{fmtMoney(r2(shownPkgs.reduce((a, x) => a + x.ti, 0)))}</td>
                        <td className="num" style={{ color: 'var(--imp-orange-500)' }}>{posMoney(r2(shownPkgs.reduce((a, x) => a + x.tv, 0)))}</td>
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
                </table>
              </div>
              <p className="imp-small" style={{ margin: '8px 0 0' }}>
                Each row is one package-level billing record. Total expected and total invoiced are the sums of the applicable charge components, each charge variance is invoiced minus expected, and the package net variance equals the sum of its charge variances. Favourable differences appear in green because they offset unfavourable charges within the same package.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                <span className="imp-small" style={{ margin: 0 }}>
                  Showing {shownPkgs.length} of {matchedCount} packages
                </span>
                {matchedCount > shownPkgs.length && (
                  <button className="db-btn db-btn-secondary db-btn-sm" onClick={onShowMore}>
                    Show more packages
                  </button>
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
