/**
 * One status → design-system tone mapping for every screen (resolves the
 * prototype's per-screen colours; agreed in DESIGN-SYSTEM.md):
 * eligible = neutral, awaiting = info, partial = attention,
 * collected = success, declined / not issued = danger,
 * superseded / expired / historical / not pursued = muted.
 */
import type { StatusTone } from '@/ui/Chip/StatusChip'
import type { CollectionStatus } from '@/domain/types'
import type { GroupStatusKey } from '@/domain/outcomes'

export const COLLECTION_TONE: Record<CollectionStatus, StatusTone> = {
  awaiting: 'info',
  partial: 'attention',
  full: 'success',
  not_issued: 'danger',
}

export const GROUP_STATUS_TONE: Record<GroupStatusKey, StatusTone> = {
  eligible: 'neutral',
  awaiting_outcome: 'info',
  partly_collected: 'attention',
  fully_collected: 'success',
  declined: 'danger',
  not_pursued: 'muted',
}

/** Solid colour per tone for charts (donut slices, legend swatches). */
export const TONE_CHART_COLOR: Record<StatusTone, string> = {
  neutral: 'var(--ds-purple-500)',
  info: 'var(--ds-blue-500)',
  attention: 'var(--ds-yellow-500)',
  success: 'var(--ds-green-500)',
  danger: 'var(--ds-red-500)',
  muted: 'var(--ds-neutral-500)',
}

/** Foreground / tinted background pair for tone-coloured surfaces. */
export function toneColors(tone: StatusTone): { fg: string; bg: string } {
  return { fg: `var(--ds-status-${tone}-fg)`, bg: `var(--ds-status-${tone}-bg)` }
}
