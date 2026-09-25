/** "Review & send" in three steps — what you're disputing, check the email
 *  (recipients, subject, body and files), review & send — and the mechanism
 *  that makes a manual send get recorded: the moment any part of the email
 *  leaves the app the dispute is saved as "prepared", and the question "Did
 *  you send it?" follows the customer (footer, return prompt, close guard,
 *  memo page, tracker) until it's answered. See the Review & send plan
 *  (.local/review-and-send-plan.html) and DESIGN-SYSTEM.md. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import type { AccountSettings, DisputeRecord, EmailProvider, FindingGroup, HandoffMethod, MemoDetail } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { daysUntilDeadline, fmtDateShort, isoDate } from '@/domain/dates'
import { composeLink, evidenceText, type ComposeProvider, type EmailEdits } from '@/domain/dispute-email'
import { useClock } from '@/lib/clock'
import { buildEml, blobToBase64 } from '@/lib/eml'
import { saveBlob } from '@/lib/download'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { Stepper } from '@/ui/Display/Display'
import { TextField } from '@/ui/Form/TextField'
import { useAccountForDispute, useConfirmDisputeSent, useDiscardPreparedDispute, usePrepareDispute, useRecordDisputeSent, useSaveBillerContact, useSetEmailAccountStatus } from '../api'
import { attachmentsZip, billerContact, buildEmailModel, changedSinceHandoff, snapshotOf, subjectFor, type AttachmentSpec } from './email'
import { RecipientsHeader, StepSelection, type RecipientFields } from './Steps'
import { StepEmail } from './StepEmail'
import { StepReview, type ConnectState, type EditTarget, type Route } from './StepReview'
import { FilePreview } from './FilePreview'
import styles from './ReviewSend.module.css'

const STEPS = ["What you're disputing", 'Check the email', 'Review & send'] as const
const SELECTION = 0
const EMAIL = 1
const REVIEW = 2
const SEND_DELAY_MS = 1500
const CONNECT_DELAY_MS = 1300

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The first address that isn't one, or null when the list is fine. */
function invalidAddress(list: string): string | null {
  return (
    list
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .find((x) => !EMAIL_RE.test(x)) ?? null
  )
}

/** The dialog keeps a draft per memo, like the finding selection does. The
 *  wording edits are stored only where they differ from the calculated text,
 *  so a changed selection re-renders the amounts in an unedited opening. */
interface Draft {
  edits: Partial<EmailEdits>
  /** The findings the edited evidence was written for; a new selection drops it. */
  evidenceKey?: string
  fields: RecipientFields | null
  includeComplete: boolean
}
const drafts = new Map<string, Draft>()

export interface ReviewSendModalProps {
  detail: MemoDetail
  /** The ticked findings; empty for a whole-memo dispute. */
  groups: FindingGroup[]
  /** Every finding still open, for "N other findings are not included". */
  openGroups: FindingGroup[]
  /** The memo's email prepared but not confirmed as sent, if any. */
  prepared: DisputeRecord | null
  /** Land on the "Did you send it?" prompt (tracker's Confirm sent). */
  focusPrompt?: boolean
  onChange: () => void
  onClose: () => void
}

export function ReviewSendModal(props: ReviewSendModalProps) {
  const accountQ = useAccountForDispute()
  if (!accountQ.data) return null
  return <ReviewSendInner {...props} account={accountQ.data} />
}

function ReviewSendInner({ detail, groups: groupsAtOpen, openGroups, prepared, focusPrompt = false, onChange, onClose, account }: ReviewSendModalProps & { account: AccountSettings }) {
  const memo = detail.memo
  const now = useClock().now()
  const showToast = useToast()
  const recordSent = useRecordDisputeSent()
  const prepare = usePrepareDispute()
  const confirmSent = useConfirmDisputeSent()
  const discard = useDiscardPreparedDispute()
  const saveContact = useSaveBillerContact()
  const setEmailStatus = useSetEmailAccountStatus()

  // The prepared email owns the selection until it's answered; otherwise the
  // findings ticked when the dialog opened (fixed: sending changes them).
  const [record, setRecord] = useState<DisputeRecord | null>(prepared)
  const [groups] = useState<FindingGroup[]>(() => (prepared ? detail.findingGroups.filter((g) => prepared.groupIds.includes(g.id)) : groupsAtOpen))
  const wholeMemo = detail.findingsUnavailable
  const nothingSelected = !wholeMemo && groups.length === 0 && !prepared
  const contact = billerContact(account, memo.provider)
  const draft = drafts.get(memo.id)

  const [includeComplete, setIncludeComplete] = useState(draft?.includeComplete ?? false)
  const model = useMemo(() => buildEmailModel({ detail, groups, account, includeComplete }), [detail, groups, account, includeComplete])
  const evidenceKey = model.groupIds.join('|')
  // Edited evidence belongs to the findings it was written for; say so when it's dropped.
  const [evidenceReset] = useState(() => draft?.edits.evidence !== undefined && draft.evidenceKey !== evidenceKey)
  const [editsRaw, setEditsRaw] = useState<Partial<EmailEdits>>(() => {
    const saved = draft?.edits ?? {}
    if (evidenceReset) return { opening: saved.opening, closing: saved.closing }
    return saved
  })
  const edits: EmailEdits = {
    opening: editsRaw.opening ?? model.blocks.opening,
    closing: editsRaw.closing ?? model.blocks.closing,
    ...(editsRaw.evidence !== undefined ? { evidence: editsRaw.evidence } : {}),
  }
  const setEdits = (next: EmailEdits) =>
    setEditsRaw({
      ...(next.opening !== model.blocks.opening ? { opening: next.opening } : {}),
      ...(next.closing !== model.blocks.closing ? { closing: next.closing } : {}),
      ...(next.evidence !== undefined && next.evidence !== evidenceText(model.blocks) ? { evidence: next.evidence } : {}),
    })
  const [fields, setFields] = useState<RecipientFields>(
    () =>
      draft?.fields ??
      (prepared
        ? { to: prepared.to, cc: prepared.cc, subject: prepared.subject, csmOptIn: false, saveContact: false }
        : { to: contact?.email ?? '', cc: contact?.cc ?? '', subject: subjectFor(memo), csmOptIn: false, saveContact: !contact }),
  )
  useEffect(() => {
    drafts.set(memo.id, { edits: editsRaw, evidenceKey, fields, includeComplete })
  }, [memo.id, editsRaw, evidenceKey, fields, includeComplete])

  const [step, setStep] = useState(prepared ? REVIEW : SELECTION)
  const [preview, setPreview] = useState<AttachmentSpec | null>(null)
  const [phase, setPhase] = useState<'compose' | 'sending' | 'sent'>('compose')
  const [sentVia, setSentVia] = useState<'connected' | 'manual'>('connected')
  const [route, setRoute] = useState<Route>(prepared ? 'manual' : 'choose')
  const [connect, setConnect] = useState<ConnectState>({ status: 'idle', provider: null })
  // ask: the close guard; date: "When did you send it?"; discard: confirm "I didn't send it".
  const [guard, setGuard] = useState<'ask' | 'date' | 'discard' | null>(null)
  // The likely send date is the day the email last left the app — not today,
  // and not the first day it was prepared if it was opened again since.
  const lastHandoffDay = (r: DisputeRecord | null) => {
    const at = r?.handoffs[r.handoffs.length - 1]?.at ?? r?.preparedAt
    return at ? isoDate(new Date(at)) : isoDate(now)
  }
  const [sentOn, setSentOn] = useState(() => lastHandoffDay(prepared))
  // Address errors show once a field is left, or when Next or Send is chosen.
  const [touched, setTouched] = useState({ to: false, cc: false })
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const titleRef = useRef<HTMLHeadingElement>(null)
  const toRef = useRef<HTMLInputElement>(null)
  const ccRef = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  // Where focus lands after the next step change; the step heading when unset.
  const focusTarget = useRef<EditTarget | 'cc' | null>(null)
  const sentRef = useRef<HTMLButtonElement>(null)
  const sentTitleRef = useRef<HTMLSpanElement>(null)
  // "I sent it" waits a moment after arriving on the last step, so a double-click
  // on "Next: review" can't land on it. Opening straight onto it needs no wait.
  const [sentArmed, setSentArmed] = useState(true)
  const firstRender = useRef(true)
  // Focus moves to the step heading on Next and Back, to the field an Edit
  // link names, or to "I sent it" when asked to.
  const focusField = (target: EditTarget | 'cc' | null) => {
    const el =
      target === 'to' ? toRef.current : target === 'cc' ? ccRef.current : target === 'subject' ? subjectRef.current : target === 'evidence' ? document.getElementById('rs-evidence') : titleRef.current
    el?.focus()
  }
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      if (focusPrompt) requestAnimationFrame(() => sentRef.current?.focus())
      return
    }
    const target = focusTarget.current
    focusTarget.current = null
    requestAnimationFrame(() => focusField(target))
  }, [step, focusPrompt])

  const connected = (['gmail', 'outlook'] as const).find((p) => account.emailAccounts[p].status === 'connected') ?? null
  const mailbox = connected ? { provider: connected, name: connected === 'gmail' ? 'Gmail' : 'Outlook', email: account.emailAccounts[connected].address ?? account.user.email } : null
  // A connected mailbox is the default route; the prepared email is manual by definition.
  // A prepared email can still go from the connected mailbox (review F2).
  const effectiveRoute: Route = route === 'choose' && mailbox ? 'connected' : route
  const unanswered = !!record && record.state === 'prepared' && phase !== 'sent'

  const snapshot = snapshotOf(model, { to: fields.to.trim(), cc: fields.cc.trim(), subject: fields.subject.trim(), edits })
  const changed = changedSinceHandoff(snapshot, record)
  const invalidTo = !fields.to.trim() ? `Add ${memo.provider}’s billing email address.` : invalidAddress(fields.to) ? `“${invalidAddress(fields.to)}” isn’t an email address.` : null
  const invalidCc = invalidAddress(fields.cc) ? `“${invalidAddress(fields.cc)}” isn’t an email address.` : null
  const recipientsOk = !invalidTo && !invalidCc
  const bodyFitsLink = composeLink('gmail', { to: snapshot.to, cc: snapshot.cc, subject: snapshot.subject, body: snapshot.body }).bodyIncluded

  const deadlineIso = groups.map((g) => g.disputeDeadline).filter((d): d is string => !!d).sort()[0] ?? null
  const daysLeft = deadlineIso ? daysUntilDeadline(deadlineIso, now) : null
  const late = daysLeft != null && daysLeft < 0
  const notIncludedGroups = openGroups.filter((g) => !groups.some((s) => s.id === g.id))
  const notIncluded = notIncludedGroups.length ? { count: notIncludedGroups.length, amountN: notIncludedGroups.reduce((s, g) => s + g.varN, 0) } : null

  // The customer comes back to the tab or window: put them on "I sent it",
  // unless they're in the middle of something (review F8).
  useEffect(() => {
    if (!unanswered) return
    const back = () => {
      if (document.visibilityState === 'hidden') return
      const active = document.activeElement
      if (!active || active === document.body || active.getAttribute('role') === 'dialog') requestAnimationFrame(() => sentRef.current?.focus())
    }
    document.addEventListener('visibilitychange', back)
    window.addEventListener('focus', back)
    return () => {
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('focus', back)
    }
  }, [unanswered])

  const go = (next: number, target: EditTarget | 'cc' | null = null) => {
    if (next === REVIEW) setSentArmed(false)
    focusTarget.current = target
    setStep(next)
  }
  const editFromReview = (target: EditTarget) => go(target === 'selection' ? SELECTION : EMAIL, target === 'selection' ? null : target)
  /** Show the address errors and put the customer on the first one. */
  const showRecipientErrors = () => {
    setTouched({ to: true, cc: true })
    const target = invalidTo ? 'to' : 'cc'
    if (step === EMAIL) requestAnimationFrame(() => focusField(target))
    else go(EMAIL, target)
  }

  const toggleCsm = (on: boolean) => {
    const recipients = [account.csm?.email, account.supportEmail].filter((e): e is string => !!e)
    const parts = fields.cc.split(',').map((x) => x.trim()).filter(Boolean)
    for (const r of recipients) {
      const i = parts.findIndex((p) => p.toLowerCase() === r.toLowerCase())
      if (on && i < 0) parts.push(r)
      if (!on && i >= 0) parts.splice(i, 1)
    }
    setFields({ ...fields, csmOptIn: on, cc: parts.join(', ') })
  }

  const persistContact = () => {
    // Only a valid address is worth keeping: a half-typed one would prefill the next dispute.
    if (!fields.saveContact || !recipientsOk) return
    saveContact.mutate({
      id: contact?.id ?? `contact-${memo.provider.toLowerCase()}`,
      biller: memo.provider,
      contact: contact?.contact ?? `${memo.provider} billing`,
      email: fields.to.trim(),
      cc: fields.cc.trim(),
      dispute: true,
      active: true,
    })
  }

  // ---- handoffs: the email leaves the app -------------------------------------
  const handoff = async (method: HandoffMethod) => {
    persistContact()
    const rec = await prepare.mutateAsync({
      memoId: memo.id,
      scope: model.scope,
      groupIds: model.groupIds,
      method,
      ...snapshot,
      recipientsChecked: recipientsOk || !!record?.recipientsChecked,
    })
    setRecord(rec)
    setSentOn(lastHandoffDay(rec))
    setRoute('manual')
    return rec
  }
  const fail = (what: string) => showToast('danger', `${what} Try again, or contact your Implentio customer representative.`)

  const openEml = async () => {
    try {
      const attachments = await Promise.all(
        model.attachments.map(async (a) => ({ name: a.name, mimeType: a.mimeType, base64: await blobToBase64(await a.build()) })),
      )
      const eml = buildEml({ to: snapshot.to, cc: snapshot.cc, subject: snapshot.subject, body: snapshot.body, attachments })
      saveBlob(new Blob([eml], { type: 'message/rfc822' }), `${memo.id} dispute email.eml`)
      await handoff('eml')
    } catch {
      fail('The email couldn’t be created.')
    }
  }
  const openCompose = async (p: ComposeProvider) => {
    const link = composeLink(p, { to: snapshot.to, cc: snapshot.cc, subject: snapshot.subject, body: snapshot.body })
    // Open first, in the click: an await before it reads as a popup to some browsers.
    const opened = window.open(link.url, '_blank', 'noopener')
    if (!link.bodyIncluded) {
      try {
        await navigator.clipboard.writeText(snapshot.body)
        showToast('neutral', 'Message copied — paste it into the email.')
      } catch {
        showToast('danger', 'The message is too long for the link and couldn’t be copied. Use “Copy each part”.')
      }
    }
    if (opened === null) {
      fail('Your browser blocked the new window.')
      return
    }
    await handoff(p)
  }
  const copyPart = async (label: string, value: string, method: HandoffMethod) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast('neutral', `${label} copied.`)
      await handoff(method)
    } catch {
      fail(`The ${label.toLowerCase()} couldn’t be copied.`)
    }
  }
  const downloadAll = async () => {
    try {
      saveBlob(await attachmentsZip(model), `${memo.id} dispute files.zip`)
      await handoff('download')
    } catch {
      fail('The files couldn’t be downloaded.')
    }
  }

  // ---- the connected send ----------------------------------------------------
  const send = () => {
    if (!mailbox) return
    persistContact()
    setPhase('sending')
    clearTimeout(timer.current)
    const done = {
      onSuccess: () => {
        drafts.delete(memo.id)
        setSentVia('connected')
        setPhase('sent')
      },
      onError: () => {
        setPhase('compose')
        fail('The dispute couldn’t be sent.')
      },
    }
    timer.current = setTimeout(() => {
      // A prepared email sent from the mailbox settles the prepared record.
      if (record && record.state === 'prepared') confirmSent.mutate({ disputeId: record.id, sentOn: isoDate(now), via: 'connected', senderEmail: mailbox.email, ...snapshot }, done)
      else recordSent.mutate({ memoId: memo.id, scope: model.scope, groupIds: model.groupIds, via: 'connected', ...snapshot, senderEmail: mailbox.email }, done)
    }, SEND_DELAY_MS)
  }
  const startConnect = (p: EmailProvider) => {
    setConnect({ status: 'connecting', provider: p })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setEmailStatus.mutate({ provider: p, status: 'connected' }, { onSuccess: () => setConnect({ status: 'idle', provider: null }) })
    }, CONNECT_DELAY_MS)
  }
  const cancelConnect = () => {
    clearTimeout(timer.current)
    setConnect({ status: 'cancelled', provider: null })
  }

  // ---- answering "Did you send it?" ----------------------------------------------
  const confirm = () => {
    if (!record) return
    confirmSent.mutate(
      { disputeId: record.id, sentOn },
      {
        onSuccess: (rec) => {
          drafts.delete(memo.id)
          setRecord(rec)
          setSentVia('manual')
          setGuard(null)
          setPhase('sent')
        },
      },
    )
  }
  const discardIt = () => {
    if (!record) return
    discard.mutate(record.id, {
      onSuccess: () => {
        drafts.delete(memo.id)
        onClose()
      },
    })
  }
  const requestClose = () => (unanswered ? setGuard('ask') : onClose())
  const preparedDay = record?.preparedAt ? isoDate(new Date(record.preparedAt)) : isoDate(now)
  // Prepared today: "I sent it" records today (flagged late if it is). Prepared
  // on an earlier day: ask which day it went out.
  const iSentIt = () => {
    if (preparedDay === isoDate(now)) confirm()
    else setGuard('date')
  }

  const sentOnField = (size: 'small' | 'medium') => (
    <div className={styles.promptDate}>
      <TextField label="Sent on" type="date" size={size} min={preparedDay} max={isoDate(now)} value={sentOn} onChange={(e) => setSentOn(e.target.value)} />
    </div>
  )
  const showSent = step === REVIEW && unanswered && effectiveRoute !== 'connected'
  const arrivedRef = useRef(step)
  useEffect(() => {
    if (arrivedRef.current === step) return
    arrivedRef.current = step
    if (step !== REVIEW) return
    // go() disarmed it on the way in; re-arm after a moment.
    const t = setTimeout(() => setSentArmed(true), 600)
    return () => clearTimeout(t)
  }, [step])
  // After a send, focus the result so it's announced.
  useEffect(() => {
    if (phase === 'sent') requestAnimationFrame(() => sentTitleRef.current?.focus())
  }, [phase])
  const deadlineText = deadlineIso ? fmtDateShort(new Date(deadlineIso + 'T00:00:00')) : ''
  const lateNote = late ? `On or before ${deadlineText} counts as on time; after that ${memo.provider} may refuse it.` : ''

  // ---- footer --------------------------------------------------------------------
  let footer: React.ReactNode
  let footerStart: React.ReactNode
  if (nothingSelected) {
    footer = (
      <Button variant="primary" onClick={onClose}>
        Choose findings
      </Button>
    )
  } else if (phase === 'sent') {
    footer = (
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    )
  } else if (showSent) {
    footerStart = <Button onClick={() => go(step - 1)}>Back</Button>
    footer = (
      <Button ref={sentRef} variant="primary" loading={confirmSent.isPending} disabled={!sentArmed} onClick={iSentIt}>
        I sent it
      </Button>
    )
  } else {
    footerStart = step === SELECTION ? <Button onClick={requestClose}>Cancel</Button> : <Button onClick={() => go(step - 1)}>Back</Button>
    footer =
      step === SELECTION ? (
        <Button variant="primary" onClick={() => go(EMAIL)}>
          Next: check the email
        </Button>
      ) : step === EMAIL ? (
        <Button variant="primary" onClick={() => (recipientsOk ? go(REVIEW) : showRecipientErrors())}>
          Next: review
        </Button>
      ) : effectiveRoute === 'connected' ? (
        <Button
          variant="primary"
          iconLeft={<PaperAirplaneIcon aria-hidden="true" />}
          loading={phase === 'sending'}
          onClick={() => (recipientsOk ? send() : showRecipientErrors())}
        >
          {phase === 'sending' ? 'Sending…' : 'Send dispute'}
        </Button>
      ) : (
        // Visible from the start so the last step is clear; it wakes up once the email leaves the app.
        <div className={styles.sentFooter}>
          <p id="rs-sent-hint" className={`ds-body-small ${styles.nothingSent}`}>
            Download, open or copy the email first. Nothing is sent from Implentio.
          </p>
          <Button variant="primary" disabled aria-describedby="rs-sent-hint">
            I sent it
          </Button>
        </div>
      )
  }

  const sentTitle = sentVia === 'connected' ? `Request submitted to ${memo.provider} from ${mailbox?.email ?? 'your mailbox'}` : `Sent and recorded — ${memo.provider} dispute`

  return (
    <>
      <Modal
        open
        onClose={requestClose}
        size="large"
        width={960}
        fill={!nothingSelected && phase !== 'sent'}
        title={`Dispute with ${memo.provider}`}
        description={`${memo.id} · ${memo.version} · ${memo.period}`}
        dismissDisabled={phase === 'sending'}
        footer={footer}
        footerStart={footerStart}
      >
        <div className={styles.body}>
          {nothingSelected ? (
            <p className="ds-body-base" style={{ margin: 0 }}>
              Nothing is selected yet. Tick the findings you want to dispute on the memo page, then choose Review &amp; send.
            </p>
          ) : phase === 'sent' ? (
            <>
              <Banner
                type="success"
                title={
                  <span ref={sentTitleRef} tabIndex={-1} style={{ outline: 'none' }}>
                    {sentTitle}
                  </span>
                }
              >
                {wholeMemo ? 'Complete credit memo' : plural(groups.length, 'finding')} · {fmtMoney(model.amountN)}
                {record?.sentAfterDeadline ? ' · sent after the deadline' : ''}
              </Banner>
              <p className="ds-body-base" style={{ margin: 0 }}>
                <strong className="ds-w-semi">What happens next:</strong> this dispute now shows as waiting on {memo.provider}. When they reply, record their answer on the memo page.
              </p>
              {sentVia === 'manual' && !mailbox && (
                <p className="ds-body-base" style={{ margin: 0 }}>
                  Next time, skip the copying and attaching:{' '}
                  <Link variant="accent" bold to="/account">
                    Connect Gmail or Outlook
                  </Link>
                  .
                </p>
              )}
            </>
          ) : (
            <>
              <Stepper steps={STEPS} current={step} ariaLabel="Review & send steps" />
              {step === SELECTION && (
                <StepSelection
                  model={model}
                  deadline={deadlineIso && daysLeft != null ? { date: deadlineIso, daysLeft } : null}
                  notIncluded={notIncluded}
                  canChange={!wholeMemo && !record}
                  onChange={onChange}
                  titleRef={titleRef}
                />
              )}
              {step === EMAIL && (
                <StepEmail
                  model={model}
                  provider={memo.provider}
                  edits={edits}
                  onEdits={setEdits}
                  onPreview={setPreview}
                  onCopyHandoff={() => void handoff('copy')}
                  copied={unanswered}
                  emailBody={snapshot.body}
                  canChangeSelection={!wholeMemo && !record}
                  onChangeSelection={() => go(SELECTION)}
                  evidenceReset={evidenceReset}
                  header={
                    <RecipientsHeader
                      provider={memo.provider}
                      fields={fields}
                      onChange={(patch) => setFields({ ...fields, ...patch })}
                      onCsm={toggleCsm}
                      contactEmail={contact?.email ?? null}
                      hasContact={!!contact}
                      defaultSubject={subjectFor(memo)}
                      invalidTo={touched.to ? invalidTo : null}
                      invalidCc={touched.cc ? invalidCc : null}
                      onToBlur={() => setTouched((t) => ({ ...t, to: true }))}
                      onCcBlur={() => setTouched((t) => ({ ...t, cc: true }))}
                      toRef={toRef}
                      ccRef={ccRef}
                      subjectRef={subjectRef}
                    />
                  }
                  titleRef={titleRef}
                />
              )}
              {step === REVIEW && (
                <StepReview
                  model={model}
                  provider={memo.provider}
                  snapshot={snapshot}
                  mailbox={mailbox}
                  accountStatus={{ gmail: account.emailAccounts.gmail.status, outlook: account.emailAccounts.outlook.status }}
                  route={effectiveRoute}
                  onRoute={setRoute}
                  onEdit={editFromReview}
                  includeComplete={includeComplete}
                  onIncludeComplete={setIncludeComplete}
                  wholeMemo={wholeMemo}
                  connect={connect}
                  onConnect={startConnect}
                  onCancelConnect={cancelConnect}
                  record={unanswered ? record : null}
                  changed={unanswered && changed}
                  blockedByPrepared={prepared && groupsAtOpen.length > 0 ? prepared : null}
                  bodyFitsLink={bodyFitsLink}
                  onOpenEml={() => void openEml()}
                  onOpenCompose={(p) => void openCompose(p)}
                  onCopyPart={(l, v, m) => void copyPart(l, v, m)}
                  onDownloadAll={() => void downloadAll()}
                  evidenceEdited={edits.evidence !== undefined}
                  recipientsOk={recipientsOk}
                  titleRef={titleRef}
                />
              )}
            </>
          )}
        </div>
      </Modal>

      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}

      {guard === 'ask' && (
        <Modal
          open
          onClose={() => setGuard(null)}
          width={560}
          title={`Before you go: did you send the email to ${memo.provider}?`}
          footer={
            <>
              <Button onClick={onClose}>Not yet</Button>
              <Button variant="primary" loading={confirmSent.isPending} onClick={confirm}>
                Yes, I sent it
              </Button>
            </>
          }
          footerStart={
            <Link size="small" bold onClick={() => setGuard('discard')}>
              I didn’t send it — discard
            </Link>
          }
        >
          <p className="ds-body-base" style={{ margin: 0 }}>
            It’s saved, and this memo keeps asking until you answer. {late ? lateNote : `Tell us what happened so we can track ${memo.provider}’s answer.`}
          </p>
          {sentOnField('medium')}
        </Modal>
      )}

      {guard === 'date' && (
        <Modal
          open
          onClose={() => setGuard(null)}
          width={560}
          title={`When did you send the email to ${memo.provider}?`}
          footer={
            <>
              <Button onClick={() => setGuard(null)}>Cancel</Button>
              <Button variant="primary" loading={confirmSent.isPending} onClick={confirm}>
                Yes, I sent it
              </Button>
            </>
          }
        >
          <p className="ds-body-base" style={{ margin: 0 }}>
            {late ? lateNote : `You prepared it on ${fmtDateShort(new Date(preparedDay + 'T00:00:00'))}. Pick the day it went out.`}
          </p>
          {sentOnField('medium')}
        </Modal>
      )}

      {guard === 'discard' && record && (
        <Modal
          open
          onClose={() => setGuard(null)}
          width={560}
          title="Discard this email?"
          footer={
            <>
              <Button onClick={() => setGuard(null)}>Keep it</Button>
              <Button variant="danger" loading={discard.isPending} onClick={discardIt}>
                Discard — I didn’t send it
              </Button>
            </>
          }
        >
          <p className="ds-body-base" style={{ margin: 0 }}>
            {model.rows.map((r) => r.title).join(', ')} ({fmtMoney(model.amountN)}) {model.rows.length === 1 ? 'becomes' : 'become'} selectable again
            {late ? ', or Expired where the deadline has passed' : ''}. The prepared email stays in this memo’s activity as discarded.
          </p>
        </Modal>
      )}
    </>
  )
}
