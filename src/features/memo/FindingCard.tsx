/** One finding on the memo workspace, in layers: ① what went wrong and how
 *  much (always shown), ② "Show me why" — billed vs expected, one example
 *  package, how it was worked out — and ③ every package (PackagesModal).
 *  Replaces the prototype's card and inline package drill (template
 *  ~4925–5169); see DESIGN-SYSTEM.md "Parcel dispute flow — Phase 2". */
import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import type { FindingGroup } from '@/domain/types'
import { fmtMoney, posMoney } from '@/domain/money'
import { chargeCopy, findingExample, findingProblem } from '@/domain/finding-copy'
import { findingPhase, groupStatusLine } from '@/domain/outcomes'
import { plural } from '@/domain/plural'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { Checkbox } from '@/ui/Form/Choice'
import { Statistic } from '@/ui/Display/Display'
import { StatusChip, Tag } from '@/ui/Chip/StatusChip'
import { GROUP_STATUS_TONE } from '@/features/status-tones'
import { exampleText } from './derive'

export function FindingCard({
  group: g,
  provider,
  selected,
  now,
  onToggleSelected,
  onSetNotPursued,
  onOpenPackages,
}: {
  group: FindingGroup
  provider: string
  /** Ticked for the unsent dispute. */
  selected: boolean
  now: Date
  onToggleSelected: (groupId: string, selected: boolean) => void
  /** "Won't pursue" (true) or undo that decision (false). */
  onSetNotPursued: (groupId: string, notPursued: boolean) => void
  onOpenPackages: (group: FindingGroup) => void
}) {
  const [whyOpen, setWhyOpen] = useState(false)
  const open = findingPhase(g, now) === 'open'
  const sl = groupStatusLine({ ...g, amountN: g.varN, threePl: provider, inDisputeSel: open && selected }, now)
  const problem = findingProblem(g)
  const example = findingExample(g)
  const expert = exampleText(g)

  return (
    <div className="db-card" id={`finding-${g.id}`} tabIndex={-1} style={{ gap: 14, scrollMarginTop: 88 }}>
      <div className="ia-fcard">
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          {open && (
            <span style={{ paddingTop: 2 }}>
              <Checkbox aria-label={`Include in dispute: ${problem}`} checked={selected} onCheckedChange={(on) => onToggleSelected(g.id, on)} />
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 className="db-h3" style={{ margin: 0 }}>
                {problem}
              </h3>
              <Tag>{chargeCopy(g).term}</Tag>
            </div>
            <div className="ds-body-small ds-muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{g.carriers.join(', ')}</span>
              <span>{plural(g.packages, 'package')}</span>
              <span>{plural(g.invoices, 'invoice')}</span>
            </div>
            {example && (
              <p className="ds-body-base" style={{ margin: 0, maxWidth: '72ch' }}>
                {example}
              </p>
            )}
            <Link
              variant="accent"
              bold
              aria-expanded={whyOpen}
              iconRight={whyOpen ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
              onClick={() => setWhyOpen((o) => !o)}
              className="ia-disclosure"
              style={{ alignSelf: 'flex-start' }}
            >
              {whyOpen ? 'Hide why' : 'Show me why'}
            </Link>
          </div>
        </div>

        <div className="ia-fcard-fin" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Statistic bare size="large" type="accent" label="Overcharged" value={fmtMoney(g.varN)} />
          <span style={{ alignSelf: 'flex-start' }}>
            <StatusChip tone={GROUP_STATUS_TONE[sl.key]}>{sl.label}</StatusChip>
          </span>
          {sl.secondary && (
            <span className="imp-small" style={{ margin: 0 }}>
              {sl.secondary}
            </span>
          )}
          {sl.subtleAction && (
            <Link
              variant="accent"
              size="small"
              bold
              aria-label={`${sl.actionLabel}: ${problem}`}
              onClick={() => onSetNotPursued(g.id, sl.key === 'eligible')}
              style={{ alignSelf: 'flex-start' }}
            >
              {sl.actionLabel}
            </Link>
          )}
        </div>
      </div>

      {whyOpen && (
        <div style={{ borderTop: '1px solid var(--ds-stroke-disabled)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px 20px', maxWidth: 640 }}>
            <Statistic bare size="small" label="Billed" value={fmtMoney(g.invoicedN)} />
            <Statistic bare size="small" label="Should have been" value={fmtMoney(g.expectedN)} />
            <Statistic bare size="small" type="accent" label="Difference" value={posMoney(g.varN)} />
          </div>
          {example && (
            <div style={{ border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-small)', background: 'var(--ds-bg-disabled)', padding: '12px 14px', maxWidth: '78ch' }}>
              <div className="db-eyebrow" style={{ margin: '0 0 4px' }}>
                One example
              </div>
              <p className="ds-body-base" style={{ margin: 0 }}>
                {example.replace(/^e\.g\. o/, 'O')}.
              </p>
              {expert && (
                <p className="imp-small" style={{ margin: '6px 0 0' }}>
                  {expert}
                </p>
              )}
            </div>
          )}
          <div style={{ maxWidth: '78ch' }}>
            <div className="ds-body-base ds-w-semi">How we worked it out</div>
            <p className="imp-small" style={{ margin: '3px 0 0' }}>
              {g.why}
            </p>
          </div>
          <Button size="small" iconLeft={<TableCellsIcon aria-hidden="true" />} onClick={() => onOpenPackages(g)} style={{ alignSelf: 'flex-start' }}>
            See all {plural(g.packages, 'package')}
          </Button>
        </div>
      )}
    </div>
  )
}
