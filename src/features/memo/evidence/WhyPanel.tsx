/** Step 2 of a finding, "Show why", drawn as in
 *  prototype-planning/02-findings-evidence.html: a tinted well of section
 *  cards, all visible at once — what makes up the overcharge, the overcharge
 *  per package, how one package was priced (a package slip), and how we
 *  checked. Every chart has a table twin. */
import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  Bars3BottomLeftIcon,
  ChartBarIcon,
  CheckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import type { FindingGroup, FindingSource } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { fmtDateLong } from '@/domain/dates'
import { chargeCopy, findingProblem } from '@/domain/finding-copy'
import { plural } from '@/domain/plural'
import {
  BAND_LABEL,
  SPEED_LABEL,
  allPackages,
  breakdownTake,
  chargeBreakdown,
  examplePackages,
  packageFacts,
  relatedFinding,
  richText,
  shortMoney,
  spreadBuckets,
  spreadSummary,
  topTenBuckets,
  type BreakdownEntry,
} from '@/domain/evidence'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Segmented } from '@/ui/Segmented/Segmented'
import {
  ChargeOverview,
  ExplainTerm,
  ExplainedChargeTable,
  factExplanation,
  GlossaryWord,
  explainableFacts,
  type FactKey,
} from './Explain'
import { titleCase } from '../derive'
import styles from './Evidence.module.css'

/** Up to this many packages the list is a plain table and the spread is one sentence (plan 02, 5a). */
export const SMALL_FINDING = 25

type View = 'chart' | 'table'
const VIEWS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
] as const

export interface ImplentioContact {
  name: string
  email: string
}

/** Text with **bold** runs (the generated sentences mark what to stress). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {richText(text).map((r, i) =>
        r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>,
      )}
    </>
  )
}

function Section({
  id,
  icon,
  title,
  eyebrow,
  aside,
  className,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  eyebrow?: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')} aria-labelledby={id}>
      <header className={styles.head}>
        <span className={styles.headIcon} aria-hidden="true">
          {icon}
        </span>
        <div className={styles.titles}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h4 id={id} className={styles.sectionTitle}>
            {title}
          </h4>
        </div>
        {aside && <div className={styles.aside}>{aside}</div>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}

// ---------- what makes up the overcharge ------------------------------------

const niceStep = (raw: number) => {
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

/** Axis labels: "$4k", "$8", "50¢". */
const axisMoney = (v: number) => {
  const a = Math.abs(v)
  const t =
    a >= 1000
      ? `$${+(a / 1000).toFixed(1)}k`
      : a > 0 && a < 1
        ? `${Math.round(a * 100)}¢`
        : `$${+a.toFixed(2)}`
  return (v < 0 ? '−' : '') + t
}

const signed = (e: BreakdownEntry) => `${e.amount > 0 ? '+' : '−'}${fmtMoney(Math.abs(e.amount))}`

function BreakdownSection({
  g,
  idp,
  provider,
  related,
  onJump,
}: {
  g: FindingGroup
  idp: string
  provider: string
  related: FindingGroup | null
  onJump: (() => void) | null
}) {
  const [view, setView] = useState<View>('chart')
  const b = chargeBreakdown(g)
  const entries = [...b.over, ...b.under]
  const single = entries.length <= 1
  // One scale for both sides in round steps; the zero line sits where the steps say.
  const maxPos = b.over[0]?.amount ?? 0
  const maxNeg = Math.abs(b.under[0]?.amount ?? 0)
  const step = niceStep(Math.max(maxPos + maxNeg, 0.01) / 5)
  const lo = -Math.ceil(maxNeg / step - 1e-9) * step
  const hi = Math.ceil(maxPos / step - 1e-9) * step
  const span = hi - lo || 1
  const P = (v: number) => (v / span) * 100
  const zero = P(-lo)
  const zi = Math.round(-lo / step)
  const ticks = Array.from({ length: Math.round(span / step) + 1 }, (_, i) => i)

  return (
    <Section
      id={`${idp}-breakdown`}
      icon={<Bars3BottomLeftIcon />}
      title="What makes up the overcharge"
      aside={
        !single && (
          <Segmented
            size="small"
            label="Show the breakdown as"
            value={view}
            onValueChange={setView}
            options={VIEWS}
          />
        )
      }
    >
      <div
        className={styles.equation}
        role="group"
        aria-label="Billed minus your contract equals overcharged"
      >
        <div className={styles.stat}>
          <span className={styles.statLabel}>Billed</span>
          <span className={styles.statValue}>{fmtMoney(g.invoicedN)}</span>
        </div>
        <span className={styles.op} aria-hidden="true">
          −
        </span>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Your contract</span>
          <span className={styles.statValue}>{fmtMoney(g.expectedN)}</span>
        </div>
        <span className={styles.op} aria-hidden="true">
          =
        </span>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Overcharged</span>
          <span className={`${styles.statValue} ${styles.moneyText}`}>{fmtMoney(g.varN)}</span>
        </div>
      </div>
      <p>
        <Rich text={breakdownTake(g)} />
      </p>
      {!single &&
        (view === 'chart' ? (
          <div>
            {/* No totals here: what was billed below contract is never summed (note 3). */}
            <ul className={styles.legend} aria-label="Key">
              <li>
                <span className={`${styles.swatch} ${styles.swOver}`} aria-hidden="true" />
                Billed above your contract
              </li>
              {b.under.length > 0 && (
                <li>
                  <span className={`${styles.swatch} ${styles.swUnder}`} aria-hidden="true" />
                  <GlossaryWord
                    term="belowContract"
                    biller={provider}
                    caseLabel={`Across these ${plural(g.packages, 'package')}`}
                    caseText={`${b.under.map((e) => `${e.name} ${signed(e)}`).join(', ')}: each one already makes those packages’ differences smaller.`}
                  />
                </li>
              )}
            </ul>
            <ul
              className={styles.dv}
              aria-label={`What each charge adds to or takes off the overcharge, across these ${plural(g.packages, 'package')}`}
              style={
                {
                  ['--zero' as string]: `${zero}%`,
                  ['--grid' as string]: `${P(step)}%`,
                } as CSSProperties
              }
            >
              {entries.map((e) => {
                const w = P(Math.abs(e.amount))
                return (
                  <li key={e.field} className={styles.dvRow}>
                    <span className={styles.dvLabel}>
                      <ChargeOverview g={g} fields={[e.field]} label={e.name} />
                    </span>
                    <span className={styles.dvTrack} aria-hidden="true">
                      <span
                        className={`${styles.dvBar} ${e.amount > 0 ? styles.dvBarOver : styles.dvBarUnder}`}
                        style={{ left: `${e.amount > 0 ? zero : zero - w}%`, width: `${w}%` }}
                      />
                    </span>
                    <span
                      className={`${styles.dvValue} ${e.amount > 0 ? styles.dvOver : styles.dvUnder}`}
                    >
                      {signed(e)}
                      {e.amount < 0 && (
                        <span className={styles.vh}> (billed below your contract)</span>
                      )}
                    </span>
                  </li>
                )
              })}
              <li className={styles.dvAxis} aria-hidden="true">
                <span />
                <span className={styles.dvTicks}>
                  {ticks.map((i) => (
                    <span
                      key={i}
                      className={
                        i === zi ? styles.t0 : Math.abs(i - zi) % 2 ? styles.t2 : (styles.t4 ?? '')
                      }
                      style={{ left: `${P(i * step)}%` }}
                    >
                      {i === zi ? '$0' : axisMoney(lo + i * step)}
                    </span>
                  ))}
                </span>
                <span />
              </li>
            </ul>
          </div>
        ) : (
          <table className={styles.tbl}>
            <caption className={styles.vh}>
              Each charge’s difference, billed minus your contract
            </caption>
            <thead>
              <tr>
                <th scope="col">Charge</th>
                <th scope="col" className={styles.num}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.group}>
                <th colSpan={2} scope="colgroup">
                  Billed above your contract
                </th>
              </tr>
              {b.over.map((e) => (
                <tr key={e.field}>
                  <td>
                    <ChargeOverview g={g} fields={[e.field]} label={e.name} />
                  </td>
                  <td className={`${styles.num} ${styles.diff}`}>{signed(e)}</td>
                </tr>
              ))}
              {b.under.length > 0 && (
                <tr className={styles.group}>
                  <th colSpan={2} scope="colgroup">
                    Billed below your contract
                  </th>
                </tr>
              )}
              {b.under.map((e) => (
                <tr key={e.field}>
                  <td>
                    <ChargeOverview g={g} fields={[e.field]} label={e.name} />
                  </td>
                  <td className={`${styles.num} ${styles.fav}`}>{signed(e)}</td>
                </tr>
              ))}
              <tr className={styles.total}>
                <td>Overcharged</td>
                <td className={`${styles.num} ${styles.diff}`}>{fmtMoney(g.varN)}</td>
              </tr>
            </tbody>
          </table>
        ))}
      <p className={styles.small}>
        Other findings cover different packages, so nothing is counted twice.
        {related && (
          <>
            {' '}
            The separate finding{' '}
            {onJump ? (
              <Link variant="accent" size="small" onClick={onJump}>
                {findingProblem(related)}
              </Link>
            ) : (
              <>“{findingProblem(related)}”</>
            )}{' '}
            covers the same kind of charge on {plural(related.packages, 'other package')}.
          </>
        )}
      </p>
    </Section>
  )
}

// ---------- overcharge per package ------------------------------------------

/** Whether the spread gets a chart (more than 25 packages that differ). */
const spreadHasChart = (diffs: readonly number[]) =>
  diffs.length > SMALL_FINDING && new Set(diffs).size > 1

function SpreadSection({ g, idp }: { g: FindingGroup; idp: string }) {
  const [view, setView] = useState<View>('chart')
  const diffs = allPackages(g).map((p) => p.tv)
  const summary = spreadSummary(diffs)
  if (!summary) return null
  const withChart = spreadHasChart(diffs)
  const buckets = withChart ? spreadBuckets(diffs) : []
  const top = Math.max(1, ...buckets.map((b) => b.count))
  const hot = buckets.findIndex((b) => b.count === top)
  const ys = niceStep(top / 3)
  const yMax = Math.ceil(top / ys) * ys
  const H = (c: number) => (c / yMax) * 100
  const yTicks = Array.from({ length: Math.round(yMax / ys) + 1 }, (_, i) => i * ys)
  const tail = topTenBuckets(buckets)
  const tailTop = tail ? Math.max(...buckets.slice(buckets.length - tail).map((b) => b.count)) : 0
  const pct = (share: number) => `${Math.round(share * 100)}%`

  return (
    <Section
      id={`${idp}-spread`}
      icon={<ChartBarIcon />}
      title="Overcharge per package"
      aside={
        withChart && (
          <Segmented
            size="small"
            label="Show the spread as"
            value={view}
            onValueChange={setView}
            options={VIEWS}
          />
        )
      }
    >
      {/* The main figure in a highlight box, like "Billed − Your contract = Overcharged". */}
      <div
        className={`${styles.equation} ${styles.spread}`}
        role="group"
        aria-label="Overcharge per package"
      >
        <div className={styles.stat}>
          <span className={styles.statLabel}>{summary.who}</span>
          <span className={`${styles.statValue} ${styles.moneyText}`}>{summary.value}</span>
        </div>
        {summary.largest && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>The largest</span>
            <span className={styles.statValue}>{summary.largest} over</span>
          </div>
        )}
      </div>
      {withChart &&
        (view === 'chart' ? (
          <div className={styles.hgWrap}>
            <div className={styles.hg}>
              <span className={styles.hgYTitle} aria-hidden="true">
                Packages
              </span>
              <div className={styles.hgY} aria-hidden="true">
                {yTicks.map((v) => (
                  <span key={v} style={{ bottom: `${H(v)}%` }}>
                    {v}
                  </span>
                ))}
              </div>
              <div className={styles.hgPlot}>
                <div className={styles.hgGrid} aria-hidden="true">
                  {yTicks.map((v) => (
                    <i key={v} style={{ bottom: `${H(v)}%` }} />
                  ))}
                </div>
                <ol className={styles.hgBars} aria-label="Packages by amount over your contract">
                  {buckets.map((b, i) => (
                    <li
                      key={b.label}
                      className={`${styles.hgBar} ${i === hot ? styles.hot : ''}`}
                      style={{ ['--h' as string]: `${H(b.count)}%` } as CSSProperties}
                    >
                      <span className={styles.vh}>
                        {b.label} over: {plural(b.count, 'package')}, {pct(b.share)}
                      </span>
                      {i === hot && (
                        <span className={styles.hgCap} aria-hidden="true">
                          {b.count} · {pct(b.share)}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                {tail > 0 && (
                  <div
                    className={styles.hgBracket}
                    aria-hidden="true"
                    style={{
                      width: `calc(${(tail * 100) / buckets.length}% - 1px)`,
                      bottom: `calc(${H(tailTop)}% + 10px)`,
                    }}
                  >
                    <span>Top 10%</span>
                  </div>
                )}
              </div>
              <div className={styles.hgX} aria-hidden="true">
                {buckets.map((b) => (
                  <span key={b.label}>{b.axis}</span>
                ))}
              </div>
            </div>
            <p className={styles.hgXTitle} aria-hidden="true">
              Amount over contract
            </p>
          </div>
        ) : (
          <table className={styles.tbl}>
            <caption className={styles.vh}>Packages by amount over your contract</caption>
            <thead>
              <tr>
                <th scope="col">Over contract by</th>
                <th scope="col" className={styles.num}>
                  Packages
                </th>
                <th scope="col" className={styles.num}>
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={b.label} className={i === hot ? styles.hot : undefined}>
                  <td>{b.label}</td>
                  <td className={styles.num}>{b.count}</td>
                  <td className={styles.num}>{pct(b.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </Section>
  )
}

// ---------- how one package was priced: the package slip -------------------

function ExampleSection({ g, idp, provider }: { g: FindingGroup; idp: string; provider: string }) {
  const [pick, setPick] = useState<'typical' | 'largest'>('typical')
  const ex = examplePackages(g)
  if (!ex) return null
  const p = pick === 'largest' && ex.largest ? ex.largest : ex.typical
  const f = packageFacts(p)
  // On a home-delivery finding, home vs business is what's in dispute: the
  // service name is the Biller's claim, so it isn't offered as a fact.
  if (g.chargeKey === 'res') f.destination = null
  const can = explainableFacts(f)
  const only = g.packages === 1
  const eyebrow = only
    ? 'The only package'
    : !ex.largest
      ? `One of ${plural(g.packages, 'package')} · all were ${shortMoney(ex.typical.tv)} over`
      : `One of ${plural(g.packages, 'package')}`
  // A detail explains itself only when we can say something true about it —
  // in the same popover as every other helper; details keep just the underline.
  const fact = (key: FactKey, label: string) =>
    can.has(key) ? (
      <ExplainTerm label={label} mark={false} e={factExplanation(key, f, provider)} />
    ) : (
      label
    )
  const specs: [string, ReactNode][] = [
    ['Carrier', f.carrier],
    ['Weight', f.weightLb != null ? fact('weight', `${f.weightLb} lb`) : '—'],
    ['Speed', f.speed ? fact('speed', SPEED_LABEL[f.speed]) : titleCase(f.service)],
  ]
  if (f.destination)
    specs.push([
      'Delivered to',
      fact('destination', f.destination === 'home' ? 'Home' : 'Business'),
    ])
  specs.push([
    'Distance',
    f.band
      ? fact('distance', `${BAND_LABEL[f.band]} (zone ${f.zone})`)
      : f.zone
        ? `Zone ${f.zone}`
        : '—',
  ])
  if (f.billedZone) specs.push(['Billed as', `Zone ${f.billedZone}`])
  if (f.zip && g.chargeKey === 'das') specs.push(['Destination', `ZIP ${f.zip}`])

  return (
    <Section
      id={`${idp}-example`}
      icon={<CubeIcon />}
      title={only ? 'How the package was priced' : 'How one package was priced'}
      eyebrow={eyebrow}
      className={styles.example}
      aside={
        ex.largest && (
          <Segmented
            label="Example package"
            value={pick}
            onValueChange={setPick}
            options={[
              { value: 'typical', label: 'Typical' },
              { value: 'largest', label: 'Largest' },
            ]}
          />
        )
      }
    >
      <div className={styles.pkg}>
        <span className={styles.pkgTab}>{only ? 'The package' : 'Example package'}</span>
        <dl className={styles.pkgHead}>
          <div>
            <dt>Tracking</dt>
            <dd className={styles.mono}>{p.t}</dd>
          </div>
          <div>
            <dt>Invoice</dt>
            <dd className={styles.mono}>{p.inv}</dd>
          </div>
        </dl>
        <dl className={styles.pkgSpecs}>
          {specs.map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <div style={{ overflowX: 'auto' }}>
          <ExplainedChargeTable pkg={p} facts={f} />
        </div>
        <p className={styles.hint}>Tap a charge or an underlined detail to see what it means.</p>
      </div>
    </Section>
  )
}

// ---------- how we checked ----------------------------------------------------

const DOC_STATE = {
  attached: { Icon: CheckIcon, cls: styles.docOk, label: 'Attached', sub: 'Attached.' },
  named: {
    Icon: ExclamationTriangleIcon,
    cls: styles.docNamed,
    label: 'File not attached',
    sub: 'We know which one, but the file isn’t attached.',
  },
  missing: { Icon: MinusIcon, cls: styles.docNone, label: 'Not attached', sub: 'Not attached.' },
  checked: { Icon: CheckIcon, cls: styles.docOk, label: 'Checked', sub: '' },
} as const

function DocTile({
  state,
  name,
  detail,
  sub,
  action,
}: {
  state: keyof typeof DOC_STATE
  name: string
  detail?: string
  sub: string
  action?: ReactNode
}) {
  const st = DOC_STATE[state]
  return (
    <li className={styles.doc}>
      <span className={`${styles.docIcon} ${st.cls}`} role="img" aria-label={st.label}>
        <st.Icon aria-hidden="true" />
      </span>
      <div className={styles.docText}>
        <span className={styles.docName}>
          {name}
          {detail && <span> · {detail}</span>}
        </span>
        <span className={styles.docSub}>{sub}</span>
      </div>
      {action ?? <span />}
    </li>
  )
}

function MethodSection({
  g,
  idp,
  provider,
  contact,
  onOpenPackages,
}: {
  g: FindingGroup
  idp: string
  provider: string
  contact: ImplentioContact | null
  onOpenPackages?: () => void
}) {
  const sources: FindingSource[] = g.sources ?? []
  const subject = encodeURIComponent(`Question about “${findingProblem(g)}”`)
  return (
    <Section id={`${idp}-method`} icon={<CheckIcon />} title="How we checked">
      <p>{chargeCopy(g).method}</p>
      <ul className={styles.docs} aria-label="What we compared with">
        {sources.map((s) => (
          <DocTile
            key={`${s.kind}-${s.name}`}
            state={s.status}
            name={s.name}
            detail={s.detail}
            sub={`${s.role}. ${DOC_STATE[s.status].sub}`}
            action={
              s.status === 'attached' && s.fileUrl ? (
                <Link
                  variant="accent"
                  size="small"
                  bold
                  href={s.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </Link>
              ) : undefined
            }
          />
        ))}
        <DocTile
          state="checked"
          name={plural(g.invoices, `${provider} invoice`)}
          sub={`${plural(g.packages, 'package')} matched by tracking number`}
          action={
            onOpenPackages && (
              <Link variant="accent" size="small" bold onClick={onOpenPackages}>
                List
              </Link>
            )
          }
        />
      </ul>
      {sources.length === 0 && (
        <p className={styles.small}>
          Implentio hasn’t published the price lists and other documents it compared with yet.
        </p>
      )}
      {g.reviewedBy && g.reviewedAt && (
        <p className={styles.reviewed}>
          <CheckIcon aria-hidden="true" />
          Checked by an Implentio reviewer ({g.reviewedBy}) · {fmtDateLong(g.reviewedAt)}
        </p>
      )}
      {contact && (
        // The address is visible, so it works without a mail app (a mailto can do nothing).
        <p className={styles.small}>
          Questions or need a document? Ask {contact.name} at Implentio:{' '}
          <Link variant="accent" size="small" href={`mailto:${contact.email}?subject=${subject}`}>
            {contact.email}
          </Link>
        </p>
      )}
    </Section>
  )
}

// ---------- the panel -----------------------------------------------------------

export function WhyPanel({
  group: g,
  allGroups,
  provider,
  contact,
  onOpenPackages,
  onDownload,
  onJump,
}: {
  group: FindingGroup
  /** Every finding on the memo, to name the one that shares a charge. */
  allGroups: readonly FindingGroup[]
  provider: string
  contact: ImplentioContact | null
  onOpenPackages: () => void
  onDownload: () => void
  /** Scrolls to another finding; null when that card isn't on screen (filtered out). */
  onJump: (groupId: string) => (() => void) | null
}) {
  const idp = `why-${g.id}`
  const count = allPackages(g).length
  const many = count > 1
  const related = relatedFinding(g, allGroups)
  return (
    <>
      {/* Fixed 2×2 (user order, 2026-09-30): what makes it up and one package priced; the spread and how it was checked. */}
      <div className={styles.grid}>
        <BreakdownSection
          g={g}
          idp={idp}
          provider={provider}
          related={related}
          onJump={related ? onJump(related.id) : null}
        />
        <ExampleSection g={g} idp={idp} provider={provider} />
        <SpreadSection g={g} idp={idp} />
        <MethodSection
          g={g}
          idp={idp}
          provider={provider}
          contact={contact}
          onOpenPackages={many ? onOpenPackages : undefined}
        />
      </div>
      {count > 0 && (
        <div className={styles.foot}>
          {many && (
            <Button size="small" onClick={onOpenPackages}>
              See all {plural(g.packages, 'package')}
            </Button>
          )}
          <Link variant="accent" size="small" bold onClick={onDownload}>
            Download packages (.csv)
          </Link>
        </div>
      )}
    </>
  )
}
