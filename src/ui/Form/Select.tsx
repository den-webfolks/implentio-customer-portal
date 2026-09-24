import { useId, type ReactNode } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { FieldFrame, controlClass, type FieldSize, type Validation } from './TextField'
import styles from './Form.module.css'

export interface SelectOption<V extends string = string> {
  value: V
  label: ReactNode
  disabled?: boolean
}

export interface SelectProps<V extends string> {
  value: V | undefined
  onValueChange: (value: V) => void
  options: readonly SelectOption<V>[]
  label?: ReactNode
  /** Accessible name when there is no visible label. */
  'aria-label'?: string
  placeholder?: string
  caption?: ReactNode
  validation?: Validation
  message?: ReactNode
  size?: FieldSize
  fullWidth?: boolean
  disabled?: boolean
  id?: string
  className?: string
  fieldClassName?: string
}

/** Figma ❖ Select: select trigger + select-menu (Radix Select underneath). */
export function Select<V extends string>({
  value,
  onValueChange,
  options,
  label,
  placeholder,
  caption,
  validation,
  message,
  size,
  fullWidth = false,
  disabled,
  id,
  className,
  fieldClassName,
  'aria-label': ariaLabel,
}: SelectProps<V>) {
  const auto = useId()
  const triggerId = id ?? auto
  const note = message ?? caption
  return (
    <FieldFrame id={triggerId} label={label} caption={caption} validation={validation} message={message} disabled={disabled} className={fieldClassName}>
      <RadixSelect.Root
        value={value}
        onValueChange={(v) => {
          const match = options.find((o) => o.value === v)
          if (match) onValueChange(match.value)
        }}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          id={triggerId}
          aria-label={ariaLabel}
          aria-invalid={validation === 'invalid' || undefined}
          aria-describedby={note ? `${triggerId}-note` : undefined}
          className={[controlClass({ size, validation, disabled }), styles.trigger, fullWidth ? styles.fullWidth : '', className].filter(Boolean).join(' ')}
        >
          <RadixSelect.Value placeholder={placeholder} className={styles.triggerValue} />
          <RadixSelect.Icon className={styles.chevron}>
            <ChevronDownIcon />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className={styles.menu} position="popper" sideOffset={4}>
            <RadixSelect.Viewport className={styles.viewport}>
              {options.map((o) => (
                <RadixSelect.Item key={o.value} value={o.value} disabled={o.disabled} className={styles.item}>
                  <span className={styles.itemCheck} aria-hidden="true">
                    <RadixSelect.ItemIndicator>
                      <CheckIcon />
                    </RadixSelect.ItemIndicator>
                  </span>
                  <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </FieldFrame>
  )
}
