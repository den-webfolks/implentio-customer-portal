/** The memo page keeps asking: an amber card for the email that left the app
 *  but was never confirmed as sent. Anyone on the team can answer; the
 *  preparer is named so a teammate knows who to ask (decision, 2026-09-25). */
import { useState } from 'react'
import { EnvelopeOpenIcon } from '@heroicons/react/24/outline'
import type { DisputeRecord } from '@/domain/types'
import { fmtDateShort, fmtDateLong, countdownText, daysUntilDeadline, isoDate } from '@/domain/dates'
import { TextField } from '@/ui/Form/TextField'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Modal } from '@/ui/Modal/Modal'

export function PreparedCard({
  record,
  currentUser,
  memoVersion,
  deadline,
  now,
  mailboxConnected,
  onConfirm,
  onOpen,
  onDiscard,
}: {
  record: DisputeRecord
  currentUser: string
  memoVersion: string
  /** Earliest deadline among the reserved findings (ISO date). */
  deadline: string | null
  now: Date
  mailboxConnected: boolean
  /** "Yes, it was sent" on `sentOn` (ISO date). */
  onConfirm: (sentOn: string) => void
  /** Open Review & send on the checklist. */
  onOpen: () => void
  onDiscard: () => void
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const preparedDay = record.preparedAt ? isoDate(new Date(record.preparedAt)) : isoDate(now)
  // The likely send date: the day the email last left the app.
  const lastAt = record.handoffs[record.handoffs.length - 1]?.at
  const [sentOn, setSentOn] = useState(lastAt ? isoDate(new Date(lastAt)) : preparedDay)
  const preparedOn = record.preparedAt ? fmtDateShort(new Date(record.preparedAt)) : 'earlier'
  const preparer = record.preparedBy ?? record.sentBy
  const mine = preparer === currentUser
  const firstName = preparer.split(' ')[0] ?? preparer
  const daysLeft = deadline ? daysUntilDeadline(deadline, now) : null
  const late = daysLeft != null && daysLeft < 0
  const what = record.scope === 'memo' ? 'the complete credit memo' : plural(record.groupIds.length, 'finding')

  return (
    <section
      aria-labelledby="prepared-title"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1px solid var(--ds-stroke-warning)',
        borderInlineStart: '4px solid var(--ds-stroke-warning)',
        borderRadius: 'var(--ds-radius-large)',
        background: 'var(--ds-bg-warning-muted)',
        padding: '18px 22px',
        scrollMarginTop: 88,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ width: 40, height: 40, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-default)', color: 'var(--ds-status-attention-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <EnvelopeOpenIcon width={20} height={20} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 id="prepared-title" tabIndex={-1} className="ds-heading-small" style={{ margin: 0 }}>
            Email to {record.biller} prepared {preparedOn} by {mine ? 'you' : preparer} — not confirmed as sent
          </h3>
          <p className="ds-body-base" style={{ margin: '4px 0 0' }}>
            {what} · {fmtMoney(record.amountN)}
            {deadline && daysLeft != null && (
              <>
                {' · '}
                {late ? `Deadline was ${fmtDateLong(deadline)}` : `Dispute by ${fmtDateLong(deadline)} · ${countdownText(daysLeft)}`}
              </>
            )}
          </p>
          {!mine && (
            <p className="ds-body-small ds-w-medium" style={{ margin: '4px 0 0' }}>
              Ask {firstName} whether it was sent — then anyone can answer here.
            </p>
          )}
          {late && (
            <p className="ds-body-small ds-w-medium" style={{ margin: '4px 0 0' }}>
              Not confirmed. If it went on or before the deadline, say so; if it wasn’t sent, {record.biller} may refuse it now.
            </p>
          )}
          {record.memoVersion !== memoVersion && (
            <p className="ds-body-small ds-w-medium" style={{ margin: '4px 0 0' }}>
              This memo was updated after the email was prepared ({record.memoVersion} → {memoVersion}). Confirming records the version that was sent.
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px 16px', flexWrap: 'wrap' }}>
        <div style={{ width: 170 }}>
          <TextField label="Sent on" type="date" size="small" min={preparedDay} max={isoDate(now)} value={sentOn} onChange={(e) => setSentOn(e.target.value)} />
        </div>
        <Button variant="primary" size="small" onClick={() => onConfirm(sentOn)}>
          {mine ? 'Yes, I sent it' : 'Yes, it was sent'}
        </Button>
        <Button size="small" onClick={onOpen}>
          Open the email again
        </Button>
        <Link size="small" bold onClick={() => setConfirmDiscard(true)} style={{ marginBottom: 6 }}>
          {mine ? 'I didn’t send it' : 'It wasn’t sent'}
        </Link>
        {!mailboxConnected && (
          <span className="ds-body-small ds-muted" style={{ marginInlineStart: 'auto', marginBottom: 6 }}>
            Connected mailboxes record sends automatically.{' '}
            <Link variant="accent" size="small" bold to="/account">
              Connect Gmail or Outlook
            </Link>
          </span>
        )}
      </div>

      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        width={560}
        title="Discard this email?"
        footer={
          <>
            <Button onClick={() => setConfirmDiscard(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDiscard(false)
                onDiscard()
              }}
            >
              Discard — I didn’t send it
            </Button>
          </>
        }
      >
        <p className="ds-body-base" style={{ margin: 0 }}>
          {what} ({fmtMoney(record.amountN)}) {record.groupIds.length === 1 || record.scope === 'memo' ? 'becomes' : 'become'} selectable again{late ? ', or Expired where the deadline has passed' : ''}. The prepared email stays in
          this memo’s activity as discarded.
        </p>
      </Modal>
    </section>
  )
}
