/**
 * Filter button + staged filter panel — the prototype's ia-fp pattern
 * (template ~1266–1304), reused across tracker/invoices/outcomes/memo
 * screens. Edits are staged in the panel and only committed on Apply;
 * the panel becomes a bottom sheet under 640px (proto.css .ia-fp-panel).
 */
import { useEffect, useRef, useState } from 'react'
import styles from './FilterPanel.module.css'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterFieldDef {
  key: string
  label: string
  /** Label of the "all" option, e.g. "All periods". */
  allLabel: string
  options: FilterOption[]
}

export type FilterValues = Record<string, string>

export function activeFilterCount(values: FilterValues): number {
  return Object.values(values).filter((v) => v !== 'all').length
}

export function FilterPanel({
  fields,
  values,
  onApply,
}: {
  fields: FilterFieldDef[]
  values: FilterValues
  onApply: (values: FilterValues) => void
}) {
  const [open, setOpen] = useState(false)
  const [staged, setStaged] = useState<FilterValues>(values)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const activeCount = activeFilterCount(values)
  const dirty = fields.some((f) => (staged[f.key] ?? 'all') !== (values[f.key] ?? 'all'))

  const openPanel = () => {
    setStaged(values)
    setOpen(true)
  }

  const close = (returnFocus = true) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrapRef} className={styles.wrap}>
      <button
        ref={btnRef}
        type="button"
        className="db-btn db-btn-secondary db-btn-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
      >
        <img src="/brand/filter.svg" alt="" style={{ width: 15, height: 15, flex: 'none' }} />
        Filters
        {activeCount > 0 && <span className={styles.countBadge}>{activeCount}</span>}
      </button>
      {open && (
        <div className="ia-fp-panel" role="dialog" aria-label="Filters">
          <div className={styles.head}>
            <span className={styles.headTitle}>Filters</span>
            <button
              type="button"
              className="db-icon-btn"
              aria-label="Close filters"
              onClick={() => close()}
            >
              ✕
            </button>
          </div>
          <div className={styles.body}>
            {fields.map((f) => (
              <label key={f.key} className={styles.field}>
                <span className={styles.fieldLabel}>{f.label}</span>
                <select
                  className="ia-input"
                  style={{ padding: '8px 10px', width: '100%' }}
                  value={staged[f.key] ?? 'all'}
                  onChange={(e) => setStaged((s) => ({ ...s, [f.key]: e.target.value }))}
                >
                  <option value="all">{f.allLabel}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className={styles.foot}>
            <button
              type="button"
              className="db-btn db-btn-secondary db-btn-sm"
              onClick={() => setStaged(Object.fromEntries(fields.map((f) => [f.key, 'all'])))}
            >
              Clear all
            </button>
            <button
              type="button"
              className="db-btn db-btn-primary db-btn-sm"
              disabled={!dirty}
              style={dirty ? undefined : { opacity: 0.4, cursor: 'not-allowed', boxShadow: 'none' }}
              onClick={() => {
                onApply(staged)
                close()
              }}
            >
              Apply filters
            </button>
          </div>
        </div>
      )}
    </span>
  )
}

/** Applied-filter chips row (template ~1298–1304). */
export function FilterChips({
  fields,
  values,
  onClear,
}: {
  fields: FilterFieldDef[]
  values: FilterValues
  onClear: (key: string) => void
}) {
  const chips = fields
    .filter((f) => (values[f.key] ?? 'all') !== 'all')
    .map((f) => ({
      key: f.key,
      label: `${f.label}: ${f.options.find((o) => o.value === values[f.key])?.label ?? values[f.key]}`,
    }))
  if (chips.length === 0) return null
  return (
    <div className={styles.chips}>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className="ia-chip"
          aria-label="Remove filter"
          onClick={() => onClear(c.key)}
        >
          {c.label}
          <span aria-hidden="true" style={{ fontSize: 11, opacity: 0.7 }}>
            ✕
          </span>
        </button>
      ))}
    </div>
  )
}
