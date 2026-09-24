/** "Update credit memo dispute" modal (template ~5865–6050): per-finding
 *  outcome dropdowns with amount/date/reason drafts, plus bulk apply. */
import { useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { CollectionStatus, FindingGroup, MemoDetail } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { Modal } from '@/ui/Modal/Modal'
import { Button, IconButton } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { Statistic } from '@/ui/Display/Display'
import { Select } from '@/ui/Form/Select'
import { RadioGroup } from '@/ui/Form/Choice'
import { TextArea, TextField } from '@/ui/Form/TextField'
import { COLLECTION_TONE, toneColors } from '@/features/status-tones'
import { useRecordGroupOutcome } from './api'
import styles from './OutcomeModal.module.css'

const STATUS_LABEL: Record<CollectionStatus, string> = {
  awaiting: 'Awaiting outcome',
  full: 'Fully collected',
  partial: 'Partly collected',
  not_issued: 'Biller declined',
}

const OPTIONS: { value: CollectionStatus; label: string }[] = [
  { value: 'awaiting', label: 'Awaiting outcome' },
  { value: 'full', label: 'Fully collected' },
  { value: 'partial', label: 'Partly collected' },
  { value: 'not_issued', label: 'Biller declined' },
]

const CAPTION_STYLE = {
  font: 'var(--ds-weight-medium) 12px/1.3 var(--ds-font)',
  letterSpacing: 'var(--ds-tracking-caption)',
  color: 'var(--ds-fg-muted)',
  textTransform: 'uppercase',
} as const

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
  const overallChip = (
    <StatusChip tone={COLLECTION_TONE[overall]}>
      {overall === 'partial' ? 'Partly collected' : STATUS_LABEL[overall]}
    </StatusChip>
  )
  const threePl = detail.memo.provider
  const sentDate = pursued[0]?.pursuedAt ?? ''
  const findingsWord = `finding${pursued.length === 1 ? '' : 's'}`

  const setDraft = (g: FindingGroup, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [g.id]: { ...draftFor(g), ...patch } }))

  const discardDraft = (g: FindingGroup) =>
    setDrafts((cur) => {
      const next = { ...cur }
      delete next[g.id]
      return next
    })

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
    discardDraft(g)
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
    <Modal
      open
      onClose={onClose}
      size="large"
      width={1080}
      title="Update credit memo dispute"
      description="Update the outcome for all findings or change them individually."
      footer={
        <Button variant="primary" size="small" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="ia-om-root" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-large)', boxShadow: 'var(--ds-shadow-disabled)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <div className="ds-heading-small" style={{ color: 'var(--ds-fg-default)' }}>Credit memo dispute</div>
            <div className="imp-small" style={{ margin: '2px 0 0' }}>
              {fmtMoney(totalPursued)} pursued across 1 dispute and {pursued.length} {findingsWord}
            </div>
          </div>
          <span style={{ flex: 'none' }}>{overallChip}</span>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--ds-stroke-disabled)', flex: 'none' }} />
          <Statistic bare size="small" label="Total collected" value={fmtMoney(totalCollected)} />
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--ds-stroke-disabled)', flex: 'none' }} />
          <Statistic bare size="small" label="Unresolved" value={fmtMoney(remaining)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 className="ds-heading-small" style={{ margin: 0, color: 'var(--ds-fg-default)' }}>Disputes</h3>
          <div style={{ border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-large)', boxShadow: 'var(--ds-shadow-disabled)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', flexWrap: 'wrap', background: 'var(--ds-bg-disabled)' }}>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div className="ds-heading-tiny" style={{ color: 'var(--ds-fg-default)' }}>
                  {threePl} dispute · {sentDate}
                </div>
                <div className="imp-small" style={{ margin: '2px 0 0' }}>
                  {pursued.length} {findingsWord} · {fmtMoney(totalPursued)} pursued
                </div>
              </div>
              <span style={{ flex: 'none' }}>{overallChip}</span>
              <Button variant="emphasis" size="small" aria-expanded={bulkOpen} onClick={() => setBulkOpen((o) => !o)}>
                Apply one outcome to all
              </Button>
              <IconButton
                size="small"
                aria-label={`Findings in ${threePl} dispute`}
                aria-expanded={expanded}
                onClick={() => setExpanded((e) => !e)}
                icon={expanded ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
              />
            </div>

            {bulkOpen && (
              <div style={{ margin: '14px 20px 0', border: '1px solid var(--ds-stroke-brand-muted)', borderRadius: 'var(--ds-radius-large)', background: 'var(--ds-bg-brand-disabled)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span className="ds-body-base" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-default)' }}>
                    This will update all {pursued.length} {findingsWord} sent to {threePl} on {sentDate}, replacing any existing individual outcomes.
                  </span>
                  <Link underline bold onClick={() => setBulkOpen(false)}>
                    Cancel
                  </Link>
                </div>
                <RadioGroup
                  aria-label="Outcome for all findings"
                  bordered
                  className={styles.outcomeGrid}
                  optionClassName={styles.outcomeOption}
                  options={OPTIONS}
                  value={bulkStatus}
                  onValueChange={setBulkStatus}
                />
                {bulkStatus === 'not_issued' && (
                  <TextArea
                    label="Biller response or reason (optional, shared across all findings)"
                    rows={2}
                    placeholder="Add details about why the request was declined"
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                  />
                )}
                {bulkStatus && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" size="small" onClick={applyBulk}>
                      Apply to {pursued.length} {findingsWord}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {expanded && (
              <div style={{ padding: '6px 20px 16px' }}>
                <div className="ia-om-table-head">
                  <span style={CAPTION_STYLE}>Finding</span>
                  <span style={CAPTION_STYLE}>Amount pursued</span>
                  <span style={CAPTION_STYLE}>Outcome</span>
                </div>
                {pursued.map((g) => {
                  const d = draftFor(g)
                  const tone = toneColors(COLLECTION_TONE[d.status])
                  const toneVars: Record<string, string> = { '--tone-fg': tone.fg, '--tone-bg': tone.bg }
                  const panelOpen = openPanel === g.id
                  const dirty = !!drafts[g.id]
                  const error = validate(g, d)
                  const parsedAmt = parseFloat(d.amount)
                  const showRemaining = d.status === 'partial' && !isNaN(parsedAmt) && !error
                  return (
                    <div key={g.id} style={{ borderTop: '1px solid var(--ds-stroke-disabled)' }}>
                      <div className="ia-om-row-grid">
                        <div className="ia-om-c-title">
                          <span className="ds-body-base" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-default)' }}>{g.title}</span>
                        </div>
                        <span className="ia-om-c-amount ds-body-base" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-default)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMoney(g.varN)}
                        </span>
                        <div className="ia-om-c-outcome" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div className={styles.outcomeCell} style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-3)', ...toneVars }}>
                            <Select
                              aria-label={`Outcome for ${g.title}`}
                              size="small"
                              fullWidth
                              fieldClassName={styles.outcomeSelect}
                              className={styles.toneTrigger}
                              options={OPTIONS}
                              value={d.status}
                              onValueChange={(status) => {
                                setDraft(g, { status })
                                setOpenPanel(g.id)
                              }}
                            />
                            <IconButton
                              size="small"
                              aria-label={`Outcome details for ${g.title}`}
                              aria-expanded={panelOpen}
                              onClick={() => setOpenPanel(panelOpen ? null : g.id)}
                              icon={panelOpen ? <ChevronDownIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
                            />
                          </div>
                          {dirty && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-fg-warning)', flex: 'none' }} />
                              <span className="ds-body-small" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-warning)' }}>Unsaved changes</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {panelOpen && (
                        <div style={{ marginBlockEnd: 14, marginInlineStart: 20, borderInlineStart: '2px solid var(--ds-stroke-brand-muted)', padding: '12px 16px', background: 'var(--ds-bg-disabled)', borderStartEndRadius: 'var(--ds-radius-large)', borderEndEndRadius: 'var(--ds-radius-large)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="ia-om-detail-grid">
                            {(d.status === 'full' || d.status === 'partial') && (
                              <TextField
                                fieldClassName={styles.fieldAmount}
                                label={d.status === 'partial' ? 'Credit received *' : 'Credit received'}
                                aria-required={d.status === 'partial' || undefined}
                                size="small"
                                inputMode="decimal"
                                value={d.status === 'full' ? fmtMoney(g.varN) : d.amount}
                                disabled={d.status === 'full'}
                                onChange={(e) => setDraft(g, { amount: e.target.value })}
                                validation={error ? 'invalid' : undefined}
                                message={error || undefined}
                              />
                            )}
                            {(d.status === 'full' || d.status === 'partial') && (
                              <TextField
                                fieldClassName={styles.fieldDate}
                                label="Date received"
                                optional
                                size="small"
                                type="date"
                                value={d.date}
                                onChange={(e) => setDraft(g, { date: e.target.value })}
                              />
                            )}
                            {(d.status === 'partial' || d.status === 'not_issued') && (
                              <TextField
                                fieldClassName={styles.fieldReason}
                                label="Biller response or reason"
                                optional
                                size="small"
                                value={d.reason}
                                onChange={(e) => setDraft(g, { reason: e.target.value })}
                              />
                            )}
                            {showRemaining && (
                              <div style={{ flex: '0 0 150px', borderInlineStart: '1px solid var(--ds-stroke-disabled)', paddingInlineStart: 16 }}>
                                <Statistic bare size="small" label="Unresolved" value={fmtMoney(Math.max(0, r2(g.varN - parsedAmt)))} />
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                            <Link
                              bold
                              onClick={() => {
                                discardDraft(g)
                                setOpenPanel(null)
                              }}
                            >
                              Cancel
                            </Link>
                            <Button variant="primary" size="small" disabled={!!error || !dirty} onClick={() => save(g)}>
                              Save finding
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div style={{ borderTop: '1px solid var(--ds-stroke-muted)', padding: '12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                  <span className="ds-body-base" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-muted)' }}>
                    Collected <strong style={{ fontWeight: 'var(--ds-weight-semi)', color: 'var(--ds-fg-default)', fontVariantNumeric: 'tabular-nums', marginInlineStart: 6 }}>{fmtMoney(totalCollected)}</strong>
                  </span>
                  <span className="ds-body-base" style={{ fontWeight: 'var(--ds-weight-medium)', color: 'var(--ds-fg-muted)' }}>
                    Unresolved <strong style={{ fontWeight: 'var(--ds-weight-semi)', color: 'var(--ds-fg-default)', fontVariantNumeric: 'tabular-nums', marginInlineStart: 6 }}>{fmtMoney(remaining)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
