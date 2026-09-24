import type { CSSProperties, ReactNode, TableHTMLAttributes, ThHTMLAttributes } from 'react'
import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useScrollEdges } from '../useScrollEdges'
import styles from './Table.module.css'

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Keep the header visible while the table's scroll container scrolls. */
  stickyHeader?: boolean
}

/**
 * Figma table primitives: 44px rows, muted regular column labels, hover
 * tint. Cells opt into `num` / `neg` / `pos` / `nowrap`; a summary row uses
 * `total-row`. Wrap a table that can outgrow its card in `TableScroll`.
 */
export function Table({ stickyHeader = false, className, ...rest }: TableProps) {
  return <table className={[styles.table, stickyHeader ? styles.sticky : '', className].filter(Boolean).join(' ')} {...rest} />
}

/**
 * Horizontal scroller for a wide table. A fade and hairline appear at
 * whichever inline edge hides columns, so off-screen columns have a cue.
 * `className` / `style` style the frame (e.g. a bordered surface).
 */
export function TableScroll({
  children,
  className,
  style,
  scrollStyle,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Styles the scroller itself, e.g. a max-height for a sticky-header table. */
  scrollStyle?: CSSProperties
}) {
  const [ref, edges] = useScrollEdges('x')
  return (
    <div
      className={[styles.scrollFrame, className].filter(Boolean).join(' ')}
      style={style}
      data-scroll-start={edges.start || undefined}
      data-scroll-end={edges.end || undefined}
    >
      <div ref={ref} className={styles.scroll} style={scrollStyle}>
        {children}
      </div>
    </div>
  )
}

export type SortDirection = 'asc' | 'desc' | null

/** One sort cycle for every table: none → ascending → descending → none. */
export function nextSort(dir: SortDirection): SortDirection {
  return dir === null ? 'asc' : dir === 'asc' ? 'desc' : null
}

export interface SortableHeaderProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'onChange'> {
  label: ReactNode
  direction: SortDirection
  onSort: () => void
}

/** Figma table-label: clickable column label with a sort indicator. */
export function SortableHeader({ label, direction, onSort, className, ...rest }: SortableHeaderProps) {
  const Icon = direction === 'asc' ? ChevronUpIcon : direction === 'desc' ? ChevronDownIcon : ChevronUpDownIcon
  return (
    <th aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'} className={className} {...rest}>
      <button type="button" className={[styles.sort, direction ? styles.sortActive : ''].filter(Boolean).join(' ')} onClick={onSort}>
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  )
}

/** Figma value-difference: negative (overpay) / positive (saving) / none. */
export function ValueDiff({ type, children }: { type: 'negative' | 'positive' | 'none'; children: ReactNode }) {
  return (
    <span className={[styles.diff, type === 'negative' ? styles.diffNegative : type === 'positive' ? styles.diffPositive : ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}

export function Truncate({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className={styles.truncate} title={title}>
      {children}
    </span>
  )
}
