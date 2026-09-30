/**
 * "Show me why" — the evidence behind a finding, derived from its packages
 * (prototype-planning/02-findings-evidence.html). Pure functions: what makes
 * up the overcharge, how it spreads across packages, which package to show
 * as the example, and what each package fact means.
 *
 * Rules from the plan: billed − contract = difference, always in that order;
 * say what was different, never guess why; never total what was billed below
 * contract (product note 3); a fact we can't derive stays plain text.
 */
import type { ChargeKey, FindingGroup, PackageRecord } from './types'
import { CHARGE_COPY } from './finding-copy'
import { fmtMoney, r2 } from './money'

const EPS = 0.005

/** Package charge fields, in the order the charge tables list them. */
export const CHARGE_FIELDS = ['b', 'f', 'r', 'd', 'o'] as const
export type ChargeField = (typeof CHARGE_FIELDS)[number]

export const FIELD_KEY: Record<ChargeField, ChargeKey> = {
  b: 'base',
  f: 'fuel',
  r: 'res',
  d: 'das',
  o: 'other',
}

/** Everyday charge name, e.g. "Shipping price". */
export const chargeName = (field: ChargeField) => CHARGE_COPY[FIELD_KEY[field]].name
/** What the invoice calls it, e.g. "Base freight". */
export const chargeTerm = (field: ChargeField) => CHARGE_COPY[FIELD_KEY[field]].term

export const allPackages = (g: Pick<FindingGroup, 'services'>): PackageRecord[] =>
  g.services.flatMap((s) => s.pkgs)

/** "2¢" under a dollar, "$1.56" from a dollar up. */
export function shortMoney(n: number): string {
  const a = Math.abs(n)
  return a > 0 && a < 1 ? `${Math.round(a * 100)}¢` : fmtMoney(a)
}

// ---------- what makes up the overcharge ------------------------------------

export interface BreakdownEntry {
  field: ChargeField
  name: string
  /** Billed − contract for this charge across the finding's packages. */
  amount: number
}

export interface Breakdown {
  /** Charges billed above contract, largest first. */
  over: BreakdownEntry[]
  /** Charges billed below contract, largest first (shown one by one, never totalled). */
  under: BreakdownEntry[]
}

export function chargeBreakdown(g: Pick<FindingGroup, 'chargeMix'>): Breakdown {
  const entries = CHARGE_FIELDS.map((field) => ({
    field,
    name: chargeName(field),
    amount: r2(g.chargeMix[field] ?? 0),
  })).filter((e) => Math.abs(e.amount) >= EPS)
  return {
    over: entries.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount),
    under: entries.filter((e) => e.amount < 0).sort((a, b) => a.amount - b.amount),
  }
}

const the = (e: BreakdownEntry) => `the ${e.name.toLowerCase()}`
/** Same, with the charge name marked **bold** (see `richText`). */
const theB = (e: BreakdownEntry) => `the **${e.name.toLowerCase()}**`
const joinAnd = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

/** The charges that carry most of what was billed above contract (up to two). */
export function mainCharges(b: Breakdown): BreakdownEntry[] {
  const adds = b.over.reduce((s, e) => s + e.amount, 0)
  const main: BreakdownEntry[] = []
  let covered = 0
  for (const e of b.over) {
    if (main.length === 2 || covered >= adds * 0.75) break
    main.push(e)
    covered += e.amount
  }
  return main
}

/** The finding's own charge, when it names exactly one. */
function ownField(chargeKey: string): ChargeField | null {
  const f = (Object.keys(FIELD_KEY) as ChargeField[]).find((k) => FIELD_KEY[k] === chargeKey)
  return f && f !== 'o' ? f : null
}

/** One plain reading of the breakdown, charge names in **bold**, e.g.
 *  "Almost all of it is the **shipping price** (97%)." The share is of the
 *  overcharge itself, so it's only given while it can't pass 100%. */
export function breakdownTake(g: Pick<FindingGroup, 'chargeMix' | 'chargeKey'>): string {
  const b = chargeBreakdown(g)
  const [first, second, third] = b.over
  if (!first) return ''
  const adds = b.over.reduce((s, e) => s + e.amount, 0)
  const net = adds + b.under.reduce((s, e) => s + e.amount, 0)
  const share = net > 0 ? first.amount / net : 0
  let take: string
  if (b.over.length === 1 && b.under.length === 0) take = `All of it is ${theB(first)}.`
  else if (
    second &&
    first.amount - second.amount <= first.amount * 0.1 &&
    (!third || third.amount < adds * 0.1)
  )
    take = `It’s split evenly between ${theB(first)} and ${theB(second)}.`
  else if (share >= 0.9 && share <= 1)
    take = `Almost all of it is ${theB(first)} (${Math.round(share * 100)}%).`
  else take = `Most of it is ${joinAnd(mainCharges(b).map(theB))}.`
  const own = ownField(g.chargeKey)
  const ownUnder = own ? b.under.find((e) => e.field === own) : undefined
  return ownUnder
    ? `${take} The ${ownUnder.name.toLowerCase()}s were billed below your contract.`
    : take
}

/** Splits "a **b** c" into plain and bold runs for rendering. */
export function richText(text: string): { text: string; bold: boolean }[] {
  return text
    .split('**')
    .map((t, i) => ({ text: t, bold: i % 2 === 1 }))
    .filter((r) => r.text)
}

/** When the finding's name isn't where the money came from, say so on the
 *  card before anyone ticks it (product note 136). Implentio decides that
 *  (`driverConfirmed`); the app only words it from the breakdown. */
export function mismatchNote(
  g: Pick<FindingGroup, 'chargeMix' | 'chargeKey' | 'driverConfirmed'>,
): string | null {
  const own = ownField(g.chargeKey)
  if (!own || g.driverConfirmed !== false) return null
  const main = mainCharges(chargeBreakdown(g)).filter((e) => e.field !== own)
  if (main.length === 0) return null
  return `Grouped under ${chargeName(own).toLowerCase()}s, but most of the difference came from ${joinAnd(main.map(the))}.`
}

/** The other finding on the memo whose own charge carries a real share of
 *  this breakdown — named so "$1,322.77 of fuel" doesn't read as counted
 *  twice. At most one, and only for a charge adding at least 10%. */
export function relatedFinding<G extends Pick<FindingGroup, 'id' | 'chargeKey' | 'chargeMix'>>(
  g: G,
  all: readonly G[],
): G | null {
  const b = chargeBreakdown(g)
  const adds = b.over.reduce((s, e) => s + e.amount, 0)
  for (const e of b.over) {
    if (e.amount < adds * 0.1) break
    const key = FIELD_KEY[e.field]
    if (key === g.chargeKey || (g.chargeKey === 'multi' && (key === 'base' || key === 'fuel')))
      continue
    const other = all.find((x) => x.id !== g.id && x.chargeKey === key)
    if (other) return other
  }
  return null
}

// ---------- overcharge per package -----------------------------------------

/** Nearest-rank quantile of an ascending list. */
function quantile(sorted: readonly number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] ?? 0
}

export interface SpreadSummary {
  /** Who the main figure is about: "Half the packages", "10 of 13 packages", "All 3 packages". */
  who: string
  /** The main figure: "$15–$20 over", "about $1.09 over", "10¢ over or less". */
  value: string
  /** The largest difference, when packages differ ("$106.11"). */
  largest: string | null
}

/** How the overcharge spreads across packages, as parts for a highlight
 *  box: who, how much over, and the largest. Null for one package. */
export function spreadSummary(diffs: readonly number[]): SpreadSummary | null {
  const n = diffs.length
  if (n < 2) return null
  const s = [...diffs].sort((a, b) => a - b)
  const min = s[0] ?? 0
  const max = s[n - 1] ?? 0
  if (max - min < EPS)
    return {
      who: n === 2 ? 'Both packages' : `All ${n} packages`,
      value: `${shortMoney(max)} over`,
      largest: null,
    }
  const largest = shortMoney(max)
  const median = quantile(s, 0.5)
  const near = s.filter((v) => Math.abs(v - median) <= Math.max(median * 0.15, 0.01)).length
  if (near >= n * 0.6)
    return { who: `${near} of ${n} packages`, value: `about ${shortMoney(median)} over`, largest }
  const p25 = quantile(s, 0.25)
  const p75 = quantile(s, 0.75)
  if (p75 < 1)
    return { who: 'Half the packages', value: `${shortMoney(median)} over or less`, largest }
  // Whole dollars only where cents would be noise.
  const lo = Math.round(p25)
  const hi = Math.round(p75)
  const range = p25 >= 10 && lo !== hi ? `$${lo}–$${hi}` : `${fmtMoney(p25)}–${fmtMoney(p75)}`
  return { who: 'Half the packages', value: `${range} over`, largest }
}

/** The same as one sentence, the main figure in **bold**, e.g.
 *  "Half the packages were **$15–$20 over**. The largest was $106.11." */
export function spreadSentence(diffs: readonly number[]): string | null {
  const t = spreadSummary(diffs)
  if (!t) return null
  return `${t.who} were **${t.value}**.${t.largest ? ` The largest was ${t.largest}.` : ''}`
}

const niceStep = (raw: number) => {
  const p = 10 ** Math.floor(Math.log10(raw))
  const n = raw / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

export interface SpreadBucket {
  /** "$5–$10", "Up to 10¢", "$30 or more". */
  label: string
  /** Short axis label: "<$5", "$5–10", "$30+". */
  axis: string
  count: number
  /** Share of packages, 0–1. */
  share: number
}

/** Seven buckets: six equal steps up to ~1.2× the 90th percentile, then the long tail. */
export function spreadBuckets(diffs: readonly number[]): SpreadBucket[] {
  const s = [...diffs].sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return []
  const w = niceStep(Math.max(quantile(s, 0.9) * 1.2, 0.01) / 6)
  // Cents only below a dollar: "10–20¢", then "$1.5–2", "$2.5+".
  const amt = (v: number) => (v < 1 - 1e-9 ? `${Math.round(v * 100)}¢` : `$${+v.toFixed(2)}`)
  const bare = (v: number) => `${+v.toFixed(2)}`
  const range = (lo: number, hi: number) =>
    hi < 1 - 1e-9
      ? `${Math.round(lo * 100)}–${Math.round(hi * 100)}¢`
      : lo < 1 - 1e-9
        ? `${Math.round(lo * 100)}¢–$${bare(hi)}`
        : `$${bare(lo)}–${bare(hi)}`
  const counts = new Array<number>(7).fill(0)
  for (const v of s) {
    const i = Math.min(6, Math.floor(v / w + 1e-9))
    counts[i] = (counts[i] ?? 0) + 1
  }
  return counts.map((count, i) => ({
    axis: i === 0 ? `<${amt(w)}` : i < 6 ? range(i * w, (i + 1) * w) : `${amt(6 * w)}+`,
    label:
      i === 0
        ? `Up to ${amt(w)}`
        : i < 6
          ? `${amt(i * w)}–${amt((i + 1) * w)}`
          : `${amt(6 * w)} or more`,
    count,
    share: count / n,
  }))
}

/** How many buckets, from the right, hold the top 10% of packages. 0 when
 *  that takes more than three buckets, or when those buckets hold far more
 *  than 10% (a big bucket at the end isn't a long tail). */
export function topTenBuckets(buckets: readonly SpreadBucket[]): number {
  const n = buckets.reduce((s, b) => s + b.count, 0)
  let k = 0
  let acc = 0
  while (k < 6 && acc < n * 0.1) {
    acc += buckets[buckets.length - 1 - k]?.count ?? 0
    k++
  }
  return k <= 3 && acc <= n * 0.2 ? k : 0
}

// ---------- the example package ---------------------------------------------

export interface ExamplePackages {
  /** The package nearest the median difference: what most packages look like. */
  typical: PackageRecord
  /** The largest difference; null when it's the same package or the same amount. */
  largest: PackageRecord | null
}

export function examplePackages(
  g: Pick<FindingGroup, 'services' | 'chargeKey'>,
): ExamplePackages | null {
  const pkgs = allPackages(g)
  if (pkgs.length === 0) return null
  // Prefer packages whose own charge was billed above contract, so the example
  // never contradicts the title (plan 02, Q-E8: a few packages sit elsewhere).
  const own = ownField(g.chargeKey)
  const fitting = own ? pkgs.filter((p) => p[own][0] - p[own][1] >= EPS) : []
  const pool = (fitting.length > 0 ? fitting : pkgs).sort(
    (a, b) => a.tv - b.tv || a.t.localeCompare(b.t),
  )
  // Lower median: with two packages, the typical one is the smaller.
  const median = pool[Math.floor((pool.length - 1) / 2)]?.tv ?? 0
  const typical = [...pool].sort(
    (a, b) =>
      Math.abs(a.tv - median) - Math.abs(b.tv - median) || a.tv - b.tv || a.t.localeCompare(b.t),
  )[0] as PackageRecord
  const largest = [...pkgs].sort((a, b) => b.tv - a.tv)[0] as PackageRecord
  return { typical, largest: largest.tv - typical.tv >= EPS ? largest : null }
}

export interface ChargeRow {
  field: ChargeField
  name: string
  billed: number
  contract: number
  /** Billed − contract. */
  diff: number
}

/** A package's charges that were billed or expected at all. */
export function packageCharges(p: PackageRecord): ChargeRow[] {
  return CHARGE_FIELDS.filter((f) => p[f][0] !== 0 || p[f][1] !== 0).map((field) => ({
    field,
    name: chargeName(field),
    billed: p[field][0],
    contract: p[field][1],
    diff: r2(p[field][0] - p[field][1]),
  }))
}

/** The charges that differ on one package, e.g. for the package list. */
export const differingCharges = (p: PackageRecord) =>
  packageCharges(p).filter((c) => Math.abs(c.diff) >= EPS)

// ---------- package facts (explain in place) ---------------------------------

export type Speed = 'ground' | 'two-day' | 'next-day'
export type Destination = 'home' | 'business'
export type DistanceBand = 'near' | 'medium' | 'far'

export interface PackageFacts {
  carrier: string
  /** Billed weight in pounds (the data stores ounces). */
  weightLb: number | null
  /** Speed read from the service name; null when we can't tell (e.g. OSM "PREMIUM"). */
  speed: Speed | null
  /** The service exactly as printed on the invoice. */
  service: string
  destination: Destination | null
  /** The zone your contract price uses, as printed, e.g. "107". */
  zone: string
  /** The zone the Biller used, when it differs from `zone`. */
  billedZone: string | null
  /** Distance step 2–8, or null when the zone can't be read. */
  distance: number | null
  band: DistanceBand | null
  zip: string | null
}

export const SPEED_LABEL: Record<Speed, string> = {
  ground: 'Ground',
  'two-day': 'Two-day',
  'next-day': 'Next-day',
}
export const BAND_LABEL: Record<DistanceBand, string> = {
  near: 'Near',
  medium: 'Medium',
  far: 'Far',
}

export function packageFacts(p: PackageRecord): PackageFacts {
  const sv = (p.sv ?? '').toUpperCase()
  const speed: Speed | null = /NEXT DAY/.test(sv)
    ? 'next-day'
    : /2ND DAY/.test(sv)
      ? 'two-day'
      : /GROUND/.test(sv)
        ? 'ground'
        : null
  const destination: Destination | null = /RESIDENTIAL/.test(sv)
    ? 'home'
    : /COMMERCIAL/.test(sv)
      ? 'business'
      : null
  const zone = String(p.ez || p.az || '').trim()
  const billed = String(p.az || '').trim()
  // UPS prints the speed in front (107 = next-day, zone 7); the last digit is the distance.
  const digits = /^\d{3}$/.test(zone) ? zone.slice(-1) : /^\d{1,2}$/.test(zone) ? zone : ''
  const d = digits ? Number(digits) : NaN
  const distance = d >= 2 && d <= 8 ? d : null
  return {
    carrier: p.car,
    weightLb: p.wt ? Math.round((p.wt / 16) * 10) / 10 : null,
    speed,
    service: p.sv,
    destination,
    zone,
    billedZone: billed && billed !== zone ? billed : null,
    distance,
    band: distance == null ? null : distance <= 3 ? 'near' : distance <= 5 ? 'medium' : 'far',
    zip: p.zip,
  }
}

/** Fuel as a share of the shipping price on one package, billed and under
 *  your contract — worked out from this package's own numbers. */
export function fuelShare(p: PackageRecord): { contract: number | null; billed: number | null } {
  const pct = (fuel: number, base: number) =>
    base > 0 ? Math.round((fuel / base) * 1000) / 10 : null
  return { contract: pct(p.f[1], p.b[1]), billed: pct(p.f[0], p.b[0]) }
}

/** Why one package's fuel charge differs from your contract. Fuel is a
 *  percentage of the shipping price, so it can come out higher even at a
 *  lower percentage when the shipping price under it was overcharged — say
 *  which of the two moved, and which way. Null when there's no shipping price
 *  to work from. */
export function fuelReason(p: PackageRecord): string | null {
  const [bb, cb] = p.b
  const [bf, cf] = p.f
  const share = fuelShare(p)
  if (share.billed == null || share.contract == null) return null
  const diff = r2(bf - cf)
  if (Math.abs(diff) < EPS) return 'So the fuel charge matches your contract.'
  const up = diff > 0
  const amount = `${fmtMoney(Math.abs(diff))} ${up ? 'higher' : 'lower'}`
  const base = bb - cb >= EPS ? 1 : cb - bb >= EPS ? -1 : 0
  // Under half a point apart is rounding in the invoice's cents, not a different percentage.
  const rate =
    share.billed - share.contract >= 0.5 ? 1 : share.contract - share.billed >= 0.5 ? -1 : 0
  const sign = up ? 1 : -1
  const baseText = `${base > 0 ? (up ? 'the overcharged' : 'a higher') : 'a lower'} shipping price (${fmtMoney(bb)} instead of ${fmtMoney(cb)})`
  const rateText = `${rate > 0 ? 'higher' : 'lower'} (${share.billed}% instead of ${share.contract}%)`
  if (base === sign && rate === sign)
    return `It came out ${amount} because it was worked out on ${baseText} and at a percentage that was ${rateText}.`
  if (base === sign && rate === -sign)
    return `It came out ${amount} because it was worked out on ${baseText} — even though the percentage used was ${rateText}.`
  if (rate === sign && base === -sign)
    return `It came out ${amount} because the percentage used was ${rateText} — even though it was worked out on ${baseText}.`
  if (base === sign)
    return `It came out ${amount} because it was worked out on ${baseText}; the percentage was about the same (${share.contract}%).`
  if (rate === sign)
    return `The shipping price under it was right, but the percentage used was ${rateText}, so it came out ${amount}.`
  return `It came out ${amount}.`
}

/** One charge across all of a finding's packages: what was billed and what
 *  your contract says, summed package by package. */
export function chargeTotals(
  g: Pick<FindingGroup, 'services'>,
  field: ChargeField,
): { billed: number; contract: number; packages: number } {
  let billed = 0
  let contract = 0
  let packages = 0
  for (const p of allPackages(g)) {
    billed += p[field][0]
    contract += p[field][1]
    if (p[field][0] !== 0 || p[field][1] !== 0) packages++
  }
  return { billed: r2(billed), contract: r2(contract), packages }
}

/** A finding's packages summed into one package-shaped record, so a charge
 *  explains itself the same way for the whole finding as for one package
 *  (the same picture, the same fuel reasoning — "Across these 172 packages"). */
export function findingTotals(g: Pick<FindingGroup, 'services'>): PackageRecord {
  const sum = (f: ChargeField): [number, number] => {
    const t = chargeTotals(g, f)
    return [t.billed, t.contract]
  }
  const b = sum('b')
  const f = sum('f')
  const r = sum('r')
  const d = sum('d')
  const o = sum('o')
  const ti = r2(b[0] + f[0] + r[0] + d[0] + o[0])
  const te = r2(b[1] + f[1] + r[1] + d[1] + o[1])
  return {
    t: '',
    so: '',
    inv: '',
    mo: '',
    car: '',
    sv: '',
    wh: '',
    zip: null,
    ld: 0,
    az: '',
    ez: '',
    wt: 0,
    cu: 0,
    ti,
    te,
    tv: r2(ti - te),
    b,
    f,
    r,
    d,
    o,
  }
}
