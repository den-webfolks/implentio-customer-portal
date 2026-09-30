/**
 * MADE-UP findings for the "more examples" demo scenario. The real demo memo
 * has five findings; these four show the situations it can't
 * (prototype-planning/02, section 5a and "Tricky cases"):
 *  - one package (the plan's own made-up example, a business address),
 *  - "Other charges" (address corrections, extra handling),
 *  - a shipping price billed for a farther zone than the contract's,
 *  - a fuel percentage above the contract on a correct shipping price.
 * Deterministic, so screenshots stay stable. Never shown by default.
 */
import type { ChargeMixEntry, FindingGroup, FindingService, PackageRecord } from '@/domain/types'
import { r2 } from '@/domain/money'

type Pair = [number, number]

interface PkgInput {
  car: string
  sv: string
  /** Zone the Biller used, and the one your contract uses. */
  az: string
  ez: string
  wt: number
  b: Pair
  f?: Pair
  r?: Pair
  d?: Pair
  o?: Pair
}

/** Small seeded generator (mulberry32). */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const zero: Pair = [0, 0]

function pkg(i: number, prefix: string, inv: string, x: PkgInput): PackageRecord {
  const parts = { b: x.b, f: x.f ?? zero, r: x.r ?? zero, d: x.d ?? zero, o: x.o ?? zero }
  const ti = r2(Object.values(parts).reduce((t, p) => t + p[0], 0))
  const te = r2(Object.values(parts).reduce((t, p) => t + p[1], 0))
  return {
    t: `${prefix}${String(410000 + i * 37).padStart(8, '0')}`,
    so: String(72900000 + i * 13),
    inv,
    mo: 'June',
    car: x.car,
    sv: x.sv,
    wh: 'Denver',
    zip: String(80000 + ((i * 97) % 9000)),
    ld: 46170 + (i % 20),
    az: x.az,
    ez: x.ez,
    wt: x.wt,
    cu: 0,
    ti,
    te,
    tv: r2(ti - te),
    ...parts,
  }
}

const titleCase = (v: string) =>
  v
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const FIELD_LABEL = {
  b: 'base freight',
  f: 'fuel',
  r: 'residential surcharge',
  d: 'delivery area surcharge',
  o: 'other charges',
} as const

/** A finding from its packages: services, totals and the charge mix. */
function finding(
  id: string,
  chargeKey: string,
  problem: string | null,
  why: string,
  pkgs: PackageRecord[],
  opts: { driverConfirmed?: boolean } = {},
): FindingGroup {
  const bySvc = new Map<string, PackageRecord[]>()
  for (const p of pkgs) bySvc.set(`${p.car}|${p.sv}`, [...(bySvc.get(`${p.car}|${p.sv}`) ?? []), p])
  const services: FindingService[] = [...bySvc.entries()].map(([key, list]) => ({
    key: `${id}-${key}`,
    carrier: list[0]?.car ?? '',
    service: list[0]?.sv ?? '',
    label: titleCase(list[0]?.sv ?? ''),
    packages: list.length,
    invoices: new Set(list.map((p) => p.inv)).size,
    invoicedN: r2(list.reduce((t, p) => t + p.ti, 0)),
    expectedN: r2(list.reduce((t, p) => t + p.te, 0)),
    varN: r2(list.reduce((t, p) => t + p.tv, 0)),
    pkgs: list,
  }))
  const mix = { b: 0, f: 0, r: 0, d: 0, o: 0 }
  for (const p of pkgs)
    for (const k of Object.keys(mix) as (keyof typeof mix)[]) mix[k] += p[k][0] - p[k][1]
  for (const k of Object.keys(mix) as (keyof typeof mix)[]) mix[k] = r2(mix[k])
  const entries: ChargeMixEntry[] = (Object.keys(mix) as (keyof typeof mix)[])
    .filter((k) => Math.abs(mix[k]) >= 0.005)
    .map((k) => ({
      key: k,
      label: FIELD_LABEL[k],
      amount: mix[k],
      text: `${FIELD_LABEL[k]} ${mix[k]}`,
    }))
  const unfav = entries.filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount)
  const invoicedN = r2(pkgs.reduce((t, p) => t + p.ti, 0))
  const expectedN = r2(pkgs.reduce((t, p) => t + p.te, 0))
  return {
    id,
    category: 'Made-up example',
    chargeKey,
    problem,
    driver: unfav[0]?.key ?? 'b',
    causes: [],
    title: problem ?? chargeKey,
    headline: '',
    supportCopy: '',
    why,
    mixText: '',
    mixUnfav: unfav,
    mixFav: entries.filter((e) => e.amount < 0),
    primaryUnfav: unfav[0]?.key ?? 'b',
    primaryUnfavLabel: unfav[0]?.label ?? '',
    driverConfirmed: opts.driverConfirmed ?? true,
    carriers: [...new Set(pkgs.map((p) => p.car))].sort(),
    invoices: new Set(pkgs.map((p) => p.inv)).size,
    packages: pkgs.length,
    invoicedN,
    expectedN,
    varN: r2(invoicedN - expectedN),
    chargeMix: mix,
    services,
    pursuit: null,
    disputeDeadline: '2026-09-27',
    collection: null,
  }
}

/** One package: a home-delivery fee on a business address (the plan's example). */
function onePackage(): FindingGroup {
  const p = pkg(1, '1Z3760WA', 'QB3098140', {
    car: 'UPS',
    sv: 'GROUND COMMERCIAL',
    az: '003',
    ez: '003',
    wt: 32,
    b: [8.4, 8.4],
    f: [1.32, 1.32],
    r: [4.9, 0],
  })
  return finding(
    'ex-one',
    'res',
    'Home-delivery fee charged on a business address',
    'A home-delivery fee is only allowed for homes. UPS lists this address as a business.',
    [p],
  )
}

/** Other charges: two address corrections and seven extra-handling fees above contract. */
function otherCharges(): FindingGroup {
  const pkgs: PackageRecord[] = []
  for (let i = 0; i < 9; i++) {
    const ups = i < 5
    pkgs.push(
      pkg(100 + i, ups ? '1Z3760WA' : '4581', i < 5 ? 'QB3098141' : 'QB3098142', {
        car: ups ? 'UPS' : 'DHL',
        sv: ups ? 'GROUND RESIDENTIAL' : 'GROUND',
        az: ups ? '005' : '4',
        ez: ups ? '005' : '4',
        wt: 48 + i * 8,
        b: [12.4 + i, 12.4 + i],
        f: [1.9, 1.9],
        r: ups ? [3.72, 3.72] : zero,
        o: i < 2 ? [18, 0] : [4.5, 2.5],
      }),
    )
  }
  return finding(
    'ex-other',
    'other',
    null,
    'Each extra fee on the package was compared with the fees your contract lists; address corrections aren’t in it.',
    pkgs,
  )
}

/** Shipping price billed for a farther zone than your contract uses; fuel follows. */
function fartherZone(): FindingGroup {
  const next = rng(7)
  const pkgs: PackageRecord[] = []
  for (let i = 0; i < 40; i++) {
    const ez = 3 + Math.floor(next() * 3)
    const az = ez + 1 + Math.floor(next() * 2)
    const lb = 1 + Math.floor(next() * 12)
    const price = (zone: number) => r2(8.5 + lb * 0.85 + zone * 0.95)
    const bc = price(ez)
    const bb = price(az)
    pkgs.push(
      pkg(200 + i, '1Z3760WA', `QB30981${43 + (i % 3)}`, {
        car: 'UPS',
        sv: 'GROUND RESIDENTIAL',
        az: `00${az}`,
        ez: `00${ez}`,
        wt: lb * 16,
        b: [bb, bc],
        f: [r2(bb * 0.155), r2(bc * 0.155)],
        r: [3.72, 3.72],
      }),
    )
  }
  return finding(
    'ex-zone',
    'base',
    'Shipping price charged for a farther zone',
    'Each package’s zone was worked out from the warehouse and the destination ZIP code, then priced with your price list.',
    pkgs,
  )
}

/** Fuel percentage above your contract on a correct shipping price. */
function fuelRate(): FindingGroup {
  const next = rng(11)
  const pkgs: PackageRecord[] = []
  for (let i = 0; i < 30; i++) {
    const b = r2(9 + next() * 22)
    pkgs.push(
      pkg(300 + i, '4581', `QB30981${46 + (i % 2)}`, {
        car: 'DHL',
        sv: 'GROUND',
        az: String(3 + (i % 4)),
        ez: String(3 + (i % 4)),
        wt: 16 + (i % 6) * 16,
        b: [b, b],
        f: [r2(b * 0.1725), r2(b * 0.145)],
      }),
    )
  }
  return finding(
    'ex-fuelrate',
    'fuel',
    'Fuel percentage higher than your contract allows',
    'Fuel is a percentage of the shipping price. We applied your contract’s percentage for the week each package shipped.',
    pkgs,
  )
}

export function extraFindings(): FindingGroup[] {
  return [fartherZone(), fuelRate(), otherCharges(), onePackage()]
}
