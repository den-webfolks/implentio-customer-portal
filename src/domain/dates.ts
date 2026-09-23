/** Date formatting/derivation — pure functions; "now" is always a parameter
 *  (see lib/clock.ts for where it comes from). Ports the prototype's helpers. */

/** "September 20, 2026" from an ISO date. */
export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** "Sep 20, 2026" from a Date. */
export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Sep 20, 2026, 9:03 AM" from a Date (activity timestamps). */
export function fmtDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Excel serial date (epoch 1899-12-30) → "Apr 12, 2026".
 * The prototype's package records carry label dates in this form because the
 * audit data originates from spreadsheets. Non-numeric input passes through.
 */
export function excelDate(v: string | number | null | undefined): string {
  const n = typeof v === 'number' ? v : parseFloat(v ?? '')
  if (isNaN(n)) return typeof v === 'string' && v !== '' ? v : '—'
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000)
  return d.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Whole days from `now` until end-of-day on `deadline` (ISO date). */
export function daysUntilDeadline(deadline: string, now: Date): number {
  return Math.ceil((new Date(deadline + 'T23:59:59').getTime() - now.getTime()) / 86400000)
}

/** "Due today" / "1 day remaining" / "N days remaining". */
export function deadlineCountdown(deadline: string, now: Date): string {
  const days = daysUntilDeadline(deadline, now)
  if (days <= 0) return 'Due today'
  return days === 1 ? '1 day remaining' : `${days} days remaining`
}
