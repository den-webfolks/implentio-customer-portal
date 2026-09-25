/** The dispute email and its files for one memo, assembled from the selected
 *  findings. Everything the steps show, copy, download or send comes from
 *  this one model (Review & send plan, slices B and C). */
import type { AccountSettings, DisputeRecord, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { evidenceFileName } from '@/domain/memo'
import { findingProblem } from '@/domain/finding-copy'
import {
  SUMMARY_FILE_NAME,
  attachmentNames,
  buildEmailBlocks,
  claimCsv,
  claimFileName,
  claimFileRows,
  claimForWholeMemo,
  claimFromFinding,
  defaultSubject,
  emailText,
  summaryLines,
  type ClaimFileRow,
  type EmailBlocks,
  type EmailEdits,
  type EmailInput,
} from '@/domain/dispute-email'
import { simplePdf } from '@/lib/pdf'
import { buildZip } from '@/lib/zip'

/** One attached file: what it is, how it previews, and how to build it. */
export interface AttachmentSpec {
  name: string
  kind: 'claim' | 'summary' | 'complete'
  mimeType: string
  /** For a finding's file: its rows (the first few are previewed). */
  rows: ClaimFileRow[] | null
  /** What the preview says under the name. */
  description: string
  build: () => Promise<Blob>
}

export interface SelectionRow {
  id: string
  title: string
  meta: string
  amountN: number
}

/** What backs one claim, for "More details" under the evidence. */
export interface ClaimDetail {
  id: string
  heading: string
  billedN: number
  contractN: number
  differenceN: number
  invoices: number
  carriers: string
  /** How Implentio worked it out, in the audit's words. */
  how: string
}

export interface DisputeEmailModel {
  scope: 'groups' | 'memo'
  groupIds: string[]
  rows: SelectionRow[]
  details: ClaimDetail[]
  amountN: number
  packages: number
  invoices: number
  input: EmailInput
  blocks: EmailBlocks
  attachments: AttachmentSpec[]
}

export interface BuildOptions {
  detail: MemoDetail
  /** The ticked findings; empty for a whole-memo dispute. */
  groups: readonly FindingGroup[]
  account: AccountSettings
  /** Attach the complete credit memo as well (opt-in on the last step). */
  includeComplete: boolean
}

/** The Biller's dispute contact, or any contact for that Biller. */
export function billerContact(account: AccountSettings, provider: string) {
  return account.billerContacts.find((c) => c.biller === provider && c.dispute) ?? account.billerContacts.find((c) => c.biller === provider) ?? null
}

export function buildEmailModel({ detail, groups, account, includeComplete }: BuildOptions): DisputeEmailModel {
  const memo = detail.memo
  const wholeMemo = detail.findingsUnavailable
  const contact = billerContact(account, memo.provider)
  const completeFile = evidenceFileName(memo, true)

  // Each package belongs to one finding, so package counts add up; invoices
  // can span findings, so they're counted once.
  const invSet = new Set<string>()
  for (const g of groups) for (const s of g.services) for (const p of s.pkgs) invSet.add(p.inv)
  const amountN = wholeMemo ? (memo.netN ?? 0) : r2(groups.reduce((s, g) => s + g.varN, 0))
  const packages = wholeMemo ? (memo.orders ?? 0) : groups.reduce((s, g) => s + g.packages, 0)
  const invoices = wholeMemo ? (memo.invoices ?? 0) : invSet.size

  const claims = wholeMemo
    ? [claimForWholeMemo({ amountN, packages, invoices, fileName: completeFile })]
    : groups.map((g) => claimFromFinding(g, claimFileName(g, 'csv')))

  const input: EmailInput = {
    provider: memo.provider,
    greetingName: contact?.contact ?? `${memo.provider} billing team`,
    memoId: memo.id,
    period: memo.period,
    claims,
    amountN,
    summaryFile: SUMMARY_FILE_NAME,
    // A whole-memo dispute is backed by the complete workbook already.
    completeFile: includeComplete && !wholeMemo ? completeFile : null,
    sender: account.user.name,
  }

  const completeSpec: AttachmentSpec = {
    name: completeFile,
    kind: 'complete',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rows: null,
    description: `The complete credit memo workbook, ${memo.version}: every invoice and package Implentio audited.`,
    build: async () => {
      const res = await fetch(`/demo-assets/${encodeURIComponent(detail.file)}`)
      if (!res.ok) throw new Error(String(res.status))
      return res.blob()
    },
  }
  const attachments: AttachmentSpec[] = wholeMemo
    ? [completeSpec]
    : groups.map((g, i) => {
        const rows = claimFileRows(g)
        return {
          name: claims[i]?.fileName ?? claimFileName(g, 'csv'),
          kind: 'claim' as const,
          mimeType: 'text/csv',
          rows,
          description: `${rows.length.toLocaleString('en-US')} packages · what ${memo.provider} billed and what your contract says`,
          build: () => Promise.resolve(new Blob([claimCsv(rows)], { type: 'text/csv' })),
        }
      })
  attachments.push({
    name: SUMMARY_FILE_NAME,
    kind: 'summary',
    mimeType: 'application/pdf',
    rows: null,
    description: 'A one-page summary of the request, for the approver who won’t open a spreadsheet.',
    build: () => Promise.resolve(simplePdf(summaryLines(input))),
  })
  if (input.completeFile) attachments.push(completeSpec)

  const blocks = buildEmailBlocks(input)
  const details: ClaimDetail[] = wholeMemo
    ? [
        {
          id: 'complete',
          heading: blocks.claims[0]?.heading ?? 'Complete credit memo',
          billedN: memo.invoicedN ?? 0,
          contractN: memo.expectedN ?? r2((memo.invoicedN ?? 0) - amountN),
          differenceN: amountN,
          invoices,
          carriers: memo.carriers.join(', '),
          how: 'Every package in the credit memo was priced with your contract rates and compared with what was billed.',
        },
      ]
    : groups.map((g, i) => ({
        id: g.id,
        heading: blocks.claims[i]?.heading ?? findingProblem(g),
        billedN: g.invoicedN,
        contractN: g.expectedN,
        differenceN: g.varN,
        invoices: g.invoices,
        carriers: g.carriers.join(', '),
        how: g.why,
      }))

  return {
    scope: wholeMemo ? 'memo' : 'groups',
    groupIds: groups.map((g) => g.id),
    details,
    rows: wholeMemo
      ? [{ id: 'complete', title: 'Complete credit memo', meta: `${packages.toLocaleString('en-US')} packages · ${invoices} invoices`, amountN }]
      : [...groups]
          .sort((a, b) => b.varN - a.varN)
          .map((g) => ({
            id: g.id,
            title: findingProblem(g),
            meta: `${g.packages.toLocaleString('en-US')} packages · ${g.invoices} invoices · ${g.carriers.join(', ')}`,
            amountN: g.varN,
          })),
    amountN,
    packages,
    invoices,
    input,
    blocks,
    attachments,
  }
}

/** Every attachment in one .zip, for web mail where files are attached by hand. */
export async function attachmentsZip(model: DisputeEmailModel): Promise<Blob> {
  const entries = await Promise.all(model.attachments.map(async (a) => ({ name: a.name, data: new Uint8Array(await (await a.build()).arrayBuffer()) })))
  return buildZip(entries)
}

/** Everything a handoff or a send carries. */
export interface EmailSnapshot {
  to: string
  cc: string
  subject: string
  body: string
  attachments: string[]
}

export function snapshotOf(model: DisputeEmailModel, fields: { to: string; cc: string; subject: string; edits: EmailEdits }): EmailSnapshot {
  return {
    to: fields.to,
    cc: fields.cc,
    subject: fields.subject,
    body: emailText(model.blocks, fields.edits),
    attachments: attachmentNames(model.input),
  }
}

/** True when what's in the app differs from what last left it. */
export function changedSinceHandoff(snapshot: EmailSnapshot, record: DisputeRecord | null): boolean {
  const last = record?.handoffs[record.handoffs.length - 1]
  if (!last) return false
  return last.to !== snapshot.to || last.cc !== snapshot.cc || last.subject !== snapshot.subject || last.body !== snapshot.body || last.attachments.join('|') !== snapshot.attachments.join('|')
}

export const subjectFor = (memo: MemoDetail['memo']) => defaultSubject({ period: memo.period, memoId: memo.id })

export const amountText = fmtMoney
