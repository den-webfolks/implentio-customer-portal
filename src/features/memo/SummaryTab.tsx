/** Memo detail — Summary & Findings tab (template ~4608–5184). */
import { useState, type CSSProperties } from 'react'
import { CheckCircleIcon, CheckIcon, ClockIcon, EyeIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import type { MemoDetail } from '@/domain/types'
import { useClock } from '@/lib/clock'
import { fmtMoney } from '@/domain/money'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { EmptyState, Spinner } from '@/ui/Display/Display'
import { Select } from '@/ui/Form/Select'
import { Table, TableScroll } from '@/ui/Table/Table'
import { FilterButton, FilterGroup, useFilters, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { useDisputeContext, useSetDisputeDraft, useIncludeInAnotherRequest } from './api'
import { CHARGE_DEFS, FINDING_FILTER_KEYS, filterGroups, memoRollupRows, nextStepCard, recoveryStatus, serviceList, titleCase } from './derive'
import { FindingCard } from './FindingCard'
import { DisputeWizard } from './DisputeWizard'
import { ReportPreviewModal } from './ReportPreviewModal'
import { OutcomeModal } from './OutcomeModal'

const VARIANCE_TIP =
  'These amounts include only packages with significant variance—not all invoices and spend reviewed during this audit period.'
const RECOVERY_TIP =
  'Collected, declined, awaiting, and eligible amounts add up to the total variance identified.'

const DISPUTE_STATUS_OPTIONS = [
  { value: 'eligible', label: 'Eligible to pursue' },
  { value: 'awaiting_outcome', label: 'Awaiting outcome' },
  { value: 'fully_collected', label: 'Fully collected' },
  { value: 'partly_collected', label: 'Partly collected' },
  { value: 'declined', label: 'Biller declined' },
]

const NO_HIGHLIGHT = 'all'

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
  const ctxQ = useDisputeContext()
  const setDraft = useSetDisputeDraft()
  const includeAgain = useIncludeInAnotherRequest()
  const [filterValues, setFilterValues] = useState<FilterValues>({})
  const [hl, setHl] = useState<string>(NO_HIGHLIGHT)
  const [methodOpen, setMethodOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(
    () => new URLSearchParams(window.location.search).get('prep') === '1',
  )
  const [outcomesOpen, setOutcomesOpen] = useState(
    () => new URLSearchParams(window.location.search).get('outcomes') === '1',
  )

  const memo = detail.memo
  const now = clock.now()
  const allGroups = memo.detailAvailable || detail.findingGroups.length ? detail.findingGroups : []
  const filterFields: FilterField[] = [
    {
      key: FINDING_FILTER_KEYS.carrier,
      label: 'Carrier',
      options: [...new Set(allGroups.flatMap((g) => g.carriers))].sort().map((v) => ({ value: v, label: v })),
    },
    {
      key: FINDING_FILTER_KEYS.service,
      label: 'Service level',
      options: [...new Set(allGroups.flatMap(serviceList))].sort().map((v) => ({ value: v, label: titleCase(v) })),
    },
    { key: FINDING_FILTER_KEYS.disputeStatus, label: 'Dispute status', options: DISPUTE_STATUS_OPTIONS },
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

  if (!ctxQ.data) return null
  const excludedIds = ctxQ.data.excludedIds
  const groups = allGroups
  const hasFindings = groups.length > 0 && !detail.findingsUnavailable

  const recovery = memo.detailAvailable ? recoveryStatus(groups, now) : null
  const nextStep = memo.detailAvailable
    ? nextStepCard({
        findingGroups: groups,
        findingsUnavailable: detail.findingsUnavailable,
        memoDisputeStatus: ctxQ.data.memoDisputeStatus,
        excludedIds,
        provider: memo.provider,
        now,
      })
    : null
  const rollup = memoRollupRows(detail)

  const groupsFiltered = filterGroups(groups, filterValues, excludedIds, memo.provider, now)
  const hlLabel = hl === NO_HIGHLIGHT ? null : CHARGE_DEFS.find((c) => c[0] === hl)?.[2]
  const auditedInvoices = (memo.invoices ?? 0) + (memo.invoicesNoVariance ?? 0)

  const scrollToFinding = (anchor: string) => {
    const el = document.getElementById(anchor)
    if (!el) return
    const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    // Move focus with the view so keyboard and screen-reader users land on the finding.
    el.focus({ preventScroll: true })
    el.classList.remove('ia-flash')
    requestAnimationFrame(() => el.classList.add('ia-flash'))
    setTimeout(() => el.classList.remove('ia-flash'), 1500)
  }

  const toggleInclusion = (groupId: string, include: boolean) => {
    const next = include ? excludedIds.filter((id) => id !== groupId) : [...excludedIds, groupId]
    setDraft.mutate({ excludedIds: next, draftDate: ctxQ.data.draftDate })
  }

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

      <div className="db-eyebrow">Credit memo summary</div>

      {!memo.allNoVariance ? (
        <div className="ia-memo-summary" style={{ display: 'grid', gridTemplateColumns: '34fr 66fr', border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-orange-100)', boxShadow: 'var(--ds-shadow-disabled)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '28px 30px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={EYEBROW_ACCENT}>Total variance identified</span>
              <InfoTip text={VARIANCE_TIP} color="var(--ds-fg-accent-text)" />
            </div>
            <div style={{ font: 'var(--ds-weight-semi) clamp(34px, 3.6vw, 48px)/1.05 var(--ds-font)', fontVariantNumeric: 'tabular-nums', letterSpacing: 'var(--ds-tracking-heading)', color: 'var(--ds-fg-accent-text)', whiteSpace: 'nowrap' }}>
              {memo.netN == null ? '—' : fmtMoney(memo.netN)}
            </div>
            <div className="ds-body-base ds-muted">
              Found across {memo.orders?.toLocaleString('en-US') ?? '—'} packages on {memo.invoices ?? '—'} invoices
            </div>
            {memo.invoicesNoVariance != null && memo.invoicesNoVariance > 0 && (
              <div className="ds-body-small" style={{ color: 'var(--ds-fg-muted)' }}>
                {auditedInvoices} invoices audited · {memo.invoicesNoVariance} had no significant variance
              </div>
            )}
            {recovery && (
              <div style={{ borderTop: SURFACE_BORDER, marginTop: 6, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={EYEBROW_ACCENT}>{recovery.eyebrow}</span>
                  <InfoTip text={RECOVERY_TIP} color="var(--ds-fg-accent-text)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
                    <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ds-bg-default)" strokeWidth="16" />
                      {recovery.slices.map((s) => (
                        <circle key={s.label} cx="60" cy="60" r="50" fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} />
                      ))}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                      <div className="ds-heading-tiny" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {recovery.total}
                      </div>
                      <div className="ds-caption-tiny ds-muted">Total identified</div>
                    </div>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 160px', minWidth: 150, margin: 0, padding: 0, listStyle: 'none' }}>
                    {recovery.slices.map((s) => (
                      <li key={s.label} className="ds-body-base" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 'var(--ds-radius-full)', background: s.color, flex: 'none' }} />
                        <span style={{ flex: '1 1 auto', minWidth: 0 }}>{s.label}</span>
                        <span className="ds-w-semi" style={{ fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                          {s.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div className="ia-memo-rollup" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '22px 26px 20px', background: 'var(--ds-bg-default)', borderInlineStart: SURFACE_BORDER, minWidth: 0 }}>
            <div>
              <div className="ds-heading-tiny">Variance groups in this credit memo</div>
              <p className="imp-small" style={{ margin: '4px 0 0' }}>
                See how the total variance is distributed across the groups explained below.
              </p>
            </div>
            <TableScroll>
              <Table style={{ minWidth: 520 }}>
                <thead>
                  <tr>
                    <th>Variance group</th>
                    <th className="num">Net variance</th>
                    <th className="num">Packages</th>
                    <th className="num">Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {rollup.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link variant="accent" bold onClick={() => scrollToFinding(r.anchor)}>
                          {r.title}
                        </Link>
                      </td>
                      <td className="num" style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600 }}>
                        {r.amount}
                      </td>
                      <td className="num">{r.packages}</td>
                      <td className="num">{r.invoices}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total</td>
                    <td className="num" style={{ color: 'var(--ds-fg-accent-text)' }}>
                      {memo.netN == null ? '—' : fmtMoney(memo.netN)}
                    </td>
                    <td className="num">{memo.orders?.toLocaleString('en-US') ?? '—'}</td>
                    <td className="num">{memo.invoices ?? '—'}</td>
                  </tr>
                </tbody>
              </Table>
            </TableScroll>
            <p className="ds-body-small" style={{ margin: 0, color: 'var(--ds-fg-muted)' }}>
              Invoice counts are distinct per group; one invoice can appear in several groups, so the rows do not sum.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '34fr 66fr', border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-bg-success-muted)', boxShadow: 'var(--ds-shadow-disabled)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '28px 30px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-fg-success)' }}>
              <CheckCircleIcon width={20} height={20} aria-hidden="true" style={{ flex: 'none' }} />
              <span style={{ ...EYEBROW_ACCENT, color: 'var(--ds-fg-success)' }}>No significant variance identified</span>
            </div>
            <div className="ds-heading-xlarge">{auditedInvoices} invoices audited</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '22px 26px', background: 'var(--ds-bg-default)', borderInlineStart: SURFACE_BORDER }}>
            <div className="ds-heading-tiny">All clear</div>
            <p className="imp-small" style={{ margin: 0 }}>
              All {auditedInvoices} invoices in this audit were reviewed and were within the significant-variance threshold.
            </p>
          </div>
        </div>
      )}

      {nextStep && (
        <div style={{ border: SURFACE_BORDER, borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-bg-brand-disabled)', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ width: 56, height: 56, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-default)', color: 'var(--ds-icon-brand-emphasis)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            {nextStep.resolvedTreatment ? <CheckIcon width={24} height={24} aria-hidden="true" /> : <PaperAirplaneIcon width={24} height={24} aria-hidden="true" />}
          </span>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="imp-eyebrow" style={{ marginBottom: 4 }}>
              {nextStep.eyebrow}
            </div>
            <div className="ds-heading-medium">{nextStep.heading}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {nextStep.lines.map((ln) => (
                <div key={ln.text} className="ds-body-base ds-w-medium" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ds-fg-brand-emphasis)' }}>
                  {ln.icon === 'prep' && <PaperAirplaneIcon width={16} height={16} aria-hidden="true" style={{ flex: 'none' }} />}
                  {ln.icon === 'clock' && <ClockIcon width={16} height={16} aria-hidden="true" style={{ flex: 'none' }} />}
                  {ln.icon === 'check' && <CheckIcon width={16} height={16} aria-hidden="true" style={{ flex: 'none' }} />}
                  <span>{ln.text}</span>
                </div>
              ))}
            </div>
            {nextStep.description && (
              <p className="imp-small" style={{ margin: '6px 0 0', maxWidth: '64ch' }}>
                {nextStep.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', flex: 'none', minWidth: 220 }}>
            {nextStep.actions.map((act) => {
              const onClick = () => {
                if (act.kind === 'prep') setWizardOpen(true)
                else setOutcomesOpen(true)
              }
              if (act.variant === 'primary')
                return (
                  <Button
                    key={act.label}
                    variant="primary"
                    iconLeft={act.kind === 'prep' ? <PaperAirplaneIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
                    onClick={onClick}
                  >
                    {act.label}
                  </Button>
                )
              if (act.variant === 'secondary')
                return (
                  <Button key={act.label} variant="emphasis" onClick={onClick}>
                    {act.label}
                  </Button>
                )
              return (
                <Link key={act.label} variant="accent" underline className="ds-w-medium" onClick={onClick} style={{ alignSelf: 'center' }}>
                  {act.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderTop: SURFACE_BORDER, paddingTop: 20 }}>
        <div style={{ maxWidth: '72ch' }}>
          <h3 className="db-h3" style={{ margin: 0 }}>
            Findings
          </h3>
          <p className="imp-small" style={{ margin: '6px 0 0' }}>
            Implentio rebuilds what each package should have cost using its shipment details and your contracted rates, then compares that amount with what you were billed. When the same supported difference appears across multiple packages, we group those packages into a finding below.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Button size="small" onClick={() => setMethodOpen(true)}>
              Learn how findings are calculated
            </Button>
          </div>
        </div>
      </div>

      {detail.findingsUnavailable && (
        <div className="db-card" style={{ padding: '32px' }}>
          <EmptyState
            media={<img src="/brand/empty-state.png" alt="" style={{ width: 200, height: 'auto', opacity: 0.55 }} />}
            title="Detailed breakdown unavailable"
            subtitle="Before finding details appear in the platform, each variance group is reviewed by Implentio to ensure it meets our quality standards. A detailed breakdown is not available for this credit memo, but you can still download the complete report."
          />
        </div>
      )}
      {!detail.findingsUnavailable && groups.length === 0 && (
        <div className="db-card" style={{ padding: '32px', background: 'var(--ds-bg-success-muted)' }}>
          <EmptyState
            media={
              <span style={{ width: 56, height: 56, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-default)', color: 'var(--ds-icon-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircleIcon width={28} height={28} aria-hidden="true" />
              </span>
            }
            title="No significant variance identified"
            subtitle={`All ${auditedInvoices} invoices in this audit were reviewed and were within the significant-variance threshold.`}
          />
        </div>
      )}

      {hasFindings && (
        <div className="db-card" style={{ gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FilterButton filters={filters} />
            <Select
              aria-label="Highlight charge"
              size="small"
              value={hl}
              onValueChange={setHl}
              options={[{ value: NO_HIGHLIGHT, label: 'All charges' }, ...CHARGE_DEFS.map((c) => ({ value: c[0], label: `Highlight ${c[2].toLowerCase()}` }))]}
            />
            <span className="imp-small" style={{ margin: 0, marginInlineStart: 'auto' }} aria-live="polite">
              Showing {groupsFiltered.length} of {groups.length} findings
            </span>
          </div>
          <FilterGroup filters={filters} />
        </div>
      )}

      {hl !== NO_HIGHLIGHT && hasFindings && (
        <Banner type="warning" title="Highlighted charges help explain the finding. Package totals include all charge differences and remain unchanged." />
      )}

      {hasFindings && groupsFiltered.length === 0 && (
        <div className="db-card" style={{ padding: 0 }}>
          <EmptyState
            title="No findings match these filters"
            subtitle="Filtering refines this view only. It does not change which findings belong to the credit memo or recalculate its Total variance."
          />
        </div>
      )}

      {groupsFiltered.map((g) => (
        <FindingCard
          key={g.id}
          group={g}
          provider={memo.provider}
          excludedIds={excludedIds}
          highlightedCharge={hl}
          highlightLabel={hlLabel ?? null}
          now={now}
          onToggleInclusion={toggleInclusion}
          onIncludeInAnotherRequest={(id) => includeAgain.mutate(id)}
        />
      ))}

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
            Total variance in this report{' '}
            <strong style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{memo.netN == null ? '—' : fmtMoney(memo.netN)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
            <Button size="small" onClick={onDownloadExcel}>
              Download credit memo
            </Button>
            <Button size="small" variant="emphasis" onClick={() => setReportOpen(true)}>
              Review summary
            </Button>
          </div>
        </div>
      </div>

      <Modal open={methodOpen} onClose={() => setMethodOpen(false)} title="How findings are calculated" width={640}>
        <p className="imp-small" style={{ margin: 0 }}>
          Implentio rebuilds the expected cost of every package from its shipment facts — carrier, service level, zone, billed weight, and surcharges — using your contracted rate cards, then compares that expected amount with what your Biller invoiced.
        </p>
        <p className="imp-small" style={{ margin: 0 }}>
          Packages with the same supported difference are grouped into a finding. Favourable charge differences are netted against unfavourable differences on the same package, and only net-unfavourable packages are published.
        </p>
        <p className="imp-small" style={{ margin: 0 }}>
          Every finding links to its contributing packages, the rate cards used to rebuild expected charges, and the invoice records that show what was billed.
        </p>
      </Modal>

      {wizardOpen && <DisputeWizard detail={detail} excludedIds={excludedIds} onClose={() => setWizardOpen(false)} />}
      {outcomesOpen && <OutcomeModal detail={detail} onClose={() => setOutcomesOpen(false)} />}
      {reportOpen && <ReportPreviewModal detail={detail} onClose={() => setReportOpen(false)} onDownload={onDownloadExcel} />}
    </div>
  )
}
