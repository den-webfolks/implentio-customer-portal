/** Every helper explains itself the same way, in the same popover
 *  (plan 02, user feedback 2026-09-30): the word; what it is in general (the
 *  same sentence everywhere); what it is in the customer's case — for this
 *  package, or across a finding's packages — with the same picture and why;
 *  and what the invoice calls it. One `Explanation`, one `ExplanationView`.
 *  A fact we can't derive is never offered for explaining (see ExampleSection).
 *  Diagrams follow the plan's drawings. */
import type { ReactNode } from 'react'
import { Popover } from '@/ui/Popover/Popover'
import { plural } from '@/domain/plural'
import type { FindingGroup, PackageRecord } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { CHARGE_COPY, glossary, type GlossaryTerm } from '@/domain/finding-copy'
import {
  BAND_LABEL,
  FIELD_KEY,
  SPEED_LABEL,
  chargeName,
  chargeTerm,
  findingTotals,
  fuelReason,
  fuelShare,
  type ChargeField,
  type PackageFacts,
  type Speed,
} from '@/domain/evidence'
import { ChargeTable } from './ChargeTable'
import styles from './Evidence.module.css'

/** "NEXT DAY AIR" → "Next Day Air". */
const titleCaseWords = (v: string) =>
  v
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export type FactKey = 'weight' | 'speed' | 'destination' | 'distance'

// ---------- the one explanation ------------------------------------------------

export interface Explanation {
  /** The word being explained. */
  title: string
  /** What it is, for anyone — the same wherever the word appears. */
  general: ReactNode
  /** Whose case the rest is about: "On this package", "Across these 172 packages". */
  caseLabel?: string
  /** The picture for this case (same kind for the same word everywhere). */
  art?: ReactNode
  /** Why it's like that in this case, with its own numbers. */
  caseText?: ReactNode
  /** What the invoice calls it. */
  invoice?: string
}

/** The explanation itself, inside the popover (which shows the title in its header). */
export function ExplanationView({ e }: { e: Explanation }) {
  return (
    <div className={styles.xp}>
      <p>{e.general}</p>
      {(e.art || e.caseText) && (
        <div className={styles.xpCase}>
          {e.caseLabel && <span className={styles.eyebrow}>{e.caseLabel}</span>}
          {e.art && <div className={styles.popArt}>{e.art}</div>}
          {e.caseText && <p>{e.caseText}</p>}
        </div>
      )}
      {e.invoice && (
        <p className={styles.onInvoice}>
          On your invoice: <strong>{e.invoice}</strong>
        </p>
      )}
    </div>
  )
}

// ---------- diagrams ---------------------------------------------------------

type TextTone = 'plain' | 'tb' | 'tm' | 'tg'

const T = ({
  x,
  y,
  c = 'plain',
  anchor,
  children,
}: {
  x: number
  y: number
  c?: TextTone
  anchor?: 'middle' | 'end'
  children: ReactNode
}) => (
  <text className={c === 'plain' ? undefined : styles[c]} x={x} y={y} textAnchor={anchor}>
    {children}
  </text>
)

/** One segment of a bar: context (the shipping price under a fuel charge),
 *  the charge under your contract, or the charge as billed. */
export interface Seg {
  v: number
  kind: 'ctx' | 'contract' | 'over' | 'under' | 'same'
}

export interface CompareRow {
  label: string
  segs: Seg[]
  /** The charge's amount, at the end of the bar. */
  value: number
  /** Under the bar: how that amount comes about ("25.5% of $20.55"). */
  note?: string
}

const SEG_CLASS: Record<Seg['kind'], string | undefined> = {
  ctx: styles.mut,
  contract: styles.soft,
  over: styles.hl,
  under: styles.gd,
  same: styles.soft,
}

/** The explanation picture for every charge: your contract above what was
 *  billed, on one scale, the charge's amount at the end of each bar. */
export function CompareDiagram({ rows, label }: { rows: CompareRow[]; label: string }) {
  const x0 = 84
  const W = 150
  const max = Math.max(0.01, ...rows.map((r) => r.segs.reduce((t, s) => t + s.v, 0)))
  const w = (v: number) => (v / max) * W
  // A row is taller only when it carries a note under its bar.
  const heights = rows.map((r) => (r.note ? 44 : 30))
  const tops = heights.map((_, i) => 4 + heights.slice(0, i).reduce((t, h) => t + h, 0))
  const height = 4 + heights.reduce((t, h) => t + h, 0)
  return (
    <svg viewBox={`0 0 300 ${height}`} role="img" aria-label={label}>
      {rows.map((r, i) => {
        const y = tops[i] ?? 4
        let x = x0
        const total = r.segs.reduce((t, s) => t + s.v, 0)
        const own = r.segs[r.segs.length - 1]?.kind ?? 'contract'
        // The amount: neutral for your contract; orange above it, green below.
        const tone = own === 'over' ? 'tm' : own === 'under' ? 'tg' : 'tb'
        return (
          <g key={r.label}>
            <T x={6} y={y + 14} c="tb">
              {r.label}
            </T>
            {total < 0.005 ? (
              // Nothing charged: an empty outline, so $0.00 reads as "none", not "missing".
              <rect className={styles.zero} x={x0} y={y} width={10} height={20} rx={3} />
            ) : (
              r.segs.map((s, k) => {
                const sw = Math.max(w(s.v), s.v > 0 ? 3 : 0)
                const rect = (
                  <rect
                    key={k}
                    className={SEG_CLASS[s.kind]}
                    x={x}
                    y={y}
                    width={sw}
                    height={20}
                    rx={3}
                  />
                )
                x += sw + (sw ? 2 : 0)
                return rect
              })
            )}
            <T x={294} y={y + 14} c={tone} anchor="end">
              {fmtMoney(r.value)}
            </T>
            {r.note && (
              <T x={x0} y={y + 34}>
                {r.note}
              </T>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** The billed row's colour: above contract orange, below green. */
export const billedKind = (billed: number, contract: number): Seg['kind'] =>
  billed - contract >= 0.005 ? 'over' : contract - billed >= 0.005 ? 'under' : 'same'

function AddressDiagram({ home }: { home: boolean }) {
  return (
    <svg
      viewBox="0 0 300 70"
      role="img"
      aria-label={home ? 'Delivered to a home.' : 'Delivered to a business.'}
    >
      {home ? (
        <>
          <polygon className={styles.brf} points="8,34 38,10 68,34" />
          <rect className={styles.box} x={16} y={34} width={44} height={30} />
          <rect className={styles.mut} x={33} y={48} width={10} height={16} />
        </>
      ) : (
        <>
          <rect className={styles.box} x={16} y={6} width={44} height={58} />
          {[12, 26, 40].flatMap((y) =>
            [22, 34, 46].map((x) => (
              <rect key={`${x}-${y}`} className={styles.mut} x={x} y={y} width={8} height={8} />
            )),
          )}
          <rect className={styles.mut} x={33} y={54} width={10} height={10} />
        </>
      )}
      <T x={84} y={30} c="tb">
        {home ? 'Delivered to a home' : 'Delivered to a business'}
      </T>
      <T x={84} y={48} c={home ? 'tg' : 'plain'}>
        {home ? 'A home-delivery fee can apply' : 'No home-delivery fee applies'}
      </T>
    </svg>
  )
}

function ZoneDiagram({ distance, printed }: { distance: number; printed: string }) {
  return (
    <svg
      viewBox="0 0 300 84"
      role="img"
      aria-label={`Zones run from 2, near the warehouse, to 8, across the country. This package is zone ${printed}: distance ${distance}.`}
    >
      {[2, 3, 4, 5, 6, 7, 8].map((n, i) => {
        const x = 20 + i * 40
        const h = 8 + i * 6
        return (
          <g key={n}>
            <rect
              className={n === distance ? styles.br : styles.mut}
              x={x}
              y={52 - h}
              width={18}
              height={h}
              rx={2}
            />
            <T x={x + 9} y={66} c={n === distance ? 'tb' : 'plain'} anchor="middle">
              {n}
            </T>
          </g>
        )
      })}
      <path className={styles.ln} d="M10 52 H290" />
      <T x={20} y={80}>
        near the warehouse
      </T>
      <T x={290} y={80} anchor="end">
        across the country
      </T>
    </svg>
  )
}

const SPEED_ROWS: [Speed, string, number, string][] = [
  ['ground', 'Ground', 5, '$'],
  ['two-day', '2nd Day Air', 2, '$$'],
  ['next-day', 'Next Day Air', 1, '$$$'],
]

function SpeedDiagram({ speed }: { speed: Speed }) {
  return (
    <svg
      viewBox="0 0 300 80"
      role="img"
      aria-label={`Ground takes up to 5 days and costs least; Next Day Air takes 1 day and costs most. This package went ${SPEED_LABEL[speed].toLowerCase()}.`}
    >
      {SPEED_ROWS.map(([k, label, days, cost], i) => {
        const y = 4 + i * 26
        return (
          <g key={k} className={k === speed ? undefined : styles.dim}>
            <T x={6} y={y + 13} c="tb">
              {label}
            </T>
            {[0, 1, 2, 3, 4].map((j) => (
              <rect
                key={j}
                className={j < days ? styles.br : styles.mut}
                x={96 + j * 18}
                y={y + 2}
                width={14}
                height={14}
                rx={2}
              />
            ))}
            <T x={194} y={y + 13}>
              {days === 1 ? '1 day' : `up to ${days} days`}
            </T>
            <T x={292} y={y + 13} c="tm" anchor="end">
              {cost}
            </T>
          </g>
        )
      })}
    </svg>
  )
}

// ---------- charges ------------------------------------------------------------

/** "It was billed $41.10 — $20.55 more (about 2× your contract)." */
export function billedLine(billed: number, contract: number, many = false): ReactNode {
  const diff = r2(billed - contract)
  const said = ` It was billed ${fmtMoney(billed)}`
  if (Math.abs(diff) < 0.005) return `${said} — the same as your contract.`
  if (diff > 0) {
    const times = contract > 0 ? billed / contract : 0
    return `${said} — ${fmtMoney(diff)} more${times >= 1.8 ? `, about ${Math.round(times * 10) / 10}× your contract` : ''}.`
  }
  // Below-contract parts are described per package, never as a separate amount (note 3).
  return (
    <>
      {`${said} — ${fmtMoney(-diff)} less. `}
      <span className={styles.fav}>Billed below your contract</span>: this makes{' '}
      {many ? 'those packages’ differences' : 'the package’s difference'} smaller; it isn’t a
      separate credit.
    </>
  )
}

/** Whose numbers a charge explanation is about. */
export type ChargeScope =
  | { kind: 'package'; pkg: PackageRecord; facts: PackageFacts }
  | { kind: 'finding'; g: Pick<FindingGroup, 'services' | 'packages'> }

/** A charge (or two, for "Base freight + fuel"): what it is in general, then
 *  your contract against what was billed for this package or across the
 *  finding's packages — the same picture and the same reasoning either way. */
export function chargeExplanation(fields: ChargeField[], scope: ChargeScope): Explanation {
  const p = scope.kind === 'package' ? scope.pkg : findingTotals(scope.g)
  const f = scope.kind === 'package' ? scope.facts : null
  const many = scope.kind === 'finding'
  const caseLabel = many ? `Across these ${plural(scope.g.packages, 'package')}` : 'On this package'
  const title = fields.map(chargeName).join(' and ')
  const general =
    fields.length === 1 ? (
      capital(CHARGE_COPY[FIELD_KEY[fields[0] as ChargeField]].meaning)
    ) : (
      <>
        {fields.map((k, i) => (
          <span key={k}>
            {i > 0 && ' '}
            <strong>{chargeName(k)}:</strong> {CHARGE_COPY[FIELD_KEY[k]].meaning}
          </span>
        ))}
      </>
    )
  const invoice = fields.map(chargeTerm).join(' and ')
  const billed = r2(fields.reduce((t, k) => t + p[k][0], 0))
  const contract = r2(fields.reduce((t, k) => t + p[k][1], 0))
  const kind = billedKind(billed, contract)
  const bars = (notes?: { contract?: string; billed?: string }) => (
    <CompareDiagram
      label={`${title}: your contract ${fmtMoney(contract)}, billed ${fmtMoney(billed)}.`}
      rows={[
        {
          label: 'Your contract',
          segs: [{ v: contract, kind: 'contract' }],
          value: contract,
          note: notes?.contract,
        },
        { label: 'Billed', segs: [{ v: billed, kind }], value: billed, note: notes?.billed },
      ]}
    />
  )
  const contractSays = many ? `Your contract comes to ${fmtMoney(contract)}.` : ''
  const only = fields.length === 1 ? fields[0] : null

  // Fuel sits on top of the shipping price: show both, and say which moved.
  if (only === 'f') {
    const share = fuelShare(p)
    if (share.billed != null && share.contract != null)
      return {
        title,
        general,
        caseLabel,
        invoice,
        art: (
          <CompareDiagram
            label={`Fuel is a percentage of the shipping price. Your contract: ${share.contract}% of ${fmtMoney(p.b[1])} = ${fmtMoney(contract)}. Billed: ${share.billed}% of ${fmtMoney(p.b[0])} = ${fmtMoney(billed)}.`}
            rows={[
              {
                label: 'Your contract',
                segs: [
                  { v: p.b[1], kind: 'ctx' },
                  { v: contract, kind: 'contract' },
                ],
                value: contract,
                note: `fuel = ${share.contract}% of ${fmtMoney(p.b[1])} shipping`,
              },
              {
                label: 'Billed',
                segs: [
                  { v: p.b[0], kind: 'ctx' },
                  { v: billed, kind },
                ],
                value: billed,
                note: `fuel = ${share.billed}% of ${fmtMoney(p.b[0])} shipping`,
              },
            ]}
          />
        ),
        caseText: (
          <>
            Your contract works out to {share.contract}% of the correct shipping price,{' '}
            {fmtMoney(contract)}. It was billed at {share.billed}% of {fmtMoney(p.b[0])},{' '}
            {fmtMoney(billed)}. {fuelReason(p)}
            {kind === 'under' && (
              <>
                {' '}
                <span className={styles.fav}>Billed below your contract</span>: this makes{' '}
                {many ? 'those packages’ differences' : 'the package’s difference'} smaller; it
                isn’t a separate credit.
              </>
            )}
          </>
        ),
      }
  }

  // The shipping price for one package: what the price list is looked up by.
  if (only === 'b' && f) {
    const inputs = [
      f.speed ? SPEED_LABEL[f.speed] : f.service ? titleCaseWords(f.service) : null,
      f.zone ? `zone ${f.zone}` : null,
      f.weightLb != null ? `${f.weightLb} lb` : null,
    ].filter(Boolean)
    return {
      title,
      general,
      caseLabel,
      invoice,
      art: bars({ contract: inputs.length ? `price list · ${inputs.join(' · ')}` : 'price list' }),
      caseText: (
        <>
          Your price list gives {fmtMoney(contract)} for this package
          {inputs.length ? ` (${inputs.join(', ')})` : ''}.{billedLine(billed, contract)}
        </>
      ),
    }
  }

  // The home-delivery fee for one package: home or business decides it.
  if (only === 'r' && f) {
    const why =
      f.destination === 'home' && contract > 0
        ? `This package went to a home, so your contract includes ${fmtMoney(contract)} for it.`
        : f.destination === 'business' && contract === 0
          ? 'This package went to a business, so your contract has no home-delivery fee for it.'
          : contract > 0
            ? `Your contract has ${fmtMoney(contract)} for this package.`
            : 'Your contract has no home-delivery fee for this package.'
    return {
      title,
      general,
      caseLabel,
      invoice,
      art: bars(),
      caseText: (
        <>
          {why}
          {billedLine(billed, contract)}
        </>
      ),
    }
  }

  const has = many
    ? contractSays
    : contract > 0
      ? `Your contract has ${fmtMoney(contract)} for this package.`
      : only === 'd'
        ? 'Your contract has no remote-area fee for this package.'
        : only === 'o'
          ? 'Your contract has no other charges for this package.'
          : `Your contract has ${fmtMoney(contract)} for this package.`
  return {
    title,
    general,
    caseLabel,
    invoice,
    art: bars(),
    caseText: (
      <>
        {has}
        {billedLine(billed, contract, many)}
      </>
    ),
  }
}

// ---------- package details --------------------------------------------------

/** Which facts on a package can explain themselves (the rest stay plain text). */
export function explainableFacts(f: PackageFacts): Set<FactKey> {
  const out = new Set<FactKey>()
  if (f.weightLb != null) out.add('weight')
  if (f.speed) out.add('speed')
  if (f.destination) out.add('destination')
  if (f.distance != null) out.add('distance')
  return out
}

const FACT_TERM: Record<FactKey, GlossaryTerm> = {
  weight: 'billedWeight',
  speed: 'serviceLevel',
  destination: 'destination',
  distance: 'zone',
}

/** A package detail: the glossary's general sentence, then this package. */
export function factExplanation(fact: FactKey, f: PackageFacts, biller: string): Explanation {
  const gl = glossary(FACT_TERM[fact], biller)
  const base = { title: gl.title, general: gl.text, caseLabel: 'On this package' }
  if (fact === 'weight') return { ...base, caseText: `It was charged as ${f.weightLb} lb.` }
  if (fact === 'speed' && f.speed)
    return {
      ...base,
      art: <SpeedDiagram speed={f.speed} />,
      caseText: `It went ${SPEED_LABEL[f.speed].toLowerCase()}${f.destination ? `, to a ${f.destination}` : ''}.`,
      invoice: f.service,
    }
  if (fact === 'destination' && f.destination)
    return {
      ...base,
      art: <AddressDiagram home={f.destination === 'home'} />,
      caseText:
        f.destination === 'home'
          ? 'It went to a home, so a home-delivery fee can apply.'
          : 'It went to a business, so no home-delivery fee applies.',
      invoice: f.service,
    }
  if (fact === 'distance' && f.distance != null && f.band) {
    const printed = f.billedZone ?? f.zone
    return {
      ...base,
      art: <ZoneDiagram distance={f.distance} printed={f.zone} />,
      caseText: (
        <>
          {f.billedZone
            ? `On the invoice it’s zone ${f.billedZone}, but your contract prices it as zone ${f.zone}: distance ${f.distance}, ${BAND_LABEL[f.band].toLowerCase()}`
            : `It’s zone ${f.zone} on the invoice: distance ${f.distance}, ${BAND_LABEL[f.band].toLowerCase()}`}
          {f.band === 'far' ? ', so it costs more' : ''}.
          {printed.length === 3 &&
            f.carrier === 'UPS' &&
            ' UPS puts the speed in front (1xx next-day, 2xx two-day, 0xx Ground); the last digit is the distance.'}
        </>
      ),
      invoice: `Zone ${printed}`,
    }
  }
  return base
}

/** A package's charges, each one explaining itself in the same popover as
 *  every other helper. "Show why" and the package list's row detail use it. */
export function ExplainedChargeTable({
  pkg: p,
  facts: f,
}: {
  pkg: PackageRecord
  facts: PackageFacts
}) {
  return (
    <ChargeTable
      pkg={p}
      caption={`Charges on package ${p.t}`}
      name={(c) => (
        <ExplainTerm
          label={c.name}
          e={chargeExplanation([c.field], { kind: 'package', pkg: p, facts: f })}
        />
      )}
    />
  )
}

// ---------- the popover every helper opens ----------------------------------------------

/** A word that explains itself in a popover — the one design for every
 *  helper: a dotted underline, and a "?" in tables and on complex labels. */
export function ExplainTerm({
  label,
  e,
  mark = true,
}: {
  label: string
  e: Explanation
  /** The "?" after the word: in tables and on complex labels, not on the card. */
  mark?: boolean
}) {
  return (
    <Popover title={e.title} content={<ExplanationView e={e} />}>
      <button
        type="button"
        className={mark ? styles.term : `${styles.term} ${styles.bare ?? ''}`}
        aria-label={`${label}, what is this?`}
      >
        {label}
      </button>
    </Popover>
  )
}

/** A glossary word; `caseText` adds what it means here, when there's a case. */
export function GlossaryWord({
  term,
  biller,
  label,
  mark,
  caseLabel,
  caseText,
}: {
  term: GlossaryTerm
  biller: string
  label?: string
  mark?: boolean
  caseLabel?: string
  caseText?: ReactNode
}) {
  const gl = glossary(term, biller)
  return (
    <ExplainTerm
      label={label ?? gl.title}
      mark={mark}
      e={{ title: gl.title, general: gl.text, caseLabel, caseText }}
    />
  )
}

/** A charge across a finding's packages (the card's charge type, the breakdown). */
export function ChargeOverview({
  g,
  fields,
  label,
  mark,
}: {
  g: Pick<FindingGroup, 'services' | 'packages'>
  fields: ChargeField[]
  label: string
  mark?: boolean
}) {
  return (
    <ExplainTerm label={label} mark={mark} e={chargeExplanation(fields, { kind: 'finding', g })} />
  )
}
