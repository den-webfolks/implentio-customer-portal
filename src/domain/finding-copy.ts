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
}

export const CHARGE_COPY: Record<ChargeKey, ChargeCopy> = {
  base: {
    name: 'Shipping price',
    term: 'Base freight',
    problem: 'Shipping price higher than your contract rate',
    reason: 'Base freight billed above the contracted rate',
  },
  fuel: {
    name: 'Fuel charge',
    term: 'Fuel surcharge',
    problem: 'Fuel charge higher than your contract allows',
    reason: 'Fuel surcharge calculated above the contracted terms',
  },
  res: {
    name: 'Home-delivery fee',
    term: 'Residential surcharge',
    problem: 'Home-delivery fee charged incorrectly',
    reason: 'Residential surcharge billed above the contracted rate',
  },
  das: {
    name: 'Remote-area fee',
    term: 'Delivery area surcharge (DAS)',
    problem: 'Remote-area fee charged incorrectly',
    reason: 'Delivery area surcharge not supported by the destination ZIP code',
  },
  multi: {
    name: 'Shipping price and fuel charge',
    term: 'Base freight + fuel',
    problem: 'Shipping price and fuel charge both too high',
    reason: 'Base freight and fuel surcharge billed above the contracted rates',
  },
  other: {
    name: 'Other charges',
    term: 'Accessorial charges',
    problem: 'Other charges higher than expected',
    reason: 'Accessorial charges billed above the contracted rates',
  },
}

type CopySource = Pick<FindingGroup, 'chargeKey'>

export function chargeCopy(g: CopySource): ChargeCopy {
  return CHARGE_COPY[g.chargeKey as ChargeKey] ?? CHARGE_COPY.other
}

/** Card title: what went wrong, in everyday words. */
export function findingProblem(g: CopySource): string {
  return chargeCopy(g).problem
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
