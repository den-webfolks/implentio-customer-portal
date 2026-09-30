import { describe, expect, it } from 'vitest'
import type { PackageRecord } from './types'
import {
  breakdownTake,
  chargeBreakdown,
  examplePackages,
  fuelReason,
  mismatchNote,
  packageFacts,
  relatedFinding,
  spreadBuckets,
  spreadSentence,
  topTenBuckets,
} from './evidence'

// Charge mixes of the demo memo's findings (cm-pkg.json).
const base = {
  id: 'eg-base',
  chargeKey: 'base',
  chargeMix: { b: 9003.21, f: 1322.77, r: -790.26, d: 4.98, o: -218.5 },
}
const fuel = {
  id: 'eg-fuel',
  chargeKey: 'fuel',
  chargeMix: { b: 0, f: 33.94, r: -6.78, d: 7.94, o: 0 },
}
const res = {
  id: 'eg-res',
  chargeKey: 'res',
  driverConfirmed: false,
  chargeMix: { b: 21.92, f: 8.86, r: -48.36, d: 42.22, o: -2 },
}
const das = { id: 'eg-das', chargeKey: 'das', chargeMix: { b: 0, f: 0, r: 0, d: 4.68, o: 0 } }
const multi = {
  id: 'eg-multi',
  chargeKey: 'multi',
  chargeMix: { b: 1.54, f: 1.54, r: 0, d: 0, o: 0 },
}

const pkg = (over: Partial<PackageRecord>): PackageRecord =>
  ({
    t: 'T',
    sv: 'GROUND',
    car: 'UPS',
    az: '',
    ez: '',
    wt: 16,
    zip: null,
    tv: 1,
    b: [0, 0],
    f: [0, 0],
    r: [0, 0],
    d: [0, 0],
    o: [0, 0],
    ...over,
  }) as PackageRecord

describe('what makes up the overcharge', () => {
  it('splits charges above and below contract, largest first', () => {
    const b = chargeBreakdown(base)
    expect(b.over.map((e) => e.field)).toEqual(['b', 'f', 'd'])
    expect(b.under.map((e) => e.field)).toEqual(['r', 'o'])
  })

  it('reads the breakdown in one plain sentence', () => {
    expect(breakdownTake(base)).toBe('Almost all of it is the **shipping price** (97%).')
    expect(breakdownTake(das)).toBe('All of it is the **remote-area fee**.')
    expect(breakdownTake(multi)).toBe(
      'It’s split evenly between the **shipping price** and the **fuel charge**.',
    )
    expect(breakdownTake(res)).toBe(
      'Most of it is the **remote-area fee** and the **shipping price**. The home-delivery fees were billed below your contract.',
    )
  })

  it('flags a finding whose name is not where the money came from', () => {
    expect(mismatchNote(res)).toBe(
      'Grouped under home-delivery fees, but most of the difference came from the remote-area fee and the shipping price.',
    )
    expect(mismatchNote({ ...base, driverConfirmed: true })).toBeNull()
    // Implentio decides whether the name matches; the app only words it.
    expect(mismatchNote({ ...res, driverConfirmed: true })).toBeNull()
  })

  it('names at most one other finding carrying a real share of this breakdown', () => {
    const all = [base, fuel, res, das, multi]
    expect(relatedFinding(base, all)?.id).toBe('eg-fuel')
    expect(relatedFinding(res, all)?.id).toBe('eg-das')
    expect(relatedFinding(das, all)).toBeNull()
    expect(relatedFinding(multi, all)).toBeNull()
  })
})

describe('overcharge per package', () => {
  it('says the same amount once when every package matches', () => {
    expect(spreadSentence([1.56, 1.56, 1.56])).toBe('All 3 packages were **$1.56 over**.')
    expect(spreadSentence([0.02, 0.02])).toBe('Both packages were **2¢ over**.')
    expect(spreadSentence([5])).toBeNull()
  })

  it('gives the middle half, or the median for cents', () => {
    expect(spreadSentence([10, 14.81, 15, 17.91, 18, 20.24, 21, 106.11])).toBe(
      'Half the packages were **$15–$20 over**. The largest was $106.11.',
    )
    expect(spreadSentence([0.03, 0.06, 0.09, 0.1, 0.34, 0.43, 0.88])).toBe(
      'Half the packages were **10¢ over or less**. The largest was 88¢.',
    )
    expect(spreadSentence([1.01, 1.09, 1.09, 1.09, 1.18, 4.67, 4.73])).toBe(
      '5 of 7 packages were **about $1.09 over**. The largest was $4.73.',
    )
  })

  it('shows a typical package first and the largest only when it differs', () => {
    const svc = (tvs: number[]) => [{ pkgs: tvs.map((tv, i) => pkg({ t: `T${i}`, tv })) }] as never
    const ex = examplePackages({ chargeKey: 'base', services: svc([1, 2, 3, 50]) })
    expect(ex?.typical.tv).toBe(2)
    expect(ex?.largest?.tv).toBe(50)
    expect(examplePackages({ chargeKey: 'base', services: svc([2, 2, 2]) })?.largest).toBeNull()
    expect(examplePackages({ chargeKey: 'base', services: svc([1, 5]) })).toMatchObject({
      typical: { tv: 1 },
      largest: { tv: 5 },
    })
  })

  it('takes the typical package from those whose own charge was billed above contract', () => {
    const fits = pkg({ t: 'FIT', tv: 40, f: [5, 4] })
    // A package whose fuel was billed below contract isn't a fitting example of a fuel overcharge.
    const others = [1, 2, 3].map((tv, i) => pkg({ t: `X${i}`, tv, f: i === 1 ? [4, 5] : [0, 0] }))
    expect(
      examplePackages({ chargeKey: 'fuel', services: [{ pkgs: [...others, fits] }] as never })
        ?.typical.t,
    ).toBe('FIT')
  })
})

describe('package facts', () => {
  it('reads speed, destination and distance from the invoice', () => {
    const f = packageFacts(pkg({ sv: 'NEXT DAY AIR RESIDENTIAL', az: '107', wt: 256 }))
    expect(f).toMatchObject({
      speed: 'next-day',
      destination: 'home',
      zone: '107',
      billedZone: null,
      distance: 7,
      band: 'far',
      weightLb: 16,
    })
    // The contract's zone comes first; the Biller's shows only when it differs.
    expect(packageFacts(pkg({ az: '205', ez: '204' }))).toMatchObject({
      zone: '204',
      billedZone: '205',
      distance: 4,
    })
  })

  it('leaves what it cannot read unset', () => {
    const f = packageFacts(pkg({ car: 'OSM', sv: 'PREMIUM', az: '7' }))
    expect(f).toMatchObject({ speed: null, destination: null, distance: 7 })
  })
})

describe('why a fuel charge differs', () => {
  it('names the overcharged shipping price when it outweighs a lower percentage', () => {
    // The typical package on "Shipping price higher than your contract rate".
    const p = pkg({ b: [41.1, 20.55], f: [8.33, 5.25] })
    expect(fuelReason(p)).toBe(
      'It came out $3.08 higher because it was worked out on the overcharged shipping price ($41.10 instead of $20.55) — even though the percentage used was lower (20.3% instead of 25.5%).',
    )
  })

  it('names the percentage when the shipping price was right', () => {
    const p = pkg({ b: [16.83, 16.83], f: [4.27, 3.84] })
    expect(fuelReason(p)).toBe(
      'The shipping price under it was right, but the percentage used was higher (25.4% instead of 22.8%), so it came out $0.43 higher.',
    )
  })

  it('treats percentages under half a point apart as the same', () => {
    // The largest package on "Shipping price higher than your contract rate".
    expect(fuelReason(pkg({ b: [185.86, 92.93], f: [37.64, 18.74] }))).toBe(
      'It came out $18.90 higher because it was worked out on the overcharged shipping price ($185.86 instead of $92.93); the percentage was about the same (20.2%).',
    )
  })

  it('says nothing to explain without a shipping price, and when fuel matches', () => {
    expect(fuelReason(pkg({ b: [0, 0], f: [1, 1] }))).toBeNull()
    expect(fuelReason(pkg({ b: [10, 10], f: [2, 2] }))).toBe(
      'So the fuel charge matches your contract.',
    )
  })
})

describe('the spread chart', () => {
  it('labels cents below a dollar and dollars above', () => {
    const cents = spreadBuckets([0.03, 0.06, 0.09, 0.1, 0.34, 0.43, 0.88])
    expect(cents[1]?.axis).toBe('10–20¢')
    const dollars = spreadBuckets(Array.from({ length: 40 }, (_, i) => (i < 17 ? 1.1 : 2.2)))
    expect(dollars.map((b) => b.axis)).toContain('$2–2.5')
    expect(dollars.some((b) => /\d{3}¢/.test(b.axis))).toBe(false)
  })

  it('marks a top 10% only when the last buckets are a real tail', () => {
    const tail = spreadBuckets([...Array(90).fill(1), ...Array(10).fill(9)])
    expect(topTenBuckets(tail)).toBeGreaterThan(0)
    // Half the packages in the last bucket isn't a tail.
    const lumpy = spreadBuckets([...Array(17).fill(1.1), ...Array(23).fill(2.2)])
    expect(topTenBuckets(lumpy)).toBe(0)
  })
})
