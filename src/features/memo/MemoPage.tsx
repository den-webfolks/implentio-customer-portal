/** Credit memo detail page (template ~4570–4606 + tab routing).
 *  Tabs live in the path: /memos/:id (summary), /invoices, /activity. */
import { useLocation, useParams } from 'react-router'
import { ArrowDownTrayIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { InfoTip } from '@/ui/Tooltip/Tooltip'
import { Link } from '@/ui/Link/Link'
import { Tabs } from '@/ui/Tabs/Tabs'
import { EmptyState } from '@/ui/Display/Display'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { useDownloadState, useMemoDetail, useRecordMemoDownload } from './api'
import { SummaryTab } from './SummaryTab'
import { MemoInvoicesTab } from './MemoInvoicesTab'
import { ActivityTab } from './ActivityTab'

const CADENCE_TIP =
  'Audit cadence is based on your reporting cadence with each biller and may vary by carrier. To request a change, contact your Implentio customer representative.'

const TABS = [
  { key: 'summary', label: 'Summary & findings', path: '' },
  { key: 'invoices', label: 'Invoices', path: '/invoices' },
  { key: 'activity', label: 'Activity & exports', path: '/activity' },
] as const

export type MemoTabKey = (typeof TABS)[number]['key']

export function MemoPage({ tab }: { tab: MemoTabKey }) {
  const { memoId } = useParams()
  const location = useLocation()
  const showToast = useToast()
  const detailQ = useMemoDetail(memoId ?? '')
  const dlQ = useDownloadState()
  const recordDownload = useRecordMemoDownload()

  if (!detailQ.data || !dlQ.data) {
    if (detailQ.isFetched && detailQ.data === null) {
      return (
        <div className="db-card" style={{ padding: 0 }}>
          <EmptyState title="Credit memo not found" />
        </div>
      )
    }
    return null
  }
  const detail = detailQ.data
  const memo = detail.memo
  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? ''

  const downloadExcel = () => {
    saveFile(`/demo-assets/${encodeURIComponent(detail.file)}`, detail.file)
      .then(() => {
        recordDownload.mutate(memo.id)
        showToast('positive', `Downloading ${detail.file}`)
      })
      .catch(() =>
        showToast('danger', 'The workbook could not be downloaded. Please try again or contact your Implentio customer representative.'),
      )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <nav aria-label="Breadcrumb" className="ds-body-small" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-fg-muted)' }}>
          <Link to="/tracker/memos" variant="accent" size="small" iconLeft={<ChevronLeftIcon aria-hidden="true" />}>
            Parcel Credit Tracker
          </Link>
          <span aria-hidden="true">/</span>
          <span style={{ color: 'var(--ds-fg-default)' }}>{memo.id}</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{tabLabel}</span>
        </nav>
        <Link variant="accent" size="small" iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={downloadExcel} style={{ whiteSpace: 'nowrap' }}>
          Download credit memo
        </Link>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 380px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span className="ds-caption-tiny ds-muted" style={{ textTransform: 'uppercase' }}>
              Parcel credit memo
            </span>
          </div>
          <h1 className="db-h1" style={{ margin: 0 }}>
            {memo.id}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }} className="ds-body-small ds-muted">
            <span>
              Brand <strong className="ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>Implentio</strong>
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              Audit period <strong className="ds-w-semi" style={{ color: 'var(--ds-fg-default)' }}>{memo.period}</strong>
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              Reporting cadence: {memo.cadence}
              <InfoTip text={CADENCE_TIP} />
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{memo.completedText}</span>
          </div>
        </div>
      </header>

      <Tabs
        tabs={TABS}
        active={tab}
        ariaLabel="Credit memo sections"
        linkTo={(key) => `/memos/${memo.id}${TABS.find((x) => x.key === key)?.path ?? ''}${location.search}`}
      />

      {tab === 'summary' && <SummaryTab detail={detail} onDownloadExcel={downloadExcel} />}
      {tab === 'invoices' && <MemoInvoicesTab detail={detail} />}
      {tab === 'activity' && <ActivityTab detail={detail} onDownloadExcel={downloadExcel} />}
    </div>
  )
}
