/** Parcel Credit Tracker — Credit Memos tab (template ~1217–1404). */
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { InfoTip } from '@/ui/InfoTip'
import { FilterChips, FilterPanel, type FilterFieldDef, type FilterValues } from '@/ui/FilterPanel/FilterPanel'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { useDownloadState, useGoldenCta, useMemos, useRecordMemoDownload } from './api'
import {
  execSummary,
  filterMemos,
  memoCardView,
  type CtaKind,
  type MemoCardView,
} from './derive'
import { fmtMoney } from '@/domain/money'

const VARIANCE_TIP =
  'These amounts include only packages with significant variance—not all invoices and spend reviewed during this audit period.'
const CADENCE_TIP =
  'Audit cadence is based on your reporting cadence with each biller and may vary by carrier. To request a change, contact your Implentio customer representative.'
const CREDITS_TIP =
  'Credits realized are confirmed from credit invoices or credit adjustments issued by your biller and ingested by Implentio.'

/** Fixed demo value (prototype freshState.creditsRealized). */
const CREDITS_REALIZED = 9294.74

const FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: 'tProvider',
    label: 'Biller',
    allLabel: 'All billers',
    options: [
      { value: 'Flowspace', label: 'Flowspace' },
      { value: 'ShipBob', label: 'ShipBob' },
      { value: 'QuickBox', label: 'QuickBox' },
    ],
  },
  {
    key: 'tReport',
    label: 'Report status',
    allLabel: 'Any report status',
    options: [
      { value: 'ready', label: 'Ready' },
      { value: 'updated', label: 'Updated' },
      { value: 'generating', label: 'Audit In-Progress' },
    ],
  },
  {
    key: 'tRange',
    label: 'Reporting period',
    allLabel: 'Any reporting period',
    options: [
      { value: '30', label: 'Last 30 days' },
      { value: '60', label: 'Last 60 days' },
      { value: '90', label: 'Last 90 days' },
      { value: '365', label: 'Last year' },
    ],
  },
]

const CTA_COLOR = {
  purple: 'var(--imp-purple-500)',
  amber: '#B45309',
  green: 'var(--imp-success)',
} as const

const ACCENT = {
  warning: 'var(--imp-warning)',
  orange: 'var(--imp-orange-500)',
  none: 'transparent',
  gray: 'var(--imp-gray-300)',
} as const

function CtaIcon({ kind }: { kind: CtaKind }) {
  if (kind === 'view')
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  if (kind === 'outcome')
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3.2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  if (kind === 'draft')
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
        <path d="M6 2.5h7l5 5v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M13 2.5v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MemoCard({
  m,
  onOpen,
  onCta,
  onDownload,
}: {
  m: MemoCardView
  onOpen: () => void
  onCta: (kind: CtaKind) => void
  onDownload: () => void
}) {
  const badge = (bg: string, fg: string, label: string) => (
    <span
      style={{
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: '4px 12px',
        font: '700 11px var(--imp-font-body)',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  )
  return (
    <div className="db-card" id={`memo-card-${m.id}`} style={{ padding: 0, overflow: 'hidden', position: 'relative', scrollMarginTop: 88 }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: ACCENT[m.accent] }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, background: 'var(--imp-gray-200)', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 250px', padding: '22px 24px 22px 30px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 className="db-h3" style={{ margin: 0, fontSize: 26, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {m.id}
            </h3>
            {m.isNew && badge('var(--imp-orange-500)', '#fff', 'NEW')}
            {m.isUpdated && badge('var(--imp-purple-500)', '#fff', 'UPDATED')}
          </div>
          {m.downloaded && (
            <span style={{ alignSelf: 'flex-start', background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', borderRadius: 999, padding: '4px 12px', font: '700 11px var(--imp-font-body)', letterSpacing: '0.06em' }}>
              DOWNLOADED
            </span>
          )}
          <div style={{ font: '500 14px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
            {m.provider} &nbsp;·&nbsp;{' '}
            <strong style={{ color: 'var(--imp-ink)', fontWeight: 700 }}>{m.period}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {m.carriers.map((c) => (
              <span key={c} style={{ border: '1.5px solid var(--imp-gray-300)', color: 'var(--imp-fg-muted)', borderRadius: 8, padding: '5px 12px', font: '600 12px var(--imp-font-body)' }}>
                {c}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
            <span>
              <strong style={{ color: 'var(--imp-ink)', fontWeight: 700 }}>Reporting cadence:</strong> {m.cadence}
            </span>
            <InfoTip text={CADENCE_TIP} />
          </div>
          {m.versionLabel && (
            <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-subtle)' }}>{m.versionLabel}</div>
          )}
          {m.preparedText && (
            <div style={{ font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-subtle)' }}>{m.preparedText}</div>
          )}
          {m.demoLabel && (
            <span style={{ alignSelf: 'flex-start', font: '600 10px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {m.demoLabel}
            </span>
          )}
        </div>

        <div style={{ flex: '1 1 250px', padding: '22px 24px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {m.generating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ font: '600 20px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Audit in progress</div>
              <p style={{ margin: 0, font: '500 14px var(--imp-font-body)', color: 'var(--imp-fg-muted)', maxWidth: '38ch', lineHeight: 1.5 }}>
                Implentio is reviewing the invoices and validating potential findings.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 40, height: 40, border: '2px solid var(--imp-orange-300)', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2.5h7l5 5v14H6z" stroke="var(--imp-orange-500)" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M13 2.5v5h5M9 13h6M9 17h4" stroke="var(--imp-orange-500)" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <span style={{ font: '500 14px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Reviewing invoice data</span>
              </div>
            </div>
          )}
          {m.showFinancials && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ font: '500 14px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Total variance identified</span>
                <InfoTip text={VARIANCE_TIP} down />
              </div>
              <div style={{ font: '600 40px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-orange-500)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                {m.over}
              </div>
              <div style={{ font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Across {m.overSub}</div>
              {m.showCoverage && (
                <div style={{ font: '500 12px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', marginTop: 2 }}>{m.coverageText}</div>
              )}
              <div style={{ font: '500 12px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {m.billedSub}
              </div>
            </div>
          )}
          {m.allNoVariance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                  <circle cx="12" cy="12" r="9" stroke="var(--imp-success)" strokeWidth="1.8" />
                  <path d="M8 12l3 3 5-6" stroke="var(--imp-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ font: '600 40px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                  {m.over}
                </span>
              </div>
              <div style={{ font: '600 14px var(--imp-font-body)', color: 'var(--imp-success)' }}>No significant variance identified</div>
              <div style={{ font: '500 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>{m.allClearLine1}</div>
            </div>
          )}
        </div>

        <div className="ia-tracker-action-col" style={{ flex: '1 1 250px', minWidth: 0, padding: '22px 24px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
          {m.generating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '700 12px var(--imp-font-body)', color: 'var(--imp-orange-500)', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--imp-orange-500)', flex: 'none' }} />
                AUDIT IN PROGRESS
              </div>
              <p className="imp-small" style={{ margin: 0 }}>
                Findings are being validated
              </p>
            </div>
          )}
          {m.actionsEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {m.hasVariance && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, font: '700 12px var(--imp-font-body)', letterSpacing: '0.07em', color: CTA_COLOR[m.cta.color] }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: CTA_COLOR[m.cta.color], flex: 'none', marginTop: 4 }} />
                      <span>{m.cta.statusLabel}</span>
                    </div>
                    <p className="imp-small" style={{ margin: 0 }}>
                      {m.cta.supporting}
                    </p>
                  </div>
                  <button
                    className="db-btn db-btn-primary db-btn-sm"
                    style={{ width: '100%', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}
                    onClick={() => onCta(m.cta.primaryKind)}
                  >
                    <CtaIcon kind={m.cta.primaryKind} />
                    {m.cta.primaryLabel}
                  </button>
                  {m.cta.contextual && (
                    <div className="imp-small" style={{ margin: '-4px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{m.cta.contextual.text}</span>
                      <span>·</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-purple-500)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onCta('outcome')}
                      >
                        {m.cta.contextual.link} →
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="ia-tracker-secondary">
                <button type="button" className="ia-tracker-review-btn" onClick={onOpen}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flex: 'none' }}>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Review findings</span>
                </button>
                <button type="button" className="ia-tracker-secondary-link" onClick={onDownload}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Download credit memo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MemosTab() {
  const navigate = useNavigate()
  const showToast = useToast()
  const memosQ = useMemos()
  const dlQ = useDownloadState()
  const recordDownload = useRecordMemoDownload()
  const [filters, setFilters] = useState<FilterValues>({ tProvider: 'all', tReport: 'all', tRange: 'all' })

  const memos = memosQ.data ?? []
  const golden = memos.find((m) => m.detailAvailable)
  const goldenCta = useGoldenCta(golden?.id)

  if (!memosQ.data || !dlQ.data) return null
  const { downloadedMemoIds, memoDlEvents } = dlQ.data

  const filtered = filterMemos(memos, downloadedMemoIds, {
    tProvider: filters.tProvider ?? 'all',
    tReport: filters.tReport ?? 'all',
    tRange: filters.tRange ?? 'all',
  })
  const cards = filtered.map((m) => memoCardView(m, downloadedMemoIds, memoDlEvents, goldenCta))
  const exec = execSummary(memos, downloadedMemoIds)

  const download = (m: MemoCardView) => {
    const finish = () => {
      recordDownload.mutate(m.id)
      showToast('ok', `Downloading report for ${m.id}`)
    }
    if (m.detailAvailable) {
      const file = 'Parcel May - June 2026 Credit Request v2.xlsx'
      saveFile(`/demo-assets/${encodeURIComponent(file)}`, file)
        .then(finish)
        .catch(() =>
          showToast('warn', 'The report could not be downloaded. Please try again or contact your Implentio customer representative.'),
        )
    } else {
      finish()
    }
  }

  const ctaNavigate = (m: MemoCardView, kind: CtaKind) => {
    const param = { prep: 'prep', draft: 'prep', outcome: 'outcomes', view: 'dispute' }[kind]
    navigate(`/memos/${m.id}?${param}=1`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Executive summary hero */}
      <div className="db-card" style={{ gap: 18, background: 'var(--imp-ink)', border: '2px solid var(--imp-ink)', boxShadow: '8px 8px 0 var(--imp-ink)', color: '#fff' }}>
        <div className="db-eyebrow" style={{ color: 'var(--imp-purple-300)' }}>
          Executive summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '18px 0', alignItems: 'stretch' }}>
          <div style={{ paddingRight: 24, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--imp-purple-200)' }}>
              <span style={{ font: '500 11px var(--imp-font-body)' }}>Total variance identified</span>
              <InfoTip text={VARIANCE_TIP} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
              <div style={{ font: '600 clamp(22px, 3.2vw, 44px) var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--imp-orange-500)', lineHeight: 1.05, minWidth: 0, whiteSpace: 'nowrap' }}>
                {exec.over}
              </div>
              <img src="/brand/variance-arrow.svg" alt="" aria-hidden="true" style={{ width: 20, height: 20, marginTop: 2, flex: 'none' }} />
            </div>
            <div style={{ font: '500 11px var(--imp-font-body)', color: 'var(--imp-purple-200)', marginTop: 6 }}>
              Across {exec.count} credit memos
            </div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: 'inset 1.5px 0 0 #33305e', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--imp-purple-200)' }}>
              <span style={{ font: '500 11px var(--imp-font-body)' }}>Credits realized</span>
              <InfoTip text={CREDITS_TIP} color="var(--imp-purple-200)" />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '8px 14px', border: '1.5px solid #4ADE80', borderRadius: 10, background: 'rgba(74,222,128,0.10)', minWidth: 0, alignSelf: 'flex-start' }}>
              <img src="/brand/credits-check.svg" alt="" style={{ width: 22, height: 22, flex: 'none' }} />
              <span style={{ font: '600 clamp(20px, 2vw, 26px) var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: '#4ADE80', letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>
                {fmtMoney(CREDITS_REALIZED)}
              </span>
            </div>
            <div style={{ font: '500 10px var(--imp-font-body)', color: 'var(--imp-purple-300)', marginTop: 6 }}>
              Confirmed from ingested Biller credit records
            </div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: 'inset 1.5px 0 0 #33305e', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ font: '500 11px var(--imp-font-body)', color: 'var(--imp-purple-200)' }}>Credit memos ready</div>
            <div style={{ font: '600 30px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums' }}>{exec.memosReady}</div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: 'inset 1.5px 0 0 #33305e', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ font: '500 11px var(--imp-font-body)', color: 'var(--imp-purple-200)' }}>Reports downloaded</div>
            <div style={{ font: '600 30px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums' }}>{exec.reportsDownloaded}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', borderTop: '1.5px solid #33305e', paddingTop: 12, font: '500 11px var(--imp-font-body)', color: 'var(--imp-purple-200)' }}>
          <span>
            Billed for affected packages{' '}
            <strong style={{ color: 'var(--imp-purple-100)', fontVariantNumeric: 'tabular-nums' }}>{exec.invoiced}</strong>
          </span>
        </div>
      </div>

      {/* Filter row */}
      <div className="db-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 14px', flexWrap: 'wrap', overflow: 'visible' }}>
        <FilterPanel fields={FILTER_FIELDS} values={filters} onApply={setFilters} />
        <span className="imp-small" style={{ margin: '0 0 0 auto' }} aria-live="polite">
          {cards.length} credit memo{cards.length === 1 ? '' : 's'}
        </span>
      </div>
      <FilterChips fields={FILTER_FIELDS} values={filters} onClear={(key) => setFilters((f) => ({ ...f, [key]: 'all' }))} />

      {cards.map((m) => (
        <MemoCard
          key={m.id}
          m={m}
          onOpen={() => navigate(`/memos/${m.id}`)}
          onCta={(kind) => ctaNavigate(m, kind)}
          onDownload={() => download(m)}
        />
      ))}

      {cards.length === 0 && (
        <div className="db-card db-empty" style={{ padding: '44px 32px' }}>
          <h3 className="db-h3">No credit memos match these filters</h3>
          <p className="imp-small" style={{ margin: '6px auto 0', maxWidth: '44ch' }}>
            Adjust the filters above to see credit memos for other periods, statuses, or carriers.
          </p>
        </div>
      )}
    </div>
  )
}
