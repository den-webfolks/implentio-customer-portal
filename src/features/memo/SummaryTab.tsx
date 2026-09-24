/** Memo detail — Summary & findings, as one workspace (Phase 2 of the dispute
 *  flow; first ported from template ~4608–5184): a one-sentence summary with
 *  the deadline, the disputes already sent, then findings biggest first with a
 *  selection bar. See DESIGN-SYSTEM.md "Parcel dispute flow — Phase 2". */
import { useEffect, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { CheckCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import type { Collection, FindingGroup, MemoDetail } from '@/domain/types'
import { useClock } from '@/lib/clock'
import { fmtMoney } from '@/domain/money'
import { countdownText, fmtDateLong, fmtDateShort } from '@/domain/dates'
import { RECOVERY_BUCKETS, STATUS_LABELS, findingPhase, groupStatusLine, memoStatus, recoveryBuckets, type GroupStatusKey } from '@/domain/outcomes'
import { findingProblem } from '@/domain/finding-copy'
import { plural } from '@/domain/plural'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { EmptyState, Spinner } from '@/ui/Display/Display'
import { FilterButton, FilterGroup, useFilters, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { BUCKET_TONE, GROUP_STATUS_TONE, MEMO_STATUS_TONE, TONE_CHART_COLOR } from '@/features/status-tones'
import { Table, TableScroll } from '@/ui/Table/Table'
import {
  useDisputeContext,
  useDisputes,
  useMarkDisputeChecked,
  useRecordGroupOutcome,
  useRecordMemoDisputeOutcome,
  useSetDisputeDraft,
  useSetGroupNotPursued,
} from './api'
import {
  FINDING_FILTER_KEYS,
  disputeSections,
  filterGroups,
  memoDisputeItems,
  serviceList,
  splitFindings,
  titleCase,
  workspaceSummary,
} from './derive'
import { FindingCard } from './FindingCard'
import { DisputeCard } from './DisputeCard'
import { SelectionBar } from './SelectionBar'
import { ReviewSendModal } from './ReviewSendModal'
import { PackagesModal } from './PackagesModal'
import { ReportPreviewModal } from './ReportPreviewModal'

const VARIANCE_TIP =
  'Only packages that were charged more than your contract allows — not all invoices and spend reviewed in this audit period.'

const DISPUTE_STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as GroupStatusKey[]).map((k) => ({ value: k, label: STATUS_LABELS[k] }))

/** Dialogs that deep links (tracker CTAs, activity entries) can open. */
const MODAL_PARAMS = ['send'] as const
type ModalParam = (typeof MODAL_PARAMS)[number]

const EYEBROW_ACCENT: CSSProperties = {
  font: 'var(--ds-weight-semi) 12px/1.3 var(--ds-font)',
  letterSpacing: 'var(--ds-tracking-caption)',
  textTransform: 'uppercase',
  color: 'var(--ds-fg-accent-text)',
}

const SURFACE_BORDER = '1px solid var(--ds-stroke-disabled)'

export function SummaryTab({
  detail,
  onDownloadExcel,
}: {
  detail: MemoDetail
  onDownloadExcel: () => void
}) {
  const clock = useClock()
  const memo = detail.memo
  const ctxQ = useDisputeContext(memo.id)
  const disputesQ = useDisputes(memo.id)
  const setDraft = useSetDisputeDraft()
  const setNotPursued = useSetGroupNotPursued()
  const recordGroupOutcome = useRecordGroupOutcome()
  const recordMemoOutcome = useRecordMemoDisputeOutcome()
  const markChecked = useMarkDisputeChecked()
  const [filterValues, setFilterValues] = useState<FilterValues>({})
  const [showSmaller, setShowSmaller] = useState(false)
  const [methodOpen, setMethodOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [packagesFor, setPackagesFor] = useState<FindingGroup | null>(null)

  // Review & send lives in the URL so tracker links can open it; closing
  // removes the parameter, so switching tabs doesn't reopen it. Links to a
  // memo's outcomes or dispute record scroll to the dispute cards instead.
  const [params, setParams] = useSearchParams()
  const [detailsFromLink] = useState(() => params.has('dispute'))
  const disputeLink = params.has('outcomes') || params.has('dispute')
  useEffect(() => {
    if (!disputeLink || !disputesQ.data) return
    document.getElementById('disputes')?.scrollIntoView({ block: 'start' })
    setParams(
      (p) => {
        p.delete('outcomes')
        p.delete('dispute')
        return p
      },
      { replace: true },
    )
  }, [disputeLink, disputesQ.data, setParams])

  const modal = MODAL_PARAMS.find((k) => params.has(k)) ?? null
  const openModal = (key: ModalParam) =>
    setParams(
      (p) => {
        for (const k of MODAL_PARAMS) p.delete(k)
        p.set(key, '1')
        return p
      },
      { replace: true },
    )
  const closeModal = () => {
    setParams(
      (p) => {
        for (const k of MODAL_PARAMS) p.delete(k)
        return p
      },
      { replace: true },
    )
  }

  const now = clock.now()
  const groups = detail.findingGroups
  const filterFields: FilterField[] = [
    {
      key: FINDING_FILTER_KEYS.carrier,
      label: 'Carrier',
      options: [...new Set(groups.flatMap((g) => g.carriers))].sort().map((v) => ({ value: v, label: v })),
    },
    {
      key: FINDING_FILTER_KEYS.service,
      label: 'Service level',
      options: [...new Set(groups.flatMap(serviceList))].sort().map((v) => ({ value: v, label: titleCase(v) })),
    },
    { key: FINDING_FILTER_KEYS.disputeStatus, label: 'Status', options: DISPUTE_STATUS_OPTIONS },
  ]
  const filters = useFilters(filterFields, filterValues, setFilterValues)

  if (detail.auditProcessing) {
    return (
      <div className="db-card" style={{ padding: '56px 32px' }}>
        <EmptyState
          media={<Spinner size={44} label="Audit in progress" />}
          title="Audit in progress"
          subtitle={`Implentio is reviewing invoices for ${memo.period}. Findings appear here once an Implentio reviewer has approved them.`}
        />
      </div>
    )
  }

  if (!ctxQ.data || !disputesQ.data) return null
  const { excludedIds, draftDate } = ctxQ.data
  const disputes = disputesQ.data
  const wholeMemo = detail.findingsUnavailable
  const hasFindings = groups.length > 0 && !wholeMemo

  const items = memoDisputeItems(detail, disputes)
  // A whole-memo dispute has no finding selection, so no draft.
  const status = memoStatus(items, { draft: wholeMemo ? null : { excludedIds, draftDate }, now })
  const summary = workspaceSummary({
    status,
    provider: memo.provider,
    totalN: memo.netN ?? 0,
    foundText: `Found across ${memo.orders != null ? plural(memo.orders, 'package') : '— packages'} on ${memo.invoices != null ? plural(memo.invoices, 'invoice') : '— invoices'}`,
    wholeMemo,
    hasDisputes: disputes.length > 0,
  })
  const deadline =
    status?.nextDeadline && status.daysLeft != null
      ? `Dispute by ${fmtDateLong(status.nextDeadline)} · ${countdownText(status.daysLeft)}`
      : null
  const sections = disputeSections(detail, disputes)
  const auditedInvoices = (memo.invoices ?? 0) + (memo.invoicesNoVariance ?? 0)

  const openGroups = groups.filter((g) => findingPhase(g, now) === 'open')
  const isSelected = (g: FindingGroup) => !excludedIds.includes(g.id)
  const selectedGroups = openGroups.filter(isSelected).sort((a, b) => b.varN - a.varN)
  const filtersActive = Object.values(filterValues).some((v) => (v?.length ?? 0) > 0)
  const groupsFiltered = filterGroups(groups, filterValues, excludedIds, memo.provider, now)
  const { visible, hidden } = splitFindings(groupsFiltered, { showAll: filtersActive })
  const hiddenSelected = hidden.filter((g) => findingPhase(g, now) === 'open' && isSelected(g)).length

  const saveOutcome = (rowId: string, collection: Collection) => {
    if (wholeMemo) recordMemoOutcome.mutate({ disputeId: rowId, collection })
    else recordGroupOutcome.mutate({ groupId: rowId, collection })
  }
  const jumpToFinding = (id: string) => {
    if (hidden.some((g) => g.id === id)) setShowSmaller(true)
    // Next frame, so a card just revealed from "smaller findings" is in the DOM.
    requestAnimationFrame(() => {
      const el = document.getElementById(`finding-${id}`)
      if (!el) return
      const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      // Move focus with the view so keyboard and screen-reader users land on the finding.
      el.focus({ preventScroll: true })
      el.classList.remove('ia-flash')
      requestAnimationFrame(() => el.classList.add('ia-flash'))
      setTimeout(() => el.classList.remove('ia-flash'), 1500)
    })
  }
  // The summary lists the big findings; the rest fold into one row.
  const tableSplit = splitFindings(groups, { showAll: false })
  const smallerInTable = tableSplit.hidden
  const summaryRows = wholeMemo
    ? items.map((i) => ({ id: i.id, title: i.title, amountN: i.amountN, status: groupStatusLine(i, now), jump: false }))
    : [...tableSplit.visible, ...(showSmaller ? smallerInTable : [])].map((g) => ({
        id: g.id,
        title: findingProblem(g),
        amountN: g.varN,
        status: groupStatusLine({ ...g, amountN: g.varN, threePl: memo.provider }, now),
        jump: true,
      }))
  const buckets = recoveryBuckets(items, now)
  // Where the money is, once it's split more than one way.
  const moneyBuckets = disputes.length > 0 ? RECOVERY_BUCKETS.filter((b) => buckets[b.key] > 0.005) : []

  const toggleSelected = (groupId: string, on: boolean) => {
    const next = on ? excludedIds.filter((id) => id !== groupId) : [...excludedIds, groupId]
    setDraft.mutate({ excludedIds: next, draftDate: on ? (draftDate ?? fmtDateShort(now)) : draftDate })
  }
  const clearSelection = () => setDraft.mutate({ excludedIds: groups.map((g) => g.id), draftDate: null })

  const findingCard = (g: FindingGroup) => (
    <FindingCard
      key={g.id}
      group={g}
      provider={memo.provider}
      selected={isSelected(g)}
      now={now}
      onToggleSelected={toggleSelected}
      onSetNotPursued={(id, notPursued) => setNotPursued.mutate({ groupId: id, notPursued })}
      onOpenPackages={setPackagesFor}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {memo.changeSummary && (
        <Banner
          type="info"
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {memo.report === 'updated' && <StatusChip tone="info">Updated</StatusChip>}
              {memo.version} · {memo.updatedText ?? memo.completedText}
            </span>
          }
        >
          <strong className="ds-w-semi">What changed:</strong> {memo.changeSummary}
        </Banner>
      )}

      {memo.allNoVariance ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-bg-success-muted)', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-fg-success)' }}>
            <CheckCircleIcon width={20} height={20} aria-hidden="true" style={{ flex: 'none' }} />
            <span style={{ ...EYEBROW_ACCENT, color: 'var(--ds-fg-success)' }}>All clear</span>
          </div>
          <p className="ds-heading-small" style={{ margin: 0 }}>
            No overcharges found. All {plural(auditedInvoices, 'invoice')} in this audit matched your contract closely enough to need no action.
          </p>
        </div>
      ) : (
        <section
          aria-label="Summary"
          className="ia-memo-summary"
          style={{ display: 'grid', gridTemplateColumns: '34fr 66fr', border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-orange-100)', boxShadow: 'var(--ds-shadow-disabled)', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 26px', minWidth: 0 }}>
            {status && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap', marginBottom: 4 }}>
                <StatusChip tone={MEMO_STATUS_TONE[status.key]}>{status.label}</StatusChip>
                {deadline && (
                  <span className="ds-body-small ds-w-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <ClockIcon width={16} height={16} aria-hidden="true" style={{ flex: 'none' }} />
                    {deadline}
                  </span>
                )}
              </div>
            )}
            {summary && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={EYEBROW_ACCENT}>{summary.hero.label}</span>
                  {summary.hero.label === 'Total overcharged' && <InfoTip text={VARIANCE_TIP} color="var(--ds-fg-accent-text)" />}
                </div>
                <div style={{ font: 'var(--ds-weight-semi) clamp(30px, 3vw, 40px)/1.05 var(--ds-font)', fontVariantNumeric: 'tabular-nums', letterSpacing: 'var(--ds-tracking-heading)', color: 'var(--ds-fg-accent-text)', whiteSpace: 'nowrap' }}>
                  {fmtMoney(summary.hero.amountN)}
                </div>
                <div className="ds-body-small ds-muted">{summary.hero.context}</div>
              </>
            )}
            {moneyBuckets.length > 1 && (
              <ul aria-label="Where the money is" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', margin: 0, padding: 0, listStyle: 'none' }}>
                {moneyBuckets.map((b) => (
                  <li key={b.key} className="ds-body-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 'var(--ds-radius-full)', background: TONE_CHART_COLOR[BUCKET_TONE[b.key]], flex: 'none' }} />
                    {b.label} <span className="ds-w-semi" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(buckets[b.key])}</span>
                  </li>
                ))}
              </ul>
            )}
            {summary && (
              <p className="ds-body-base ds-w-medium" style={{ margin: '4px 0 0' }}>
                {summary.sentence}
              </p>
            )}
            {summary?.action === 'send' && (
              <Button variant="primary" iconLeft={<PaperAirplaneIcon aria-hidden="true" />} onClick={() => openModal('send')} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                Review &amp; send
              </Button>
            )}
          </div>
          <div className="ia-memo-rollup" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '18px 22px', background: 'var(--ds-bg-default)', borderInlineStart: SURFACE_BORDER, minWidth: 0 }}>
            <div className="ds-heading-tiny">{wholeMemo ? 'What you’ll dispute' : 'Biggest findings'}</div>
            <TableScroll>
              <Table style={{ minWidth: 440 }}>
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th className="num">Overcharged</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.jump ? (
                          <Link variant="accent" bold onClick={() => jumpToFinding(r.id)}>
                            {r.title}
                          </Link>
                        ) : (
                          <span className="ds-w-semi">{r.title}</span>
                        )}
                      </td>
                      <td className="num" style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600 }}>
                        {fmtMoney(r.amountN)}
                      </td>
                      <td>
                        <StatusChip tone={GROUP_STATUS_TONE[r.status.key]}>{r.status.label}</StatusChip>
                      </td>
                    </tr>
                  ))}
                  {smallerInTable.length > 0 && (
                    <tr>
                      <td colSpan={3}>
                        <Link variant="accent" size="small" bold aria-expanded={showSmaller} onClick={() => setShowSmaller((v) => !v)}>
                          {showSmaller ? 'Hide' : 'Show'} {plural(smallerInTable.length, 'smaller finding')} ({fmtMoney(smallerInTable.reduce((a, g) => a + g.varN, 0))} in total)
                        </Link>
                      </td>
                    </tr>
                  )}
                  {summaryRows.length > 1 && (
                    <tr className="total-row">
                      <td>Total</td>
                      <td className="num" style={{ color: 'var(--ds-fg-accent-text)' }}>
                        {fmtMoney(memo.netN ?? 0)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </TableScroll>
          </div>
        </section>
      )}

      {sections.length > 0 && (
        <div id="disputes" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 88 }}>
          <h3 className="db-h3" style={{ margin: 0 }}>
            {plural(sections.length, 'dispute')} sent
          </h3>
          {[...sections].reverse().map((sec) => (
            <DisputeCard
              key={sec.record.id}
              section={sec}
              detailsOpen={detailsFromLink}
              activityHref={`/memos/${memo.id}/activity${params.toString() ? `?${params.toString()}` : ''}`}
              onRecord={saveOutcome}
              onNoReply={() => markChecked.mutate(sec.record.id)}
              onJump={jumpToFinding}
              onDownloadEvidence={onDownloadExcel}
            />
          ))}
        </div>
      )}

      {!memo.allNoVariance && (
        <div id="findings" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', borderTop: SURFACE_BORDER, paddingTop: 20 }}>
            <div>
              <h3 className="db-h3" style={{ margin: 0 }}>
                Findings
              </h3>
              <p className="imp-small" style={{ margin: '6px 0 0' }}>
                {hasFindings && openGroups.length > 0 ? 'Biggest first. Tick the ones you want to dispute.' : 'Biggest first.'}{' '}
                <Link variant="accent" size="small" bold onClick={() => setMethodOpen(true)}>
                  How findings are calculated
                </Link>
              </p>
            </div>
            {hasFindings && <FilterButton filters={filters} />}
          </div>
          {hasFindings && <FilterGroup filters={filters} />}

          {wholeMemo && (
            <div className="db-card" style={{ padding: '32px' }}>
              <EmptyState
                media={<img src="/brand/empty-state.png" alt="" style={{ width: 200, height: 'auto', opacity: 0.55 }} />}
                title="Detailed breakdown unavailable"
                subtitle="Implentio reviews every finding before it appears here. A breakdown isn’t available for this credit memo, so the complete credit memo is disputed as one. You can still download the full report."
              />
            </div>
          )}
          {!wholeMemo && groups.length === 0 && (
            <div className="db-card" style={{ padding: '32px', background: 'var(--ds-bg-success-muted)' }}>
              <EmptyState
                media={
                  <span style={{ width: 56, height: 56, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-default)', color: 'var(--ds-icon-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircleIcon width={28} height={28} aria-hidden="true" />
                  </span>
                }
                title="No overcharges found"
                subtitle={`All ${plural(auditedInvoices, 'invoice')} in this audit matched your contract closely enough to need no action.`}
              />
            </div>
          )}
          {hasFindings && groupsFiltered.length === 0 && (
            <div className="db-card" style={{ padding: 0 }}>
              <EmptyState
                title="No findings match these filters"
                subtitle="Filtering changes this view only, not the credit memo or its total."
                action={
                  <Button size="small" onClick={filters.clear}>
                    Clear filters
                  </Button>
                }
              />
            </div>
          )}

          {visible.map(findingCard)}
          {hidden.length > 0 && (
            <>
              <button
                type="button"
                className="db-card"
                aria-expanded={showSmaller}
                onClick={() => setShowSmaller((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'start', font: 'inherit', color: 'var(--ds-fg-default)' }}
              >
                {showSmaller ? <ChevronUpIcon width={18} height={18} aria-hidden="true" /> : <ChevronDownIcon width={18} height={18} aria-hidden="true" />}
                <span className="ds-body-base ds-w-semi">
                  {showSmaller ? 'Hide' : 'Show'} {plural(hidden.length, 'smaller finding')} ({fmtMoney(hidden.reduce((s, g) => s + g.varN, 0))} in total)
                </span>
                {hiddenSelected > 0 && <span className="imp-small" style={{ margin: 0 }}>{hiddenSelected} selected</span>}
              </button>
              {showSmaller && hidden.map(findingCard)}
            </>
          )}
        </div>
      )}

      <div className="db-card">
        <div className="db-card-head">
          <div>
            <h3 className="db-h3">Latest report</h3>
            <p className="imp-small" style={{ margin: '4px 0 0' }}>
              {memo.version} · {memo.period} · {memo.completedText}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '12px 16px', border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-bg-brand-disabled)' }}>
          <div className="ds-body-base">
            Total overcharge in this report{' '}
            <strong style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{memo.netN == null ? '—' : fmtMoney(memo.netN)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
            <Button size="small" onClick={onDownloadExcel}>
              Download credit memo
            </Button>
            <Button size="small" variant="primary" onClick={() => setReportOpen(true)}>
              Review summary
            </Button>
          </div>
        </div>
      </div>

      {status?.hasDraft && !wholeMemo && modal !== 'send' && (
        <SelectionBar
          count={status.selected.count}
          amountN={status.selected.amountN}
          deadline={deadline}
          onReview={() => openModal('send')}
          onClear={clearSelection}
        />
      )}

      <Modal open={methodOpen} onClose={() => setMethodOpen(false)} title="How findings are calculated" width={640}>
        <p className="imp-small" style={{ margin: 0 }}>
          Implentio works out what every package should have cost from its shipment details — carrier, service level, zone, billed weight, and surcharges — using your contracted rates, then compares that with what your Biller charged.
        </p>
        <p className="imp-small" style={{ margin: 0 }}>
          Packages with the same kind of difference are grouped into one finding. Charges billed below contract are netted against the others on the same package, and only packages that were overcharged overall are included.
        </p>
        <p className="imp-small" style={{ margin: 0 }}>
          Every finding links to its packages, the rates used, and the invoice records that show what was billed.
        </p>
      </Modal>

      {modal === 'send' && (
        <ReviewSendModal detail={detail} groups={wholeMemo ? [] : selectedGroups} openCount={openGroups.length} onChange={closeModal} onClose={closeModal} />
      )}
      {packagesFor && <PackagesModal group={packagesFor} onExport={onDownloadExcel} onClose={() => setPackagesFor(null)} />}
      {reportOpen && <ReportPreviewModal detail={detail} onClose={() => setReportOpen(false)} onDownload={onDownloadExcel} />}
    </div>
  )
}
