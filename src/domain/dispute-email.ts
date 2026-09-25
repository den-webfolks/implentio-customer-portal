/**
 * The dispute email, built from claim data so that every amount, count and
 * file name in the text matches the attachments. One source feeds the step 2
 * preview, the plain text that is copied or sent, the compose links, the .eml
 * and the one-page summary (Review & send plan, slice B).
 *
 * Each claim follows one plain pattern: a title with the amount, how many
 * packages were charged more for what, one real example, and the file that
 * lists every package. The opening and closing are the only editable parts.
 */
import type { FindingGroup, PackageRecord } from './types'
import { fmtMoney, r2 } from './money'
import { plural } from './plural'
import { chargeCopy, findingProblem } from './finding-copy'

// ---------- claims -------------------------------------------------------------

export interface ClaimExample {
  tracking: string
  billedN: number
  contractN: number
}

/** One numbered item in the email: a finding, or the complete credit memo. */
export interface EmailClaim {
  id: string
  /** In the customer's voice: "Shipping price higher than our contract rate". */
  title: string
  amountN: number
  packages: number
  /** What was overcharged, in everyday words: "shipping", "fuel", … */
  charge: string
  /** Set when the charge word belongs in the example ("was charged $3.40 for fuel"). */
  chargeInExample: boolean
  example: ClaimExample | null
  /** The attached file that lists every package. */
  fileName: string
}

type ChargeField = 'b' | 'f' | 'r' | 'd' | 'o'

/** The package field each charge kind reads its example from; null = the package total. */
const EXAMPLE_FIELD: Record<string, ChargeField | null> = { base: 'b', fuel: 'f', res: 'r', das: 'd', other: 'o', multi: null }

const CHARGE_WORD: Record<string, { charge: string; inExample: boolean }> = {
  base: { charge: 'shipping', inExample: false },
  fuel: { charge: 'fuel', inExample: true },
  res: { charge: 'home delivery', inExample: true },
  das: { charge: 'remote-area delivery', inExample: true },
  multi: { charge: 'shipping and fuel', inExample: false },
  other: { charge: 'other charges', inExample: true },
}

/** The package that best shows the overcharge: the largest net variance. */
export function largestPackage(g: Pick<FindingGroup, 'services'>): PackageRecord | null {
  return g.services.flatMap((s) => s.pkgs).sort((a, b) => b.tv - a.tv)[0] ?? null
}

/** The billed and contract amounts the example compares, for the finding's charge. */
export function exampleAmounts(p: PackageRecord, chargeKey: string): { billedN: number; contractN: number } {
  const field = EXAMPLE_FIELD[chargeKey] ?? null
  if (field && p[field][0] > 0) return { billedN: p[field][0], contractN: p[field][1] }
  return { billedN: p.ti, contractN: p.te }
}

export function claimFromFinding(g: FindingGroup, fileName: string): EmailClaim {
  const word = CHARGE_WORD[g.chargeKey] ?? CHARGE_WORD.other!
  const top = largestPackage(g)
  return {
    id: g.id,
    title: findingProblem(g).replace(/\byour\b/g, 'our'),
    amountN: g.varN,
    packages: g.packages,
    charge: word.charge,
    chargeInExample: word.inExample,
    example: top ? { tracking: top.t, ...exampleAmounts(top, g.chargeKey) } : null,
    fileName,
  }
}

export const COMPLETE_MEMO_CLAIM_TITLE = 'Complete credit memo'

export function claimForWholeMemo(input: { amountN: number; packages: number; invoices: number; fileName: string }): EmailClaim {
  return {
    id: 'complete',
    title: `${COMPLETE_MEMO_CLAIM_TITLE} — ${plural(input.packages, 'package')} on ${plural(input.invoices, 'invoice')}`,
    amountN: input.amountN,
    packages: input.packages,
    charge: 'shipping',
    chargeInExample: false,
    example: null,
    fileName: input.fileName,
  }
}

/** Short, distinct attachment names per charge kind ("Base-Freight.csv").
 *  The demo writes .csv from the package data; real .xlsx needs the backend. */
export function claimFileName(g: Pick<FindingGroup, 'chargeKey'>, ext: 'csv' | 'xlsx'): string {
  const stem = chargeCopy(g)
    .term.replace(/\s*\(.*\)\s*/g, '')
    .replace(/\s+/g, '-')
    .replace(/(^|-)([a-z])/g, (m) => m.toUpperCase())
    .replace(/-\+-/g, '-and-')
  return `${stem}.${ext}`
}

/** The one-page summary every dispute email carries. */
export const SUMMARY_FILE_NAME = 'Summary.pdf'

// ---------- the message --------------------------------------------------------

export interface EmailInput {
  provider: string
  /** Who the greeting addresses: the Biller contact's name, or "QuickBox billing team". */
  greetingName: string
  memoId: string
  period: string
  claims: EmailClaim[]
  amountN: number
  /** The one-page summary attachment. */
  summaryFile: string
  /** The complete credit memo, when attached as well. */
  completeFile: string | null
  sender: string
}

export interface ClaimBlock {
  id: string
  /** "1) Shipping price higher than our contract rate — $9,322.20" */
  heading: string
  /** The claim's sentences, without the file sentence. */
  body: string
  /** "Every package is listed in the attached Base-Freight.csv." */
  fileSentence: string
  fileName: string
}

export interface EmailBlocks {
  /** Editable: the greeting and what was reviewed (no calculated numbers). */
  opening: string
  /** Locked: the amount and count, so an edited opening can't go stale. */
  request: string
  claims: ClaimBlock[]
  /** One sentence per extra attachment, in order. */
  attachmentLines: string[]
  /** Editable: the ask, the thanks and the signature. */
  closing: string
}

const overchargeWord = (n: number) => (n === 1 ? '1 overcharge' : `${n} overcharges`)

export function claimBody(c: EmailClaim): string {
  if (c.id === 'complete') return `${plural(c.packages, 'package')} were charged more than our contract allows across the credit memo.`
  const first = `${plural(c.packages, 'package')} ${c.packages === 1 ? 'was' : 'were'} charged more for ${c.charge} than our contract allows.`
  if (!c.example) return first
  const forWhat = c.chargeInExample ? ` for ${c.charge}` : ''
  return `${first} For example, tracking ${c.example.tracking} was charged ${fmtMoney(c.example.billedN)}${forWhat}; our contract says ${fmtMoney(c.example.contractN)}.`
}

export function buildEmailBlocks(input: EmailInput): EmailBlocks {
  const { claims } = input
  const whole = claims.length === 1 && claims[0]?.id === 'complete'
  const request = whole
    ? `We're requesting a credit of ${fmtMoney(input.amountN)} for the complete credit memo, detailed below.`
    : `We're requesting a credit of ${fmtMoney(input.amountN)} for the ${overchargeWord(claims.length)} below.`
  return {
    opening: [`Hi ${input.greetingName},`, '', `We reviewed our parcel invoices for ${input.period} (credit memo ${input.memoId}) and found charges that don't match our contract.`].join('\n'),
    request,
    claims: claims.map((c, i) => ({
      id: c.id,
      heading: `${i + 1}) ${c.title} — ${fmtMoney(c.amountN)}`,
      body: claimBody(c),
      fileSentence: `Every package is listed in the attached ${c.fileName}.`,
      fileName: c.fileName,
    })),
    attachmentLines: [
      `A one-page summary is attached as ${input.summaryFile}.`,
      ...(input.completeFile ? [`The complete credit memo is attached as ${input.completeFile}.`] : []),
    ],
    closing: ['Could you review these and confirm which credits you\'ll issue?', '', 'Thank you,', input.sender].join('\n'),
  }
}

/** The customer's wording. The opening and closing are always editable; the
 *  evidence (the request line, the numbered claims and the file lines) is
 *  locked until they choose to edit it, and `evidence` is set only then. */
export interface EmailEdits {
  opening: string
  closing: string
  evidence?: string
}

/** The editable evidence as plain text: the amount requested and each claim
 *  with its example and file. The extra-attachment lines stay out of it and
 *  always follow the current file list. */
export function evidenceText(blocks: EmailBlocks): string {
  return [blocks.request, ...blocks.claims.map((c) => [c.heading, c.body, c.fileSentence].join('\n'))]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n')
}

/** The whole email as plain text — what is copied, sent and saved. */
export function emailText(blocks: EmailBlocks, edits?: Partial<EmailEdits>): string {
  const parts = [edits?.opening ?? blocks.opening, edits?.evidence ?? evidenceText(blocks), blocks.attachmentLines.join('\n'), edits?.closing ?? blocks.closing]
  return parts.map((p) => p.trim()).filter(Boolean).join('\n\n')
}

/** Every attachment the email names, in order. */
export function attachmentNames(input: Pick<EmailInput, 'claims' | 'summaryFile' | 'completeFile'>): string[] {
  return [...input.claims.map((c) => c.fileName), input.summaryFile, ...(input.completeFile ? [input.completeFile] : [])]
}

export function defaultSubject(input: { period: string; memoId: string }): string {
  return `Parcel invoice review — ${input.period} — ${input.memoId}`
}

/** "You're asking QuickBox for $9,357.30 back for 2 overcharges." */
export function positionSentence(input: { provider: string; amountN: number; claims: readonly EmailClaim[] }): string {
  const whole = input.claims.length === 1 && input.claims[0]?.id === 'complete'
  const what = whole ? 'your whole credit memo' : overchargeWord(input.claims.length)
  return `You're asking ${input.provider} for ${fmtMoney(input.amountN)} back for ${what}. Each file lists the packages that prove it. Click one to look.`
}

// ---------- the per-claim file -------------------------------------------------

export interface ClaimFileRow {
  tracking: string
  invoice: string
  billedN: number
  contractN: number
  differenceN: number
}

/** Every package of a finding, with the billed and contract amounts for its
 *  charge — the four plain columns of the attached file and its preview. */
export function claimFileRows(g: Pick<FindingGroup, 'services' | 'chargeKey'>): ClaimFileRow[] {
  return g.services
    .flatMap((s) => s.pkgs)
    .sort((a, b) => b.tv - a.tv)
    .map((p) => {
      const { billedN, contractN } = exampleAmounts(p, g.chargeKey)
      return { tracking: p.t, invoice: p.inv, billedN, contractN, differenceN: r2(billedN - contractN) }
    })
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function claimCsv(rows: readonly ClaimFileRow[]): string {
  const lines = ['Tracking,Invoice,Billed,Contract,Difference']
  for (const r of rows) lines.push([r.tracking, r.invoice, r.billedN.toFixed(2), r.contractN.toFixed(2), r.differenceN.toFixed(2)].map(csvCell).join(','))
  return lines.join('\r\n') + '\r\n'
}

/** The one-page summary: what is claimed, item by item. */
export function summaryLines(input: EmailInput): string[] {
  return [
    `Parcel invoice review — ${input.period}`,
    `Credit memo ${input.memoId} · ${input.provider}`,
    `Credit requested: ${fmtMoney(input.amountN)}`,
    '',
    ...input.claims.flatMap((c, i) => [`${i + 1}) ${c.title}`, `   ${fmtMoney(c.amountN)} · ${plural(c.packages, 'package')} · ${c.fileName}`]),
    '',
    `Prepared in Implentio for ${input.sender}.`,
  ]
}

// ---------- getting it into a mail app ---------------------------------------

export type ComposeProvider = 'gmail' | 'outlook' | 'outlook_com'

export const COMPOSE_LABELS: Record<ComposeProvider, string> = {
  gmail: 'Open in Gmail',
  outlook: 'Open in Outlook',
  outlook_com: 'Outlook.com',
}

/** Gmail and Outlook web accept links of several thousand characters; past
 *  this the body travels by clipboard instead (checked before the click). */
export const COMPOSE_URL_MAX = 8000

export interface ComposeFields {
  to: string
  cc: string
  subject: string
  body: string
}

function composeBase(provider: ComposeProvider, f: ComposeFields, withBody: boolean): string {
  const q = (params: Record<string, string>) =>
    Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
  const body = withBody ? f.body : ''
  if (provider === 'gmail') return `https://mail.google.com/mail/?view=cm&fs=1&${q({ to: f.to, cc: f.cc, su: f.subject, body })}`
  const host = provider === 'outlook' ? 'https://outlook.office.com/mail/deeplink/compose' : 'https://outlook.live.com/mail/0/deeplink/compose'
  return `${host}?${q({ to: f.to, cc: f.cc, subject: f.subject, body })}`
}

/** The compose link, and whether the message text fit in it. When it didn't,
 *  the caller copies the text to the clipboard and says so. */
export function composeLink(provider: ComposeProvider, f: ComposeFields): { url: string; bodyIncluded: boolean } {
  const full = composeBase(provider, f, true)
  if (full.length <= COMPOSE_URL_MAX) return { url: full, bodyIncluded: true }
  return { url: composeBase(provider, f, false), bodyIncluded: false }
}

/** Copying more than one line of the email counts as taking it out of the
 *  app; copying a single value (a tracking number, an amount) is checking. */
export function copyIsHandoff(selectedText: string): boolean {
  return selectedText.split(/\r?\n/).filter((l) => l.trim()).length > 1
}
