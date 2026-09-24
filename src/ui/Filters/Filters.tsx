/**
 * Figma filter system: a "Filter" button opens a list of filter types;
 * choosing one expands the filter-group bar, where each filter is a chip
 * with a multi-select value list. The group stays open until the button is
 * clicked again; collapsed, the button shows "Filter: N active".
 * Selections apply immediately.
 */
import { useState } from 'react'
import { ChevronDownIcon, FunnelIcon, PlusSmallIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from '../Button/Button'
import { Link } from '../Link/Link'
import { Menu, MenuCheckboxItem, MenuItem } from '../Menu/Menu'
import styles from './Filters.module.css'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterField {
  key: string
  label: string
  options: readonly FilterOption[]
}

/** Selected values per field key; an empty or missing list means "all". */
export type FilterValues = Record<string, readonly string[]>

export function activeFilterCount(values: FilterValues): number {
  return Object.values(values).filter((v) => v.length > 0).length
}

/** True when `candidate` passes the filter for `key` (no selection = pass). */
export function matchesFilter(values: FilterValues, key: string, candidate: string): boolean {
  const selected = values[key]
  return !selected || selected.length === 0 || selected.includes(candidate)
}

export interface FiltersController {
  fields: readonly FilterField[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  expanded: boolean
  setExpanded: (open: boolean) => void
  /** Fields shown as chips (selected values or just added). */
  shown: readonly string[]
  addField: (key: string) => void
  removeField: (key: string) => void
  openKey: string | null
  setOpenKey: (key: string | null) => void
  clear: () => void
}

export function useFilters(fields: readonly FilterField[], values: FilterValues, onChange: (values: FilterValues) => void): FiltersController {
  const [expanded, setExpanded] = useState(false)
  const [added, setAdded] = useState<readonly string[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const shown = fields.map((f) => f.key).filter((k) => (values[k]?.length ?? 0) > 0 || added.includes(k))
  return {
    fields,
    values,
    onChange,
    expanded,
    setExpanded,
    shown,
    addField: (key) => {
      setAdded((a) => (a.includes(key) ? a : [...a, key]))
      setExpanded(true)
      setOpenKey(key)
    },
    removeField: (key) => {
      setAdded((a) => a.filter((k) => k !== key))
      onChange({ ...values, [key]: [] })
    },
    openKey,
    setOpenKey,
    clear: () => {
      setAdded([])
      onChange(Object.fromEntries(fields.map((f) => [f.key, []])))
    },
  }
}

/** Toolbar button: opens the filter-type list, or toggles the group bar. */
export function FilterButton({ filters }: { filters: FiltersController }) {
  const count = activeFilterCount(filters.values)
  const hasChips = filters.shown.length > 0
  const label = (
    <>
      Filter{!filters.expanded && count > 0 && <>: <span className={styles.count}>{count} active</span></>}
    </>
  )
  if (hasChips || filters.expanded) {
    return (
      <Button
        size="small"
        iconLeft={<FunnelIcon aria-hidden="true" />}
        aria-expanded={filters.expanded}
        className={filters.expanded ? styles.triggerOpen : undefined}
        onClick={() => filters.setExpanded(!filters.expanded)}
      >
        {label}
      </Button>
    )
  }
  return (
    <Menu
      trigger={
        <Button size="small" iconLeft={<FunnelIcon aria-hidden="true" />} className={styles.trigger}>
          {label}
        </Button>
      }
    >
      {filters.fields.map((f) => (
        <MenuItem key={f.key} onSelect={() => filters.addField(f.key)}>
          {f.label}
        </MenuItem>
      ))}
    </Menu>
  )
}

function summarize(field: FilterField, selected: readonly string[]): string {
  const labels = selected.map((v) => field.options.find((o) => o.value === v)?.label ?? v)
  const head = labels.slice(0, 2).join(', ')
  return labels.length > 2 ? `${head} +${labels.length - 2}` : head
}

/** The filter-group bar; renders nothing while collapsed. */
export function FilterGroup({ filters }: { filters: FiltersController }) {
  const { fields, values, onChange, expanded, shown, addField, removeField, openKey, setOpenKey, clear } = filters
  if (!expanded) return null
  const remaining = fields.filter((f) => !shown.includes(f.key))

  const setField = (key: string, next: readonly string[]) => onChange({ ...values, [key]: next })

  return (
    <div className={styles.group} role="group" aria-label="Active filters">
      {shown.map((key) => {
        const field = fields.find((f) => f.key === key)
        if (!field) return null
        const selected = values[key] ?? []
        const summary = summarize(field, selected)
        return (
          <span key={key} className={styles.chip}>
            <Menu
              open={openKey === key}
              onOpenChange={(o) => setOpenKey(o ? key : null)}
              trigger={
                <button type="button" className={styles.chipMain} aria-label={`${field.label} filter${summary ? `: ${summary}` : ''}`}>
                  <span className={styles.chipLabel}>{field.label}:</span>
                  {summary ? <span className={styles.chipValue}>{summary}</span> : <ChevronDownIcon aria-hidden="true" />}
                </button>
              }
            >
              {field.options.map((o) => (
                <MenuCheckboxItem
                  key={o.value}
                  checked={selected.includes(o.value)}
                  onCheckedChange={(on) => setField(key, on ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
                >
                  {o.label}
                </MenuCheckboxItem>
              ))}
            </Menu>
            <button type="button" className={styles.remove} aria-label={`Remove ${field.label} filter`} onClick={() => removeField(key)}>
              <XMarkIcon aria-hidden="true" />
            </button>
          </span>
        )
      })}
      {remaining.length > 0 && (
        <Menu
          trigger={
            <button type="button" className={styles.add}>
              Add filter
              <PlusSmallIcon aria-hidden="true" />
            </button>
          }
        >
          {remaining.map((f) => (
            <MenuItem key={f.key} onSelect={() => addField(f.key)}>
              {f.label}
            </MenuItem>
          ))}
        </Menu>
      )}
      {shown.length > 0 && (
        <Link
          variant="accent"
          size="small"
          className={styles.clear}
          iconRight={<XMarkIcon aria-hidden="true" />}
          onClick={clear}
        >
          Clear all
        </Link>
      )}
    </div>
  )
}
