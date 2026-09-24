import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import styles from './Tabs.module.css'

export interface TabDef<K extends string> {
  key: K
  label: string
  disabled?: boolean
}

/**
 * Figma ❖ Tab / tab-group (underline tabs). Tabs switch views or routes,
 * so the active one carries aria-current rather than tablist semantics.
 * Route tabs pass `linkTo` and render real links (new tab, copy link, and
 * screen readers announce them as links); view tabs pass `onSelect`.
 */
export function Tabs<K extends string>({
  tabs,
  active,
  onSelect,
  linkTo,
  ariaLabel,
}: {
  tabs: readonly TabDef<K>[]
  active: K
  onSelect?: (key: K) => void
  linkTo?: (key: K) => string
  ariaLabel?: string
}) {
  return (
    <nav className={styles.row} aria-label={ariaLabel}>
      {tabs.map((t) => {
        const className = [styles.tab, t.key === active ? styles.active : ''].filter(Boolean).join(' ')
        const current = t.key === active ? 'page' : undefined
        const label = <span className={styles.tabLabel}>{t.label}</span>
        return linkTo && !t.disabled ? (
          <RouterLink key={t.key} to={linkTo(t.key)} aria-current={current} className={className}>
            {label}
          </RouterLink>
        ) : (
          <button
            key={t.key}
            type="button"
            disabled={t.disabled}
            aria-current={current}
            className={className}
            onClick={() => onSelect?.(t.key)}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export type ActionTabType = 'neutral' | 'negative' | 'positive' | 'special'

export interface ActionTabProps {
  label: ReactNode
  /** Main stat (e.g. an amount); Figma shows "–" when there is nothing under the tab. */
  value: ReactNode
  /** Optional unit/caption after the value. */
  caption?: ReactNode
  counter?: ReactNode
  type?: ActionTabType
  active: boolean
  onClick: () => void
}

/** Figma actionTab: a button that applies a specific set of filters. */
export function ActionTab({ label, value, caption, counter, type = 'neutral', active, onClick }: ActionTabProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[styles.action, active ? styles.actionActive : '', styles[type]].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span className={styles.actionHead}>
        <span>{label}</span>
        {counter !== undefined && <span className={styles.counter}>{counter}</span>}
      </span>
      <span className={styles.stats}>
        <span className={styles.statValue}>{value}</span>
        {caption && <span>{caption}</span>}
      </span>
    </button>
  )
}

export function ActionTabs({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) {
  return (
    <div className={styles.actionGroup} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  )
}
