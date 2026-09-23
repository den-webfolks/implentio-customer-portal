/**
 * Runtime validation of the extracted prototype payloads (cm-data.json,
 * cm-pkg.json). This is the untrusted boundary between the prototype's
 * spreadsheet-derived data contract and the app's domain types: the JSON is
 * parsed once when the demo chunk loads, and everything downstream is typed.
 */
import { z } from 'zod'

const chargePair = z.tuple([z.number(), z.number()])

const packageRecord = z.looseObject({
  t: z.string(),
  so: z.string(),
  inv: z.string(),
  mo: z.string(),
  car: z.string(),
  sv: z.string(),
  wh: z.string(),
  zip: z.string().nullable(),
  ld: z.number(),
  az: z.string(),
  ez: z.string(),
  wt: z.number(),
  cu: z.number(),
  ti: z.number(),
  te: z.number(),
  tv: z.number(),
  b: chargePair,
  f: chargePair,
  r: chargePair,
  d: chargePair,
  o: chargePair,
})

const findingService = z.looseObject({
  key: z.string(),
  carrier: z.string(),
  service: z.string(),
  label: z.string(),
  packages: z.number(),
  invoices: z.number(),
  invoicedN: z.number(),
  expectedN: z.number(),
  varN: z.number(),
  pkgs: z.array(packageRecord),
})

const chargeMixEntry = z.looseObject({
  key: z.string(),
  label: z.string(),
  amount: z.number(),
  text: z.string(),
})

const pkgGroup = z.looseObject({
  id: z.string(),
  category: z.string(),
  chargeKey: z.string(),
  driver: z.string(),
  causes: z.array(z.string()),
  title: z.string(),
  carriers: z.array(z.string()),
  invoices: z.number(),
  packages: z.number(),
  invoicedN: z.number(),
  expectedN: z.number(),
  varN: z.number(),
  why: z.string(),
  chargeMix: z.looseObject({
    b: z.number(),
    f: z.number(),
    r: z.number(),
    d: z.number(),
    o: z.number(),
  }),
  services: z.array(findingService),
  primaryUnfav: z.string(),
  driverConfirmed: z.boolean(),
  headline: z.string(),
  supportCopy: z.string(),
  mixUnfav: z.array(chargeMixEntry),
  mixFav: z.array(chargeMixEntry),
  mixText: z.string(),
  primaryUnfavLabel: z.string(),
})

export const cmPkgSchema = z.looseObject({
  source: z.string(),
  memoId: z.string(),
  totals: z.looseObject({
    packages: z.number(),
    invoices: z.number(),
    invoicedN: z.number(),
    expectedN: z.number(),
    varN: z.number(),
  }),
  groups: z.array(pkgGroup),
})

const orderRow = z.looseObject({
  so: z.string(),
  inv: z.string(),
  track: z.string(),
  month: z.string(),
  biller: z.string(),
  carrier: z.string(),
  service: z.string(),
  wh: z.string(),
  zip: z.string().optional(),
  label: z.string(),
  az: z.string(),
  ez: z.string(),
  wt: z.number(),
  invN: z.number(),
  expN: z.number(),
  varN: z.number(),
  outcome: z.string(),
})

const memoInvoice = z.looseObject({
  id: z.string(),
  inv: z.string(),
  months: z.array(z.string()),
  monthLabel: z.string(),
  carriers: z.array(z.string()),
  warehouse: z.string(),
  invN: z.number(),
  expN: z.number(),
  overN: z.number(),
  underN: z.number(),
  netN: z.number(),
  orderCount: z.number(),
  hasDoc: z.boolean(),
  kind: z.string(),
  orders: z.array(orderRow),
})

const varianceRecord = z.looseObject({
  id: z.string(),
  inv: z.string(),
  date: z.string(),
  carrier: z.string(),
  biller: z.string(),
  warehouse: z.string(),
  invoicedN: z.number(),
  expectedN: z.number(),
  varN: z.number(),
  kind: z.string(),
  resultLabel: z.string(),
})

const overGroup = z.looseObject({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  carrier: z.string(),
  amountN: z.number(),
  invoices: z.number(),
  orders: z.number(),
  example: z.string(),
  expl: z.string(),
  records: z.array(varianceRecord),
})

const underGroup = z.looseObject({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  carrier: z.string(),
  amountN: z.number(),
  invoices: z.number(),
  orders: z.number(),
  expl: z.string(),
  records: z.array(varianceRecord),
})

const reportMonthRow = z.looseObject({
  inv: z.string(),
  base: z.number(),
  fuel: z.number(),
  res: z.number(),
  das: z.number(),
  peak: z.number(),
  invN: z.number(),
  expN: z.number(),
  varN: z.number(),
})

export const cmDataSchema = z.looseObject({
  file: z.string(),
  asset: z.string(),
  memoId: z.string(),
  tabs: z.number(),
  tabNames: z.array(z.string()),
  memo: z.looseObject({
    id: z.string(),
    customer: z.string(),
    biller: z.string(),
    reportName: z.string(),
    period: z.string(),
    cadence: z.string(),
    status: z.string(),
    reportStatus: z.string(),
    version: z.string(),
    preparedBy: z.string(),
    completedText: z.string(),
    carriers: z.array(z.string()),
    invoicesCount: z.number(),
    ordersCount: z.number(),
    invoicedN: z.number(),
    expectedN: z.number(),
    overN: z.number(),
    underN: z.number(),
    netN: z.number(),
  }),
  invoices: z.array(memoInvoice),
  overGroups: z.array(overGroup),
  underGroups: z.array(underGroup),
  docGroups: z.array(
    z.looseObject({
      id: z.string(),
      carrier: z.string(),
      title: z.string(),
      missing: z.string(),
      invoices: z.number(),
      orders: z.number(),
      reason: z.string(),
    }),
  ),
  reportMonths: z.array(
    z.looseObject({
      name: z.string(),
      rows: z.array(reportMonthRow),
      totals: reportMonthRow.omit({ inv: true }),
    }),
  ),
  verify: z.looseObject({
    rawCount: z.number(),
    uniqueInvoices: z.number(),
    uniqueOrders: z.number(),
    carriers: z.array(z.string()),
    invoicedN: z.number(),
    expectedN: z.number(),
    overN: z.number(),
    underN: z.number(),
    netN: z.number(),
  }),
})

export type CmDataPayload = z.infer<typeof cmDataSchema>
export type CmPkgPayload = z.infer<typeof cmPkgSchema>

export function parseCmData(raw: unknown): CmDataPayload {
  return cmDataSchema.parse(raw)
}

export function parseCmPkg(raw: unknown): CmPkgPayload {
  return cmPkgSchema.parse(raw)
}
