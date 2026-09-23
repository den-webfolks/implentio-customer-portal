/** Money formatting — ports the prototype's fmt/posMoney/r2 exactly. */

/** Round to cents. */
export function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** "$1,234.56", negatives as "-$1,234.56". */
export function fmtMoney(n: number): string {
  const neg = n < 0
  const s =
    '$' +
    Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return neg ? '-' + s : s
}

/** Absolute-value money, used where the sign is carried by surrounding copy. */
export function posMoney(n: number | null | undefined): string {
  return (
    '$' +
    Math.abs(n ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}
