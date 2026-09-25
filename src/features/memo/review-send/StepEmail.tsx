/** Step 2 · Check the email. The email is the case: one sentence, the
 *  recipients and subject, then the email as the Biller gets it, and its files. The whole email is editable
 *  in place; the evidence — the amount requested, each claim and its file —
 *  sits on a tinted, locked panel so the numbers keep matching the attached
 *  files. "Edit evidence" unlocks it; "More details" shows what backs each
 *  claim. File names open the same preview as the attachment chips. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon, LockClosedIcon, PaperClipIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { copyIsHandoff, evidenceText, positionSentence, type EmailEdits } from '@/domain/dispute-email'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import type { AttachmentSpec, DisputeEmailModel } from './email'
import styles from './ReviewSend.module.css'

/** A textarea that reads like the email text and grows with its content. */
function InlineText({ label, value, onChange, boxed = false, focusOnMount = false }: { label: string; value: string; onChange: (v: string) => void; boxed?: boolean; focusOnMount?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fit = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useLayoutEffect(fit, [value])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (focusOnMount) ref.current?.focus()
  }, [focusOnMount])
  return (
    <textarea
      ref={ref}
      aria-label={label}
      rows={1}
      className={[styles.inlineText, boxed ? styles.inlineTextBoxed : ''].filter(Boolean).join(' ')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function StepEmail({
  model,
  provider,
  edits,
  onEdits,
  onPreview,
  onCopyHandoff,
  copied,
  emailBody,
  canChangeSelection,
  onChangeSelection,
  evidenceReset,
  header,
  titleRef,
}: {
  model: DisputeEmailModel
  provider: string
  edits: EmailEdits
  onEdits: (edits: EmailEdits) => void
  onPreview: (file: AttachmentSpec) => void
  /** More than one line of the email was copied. */
  onCopyHandoff: () => void
  /** The email has left the app (copied here, or from the last step). */
  copied: boolean
  /** The whole email as plain text, for a copy that spans the editable parts. */
  emailBody: string
  canChangeSelection: boolean
  /** Back to step 1, to leave an item out. */
  onChangeSelection: () => void
  /** Earlier evidence edits were for another selection and were dropped. */
  evidenceReset: boolean
  /** To, CC and Subject, above the email like a mail app's compose window. */
  header: ReactNode
  titleRef: React.RefObject<HTMLHeadingElement | null>
}) {
  const { blocks, attachments, details } = model
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const stepRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLDivElement>(null)
  const evidenceEdited = edits.evidence !== undefined
  const wordingEdited = edits.opening !== blocks.opening || edits.closing !== blocks.closing

  const fileLink = (name: string, key?: string) => {
    const file = attachments.find((a) => a.name === name)
    return file ? (
      <button key={key} type="button" className={styles.fileLink} onClick={() => onPreview(file)}>
        {name}
      </button>
    ) : (
      name
    )
  }
  /** Plain text with every attached file name turned into a preview link. */
  const linkify = (text: string): ReactNode => {
    const names = attachments.map((a) => a.name).sort((a, b) => b.length - a.length)
    if (!names.length) return text
    const re = new RegExp(`(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
    return text.split(re).map((part, i) => (names.includes(part) ? fileLink(part, `f${i}`) : part))
  }
  const restoreEvidence = () => {
    onEdits({ opening: edits.opening, closing: edits.closing })
    setEvidenceOpen(false)
  }

  return (
    <div
      ref={stepRef}
      className={styles.stepEmail}
      onCopy={(e) => {
        // Copying inside one field is editing, not taking the email out.
        const active = document.activeElement
        if ((active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) && stepRef.current?.contains(active)) return
        const sel = window.getSelection()
        const text = sel?.toString() ?? ''
        const email = emailRef.current
        if (!sel || !email || !sel.containsNode(email, true) || !copyIsHandoff(text)) return
        // A page selection skips the fields' contents, so a copy that spans the
        // header, the greeting or the closing would lose them: copy the whole email instead.
        const fields = stepRef.current?.querySelectorAll('textarea, input') ?? []
        if ([...fields].some((f) => sel.containsNode(f, true))) {
          e.preventDefault()
          e.clipboardData.setData('text/plain', emailBody)
        }
        onCopyHandoff()
      }}
    >
      <h3 ref={titleRef} tabIndex={-1} className={styles.stepTitle}>
        Check the email — nothing is sent yet
      </h3>
      <p className={`ds-body-base ${styles.lead}`}>{positionSentence({ provider, amountN: model.amountN, claims: model.input.claims })}</p>

      {header}

      <div ref={emailRef} className={styles.email}>
        {evidenceReset && (
          <p className={`ds-body-small ${styles.resetNote}`}>Your evidence edits were for a different selection, so the evidence is back to the calculated text.</p>
        )}
        <div className={`${styles.emailTools} ${styles.chrome}`}>
          <span className="ds-body-small ds-muted">Click the text to change it.</span>
          {wordingEdited && (
            <Link variant="accent" size="small" bold onClick={() => onEdits({ ...edits, opening: blocks.opening, closing: blocks.closing })}>
              Undo my changes
            </Link>
          )}
        </div>
        <div className={styles.emailBody}>
          <InlineText label="Opening" value={edits.opening} onChange={(opening) => onEdits({ ...edits, opening })} />

          <section id="rs-evidence" tabIndex={-1} className={styles.evidence} aria-labelledby="rs-evidence-title">
            <div className={`${styles.evidenceHead} ${styles.chrome}`}>
              {evidenceEdited || evidenceOpen ? <PencilSquareIcon aria-hidden="true" /> : <LockClosedIcon aria-hidden="true" />}
              <div className={styles.evidenceTitle}>
                <span id="rs-evidence-title" className="ds-body-small ds-w-semi">
                  {evidenceEdited ? 'Evidence — edited by you' : evidenceOpen ? 'Editing the evidence' : 'Evidence from your audit'}
                </span>
                <span className="ds-body-small ds-muted">
                  {evidenceOpen || evidenceEdited
                    ? 'Keep the amounts and file names as they are — they must match the attached files.'
                    : 'Locked so the amounts and file names match the attached files.'}
                </span>
              </div>
              <div className={styles.evidenceActions}>
                {evidenceEdited && (
                  <Link size="small" bold onClick={restoreEvidence}>
                    Restore the original
                  </Link>
                )}
                {!evidenceOpen && (
                  <Link variant="accent" size="small" bold iconLeft={<PencilSquareIcon aria-hidden="true" />} onClick={() => setEvidenceOpen(true)}>
                    Edit evidence
                  </Link>
                )}
              </div>
            </div>

            {evidenceOpen ? (
              <>
                <InlineText boxed focusOnMount label="Evidence" value={edits.evidence ?? evidenceText(blocks)} onChange={(evidence) => onEdits({ ...edits, evidence })} />
                {canChangeSelection && (
                  <p className="ds-body-small" style={{ margin: 0 }}>
                    To leave an item out, change what you’re disputing — the files and the amount follow it.{' '}
                    <Link variant="accent" size="small" bold onClick={onChangeSelection}>
                      Change what you’re disputing
                    </Link>
                  </p>
                )}
                <p className={styles.para}>{linkify(blocks.attachmentLines.join('\n'))}</p>
                <div className={styles.editActions}>
                  <Button variant="primary" size="small" onClick={() => setEvidenceOpen(false)}>
                    Done
                  </Button>
                </div>
              </>
            ) : evidenceEdited ? (
              <>
                <p className={styles.para}>{linkify(edits.evidence ?? '')}</p>
                <p className={styles.para}>{linkify(blocks.attachmentLines.join('\n'))}</p>
              </>
            ) : (
              <>
                <p className={styles.para}>{blocks.request}</p>
                {blocks.claims.map((c) => (
                  <div key={c.id} className={styles.claim}>
                    <span className={styles.claimHeading}>{c.heading}</span>
                    <span>{c.body}</span>
                    <span>{linkify(c.fileSentence)}</span>
                  </div>
                ))}
                <p className={styles.para}>{linkify(blocks.attachmentLines.join('\n'))}</p>
              </>
            )}

            <div className={`${styles.detailsBox} ${styles.chrome}`}>
              <Link
                size="small"
                bold
                aria-expanded={detailsOpen}
                aria-controls="rs-evidence-details"
                iconRight={detailsOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
                onClick={() => setDetailsOpen((o) => !o)}
              >
                More details
              </Link>
              {detailsOpen && (
                <div id="rs-evidence-details" className={styles.details}>
                  <p className="ds-body-small ds-muted" style={{ margin: 0 }}>
                    What backs each item. This isn’t part of the email.
                  </p>
                  {details.map((d) => (
                    <div key={d.id} className={styles.detail}>
                      <span className="ds-body-small ds-w-semi">{d.heading}</span>
                      <span className="ds-body-small">
                        Billed {fmtMoney(d.billedN)} · your contract {fmtMoney(d.contractN)} · difference {fmtMoney(d.differenceN)} · {plural(d.invoices, 'invoice')}
                        {d.carriers ? ` · ${d.carriers}` : ''}
                      </span>
                      <span className="ds-body-small ds-muted">{d.how}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <InlineText label="Closing" value={edits.closing} onChange={(closing) => onEdits({ ...edits, closing })} />
        </div>
      </div>

      {copied && (
        <Banner type="info" title={`We saved this email as prepared. When you’ve sent it to ${provider}, come back and choose “I sent it”.`}>
          The findings stay reserved for it until you answer. The files still need attaching in your mail app — the next step has them.
        </Banner>
      )}

      <ul className={styles.attached} aria-label="Attached files">
        <li className={`ds-body-small ${styles.attachedLabel}`}>Attached:</li>
        {attachments.map((a) => (
          <li key={a.name}>
            <button type="button" className={styles.chip} onClick={() => onPreview(a)} aria-label={`Preview ${a.name}`}>
              <PaperClipIcon aria-hidden="true" />
              {a.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
