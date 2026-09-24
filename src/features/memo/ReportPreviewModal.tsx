/** Credit-memo report ("PDF Preview") modal — template ~7101–7156. */
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import type { MemoDetail } from '@/domain/types'
import { fmtMoney, posMoney } from '@/domain/money'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { StatusChip } from '@/ui/Chip/StatusChip'
import { Statistic } from '@/ui/Display/Display'
import { Table } from '@/ui/Table/Table'

const cell = (n: number) => (Math.abs(n) < 0.005 ? '—' : fmtMoney(n))

export function ReportPreviewModal({
  detail,
  onClose,
  onDownload,
}: {
  detail: MemoDetail
  onClose: () => void
  onDownload: () => void
}) {
  const memo = detail.memo
  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      width={920}
      title="Report preview"
      description={`${memo.id} — Summary · ${memo.version}`}
      footer={
        <Button iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={onDownload}>
          Download Credit Memo
        </Button>
      }
    >
      <div>
        <StatusChip tone="muted">PDF Preview</StatusChip>
      </div>
      <div style={{ background: 'var(--ds-bg-default)', border: '1px solid var(--ds-stroke-disabled)', borderRadius: 'var(--ds-radius-large)', padding: '28px 32px', boxShadow: 'var(--ds-shadow-popover)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid var(--ds-stroke-emphasis)', paddingBottom: 16 }}>
          <div>
            <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 18, marginBottom: 10 }} />
            <div className="ds-heading-small">Credit Memo Summary</div>
            <div className="imp-small" style={{ margin: '4px 0 0' }}>
              Prepared for Implentio · {memo.id} · {memo.period} · {memo.version}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Statistic bare size="large" type="accent" label="Total variance" value={memo.netN == null ? '—' : fmtMoney(memo.netN)} />
          </div>
        </div>
        {detail.reportMonths.map((mo) => (
          <div key={mo.name} style={{ marginTop: 24 }}>
            <div className="db-eyebrow" style={{ marginBottom: 8 }}>
              {mo.name}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th className="num">Base freight</th>
                    <th className="num">Fuel</th>
                    <th className="num">Residential</th>
                    <th className="num">DAS</th>
                    <th className="num">Peak</th>
                    <th className="num">Invoiced</th>
                    <th className="num">Expected</th>
                    <th className="num">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {mo.rows.map((row) => (
                    <tr key={row.inv}>
                      <td style={{ fontWeight: 600 }}>{row.inv}</td>
                      <td className="num">{cell(row.base)}</td>
                      <td className="num">{cell(row.fuel)}</td>
                      <td className="num">{cell(row.res)}</td>
                      <td className="num">{cell(row.das)}</td>
                      <td className="num">{cell(row.peak)}</td>
                      <td className="num">{fmtMoney(row.invN)}</td>
                      <td className="num">{fmtMoney(row.expN)}</td>
                      <td className="num" style={row.varN > 0.005 ? { color: 'var(--ds-fg-accent)', fontWeight: 600 } : undefined}>
                        {posMoney(row.varN)}
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>{mo.name} total</td>
                    <td className="num">{cell(mo.totals.base)}</td>
                    <td className="num">{cell(mo.totals.fuel)}</td>
                    <td className="num">{cell(mo.totals.res)}</td>
                    <td className="num">{cell(mo.totals.das)}</td>
                    <td className="num">{cell(mo.totals.peak)}</td>
                    <td className="num">{fmtMoney(mo.totals.invN)}</td>
                    <td className="num">{fmtMoney(mo.totals.expN)}</td>
                    <td className="num neg">{posMoney(mo.totals.varN)}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>
        ))}
        <p className="ds-body-small" style={{ margin: '22px 0 0', color: 'var(--ds-fg-disabled)' }}>
          Amounts represent audited variance for the period. This summary is a report preview and does not constitute an approved or submitted credit.
        </p>
      </div>
    </Modal>
  )
}
