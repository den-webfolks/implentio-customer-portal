import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './Button.module.css'

/**
 * Figma ❖ Button. "Emphasis" is Figma's secondary+emphasis (secondary action
 * in brand colour); danger / success / attention are secondary variations.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'emphasis' | 'danger' | 'success' | 'attention'
export type ButtonSize = 'small' | 'medium'

interface ButtonStyleOptions {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

/** Class list for elements that must render as a link but look like a button. */
export function buttonClass({ variant = 'secondary', size = 'medium', fullWidth = false }: ButtonStyleOptions = {}) {
  return [styles.button, styles[variant], size === 'small' ? styles.small : '', fullWidth ? styles.fullWidth : '']
    .filter(Boolean)
    .join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  iconLeft?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, iconLeft, iconRight, loading = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[buttonClass({ variant, size, fullWidth }), className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : iconLeft && <span className={styles.icon}>{iconLeft}</span>}
      {children}
      {iconRight && <span className={styles.icon}>{iconRight}</span>}
    </button>
  )
})

export type IconButtonSize = 'tiny' | 'small' | 'medium' | 'large'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode
  'aria-label': string
  size?: IconButtonSize
  /** Bare icon without border/background (close buttons, disclosure toggles). */
  ghost?: boolean
}

const ICON_SIZE_CLASS: Record<IconButtonSize, string | undefined> = {
  tiny: styles.tiny,
  small: styles.iconSmall,
  medium: '',
  large: styles.large,
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, size = 'medium', ghost = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[styles.iconButton, ICON_SIZE_CLASS[size], ghost ? styles.ghost : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  )
})
