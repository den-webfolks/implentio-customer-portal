/** Sticky bar under the findings once something is ticked: the running total,
 *  the deadline, and the one next action (Review & send). */
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { fmtMoney } from '@/domain/money'
import { plural } from '@/domain/plural'
import { Button } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'

export function SelectionBar({
  count,
  amountN,
  deadline,
  onReview,
  onClear,
}: {
  count: number
  amountN: number
  deadline: string | null
  onReview: () => void
  onClear: () => void
}) {
  return (
    <div
      role="region"
      aria-label="Selected for your dispute"
      style={{
        position: 'sticky',
        bottom: 16,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '12px 16px 12px 20px',
        border: '1px solid var(--ds-stroke-brand-muted)',
        borderRadius: 'var(--ds-radius-large)',
        background: 'var(--ds-bg-default)',
        boxShadow: 'var(--ds-shadow-popover)',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }} aria-live="polite">
        <div className="ds-body-base ds-w-semi">
          {plural(count, 'finding')} · {fmtMoney(amountN)} selected
        </div>
        {deadline && (
          <div className="imp-small" style={{ margin: '2px 0 0' }}>
            {deadline}
          </div>
        )}
      </div>
      <Link variant="accent" size="small" bold onClick={onClear}>
        Clear
      </Link>
      <Button variant="primary" iconLeft={<PaperAirplaneIcon aria-hidden="true" />} onClick={onReview}>
        Review &amp; send
      </Button>
    </div>
  )
}
