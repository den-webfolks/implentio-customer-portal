/** One package's charges: Charge · Billed · Your contract · Difference.
 *  "Show why" and the package list's row detail use the same table, so a
 *  package always reads the same way (plan 02 `chargeTable`). Below 460px of
 *  its own width each charge becomes two lines. */
import { Fragment, type ReactNode } from 'react'
import type { PackageRecord } from '@/domain/types'
import { fmtMoney, r2 } from '@/domain/money'
import { packageCharges, type ChargeRow } from '@/domain/evidence'
import styles from './Evidence.module.css'

export const signedMoney = (n: number) =>
  Math.abs(n) < 0.005 ? '$0.00' : `${n > 0 ? '+' : '−'}${fmtMoney(Math.abs(n))}`

const diffClass = (d: number) => (d > 0.004 ? styles.diff : d < -0.004 ? styles.fav : undefined)

export function ChargeTable({
  pkg: p,
  caption,
  name = (c) => c.name,
  after,
}: {
  pkg: PackageRecord
  caption: string
  /** The charge cell, e.g. a button that explains the charge. */
  name?: (c: ChargeRow) => ReactNode
  /** A full-width row under a charge (its explanation). */
  after?: (c: ChargeRow) => ReactNode
}) {
  const total = r2(p.ti - p.te)
  return (
    <table className={`${styles.tbl} ${styles.pkgTable}`}>
      <caption className={styles.vh}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Charge</th>
          <th scope="col" className={styles.num}>
            Billed
          </th>
          <th scope="col" className={styles.num}>
            Your contract
          </th>
          <th scope="col" className={styles.num}>
            Difference
          </th>
        </tr>
      </thead>
      <tbody>
        {packageCharges(p).map((c) => {
          const extra = after?.(c)
          return (
            <Fragment key={c.field}>
              <tr>
                <td>{name(c)}</td>
                <td className={styles.num} data-label="Billed">
                  {fmtMoney(c.billed)}
                </td>
                <td className={styles.num} data-label="Contract">
                  {fmtMoney(c.contract)}
                </td>
                <td className={`${styles.num} ${diffClass(c.diff) ?? ''}`}>
                  {signedMoney(c.diff)}
                  {c.diff < -0.004 && <span className={styles.vh}> (below contract)</span>}
                </td>
              </tr>
              {extra && (
                <tr className={styles.explainRow}>
                  <td colSpan={4}>{extra}</td>
                </tr>
              )}
            </Fragment>
          )
        })}
        <tr className={styles.total}>
          <td>This package</td>
          <td className={styles.num} data-label="Billed">
            {fmtMoney(p.ti)}
          </td>
          <td className={styles.num} data-label="Contract">
            {fmtMoney(p.te)}
          </td>
          <td className={`${styles.num} ${diffClass(total) ?? ''}`}>{signedMoney(total)}</td>
        </tr>
      </tbody>
    </table>
  )
}
