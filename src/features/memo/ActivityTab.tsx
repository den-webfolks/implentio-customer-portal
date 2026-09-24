/** Memo detail — Activity & exports tab (template ~5272–5357). */
import { useState } from 'react'
import { ArrowDownTrayIcon, DocumentTextIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import type { MemoDetail } from '@/domain/types'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Button } from '@/ui/Button/Button'
import { RadioGroup } from '@/ui/Form/Choice'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { EmptyState } from '@/ui/Display/Display'
import { useActivity } from './api'

type ActivityFilter = 'all' | 'reports' | 'downloads' | 'disputes'

const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'reports', label: 'Report versions' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'disputes', label: 'Disputes & outcomes' },
]

const ICON_KIND: Record<string, ActivityFilter> = {
  up: 'reports',
  gen: 'reports',
  dl: 'downloads',
  send: 'disputes',
}

export function ActivityTab({
  detail,
  onDownloadExcel,
}: {
  detail: MemoDetail
  onDownloadExcel: () => void
}) {
  const memo = detail.memo
  const showToast = useToast()
  const activityQ = useActivity()
  const [filter, setFilter] = useState<ActivityFilter>('all')

  const events = (activityQ.data ?? []).filter(
    (a) => filter === 'all' || ICON_KIND[a.icon] === filter,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ maxWidth: '70ch' }}>
        <h3 className="db-h3" style={{ margin: 0 }}>
          Activity and export history
        </h3>
        <p className="imp-small" style={{ margin: '6px 0 0' }}>
          See report versions, downloads, dispute submissions, and outcome changes for this credit memo.
        </p>
      </div>

      {memo.reportVersions && memo.reportVersions.some((v) => v.superseded) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="db-eyebrow">Previous versions</div>
          {memo.reportVersions
            .filter((v) => v.superseded)
            .map((v) => (
              <div key={v.num} className="db-card" style={{ gap: 12, background: 'var(--ds-bg-disabled)' }}>
                <div className="db-card-head">
                  <div>
                    <h3 className="db-h3" style={{ margin: 0, fontSize: 16 }}>
                      {v.label} · Superseded
                    </h3>
                    <p className="imp-small" style={{ margin: '6px 0 0' }}>
                      Parcel · {v.dateText}
                    </p>
                  </div>
                  <StatusChip tone="muted">Superseded</StatusChip>
                </div>
                {v.note && (
                  <p className="imp-small" style={{ margin: 0 }}>
                    {v.note}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={onDownloadExcel}>
                    Download Credit Memo
                  </Button>
                  <Button size="small" onClick={() => showToast('danger', 'Superseded version preview is not available in this release.')}>
                    Review Summary
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="db-card" style={{ gap: 16 }}>
        <div className="db-card-head">
          <h3 className="db-h3" style={{ margin: 0, fontSize: 16 }}>
            Credit memo activity
          </h3>
          <span className="imp-small" style={{ margin: 0 }}>
            Downloading a report does not submit a dispute.
          </span>
        </div>
        <RadioGroup aria-label="Filter activity" bordered direction="row" options={FILTERS} value={filter} onValueChange={setFilter} />
        {events.length === 0 && (
          <EmptyState title="No matching activity" subtitle="Try a different filter to see other credit-memo activity." />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {events.map((a, i) => (
            <div key={`${a.text}-${i}`} style={{ display: 'flex', gap: 14, padding: '10px 0', borderTop: '1px solid var(--ds-stroke-disabled)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                <span style={{ width: 34, height: 34, borderRadius: 'var(--ds-radius-full)', background: 'var(--ds-bg-brand-disabled)', color: 'var(--ds-icon-brand-emphasis)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  {a.icon === 'dl' ? (
                    <ArrowDownTrayIcon width={16} height={16} aria-hidden="true" />
                  ) : a.icon === 'send' ? (
                    <PaperAirplaneIcon width={16} height={16} aria-hidden="true" />
                  ) : (
                    <DocumentTextIcon width={16} height={16} aria-hidden="true" />
                  )}
                </span>
                <span style={{ width: 1, flex: 1, background: 'var(--ds-stroke-disabled)', marginTop: 4 }} />
              </div>
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <div className="ds-body-base ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>{a.text}</div>
                </div>
                <div style={{ flex: 'none', textAlign: 'right' }}>
                  <span className="imp-small" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                    {a.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
