import { Fragment, type ReactNode } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import styles from './Display.module.css'

/* ---------- Stepper ---------- */

export interface StepperProps {
  steps: readonly string[]
  /** Index of the active step; earlier steps render as passed. */
  current: number
  /** Drop the bordered container (when embedded in another surface). */
  bare?: boolean
  ariaLabel?: string
}

/** Figma ❖ Stepper — "Step isn't clickable, it is simple indicator". */
export function Stepper({ steps, current, bare = false, ariaLabel = 'Progress' }: StepperProps) {
  return (
    <ol className={[styles.stepper, bare ? styles.stepperBare : ''].filter(Boolean).join(' ')} aria-label={ariaLabel}>
      {steps.map((label, i) => {
        const state = i < current ? 'passed' : i === current ? 'active' : 'default'
        return (
          <li key={label} className={styles.stepItem}>
            <span
              className={[styles.step, state === 'active' ? styles.stepActive : '', state === 'passed' ? styles.stepPassed : ''].filter(Boolean).join(' ')}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span className={styles.stage} aria-hidden="true">
                {state === 'passed' ? <CheckIcon /> : i + 1}
              </span>
              {label}
              {state === 'passed' && <span className="visually-hidden"> (completed)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Avatar ---------- */

export type AvatarSize = 'small' | 'large' | 'huge'

const AVATAR_SIZE: Record<AvatarSize, string | undefined> = { small: styles.avatarSmall, large: styles.avatarLarge, huge: styles.avatarHuge }

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Figma ❖ Avatar — falls back to initials on the muted background. */
export function Avatar({ name, src, size = 'large' }: { name: string; src?: string; size?: AvatarSize }) {
  return (
    <span className={`${styles.avatar} ${AVATAR_SIZE[size]}`} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initialsOf(name)}
    </span>
  )
}

/* ---------- Statistic ---------- */

export type StatisticType = 'neutral' | 'positive' | 'negative' | 'accent'
export type StatisticSize = 'tiny' | 'small' | 'medium' | 'large'

const STAT_TYPE: Record<StatisticType, string | undefined> = {
  neutral: '',
  positive: styles.statPositive,
  negative: styles.statNegative,
  accent: styles.statAccent,
}

const STAT_SIZE: Record<StatisticSize, string | undefined> = { tiny: styles.statTiny, small: styles.statSmall, medium: '', large: styles.statLarge }

export interface StatisticProps {
  label: ReactNode
  value: ReactNode
  /** Figma: default / negative (errors, overpay) / positive (savings). */
  type?: StatisticType
  /** Figma notes the number size can shrink per page. */
  size?: StatisticSize
  sub?: ReactNode
  /** Drop inner padding when used outside a StatisticGroup. */
  bare?: boolean
  className?: string
}

/** Figma ❖ Stat Summary — statistic.text-group. */
export function Statistic({ label, value, type = 'neutral', size = 'medium', sub, bare = false, className }: StatisticProps) {
  return (
    <div className={[styles.stat, STAT_TYPE[type], STAT_SIZE[size], bare ? styles.statBare : '', className].filter(Boolean).join(' ')}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

/** Figma ❖ Stat Summary — statistic: bordered row of text groups with dividers. */
export function StatisticGroup({ items }: { items: readonly StatisticProps[] }) {
  return (
    <div className={styles.statGroup}>
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={styles.statDivider} aria-hidden="true" />}
          <Statistic {...item} />
        </Fragment>
      ))}
    </div>
  )
}

/* ---------- Empty state ---------- */

/** Figma ❖ Tables — empty-state (with-filters / without). */
export function EmptyState({ title, subtitle, action, media, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; media?: ReactNode; className?: string }) {
  return (
    <div className={[styles.empty, className].filter(Boolean).join(' ')}>
      {media}
      <div className={styles.emptyText}>
        <h3 className={styles.emptyTitle}>{title}</h3>
        {subtitle && <p className={styles.emptySubtitle}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------- Spinner ---------- */

export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size, borderWidth: size >= 32 ? 4 : 2 }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
