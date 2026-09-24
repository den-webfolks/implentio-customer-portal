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

/** Local calendar date as ISO "2026-09-17". */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

const DAY_MS = 86400000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Calendar days from today to `deadline` (ISO date): 0 on the deadline day,
 *  negative once it has passed. */
export function daysUntilDeadline(deadline: string, now: Date): number {
  return Math.round((new Date(deadline + 'T00:00:00').getTime() - startOfDay(now).getTime()) / DAY_MS)
}

/** Calendar days from `since` to today (0 on the same day). */
export function daysSince(since: Date, now: Date): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(since).getTime()) / DAY_MS)
}

/** "Due today" / "1 day remaining" / "N days remaining" from calendar days left. */
export function countdownText(daysLeft: number): string {
  if (daysLeft <= 0) return 'Due today'
  return daysLeft === 1 ? '1 day remaining' : `${daysLeft} days remaining`
}

/** Countdown for an open deadline (ISO date). */
export function deadlineCountdown(deadline: string, now: Date): string {
  return countdownText(daysUntilDeadline(deadline, now))
}
