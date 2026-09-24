/** "Review & send" — one screen from selection to sent (replaces the
 *  prototype's 3-step Prepare-for-Biller wizard, template ~6605–7028): what's
 *  included, recipients, the message exactly as the Biller will see it, and
 *  how to send it (connected mailbox, or a downloaded ready-to-send email). */
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownTrayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useDataSource } from '@/data/DataSourceProvider'
import { queryKeys } from '@/data/queries'
import type { AccountSettings, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { plural } from '@/domain/plural'
import { evidenceFileName } from '@/domain/memo'
import { emailLine, findingProblem } from '@/domain/finding-copy'
import { buildEml, blobToBase64 } from '@/lib/eml'
import { saveBlob } from '@/lib/download'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { Checkbox, RadioGroup } from '@/ui/Form/Choice'
import { TextArea, TextField } from '@/ui/Form/TextField'
import { useAccountForDispute, useRecordDisputeSent } from './api'
import { COMPLETE_MEMO_TITLE } from './derive'

type Method = 'connected' | 'manual'
type Phase = 'compose' | 'sending' | 'downloaded' | 'sent'

const SEND_DELAY_MS = 1500

export function ReviewSendModal(props: {
  detail: MemoDetail
  /** The ticked findings; empty for a whole-memo dispute. */
  groups: FindingGroup[]
  /** Open findings on the memo (decides complete vs selected evidence). */
  openCount: number
  onChange: () => void
  onClose: () => void
}) {
  const accountQ = useAccountForDispute()
  if (!accountQ.data) return null
  return <ReviewSendInner {...props} account={accountQ.data} />
}

function suggestedBody(input: { contact: string; detail: MemoDetail; groups: FindingGroup[]; packages: number; invoices: number; amountN: number; sender: string }) {
  const { contact, detail, groups, packages, invoices, amountN, sender } = input
  const memo = detail.memo
  const lines = groups.length
    ? groups.map((g) => `• ${emailLine(g)}`)
    : [`• ${COMPLETE_MEMO_TITLE}: ${plural(memo.orders ?? 0, 'package')} on ${plural(memo.invoices ?? 0, 'invoice')}, ${fmtMoney(memo.netN ?? 0)}`]
  return [
    `Hi ${contact},`,
    '',
    `We reviewed our parcel invoices for ${memo.period} (${memo.id}) and found charges that don't match our contract:`,
    '',
    ...lines,
    '',
    `In total that's ${fmtMoney(amountN)} across ${plural(packages, 'package')} on ${plural(invoices, 'invoice')}. The attached file lists every package with the billed and contracted amounts.`,
    '',
    'Could you review these and let us know which credits you can issue?',
    '',
    'Thank you,',
    sender,
  ].join('\n')
}

function ReviewSendInner({
  detail,
  groups: groupsAtOpen,
  openCount,
  onChange,
  onClose,
  account,
}: {
  detail: MemoDetail
  groups: FindingGroup[]
  openCount: number
  onChange: () => void
  onClose: () => void
  account: AccountSettings
}) {
  const memo = detail.memo
  const showToast = useToast()
  const recordSent = useRecordDisputeSent()
  // Fixed at open: once sent, these findings stop being "open" upstream.
  const [groups] = useState(groupsAtOpen)
  const wholeMemo = detail.findingsUnavailable

  // Each package belongs to one finding, so package counts add up; invoices
  // can span findings, so they're counted once.
  const invSet = new Set<string>()
  for (const g of groups) for (const s of g.services) for (const p of s.pkgs) invSet.add(p.inv)
  const amountN = wholeMemo ? (memo.netN ?? 0) : r2(groups.reduce((s, g) => s + g.varN, 0))
  const packages = wholeMemo ? (memo.orders ?? 0) : groups.reduce((s, g) => s + g.packages, 0)
  const invoices = wholeMemo ? (memo.invoices ?? 0) : invSet.size
  const complete = wholeMemo || groups.length === openCount
  const filename = evidenceFileName(memo, complete)

  const contact = account.billerContacts.find((c) => c.biller === memo.provider && c.dispute) ?? account.billerContacts.find((c) => c.biller === memo.provider)
  const connected = (['gmail', 'outlook'] as const).find((p) => account.emailAccounts[p].status === 'connected')
  const mailbox = connected
    ? { name: connected === 'gmail' ? 'Gmail' : 'Outlook', email: account.emailAccounts[connected].address ?? account.user.email }
    : null
  const suggested = suggestedBody({
    contact: contact?.contact ?? `${memo.provider} billing`,
    detail,
    groups,
    packages,
    invoices,
    amountN,
    sender: account.user.name,
  })

  const [to, setTo] = useState(contact?.email ?? '')
  const [cc, setCc] = useState(contact?.cc ?? '')
  const [csmOptIn, setCsmOptIn] = useState(false)
  const [subject, setSubject] = useState(`Parcel invoice review — ${memo.period} — ${memo.id}`)
  const [body, setBody] = useState(suggested)
  const [method, setMethod] = useState<Method>(mailbox ? 'connected' : 'manual')
  const [phase, setPhase] = useState<Phase>('compose')
  const sendTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(sendTimer.current), [])

  const toggleCsm = (on: boolean) => {
    setCsmOptIn(on)
    const recipients = [account.csm?.email, account.supportEmail].filter((e): e is string => !!e)
    const parts = cc.split(',').map((x) => x.trim()).filter(Boolean)
    for (const r of recipients) {
      const i = parts.findIndex((p) => p.toLowerCase() === r.toLowerCase())
      if (on && i < 0) parts.push(r)
      if (!on && i >= 0) parts.splice(i, 1)
    }
    setCc(parts.join(', '))
  }

  const record = (via: Method) =>
    recordSent.mutate(
      {
        memoId: memo.id,
        scope: wholeMemo ? 'memo' : 'groups',
        groupIds: groups.map((g) => g.id),
        via,
        to,
        cc,
        subject,
        body,
        evidenceFile: filename,
        senderEmail: via === 'connected' ? (mailbox?.email ?? null) : null,
      },
      { onSuccess: () => setPhase('sent') },
    )

  const send = () => {
    setPhase('sending')
    clearTimeout(sendTimer.current)
    sendTimer.current = setTimeout(() => record('connected'), SEND_DELAY_MS)
  }

  const downloadEmail = async () => {
    try {
      const res = await fetch(`/demo-assets/${encodeURIComponent(detail.file)}`)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const eml = buildEml({
        to,
        cc,
        subject,
        body,
        attachment: { name: filename, mimeType: blob.type || 'application/octet-stream', base64: await blobToBase64(blob) },
      })
      saveBlob(new Blob([eml], { type: 'message/rfc822' }), `${memo.id} dispute email.eml`)
      setPhase('downloaded')
    } catch {
      showToast('danger', 'The email couldn’t be downloaded. Try again, or contact your Implentio customer representative.')
    }
  }

  const missingTo = !to.trim()
  const nothingSelected = !wholeMemo && groups.length === 0
  const sentTitle =
    method === 'connected'
      ? `Dispute sent to ${memo.provider} from ${mailbox?.email ?? 'your mailbox'}`
      : `Dispute recorded as sent to ${memo.provider}`

  const footer = nothingSelected ? (
    <Button variant="primary" onClick={onClose}>
      Choose findings
    </Button>
  ) : phase === 'sent' ? (
      <Button variant="primary" onClick={onClose}>
        Done
      </Button>
    ) : method === 'connected' ? (
      <Button variant="primary" iconLeft={<PaperAirplaneIcon aria-hidden="true" />} loading={phase === 'sending'} disabled={missingTo || !mailbox} onClick={send}>
        {phase === 'sending' ? 'Sending…' : 'Send dispute'}
      </Button>
    ) : phase === 'downloaded' ? (
      <>
        <Button iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={() => void downloadEmail()}>
          Download again
        </Button>
        <Button variant="primary" onClick={() => record('manual')}>
          I sent it
        </Button>
      </>
    ) : (
      <Button variant="primary" iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} disabled={missingTo} onClick={() => void downloadEmail()}>
        Download email
      </Button>
    )

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      width={880}
      title="Review & send"
      description={`${memo.id} · ${memo.provider} · ${memo.period}`}
      footer={footer}
      footerStart={phase === 'sent' || nothingSelected ? undefined : <Button onClick={onClose}>Cancel</Button>}
    >
      {nothingSelected ? (
        <p className="ds-body-base" style={{ margin: 0 }}>
          Nothing is selected yet. Tick the findings you want to dispute on the memo page, then choose Review &amp; send.
        </p>
      ) : phase === 'sent' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Banner type="success" title={sentTitle}>
            {wholeMemo ? COMPLETE_MEMO_TITLE : plural(groups.length, 'finding')} · {fmtMoney(amountN)}
          </Banner>
          <p className="ds-body-base" style={{ margin: 0 }}>
            <strong className="ds-w-semi">What happens next:</strong> this dispute now shows as waiting on {memo.provider}. When they reply, record their answer for each finding on the memo page.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section aria-label="What's included" className="db-card" style={{ gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span className="db-eyebrow" style={{ margin: 0 }}>
                What’s included
              </span>
              {!wholeMemo && (
                <Link variant="accent" size="small" bold onClick={onChange}>
                  Change
                </Link>
              )}
            </div>
            {(wholeMemo ? [{ id: 'memo', title: COMPLETE_MEMO_TITLE, amountN }] : groups.map((g) => ({ id: g.id, title: findingProblem(g), amountN: g.varN }))).map((row) => (
              <div key={row.id} className="ds-body-base" style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span>{row.title}</span>
                <span className="ds-w-semi" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ds-fg-accent-text)' }}>
                  {fmtMoney(row.amountN)}
                </span>
              </div>
            ))}
            <div className="imp-small" style={{ margin: 0, borderTop: '1px solid var(--ds-stroke-disabled)', paddingTop: 8 }}>
              {fmtMoney(amountN)} across {plural(packages, 'package')} on {plural(invoices, 'invoice')}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--ds-space-3) 16px' }}>
            <TextField
              label="To"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              validation={missingTo ? 'invalid' : undefined}
              message={missingTo ? `Add ${memo.provider}’s billing email address.` : undefined}
            />
            <TextField label="CC" type="text" value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
          <Checkbox
            checked={csmOptIn}
            onCheckedChange={toggleCsm}
            label={<span className="ds-w-medium">CC my Implentio support team</span>}
            description="They can help answer the Biller’s questions about the findings."
          />

          <TextField label="Subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <TextArea label={`Message, as ${memo.provider} will see it`} rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span className="imp-small" style={{ margin: 0, overflowWrap: 'anywhere' }}>
                Attachment: {filename}
              </span>
              {body !== suggested && (
                <Link variant="accent" size="small" bold onClick={() => setBody(suggested)}>
                  Reset to suggested text
                </Link>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="ds-body-base ds-w-semi">How do you want to send it?</span>
            <RadioGroup
              aria-label="How do you want to send it?"
              bordered
              value={method}
              onValueChange={(m) => {
                setMethod(m)
                setPhase('compose')
              }}
              options={[
                {
                  value: 'connected',
                  label: mailbox ? `Send from my ${mailbox.name} (${mailbox.email})` : 'Send from my Gmail or Outlook',
                  description: mailbox ? 'Sent for you, with the file attached.' : 'Connect your mailbox once, then send in one click.',
                },
                {
                  value: 'manual',
                  label: 'Download the email and send it myself',
                  description: 'Opens in Outlook or Apple Mail with the file already attached. Web Gmail can’t open it.',
                },
              ]}
            />
            {method === 'connected' && !mailbox && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--ds-space-3)' }}>
                <ConnectButton provider="gmail" label="Connect Gmail" logo="/brand/gmail.png" />
                <ConnectButton provider="outlook" label="Connect Outlook" logo="/brand/outlook.png" />
              </div>
            )}
            {method === 'manual' && phase === 'downloaded' && (
              <Banner type="info" title="Send the downloaded email, then come back and choose “I sent it”.">
                Implentio can’t see emails sent from your own mail app, so this records the dispute.
              </Banner>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Simulated OAuth connect: 1.3s "redirect" then connected (prototype ~13427). */
function ConnectButton({ provider, label, logo }: { provider: 'gmail' | 'outlook'; label: string; logo: string }) {
  const ds = useDataSource()
  const qc = useQueryClient()
  const connect = () => {
    setTimeout(() => {
      void ds.setEmailAccountStatus(provider, 'connected').then(() => qc.invalidateQueries({ queryKey: queryKeys.account }))
    }, 1300)
  }
  return (
    <Button fullWidth iconLeft={<img src={logo} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />} onClick={connect}>
      {label}
    </Button>
  )
}
