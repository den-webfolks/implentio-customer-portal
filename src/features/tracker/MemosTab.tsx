/** Parcel Credit Tracker — Credit Memos tab (template ~1217–1404). */
import { useState, type ReactNode } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  EyeIcon,
  ListBulletIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { ButtonLink } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip, Tag, type StatusTone } from '@/ui/Chip/StatusChip'
import { EmptyState } from '@/ui/Display/Display'
import { FilterButton, FilterGroup, matchesFilter, useFilters, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { deriveReportState } from '@/domain/memo'
import type { CreditMemoSummary } from '@/domain/types'
import { useDownloadState, useGoldenCta, useMemos, useRecordMemoDownload } from './api'
import { execSummary, memoCardView, type CtaKind, type MemoCardView } from './derive'
import { fmtMoney } from '@/domain/money'
import { Button } from '@/ui/Button/Button'

const VARIANCE_TIP =
  'These amounts include only packages with significant variance—not all invoices and spend reviewed during this audit period.'
const CADENCE_TIP =
  'Audit cadence is based on your reporting cadence with each biller and may vary by carrier. To request a change, contact your Implentio customer representative.'
const CREDITS_TIP =
  'Credits realized are confirmed from credit invoices or credit adjustments issued by your biller and ingested by Implentio.'

/** Fixed demo value (prototype freshState.creditsRealized). */
const CREDITS_REALIZED = 9294.74

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'tProvider',
    label: 'Biller',
    options: [
      { value: 'Flowspace', label: 'Flowspace' },
      { value: 'ShipBob', label: 'ShipBob' },
      { value: 'QuickBox', label: 'QuickBox' },
    ],
  },
  {
    key: 'tReport',
    label: 'Report status',
    options: [
      { value: 'ready', label: 'Ready' },
      { value: 'updated', label: 'Updated' },
      { value: 'generating', label: 'Audit in progress' },
    ],
  },
  {
    key: 'tRange',
    label: 'Reporting period',
    options: [
      { value: '30', label: 'Last 30 days' },
      { value: '60', label: 'Last 60 days' },
      { value: '90', label: 'Last 90 days' },
      { value: '365', label: 'Last year' },
    ],
  },
]

const EMPTY_FILTERS: FilterValues = { tProvider: [], tReport: [], tRange: [] }

/** Demo "reporting period" cut: how many of the newest memos each range keeps. */
const RANGE_CUT: Record<string, number> = { '30': 2, '60': 3, '90': 4, '365': 5 }

function filterMemoList(memos: readonly CreditMemoSummary[], downloadedIds: readonly string[], values: FilterValues): CreditMemoSummary[] {
  const out = memos.filter(
    (m) =>
      matchesFilter(values, 'tReport', deriveReportState(m, downloadedIds).report) && matchesFilter(values, 'tProvider', m.provider),
  )
  const ranges = values.tRange ?? []
  if (ranges.length === 0) return out
  return out.slice(0, Math.max(...ranges.map((r) => RANGE_CUT[r] ?? out.length)))
}

const CTA_TONE: Record<string, StatusTone> = {
  awaiting: 'info',
  partial: 'attention',
  completed: 'success',
}

const ACCENT = {
  warning: 'var(--ds-bg-warning-emphasis)',
  orange: 'var(--ds-bg-accent-emphasis)',
  none: 'transparent',
  gray: 'var(--ds-neutral-300)',
} as const

const CTA_ICON: Record<CtaKind, ReactNode> = {
  view: <EyeIcon aria-hidden="true" />,
  outcome: <ClockIcon aria-hidden="true" />,
  draft: <DocumentTextIcon aria-hidden="true" />,
  prep: <PaperAirplaneIcon aria-hidden="true" />,
}

// Inline text styles on the Figma scale (body-base 14/1.46, body-small
// 12/1.64, heading-huge 36, caption-small 12/1.3, caption-tiny 10/1.16).
const MUTED_TEXT = { font: 'var(--ds-weight-medium) 14px/1.46 var(--ds-font)', color: 'var(--ds-fg-muted)' } as const
const SUBTLE_TEXT = { font: 'var(--ds-weight-medium) 12px/1.64 var(--ds-font)', color: 'var(--ds-fg-muted)' } as const
const BIG_NUMBER = {
  font: 'var(--ds-weight-semi) 36px var(--ds-font)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 'var(--ds-tracking-heading)',
  lineHeight: 1.05,
} as const
const HERO_LABEL = {
  font: 'var(--ds-weight-medium) 12px/1.3 var(--ds-font)',
  letterSpacing: 'var(--ds-tracking-caption)',
  color: 'var(--ds-fg-brand-muted)',
} as const
const HERO_DIVIDER = 'inset 1px 0 0 var(--ds-neutral-800)'

function MemoCard({
  m,
  openTo,
  ctaTo,
  onDownload,
}: {
  m: MemoCardView
  openTo: string
  ctaTo: (kind: CtaKind) => string
  onDownload: () => void
}) {
  return (
    <div className="db-card" id={`memo-card-${m.id}`} style={{ padding: 0, overflow: 'hidden', position: 'relative', scrollMarginTop: 88 }}>
      <span style={{ position: 'absolute', insetInlineStart: 0, insetBlock: 0, width: 6, background: ACCENT[m.accent] }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, background: 'var(--ds-stroke-disabled)', alignItems: 'stretch' }}>
        <div style={{ flex: '1 1 250px', padding: '22px 24px 22px 30px', background: 'var(--ds-bg-default)', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 className="ds-heading-large" style={{ margin: 0, color: 'var(--ds-fg-default)', whiteSpace: 'nowrap' }}>
              {m.id}
            </h3>
            {m.isNew && <StatusChip tone="neutral">New</StatusChip>}
            {m.isUpdated && <StatusChip tone="info">Updated</StatusChip>}
          </div>
          {m.downloaded && (
            <span style={{ alignSelf: 'flex-start' }}>
              <StatusChip tone="muted" icon={<ArrowDownTrayIcon aria-hidden="true" />}>
                DOWNLOADED
              </StatusChip>
            </span>
          )}
          <div style={{ font: 'var(--ds-weight-medium) 14px/1.46 var(--ds-font)', color: 'var(--ds-fg-muted)' }}>
            {m.provider} &nbsp;·&nbsp;{' '}
            <strong style={{ color: 'var(--ds-fg-default)', fontWeight: 600 }}>{m.period}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {m.carriers.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, ...MUTED_TEXT }}>
            <span>
              <strong style={{ color: 'var(--ds-fg-default)', fontWeight: 600 }}>Reporting cadence:</strong> {m.cadence}
            </span>
            <InfoTip text={CADENCE_TIP} />
          </div>
          {m.versionLabel && (
            <div style={{ font: 'var(--ds-weight-semi) 12px/1.64 var(--ds-font)', color: 'var(--ds-fg-muted)' }}>{m.versionLabel}</div>
          )}
          {m.preparedText && <div style={{ ...MUTED_TEXT, color: 'var(--ds-fg-muted)' }}>{m.preparedText}</div>}
          {m.demoLabel && (
            <span className="ds-caption-tiny" style={{ alignSelf: 'flex-start', color: 'var(--ds-fg-muted)', textTransform: 'uppercase' }}>
              {m.demoLabel}
            </span>
          )}
        </div>

        <div style={{ flex: '1 1 250px', padding: '22px 24px', background: 'var(--ds-bg-default)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {m.generating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="ds-heading-medium" style={{ color: 'var(--ds-fg-default)' }}>
                Audit in progress
              </div>
              <p style={{ margin: 0, font: 'var(--ds-weight-medium) 14px var(--ds-font)', color: 'var(--ds-fg-muted)', maxWidth: '38ch', lineHeight: 1.5 }}>
                Implentio is reviewing the invoices and validating potential findings.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    border: '1px solid var(--ds-stroke-disabled)',
                    borderRadius: 'var(--ds-radius-full)',
                    background: 'var(--ds-orange-100)',
                    color: 'var(--ds-fg-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <DocumentTextIcon width={18} height={18} aria-hidden="true" />
                </span>
                <span style={{ font: 'var(--ds-weight-medium) 14px var(--ds-font)', color: 'var(--ds-fg-muted)' }}>Reviewing invoice data</span>
              </div>
            </div>
          )}
          {m.showFinancials && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ font: 'var(--ds-weight-medium) 14px var(--ds-font)', color: 'var(--ds-fg-muted)' }}>Total variance identified</span>
                <InfoTip text={VARIANCE_TIP} side="bottom" />
              </div>
              <div style={{ ...BIG_NUMBER, color: 'var(--ds-fg-accent)' }}>{m.over}</div>
              <div style={MUTED_TEXT}>Across {m.overSub}</div>
              {m.showCoverage && <div style={{ ...SUBTLE_TEXT, marginTop: 2 }}>{m.coverageText}</div>}
              <div style={{ ...SUBTLE_TEXT, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{m.billedSub}</div>
            </div>
          )}
          {m.allNoVariance && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircleIcon width={20} height={20} aria-hidden="true" style={{ flex: 'none', color: 'var(--ds-icon-success)' }} />
                <span style={{ ...BIG_NUMBER, color: 'var(--ds-fg-default)' }}>{m.over}</span>
              </div>
              <div style={{ font: 'var(--ds-weight-semi) 14px var(--ds-font)', color: 'var(--ds-fg-success)' }}>No significant variance identified</div>
              <div style={MUTED_TEXT}>{m.allClearLine1}</div>
            </div>
          )}
        </div>

        <div
          className="ia-tracker-action-col"
          style={{ flex: '1 1 250px', minWidth: 0, padding: '22px 24px', background: 'var(--ds-bg-default)', display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}
        >
          {m.generating && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              <StatusChip tone="attention">Audit in progress</StatusChip>
              <p className="imp-small" style={{ margin: 0 }}>
                Findings are being validated
              </p>
            </div>
          )}
          {m.actionsEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {m.hasVariance && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    <StatusChip tone={CTA_TONE[m.cta.key] ?? 'neutral'}>{m.cta.statusLabel}</StatusChip>
                    <p className="imp-small" style={{ margin: 0 }}>
                      {m.cta.supporting}
                    </p>
                  </div>
                  <ButtonLink to={ctaTo(m.cta.primaryKind)} variant="emphasis" size="small" fullWidth iconLeft={CTA_ICON[m.cta.primaryKind]} style={{ whiteSpace: 'nowrap' }}>
                    {m.cta.primaryLabel}
                  </ButtonLink>
                  {m.cta.contextual && (
                    <div className="imp-small" style={{ margin: '-4px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{m.cta.contextual.text}</span>
                      <span>·</span>
                      <Link to={ctaTo('outcome')} variant="accent" size="small" bold iconRight={<ArrowRightIcon aria-hidden="true" />}>
                        {m.cta.contextual.link}
                      </Link>
                    </div>
                  )}
                </>
              )}
              <div className="ia-tracker-secondary">
                <ButtonLink to={openTo} size="small" iconLeft={<ListBulletIcon aria-hidden="true" />} style={{ whiteSpace: 'nowrap' }}>
                  Review findings
                </ButtonLink>
                <Link variant="accent" size="small" bold iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} style={{ whiteSpace: 'nowrap' }} onClick={onDownload}>
                  Download credit memo
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MemosTab() {
  const showToast = useToast()
  const memosQ = useMemos()
  const dlQ = useDownloadState()
  const recordDownload = useRecordMemoDownload()
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_FILTERS)
  const filters = useFilters(FILTER_FIELDS, filterValues, setFilterValues)

  const memos = memosQ.data ?? []
  const golden = memos.find((m) => m.detailAvailable)
  const goldenCta = useGoldenCta(golden?.id)

  if (!memosQ.data || !dlQ.data) return null
  const { downloadedMemoIds, memoDlEvents } = dlQ.data

  const filtered = filterMemoList(memos, downloadedMemoIds, filterValues)
  const cards = filtered.map((m) => memoCardView(m, downloadedMemoIds, memoDlEvents, goldenCta))
  const exec = execSummary(memos, downloadedMemoIds)

  const download = (m: MemoCardView) => {
    const finish = () => {
      recordDownload.mutate(m.id)
      showToast('positive', `Downloading report for ${m.id}`)
    }
    if (m.detailAvailable) {
      const file = 'Parcel May - June 2026 Credit Request v2.xlsx'
      saveFile(`/demo-assets/${encodeURIComponent(file)}`, file)
        .then(finish)
        .catch(() =>
          showToast('danger', 'The report could not be downloaded. Please try again or contact your Implentio customer representative.'),
        )
    } else {
      finish()
    }
  }

  const ctaHref = (m: MemoCardView, kind: CtaKind) => {
    const param = { prep: 'prep', draft: 'prep', outcome: 'outcomes', view: 'dispute' }[kind]
    return `/memos/${m.id}?${param}=1`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Executive summary hero */}
      <div className="db-card" style={{ gap: 18, background: 'var(--ds-bg-emphasis)', color: 'var(--ds-fg-reverse)' }}>
        <div className="ds-caption-small" style={{ color: 'var(--ds-fg-brand-muted)', textTransform: 'uppercase' }}>
          Executive summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '18px 0', alignItems: 'stretch' }}>
          <div style={{ paddingInlineEnd: 24, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ds-fg-brand-muted)' }}>
              <span style={HERO_LABEL}>Total variance identified</span>
              <InfoTip text={VARIANCE_TIP} color="var(--ds-fg-brand-muted)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
              <div
                style={{
                  ...BIG_NUMBER,
                  fontSize: 'clamp(25px, 3.2vw, 36px)',
                  color: 'var(--ds-fg-accent)',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {exec.over}
              </div>
              <img src="/brand/variance-arrow.svg" alt="" aria-hidden="true" style={{ width: 20, height: 20, marginTop: 2, flex: 'none' }} />
            </div>
            <div style={{ ...HERO_LABEL, marginTop: 6 }}>Across {exec.count} credit memos</div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: HERO_DIVIDER, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ds-fg-brand-muted)' }}>
              <span style={HERO_LABEL}>Credits realized</span>
              <InfoTip text={CREDITS_TIP} color="var(--ds-fg-brand-muted)" />
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 8,
                padding: '8px 14px',
                border: '1px solid var(--ds-green-100)',
                borderRadius: 'var(--ds-radius-large)',
                background: 'color-mix(in srgb, var(--ds-green-500) 24%, transparent)',
                minWidth: 0,
                alignSelf: 'flex-start',
              }}
            >
              <img src="/brand/credits-check.svg" alt="" style={{ width: 22, height: 22, flex: 'none' }} />
              <span
                style={{
                  font: 'var(--ds-weight-semi) clamp(21px, 2vw, 25px)/1.3 var(--ds-font)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--ds-green-100)',
                  letterSpacing: 'var(--ds-tracking-heading)',
                  overflowWrap: 'anywhere',
                }}
              >
                {fmtMoney(CREDITS_REALIZED)}
              </span>
            </div>
            <div style={{ ...HERO_LABEL, font: 'var(--ds-weight-medium) 10px/1.16 var(--ds-font)', marginTop: 6 }}>Confirmed from ingested Biller credit records</div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: HERO_DIVIDER, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={HERO_LABEL}>Credit memos ready</div>
            <div style={{ font: 'var(--ds-weight-semi) 30px/1.32 var(--ds-font)', fontVariantNumeric: 'tabular-nums' }}>{exec.memosReady}</div>
          </div>
          <div style={{ padding: '0 22px', boxShadow: HERO_DIVIDER, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={HERO_LABEL}>Reports downloaded</div>
            <div style={{ font: 'var(--ds-weight-semi) 30px var(--ds-font)', fontVariantNumeric: 'tabular-nums' }}>{exec.reportsDownloaded}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', borderTop: '1px solid var(--ds-neutral-800)', paddingTop: 12, ...HERO_LABEL }}>
          <span>
            Billed for affected packages{' '}
            <strong style={{ color: 'var(--ds-fg-brand-disabled)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{exec.invoiced}</strong>
          </span>
        </div>
      </div>

      {/* Filter row */}
      <div className="db-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '12px 14px', flexWrap: 'wrap', overflow: 'visible' }}>
        <FilterButton filters={filters} />
        <span className="imp-small" style={{ margin: '0 0 0 auto' }} aria-live="polite">
          {cards.length} credit memo{cards.length === 1 ? '' : 's'}
        </span>
      </div>
      <FilterGroup filters={filters} />

      {cards.map((m) => (
        <MemoCard
          key={m.id}
          m={m}
          openTo={`/memos/${m.id}`}
          ctaTo={(kind) => ctaHref(m, kind)}
          onDownload={() => download(m)}
        />
      ))}

      {cards.length === 0 && (
        <div className="db-card" style={{ padding: 0 }}>
          <EmptyState
            title="No credit memos match these filters"
            subtitle="Try other billers, report statuses, or reporting periods."
            action={
              <Button size="small" onClick={filters.clear}>
                Clear filters
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
}
