import type { ReactNode } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { IconButton } from '../Button/Button'
import styles from './Banner.module.css'

export type BannerType = 'info' | 'success' | 'warning' | 'error'

const ICONS: Record<BannerType, ReactNode> = {
  info: <InformationCircleIcon aria-hidden="true" />,
  success: <CheckCircleIcon aria-hidden="true" />,
  warning: <ExclamationTriangleIcon aria-hidden="true" />,
  error: <XCircleIcon aria-hidden="true" />,
}

export interface BannerProps {
  type: BannerType
  title: ReactNode
  /** Optional description shown under the tinted header. */
  children?: ReactNode
  actions?: ReactNode
  onDismiss?: () => void
  /** Replace the default type icon (e.g. a domain-specific glyph). */
  icon?: ReactNode
  className?: string
}

/** Figma ❖ banner — inline notice for info / success / warning / error. */
export function Banner({ type, title, children, actions, onDismiss, icon, className }: BannerProps) {
  return (
    <div className={[styles.banner, styles[type], className].filter(Boolean).join(' ')}>
      <div className={[styles.header, onDismiss ? styles.dismissible : ''].filter(Boolean).join(' ')}>
        <span className={styles.icon}>{icon ?? ICONS[type]}</span>
        <div className={styles.title}>{title}</div>
        {onDismiss && (
          <IconButton className={styles.close} ghost size="tiny" aria-label="Dismiss" icon={<XMarkIcon aria-hidden="true" />} onClick={onDismiss} />
        )}
      </div>
      {children && <div className={styles.body}>{children}</div>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  )
}
