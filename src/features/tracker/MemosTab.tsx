/** Parcel Credit Tracker — Credit memos tab (DESIGN-SYSTEM.md "Parcel Credit
 *  Tracker"). "Where your money is" adds up the rows below it: the total, one
 *  bar in bucket order, and four cards (left to dispute, waiting, recovered,
 *  off the table). Then one list, most left to dispute first; each row shows
 *  the money that needs you, where the rest is, the one date that matters, and
 *  "Check details". First ported from the prototype's tracker (template ~1217–1404). */
import { useState, type ReactNode } from 'react'
import {
  ArrowDownTrayIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  EnvelopeIcon,
  ListBulletIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { InfoTip, Tooltip } from '@/ui/Tooltip/Tooltip'
import { Button, ButtonLink, IconButton } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip, Tag } from '@/ui/Chip/StatusChip'
import { EmptyState } from '@/ui/Display/Display'
import { Select } from '@/ui/Form/Select'
import { FilterButton, FilterGroup, matchesFilter, useFilters, type FilterField, type FilterValues } from '@/ui/Filters/Filters'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { useClock } from '@/lib/clock'
import { isDemoMode } from '@/demo/demo-mode'
import type { CreditMemoSummary } from '@/domain/types'
import { countdownText } from '@/domain/dates'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { RECOVERY_BUCKETS, type RecoveryBucketKey, type RecoveryBuckets } from '@/domain/outcomes'
import { BUCKET_TONE, TONE_CHART_COLOR, toneColors } from '@/features/status-tones'
import { useDisputeContext, useDownloadState, useMemos, useOutcomeRows, useRecordMemoDownload } from './api'
import { BUCKET_FACT, TRACKER_SORTS, memoRowView, shortDate, sortRows, trackerSummary, type MemoRowView, type RowStatus, type RowTarget, type TrackerSort } from './derive'
import styles from './MemosTab.module.css'

const TOTAL_TIP =
  'Only packages that were charged more than your contract allows — not all invoices and spend reviewed in these audits.'
const RECOVERED_TIP =
  'The credits your team has recorded as received from your billers. Implentio does not read biller credit records yet, so this total comes from the outcomes you record.'

const filterFields = (memos: readonly CreditMemoSummary[]): FilterField[] => [
  {
    key: 'tProvider',
    label: 'Biller',
    options: [...new Set(memos.map((m) => m.provider))].sort().map((v) => ({ value: v, label: v })),
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

const EMPTY_FILTERS: FilterValues = { tProvider: [], tRange: [] }

/** Demo "reporting period" cut: how many of the newest memos each range keeps. */
const RANGE_CUT: Record<string, number> = { '30': 2, '60': 3, '90': 4, '365': 5 }

function filterMemoList(memos: readonly CreditMemoSummary[], values: FilterValues): CreditMemoSummary[] {
  const out = memos.filter((m) => matchesFilter(values, 'tProvider', m.provider))
  const ranges = values.tRange ?? []
  if (ranges.length === 0) return out
  return out.slice(0, Math.max(...ranges.map((r) => RANGE_CUT[r] ?? out.length)))
}

const bucketColor = (key: RecoveryBucketKey) => TONE_CHART_COLOR[BUCKET_TONE[key]]
const amountColor = (key: RecoveryBucketKey) => toneColors(BUCKET_TONE[key]).fg

function Swatch({ bucket }: { bucket: RecoveryBucketKey }) {
  return <span className={styles.swatch} style={{ background: bucketColor(bucket) }} aria-hidden="true" />
}

/** The five buckets as one bar, in RECOVERY_BUCKETS order everywhere. Decoration: the text carries the numbers. */
function MoneyBar({ buckets, large = false }: { buckets: RecoveryBuckets; large?: boolean }) {
  const parts = RECOVERY_BUCKETS.filter((b) => buckets[b.key] > 0.005)
  return (
    <div className={`${styles.bar} ${large ? styles.barLarge : ''}`} aria-hidden="true">
      {parts.map((b) => (
        <span key={b.key} style={{ flexGrow: buckets[b.key], background: bucketColor(b.key) }} />
      ))}
    </div>
  )
}

/** A small ring of the memo's buckets, in bar order. Decoration: the facts beside it carry the numbers. */
function MoneyDonut({ buckets }: { buckets: RecoveryBuckets }) {
  const R = 15
  const C = 2 * Math.PI * R
  const total = RECOVERY_BUCKETS.reduce((s, b) => s + buckets[b.key], 0)
  const parts = RECOVERY_BUCKETS.filter((b) => buckets[b.key] > 0.005)
  const gap = parts.length > 1 ? 2 : 0
  const lens = parts.map((b) => (total > 0 ? (buckets[b.key] / total) * C : 0))
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((s, l) => s + l, 0))
  return (
    <svg className={styles.donut} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r={R} className={styles.donutTrack} />
      {parts.map((b, i) => {
        const dash = Math.max((lens[i] ?? 0) - gap, 1.5)
        return (
          <circle
            key={b.key}
            cx="20"
            cy="20"
            r={R}
            stroke={bucketColor(b.key)}
            strokeDasharray={`${dash} ${C - dash}`}
            strokeDashoffset={-(starts[i] ?? 0)}
            transform="rotate(-90 20 20)"
            className={styles.donutPart}
          />
        )
      })}
    </svg>
  )
}

/** Where "Check details" lands on the memo page. */
const detailsHref = (id: string, target: RowTarget) => `/memos/${id}${target ? `?${target}=1` : ''}`

const STATUS_ICON: Record<RowStatus['icon'], ReactNode> = {
  prepared: <EnvelopeIcon aria-hidden="true" />,
  draft: <ListBulletIcon aria-hidden="true" />,
  active: <PaperAirplaneIcon aria-hidden="true" />,
  open: <ClockIcon aria-hidden="true" />,
  closed: <CheckCircleIcon aria-hidden="true" />,
  expired: <NoSymbolIcon aria-hidden="true" />,
}

function MemoRow({ r, demo, onDownload }: { r: MemoRowView; demo: boolean; onDownload: () => void }) {
  return (
    <article className={styles.row} id={`memo-row-${r.id}`} aria-labelledby={`memo-row-${r.id}-title`}>
      <div className={styles.memo}>
        <h3 id={`memo-row-${r.id}-title`} className={`ds-heading-small ${styles.memoId}`}>
          <Link to={`/memos/${r.id}`} bold>
            {r.id}
          </Link>
        </h3>
        <p className={`ds-body-small ${styles.who}`}>
          {r.provider} · <span className={styles.nowrap}>{r.period}</span>
        </p>
        {r.chip && <Tag>{r.chip}</Tag>}
        {demo && r.demoLabel && <span className={`ds-caption-tiny ${styles.demoLabel}`}>{r.demoLabel}</span>}
      </div>

      <div className={styles.money}>
        {r.allClear ? (
          <>
            <p className={`ds-heading-small ${styles.clear}`}>No overcharges found</p>
            <p className={`ds-body-small ${styles.sub}`}>{r.sub}</p>
          </>
        ) : (
          r.hero && (
            <>
              <p className={`ds-body-small ds-w-medium ${styles.heroLabel}`}>
                <Swatch bucket={r.hero.kind} />
                {r.hero.label}
              </p>
              <p className={`ds-heading-large ${styles.hero} ${r.hero.valueN > 0.005 ? '' : styles.heroZero}`} style={r.hero.valueN > 0.005 ? { color: amountColor(r.hero.kind) } : undefined}>
                {fmtMoney(r.hero.valueN)}
              </p>
              {r.sub && <p className={`ds-body-small ${styles.sub}`}>{r.sub}</p>}
            </>
          )
        )}
      </div>

      {!r.allClear && r.buckets && (
        <div className={styles.progress}>
          <MoneyDonut buckets={r.buckets} />
          {r.facts.length > 0 ? (
            <ul className={`ds-body-small ${styles.facts}`} aria-label="The rest of this memo">
              {r.facts.map((f) => (
                <li key={f.key}>
                  <Swatch bucket={f.key} />
                  <span className={styles.factAmount} style={f.key === 'collected' ? { color: amountColor('collected') } : undefined}>
                    {fmtMoney(f.valueN)}
                  </span>{' '}
                  {BUCKET_FACT[f.key]}
                </li>
              ))}
            </ul>
          ) : (
            r.factsText && <p className={`ds-body-small ${styles.factsText}`}>{r.factsText}</p>
          )}
        </div>
      )}

      {r.status && (
        <div className={styles.status}>
          <StatusChip tone={r.status.tone} size="medium" icon={STATUS_ICON[r.status.icon]}>
            {r.status.label}
          </StatusChip>
          {r.status.detail.map((line) => (
            <p key={line} className={`ds-body-small ${styles.statusDetail}`}>
              {/* Wrap between the parts of a line, never inside one. */}
              {line.split(' · ').map((part, i) => (
                <span key={i} className={styles.nowrap}>
                  {i > 0 && ' · '}
                  {part}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <ButtonLink
          to={detailsHref(r.id, r.target)}
          variant="primary"
          size="small"
          iconRight={<ArrowRightIcon aria-hidden="true" />}
          aria-label={`Check details for ${r.id}`}
        >
          Check details
        </ButtonLink>
        <Tooltip content="Download credit memo">
          <IconButton size="small" icon={<ArrowDownTrayIcon aria-hidden="true" />} aria-label={`Download credit memo ${r.id}`} onClick={onDownload} />
        </Tooltip>
      </div>
    </article>
  )
}

/** Puts the first matching row on screen and focus on its memo link. */
function goToRow(id: string | undefined) {
  if (!id) return
  const row = document.getElementById(`memo-row-${id}`)
  if (!row) return
  const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  row.querySelector<HTMLElement>('h3 a')?.focus({ preventScroll: true })
  row.classList.remove('ia-flash')
  requestAnimationFrame(() => row.classList.add('ia-flash'))
  setTimeout(() => row.classList.remove('ia-flash'), 1500)
}

export function MemosTab() {
  const showToast = useToast()
  const memosQ = useMemos()
  const dlQ = useDownloadState()
  const recordDownload = useRecordMemoDownload()
  const memos = memosQ.data ?? []
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_FILTERS)
  const filters = useFilters(filterFields(memos), filterValues, setFilterValues)
  const [finishedOpen, setFinishedOpen] = useState(false)
  // For this visit only: the default is most left to dispute first.
  const [sort, setSort] = useState<TrackerSort>('value')

  const rowsQ = useOutcomeRows()
  const clock = useClock()
  const golden = memos.find((m) => m.detailAvailable)
  const ctxQ = useDisputeContext(golden?.id)

  if (!memosQ.data || !dlQ.data || !rowsQ.data || (golden && !ctxQ.data)) return null
  const { downloadedMemoIds } = dlQ.data
  const rows = rowsQ.data
  const now = clock.now()
  const demo = isDemoMode()

  const views = filterMemoList(memos, filterValues).map((m) => {
    const items = rows.filter((r) => r.memoId === m.id)
    // Only the golden memo has a finding selection; a whole-memo dispute has none.
    const draft = m.detailAvailable && !items.some((r) => r.wholeMemo) ? (ctxQ.data ?? null) : null
    return memoRowView(m, { rows: items, draft, downloadedIds: downloadedMemoIds, now, index: memos.indexOf(m) })
  })
  const { list, finished } = sortRows(views, sort)
  const inAudit = views.filter((v) => v.place === 'processing')
  const allClearCount = views.filter((v) => v.allClear).length
  const shownCount = list.length + finished.length
  const summary = trackerSummary(views, now)
  const b = summary.buckets
  // Finished opens by itself when it is all that's left to show.
  const finishedShown = finishedOpen || list.length === 0

  const download = (r: MemoRowView) => {
    const finish = () => {
      recordDownload.mutate(r.id)
      showToast('positive', `Downloading report for ${r.id}`)
    }
    if (r.detailAvailable) {
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

  const firstWith = (key: RecoveryBucketKey) => list.find((r) => (r.buckets?.[key] ?? 0) > 0.005)?.id

  return (
    <div className={styles.tab}>
      {summary.memoCount > 0 && (
        <section className={styles.summary} aria-labelledby="tracker-summary-title">
          <div className={styles.summaryHead}>
            <div>
              <h2 id="tracker-summary-title" className={`ds-body-base ${styles.summaryTitle}`}>
                Where your money is
              </h2>
              <p className={styles.total}>
                <span className="ds-heading-xlarge">{fmtMoney(summary.totalN)}</span>{' '}
                <span className={`ds-body-base ${styles.totalNote}`}>
                  overcharged across {plural(summary.memoCount, 'credit memo')} <InfoTip text={TOTAL_TIP} size={14} />
                </span>
              </p>
            </div>
            <Link to="/tracker/outcomes" variant="accent" size="small" bold iconRight={<ArrowRightIcon aria-hidden="true" />}>
              See credit outcomes
            </Link>
          </div>
          <MoneyBar buckets={b} large />

          <div className={styles.cards}>
            <div className={`${styles.card} ${summary.toDispute.memos > 0 ? styles.cardMove : ''}`}>
              <div className={styles.cardTop}>
                <p className={`ds-body-base ds-w-medium ${styles.cardName}`}>
                  <Swatch bucket="open" />
                  Left to dispute
                </p>
                {summary.toDispute.memos > 0 && <Tag>Your move</Tag>}
              </div>
              <p className={`ds-heading-medium ${styles.cardValue}`}>{fmtMoney(b.open)}</p>
              {summary.toDispute.memos > 0 ? (
                <>
                  <p className={`ds-body-small ${styles.cardBody}`}>
                    <span className="ds-w-medium">{plural(summary.toDispute.memos, 'credit memo')}.</span> Dispute or skip each finding.
                    {summary.toDispute.nextDeadline && summary.toDispute.daysLeft != null && (
                      <>
                        {' '}
                        Next deadline {shortDate(summary.toDispute.nextDeadline)} · {countdownText(summary.toDispute.daysLeft).toLowerCase()}.
                      </>
                    )}
                  </p>
                  <div className={styles.cardFoot}>
                    <Button variant="primary" size="small" fullWidth onClick={() => goToRow(firstWith('open'))}>
                      Review overcharges
                    </Button>
                  </div>
                </>
              ) : (
                <p className={`ds-body-small ${styles.cardBody}`}>Nothing left to dispute.</p>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTop}>
                <p className={`ds-body-base ds-w-medium ${styles.cardName}`}>
                  <Swatch bucket="awaiting" />
                  Waiting on Biller
                </p>
              </div>
              <p className={`ds-heading-medium ${styles.cardValue}`}>{fmtMoney(b.awaiting)}</p>
              {summary.waiting.memos > 0 ? (
                <>
                  <p className={`ds-body-small ${styles.cardBody}`}>
                    <span className="ds-w-medium">{plural(summary.waiting.memos, 'credit memo')}.</span>
                    {summary.waiting.oldestSent && <> Oldest sent {summary.waiting.oldestSent}.</>} Record each answer when it comes in.
                  </p>
                  <div className={styles.cardFoot}>
                    <Button size="small" fullWidth onClick={() => goToRow(firstWith('awaiting'))}>
                      Record answers
                    </Button>
                  </div>
                </>
              ) : (
                <p className={`ds-body-small ${styles.cardBody}`}>Nothing waiting on an answer.</p>
              )}
            </div>

            <div className={`${styles.card} ${styles.cardResult}`}>
              <div className={styles.cardTop}>
                <p className={`ds-body-base ds-w-medium ${styles.cardName}`}>
                  <Swatch bucket="collected" />
                  Recovered <InfoTip text={RECOVERED_TIP} size={14} />
                </p>
              </div>
              <p className={`ds-heading-medium ${styles.cardValue}`} style={{ color: amountColor('collected') }}>
                {fmtMoney(b.collected)}
              </p>
              <div className={styles.cardLines}>
                <p className={`ds-body-base ${styles.kv}`}>
                  <span>Recovery rate</span>
                  <span className="ds-w-semi">{summary.recoveryRate == null ? '—' : `${(summary.recoveryRate * 100).toFixed(1)}%`}</span>
                </p>
                <p className={`ds-body-small ${styles.cardBody} ${summary.recoveryRate == null ? '' : styles.cardNote}`}>
                  {summary.recoveryRate == null ? 'No answers recorded yet.' : 'Of what Billers answered, as recorded by your team.'}
                </p>
              </div>
            </div>

            <div className={`${styles.card} ${styles.cardResult}`}>
              <div className={styles.cardTop}>
                <p className={`ds-body-base ds-w-medium ${styles.cardName}`}>Off the table</p>
              </div>
              <p className={`ds-heading-medium ${styles.cardValue} ${styles.muted}`}>{fmtMoney(b.notRecovered + b.notDisputed)}</p>
              <div className={styles.cardLines}>
                <p className={`ds-body-base ${styles.kv}`}>
                  <span>
                    <Swatch bucket="notRecovered" />
                    Not recovered
                  </span>
                  <span className="ds-w-semi">{fmtMoney(b.notRecovered)}</span>
                </p>
                <p className={`ds-body-base ${styles.kv}`}>
                  <span>
                    <Swatch bucket="notDisputed" />
                    Not disputed
                  </span>
                  <span className="ds-w-semi">{fmtMoney(b.notDisputed)}</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className={styles.listHead}>
        <h2 className={`ds-heading-tiny ${styles.listCount}`} aria-live="polite">
          {plural(shownCount, 'credit memo')}
          {allClearCount > 0 && <span className={styles.listCountNote}> · {allClearCount} with no overcharges</span>}
        </h2>
        <div className={styles.listTools}>
          <Select aria-label="Sort credit memos" size="small" value={sort} onValueChange={setSort} options={TRACKER_SORTS} />
          <FilterButton filters={filters} />
        </div>
      </div>
      <FilterGroup filters={filters} />
      {inAudit.length > 0 && (
        <p className={`ds-body-small ${styles.inAudit}`}>
          <ClockIcon aria-hidden="true" />
          <span>
            Audit in progress: {inAudit.map((v) => `${v.id} (${v.provider} · ${v.period})`).join(', ')}. Findings appear here once they’re validated.
          </span>
        </p>
      )}

      {list.length > 0 && (
        <div className={styles.list}>
          {list.map((r) => (
            <MemoRow key={r.id} r={r} demo={demo} onDownload={() => download(r)} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <section className={styles.finished} aria-labelledby="tracker-finished">
          <h2 id="tracker-finished" className={`ds-heading-tiny ${styles.finishedTitle}`}>
            {list.length > 0 ? (
              <button type="button" className={styles.disclosure} aria-expanded={finishedShown} onClick={() => setFinishedOpen((v) => !v)}>
                {finishedShown ? <ChevronDownIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
                Finished ({finished.length})
              </button>
            ) : (
              <>Finished ({finished.length})</>
            )}
          </h2>
          {finishedShown && (
            <div className={styles.list}>
              {finished.map((r) => (
                <MemoRow key={r.id} r={r} demo={demo} onDownload={() => download(r)} />
              ))}
            </div>
          )}
        </section>
      )}

      {views.length === 0 && (
        <div className="db-card" style={{ padding: 0 }}>
          <EmptyState
            title="No credit memos match these filters"
            subtitle="Try other billers or reporting periods."
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
