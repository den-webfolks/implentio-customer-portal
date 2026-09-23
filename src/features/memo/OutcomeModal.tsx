/** "Update credit memo dispute" modal (template ~5865–6050): per-finding
 *  outcome dropdowns with amount/date/reason drafts, plus bulk apply. */
import { useMemo, useState } from 'react'
import type { CollectionStatus, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { useRecordGroupOutcome } from './api'

const STATUS_META: Record<
  CollectionStatus,
  { label: string; pillBg: string; pillFg: string; accent: string }
> = {
  awaiting: { label: 'Awaiting outcome', pillBg: '#F2F0FF', pillFg: '#5B4AE6', accent: '#5B4AE6' },
  full: { label: 'Fully collected', pillBg: '#ECFDF3', pillFg: '#087443', accent: '#087443' },
  partial: { label: 'Partly collected', pillBg: '#FFF7E6', pillFg: '#B45309', accent: '#B45309' },
  not_issued: { label: 'Biller declined', pillBg: '#FFF1F0', pillFg: '#B42318', accent: '#B42318' },
}

const OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: 'awaiting', label: 'Awaiting outcome' },
  { value: 'full', label: 'Fully collected' },
  { value: 'partial', label: 'Partly collected' },
  { value: 'not_issued', label: 'Biller declined' },
]

interface Draft {
  status: CollectionStatus
  amount: string
  date: string
  reason: string
}

export function OutcomeModal({ detail, onClose }: { detail: MemoDetail; onClose: () => void }) {
  const recordOutcome = useRecordGroupOutcome()
  const pursued = useMemo(
    () => detail.findingGroups.filter((g) => g.pursuit === 'pursued'),
    [detail.findingGroups],
  )
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<CollectionStatus | null>(null)
  const [bulkReason, setBulkReason] = useState('')

  const draftFor = (g: FindingGroup): Draft =>
    drafts[g.id] ?? {
      status: g.collection?.status ?? 'awaiting',
      amount: g.collection?.amountN != null ? String(g.collection.amountN) : '',
      date: g.collection?.date ?? '',
      reason: g.collection?.reason ?? '',
    }

  const totalPursued = pursued.reduce((s, g) => s + g.varN, 0)
  const totalCollected = pursued.reduce((s, g) => s + (g.collection?.amountN ?? 0), 0)
  const remaining = Math.max(0, r2(totalPursued - totalCollected))
  const statuses = pursued.map((g) => g.collection?.status ?? 'awaiting')
  const overall: CollectionStatus = statuses.every((s) => s === 'awaiting')
    ? 'awaiting'
    : statuses.every((s) => s === 'full')
      ? 'full'
      : statuses.every((s) => s === 'not_issued')
        ? 'not_issued'
        : 'partial'
  const overallMeta = STATUS_META[overall]
  const threePl = detail.memo.provider
  const sentDate = pursued[0]?.pursuedAt ?? ''

  const setDraft = (g: FindingGroup, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [g.id]: { ...draftFor(g), ...patch } }))

  const validate = (g: FindingGroup, d: Draft): string => {
    if (d.status !== 'partial') return ''
    const amt = parseFloat(d.amount)
    if (isNaN(amt) || amt <= 0) return 'Enter a credit amount greater than $0.00.'
    if (amt > g.varN + 0.005)
      return `Credit received cannot exceed the amount pursued of ${fmtMoney(g.varN)}.`
    return ''
  }

  const save = (g: FindingGroup) => {
    const d = draftFor(g)
    const error = validate(g, d)
    if (error) return
    const amt = parseFloat(d.amount)
    // A partial credit equal to the pursued amount auto-promotes to full.
    const status: CollectionStatus =
      d.status === 'partial' && Math.abs(amt - g.varN) < 0.005 ? 'full' : d.status
    recordOutcome.mutate({
      groupId: g.id,
      collection: {
        status,
        amountN: status === 'full' ? g.varN : status === 'not_issued' ? 0 : status === 'partial' ? r2(amt) : null,
        date: d.date || null,
        reason: d.reason,
        history: [],
      },
    })
    setDrafts((cur) => {
      const next = { ...cur }
      delete next[g.id]
      return next
    })
    setOpenPanel(null)
  }

  const applyBulk = () => {
    if (!bulkStatus) return
    for (const g of pursued) {
      recordOutcome.mutate({
        groupId: g.id,
        collection: {
          status: bulkStatus,
          amountN: bulkStatus === 'full' ? g.varN : bulkStatus === 'not_issued' ? 0 : null,
          date: null,
          reason: bulkStatus === 'not_issued' ? bulkReason : '',
          history: [],
        },
      })
    }
    setBulkOpen(false)
    setBulkStatus(null)
    setBulkReason('')
    setDrafts({})
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 930, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Backdrop scrim: click-to-close is supplemental (Escape and Done remain). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(16,15,65,0.5)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Update credit memo dispute"
        style={{ position: 'relative', width: 'min(1080px, calc(100vw - 64px))', maxHeight: 'calc(100vh - 48px)', background: '#fff', border: '2px solid var(--imp-ink)', borderRadius: 16, boxShadow: '8px 8px 0 var(--imp-ink)', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '22px 24px 16px', flex: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: '600 19px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Update credit memo dispute</span>
            <span className="imp-small" style={{ margin: 0 }}>
              Update the outcome for all findings or change them individually.
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--imp-fg-muted)', fontSize: 22, lineHeight: 1, padding: 4, flex: 'none' }}>
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ border: '1.5px solid var(--imp-gray-300)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <div style={{ font: '600 16px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Credit memo dispute</div>
              <div className="imp-small" style={{ margin: '2px 0 0' }}>
                {fmtMoney(totalPursued)} pursued across 1 dispute and {pursued.length} finding{pursued.length === 1 ? '' : 's'}
              </div>
            </div>
            <span className="ia-pill" style={{ background: overallMeta.pillBg, color: overallMeta.pillFg, borderColor: 'transparent', textTransform: 'none', letterSpacing: 0, flex: 'none' }}>
              {overall === 'partial' ? 'Partially resolved' : overallMeta.label}
            </span>
            <div style={{ width: 1.5, alignSelf: 'stretch', background: 'var(--imp-gray-300)', flex: 'none' }} />
            <div style={{ flex: 'none' }}>
              <div style={{ font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Total collected</div>
              <div style={{ font: '600 17px var(--imp-font-display)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(totalCollected)}</div>
            </div>
            <div style={{ width: 1.5, alignSelf: 'stretch', background: 'var(--imp-gray-300)', flex: 'none' }} />
            <div style={{ flex: 'none' }}>
              <div style={{ font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Remaining unresolved</div>
              <div style={{ font: '600 17px var(--imp-font-display)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(remaining)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>Disputes</div>
            <div style={{ border: '1.5px solid var(--imp-gray-300)', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap', background: 'var(--imp-gray-100)' }}>
                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                  <div style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)' }}>
                    {threePl} dispute · {sentDate}
                  </div>
                  <div className="imp-small" style={{ margin: '2px 0 0' }}>
                    {pursued.length} finding{pursued.length === 1 ? '' : 's'} · {fmtMoney(totalPursued)} pursued
                  </div>
                </div>
                <span className="ia-pill" style={{ background: overallMeta.pillBg, color: overallMeta.pillFg, borderColor: 'transparent', textTransform: 'none', letterSpacing: 0, flex: 'none' }}>
                  {overall === 'partial' ? 'Partially resolved' : overallMeta.label}
                </span>
                <button
                  type="button"
                  onClick={() => setBulkOpen((o) => !o)}
                  style={{ flex: 'none', background: '#fff', border: '1.5px solid var(--imp-purple-500)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', font: '600 13px var(--imp-font-body)', color: 'var(--imp-purple-500)' }}
                >
                  Apply one outcome to all
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  aria-label="Toggle dispute"
                  style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, border: '1.5px solid var(--imp-gray-300)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease', color: 'var(--imp-ink)' }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {bulkOpen && (
                <div style={{ margin: '14px 20px 0', border: '1.5px solid var(--imp-purple-300)', borderRadius: 12, background: 'var(--imp-purple-100)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)' }}>
                      This will update all {pursued.length} finding{pursued.length === 1 ? '' : 's'} sent to {threePl} on {sentDate}, replacing any existing individual outcomes.
                    </span>
                    <button type="button" onClick={() => setBulkOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', font: '600 13px var(--imp-font-body)', color: 'var(--imp-purple-500)', textDecoration: 'underline', padding: 0, flex: 'none' }}>
                      Cancel
                    </button>
                  </div>
                  <div className="ia-om-outcome-grid">
                    {OPTIONS.map((opt) => {
                      const sel = bulkStatus === opt.value
                      const accent = STATUS_META[opt.value].accent
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setBulkStatus(opt.value)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 9, cursor: 'pointer', font: '600 12.5px var(--imp-font-body)', whiteSpace: 'nowrap', background: '#fff', border: `1.5px solid ${sel ? accent : 'var(--imp-gray-300)'}`, color: sel ? accent : 'var(--imp-fg-muted)' }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  {bulkStatus === 'not_issued' && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
                        Biller response or reason (optional, shared across all findings)
                      </span>
                      <textarea
                        className="ia-input"
                        rows={2}
                        placeholder="Add details about why the request was declined"
                        value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        style={{ resize: 'vertical', lineHeight: 1.55, width: '100%', background: '#fff' }}
                      />
                    </label>
                  )}
                  {bulkStatus && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={applyBulk}>
                        Apply to {pursued.length} finding{pursued.length === 1 ? '' : 's'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {expanded && (
                <div style={{ padding: '6px 20px 16px' }}>
                  <div className="ia-om-table-head">
                    <span style={{ font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Finding</span>
                    <span style={{ font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Amount pursued</span>
                    <span style={{ font: '600 11px var(--imp-font-body)', color: 'var(--imp-fg-subtle)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Outcome</span>
                  </div>
                  {pursued.map((g) => {
                    const d = draftFor(g)
                    const meta = STATUS_META[d.status]
                    const ddOpen = openDropdown === g.id
                    const panelOpen = openPanel === g.id
                    const dirty = !!drafts[g.id]
                    const error = validate(g, d)
                    const parsedAmt = parseFloat(d.amount)
                    const showRemaining = d.status === 'partial' && !isNaN(parsedAmt) && !error
                    return (
                      <div key={g.id} style={{ borderTop: '1px solid var(--imp-gray-200)' }}>
                        <div className="ia-om-row-grid">
                          <div className="ia-om-c-title">
                            <span style={{ font: '600 13.5px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{g.title}</span>
                          </div>
                          <span className="ia-om-c-amount" style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtMoney(g.varN)}
                          </span>
                          <div className="ia-om-c-outcome" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenDropdown(ddOpen ? null : g.id)}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', boxSizing: 'border-box', background: meta.pillBg, border: `${ddOpen ? '2px' : '1.5px'} solid ${meta.accent}` }}
                                >
                                  <span style={{ font: '600 12.5px var(--imp-font-body)', color: meta.accent, flex: '1 1 auto', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {meta.label}
                                  </span>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flex: 'none', transform: ddOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease', color: meta.accent }}>
                                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                                {ddOpen && (
                                  <>
                                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                                    <div className="ia-om-overlay" onClick={() => setOpenDropdown(null)} />
                                    <div className="ia-om-dd-menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: 190 }}>
                                      {OPTIONS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          className="ia-om-dd-opt"
                                          onClick={() => {
                                            setDraft(g, { status: opt.value })
                                            setOpenDropdown(null)
                                            setOpenPanel(g.id)
                                          }}
                                        >
                                          <span style={{ width: 16, height: 16, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `1.6px solid ${STATUS_META[opt.value].accent}`, color: STATUS_META[opt.value].accent }} />
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setOpenPanel(panelOpen ? null : g.id)}
                                aria-label="Toggle finding"
                                style={{ flex: 'none', width: 26, height: 26, borderRadius: 7, border: '1.5px solid var(--imp-gray-300)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: panelOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease', color: 'var(--imp-fg-muted)' }}>
                                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                            {dirty && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B45309', flex: 'none' }} />
                                <span style={{ font: '600 11.5px var(--imp-font-body)', color: '#B45309' }}>Unsaved changes</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {panelOpen && (
                          <div style={{ margin: '0 0 14px 20px', borderLeft: '2.5px solid var(--imp-purple-300)', padding: '12px 16px 2px', background: 'var(--imp-gray-100)', borderRadius: '0 8px 8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="ia-om-detail-grid">
                              {(d.status === 'full' || d.status === 'partial') && (
                                <label style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)', whiteSpace: 'nowrap' }}>
                                    {d.status === 'partial' ? 'Credit received *' : 'Credit received'}
                                  </span>
                                  <input
                                    className="ia-input"
                                    type="text"
                                    inputMode="decimal"
                                    value={d.status === 'full' ? fmtMoney(g.varN) : d.amount}
                                    disabled={d.status === 'full'}
                                    onChange={(e) => setDraft(g, { amount: e.target.value })}
                                    style={{ width: '100%' }}
                                  />
                                </label>
                              )}
                              {(d.status === 'full' || d.status === 'partial') && (
                                <label style={{ flex: '0 0 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)', whiteSpace: 'nowrap' }}>Date received (optional)</span>
                                  <input className="ia-input" type="date" value={d.date} onChange={(e) => setDraft(g, { date: e.target.value })} style={{ width: '100%' }} />
                                </label>
                              )}
                              {(d.status === 'partial' || d.status === 'not_issued') && (
                                <label style={{ flex: '1 1 240px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)', whiteSpace: 'nowrap' }}>Biller response or reason (optional)</span>
                                  <input className="ia-input" type="text" value={d.reason} onChange={(e) => setDraft(g, { reason: e.target.value })} style={{ width: '100%', textOverflow: 'ellipsis' }} />
                                </label>
                              )}
                              {showRemaining && (
                                <div style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '1.5px solid var(--imp-gray-300)', paddingLeft: 16 }}>
                                  <span style={{ font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)', whiteSpace: 'nowrap' }}>Remains unresolved</span>
                                  <span style={{ font: '600 15px var(--imp-font-display)', color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums' }}>
                                    {fmtMoney(Math.max(0, r2(g.varN - parsedAmt)))}
                                  </span>
                                </div>
                              )}
                            </div>
                            {error && (
                              <p className="imp-small" style={{ margin: 0, color: 'var(--imp-error)' }}>
                                {error}
                              </p>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDrafts((cur) => {
                                    const next = { ...cur }
                                    delete next[g.id]
                                    return next
                                  })
                                  setOpenPanel(null)
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', font: '600 13px var(--imp-font-body)', color: 'var(--imp-purple-500)', padding: 0 }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="db-btn db-btn-primary db-btn-sm"
                                disabled={!!error || !dirty}
                                style={!!error || !dirty ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                onClick={() => save(g)}
                              >
                                Save finding
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ borderTop: '1.5px solid var(--imp-gray-300)', padding: '12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
                      Collected <strong style={{ color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{fmtMoney(totalCollected)}</strong>
                    </span>
                    <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
                      Unresolved <strong style={{ color: 'var(--imp-ink)', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{fmtMoney(remaining)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, padding: '14px 24px', borderTop: '1.5px solid var(--imp-gray-300)', flex: 'none' }}>
          <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
