/** Credit-memo derivations — ports the prototype's memoList post-processing
 *  and invoice classification (template ~7407–7427). */

import type { CreditMemoSummary, MemoInvoice, ReportState, VarianceKind } from './types'
import { r2 } from './money'

export interface DerivedReportState {
  report: ReportState
  isNew: boolean
  isUpdated: boolean
  canDownload: boolean
}

/**
 * The report state shown in the UI overlays the stored state with the
 * account's download history: a completed memo the user has downloaded shows
 * as "downloaded" regardless of its stored state.
 */
export function deriveReportState(
  memo: Pick<CreditMemoSummary, 'id' | 'status' | 'report'>,
  downloadedMemoIds: readonly string[],
): DerivedReportState {
  const report: ReportState =
    memo.status === 'complete' && downloadedMemoIds.includes(memo.id) ? 'downloaded' : memo.report
  return {
    report,
    isNew: memo.status === 'complete' && report === 'ready',
    isUpdated: memo.status === 'complete' && report === 'updated',
    canDownload: memo.status === 'complete' && report !== 'generating',
  }
}

/** Evidence attachment name for a dispute: the complete workbook when every
 *  eligible finding (or the whole memo) is sent, a ZIP of the selected
 *  variance-group files otherwise. */
export function evidenceFileName(
  memo: Pick<CreditMemoSummary, 'id' | 'version'>,
  complete: boolean,
): string {
  const base = `${memo.id}-${memo.version.replace(/\s+/g, '-')}`
  return base + (complete ? '-Complete-Excel-Evidence.xlsx' : '-Selected-Variance-Evidence.zip')
}

export interface InvoiceClassification {
  kind: VarianceKind
  resultLabel: string
  /** Net variance rounded to cents; exact zeros collapse to 0. */
  varN: number
}

/** Classify an invoice by its net variance (threshold: half a cent). */
export function classifyInvoice(
  invoice: Pick<MemoInvoice, 'netN'>,
): InvoiceClassification {
  const net = invoice.netN
  if (net > 0.005) return { kind: 'overcharge', resultLabel: 'Potential overcharge', varN: r2(net) }
  if (net < -0.005)
    return { kind: 'undercharge', resultLabel: 'Potential undercharge', varN: r2(net) }
  return { kind: 'ok', resultLabel: 'No variance identified', varN: 0 }
}
