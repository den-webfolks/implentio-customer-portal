/** Credit memo detail page (template ~4570–4606 + tab routing).
 *  Tabs live in the path: /memos/:id (summary), /invoices, /activity. */
import { useLocation, useNavigate, useParams } from 'react-router'
import { InfoTip } from '@/ui/InfoTip'
import { useToast } from '@/ui/Toast/ToastProvider'
import { saveFile } from '@/lib/download'
import { useDownloadState, useMemoDetail, useRecordMemoDownload } from './api'
import { SummaryTab } from './SummaryTab'
import { MemoInvoicesTab } from './MemoInvoicesTab'
import { ActivityTab } from './ActivityTab'

const CADENCE_TIP =
  'Audit cadence is based on your reporting cadence with each biller and may vary by carrier. To request a change, contact your Implentio customer representative.'

const TABS = [
  { key: 'summary', label: 'Summary & Findings', path: '' },
  { key: 'invoices', label: 'Invoices', path: '/invoices' },
  { key: 'activity', label: 'Activity & exports', path: '/activity' },
] as const

export type MemoTabKey = (typeof TABS)[number]['key']

export function MemoPage({ tab }: { tab: MemoTabKey }) {
  const { memoId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const showToast = useToast()
  const detailQ = useMemoDetail(memoId ?? '')
  const dlQ = useDownloadState()
  const recordDownload = useRecordMemoDownload()

  if (!detailQ.data || !dlQ.data) {
    if (detailQ.isFetched && detailQ.data === null) {
      return (
        <div className="db-card db-empty" style={{ padding: '44px 32px' }}>
          <h3 className="db-h3">Credit memo not found</h3>
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
        showToast('ok', `Downloading ${detail.file}`)
      })
      .catch(() =>
        showToast('warn', 'The workbook could not be downloaded. Please try again or contact your Implentio customer representative.'),
      )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px var(--imp-font-body)', color: 'var(--imp-fg-subtle)' }}>
          <button className="ia-crumb" onClick={() => navigate('/tracker/memos')}>
            Parcel Credit Tracker
          </button>
          <span>/</span>
          <span style={{ color: 'var(--imp-ink)' }}>{memo.id}</span>
          <span>/</span>
          <span>{tabLabel}</span>
        </div>
        <button
          type="button"
          onClick={downloadExcel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, font: '600 12.5px var(--imp-font-body)', color: 'var(--imp-purple-500)', whiteSpace: 'nowrap' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 18v1.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download credit memo
        </button>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 340, flex: '1 1 380px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ font: '600 10px var(--imp-font-body)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--imp-fg-subtle)' }}>
              Parcel credit memo
            </span>
          </div>
          <h1 className="db-h1" style={{ margin: 0 }}>
            {memo.id}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10, font: '500 12px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>
            <span>
              Brand <strong style={{ color: 'var(--imp-ink)' }}>Implentio</strong>
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              Audit period <strong style={{ color: 'var(--imp-ink)' }}>{memo.period}</strong>
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

      <div style={{ borderBottom: '1.5px solid var(--imp-gray-300)' }}>
        <div className="ia-secnav">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={t.key === tab ? 'on' : ''}
              onClick={() => navigate(`/memos/${memo.id}${t.path}${location.search}`)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' && <SummaryTab detail={detail} onDownloadExcel={downloadExcel} />}
      {tab === 'invoices' && <MemoInvoicesTab detail={detail} />}
      {tab === 'activity' && <ActivityTab detail={detail} onDownloadExcel={downloadExcel} />}
    </div>
  )
}
