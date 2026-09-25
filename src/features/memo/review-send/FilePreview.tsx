/** A look at one attachment from step 2: the first rows in four plain
 *  columns. There is nothing to download here — looking isn't sending, and
 *  downloads belong to the last step (simplicity review S5). */
import { fmtMoney, posMoney } from '@/domain/money'
import { Modal } from '@/ui/Modal/Modal'
import { Button } from '@/ui/Button/Button'
import { Table, TableScroll } from '@/ui/Table/Table'
import type { AttachmentSpec } from './email'

const PREVIEW_ROWS = 12

export function FilePreview({ file, onClose }: { file: AttachmentSpec; onClose: () => void }) {
  const rows = file.rows ?? []
  const shown = rows.slice(0, PREVIEW_ROWS)
  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      title={file.name}
      description={file.description}
      footer={
        <Button variant="primary" size="small" onClick={onClose}>
          Close
        </Button>
      }
    >
      {file.rows ? (
        <>
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th className="num">Billed</th>
                  <th className="num">Contract</th>
                  <th className="num">Difference</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.tracking}|${r.invoice}`}>
                    <td className="nowrap" style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>
                      {r.tracking}
                    </td>
                    <td className="num">{fmtMoney(r.billedN)}</td>
                    <td className="num">{fmtMoney(r.contractN)}</td>
                    <td className="num" style={{ color: 'var(--ds-fg-accent-text)', fontWeight: 600 }}>
                      {posMoney(r.differenceN)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
          {rows.length > shown.length && (
            <p className="imp-small" style={{ margin: 0 }}>
              … {(rows.length - shown.length).toLocaleString('en-US')} more in the file
            </p>
          )}
        </>
      ) : (
        <p className="ds-body-base" style={{ margin: 0 }}>
          {file.kind === 'summary'
            ? 'One page that lists each item, its amount and its file, so the approver can see the request without opening a spreadsheet.'
            : 'Every invoice and package Implentio audited for this credit memo, in one workbook.'}
        </p>
      )}
    </Modal>
  )
}
