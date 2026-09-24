/** "Prepare for Biller" 3-step dispute wizard (template ~6605–7028).
 *  Step 1 selects variance groups, step 2 prepares the email, step 3 sends
 *  from a connected account (simulated) or walks the manual path. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useDataSource } from '@/data/DataSourceProvider'
import { queryKeys } from '@/data/queries'
import type { AccountSettings, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { fmtDateShort } from '@/domain/dates'
import { useClock } from '@/lib/clock'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Banner } from '@/ui/Banner/Banner'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { Checkbox } from '@/ui/Form/Choice'
import { TextField, TextArea } from '@/ui/Form/TextField'
import { Spinner, Statistic, Stepper } from '@/ui/Display/Display'
import { saveFile } from '@/lib/download'
import { groupExpired } from '@/domain/outcomes'
import {
  useAccountForDispute,
  useDisputeContext,
  useMarkGroupsPursued,
  useSetDisputeDraft,
} from './api'
import { titleCase } from './derive'
import { plural } from '@/domain/plural'

type SendPhase = 'idle' | 'processing' | 'sent' | 'failed'
type ZipPhase = 'ready' | 'preparing' | 'failed'

export function DisputeWizard(props: {
  detail: MemoDetail
  excludedIds: readonly string[]
  onClose: () => void
}) {
  const accountQ = useAccountForDispute()
  if (!accountQ.data) return null
  return <DisputeWizardInner {...props} account={accountQ.data} />
}

function DisputeWizardInner({
  detail,
  excludedIds,
  onClose,
  account,
}: {
  detail: MemoDetail
  excludedIds: readonly string[]
  onClose: () => void
  account: AccountSettings
}) {
  const memo = detail.memo
  const clock = useClock()
  const showToast = useToast()
  const ctxQ = useDisputeContext()
  const setDraft = useSetDisputeDraft()
  const markPursued = useMarkGroupsPursued()

  const now = clock.now()
  const eligibleGroups = useMemo(
    () => detail.findingGroups.filter((g) => g.pursuit !== 'pursued' && !groupExpired(g, now)),
    [detail.findingGroups, now],
  )

  const contact = account.billerContacts.find((c) => c.biller === memo.provider)
  const csm = account.csm
  const supportEmail = account.supportEmail
  const connectedProvider = (['gmail', 'outlook'] as const).find(
    (p) => account.emailAccounts[p].status === 'connected',
  )
  const emailAccount = connectedProvider
    ? {
        provider: connectedProvider,
        providerName: connectedProvider === 'gmail' ? 'Gmail' : 'Outlook',
        email: account.emailAccounts[connectedProvider].address ?? 'tori@implentio.com',
        initial: connectedProvider === 'gmail' ? 'G' : 'O',
      }
    : null

  const [step, setStep] = useState(detail.findingsUnavailable ? 2 : 1)
  const [to, setTo] = useState(contact?.email ?? '')
  const [cc, setCc] = useState(contact?.cc ?? '')
  const [subject, setSubject] = useState(
    `Implentio parcel credit memo review — ${memo.period} — ${memo.id}`,
  )
  const [intro, setIntro] = useState(
    detail.findingsUnavailable
      ? `Hi ${contact?.contact ?? memo.provider + ' billing'},\n\nImplentio is requesting your review of the attached parcel credit memo for ${memo.period}.\n\nPlease review the findings and confirm which adjustments will be approved.\n\nThank you,\nTori Matthews\nImplentio`
      : `Hi ${contact?.contact ?? memo.provider + ' billing'},\n\nImplentio is requesting your review of the attached parcel invoice findings for ${memo.period}.`,
  )
  const [csmOptIn, setCsmOptIn] = useState(false)
  const [sendPhase, setSendPhase] = useState<SendPhase>('idle')
  const [zipPhase, setZipPhase] = useState<ZipPhase>('ready')
  const [manualSentDone, setManualSentDone] = useState(false)
  const [msgPreviewOpen, setMsgPreviewOpen] = useState(false)
  const [sentInfo, setSentInfo] = useState<{ at: string; email: string; cc: string } | null>(null)
  const zipTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const sendTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      clearTimeout(zipTimer.current)
      clearTimeout(sendTimer.current)
    },
    [],
  )

  const selGroups = eligibleGroups.filter((g) => !excludedIds.includes(g.id))
  const selAmount = selGroups.reduce((s, g) => s + g.varN, 0)
  const pkgSet = new Set<string>()
  const invSet = new Set<string>()
  for (const g of selGroups) for (const s of g.services) for (const p of s.pkgs) {
    pkgSet.add(p.t)
    invSet.add(p.inv)
  }
  const complete = eligibleGroups.length > 0 && selGroups.length === eligibleGroups.length
  const evidenceBase = `${memo.id}-${memo.version.replace(/\s+/g, '-')}`
  const filename = evidenceBase + (complete || detail.findingsUnavailable ? '-Complete-Excel-Evidence.xlsx' : '-Selected-Variance-Evidence.zip')
  const noSelection = !detail.findingsUnavailable && selGroups.length === 0

  const lockedText = detail.findingsUnavailable
    ? `Implentio reviewed the applicable parcel charges and identified ${fmtMoney(memo.netN ?? 0)} in variance being pursued across ${plural(memo.orders ?? 0, 'package')} on ${plural(memo.invoices ?? 0, 'invoice')}.\n\nPlease review the findings and confirm which adjustments will be approved.\n\nThank you,\nTori Matthews\nImplentio`
    : `Implentio reviewed the applicable parcel charges and identified ${fmtMoney(selAmount)} in variance being pursued across ${plural(pkgSet.size, 'package')} on ${plural(invSet.size, 'invoice')}.\n\n` +
      (complete
        ? 'The attached Complete Excel Evidence package includes all published variance groups, affected invoices, package-level details, calculations, and available supporting source references.'
        : `The attached Selected Variance Evidence package includes the ${plural(selGroups.length, 'variance group')} being pursued, with their affected invoices, package-level details, calculations, and available supporting source references.`) +
      '\n\nPlease review the findings and confirm which adjustments will be approved.\n\nThank you,\nTori Matthews\nImplentio'

  const toggleGroup = (g: FindingGroup, selected: boolean) => {
    const nextEx = selected
      ? excludedIds.filter((id) => id !== g.id)
      : [...excludedIds, g.id]
    setDraft.mutate({
      excludedIds: nextEx,
      draftDate: nextEx.length ? (ctxQ.data?.draftDate ?? fmtDateShort(now)) : null,
    })
    if (!complete) simulateZip()
  }

  const simulateZip = () => {
    setZipPhase('preparing')
    clearTimeout(zipTimer.current)
    zipTimer.current = setTimeout(() => setZipPhase('ready'), 900)
  }

  const toggleSelectAll = () => {
    const allSelected = selGroups.length === eligibleGroups.length
    setDraft.mutate({
      excludedIds: allSelected ? eligibleGroups.map((g) => g.id) : [],
      draftDate: allSelected ? fmtDateShort(now) : null,
    })
    simulateZip()
  }

  const toggleCsm = (on: boolean) => {
    setCsmOptIn(on)
    const recipients = [csm?.email, supportEmail].filter((e): e is string => !!e)
    const parts = cc.split(',').map((x) => x.trim()).filter(Boolean)
    for (const r of recipients) {
      const idx = parts.findIndex((p) => p.toLowerCase() === r.toLowerCase())
      if (on && idx < 0) parts.push(r)
      if (!on && idx >= 0) parts.splice(idx, 1)
    }
    setCc(parts.join(', '))
  }

  const doSend = () => {
    if (zipPhase !== 'ready') return
    setSendPhase('processing')
    clearTimeout(sendTimer.current)
    sendTimer.current = setTimeout(() => {
      if (!emailAccount) {
        setSendPhase('failed')
        return
      }
      setSendPhase('sent')
      setSentInfo({ at: now.toLocaleString('en-US'), email: emailAccount.email, cc })
      markPursued.mutate({ groupIds: selGroups.map((g) => g.id), via: 'connected' })
    }, 1500)
  }

  const copyEmail = () => {
    const text = `To: ${to}\nCC: ${cc}\nSubject: ${subject}\n\n${intro}\n\n${lockedText}`
    void navigator.clipboard?.writeText(text).then(
      () => showToast('positive', 'Email text copied to clipboard'),
      () => showToast('danger', 'Unable to copy. Select the message text and copy it manually.'),
    )
  }

  const downloadEvidence = () => {
    saveFile(`/demo-assets/${encodeURIComponent(detail.file)}`, filename)
      .then(() => showToast('positive', `Downloading ${filename}`))
      .catch(() => showToast('danger', 'Unable to download the evidence package. Try again, or contact your Implentio customer representative.'))
  }

  const confirmManualSent = () => {
    setManualSentDone(true)
    markPursued.mutate({ groupIds: selGroups.map((g) => g.id), via: 'manual' })
  }

  const stepLabels = detail.findingsUnavailable
    ? ['Prepare email', 'Ready to send']
    : ['Review package', 'Prepare email', 'Ready to send']
  const displayStep = detail.findingsUnavailable ? step - 1 : step

  const cellBorder = '1px solid var(--ds-stroke-disabled)'
  const kpi = (l: string, v: string, big = false, accent = false) => (
    <div style={{ padding: '14px 18px', borderBottom: big ? undefined : cellBorder, borderInlineEnd: cellBorder }}>
      <Statistic bare label={l} value={v} size={big ? 'medium' : 'tiny'} type={accent ? 'accent' : 'neutral'} />
    </div>
  )

  const footerStart = (
    <>
      {step === 1 && <Button onClick={onClose}>Cancel</Button>}
      {step > 1 && !(detail.findingsUnavailable && step === 2) && <Button onClick={() => setStep((s) => s - 1)}>Back</Button>}
    </>
  )

  const footer = (
    <>
      {step === 1 && (
        <Button variant="primary" disabled={noSelection} onClick={() => setStep(2)}>
          Continue
        </Button>
      )}
      {step === 2 && (
        <Button variant="primary" onClick={() => setStep(3)}>
          Continue
        </Button>
      )}
      {step === 3 && (sendPhase === 'sent' || (!emailAccount && manualSentDone)) && <Button onClick={onClose}>Done</Button>}
      {step === 3 && emailAccount && sendPhase !== 'sent' && (
        <>
          <span className="imp-small" style={{ margin: 0, whiteSpace: 'nowrap' }}>
            Sending from {emailAccount.email}
          </span>
          <Button variant="primary" onClick={doSend} loading={sendPhase === 'processing'}>
            {sendPhase === 'processing' ? 'Sending…' : 'Send dispute'}
          </Button>
        </>
      )}
    </>
  )

  return (
    <Modal open onClose={onClose} size="large" width={960} title="Prepare for Biller" description={`${memo.id} · ${memo.version}`} footer={footer} footerStart={footerStart}>
      <Stepper steps={stepLabels} current={displayStep - 1} ariaLabel="Dispute preparation steps" />

      {step === 1 && !detail.findingsUnavailable && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 className="ds-heading-medium" style={{ margin: 0 }}>
              Review what will be shared with {memo.provider}
            </h2>
            <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '72ch' }}>
              Choose the variance groups you want to pursue with {memo.provider}. Your dispute summary and evidence package update to match your selections.
            </p>
          </div>

          <div className="db-card" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
            <div className="db-eyebrow" style={{ padding: '12px 18px 0', color: 'var(--ds-fg-muted)' }}>
              Complete published credit memo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 10 }}>
              {kpi('Credit memo', memo.id)}
              {kpi('Version', memo.version)}
              {kpi('Audit period', memo.period)}
              {kpi('Biller', memo.provider)}
              {kpi('Total variance identified', fmtMoney(memo.netN ?? 0), true, true)}
              {kpi('Affected invoices', String(memo.invoices ?? 0), true)}
              {kpi('Affected packages', (memo.orders ?? 0).toLocaleString('en-US'), true)}
            </div>
          </div>

          <div className="db-card" style={{ gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="db-eyebrow">Select variance groups to pursue</span>
                <p className="imp-small" style={{ margin: '6px 0 0', maxWidth: '70ch' }}>
                  Choose the variance groups to include in this dispute. Your dispute summary and evidence package update to match your selections.
                </p>
              </div>
              <Button size="small" onClick={toggleSelectAll}>
                {selGroups.length === eligibleGroups.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: cellBorder }}>
              {eligibleGroups.map((g) => {
                const selected = !excludedIds.includes(g.id)
                const invCount = new Set(g.services.flatMap((s) => s.pkgs.map((p) => p.inv))).size
                const pkgCount = g.services.reduce((a, s) => a + s.pkgs.length, 0)
                return (
                  <div key={g.id} style={{ padding: '11px 0', borderTop: cellBorder, opacity: selected ? 1 : 0.55 }}>
                    <Checkbox
                      fullWidth
                      aria-label={g.title}
                      checked={selected}
                      onCheckedChange={(on) => toggleGroup(g, on)}
                      label={
                        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                          <span style={{ minWidth: 0 }}>
                            <span className="ds-w-medium" style={{ display: 'block' }}>
                              {g.title}
                            </span>
                            <span className="imp-small" style={{ display: 'block', marginTop: 2 }}>
                              {plural(pkgCount, 'package')} · {plural(invCount, 'invoice')}
                            </span>
                          </span>
                          <span className="ds-w-semi" style={{ flex: 'none', fontVariantNumeric: 'tabular-nums', color: 'var(--ds-fg-accent-text)' }}>
                            {fmtMoney(g.varN)}
                          </span>
                        </span>
                      }
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: cellBorder, paddingTop: 12 }}>
              <span className="db-eyebrow" style={{ color: 'var(--ds-fg-muted)' }}>
                Selected for this dispute
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px 18px' }}>
                <Statistic bare size="small" label="Variance groups" value={selGroups.length} />
                <Statistic bare size="small" label="Amount pursued" value={fmtMoney(selAmount)} type="accent" />
                <Statistic bare size="small" label="Affected packages" value={pkgSet.size.toLocaleString('en-US')} />
                <Statistic bare size="small" label="Affected invoices" value={invSet.size} />
              </div>
              {noSelection && (
                <p className="ds-body-small" role="alert" style={{ margin: 0, color: 'var(--ds-fg-danger)' }}>
                  Select at least one variance group to prepare this dispute.
                </p>
              )}
            </div>
          </div>

          {selGroups.length > 0 &&
            (() => {
              const top = [...selGroups].sort((a, b) => b.varN - a.varN)[0]
              const p = top?.services[0]?.pkgs[0]
              if (!top || !p) return null
              return (
                <div className="db-card" style={{ gap: 12 }}>
                  <span className="db-eyebrow">Representative package for spot-checking · {top.title}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px 20px' }}>
                    <Statistic bare size="tiny" label="Tracking number" value={p.t} />
                    <Statistic bare size="tiny" label="Source invoice" value={p.inv} />
                    <Statistic bare size="tiny" label="Order number" value={p.so} />
                    <Statistic bare size="tiny" label="Billed" value={fmtMoney(p.ti)} />
                    <Statistic bare size="tiny" label="Expected" value={fmtMoney(p.te)} />
                    <Statistic bare size="tiny" label="Net variance" value={fmtMoney(p.tv)} type="accent" />
                  </div>
                  <p className="imp-small" style={{ margin: 0, maxWidth: '74ch' }}>
                    {p.car} {titleCase(p.sv)} from {p.wh}. Base freight was billed above the expected rate for this service and weight; the remaining charges matched.
                  </p>
                </div>
              )
            })()}
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h2 className="ds-heading-medium" style={{ margin: 0 }}>
              Prepare your email to {memo.provider}
            </h2>
            <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '72ch' }}>
              Implentio will prepare the message and evidence package. You will send it using your own email for this release.
            </p>
          </div>

          {detail.findingsUnavailable && (
            <Banner type="info" title="The complete credit memo will be included">
              A detailed variance-group breakdown is unavailable, so this dispute includes the complete credit memo.
            </Banner>
          )}

          {emailAccount ? (
            <div className="db-card" style={{ gap: 12, flexDirection: 'row', alignItems: 'center' }}>
              <img src={emailAccount.provider === 'gmail' ? '/brand/gmail.png' : '/brand/outlook.png'} alt="" width={28} height={28} style={{ objectFit: 'contain', flex: 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div className="ds-body-base ds-w-medium">{emailAccount.email}</div>
                <div className="imp-small" style={{ margin: '2px 0 0' }}>
                  {emailAccount.providerName} · Connected
                </div>
              </div>
            </div>
          ) : (
            <ConnectPanel />
          )}

          <div className="db-card" style={{ gap: 14 }}>
            <span className="db-eyebrow">Recipients</span>
            <TextField label="To" type="text" value={to} onChange={(e) => setTo(e.target.value)} />
            <TextField label="CC" type="text" value={cc} onChange={(e) => setCc(e.target.value)} />
            <Checkbox
              aria-label="CC my Implentio support team"
              checked={csmOptIn}
              onCheckedChange={toggleCsm}
              label={<span className="ds-w-medium">CC my Implentio support team</span>}
              description={
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {csm && (
                    <span className="ds-w-medium" style={{ color: 'var(--ds-fg-brand-emphasis)' }}>
                      {csm.name}, Customer Success Manager · {csm.email}
                    </span>
                  )}
                  <span className="ds-w-medium" style={{ color: 'var(--ds-fg-brand-emphasis)' }}>
                    Implentio Support · {supportEmail}
                  </span>
                  <span>Include your Customer Success Manager and Implentio Support for help answering questions about the findings and supporting your dispute.</span>
                </span>
              }
            />
            <p className="imp-small" style={{ margin: 0 }}>
              Changes here apply to this message only. The saved Biller contact in Account settings is not changed.
            </p>
          </div>

          <div className="db-card" style={{ gap: 14 }}>
            <span className="db-eyebrow">Message</span>
            <TextField label="Subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <TextArea label="Introduction" rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ds-body-base">System-generated summary</span>
                <StatusChip tone="muted">Locked</StatusChip>
              </div>
              <div className="ds-body-base" style={{ whiteSpace: 'pre-wrap', background: 'var(--ds-bg-disabled)', border: cellBorder, borderRadius: 'var(--ds-radius-medium)', padding: '12px 14px', fontVariantNumeric: 'tabular-nums' }}>
                {lockedText}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: cellBorder, paddingTop: 12 }}>
              <span className="ds-body-base ds-muted">Attachment</span>
              <span className="ds-body-base ds-w-medium" style={{ overflowWrap: 'anywhere' }}>
                {filename}
              </span>
            </div>
            {!complete && !detail.findingsUnavailable && (
              <p className="imp-small" style={{ margin: 0 }}>
                Includes {plural(selGroups.length, 'selected variance-group Excel file')}
              </p>
            )}
            {zipPhase === 'preparing' && (
              <p className="imp-small" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spinner /> Preparing your selected evidence package…
              </p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {emailAccount ? (
            <div>
              <h2 className="ds-heading-medium" style={{ margin: 0 }}>
                Review and send your dispute
              </h2>
              <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '74ch' }}>
                Confirm the email details and supporting files before sending from your connected account.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="ds-heading-medium" style={{ margin: 0 }}>
                Your dispute is ready to send
              </h2>
              <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '74ch' }}>
                Copy the prepared email and download the supporting files, then send them from your company email account.
              </p>
            </div>
          )}

          {emailAccount && (
            <>
              <Banner type="success" title={<>Connected email · {emailAccount.email}</>}>
                {emailAccount.providerName} · Connected
              </Banner>

              {sendPhase !== 'idle' && (
                <div className="db-card" style={{ gap: 14 }}>
                  <span className="db-eyebrow">Send status</span>
                  {sendPhase === 'processing' && (
                    <div className="ds-body-base ds-w-medium" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Spinner />
                      Sending your dispute…
                    </div>
                  )}
                  {sendPhase === 'sent' && sentInfo && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span className="ds-heading-tiny" style={{ color: 'var(--ds-fg-success)' }}>
                        Dispute sent from {sentInfo.email}
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 18px' }}>
                        <Statistic bare size="tiny" label="Recipient" value={to} />
                        <Statistic bare size="tiny" label="Credit memo" value={`${memo.id} · ${memo.version}`} />
                        <Statistic bare size="tiny" label="Submitted by" value="Tori Matthews" />
                        <Statistic bare size="tiny" label="Date and time" value={sentInfo.at} />
                        <Statistic bare size="tiny" label="Evidence filename" value={filename} />
                        <Statistic bare size="tiny" label="Provider status" value="Accepted for processing" />
                      </div>
                    </div>
                  )}
                  {sendPhase === 'failed' && (
                    <Banner type="error" title="Unable to send dispute" actions={<Button size="small" variant="primary" onClick={doSend}>Try again</Button>}>
                      Your message and evidence selection are saved. Try again, or reconnect your email in{' '}
                      <Link to="/account" variant="accent" size="small" bold>
                        Account settings
                      </Link>
                      .
                    </Banner>
                  )}
                </div>
              )}

              <div className="db-card" style={{ gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr' }}>
                  <SummaryRow l="Included in this dispute" v={`${plural(selGroups.length, 'variance group')} · ${fmtMoney(selAmount)} · ${plural(pkgSet.size, 'package')} · ${plural(invSet.size, 'invoice')}`} />
                  <SummaryRow l="To" v={to} />
                  <SummaryRow l="CC" v={cc || '—'} />
                  <SummaryRow l="Subject" v={subject} />
                  <SummaryRow l="Credit memo" v={`${memo.id} · ${memo.version}`} />
                  <SummaryRow l="Evidence package" v={filename} last />
                </div>
              </div>

              <div className="db-card" style={{ gap: 10 }}>
                <span className="db-eyebrow">Message preview</span>
                <p className="ds-body-base" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {intro}
                </p>
                {msgPreviewOpen && (
                  <p className="ds-body-base" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {lockedText}
                  </p>
                )}
                <Link variant="accent" aria-expanded={msgPreviewOpen} onClick={() => setMsgPreviewOpen((o) => !o)} style={{ alignSelf: 'flex-start' }}>
                  {msgPreviewOpen ? 'Hide full message' : 'Show full message'}
                </Link>
              </div>
            </>
          )}

          {!emailAccount &&
            (manualSentDone ? (
              <Banner type="success" title={`Variance groups marked pursued with ${memo.provider}.`} />
            ) : (
              <>
                <div className="db-card" style={{ gap: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                    <SummaryRow l="Sending to" v={to} />
                    <SummaryRow l="CC" v={cc || '—'} />
                    <SummaryRow l="Subject" v={subject} />
                    <SummaryRow l="Credit memo" v={`${memo.id} · ${memo.version}`} />
                    <SummaryRow l="Amount pursued" v={fmtMoney(selAmount)} />
                    <SummaryRow l="Attachments" v={complete ? 'Complete evidence package · 1 file' : `Selected evidence package · ${selGroups.length} file${selGroups.length === 1 ? '' : 's'}`} last />
                  </div>
                </div>

                <div className="db-card" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
                  <div style={MANUAL_ROW}>
                    <StepBadge n={1} />
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div className="ds-heading-tiny">Copy your prepared email</div>
                      <p className="imp-small" style={{ margin: '4px 0 0' }}>
                        Paste this into a new message from your company email.
                      </p>
                    </div>
                    <Button size="small" onClick={copyEmail}>
                      Copy email text
                    </Button>
                  </div>
                  <div style={{ ...MANUAL_ROW, borderTop: cellBorder }}>
                    <StepBadge n={2} />
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div className="ds-heading-tiny">Download the supporting files</div>
                      <p className="imp-small" style={{ margin: '4px 0 0' }}>
                        Attach these files to the email before sending.
                      </p>
                    </div>
                    <Button size="small" variant="primary" onClick={downloadEvidence}>
                      Download files
                    </Button>
                  </div>
                  <div style={{ padding: '0 20px 18px' }}>
                    <Banner type="info" title="Implentio cannot verify delivery for a manually sent email. Only confirm after sending the message from your email account." />
                  </div>
                  <div style={{ ...MANUAL_ROW, borderTop: cellBorder }}>
                    <StepBadge n={3} />
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div className="ds-heading-tiny">Send from your email, then confirm</div>
                      <p className="imp-small" style={{ margin: '4px 0 0' }}>
                        After sending the message to {memo.provider}, return here to record it.
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
                      <Button size="small" variant="primary" onClick={confirmManualSent}>
                        I sent the dispute
                      </Button>
                      <Link variant="accent" size="small" underline onClick={onClose}>
                        I&rsquo;ll do this later
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            ))}
        </div>
      )}
    </Modal>
  )
}

const MANUAL_ROW: CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }

/** Numbered checklist marker, drawn like the Figma stepper's active stage. */
function StepBadge({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: 28, height: 28, borderRadius: 'var(--ds-radius-full)', border: '1px solid var(--ds-stroke-brand-emphasis)', background: 'var(--ds-bg-default)', color: 'var(--ds-fg-brand-emphasis)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', font: 'var(--ds-weight-medium) 14px/1 var(--ds-font)' }}
    >
      {n}
    </span>
  )
}

function SummaryRow({ l, v, last }: { l: string; v: string; last?: boolean }) {
  const border = last ? undefined : '1px solid var(--ds-stroke-disabled)'
  return (
    <>
      <div className="ds-body-base ds-muted" style={{ padding: '12px 0', borderBottom: border }}>
        {l}
      </div>
      <div className="ds-body-base ds-w-medium" style={{ padding: '12px 0', borderBottom: border, wordBreak: 'break-word' }}>
        {v}
      </div>
    </>
  )
}

/** Connect-your-email promo panel (simulated OAuth lives in Account settings). */
function ConnectPanel() {
  const bullet = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
      <span style={{ width: 18, height: 18, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-brand-emphasis)', color: 'var(--ds-icon-reverse)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <CheckIcon width={12} height={12} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="ds-body-base ds-w-medium" style={{ flex: '1 1 auto', minWidth: 0 }}>
        {text}
      </span>
    </div>
  )
  return (
    <div style={{ background: 'var(--ds-bg-brand-disabled)', border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-large)', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="imp-eyebrow">Send from your company email</div>
        <div className="ds-heading-small">Connect your email to send from Implentio</div>
        <p className="imp-small" style={{ margin: '4px 0 0', maxWidth: '64ch' }}>
          Send this dispute from your existing company address, automatically include the supporting files, and record it in your dispute history.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {bullet('Send from your company email address')}
        {bullet('Attach supporting files automatically')}
        {bullet('Track the sent dispute in Implentio')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <ConnectButton provider="gmail" label="Connect Gmail" logo="/brand/gmail.png" />
        <ConnectButton provider="outlook" label="Connect Outlook" logo="/brand/outlook.png" />
      </div>
      <p className="imp-small" style={{ margin: 0, textAlign: 'center' }}>
        Implentio only sends messages you review and approve. You can disconnect your account at any time.
      </p>
    </div>
  )
}

/** Simulated OAuth connect: 1.3s "redirect" then connected (prototype ~13427). */
function useConnectEmail() {
  const ds = useDataSource()
  const qc = useQueryClient()
  return (provider: 'gmail' | 'outlook') => {
    setTimeout(() => {
      void ds.setEmailAccountStatus(provider, 'connected').then(() => {
        void qc.invalidateQueries({ queryKey: queryKeys.account })
      })
    }, 1300)
  }
}

function ConnectButton({ provider, label, logo }: { provider: 'gmail' | 'outlook'; label: string; logo: string }) {
  const connect = useConnectEmail()
  return (
    <Button fullWidth iconLeft={<img src={logo} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />} onClick={() => connect(provider)}>
      {label}
    </Button>
  )
}
