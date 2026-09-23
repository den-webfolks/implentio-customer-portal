/** Memo detail — Summary & Findings tab (template ~4608–5184). */
import { useState } from 'react'
import type { MemoDetail } from '@/domain/types'
import { useClock } from '@/lib/clock'
import { fmtMoney } from '@/domain/money'
import { InfoTip } from '@/ui/InfoTip'
import { Modal } from '@/ui/Modal/Modal'
import { useDisputeContext, useSetDisputeDraft, useIncludeInAnotherRequest } from './api'
import {
  CHARGE_DEFS,
  filterGroups,
  INITIAL_FINDING_FILTERS,
  memoRollupRows,
  nextStepCard,
  recoveryStatus,
  serviceList,
  titleCase,
  type FindingFilters,
} from './derive'
import { FindingCard } from './FindingCard'
import { DisputeWizard } from './DisputeWizard'
import { OutcomeModal } from './OutcomeModal'

const VARIANCE_TIP =
  'These amounts include only packages with significant variance—not all invoices and spend reviewed during this audit period.'
const RECOVERY_TIP =
  'Collected, declined, awaiting, and eligible amounts add up to the total variance identified.'

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
  const [filters, setFilters] = useState<FindingFilters>(INITIAL_FINDING_FILTERS)
  const [methodOpen, setMethodOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(
    () => new URLSearchParams(window.location.search).get('prep') === '1',
  )
  const [outcomesOpen, setOutcomesOpen] = useState(
    () => new URLSearchParams(window.location.search).get('outcomes') === '1',
  )

  const memo = detail.memo
  const now = clock.now()

  if (detail.auditProcessing) {
    return (
      <div className="db-card db-empty" style={{ alignItems: 'center', textAlign: 'center', padding: '56px 32px' }}>
        <div style={{ width: 44, height: 44, border: '4px solid var(--imp-gray-200)', borderTopColor: 'var(--imp-purple-500)', borderRadius: 999, animation: 'imp-spin 0.9s linear infinite', marginBottom: 16 }} />
        <h3 className="db-h3">Audit in progress</h3>
        <p className="imp-small" style={{ maxWidth: '46ch' }}>
          Implentio is reviewing invoices for {memo.period}. Findings appear here once an Implentio
          reviewer has approved them.
        </p>
      </div>
    )
  }

  if (!ctxQ.data) return null
  const excludedIds = ctxQ.data.excludedIds
  const groups = memo.detailAvailable || detail.findingGroups.length ? detail.findingGroups : []
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

  const groupsFiltered = filterGroups(groups, filters, excludedIds, memo.provider, now)
  const activeFilterCount = Object.values(filters).filter((v) => v !== 'all').length
  const carrierOpts = [...new Set(groups.flatMap((g) => g.carriers))].sort()
  const serviceOpts = [...new Set(groups.flatMap(serviceList))].sort()
  const hl = filters.fCategory
  const hlLabel = hl === 'all' ? null : CHARGE_DEFS.find((c) => c[0] === hl)?.[2]

  const scrollToFinding = (anchor: string) => {
    const el = document.getElementById(anchor)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.classList.remove('ia-flash')
    requestAnimationFrame(() => el.classList.add('ia-flash'))
    setTimeout(() => el.classList.remove('ia-flash'), 1500)
  }

  const toggleInclusion = (groupId: string, include: boolean) => {
    const next = include ? excludedIds.filter((id) => id !== groupId) : [...excludedIds, groupId]
    setDraft.mutate({ excludedIds: next, draftDate: ctxQ.data.draftDate })
  }

  const filterSelect = (
    key: keyof FindingFilters,
    allLabel: string,
    options: { value: string; label: string }[],
  ) => (
    <select
      className="ia-input"
      value={filters[key]}
      style={{
        padding: '8px 10px',
        ...(filters[key] !== 'all'
          ? { borderColor: 'var(--imp-purple-400)', boxShadow: '0 0 0 1px var(--imp-purple-200)' }
          : {}),
      }}
      onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {memo.changeSummary && (
        <div className="db-card" style={{ gap: 12, borderColor: 'var(--imp-purple-300)', background: 'var(--imp-purple-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {memo.report === 'updated' && (
              <span style={{ background: 'var(--imp-purple-500)', color: '#fff', borderRadius: 999, padding: '4px 12px', font: '700 11px var(--imp-font-body)', letterSpacing: '0.06em' }}>
                UPDATED
              </span>
            )}
            <span style={{ font: '600 14px var(--imp-font-display)', color: 'var(--imp-ink)' }}>
              {memo.version} · {memo.updatedText ?? memo.completedText}
            </span>
          </div>
          <p className="imp-small" style={{ margin: 0 }}>
            <strong style={{ color: 'var(--imp-ink)' }}>What changed:</strong> {memo.changeSummary}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="db-eyebrow">Credit memo summary</div>
      </div>

      {!memo.allNoVariance ? (
        <div className="ia-memo-summary" style={{ display: 'grid', gridTemplateColumns: '34fr 66fr', border: '1.5px solid var(--imp-orange-300)', borderRadius: 'var(--imp-radius-lg)', background: '#FFF8F1', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '28px 30px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ font: '700 12px var(--imp-font-body)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--imp-orange-500)' }}>
                Total variance identified
              </span>
              <InfoTip text={VARIANCE_TIP} color="var(--imp-orange-500)" size={15} />
            </div>
            <div style={{ font: '600 clamp(34px, 3.6vw, 48px) var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--imp-orange-500)', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
              {memo.netN == null ? '—' : fmtMoney(memo.netN)}
            </div>
            <div style={{ font: '500 14px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
              Found across {memo.orders?.toLocaleString('en-US') ?? '—'} packages on {memo.invoices ?? '—'} invoices
            </div>
            {memo.invoicesNoVariance != null && memo.invoicesNoVariance > 0 && (
              <div style={{ font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-subtle)' }}>
                {(memo.invoices ?? 0) + memo.invoicesNoVariance} invoices audited · {memo.invoicesNoVariance} had no significant variance
              </div>
            )}
            {recovery && (
              <div style={{ borderTop: '1.5px solid var(--imp-orange-200, #FFDDBD)', marginTop: 6, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ font: '700 12px var(--imp-font-body)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--imp-orange-500)' }}>
                    {recovery.eyebrow}
                  </span>
                  <InfoTip text={RECOVERY_TIP} color="var(--imp-orange-500)" size={15} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: 120, height: 120, flex: 'none' }}>
                    <svg viewBox="0 0 120 120" width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#FFFFFF" strokeWidth="16" />
                      {recovery.slices.map((s) => (
                        <circle key={s.label} cx="60" cy="60" r="50" fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset} />
                      ))}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>{recovery.total}</div>
                      <div style={{ font: '500 10px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Total identified</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 160px', minWidth: 150 }}>
                    {recovery.slices.map((s) => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: 999, background: s.color, flex: 'none' }} />
                        <span style={{ flex: '1 1 auto', minWidth: 0 }}>{s.label}</span>
                        <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{s.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="ia-memo-rollup" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '22px 26px 20px', background: '#fff', borderLeft: '1.5px solid var(--imp-orange-200, var(--imp-gray-300))', minWidth: 0 }}>
            <div>
              <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>
                Variance groups in this credit memo
              </div>
              <p className="imp-small" style={{ margin: '4px 0 0' }}>
                See how the total variance is distributed across the groups explained below.
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="db-table db-table-compact" style={{ width: '100%', minWidth: 520, background: 'transparent' }}>
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
                        <button type="button" className="ia-sort-btn" style={{ textAlign: 'left', font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-purple-500)', whiteSpace: 'normal' }} onClick={() => scrollToFinding(r.anchor)}>
                          {r.title}
                        </button>
                      </td>
                      <td className="num" style={{ color: 'var(--imp-orange-500)', fontWeight: 700 }}>{r.amount}</td>
                      <td className="num">{r.packages}</td>
                      <td className="num">{r.invoices}</td>
                    </tr>
                  ))}
                  <tr className="db-total-row">
                    <td>Total</td>
                    <td className="num" style={{ color: 'var(--imp-orange-500)' }}>{memo.netN == null ? '—' : fmtMoney(memo.netN)}</td>
                    <td className="num">{memo.orders?.toLocaleString('en-US') ?? '—'}</td>
                    <td className="num">{memo.invoices ?? '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="imp-small" style={{ margin: 0, color: 'var(--imp-fg-subtle)' }}>
              Invoice counts are distinct per group; one invoice can appear in several groups, so the rows do not sum.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '34fr 66fr', border: '1.5px solid var(--imp-success)', borderRadius: 'var(--imp-radius-lg)', background: 'var(--imp-success-bg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '28px 30px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                <circle cx="12" cy="12" r="9" stroke="var(--imp-success)" strokeWidth="1.8" />
                <path d="M8 12l3 3 5-6" stroke="var(--imp-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ font: '700 12px var(--imp-font-body)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--imp-success)' }}>
                No significant variance identified
              </span>
            </div>
            <div style={{ font: '600 clamp(28px, 3vw, 38px) var(--imp-font-display)', letterSpacing: '-0.02em', color: 'var(--imp-ink)', lineHeight: 1.05 }}>
              {(memo.invoices ?? 0) + (memo.invoicesNoVariance ?? 0)} invoices audited
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '22px 26px', background: '#fff', borderLeft: '1.5px solid var(--imp-success)' }}>
            <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>All clear</div>
            <p className="imp-small" style={{ margin: 0 }}>
              All {(memo.invoices ?? 0) + (memo.invoicesNoVariance ?? 0)} invoices in this audit were reviewed and were within the significant-variance threshold.
            </p>
          </div>
        </div>
      )}

      {nextStep && (
        <div style={{ border: '1.5px solid var(--imp-purple-300)', borderRadius: 'var(--imp-radius-lg)', background: 'var(--imp-purple-100)', padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--imp-purple-200, #E4DEFF)', color: 'var(--imp-purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            {nextStep.resolvedTreatment ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ font: '700 11px var(--imp-font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--imp-purple-500)', marginBottom: 4 }}>
              {nextStep.eyebrow}
            </div>
            <div style={{ font: '600 20px var(--imp-font-display)', color: 'var(--imp-ink)' }}>{nextStep.heading}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {nextStep.lines.map((ln) => (
                <div key={ln.text} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '700 14px var(--imp-font-display)', color: 'var(--imp-purple-500)' }}>
                  {ln.icon === 'prep' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {ln.icon === 'clock' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 7v5l3.2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {ln.icon === 'check' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                      <path d="M5 12l5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
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
                  <button key={act.label} type="button" className="db-btn db-btn-primary" style={{ whiteSpace: 'nowrap', gap: 8, justifyContent: 'center' }} onClick={onClick}>
                    {act.kind === 'prep' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                    {act.label}
                  </button>
                )
              if (act.variant === 'secondary')
                return (
                  <button key={act.label} type="button" style={{ background: '#fff', border: '1.5px solid var(--imp-purple-500)', color: 'var(--imp-purple-500)', borderRadius: 8, padding: '9px 16px', font: '600 13px var(--imp-font-body)', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={onClick}>
                    {act.label}
                  </button>
                )
              return (
                <button key={act.label} type="button" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'center', cursor: 'pointer', font: '600 13px var(--imp-font-body)', color: 'var(--imp-purple-500)', textDecoration: 'underline', whiteSpace: 'nowrap' }} onClick={onClick}>
                  {act.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', borderTop: '1.5px solid var(--imp-gray-300)', paddingTop: 20 }}>
        <div style={{ maxWidth: '72ch' }}>
          <h3 className="db-h3" style={{ margin: 0 }}>
            Findings
          </h3>
          <p className="imp-small" style={{ margin: '6px 0 0' }}>
            Implentio rebuilds what each package should have cost using its shipment details and your contracted rates, then compares that amount with what you were billed. When the same supported difference appears across multiple packages, we group those packages into a finding below.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setMethodOpen(true)}>
              Learn how findings are calculated
            </button>
          </div>
        </div>
      </div>

      {detail.findingsUnavailable && (
        <div className="db-card db-empty" style={{ padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src="/brand/empty-state.png" alt="" style={{ width: 200, height: 'auto', marginBottom: 14, opacity: 0.55 }} />
          <h3 className="db-h3">Detailed breakdown unavailable</h3>
          <p className="imp-small" style={{ maxWidth: '56ch', margin: '2px auto 0' }}>
            Before finding details appear in the platform, each variance group is reviewed by Implentio to ensure it meets our quality standards. A detailed breakdown is not available for this credit memo, but you can still download the complete report.
          </p>
        </div>
      )}
      {!detail.findingsUnavailable && groups.length === 0 && (
        <div className="db-card db-empty" style={{ padding: '56px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--imp-success-bg)', borderColor: 'var(--imp-success)' }}>
          <span style={{ width: 56, height: 56, borderRadius: 999, background: '#fff', color: 'var(--imp-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 className="db-h3">No significant variance identified</h3>
          <p className="imp-small" style={{ maxWidth: '56ch', margin: '2px auto 0' }}>
            All {(memo.invoices ?? 0) + (memo.invoicesNoVariance ?? 0)} invoices in this audit were reviewed and were within the significant-variance threshold.
          </p>
        </div>
      )}

      {hasFindings && (
        <div className="db-card" style={{ gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="db-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 4 }}>
              <img src="/brand/filter.svg" alt="" style={{ width: 13, height: 13 }} />
              Filters
            </span>
            {filterSelect('fCarrier', 'All carriers', carrierOpts.map((v) => ({ value: v, label: v })))}
            {filterSelect('fService', 'All service levels', serviceOpts.map((v) => ({ value: v, label: titleCase(v) })))}
            {filterSelect('fCategory', 'All charges', CHARGE_DEFS.map((c) => ({ value: c[0], label: c[2] })))}
            {filterSelect('fDisputeStatus', 'All dispute statuses', [
              { value: 'eligible', label: 'Eligible to pursue' },
              { value: 'awaiting_outcome', label: 'Awaiting outcome' },
              { value: 'fully_collected', label: 'Fully collected' },
              { value: 'partly_collected', label: 'Partly collected' },
              { value: 'declined', label: 'Biller declined' },
            ])}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="imp-small" style={{ margin: 0 }}>
              Showing {groupsFiltered.length} of {groups.length} findings
            </span>
            {activeFilterCount > 0 && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setFilters(INITIAL_FINDING_FILTERS)}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {hl !== 'all' && hasFindings && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: '1.5px solid var(--imp-orange-300)', background: 'var(--imp-warning-bg)', borderRadius: 10, padding: '11px 14px' }}>
          <span style={{ flex: 'none', width: 8, height: 8, borderRadius: 999, background: 'var(--imp-orange-500)', marginTop: 5 }} />
          <p className="imp-small" style={{ margin: 0 }}>
            Highlighted charges help explain the finding. Package totals include all charge differences and remain unchanged.
          </p>
        </div>
      )}

      {hasFindings && groupsFiltered.length === 0 && (
        <div className="db-card db-empty" style={{ padding: '40px 32px' }}>
          <h3 className="db-h3">No findings match these filters</h3>
          <p className="imp-small" style={{ maxWidth: '48ch', margin: '6px auto 0' }}>
            Filtering refines this view only. It does not change which findings belong to the credit memo or recalculate its Total variance.
          </p>
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
        <div className="db-cta-strip">
          <div>
            Total variance in this report{' '}
            <strong className="db-money-orange">{memo.netN == null ? '—' : fmtMoney(memo.netN)}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={onDownloadExcel}>
              Download Credit Memo
            </button>
          </div>
        </div>
      </div>

      <Modal open={methodOpen} onClose={() => setMethodOpen(false)} title="How findings are calculated" width={640}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="imp-small" style={{ margin: 0 }}>
            Implentio rebuilds the expected cost of every package from its shipment facts — carrier, service level, zone, billed weight, and surcharges — using your contracted rate cards, then compares that expected amount with what your Biller invoiced.
          </p>
          <p className="imp-small" style={{ margin: 0 }}>
            Packages with the same supported difference are grouped into a finding. Favourable charge differences are netted against unfavourable differences on the same package, and only net-unfavourable packages are published.
          </p>
          <p className="imp-small" style={{ margin: 0 }}>
            Every finding links to its contributing packages, the rate cards used to rebuild expected charges, and the invoice records that show what was billed.
          </p>
        </div>
      </Modal>

      {wizardOpen && (
        <DisputeWizard detail={detail} excludedIds={excludedIds} onClose={() => setWizardOpen(false)} />
      )}
      {outcomesOpen && (
        <OutcomeModal detail={detail} onClose={() => setOutcomesOpen(false)} />
      )}
    </div>
  )
}
