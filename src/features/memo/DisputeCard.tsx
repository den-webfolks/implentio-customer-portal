/** One sent dispute on the memo workspace: how long it has been waiting and
 *  the Biller's answer recorded finding by finding, all in place (no
 *  dialogs). "Show details" adds what was sent — the message, recipients,
 *  evidence — and who recorded each outcome. One card per send. */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import type { Collection } from '@/domain/types'
import { daysSince, fmtDateShort, fmtDateTime, isoDate } from '@/domain/dates'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { COLLECTION_LABELS, DISPUTE_STATUS_LABELS, disputeStatus, outcomeCollection, recoveryBuckets } from '@/domain/outcomes'
import { useClock } from '@/lib/clock'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { TextField } from '@/ui/Form/TextField'
import { RadioGroup } from '@/ui/Form/Choice'
import { COLLECTION_TONE, DISPUTE_STATUS_TONE, TONE_CHART_COLOR } from '@/features/status-tones'
import type { DisputeSection } from './derive'
import styles from './DisputeCard.module.css'

type Row = DisputeSection['rows'][number]

const asItem = (r: Row) => ({ amountN: r.amountN, pursuit: 'pursued' as const, disputeDeadline: null, collection: r.collection })

export function DisputeCard({
  section,
  detailsOpen: detailsOpenAtStart = false,
  activityHref,
  onRecord,
  onJump,
  onDownloadEvidence,
}: {
  section: DisputeSection
  /** Open the details initially (deep link from the tracker). */
  detailsOpen?: boolean
  activityHref: string
  onRecord: (rowId: string, collection: Collection) => void
  /** Scroll to a finding's card. */
  onJump: (findingId: string) => void
  onDownloadEvidence: () => void
}) {
  const now = useClock().now()
  const { record, rows } = section
  const [detailsOpen, setDetailsOpen] = useState(detailsOpenAtStart)
  // One row open at a time (changing an answer, entering an amount, adding a reason).
  const [active, setActive] = useState<{ rowId: string; mode: RowMode } | null>(null)
  const status = disputeStatus(rows.map((r) => r.collection))
  const waiting = rows.filter((r) => !r.collection || r.collection.status === 'awaiting')
  const totals = recoveryBuckets(rows.map(asItem), now)
  const sentOn = new Date(record.sentAt ?? 0)
  const waitedDays = daysSince(sentOn, now)
  const waitingLine = waitedDays <= 0 ? 'Sent today' : `Waiting ${plural(waitedDays, 'day')}`
  const open = waiting.length > 0

  return (
    <section
      id={`dispute-${record.id}`}
      aria-label={`${record.biller} dispute, ${fmtDateShort(sentOn)}`}
      style={{
        scrollMarginTop: 88,
        border: '1px solid var(--ds-stroke-disabled)',
        borderInlineStart: `4px solid ${open ? TONE_CHART_COLOR.info : TONE_CHART_COLOR.success}`,
        borderRadius: 'var(--ds-radius-large)',
        // A lighter tint than the info chip, so the chip keeps its edge.
        background: open ? 'color-mix(in srgb, var(--ds-status-info-bg) 45%, var(--ds-bg-default))' : 'var(--ds-bg-default)',
        boxShadow: 'var(--ds-shadow-disabled)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ width: 40, height: 40, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-default)', color: 'var(--ds-status-info-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <PaperAirplaneIcon width={20} height={20} aria-hidden="true" />
        </span>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          {/* Focus target for tracker links (?outcomes=1). */}
          <h4 id={`dispute-${record.id}-title`} tabIndex={-1} className="ds-heading-small" style={{ margin: 0 }}>
            Dispute sent to {record.biller} · {fmtDateShort(sentOn)}
          </h4>
          <div className="ds-body-base" style={{ margin: '2px 0 0', color: 'var(--ds-fg-muted)' }}>
            {plural(rows.length, 'finding')} · {fmtMoney(record.amountN)}
            {' · '}
            {open ? waitingLine : `Collected ${fmtMoney(totals.collected)} · Not recovered ${fmtMoney(totals.notRecovered)}`}
            {record.sentAfterDeadline ? ' · sent after the deadline' : ''}
          </div>
        </div>
        <StatusChip tone={DISPUTE_STATUS_TONE[status]}>{DISPUTE_STATUS_LABELS[status]}</StatusChip>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--ds-bg-default)', border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-medium)', padding: '4px 16px' }}>
        {open && (
          <div className="ds-body-base ds-w-semi" style={{ padding: '12px 0 0' }}>
            Record {record.biller}’s answer for each finding
          </div>
        )}
        {rows.map((row) => (
          <OutcomeRow
            key={row.id}
            row={row}
            today={isoDate(now)}
            mode={active?.rowId === row.id ? active.mode : null}
            onMode={(mode) => setActive(mode ? { rowId: row.id, mode } : null)}
            onRecord={onRecord}
            onJump={record.scope === 'groups' ? () => onJump(row.id) : undefined}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link
          variant="accent"
          size="small"
          bold
          aria-expanded={detailsOpen}
          iconRight={detailsOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
          onClick={() => setDetailsOpen((o) => !o)}
        >
          {detailsOpen ? 'Hide details' : 'Show details'}
        </Link>
      </div>
      {detailsOpen && <DisputeDetails section={section} activityHref={activityHref} onDownloadEvidence={onDownloadEvidence} />}
    </section>
  )
}

type RowMode = 'change' | 'partial' | 'reason'

const ANSWERS: { value: 'full' | 'partial' | 'not_issued'; label: string }[] = [
  { value: 'full', label: COLLECTION_LABELS.full },
  { value: 'partial', label: COLLECTION_LABELS.partial },
  { value: 'not_issued', label: COLLECTION_LABELS.not_issued },
]

/** One finding's answer. A single-choice toggle while waiting (or when
 *  changing): fully collected and denied save at once; partly collected asks
 *  for the amount only. A recorded row shows the outcome, with "Add reason"
 *  for a denial and "Change". The card keeps one row open at a time. */
function OutcomeRow({
  row,
  today,
  mode,
  onMode,
  onRecord,
  onJump,
}: {
  row: Row
  today: string
  mode: RowMode | null
  onMode: (mode: RowMode | null) => void
  onRecord: (rowId: string, c: Collection) => void
  onJump?: () => void
}) {
  const c = row.collection
  const settled = !!c && c.status !== 'awaiting'
  // The field the customer just opened takes focus.
  const fieldRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (mode === 'partial' || mode === 'reason') fieldRef.current?.focus()
  }, [mode])
  const [amount, setAmount] = useState(c?.status === 'partial' && c.amountN != null ? String(c.amountN) : '')
  const [reason, setReason] = useState(c?.reason ?? '')
  const amt = parseFloat(amount)
  const amountError =
    amount !== '' && (isNaN(amt) || amt <= 0 || amt > row.amountN + 0.005) ? `Up to ${fmtMoney(row.amountN)}` : ''
  const canSaveAmount = amount !== '' && !amountError

  const record = (collection: Collection) => {
    onRecord(row.id, collection)
    onMode(null)
  }
  const choose = (value: 'full' | 'partial' | 'not_issued') => {
    if (value === 'partial') return onMode('partial')
    record(outcomeCollection(value, row.amountN, { date: today, reason: value === 'not_issued' ? (c?.reason ?? '') : '' }))
  }
  const saveAmount = () => {
    if (canSaveAmount) record(outcomeCollection('partial', row.amountN, { amountN: amt, date: today, reason: c?.reason ?? '' }))
  }
  const onKeys = (e: KeyboardEvent<HTMLInputElement>, save: () => void) => {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') {
      e.stopPropagation()
      onMode(null)
    }
  }
  const showToggle = !settled || mode === 'change' || mode === 'partial'
  const toggleValue = mode === 'partial' ? 'partial' : mode === 'change' && c ? (c.status as 'full' | 'partial' | 'not_issued') : null
  const detail = c?.status === 'partial' ? `${fmtMoney(c.amountN ?? 0)} collected` : c?.status === 'not_issued' && c.reason ? `“${c.reason}”` : ''

  return (
    <div className={styles.row}>
      <span className={`${styles.title} ds-body-base ds-w-medium`}>
        {onJump ? (
          <Link variant="accent" onClick={onJump}>
            {row.title}
          </Link>
        ) : (
          row.title
        )}
      </span>
      <span className={`${styles.amount} ds-body-base ds-w-semi`}>{fmtMoney(row.amountN)}</span>
      <div className={styles.answer}>
        {showToggle ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
            <RadioGroup aria-label={`Answer for ${row.title}`} bordered direction="row" options={ANSWERS} value={toggleValue} onValueChange={choose} />
            {settled && (
              <Link size="small" bold onClick={() => onMode(null)}>
                Cancel
              </Link>
            )}
          </div>
        ) : c ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px 12px', flexWrap: 'wrap' }}>
            <StatusChip tone={COLLECTION_TONE[c.status]}>{COLLECTION_LABELS[c.status]}</StatusChip>
            <span className="imp-small" style={{ margin: 0 }}>
              {[detail, c.date ? fmtDateShort(new Date(c.date + 'T00:00:00')) : null].filter(Boolean).join(' · ')}
            </span>
            {c.status === 'not_issued' && !c.reason && (
              <Link variant="accent" size="small" bold aria-label={`Add the Biller’s reason for ${row.title}`} onClick={() => onMode('reason')}>
                Add reason
              </Link>
            )}
            <Link variant="accent" size="small" bold aria-label={`Change the answer for ${row.title}`} onClick={() => onMode('change')}>
              Change
            </Link>
          </div>
        ) : null}

        {mode === 'partial' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
            <div style={{ width: 132 }}>
              <TextField
                aria-label={`Amount collected for ${row.title}`}
                size="small"
                inputMode="decimal"
                placeholder="0.00"
                ref={fieldRef}
                iconLeft={<span aria-hidden="true">$</span>}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => onKeys(e, saveAmount)}
                validation={amountError ? 'invalid' : undefined}
                message={amountError || undefined}
              />
            </div>
            <span className="imp-small" style={{ margin: 0, lineHeight: '32px' }}>
              of {fmtMoney(row.amountN)}
            </span>
            <Button size="small" variant="primary" disabled={!canSaveAmount} onClick={saveAmount}>
              Save
            </Button>
            <Link size="small" bold onClick={() => onMode(null)} style={{ lineHeight: '32px' }}>
              Cancel
            </Link>
          </div>
        )}

        {mode === 'reason' && c && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--ds-space-3)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <TextField
                aria-label={`Biller’s reason for ${row.title}`}
                size="small"
                placeholder="What did the Biller say?"
                ref={fieldRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={(e) => onKeys(e, () => record(outcomeCollection('not_issued', row.amountN, { date: c.date, reason })))}
              />
            </div>
            <Button size="small" variant="primary" onClick={() => record(outcomeCollection('not_issued', row.amountN, { date: c.date, reason }))}>
              Save
            </Button>
            <Link size="small" bold onClick={() => onMode(null)} style={{ lineHeight: '32px' }}>
              Cancel
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

/** What was sent, and who recorded each answer. */
function DisputeDetails({
  section,
  activityHref,
  onDownloadEvidence,
}: {
  section: DisputeSection
  activityHref: string
  onDownloadEvidence: () => void
}) {
  const { record, rows } = section
  const [messageOpen, setMessageOpen] = useState(false)
  const sentOn = new Date(record.sentAt ?? 0)
  const emails = (list: string) =>
    list
      ? list
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean)
          .map((e, i) => (
            <span key={e}>
              {i > 0 && ', '}
              <Link href={`mailto:${e}`} variant="accent">
                {e}
              </Link>
            </span>
          ))
      : '—'
  const history = rows.flatMap((r) => {
    const c = r.collection
    if (!c || c.status === 'awaiting') return []
    return [
      {
        key: r.id,
        title: r.title,
        now: `${COLLECTION_LABELS[c.status]}${c.status === 'partial' ? ` · ${fmtMoney(c.amountN ?? 0)}` : ''}`,
        by: [c.changedBy, c.changedAt ? fmtDateTime(new Date(c.changedAt)) : null].filter(Boolean).join(' · '),
        before: (() => {
          const prev = [...c.history].reverse().find((h) => h.status !== c.status)
          return prev ? COLLECTION_LABELS[prev.status] : null
        })(),
      },
    ]
  })
  const box = { background: 'var(--ds-bg-default)', border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-medium)', padding: '4px 16px' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={box}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'fit-content(170px) minmax(0, 1fr)', columnGap: 16, margin: 0 }}>
          <Detail
            l={record.via === 'manual' ? 'Confirmed by' : 'Sent by'}
            v={record.via === 'manual' ? `${record.sentBy} · sent from their own email` : `${record.sentBy} · from ${record.senderEmail ?? 'the connected account'}`}
          />
          <Detail l="Date and time" v={`${fmtDateTime(sentOn)}${record.sentAfterDeadline ? ' · sent after the deadline' : ''}`} />
          {record.preparedAt && (
            <Detail l="Prepared" v={`${fmtDateTime(new Date(record.preparedAt))} by ${record.preparedBy ?? record.sentBy} · ${plural(record.handoffs.length, 'handoff')}`} />
          )}
          <Detail l="To" v={emails(record.to)} />
          <Detail l="CC" v={emails(record.cc)} />
          <Detail l="Subject" v={record.subject} />
          <Detail
            l="Files"
            v={
              <span style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span>{record.attachments.join(' · ') || '—'}</span>
                <Link variant="accent" size="small" bold onClick={onDownloadEvidence}>
                  Download the credit memo
                </Link>
              </span>
            }
          />
          <Detail
            l="Message"
            last
            v={
              record.body ? (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link variant="accent" size="small" bold aria-expanded={messageOpen} onClick={() => setMessageOpen((o) => !o)} style={{ alignSelf: 'flex-start' }}>
                    {messageOpen ? 'Hide the message' : 'Show the message'}
                  </Link>
                  {messageOpen && (
                    <span className="imp-small" style={{ margin: 0 }}>
                      {record.via === 'manual'
                        ? `Email as prepared in Implentio${record.preparedAt ? ` on ${fmtDateShort(new Date(record.preparedAt))}` : ''}. Your Sent folder has the final version.`
                        : 'An exact copy of what was sent.'}
                    </span>
                  )}
                  {messageOpen && (
                    <span className="ds-body-base" style={{ whiteSpace: 'pre-wrap', fontWeight: 'var(--ds-weight-regular)', background: 'var(--ds-bg-disabled)', border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-small)', padding: '10px 12px' }}>
                      {record.body}
                    </span>
                  )}
                </span>
              ) : (
                'Not stored for this dispute'
              )
            }
          />
        </dl>
      </div>
      {history.length > 0 && (
        <div style={{ ...box, padding: '10px 16px' }}>
          <div className="ds-body-base ds-w-semi" style={{ marginBottom: 6 }}>
            Outcome history
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((h) => (
              <li key={h.key} className="ds-body-small">
                <span className="ds-w-medium">{h.title}:</span> {h.now}
                {h.before ? ` (was ${h.before})` : ''}
                {h.by && <span className="ds-muted"> — recorded by {h.by}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link to={activityHref} variant="accent" size="small" bold style={{ alignSelf: 'flex-start' }}>
        See all activity for this credit memo
      </Link>
    </div>
  )
}

function Detail({ l, v, last }: { l: string; v: ReactNode; last?: boolean }) {
  const border = last ? undefined : '1px solid var(--ds-stroke-disabled)'
  return (
    <>
      <dt className="ds-body-base ds-muted" style={{ padding: '10px 0', borderBottom: border }}>
        {l}
      </dt>
      <dd className="ds-body-base ds-w-medium" style={{ margin: 0, padding: '10px 0', borderBottom: border, overflowWrap: 'anywhere' }}>
        {v}
      </dd>
    </>
  )
}
