import type { ReactNode } from 'react'
import styles from './Chip.module.css'

/** Figma status/* colour pairs; `muted` is Figma's status=none. */
export type StatusTone = 'neutral' | 'success' | 'attention' | 'danger' | 'info' | 'muted'

export interface StatusChipProps {
  tone: StatusTone
  children: ReactNode
  /** 12px Heroicon, coloured with the tone. */
  icon?: ReactNode
  /** Figma filled?=false: coloured text without the tinted fill. */
  textOnly?: boolean
  title?: string
}

/** Figma ❖ Chips / status-chip. */
export function StatusChip({ tone, children, icon, textOnly = false, title }: StatusChipProps) {
  return (
    <span className={[styles.status, styles[tone], textOnly ? styles.textOnly : ''].filter(Boolean).join(' ')} title={title}>
      {icon}
      <span className={styles.label}>{children}</span>
    </span>
  )
}

/** Figma ❖ Chips / tag-chip (no-action variant). */
export function Tag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}
