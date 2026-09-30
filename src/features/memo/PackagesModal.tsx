/** Step ③ of a finding: every package, in the existing pop-up (plan 02,
 *  option A — where step 3 opens is still open, Q-E1). Opens on "Differences
 *  only": what was billed, your contract, the difference, and which charges
 *  differ. A tracking number opens how that package was priced. Up to 25
 *  packages it's a plain table; "Full breakdown" is the audit table. */
import { Fragment, useId, useState, type CSSProperties } from 'react'
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { FindingGroup, PackageRecord } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { findingProblem } from '@/domain/finding-copy'
import {
  CHARGE_FIELDS,
  allPackages,
  chargeName,
  differingCharges,
  packageFacts,
  type ChargeField,
} from '@/domain/evidence'
import { plural } from '@/domain/plural'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { RadioGroup } from '@/ui/Form/Choice'
import { Select } from '@/ui/Form/Select'
import { TextField } from '@/ui/Form/TextField'
import { Table, TableScroll } from '@/ui/Table/Table'
import { useCompactShell } from '@/shell/useCompactShell'
import { signedMoney } from './evidence/ChargeTable'
import { ExplainedChargeTable, GlossaryWord } from './evidence/Explain'
import { SMALL_FINDING } from './evidence/WhyPanel'
import { CHARGE_DEFS, chargeCells, excelDate, titleCase } from './derive'
import styles from './evidence/Evidence.module.css'

type View = 'diff' | 'full'

const PAGE = 25
const ALL = 'all'
const DASH = '—'

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

const rowKey = (p: PackageRecord) => `${p.t}|${p.inv}`
const differs = (p: PackageRecord, f: ChargeField) => Math.abs(p[f][0] - p[f][1]) >= 0.005

function DiffList({ p }: { p: PackageRecord }) {
  const list = differingCharges(p)
  return (
    <>
      {list.map((c, i) => (
        <Fragment key={c.field}>
          {i > 0 && ' · '}
          <span className={c.diff < 0 ? styles.fav : undefined} style={{ fontWeight: 'inherit' }}>
            {c.name} {signedMoney(c.diff)}
            {c.diff < 0 && ' (below contract)'}
          </span>
        </Fragment>
      ))}
    </>
  )
}

function PackageDetail({
  p,
  showIds,
  chargeKey,
}: {
  p: PackageRecord
  showIds: boolean
  chargeKey: string
}) {
  const f = packageFacts(p)
  // On a home-delivery finding, home vs business is the Biller's claim, not a fact (as in "Show why").
  if (chargeKey === 'res') f.destination = null
  const bits = [
    showIds && `Invoice ${p.inv}`,
    `Order ${p.so}`,
    titleCase(p.sv),
    f.zone && `zone ${f.zone}${f.billedZone ? ` (billed as ${f.billedZone})` : ''}`,
    f.weightLb != null && `charged as ${f.weightLb} lb`,
    p.ld && `shipped ${excelDate(p.ld)}`,
  ].filter(Boolean)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '4px 0 8px',
        maxWidth: 720,
      }}
    >
      <strong className="ds-body-small">How this package was priced</strong>
      <span className="imp-small">{bits.join(' · ')}</span>
      <div className={styles.fits} style={{ overflowX: 'auto' }}>
        <ExplainedChargeTable pkg={p} facts={f} />
      </div>
      <span className={styles.hint}>Tap a charge to see what it means for this package.</span>
    </div>
  )
}

export function PackagesModal({
  group: g,
  provider,
  onDownload,
  onClose,
}: {
  group: FindingGroup
  /** The Biller, for the words that explain themselves. */
  provider: string
  onDownload: () => void
  onClose: () => void
}) {
  const compact = useCompactShell()
  const [view, setView] = useState<View>('diff')
  const [service, setService] = useState<string>(ALL)
  const [only, setOnly] = useState<string>(ALL)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [openRow, setOpenRow] = useState<string | null>(null)

  const all = g.services
    .flatMap((s) => s.pkgs.map((p) => ({ p, service: s.key })))
    .sort((a, b) => b.p.tv - a.p.tv)
  // Up to 25 packages: a plain table, no search, filters or pages (plan 02, 5a).
  const simple = all.length <= SMALL_FINDING
  const q = search.trim().toLowerCase()
  const matched = simple
    ? all.map((x) => x.p)
    : all
        .filter((x) => service === ALL || x.service === service)
        .filter(({ p }) => only === ALL || differs(p, only as ChargeField))
        .filter(
          ({ p }) => !q || [p.t, p.so, p.inv].some((v) => String(v).toLowerCase().includes(q)),
        )
        .map((x) => x.p)
  const pages = Math.max(1, Math.ceil(matched.length / PAGE))
  const pageNow = Math.min(page, pages - 1)
  const shown = simple ? matched : matched.slice(pageNow * PAGE, pageNow * PAGE + PAGE)
  const filtered = !simple && (q !== '' || service !== ALL || only !== ALL)
  const full = view === 'full' && !compact
  // Only the charges that differ somewhere in this finding can be filtered on.
  const onlyOptions = CHARGE_FIELDS.filter((f) => all.some(({ p }) => differs(p, f)))
  // What each column's word means for these packages (the helpers' "in your case").
  const scope = `Across these ${plural(all.length, 'package')}`
  const facts = all.map(({ p }) => packageFacts(p))
  const lbs = facts.map((f) => f.weightLb).filter((v): v is number => v != null)
  const dists = facts.map((f) => f.distance).filter((v): v is number => v != null)
  const zoneMoved = facts.filter((f) => f.billedZone).length
  const cases = {
    service: `${g.services.map((v) => `${v.label} (${v.packages})`).join(', ')}.`,
    differ: `${CHARGE_FIELDS.map((f) => [f, all.filter(({ p }) => differs(p, f)).length] as const)
      .filter(([, n]) => n > 0)
      .map(([f, n]) => `${chargeName(f)} on ${plural(n, 'package')}`)
      .join(', ')}.`,
    weight: lbs.length ? `Charged as ${Math.min(...lbs)}–${Math.max(...lbs)} lb.` : undefined,
    zone: dists.length
      ? `Distances ${Math.min(...dists)} to ${Math.max(...dists)}.${zoneMoved ? ` On ${plural(zoneMoved, 'package')} your Biller used a different zone than your contract.` : ''}`
      : undefined,
  }
  // The card's amount is the real one; rows can add up a few cents apart.
  const rowsTotal = r2(allPackages(g).reduce((s, p) => s + p.tv, 0))
  const roundingGap = Math.abs(rowsTotal - g.varN) >= 0.01

  const pagerId = useId()
  const goToPage = (n: number) => {
    setPage(n)
    setOpenRow(null)
    // On the first or last page the pressed button turns disabled and would
    // drop focus out of the dialog; hand it to the other one.
    const other = n === 0 ? 'next' : n >= pages - 1 ? 'prev' : null
    if (other) requestAnimationFrame(() => document.getElementById(`${pagerId}-${other}`)?.focus())
  }
  const resetPage = () => {
    setPage(0)
    setOpenRow(null)
  }
  const clear = () => {
    setSearch('')
    setService(ALL)
    setOnly(ALL)
    resetPage()
  }
  const trackingButton = (p: PackageRecord) => (
    <button
      type="button"
      className={`${styles.term} ${styles.fact} ${styles.mono}`}
      aria-label={`${p.t}, how this package was priced`}
      aria-expanded={openRow === rowKey(p)}
      onClick={() => setOpenRow((o) => (o === rowKey(p) ? null : rowKey(p)))}
    >
      {p.t}
    </button>
  )

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      width={1320}
      fill={compact}
      title={`All ${plural(all.length, 'package')}`}
      description={`${findingProblem(g)} · ${fmtMoney(g.varN)} overcharged`}
      footer={
        <Button variant="primary" size="small" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-3)',
          flexWrap: 'wrap',
        }}
      >
        {!simple && (
          <>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <TextField
                size="small"
                aria-label="Search tracking, order, or invoice number"
                placeholder="Search tracking, order, or invoice number"
                iconLeft={<MagnifyingGlassIcon aria-hidden="true" />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  resetPage()
                }}
              />
            </div>
            <Select
              aria-label="Service level"
              size="small"
              value={service}
              onValueChange={(v) => {
                setService(v)
                resetPage()
              }}
              options={[
                { value: ALL, label: `All service levels (${all.length})` },
                ...g.services.map((s) => ({ value: s.key, label: `${s.label} (${s.packages})` })),
              ]}
            />
            {onlyOptions.length > 1 && (
              <Select
                aria-label="Only where a charge differs"
                size="small"
                value={only}
                onValueChange={(v) => {
                  setOnly(v)
                  resetPage()
                }}
                options={[
                  { value: ALL, label: 'Any charge' },
                  ...onlyOptions.map((f) => ({
                    value: f,
                    label: `Only where ${chargeName(f).toLowerCase()} differs`,
                  })),
                ]}
              />
            )}
            {!compact && (
              <RadioGroup
                aria-label="Columns"
                bordered
                direction="row"
                value={view}
                onValueChange={setView}
                options={[
                  { value: 'diff', label: 'Differences only' },
                  { value: 'full', label: 'Full breakdown' },
                ]}
              />
            )}
          </>
        )}
        <Link
          variant="accent"
          size="small"
          bold
          iconLeft={<ArrowDownTrayIcon aria-hidden="true" />}
          onClick={onDownload}
        >
          Download packages (.csv)
        </Link>
      </div>

      {filtered && matched.length > 0 && (
        <p className="imp-small" style={{ margin: 0 }}>
          Filtered view. The finding’s total stays {fmtMoney(g.varN)}.
        </p>
      )}

      {matched.length === 0 ? (
        <div
          style={{
            ...SURFACE,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            alignItems: 'flex-start',
          }}
        >
          <strong className="ds-body-base">No packages match.</strong>
          <span className="imp-small">
            {q ? `Nothing matches “${search.trim()}”. ` : ''}Search looks at tracking, order and
            invoice numbers. Filtering never changes the finding’s total.
          </span>
          <Button size="small" onClick={clear} style={{ marginTop: 6 }}>
            Clear search and filters
          </Button>
        </div>
      ) : compact ? (
        // Phones: a stacked list — tracking, then billed · contract · difference;
        // the rest opens under the package (plan 02, "Phone").
        <ul
          style={{ ...SURFACE, listStyle: 'none', margin: 0, padding: 0, flex: 'none' }}
          aria-label="Packages"
        >
          {shown.map((p, i) => (
            <li
              key={rowKey(p)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '10px 12px',
                borderTop: i > 0 ? '1px solid var(--ds-stroke-disabled)' : undefined,
              }}
            >
              <span>{trackingButton(p)}</span>
              <span className="ds-body-small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                Billed {fmtMoney(p.ti)} · Your contract {fmtMoney(p.te)} ·{' '}
                <span className={styles.diff}>{signedMoney(p.tv)}</span>
              </span>
              {openRow === rowKey(p) && (
                <>
                  <span className="ds-body-small">
                    <DiffList p={p} />
                  </span>
                  <PackageDetail p={p} showIds chargeKey={g.chargeKey} />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <TableScroll className="ia-pkg-scroll" style={{ ...SURFACE, minHeight: 240 }}>
          {!full ? (
            <Table>
              <thead>
                <tr>
                  <th>Tracking number</th>
                  <th>Invoice</th>
                  <th>
                    <GlossaryWord
                      term="serviceLevel"
                      biller={provider}
                      caseLabel={scope}
                      caseText={cases.service}
                    />
                  </th>
                  <th className="num">Billed</th>
                  <th className="num">Your contract</th>
                  <th className="num">Difference</th>
                  <th>
                    <GlossaryWord
                      term="chargesThatDiffer"
                      biller={provider}
                      caseLabel={scope}
                      caseText={cases.differ}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <Fragment key={rowKey(p)}>
                    <tr>
                      <td className="nowrap">{trackingButton(p)}</td>
                      <td className="nowrap" style={{ fontWeight: 600 }}>
                        {p.inv}
                      </td>
                      <td className="nowrap ds-muted">{titleCase(p.sv)}</td>
                      <td className="num">{fmtMoney(p.ti)}</td>
                      <td className="num">{fmtMoney(p.te)}</td>
                      <td className={`num ${styles.diff}`}>{signedMoney(p.tv)}</td>
                      <td className="ds-body-small" style={{ minWidth: 260 }}>
                        <DiffList p={p} />
                      </td>
                    </tr>
                    {openRow === rowKey(p) && (
                      <tr>
                        <td colSpan={7}>
                          <PackageDetail p={p} showIds={false} chargeKey={g.chargeKey} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
                  <th
                    className="num"
                    colSpan={3}
                    style={{ textAlign: 'center', background: GROUP_BG.total }}
                  >
                    Package total
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.invoiced }}>
                    Billed
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.expected }}>
                    Your contract
                  </th>
                  <th colSpan={5} style={{ textAlign: 'center', background: GROUP_BG.variance }}>
                    Difference
                  </th>
                </tr>
                <tr>
                  <th className="ia-stick ia-stick-1">Tracking number</th>
                  <th className="ia-stick ia-stick-2">Order number</th>
                  <th className="ia-stick ia-stick-3">Invoice number</th>
                  <th>Ship date</th>
                  <th>Carrier</th>
                  <th>
                    <GlossaryWord
                      term="serviceLevel"
                      biller={provider}
                      caseLabel={scope}
                      caseText={cases.service}
                    />
                  </th>
                  <th className="num">
                    <GlossaryWord
                      term="billedWeight"
                      biller={provider}
                      caseLabel={scope}
                      caseText={cases.weight}
                    />
                  </th>
                  <th>
                    <GlossaryWord
                      term="zone"
                      biller={provider}
                      caseLabel={scope}
                      caseText={cases.zone}
                    />
                  </th>
                  <th className="num" style={{ background: GROUP_BG.total }}>
                    Billed
                  </th>
                  <th className="num" style={{ background: GROUP_BG.total }}>
                    Your contract
                  </th>
                  <th className="num" style={{ background: GROUP_BG.total }}>
                    Difference
                  </th>
                  {(['invoiced', 'expected', 'variance'] as const).flatMap((grp) =>
                    CHARGE_DEFS.map((c) => (
                      <th
                        key={`${grp}-${c[0]}`}
                        className="num"
                        style={{ background: GROUP_BG[grp] }}
                      >
                        {chargeName(c[0])}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => {
                  const cells = chargeCells(o, ALL)
                  return (
                    <tr key={rowKey(o)}>
                      <td
                        className="ia-stick ia-stick-1"
                        style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}
                      >
                        {o.t}
                      </td>
                      <td className="ia-stick ia-stick-2" style={{ color: 'var(--ds-fg-muted)' }}>
                        {o.so}
                      </td>
                      <td className="ia-stick ia-stick-3" style={{ fontWeight: 600 }}>
                        {o.inv}
                      </td>
                      <td style={{ color: 'var(--ds-fg-muted)' }}>{excelDate(o.ld)}</td>
                      <td style={{ color: 'var(--ds-fg-muted)' }}>{o.car}</td>
                      <td style={{ color: 'var(--ds-fg-muted)' }}>{titleCase(o.sv)}</td>
                      <td className="num">{o.wt != null ? `${o.wt} oz` : DASH}</td>
                      <td style={{ color: 'var(--ds-fg-muted)' }}>{o.az || o.ez || DASH}</td>
                      <td className="num" style={{ background: GROUP_BG.total }}>
                        {fmtMoney(o.ti)}
                      </td>
                      <td className="num" style={{ background: GROUP_BG.total }}>
                        {fmtMoney(o.te)}
                      </td>
                      <td
                        className="num"
                        style={{
                          background: GROUP_BG.total,
                          color: 'var(--ds-fg-accent-text)',
                          fontWeight: 600,
                        }}
                      >
                        {signedMoney(o.tv)}
                      </td>
                      {cells.map((c) => (
                        <td key={`i-${c.key}`} className="num">
                          {c.inv}
                        </td>
                      ))}
                      {cells.map((c) => (
                        <td key={`e-${c.key}`} className="num">
                          {c.exp}
                        </td>
                      ))}
                      {cells.map((c) => (
                        <td
                          key={`v-${c.key}`}
                          className="num"
                          style={
                            c.diffZero
                              ? undefined
                              : c.diffNegative
                                ? { color: 'var(--ds-status-success-fg)', fontWeight: 600 }
                                : { color: 'var(--ds-fg-accent-text)', fontWeight: 600 }
                          }
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
      )}

      {matched.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span className="imp-small" style={{ margin: 0 }} aria-live="polite">
            {simple
              ? `All ${plural(matched.length, 'package')}`
              : `Showing ${pageNow * PAGE + 1}–${pageNow * PAGE + shown.length} of ${plural(matched.length, 'package')}`}
            {!full && ' · open a tracking number to see how it was priced'}
          </span>
          {pages > 1 && (
            <span style={{ display: 'flex', gap: 8 }}>
              <Button
                id={`${pagerId}-prev`}
                size="small"
                disabled={pageNow === 0}
                onClick={() => goToPage(pageNow - 1)}
              >
                Previous
              </Button>
              <Button
                id={`${pagerId}-next`}
                size="small"
                disabled={pageNow >= pages - 1}
                onClick={() => goToPage(pageNow + 1)}
              >
                Next
              </Button>
            </span>
          )}
        </div>
      )}
      <p className="imp-small" style={{ margin: 0 }}>
        Billed is what your Biller charged for the package; your contract is what it should have
        cost. Green amounts were billed below contract: they make that package’s difference smaller.
        {roundingGap &&
          ` The rows add up to ${fmtMoney(rowsTotal)}; the finding’s amount, ${fmtMoney(g.varN)}, is the exact one (the rows are rounded to the cent).`}
      </p>
    </Modal>
  )
}
