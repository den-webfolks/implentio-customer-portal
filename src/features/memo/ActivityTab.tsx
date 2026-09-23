/** Memo detail — Activity & exports tab (template ~5272–5357). */
import { useState } from 'react'
import type { MemoDetail } from '@/domain/types'
import { useToast } from '@/ui/Toast/ToastProvider'
import { useActivity } from './api'

type ActivityFilter = 'all' | 'reports' | 'downloads' | 'disputes'

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: 'all', label: 'All activity' },
  { key: 'reports', label: 'Report versions' },
  { key: 'downloads', label: 'Downloads' },
  { key: 'disputes', label: 'Disputes & outcomes' },
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
              <div key={v.num} className="db-card" style={{ gap: 12, background: 'var(--imp-gray-100)', borderColor: 'var(--imp-gray-300)' }}>
                <div className="db-card-head">
                  <div>
                    <h3 className="db-h3" style={{ margin: 0, fontSize: 16 }}>
                      {v.label} · Superseded
                    </h3>
                    <p className="imp-small" style={{ margin: '6px 0 0' }}>
                      Parcel · {v.dateText}
                    </p>
                  </div>
                  <span className="ia-pill" style={{ background: 'var(--imp-gray-200)', color: 'var(--imp-fg-muted)', borderColor: 'var(--imp-gray-300)' }}>
                    Superseded
                  </span>
                </div>
                {v.note && (
                  <p className="imp-small" style={{ margin: 0 }}>
                    {v.note}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="db-btn db-btn-secondary db-btn-sm" onClick={onDownloadExcel}>
                    Download Credit Memo
                  </button>
                  <button
                    className="db-btn db-btn-secondary db-btn-sm"
                    onClick={() => showToast('warn', 'Superseded version preview is not available in this release.')}
                  >
                    Review Summary
                  </button>
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => {
            const on = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  border: `1.5px solid ${on ? 'var(--imp-purple-500)' : 'var(--imp-gray-300)'}`,
                  background: on ? 'var(--imp-purple-100)' : '#fff',
                  color: on ? 'var(--imp-purple-500)' : 'var(--imp-fg-muted)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  font: '600 12px var(--imp-font-body)',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        {events.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ font: '600 14px var(--imp-font-body)', color: 'var(--imp-ink)' }}>No matching activity</div>
            <p className="imp-small" style={{ margin: '6px 0 0' }}>
              Try a different filter to see other credit-memo activity.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {events.map((a, i) => (
            <div key={`${a.text}-${i}`} style={{ display: 'flex', gap: 14, padding: '10px 0', borderTop: '1px solid var(--imp-gray-200)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--imp-purple-100)', color: 'var(--imp-purple-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  {a.icon === 'dl' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : a.icon === 'send' ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span style={{ width: 1.5, flex: 1, background: 'var(--imp-gray-200)', marginTop: 4 }} />
              </div>
              <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <div style={{ font: '600 13.5px var(--imp-font-body)', color: 'var(--imp-ink)' }}>{a.text}</div>
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
