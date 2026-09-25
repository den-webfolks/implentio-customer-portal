/** Step 3 · Review & send. The full summary note 309 asks for, right above
 *  the one Send click; then either the connected send, the recommendation to
 *  connect, or the guided checklist for sending by hand. Every handoff on the
 *  checklist is reported up so the dispute becomes "prepared". */
import type { RefObject } from 'react'
import { ArrowDownTrayIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/20/solid'
import type { DisputeRecord, EmailAccountStatus, EmailProvider, HandoffMethod } from '@/domain/types'
import { COMPOSE_LABELS, type ComposeProvider } from '@/domain/dispute-email'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { Tag } from '@/ui/Chip/StatusChip'
import type { DisputeEmailModel, EmailSnapshot } from './email'
import styles from './ReviewSend.module.css'

export type Route = 'connected' | 'manual' | 'choose'

/** Where an Edit link lands: the selection, or a field on the email step. */
export type EditTarget = 'selection' | 'to' | 'subject' | 'evidence'

export interface ConnectState {
  status: 'idle' | 'connecting' | 'cancelled'
  provider: EmailProvider | null
}

export interface Mailbox {
  provider: EmailProvider
  name: string
  email: string
}

const PROVIDER_NAME: Record<EmailProvider, string> = { gmail: 'Gmail', outlook: 'Outlook' }
const PROVIDER_LOGO: Record<EmailProvider, string> = { gmail: '/brand/gmail.png', outlook: '/brand/outlook.png' }

const CREATE_METHODS: HandoffMethod[] = ['eml', 'gmail', 'outlook', 'outlook_com', 'copy', 'copy_part']

export function StepReview({
  model,
  provider,
  snapshot,
  mailbox,
  accountStatus,
  route,
  onRoute,
  onEdit,
  includeComplete,
  onIncludeComplete,
  wholeMemo,
  connect,
  onConnect,
  onCancelConnect,
  record,
  changed,
  blockedByPrepared,
  bodyFitsLink,
  onOpenEml,
  onOpenCompose,
  onCopyPart,
  onDownloadAll,
  evidenceEdited,
  recipientsOk,
  titleRef,
}: {
  model: DisputeEmailModel
  provider: string
  snapshot: EmailSnapshot
  mailbox: Mailbox | null
  accountStatus: Record<EmailProvider, EmailAccountStatus>
  route: Route
  onRoute: (r: Route) => void
  /** Jump back to change something, landing on it. */
  onEdit: (target: EditTarget) => void
  includeComplete: boolean
  onIncludeComplete: (on: boolean) => void
  wholeMemo: boolean
  connect: ConnectState
  onConnect: (p: EmailProvider) => void
  onCancelConnect: () => void
  /** The prepared record, once anything has left the app. */
  record: DisputeRecord | null
  /** The email changed in the app after it last left. */
  changed: boolean
  /** A new selection while an earlier email is still unanswered. */
  blockedByPrepared: DisputeRecord | null
  /** The message fits in a web-mail compose link; otherwise it travels by clipboard. */
  bodyFitsLink: boolean
  onOpenEml: () => void
  onOpenCompose: (p: ComposeProvider) => void
  onCopyPart: (label: string, value: string, method: HandoffMethod) => void
  /** Every attachment in one .zip. */
  onDownloadAll: () => void
  /** The customer rewrote the evidence on the email step. */
  evidenceEdited: boolean
  /** To and CC are valid addresses now. */
  recipientsOk: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
}) {
  const files = model.attachments
  const created = !!record?.handoffs.some((h) => CREATE_METHODS.includes(h.method))
  const expired = (['gmail', 'outlook'] as const).find((p) => accountStatus[p] === 'expired') ?? null

  const summary = (
    <dl className={`ds-body-base ${styles.summary}`}>
      {mailbox && route === 'connected' && (
        <>
          <dt>From</dt>
          <dd>
            <span>
              {mailbox.name} · {mailbox.email}
            </span>
            <Link variant="accent" size="small" bold onClick={() => onRoute('manual')}>
              {record ? 'Already sent it from your mail app? Answer here' : 'Send it yourself instead'}
            </Link>
          </dd>
        </>
      )}
      <dt>To / CC</dt>
      <dd>
        <span>{[snapshot.to || 'not set', snapshot.cc].filter(Boolean).join(' · ')}</span>
        <Link variant="accent" size="small" bold onClick={() => onEdit('to')} aria-label="Edit recipients">
          Edit
        </Link>
      </dd>
      <dt>Subject</dt>
      <dd>
        <span>{snapshot.subject}</span>
        <Link variant="accent" size="small" bold onClick={() => onEdit('subject')} aria-label="Edit the subject">
          Edit
        </Link>
      </dd>
      <dt>Disputing</dt>
      <dd>
        <span>
          {wholeMemo ? 'Complete credit memo' : plural(model.rows.length, 'finding')} · {fmtMoney(model.amountN)}
        </span>
        <Link variant="accent" size="small" bold onClick={() => onEdit('selection')} aria-label="Edit what you're disputing">
          Edit
        </Link>
      </dd>
      {evidenceEdited && (
        <>
          <dt>Email</dt>
          <dd>
            <span>Evidence edited by you — check it matches the files</span>
            <Link variant="accent" size="small" bold onClick={() => onEdit('evidence')} aria-label="Check the edited evidence">
              Check
            </Link>
          </dd>
        </>
      )}
      <dt>Files</dt>
      <dd>
        <span>{files.map((f) => f.name).join(' · ')}</span>
        {!wholeMemo && (
          <Link variant="accent" size="small" bold onClick={() => onIncludeComplete(!includeComplete)}>
            {includeComplete ? 'Remove the complete credit memo' : '+ Add the complete credit memo'}
          </Link>
        )}
      </dd>
    </dl>
  )

  return (
    <>
      <h3 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
        Review &amp; send
      </h3>
      {blockedByPrepared && (
        <Banner type="warning" title={`First tell us whether you sent the email prepared on ${shortDate(blockedByPrepared.preparedAt)}.`}>
          One email at a time per credit memo. Choose “I sent it” below once it’s sent, then tick the next findings to dispute.
        </Banner>
      )}
      {record && !record.recipientsChecked && !recipientsOk && (
        <Banner type="info" title="The email left the app before its recipients were complete.">
          <Link variant="accent" size="small" bold onClick={() => onEdit('to')}>
            Check the recipients
          </Link>
        </Banner>
      )}
      {summary}

      {route === 'connected' && mailbox && (
        <p className={`ds-body-small ${styles.lead}`}>
          {record ? 'Send dispute sends it again from your mailbox. If it already went from your mail app, choose “Answer here” above instead. ' : ''}A copy of exactly what’s sent is saved to this dispute. You’ll also find it in your{' '}
          {mailbox.name} Sent folder.
        </p>
      )}

      {route === 'choose' && (
        <div className={styles.routes}>
          <section className={styles.recommended} aria-labelledby="rs-connect-title">
            <span className={styles.recommendedTag}>
              <Tag>Recommended</Tag>
            </span>
            <h4 id="rs-connect-title" className="ds-heading-small" style={{ margin: 0 }}>
              Send from your own Gmail or Outlook, in one click
            </h4>
            <ul className={`ds-body-base ${styles.benefits}`}>
              <li>
                <CheckCircleIcon aria-hidden="true" />
                Goes from your address, with all {plural(files.length, 'file')} attached
              </li>
              <li>
                <CheckCircleIcon aria-hidden="true" />
                Recorded as sent automatically. Nothing to copy, attach or confirm
              </li>
              <li>
                <CheckCircleIcon aria-hidden="true" />
                An exact copy is kept for your records
              </li>
            </ul>
            {connect.status === 'connecting' ? (
              <p className="ds-body-base" style={{ margin: 0 }} aria-live="polite">
                Connecting to {connect.provider === 'gmail' ? 'Google' : 'Microsoft'}… finish on their screen, then come back here.{' '}
                <Link size="small" bold onClick={onCancelConnect}>
                  Cancel
                </Link>
              </p>
            ) : (
              <>
                {connect.status === 'cancelled' && (
                  <p className="ds-body-base ds-w-medium" style={{ margin: 0 }} aria-live="polite">
                    Connection cancelled. You can try again, or send it yourself.
                  </p>
                )}
                {expired && (
                  <p className="ds-body-base ds-w-medium" style={{ margin: 0 }}>
                    Your {PROVIDER_NAME[expired]} connection expired. Reconnect to send from it again.
                  </p>
                )}
                <div className={styles.connectButtons}>
                  {([...(expired ? [expired] : []), ...(['gmail', 'outlook'] as const).filter((p) => p !== expired)] as EmailProvider[]).map((p) => (
                      <Button key={p} variant={p === expired ? 'primary' : 'secondary'} iconLeft={<img src={PROVIDER_LOGO[p]} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />} onClick={() => onConnect(p)}>
                        {p === expired ? 'Reconnect' : 'Connect'} {PROVIDER_NAME[p]}
                      </Button>
                    ))}
                </div>
              </>
            )}
            <p className="ds-body-small ds-muted" style={{ margin: 0 }}>
              Send-only permission: Implentio can’t read, search or delete your email.
            </p>
          </section>
          <div className={styles.manualBox}>
            <div>
              <div className="ds-body-base ds-w-semi">Send it yourself</div>
              <div className="ds-body-small ds-muted">Open the email in your mail app, attach the files, send it, then confirm here.</div>
            </div>
            <Button onClick={() => onRoute('manual')}>Continue manually</Button>
          </div>
        </div>
      )}

      {route === 'manual' && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="ds-body-base ds-w-semi">Send it yourself</span>
            <Link variant="accent" size="small" bold onClick={() => onRoute(mailbox ? 'connected' : 'choose')}>
              ← {mailbox ? 'Send from my mailbox instead' : 'Connect instead'}
            </Link>
          </div>
          {changed && (
            <Banner type="warning" title="You changed the email after opening it.">
              Open it again so your mail app has the new version.
            </Banner>
          )}
          <ol className={styles.checklist}>
            <ChecklistItem n={1} done={created} title="Create the email">
              <div className={styles.buttonRow}>
                <Button variant="primary" size="small" iconLeft={<EnvelopeIcon aria-hidden="true" />} onClick={onOpenEml}>
                  Download the email (.eml) — files attached
                </Button>
                <span className="ds-body-small ds-muted">Open it in Outlook desktop for a ready draft with every file attached. Other mail apps show it as a message to forward.</span>
              </div>
              <div className={styles.buttonRow}>
                {(Object.keys(COMPOSE_LABELS) as ComposeProvider[]).map((p) => (
                  <Button key={p} size="small" onClick={() => onOpenCompose(p)}>
                    {COMPOSE_LABELS[p]}
                  </Button>
                ))}
                <span className="ds-body-small ds-muted">
                  {bodyFitsLink
                    ? 'Web mail opens a new message with To, CC, subject and text filled in. Attach the files in the next item.'
                    : 'Web mail opens a new message with To, CC and subject. The text is long, so it goes on your clipboard — paste it in, then attach the files.'}
                </span>
              </div>
              <CopyParts snapshot={snapshot} onCopy={onCopyPart} />
            </ChecklistItem>
            <ChecklistItem n={2} done={!!record?.handoffs.some((h) => h.method === 'download')} title="Attach the files (web mail only)">
              <div className={styles.buttonRow}>
                <Button size="small" iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={onDownloadAll}>
                  Download all files (.zip)
                </Button>
                <span className="ds-body-small ds-muted">{files.map((f) => f.name).join(' · ')}</span>
              </div>
              <span className="ds-body-small ds-muted">
                Unzip it (your browser may do this for you) and attach the {plural(files.length, 'file')} inside — not the .zip itself, which some billers’ mail blocks. Check that {files.length === 1 ? 'it is' : `all ${files.length} are`} attached before sending.
              </span>
            </ChecklistItem>
            <ChecklistItem n={3} done={false} title="Send it from your mail app" />
            <ChecklistItem n={4} done={false} title={`Come back and choose “I sent it”, so we can track ${provider}’s answer`} />
          </ol>
        </>
      )}
    </>
  )
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return 'earlier'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ChecklistItem({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <li className={[styles.item, done ? styles.itemDone : ''].filter(Boolean).join(' ')}>
      <span className={styles.itemNum} aria-hidden="true">
        {done ? <CheckIcon /> : n}
      </span>
      <span className={`ds-body-base ds-w-semi ${styles.itemTitle}`}>
        {title}
        {done && <span className="visually-hidden"> (done)</span>}
      </span>
      {children && <div className={styles.itemBody}>{children}</div>}
    </li>
  )
}

function CopyParts({ snapshot, onCopy }: { snapshot: EmailSnapshot; onCopy: (label: string, value: string, method: HandoffMethod) => void }) {
  const parts: { label: string; value: string }[] = [
    { label: 'To', value: snapshot.to },
    { label: 'CC', value: snapshot.cc },
    { label: 'Subject', value: snapshot.subject },
    { label: 'Message', value: snapshot.body },
  ].filter((p) => p.value)
  return (
    <details className={styles.copyDetails}>
      <summary className={styles.copySummary}>
        <span className={styles.copySummaryClosed}>
          <ChevronDownIcon aria-hidden="true" width={16} height={16} /> Copy each part instead
        </span>
        <span className={styles.copySummaryOpen}>
          <ChevronUpIcon aria-hidden="true" width={16} height={16} /> Copy each part
        </span>
      </summary>
      <div className={styles.copyParts}>
        {parts.map((p) => (
          <CopyRow key={p.label} label={p.label} value={p.value} onCopy={() => onCopy(p.label, p.value, 'copy_part')} />
        ))}
      </div>
    </details>
  )
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <>
      <span className={styles.copyText}>
        <span className="ds-body-small ds-muted">{label}</span>
        <span className={`ds-body-small ${styles.copyValue}`}>{value.split('\n')[0]}</span>
      </span>
      <Button size="small" onClick={onCopy} aria-label={`Copy the ${label.toLowerCase()}`}>
        Copy
      </Button>
    </>
  )
}
