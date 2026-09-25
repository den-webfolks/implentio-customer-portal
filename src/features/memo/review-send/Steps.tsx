/** Step 1 of Review & send (what you're disputing) and the recipients header
 *  that tops step 2. Step 2 (StepEmail) and step 3 (StepReview) have their own files. */
import { ClockIcon } from '@heroicons/react/24/outline'
import type { RefObject } from 'react'
import { fmtDateLong, countdownText } from '@/domain/dates'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { Link } from '@/ui/Link/Link'
import { Checkbox } from '@/ui/Form/Choice'
import { TextField } from '@/ui/Form/TextField'
import type { DisputeEmailModel } from './email'
import styles from './ReviewSend.module.css'

export function StepSelection({
  model,
  deadline,
  notIncluded,
  canChange,
  onChange,
  titleRef,
}: {
  model: DisputeEmailModel
  /** Earliest deadline among the selected findings. */
  deadline: { date: string; daysLeft: number } | null
  /** Open findings left out of this dispute. */
  notIncluded: { count: number; amountN: number } | null
  canChange: boolean
  onChange: () => void
  titleRef: RefObject<HTMLHeadingElement | null>
}) {
  return (
    <>
      <h3 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
        What you’re disputing
      </h3>
      <div className={styles.selection}>
        {model.rows.map((r) => (
          <div key={r.id} className={styles.selRow}>
            <span className="ds-body-base ds-w-medium">{r.title}</span>
            <span className={`ds-body-small ds-muted ${styles.selMeta}`}>{r.meta}</span>
            <span className={`ds-body-base ds-w-semi ${styles.selAmount}`}>{fmtMoney(r.amountN)}</span>
          </div>
        ))}
        <div className={styles.selTotal}>
          <span className="ds-body-base">
            <strong className="ds-w-semi">Total you’re claiming: {fmtMoney(model.amountN)}</strong>
            <span className="ds-muted">
              {' '}
              · {plural(model.packages, 'package')} on {plural(model.invoices, 'invoice')}
            </span>
          </span>
          {canChange && (
            <Link variant="accent" size="small" bold onClick={onChange}>
              Change selection
            </Link>
          )}
        </div>
      </div>
      {(deadline || notIncluded) && (
        <p className={`ds-body-base ${styles.deadline}`}>
          <ClockIcon aria-hidden="true" />
          <span>
            {deadline && (
              <>
                Dispute by {fmtDateLong(deadline.date)} ({countdownText(deadline.daysLeft).toLowerCase()}).{' '}
              </>
            )}
            {notIncluded && (
              <>
                {plural(notIncluded.count, 'other finding')} ({fmtMoney(notIncluded.amountN)}) {notIncluded.count === 1 ? 'is' : 'are'} not included. {notIncluded.count === 1 ? 'It stays' : 'They stay'} open
                {deadline ? ' until then' : ''}.
              </>
            )}
          </span>
        </p>
      )}
    </>
  )
}

export interface RecipientFields {
  to: string
  cc: string
  subject: string
  csmOptIn: boolean
  saveContact: boolean
}

export function RecipientsHeader({
  provider,
  fields,
  onChange,
  onCsm,
  contactEmail,
  hasContact,
  defaultSubject,
  invalidTo,
  invalidCc,
  onToBlur,
  onCcBlur,
  toRef,
  ccRef,
  subjectRef,
}: {
  provider: string
  fields: RecipientFields
  onChange: (patch: Partial<RecipientFields>) => void
  onCsm: (on: boolean) => void
  /** The dispute contact on file for this Biller. */
  contactEmail: string | null
  hasContact: boolean
  defaultSubject: string
  invalidTo: string | null
  invalidCc: string | null
  onToBlur: () => void
  onCcBlur: () => void
  toRef: RefObject<HTMLInputElement | null>
  ccRef: RefObject<HTMLInputElement | null>
  subjectRef: RefObject<HTMLInputElement | null>
}) {
  const toChanged = fields.to.trim().toLowerCase() !== (contactEmail ?? '').toLowerCase()
  return (
    <div className={styles.compose}>
      <div className={styles.composeFields}>
        <div className={styles.recipients}>
          <TextField
            ref={toRef}
            label="To"
            type="text"
            value={fields.to}
            onChange={(e) => onChange({ to: e.target.value })}
            onBlur={onToBlur}
            validation={invalidTo ? 'invalid' : undefined}
            message={invalidTo ?? undefined}
            // Always a line under the field, so an error replaces it rather than pushing the rest down.
            caption={!hasContact || !fields.to.trim() ? `Add ${provider}’s billing email` : toChanged ? `Instead of ${contactEmail}, the dispute contact on file` : `${provider}’s dispute contact, from your Biller contacts`}
          />
          <TextField
            ref={ccRef}
            label="CC"
            type="text"
            optional
            value={fields.cc}
            onChange={(e) => onChange({ cc: e.target.value })}
            onBlur={onCcBlur}
            validation={invalidCc ? 'invalid' : undefined}
            message={invalidCc ?? undefined}
            caption="Separate addresses with commas"
          />
        </div>
        <div className={styles.subjectRow}>
          <TextField ref={subjectRef} label="Subject" type="text" value={fields.subject} onChange={(e) => onChange({ subject: e.target.value })} />
          {fields.subject !== defaultSubject && (
            <Link variant="accent" size="small" bold onClick={() => onChange({ subject: defaultSubject })} style={{ marginBottom: 10 }}>
              Reset
            </Link>
          )}
        </div>
      </div>
      <div className={styles.composeOptions}>
        <Checkbox
          checked={fields.csmOptIn}
          onCheckedChange={onCsm}
          label={<span className="ds-w-medium">CC my Implentio support team</span>}
          description={`They can answer ${provider}’s questions about the findings.`}
        />
        {(toChanged || !hasContact) && fields.to.trim() && (
          <Checkbox
            checked={fields.saveContact}
            onCheckedChange={(on) => onChange({ saveContact: on })}
            label={<span className="ds-w-medium">Save this address as {provider}’s dispute contact</span>}
          />
        )}
      </div>
    </div>
  )
}
