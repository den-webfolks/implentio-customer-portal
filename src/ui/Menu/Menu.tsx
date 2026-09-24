import type { ReactElement, ReactNode } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckIcon } from '@heroicons/react/24/outline'
import styles from './Menu.module.css'

export interface MenuProps {
  /** A single button element that opens the menu. */
  trigger: ReactElement
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** Figma action-list: a menu of actions or options (Radix DropdownMenu).
 *  The menu takes its accessible name from the trigger. */
export function Menu({ trigger, children, align = 'start', side = 'bottom', open, onOpenChange, className }: MenuProps) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={4}
          collisionPadding={8}
          className={[styles.menu, className].filter(Boolean).join(' ')}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function MenuItem({
  children,
  onSelect,
  icon,
  danger = false,
  disabled = false,
}: {
  children: ReactNode
  onSelect: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <DropdownMenu.Item className={[styles.item, danger ? styles.danger : ''].filter(Boolean).join(' ')} onSelect={onSelect} disabled={disabled}>
      {icon}
      {children}
    </DropdownMenu.Item>
  )
}

/** Multi-select option; keeps the menu open so several can be toggled. */
export function MenuCheckboxItem({ children, checked, onCheckedChange, disabled = false }: { children: ReactNode; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <DropdownMenu.CheckboxItem
      className={styles.item}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      onSelect={(e) => e.preventDefault()}
    >
      <span className={styles.indicator} aria-hidden="true">
        <DropdownMenu.ItemIndicator>
          <CheckIcon />
        </DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.CheckboxItem>
  )
}

export function MenuRadioGroup<V extends string>({ value, onValueChange, options }: { value: V; onValueChange: (value: V) => void; options: readonly { value: V; label: ReactNode; icon?: ReactNode }[] }) {
  return (
    <DropdownMenu.RadioGroup
      value={value}
      onValueChange={(v) => {
        const match = options.find((o) => o.value === v)
        if (match) onValueChange(match.value)
      }}
    >
      {options.map((o) => (
        <DropdownMenu.RadioItem key={o.value} value={o.value} className={styles.item}>
          <span className={`${styles.indicator} ${styles.radioIndicator}`} aria-hidden="true">
            <DropdownMenu.ItemIndicator>
              <span className={styles.dot} />
            </DropdownMenu.ItemIndicator>
          </span>
          {o.icon}
          {o.label}
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className={styles.label}>{children}</DropdownMenu.Label>
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className={styles.separator} />
}
