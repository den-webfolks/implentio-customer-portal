/** Underline tab row (tracker/report screens; template ~1212, style 14525). */
import styles from './Tabs.module.css'

export interface TabDef<K extends string> {
  key: K
  label: string
}

export function UnderlineTabs<K extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly TabDef<K>[]
  active: K
  onSelect: (key: K) => void
}) {
  return (
    <div className={styles.underlineRow}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={t.key === active ? styles.underlineTabOn : styles.underlineTab}
          onClick={() => onSelect(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Section nav tabs (memo detail / BI; proto class ia-secnav). */
export function SecNav<K extends string>({
  tabs,
  active,
  onSelect,
  ariaLabel,
}: {
  tabs: readonly TabDef<K>[]
  active: K
  onSelect: (key: K) => void
  ariaLabel?: string
}) {
  return (
    <div className="ia-secnav" role="navigation" aria-label={ariaLabel}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          className={t.key === active ? 'on' : ''}
          onClick={() => onSelect(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
