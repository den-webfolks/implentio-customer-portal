/** One finding on the memo workspace, in three steps of detail, drawn as in
 *  prototype-planning/02-findings-evidence.html: ① the card — what went
 *  wrong, what it covers, how much, and one action row with the status on
 *  the right; ② "Show why", a tinted well of section cards opening in place
 *  (WhyPanel); ③ every package (PackagesModal). See DESIGN-SYSTEM.md
 *  "Show me why (plan 02)". */
import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import type { FindingGroup } from '@/domain/types'
import { fmtMoney } from '@/domain/money'
import { chargeCopy, findingProblem } from '@/domain/finding-copy'
import { findingPhase, groupPastDeadline, groupStatusLine } from '@/domain/outcomes'
import { daysUntilDeadline } from '@/domain/dates'
import { claimCsv, claimFileName, claimFileRows } from '@/domain/dispute-email'
import { mismatchNote, type ChargeField } from '@/domain/evidence'
import { plural } from '@/domain/plural'
import { saveBlob } from '@/lib/download'
import { Link } from '@/ui/Link/Link'
import { Checkbox } from '@/ui/Form/Choice'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { GROUP_STATUS_TONE } from '@/features/status-tones'
import { useCompactShell } from '@/shell/useCompactShell'
import { WhyPanel, type ImplentioContact } from './evidence/WhyPanel'
import { ChargeOverview, GlossaryWord } from './evidence/Explain'
import styles from './evidence/Evidence.module.css'

/** The charges a finding is named after ("Base freight + fuel" is two). */
const ownFields = (key: string): ChargeField[] =>
  key === 'multi'
    ? ['b', 'f']
    : key === 'fuel'
      ? ['f']
      : key === 'res'
        ? ['r']
        : key === 'das'
          ? ['d']
          : key === 'other'
            ? ['o']
            : ['b']

/** Service levels as the card lists them: the first two, then "+N". */
function serviceLevels(g: FindingGroup): { shown: string; rest: string[] } {
  const labels = [...new Set(g.services.map((s) => s.label))]
  return { shown: labels.slice(0, 2).join(', ') || '—', rest: labels.slice(2) }
}

/** "Sep 20" — the chip's short date. */
const monthDay = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/** The deadline as the card's chip: "Dispute by Sep 20 · 3 days left". */
function deadlineChip(iso: string, now: Date): string {
  const days = daysUntilDeadline(iso, now)
  const left = days <= 0 ? 'due today' : days === 1 ? '1 day left' : `${days} days left`
  return `Dispute by ${monthDay(iso)} · ${left}`
}

/** Every package in the finding as the one per-finding file (same as the email attachment). */
export function downloadFindingPackages(g: FindingGroup) {
  saveBlob(new Blob([claimCsv(claimFileRows(g))], { type: 'text/csv' }), claimFileName(g, 'csv'))
}

export function FindingCard({
  group: g,
  allGroups,
  provider,
  contact,
  selected,
  prepared = false,
  selectable = true,
  now,
  onToggleSelected,
  onSetNotPursued,
  onOpenPackages,
  onJump,
}: {
  group: FindingGroup
  /** Every finding on the memo ("Show why" names one that shares a charge). */
  allGroups: readonly FindingGroup[]
  provider: string
  /** Who at Implentio answers questions about the evidence. */
  contact: ImplentioContact | null
  /** Ticked for the unsent dispute. */
  selected: boolean
  /** Reserved by an email prepared but not confirmed as sent. */
  prepared?: boolean
  /** False while the memo has a prepared email: answer that first, then tick more. */
  selectable?: boolean
  now: Date
  onToggleSelected: (groupId: string, selected: boolean) => void
  /** "Won't pursue" (true) or undo that decision (false). */
  onSetNotPursued: (groupId: string, notPursued: boolean) => void
  onOpenPackages: (group: FindingGroup) => void
  /** Scrolls to another finding; null when that card isn't on screen. */
  onJump: (groupId: string) => (() => void) | null
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const [stuck, setStuck] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const compact = useCompactShell()
  const open = findingPhase(g) === 'open' && !prepared
  const sl = groupStatusLine(
    { ...g, prepared, amountN: g.varN, threePl: provider, inDisputeSel: open && selected },
    now,
  )
  const problem = findingProblem(g)
  const mismatch = mismatchNote(g)
  const levels = serviceLevels(g)
  const titleId = `finding-${g.id}-title`
  const whyId = `finding-${g.id}-why`
  const deadlineId = `finding-${g.id}-deadline`
  const pastDeadline = groupPastDeadline(g, now)

  // The summary bar shows once the card's header has scrolled out of view.
  // Phones already stack the top bar and the selection bar, so they skip it.
  useEffect(() => {
    const el = topRef.current
    if (!whyOpen || compact || !el || typeof IntersectionObserver === 'undefined') {
      setStuck(false)
      return
    }
    const io = new IntersectionObserver(([en]) =>
      setStuck(!!en && !en.isIntersecting && en.boundingClientRect.top < 0),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [whyOpen, compact])

  const closeWhy = (fromBar: boolean) => {
    setWhyOpen(false)
    if (!fromBar) return
    // Closing from deep inside the panel brings the finding back into view.
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    topRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    document.getElementById(`${whyId}-toggle`)?.focus({ preventScroll: true })
  }

  // Right of the action row: an open finding shows its deadline as a chip
  // (past it: a warning — the finding stays open, status model 2026-09-29);
  // anything else shows its status and what happened.
  const status =
    sl.key === 'eligible' ? (
      !g.disputeDeadline ? (
        <span>{sl.label}</span>
      ) : pastDeadline ? (
        // A warning that wraps, not a chip: the finding stays open (status model, 2026-09-29).
        <span id={deadlineId} className={styles.warn}>
          <ExclamationTriangleIcon aria-hidden="true" />
          Past the dispute deadline ({monthDay(g.disputeDeadline)}) · {provider} may refuse it
        </span>
      ) : (
        <span id={deadlineId}>
          <StatusChip tone="attention">{deadlineChip(g.disputeDeadline, now)}</StatusChip>
        </span>
      )
    ) : (
      <>
        {sl.secondary && <span>{sl.secondary}</span>}
        <StatusChip tone={GROUP_STATUS_TONE[sl.key]}>{sl.label}</StatusChip>
      </>
    )

  return (
    <article
      className={styles.card}
      id={`finding-${g.id}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      style={{ scrollMarginTop: 88 }}
    >
      <div className={styles.top} ref={topRef} style={{ scrollMarginTop: 16 }}>
        <div className={styles.main}>
          <h3 id={titleId} className={styles.title}>
            {problem}
          </h3>
          <dl className={styles.meta}>
            <div>
              <dt>Carrier</dt>
              <dd>{g.carriers.join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>
                <GlossaryWord
                  term="serviceLevel"
                  biller={provider}
                  mark={false}
                  caseLabel="In this finding"
                  caseText={`Its packages were sent ${[...new Set(g.services.map((s) => s.label))].join(', ')}.`}
                />
              </dt>
              <dd>
                {levels.shown}
                {levels.rest.length > 0 && (
                  <span className={styles.more} title={levels.rest.join(', ')}>
                    {' '}
                    +{levels.rest.length}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Charge type</dt>
              <dd>
                <ChargeOverview
                  g={g}
                  fields={ownFields(g.chargeKey)}
                  label={chargeCopy(g).term}
                  mark={false}
                />
              </dd>
            </div>
          </dl>
          {mismatch && (
            <p className={styles.mismatch}>
              <ExclamationTriangleIcon aria-hidden="true" />
              {mismatch}
            </p>
          )}
        </div>

        <div className={styles.amount}>
          <span>Overcharged</span>
          <span className={styles.money}>{fmtMoney(g.varN)}</span>
          <span>
            {plural(g.invoices, 'invoice')} · {plural(g.packages, 'package')}
          </span>
        </div>

        <div className={styles.bar}>
          <div className={styles.actions}>
            {open && selectable && (
              <Checkbox
                bordered
                label="Include in dispute"
                aria-label={`Include in dispute: ${problem}`}
                aria-describedby={g.disputeDeadline ? deadlineId : undefined}
                checked={selected}
                onCheckedChange={(on) => onToggleSelected(g.id, on)}
              />
            )}
            <button
              type="button"
              id={`${whyId}-toggle`}
              className={styles.toggle}
              aria-expanded={whyOpen}
              aria-controls={whyId}
              onClick={() => (whyOpen ? closeWhy(false) : setWhyOpen(true))}
            >
              {whyOpen ? 'Hide why' : 'Show why'}
              <ChevronDownIcon aria-hidden="true" />
            </button>
          </div>
          <div className={styles.status}>
            {sl.subtleAction && (
              <button
                type="button"
                className={styles.subtle}
                aria-label={`${sl.actionLabel}: ${problem}`}
                onClick={() => onSetNotPursued(g.id, sl.key === 'eligible')}
              >
                {sl.actionLabel}
              </button>
            )}
            {status}
          </div>
        </div>
      </div>

      {whyOpen && (
        <div className={styles.well} id={whyId}>
          {/* A mouse convenience that repeats the card's own toggle, so it stays out of the tab order. */}
          <div className={`${styles.sticky} ${stuck ? styles.stuck : ''}`} aria-hidden="true">
            <span className={styles.stickyTitle}>{problem}</span>
            <span className={styles.stickyMoney}>{fmtMoney(g.varN)}</span>
            <Link
              variant="accent"
              size="small"
              bold
              tabIndex={-1}
              iconRight={<ChevronUpIcon aria-hidden="true" />}
              onClick={() => closeWhy(true)}
            >
              Hide why
            </Link>
          </div>
          <WhyPanel
            group={g}
            allGroups={allGroups}
            provider={provider}
            contact={contact}
            onOpenPackages={() => onOpenPackages(g)}
            onDownload={() => downloadFindingPackages(g)}
            onJump={onJump}
          />
        </div>
      )}
    </article>
  )
}
