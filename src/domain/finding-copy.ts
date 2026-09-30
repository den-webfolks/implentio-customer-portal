/**
 * Plain-language copy for findings: what went wrong in everyday words, with
 * the industry term kept alongside for experts (progressive disclosure).
 *
 * PENDING PM — proposed wording from the dispute-flow plan (Phase 2), not yet
 * confirmed by Implentio. Keep every customer-facing charge name here so the
 * wording can change in one place. The name for a "variance group" itself is
 * still open (decision 7) and is not decided here.
 */
import type { ChargeKey, FindingGroup } from './types'
import { fmtMoney } from './money'
import { plural } from './plural'

export interface ChargeCopy {
  /** Everyday name, e.g. "Shipping price". */
  name: string
  /** Industry term shown next to it, e.g. "Base freight". */
  term: string
  /** What went wrong, as a card title. */
  problem: string
  /** The reason line in the dispute email (the Biller reads industry terms). */
  reason: string
  /** "How we checked", in plain words (plan 02; replaces the expert `why`). */
  method: string
  /** What the charge is, for "what does this mean?" in the example package. */
  meaning: string
}

export const CHARGE_COPY: Record<ChargeKey, ChargeCopy> = {
  base: {
    name: 'Shipping price',
    term: 'Base freight',
    problem: 'Shipping price higher than your contract rate',
    reason: 'Base freight billed above the contracted rate',
    method:
      'Each package was looked up in your price list by speed, distance and weight, then every billed charge was compared with it.',
    meaning: 'the main price for moving a package, set by its speed, distance and weight.',
  },
  fuel: {
    name: 'Fuel charge',
    term: 'Fuel surcharge',
    problem: 'Fuel charge higher than your contract allows',
    reason: 'Fuel surcharge calculated above the contracted terms',
    method:
      'Fuel is a percentage of the shipping price. We applied your contract’s percentage for the week each package shipped, then compared every billed charge with your contract.',
    meaning: 'a percentage on top of the shipping price that changes every week.',
  },
  res: {
    name: 'Home-delivery fee',
    term: 'Residential surcharge',
    problem: 'Home-delivery fee charged incorrectly',
    reason: 'Residential surcharge billed above the contracted rate',
    method: 'We compared every charge on each package with your contract on the day it shipped.',
    meaning: 'an extra fee for delivering to a home instead of a business.',
  },
  das: {
    name: 'Remote-area fee',
    term: 'Delivery area surcharge (DAS)',
    problem: 'Remote-area fee charged incorrectly',
    reason: 'Delivery area surcharge not supported by the destination ZIP code',
    method:
      'A remote-area fee is only allowed for ZIP codes on the carrier’s official list. We checked each package’s ZIP code against it, then compared every billed charge with your contract.',
    meaning:
      'an extra fee for hard-to-reach ZIP codes, only allowed for ZIP codes on the carrier’s official list.',
  },
  multi: {
    name: 'Shipping price and fuel charge',
    term: 'Base freight + fuel',
    problem: 'Shipping price and fuel charge both too high',
    reason: 'Base freight and fuel surcharge billed above the contracted rates',
    method:
      'We recalculated the shipping price from your price list, then the fuel charge from it, and compared every billed charge with your contract.',
    meaning: 'the shipping price and the fuel charge on top of it.',
  },
  other: {
    name: 'Other charges',
    term: 'Accessorial charges',
    problem: 'Other charges higher than expected',
    reason: 'Accessorial charges billed above the contracted rates',
    method: 'We compared every charge on each package with your contract on the day it shipped.',
    meaning: 'smaller fees such as address corrections or extra handling.',
  },
}

type CopySource = Pick<FindingGroup, 'chargeKey'> & Partial<Pick<FindingGroup, 'problem'>>

export function chargeCopy(g: CopySource): ChargeCopy {
  return CHARGE_COPY[g.chargeKey as ChargeKey] ?? CHARGE_COPY.other
}

/** Card title: what went wrong, in everyday words. */
export function findingProblem(g: CopySource): string {
  return g.problem || chargeCopy(g).problem
}

/** One plain example from the finding's largest package, or null without packages. */
export function findingExample(g: Pick<FindingGroup, 'services'>): string | null {
  const top = g.services.flatMap((s) => s.pkgs).sort((a, b) => b.tv - a.tv)[0]
  if (!top) return null
  return `e.g. one package was billed ${fmtMoney(top.ti)}; under your contract it should have been ${fmtMoney(top.te)}`
}

/** One reason line for the dispute email. */
export function emailLine(g: Pick<FindingGroup, 'chargeKey' | 'packages' | 'varN'>): string {
  return `${chargeCopy(g).reason}: ${plural(g.packages, 'package')}, ${fmtMoney(g.varN)}`
}

/** Words that explain themselves where they're used (plan 02: "the customer
 *  never sees this list; the same explanations live inside 'Show me why',
 *  right where each word appears"). This is only the general part — what the
 *  word means for anyone; each helper adds what it means in the customer's
 *  case. Wording from the plan's glossary. PENDING PM, like the rest of this file. */
export type GlossaryTerm =
  'belowContract' | 'serviceLevel' | 'zone' | 'billedWeight' | 'destination' | 'chargesThatDiffer'

export function glossary(term: GlossaryTerm, biller: string): { title: string; text: string } {
  switch (term) {
    case 'belowContract':
      return {
        title: 'Billed below your contract',
        text: `${biller} charged less than your contract on one part of a package. We compare each package’s whole bill with its whole contract price, so this makes that package’s difference smaller. It’s never a separate credit, and nothing is owed back.`,
      }
    case 'serviceLevel':
      return {
        title: 'Service level',
        text: 'How fast the package was sent — Ground, 2nd Day Air, Next Day Air… — and whether it went to a home (Residential) or a business (Commercial). Faster costs more.',
      }
    case 'zone':
      return {
        title: 'Zone',
        text: 'How far the package traveled, as a number: 2 is near the warehouse, 8 is across the country. Farther costs more.',
      }
    case 'billedWeight':
      return {
        title: 'Billed weight',
        text: 'The weight the package was charged as. Heavier packages cost more to send.',
      }
    case 'destination':
      return {
        title: 'Delivered to',
        text: 'Whether the package went to a home or a business. Deliveries to homes can carry an extra home-delivery fee.',
      }
    case 'chargesThatDiffer':
      return {
        title: 'Charges that differ',
        text: 'The charges on a package where what was billed isn’t what your contract says. Ones billed below contract make that package’s difference smaller.',
      }
  }
}
