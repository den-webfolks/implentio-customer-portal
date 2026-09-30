/**
 * Segmented switch: two or three views of the same content (Chart / Table,
 * Typical / Largest). A group of toggle buttons; the pressed one is raised on
 * a tinted track. No Figma component yet (Figma "Toggle" is unbuilt) — drawn
 * from prototype-planning/02 and flagged in DESIGN-SYSTEM.md.
 */
import styles from './Segmented.module.css'

export interface SegmentedOption<V extends string> {
  value: V
  label: string
}

export function Segmented<V extends string>({
  label,
  value,
  onValueChange,
  options,
  size = 'medium',
  className,
}: {
  /** What the switch chooses, for screen readers ("Show the breakdown as"). */
  label: string
  value: V
  onValueChange: (v: V) => void
  options: readonly SegmentedOption<V>[]
  size?: 'small' | 'medium'
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={[styles.track, size === 'small' ? styles.small : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={styles.item}
          aria-pressed={o.value === value}
          onClick={() => onValueChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
