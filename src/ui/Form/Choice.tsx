import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Form.module.css'

interface ChoiceChrome {
  label?: ReactNode
  description?: ReactNode
  /** Figma "border-box" / withOutline: the choice sits in a bordered box. */
  bordered?: boolean
  /** Stretch to the container width; the label area fills the remaining space. */
  fullWidth?: boolean
  className?: string
}

export interface CheckboxProps extends ChoiceChrome, Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'className'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** Figma ❖ Checkbox / checkbox-group — a styled native checkbox. */
export function Checkbox({ label, description, bordered = false, fullWidth = false, className, checked, onCheckedChange, disabled, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.choice, bordered ? styles.bordered : '', fullWidth ? styles.choiceFull : '', disabled ? styles.choiceDisabled : '', className].filter(Boolean).join(' ')}>
      <span className={styles.boxWrap}>
        <input type="checkbox" className={styles.box} checked={checked} disabled={disabled} onChange={(e) => onCheckedChange(e.target.checked)} {...rest} />
      </span>
      {(label || description) && (
        <span className={styles.choiceText}>
          {label}
          {description && <span className={styles.choiceDescription}>{description}</span>}
        </span>
      )}
    </label>
  )
}

export interface RadioOption<V extends string> {
  value: V
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export interface RadioGroupProps<V extends string> {
  options: readonly RadioOption<V>[]
  value: V | null
  onValueChange: (value: V) => void
  /** Visible group label; otherwise pass aria-label. */
  legend?: ReactNode
  'aria-label'?: string
  bordered?: boolean
  direction?: 'column' | 'row'
  name?: string
  className?: string
  optionClassName?: string
}

/** Figma ❖ Radio — a native radio group (arrow keys, single tab stop). */
export function RadioGroup<V extends string>({
  options,
  value,
  onValueChange,
  legend,
  bordered = false,
  direction = 'column',
  name,
  className,
  optionClassName,
  'aria-label': ariaLabel,
}: RadioGroupProps<V>) {
  const auto = useId()
  const groupName = name ?? auto
  return (
    <fieldset
      className={[styles.radioGroup, direction === 'row' ? styles.radioGroupRow : '', className].filter(Boolean).join(' ')}
      aria-label={legend ? undefined : ariaLabel}
    >
      {legend && <legend className={styles.label}>{legend}</legend>}
      {options.map((o) => (
        <label
          key={o.value}
          className={[styles.choice, bordered ? styles.bordered : '', o.disabled ? styles.choiceDisabled : '', optionClassName].filter(Boolean).join(' ')}
        >
          <span className={styles.boxWrap}>
            <input
              type="radio"
              className={`${styles.box} ${styles.radio}`}
              name={groupName}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onValueChange(o.value)}
            />
          </span>
          <span className={styles.choiceText}>
            {o.label}
            {o.description && <span className={styles.choiceDescription}>{o.description}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}
