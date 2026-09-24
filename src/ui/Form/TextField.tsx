import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import styles from './Form.module.css'

export type Validation = 'invalid' | 'warning' | 'success'
export type FieldSize = 'small' | 'medium'

interface FieldChrome {
  label?: ReactNode
  /** Helper text under the control (Figma "caption"). */
  caption?: ReactNode
  validation?: Validation
  /** Validation message; replaces the caption while present. */
  message?: ReactNode
  size?: FieldSize
  optional?: boolean
}

const VALIDATION_CLASS: Record<Validation, string | undefined> = {
  invalid: styles.invalid,
  warning: styles.warning,
  success: styles.success,
}

const MESSAGE_CLASS: Record<Validation, string | undefined> = {
  invalid: styles.messageInvalid,
  warning: styles.messageWarning,
  success: styles.messageSuccess,
}

export function controlClass({ size = 'medium', validation, disabled }: { size?: FieldSize; validation?: Validation; disabled?: boolean }) {
  return [styles.control, size === 'small' ? styles.small : '', validation ? VALIDATION_CLASS[validation] : '', disabled ? styles.disabled : '']
    .filter(Boolean)
    .join(' ')
}

/** Label + control + caption/validation message, wired for assistive tech. */
export function FieldFrame({
  id,
  label,
  caption,
  validation,
  message,
  optional,
  disabled,
  className,
  children,
}: FieldChrome & { id: string; disabled?: boolean; className?: string; children: ReactNode }) {
  const note = message ?? caption
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={id} className={[styles.label, disabled ? styles.labelDisabled : ''].filter(Boolean).join(' ')}>
          {label}
          {optional && <span className={styles.optional}> (optional)</span>}
        </label>
      )}
      {children}
      {note && (
        <p id={`${id}-note`} className={[styles.message, message && validation ? MESSAGE_CLASS[validation] : ''].filter(Boolean).join(' ')}>
          {message && validation === 'success' && <CheckCircleIcon aria-hidden="true" />}
          {message && (validation === 'invalid' || validation === 'warning') && <ExclamationCircleIcon aria-hidden="true" />}
          <span>{note}</span>
        </p>
      )}
    </div>
  )
}

export interface TextFieldProps extends FieldChrome, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fieldClassName?: string
}

/** Figma ❖ Text Input. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, caption, validation, message, size, optional, iconLeft, iconRight, fieldClassName, id, disabled, className, ...rest },
  ref,
) {
  const auto = useId()
  const inputId = id ?? auto
  const note = message ?? caption
  return (
    <FieldFrame id={inputId} label={label} caption={caption} validation={validation} message={message} optional={optional} disabled={disabled} className={fieldClassName}>
      <div className={[controlClass({ size, validation, disabled }), className].filter(Boolean).join(' ')}>
        {iconLeft && <span className={styles.adornment}>{iconLeft}</span>}
        <input
          ref={ref}
          id={inputId}
          className={styles.input}
          disabled={disabled}
          aria-invalid={validation === 'invalid' || undefined}
          aria-describedby={note ? `${inputId}-note` : undefined}
          {...rest}
        />
        {iconRight && <span className={styles.adornment}>{iconRight}</span>}
      </div>
    </FieldFrame>
  )
})

export interface TextAreaProps extends FieldChrome, TextareaHTMLAttributes<HTMLTextAreaElement> {
  fieldClassName?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, caption, validation, message, size, optional, fieldClassName, id, disabled, className, ...rest },
  ref,
) {
  const auto = useId()
  const inputId = id ?? auto
  const note = message ?? caption
  return (
    <FieldFrame id={inputId} label={label} caption={caption} validation={validation} message={message} optional={optional} disabled={disabled} className={fieldClassName}>
      <div className={[controlClass({ size, validation, disabled }), styles.textarea, className].filter(Boolean).join(' ')}>
        <textarea
          ref={ref}
          id={inputId}
          className={styles.input}
          disabled={disabled}
          aria-invalid={validation === 'invalid' || undefined}
          aria-describedby={note ? `${inputId}-note` : undefined}
          {...rest}
        />
      </div>
    </FieldFrame>
  )
})
