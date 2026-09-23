/** Credit-memo report ("PDF Preview") modal — template ~7101–7156. */
import type { MemoDetail } from '@/domain/types'
import { fmtMoney, posMoney } from '@/domain/money'

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(16,15,65,0.5)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report preview"
        style={{ position: 'relative', width: 880, maxWidth: '100%', maxHeight: '88vh', background: 'var(--imp-gray-100)', border: '2px solid var(--imp-ink)', borderRadius: 16, boxShadow: 'var(--imp-shadow-lg)', display: 'flex', flexDirection: 'column', animation: 'imp-fade-in 0.2s ease' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1.5px solid var(--imp-gray-300)', background: '#fff', borderRadius: '14px 14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ia-pill" style={{ background: 'var(--imp-gray-200)', color: 'var(--imp-fg-muted)', borderColor: 'var(--imp-gray-300)' }}>
              PDF Preview
            </span>
            <strong style={{ font: '600 14px var(--imp-font-display)' }}>
              {memo.id} — Summary · {memo.version}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={onDownload}>
              Download Credit Memo
            </button>
            <button className="db-btn db-btn-secondary db-btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: 24 }}>
          <div style={{ background: '#fff', border: '1.5px solid var(--imp-gray-300)', borderRadius: 8, padding: '28px 32px', maxWidth: 800, margin: '0 auto', boxShadow: 'var(--imp-shadow-soft-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--imp-ink)', paddingBottom: 16 }}>
              <div>
                <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 18, marginBottom: 10 }} />
                <div style={{ font: '600 18px var(--imp-font-display)' }}>Credit Memo Summary</div>
                <div className="imp-small" style={{ margin: '4px 0 0' }}>
                  Prepared for Implentio · {memo.id} · {memo.period} · {memo.version}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="db-kpi-sub">Total variance</div>
                <div style={{ font: '600 30px var(--imp-font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--imp-orange-500)' }}>
                  {memo.netN == null ? '—' : fmtMoney(memo.netN)}
                </div>
              </div>
            </div>
            {detail.reportMonths.map((mo) => (
              <div key={mo.name} style={{ marginTop: 24 }}>
                <div className="db-eyebrow" style={{ marginBottom: 8 }}>
                  {mo.name}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="db-table db-table-compact" style={{ minWidth: 720 }}>
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
                          <td style={{ fontWeight: 700 }}>{row.inv}</td>
                          <td className="num">{cell(row.base)}</td>
                          <td className="num">{cell(row.fuel)}</td>
                          <td className="num">{cell(row.res)}</td>
                          <td className="num">{cell(row.das)}</td>
                          <td className="num">{cell(row.peak)}</td>
                          <td className="num">{fmtMoney(row.invN)}</td>
                          <td className="num">{fmtMoney(row.expN)}</td>
                          <td className="num" style={row.varN > 0.005 ? { color: 'var(--imp-orange-500)', fontWeight: 700 } : undefined}>
                            {posMoney(row.varN)}
                          </td>
                        </tr>
                      ))}
                      <tr className="db-total-row">
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
                  </table>
                </div>
              </div>
            ))}
            <p className="imp-small" style={{ margin: '22px 0 0', color: 'var(--imp-fg-subtle)' }}>
              Amounts represent audited variance for the period. This summary is a report preview and does not constitute an approved or submitted credit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
