/** "Prepare for Biller" 3-step dispute wizard (template ~6605–7028).
 *  Step 1 selects variance groups, step 2 prepares the email, step 3 sends
 *  from a connected account (simulated) or walks the manual path. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDataSource } from '@/data/DataSourceProvider'
import { queryKeys } from '@/data/queries'
import type { AccountSettings, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { fmtDateShort } from '@/domain/dates'
import { useClock } from '@/lib/clock'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { groupExpired } from '@/domain/outcomes'
import {
  useAccountForDispute,
  useDisputeContext,
  useMarkGroupsPursued,
  useSetDisputeDraft,
} from './api'
import { titleCase } from './derive'

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
    ? `Implentio reviewed the applicable parcel charges and identified ${fmtMoney(memo.netN ?? 0)} in variance being pursued across ${(memo.orders ?? 0).toLocaleString('en-US')} packages on ${memo.invoices ?? 0} invoices.\n\nPlease review the findings and confirm which adjustments will be approved.\n\nThank you,\nTori Matthews\nImplentio`
    : `Implentio reviewed the applicable parcel charges and identified ${fmtMoney(selAmount)} in variance being pursued across ${pkgSet.size.toLocaleString('en-US')} packages on ${invSet.size} invoices.\n\n` +
      (complete
        ? 'The attached Complete Excel Evidence package includes all published variance groups, affected invoices, package-level details, calculations, and available supporting source references.'
        : `The attached Selected Variance Evidence package includes the ${selGroups.length} variance groups being pursued, with their affected invoices, package-level details, calculations, and available supporting source references.`) +
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
      () => showToast('ok', 'Email text copied to clipboard'),
      () => showToast('warn', 'Could not copy the email text'),
    )
  }

  const downloadEvidence = () => {
    saveFile(`/demo-assets/${encodeURIComponent(detail.file)}`, filename)
      .then(() => showToast('ok', `Downloading ${filename}`))
      .catch(() => showToast('warn', 'The evidence package could not be downloaded.'))
  }

  const confirmManualSent = () => {
    setManualSentDone(true)
    markPursued.mutate({ groupIds: selGroups.map((g) => g.id), via: 'manual' })
  }

  const stepLabels = detail.findingsUnavailable
    ? ['Prepare email', 'Ready to send']
    : ['Review package', 'Prepare email', 'Ready to send']
  const displayStep = detail.findingsUnavailable ? step - 1 : step

  const kpi = (l: string, v: string, big = false, orange = false) => (
    <div style={{ padding: '14px 18px', borderBottom: big ? undefined : '1px solid var(--imp-gray-200)', borderRight: '1px solid var(--imp-gray-200)' }}>
      <div className="db-kpi-sub">{l}</div>
      <div style={{ font: `600 ${big ? '22px' : '15px'} var(--imp-font-display)`, fontVariantNumeric: 'tabular-nums', color: orange ? 'var(--imp-orange-500)' : 'var(--imp-ink)' }}>{v}</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 920, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Backdrop scrim: click-to-close is supplemental (Escape and the Close button remain). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(16,15,65,0.5)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Prepare for Biller"
        style={{ position: 'relative', width: 900, maxWidth: '100%', maxHeight: '90vh', background: 'var(--imp-gray-100)', border: '2px solid var(--imp-ink)', borderRadius: 16, boxShadow: 'var(--imp-shadow-lg)', display: 'flex', flexDirection: 'column', animation: 'imp-fade-in 0.2s ease' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 20px', background: '#fff', borderBottom: '1.5px solid var(--imp-gray-300)', borderRadius: '14px 14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span className="ia-pill" style={{ background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', borderColor: 'var(--imp-purple-300)' }}>
              Prepare for Biller
            </span>
            <strong style={{ font: '600 14px var(--imp-font-display)', color: 'var(--imp-ink)' }}>
              {memo.id} · {memo.version}
            </strong>
          </div>
          <button className="db-btn db-btn-secondary db-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', padding: '12px 20px', background: '#fff', borderBottom: '1.5px solid var(--imp-gray-300)' }}>
          {stepLabels.map((l, i) => {
            const n = i + 1
            const on = n === displayStep
            const done = n < displayStep
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 999, flex: 'none', font: '700 11px var(--imp-font-body)', border: `1.5px solid ${on || done ? 'var(--imp-purple-500)' : 'var(--imp-gray-300)'}`, background: on ? 'var(--imp-purple-500)' : '#fff', color: on ? '#fff' : done ? 'var(--imp-purple-500)' : 'var(--imp-fg-subtle)' }}>
                  {n}
                </span>
                <span style={{ font: on ? '600 13px var(--imp-font-display)' : '500 13px var(--imp-font-body)', color: on || done ? 'var(--imp-ink)' : 'var(--imp-fg-subtle)' }}>
                  {l}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ overflow: 'hidden auto', padding: '30px 24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 1 && !detail.findingsUnavailable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, font: '600 22px var(--imp-font-display)', letterSpacing: '-0.01em', color: 'var(--imp-ink)' }}>
                  Review what will be shared with {memo.provider}
                </h2>
                <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '72ch' }}>
                  Review the findings and choose the variance groups you want to pursue with {memo.provider}. Your request summary and evidence package will update to reflect your selections.
                </p>
              </div>

              <div className="db-card" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px 0', font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                      Choose the findings you want to include in this request to your biller. Your dispute summary and evidence package will reflect your selections.
                    </p>
                  </div>
                  <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={toggleSelectAll}>
                    {selGroups.length === eligibleGroups.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1.5px solid var(--imp-gray-200)' }}>
                  {eligibleGroups.map((g) => {
                    const selected = !excludedIds.includes(g.id)
                    const invCount = new Set(g.services.flatMap((s) => s.pkgs.map((p) => p.inv))).size
                    const pkgCount = g.services.reduce((a, s) => a + s.pkgs.length, 0)
                    return (
                      <label key={g.id} aria-label={g.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--imp-gray-200)', cursor: 'pointer', opacity: selected ? 1 : 0.45 }}>
                        <input type="checkbox" checked={selected} onChange={(e) => toggleGroup(g, e.target.checked)} style={{ width: 17, height: 17, flex: 'none' }} />
                        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{g.title}</div>
                            <div className="imp-small" style={{ margin: '2px 0 0' }}>
                              {pkgCount.toLocaleString('en-US')} packages · {invCount} invoices
                            </div>
                          </div>
                          <div style={{ flex: 'none', font: '600 14px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-orange-500)' }}>{fmtMoney(g.varN)}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1.5px solid var(--imp-gray-200)', paddingTop: 12 }}>
                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Selected for this request
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px 18px' }}>
                    <div>
                      <div className="db-kpi-sub">Variance groups</div>
                      <div style={{ font: '600 18px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{selGroups.length}</div>
                    </div>
                    <div>
                      <div className="db-kpi-sub">Amount pursued</div>
                      <div style={{ font: '600 18px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-orange-500)' }}>{fmtMoney(selAmount)}</div>
                    </div>
                    <div>
                      <div className="db-kpi-sub">Affected packages</div>
                      <div style={{ font: '600 18px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{pkgSet.size.toLocaleString('en-US')}</div>
                    </div>
                    <div>
                      <div className="db-kpi-sub">Affected invoices</div>
                      <div style={{ font: '600 18px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{invSet.size}</div>
                    </div>
                  </div>
                  {noSelection && (
                    <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
                      Select at least one variance group to prepare this request.
                    </p>
                  )}
                </div>
              </div>

              {selGroups.length > 0 && (() => {
                const top = [...selGroups].sort((a, b) => b.varN - a.varN)[0]
                const p = top?.services[0]?.pkgs[0]
                if (!top || !p) return null
                return (
                  <div className="db-card" style={{ gap: 12 }}>
                    <span className="db-eyebrow">Representative package for spot-checking · {top.title}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px 20px' }}>
                      <div><div className="db-kpi-sub">Tracking number</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{p.t}</div></div>
                      <div><div className="db-kpi-sub">Source invoice</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{p.inv}</div></div>
                      <div><div className="db-kpi-sub">Order number</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{p.so}</div></div>
                      <div><div className="db-kpi-sub">Billed</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{fmtMoney(p.ti)}</div></div>
                      <div><div className="db-kpi-sub">Expected</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-ink)' }}>{fmtMoney(p.te)}</div></div>
                      <div><div className="db-kpi-sub">Net variance</div><div style={{ font: '600 13px var(--imp-font-body)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-orange-500)' }}>{fmtMoney(p.tv)}</div></div>
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
              <div style={{ marginTop: 2 }}>
                <h2 style={{ margin: 0, font: '600 22px var(--imp-font-display)', letterSpacing: '-0.01em', color: 'var(--imp-ink)' }}>
                  Prepare your email to {memo.provider}
                </h2>
                <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '72ch' }}>
                  Implentio will prepare the message and evidence package. You will send it using your own email for this release.
                </p>
              </div>

              {detail.findingsUnavailable && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: '1.5px solid var(--imp-purple-300)', background: 'var(--imp-purple-100)', borderRadius: 10, padding: '12px 14px' }}>
                  <div>
                    <div style={{ font: '700 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>The complete credit memo will be included</div>
                    <p className="imp-small" style={{ margin: '3px 0 0' }}>
                      A detailed variance-group breakdown is unavailable, so this dispute includes the complete credit memo.
                    </p>
                  </div>
                </div>
              )}

              {emailAccount ? (
                <div className="db-card" style={{ gap: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 999, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', font: '700 12px var(--imp-font-display)' }}>
                    {emailAccount.initial}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{emailAccount.email}</div>
                    <div className="imp-small" style={{ margin: '2px 0 0' }}>{emailAccount.providerName} · Connected</div>
                  </div>
                </div>
              ) : (
                <ConnectPanel />
              )}

              <div className="db-card" style={{ gap: 14 }}>
                <span className="db-eyebrow">Recipients</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 52, flex: 'none', font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>To</span>
                    <input className="ia-input" type="text" value={to} onChange={(e) => setTo(e.target.value)} style={{ flex: '1 1 auto', minWidth: 0 }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 52, flex: 'none', font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>CC</span>
                    <input className="ia-input" type="text" value={cc} onChange={(e) => setCc(e.target.value)} style={{ flex: '1 1 auto', minWidth: 0 }} />
                  </label>
                  <label aria-label="CC my Implentio support team" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                    <span style={{ width: 52, flex: 'none' }} />
                    <input type="checkbox" checked={csmOptIn} onChange={(e) => toggleCsm(e.target.checked)} style={{ width: 17, height: 17, flex: 'none', marginTop: 2 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>CC my Implentio support team</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {csm && (
                          <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-purple-500)' }}>
                            {csm.name}, Customer Success Manager · {csm.email}
                          </span>
                        )}
                        <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-purple-500)' }}>
                          Implentio Support · {supportEmail}
                        </span>
                      </span>
                      <span className="imp-small" style={{ fontStyle: 'italic' }}>
                        Include your Customer Success Manager and Implentio Support for help answering questions about the findings and supporting your credit request.
                      </span>
                    </span>
                  </label>
                </div>
                <p className="imp-small" style={{ margin: 0 }}>
                  Changes here apply to this message only. The saved Biller contact in Account Settings is not changed.
                </p>
              </div>

              <div className="db-card" style={{ gap: 14 }}>
                <span className="db-eyebrow">Message</span>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Subject</span>
                  <input className="ia-input" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Introduction</span>
                  <textarea className="ia-input" rows={4} value={intro} onChange={(e) => setIntro(e.target.value)} style={{ resize: 'vertical', lineHeight: 1.55 }} />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>System-generated summary</span>
                    <span className="ia-pill" style={{ background: 'var(--imp-gray-100)', color: 'var(--imp-fg-subtle)', borderColor: 'var(--imp-gray-300)', textTransform: 'none', letterSpacing: 0 }}>
                      Locked
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', background: 'var(--imp-gray-100)', border: '1.5px solid var(--imp-gray-300)', borderRadius: 8, padding: '14px 16px', font: '500 13px var(--imp-font-body)', lineHeight: 1.55, color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>
                    {lockedText}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1.5px solid var(--imp-gray-200)', paddingTop: 12 }}>
                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Attachment</span>
                  <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-all' }}>{filename}</span>
                </div>
                {!complete && !detail.findingsUnavailable && (
                  <p className="imp-small" style={{ margin: 0 }}>
                    Includes {selGroups.length} selected variance-group Excel files
                  </p>
                )}
                {zipPhase === 'preparing' && (
                  <p className="imp-small" style={{ margin: 0, color: 'var(--imp-fg-muted)' }}>
                    Preparing your selected evidence package…
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {emailAccount ? (
                <div>
                  <h2 style={{ margin: 0, font: '600 22px var(--imp-font-display)', letterSpacing: '-0.01em', color: 'var(--imp-ink)' }}>
                    Review and send your dispute
                  </h2>
                  <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '74ch' }}>
                    Confirm the email details and supporting files before sending from your connected account.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, font: '600 22px var(--imp-font-display)', letterSpacing: '-0.01em', color: 'var(--imp-ink)' }}>
                      Your dispute package is ready
                    </h2>
                  </div>
                  <p className="imp-small" style={{ margin: '8px 0 0', maxWidth: '74ch' }}>
                    Copy the prepared email and download the supporting files, then send them from your company email account.
                  </p>
                </>
              )}

              {emailAccount && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', background: 'var(--imp-success-bg)', border: '1.5px solid var(--imp-success)', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--imp-success)', color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5l3.2 3.2L13 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: '700 11px var(--imp-font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--imp-success)' }}>Connected email</div>
                        <div style={{ font: '700 15px var(--imp-font-display)', color: 'var(--imp-ink)', marginTop: 2 }}>{emailAccount.email}</div>
                        <div className="imp-small" style={{ margin: '1px 0 0' }}>{emailAccount.providerName} · Connected</div>
                      </div>
                    </div>
                  </div>

                  {sendPhase !== 'idle' && (
                    <div className="db-card" style={{ gap: 14 }}>
                      <span className="db-eyebrow">Send status</span>
                      {sendPhase === 'processing' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 999, border: '2px solid var(--imp-purple-200)', borderTopColor: 'var(--imp-purple-500)', animation: 'imp-spin 0.9s linear infinite' }} />
                          <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Sending your request…</span>
                        </div>
                      )}
                      {sendPhase === 'sent' && sentInfo && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ font: '600 14px var(--imp-font-display)', color: '#1F8A4C' }}>Request submitted from {sentInfo.email}</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px 18px' }}>
                            <div><div className="db-kpi-sub">Recipient</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-word' }}>{to}</div></div>
                            <div><div className="db-kpi-sub">Credit memo</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{memo.id} · {memo.version}</div></div>
                            <div><div className="db-kpi-sub">Submitted by</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Tori Matthews</div></div>
                            <div><div className="db-kpi-sub">Date and time</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{sentInfo.at}</div></div>
                            <div><div className="db-kpi-sub">Evidence filename</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-all' }}>{filename}</div></div>
                            <div><div className="db-kpi-sub">Provider status</div><div style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>Accepted for processing</div></div>
                          </div>
                        </div>
                      )}
                      {sendPhase === 'failed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ font: '600 14px var(--imp-font-display)', color: 'var(--imp-error)' }}>We couldn&rsquo;t send this request</span>
                          <p className="imp-small" style={{ margin: 0 }}>
                            Your prepared message and evidence selection have been kept. Try again, reconnect your email, or continue manually below.
                          </p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={doSend}>Try again</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="db-card" style={{ gap: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 0 }}>
                      <SummaryRow l="Included in this request" v={`${selGroups.length} variance groups · ${fmtMoney(selAmount)} · ${pkgSet.size.toLocaleString('en-US')} packages · ${invSet.size} invoices`} />
                      <SummaryRow l="To" v={to} />
                      <SummaryRow l="CC" v={cc || '—'} />
                      <SummaryRow l="Subject" v={subject} />
                      <SummaryRow l="Credit memo" v={`${memo.id} · ${memo.version}`} />
                      <SummaryRow l="Evidence package" v={filename} last />
                    </div>
                  </div>

                  <div className="db-card" style={{ gap: 10 }}>
                    <span className="db-eyebrow">Message preview</span>
                    <p style={{ margin: 0, font: '500 13px var(--imp-font-body)', color: 'var(--imp-ink)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{intro}</p>
                    {msgPreviewOpen && (
                      <p style={{ margin: 0, font: '500 13px var(--imp-font-body)', color: 'var(--imp-ink)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lockedText}</p>
                    )}
                    <button type="button" onClick={() => setMsgPreviewOpen((o) => !o)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '600 12px var(--imp-font-body)', color: 'var(--imp-purple-500)', alignSelf: 'flex-start' }}>
                      {msgPreviewOpen ? 'Hide full message' : 'Show full message'}
                    </button>
                  </div>
                </>
              )}

              {!emailAccount && (
                <>
                  {manualSentDone ? (
                    <div style={{ background: 'var(--imp-success-bg)', border: '1.5px solid var(--imp-success)', borderRadius: 10, padding: '12px 14px', font: '600 13px var(--imp-font-body)', color: 'var(--imp-success)' }}>
                      Findings marked pursued with {memo.provider}.
                    </div>
                  ) : (
                    <>
                      <div className="db-card" style={{ gap: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 0 }}>
                          <SummaryRow l="Sending to" v={to} />
                          <SummaryRow l="CC" v={cc || '—'} />
                          <SummaryRow l="Subject" v={subject} />
                          <SummaryRow l="Credit memo" v={`${memo.id} · ${memo.version}`} />
                          <SummaryRow l="Amount pursued" v={fmtMoney(selAmount)} />
                          <SummaryRow l="Attachments" v={complete ? 'Complete evidence package · 1 file' : `Selected evidence package · ${selGroups.length} file${selGroups.length === 1 ? '' : 's'}`} last />
                        </div>
                      </div>

                      <div className="db-card" style={{ gap: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderBottom: '1.5px solid var(--imp-gray-200)' }}>
                          <StepBadge n={1} />
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Copy your prepared email</div>
                            <p className="imp-small" style={{ margin: '2px 0 0' }}>Paste this into a new message from your company email.</p>
                          </div>
                          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={copyEmail} style={{ flex: 'none' }}>
                            Copy email text
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
                          <StepBadge n={2} />
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Download the supporting files</div>
                            <p className="imp-small" style={{ margin: '2px 0 0' }}>Attach these files to the email before sending.</p>
                          </div>
                          <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={downloadEvidence} style={{ flex: 'none' }}>
                            Download files
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '10px 20px 18px', padding: '12px 14px', background: 'var(--imp-purple-100)', border: '1.5px solid var(--imp-purple-300)', borderRadius: 8 }}>
                          <p className="imp-small" style={{ margin: 0 }}>
                            Implentio cannot verify delivery for a manually sent email. Only confirm after sending the message from your email account.
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px 20px', borderTop: '1.5px solid var(--imp-gray-200)' }}>
                          <StepBadge n={3} />
                          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Send from your email, then confirm</div>
                            <p className="imp-small" style={{ margin: '2px 0 0' }}>After sending the message to {memo.provider}, return here to record it.</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flex: 'none' }}>
                            <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={confirmManualSent}>
                              I sent the dispute
                            </button>
                            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-purple-500)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                              I&rsquo;ll do this later
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 20px', background: '#fff', borderTop: '1.5px solid var(--imp-gray-300)', borderRadius: '0 0 14px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {step === 1 && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={onClose}>
                Cancel
              </button>
            )}
            {step > 1 && !(detail.findingsUnavailable && step === 2) && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {step === 1 && (
              <button
                className="db-btn db-btn-primary db-btn-sm"
                disabled={noSelection}
                style={noSelection ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                onClick={() => setStep(2)}
              >
                Continue to email
              </button>
            )}
            {step === 2 && (
              <button className="db-btn db-btn-primary db-btn-sm" onClick={() => setStep(3)}>
                Continue
              </button>
            )}
            {step === 3 && sendPhase === 'sent' && (
              <button className="db-btn db-btn-secondary db-btn-sm" onClick={onClose}>
                Close
              </button>
            )}
            {step === 3 && emailAccount && sendPhase !== 'sent' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="imp-small" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                  Sending from {emailAccount.email}
                </span>
                <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={doSend} disabled={sendPhase === 'processing'}>
                  {sendPhase === 'processing' ? 'Sending…' : 'Send dispute'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{ width: 30, height: 30, borderRadius: 999, border: '1.5px solid var(--imp-purple-500)', background: '#fff', color: 'var(--imp-purple-500)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 13px var(--imp-font-display)' }}>
      {n}
    </span>
  )
}

function SummaryRow({ l, v, last }: { l: string; v: string; last?: boolean }) {
  const border = last ? undefined : '1px solid var(--imp-gray-200)'
  return (
    <>
      <div style={{ padding: '12px 0', borderBottom: border, font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>{l}</div>
      <div style={{ padding: '12px 0', borderBottom: border, font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', wordBreak: 'break-word' }}>{v}</div>
    </>
  )
}

/** Connect-your-email promo panel (simulated OAuth lives in Account settings). */
function ConnectPanel() {
  const bullet = (text: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', minWidth: 0 }}>
      <span style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--imp-purple-500)', color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.2 3.2L13 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span style={{ font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-ink)', lineHeight: 1.4, flex: '1 1 auto', minWidth: 0 }}>{text}</span>
    </div>
  )
  return (
    <div style={{ background: 'var(--imp-purple-100)', border: '1.5px solid var(--imp-purple-300)', borderRadius: 12, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ font: '700 11px var(--imp-font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--imp-purple-500)' }}>
          Send from your company email
        </div>
        <div style={{ font: '600 18px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Connect your email to send from Implentio</div>
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
      <p className="imp-small" style={{ margin: 0, textAlign: 'center', color: 'var(--imp-fg-muted)' }}>
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
    <button
      type="button"
      onClick={() => connect(provider)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', border: '1.5px solid var(--imp-ink)', borderRadius: 10, padding: '13px 16px', cursor: 'pointer', font: '600 13.5px var(--imp-font-body)', color: 'var(--imp-ink)' }}
    >
      <span style={{ width: 28, height: 28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </span>
      {label}
    </button>
  )
}
