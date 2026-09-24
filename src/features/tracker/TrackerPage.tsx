/** Parcel Credit Tracker (template ~1196–1624). Tabs live in the path:
 *  /tracker/memos and /tracker/outcomes. */
import { useParams } from 'react-router'
import { Tabs } from '@/ui/Tabs/Tabs'
import { MemosTab } from './MemosTab'
import { OutcomesTab } from './OutcomesTab'
import { usePageTitle } from '@/shell/usePageTitle'

const TABS = [
  { key: 'memos', label: 'Credit memos' },
  { key: 'outcomes', label: 'Credit outcomes' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function TrackerPage() {
  const { tab } = useParams()
  const active: TabKey = tab === 'outcomes' ? 'outcomes' : 'memos'
  usePageTitle(TABS.find((t) => t.key === active)?.label, 'Parcel Credit Tracker')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ maxWidth: '74ch' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 className="db-h1">
            Parcel Credit{' '}
            <span style={{ position: 'relative', display: 'inline-block' }}>
              Tracker
              <img
                src="/brand/title-swash.svg"
                alt=""
                aria-hidden="true"
                style={{ position: 'absolute', insetInline: 0, bottom: -9, width: '100%', height: 10, pointerEvents: 'none' }}
              />
            </span>
          </h1>
        </div>
        <p className="imp-small" style={{ margin: '8px 0 0' }}>
          Each credit memo represents one completed audit period. Open a credit memo to review your
          invoices, findings, and downloadable report.
        </p>
      </div>

      <Tabs tabs={TABS} active={active} linkTo={(k) => `/tracker/${k}`} ariaLabel="Parcel Credit Tracker views" />

      {active === 'memos' ? <MemosTab /> : <OutcomesTab />}
    </div>
  )
}
