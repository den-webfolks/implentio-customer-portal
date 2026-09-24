/**
 * Figma ❖ Popup on Radix Dialog (focus trap, aria wiring, Escape, focus
 * return). Figma guidance: at most 2 stacked modals; content scrolls when it
 * exceeds the size's max height.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { IconButton } from '../Button/Button'
import { useScrollEdges } from '../useScrollEdges'
import styles from './Modal.module.css'

export type ModalSize = 'medium' | 'large'

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible title, rendered in the header row. */
  title: ReactNode
  description?: ReactNode
  size?: ModalSize
  /** Narrower fixed width (px) for small confirm-style dialogs. */
  width?: number
  children: ReactNode
  /** Primary actions, right-aligned (Figma button-group end). */
  footer?: ReactNode
  /** Secondary actions pinned left (Figma: Cancel / Back). */
  footerStart?: ReactNode
  /** Escape / overlay / close button are ignored while true. */
  dismissDisabled?: boolean
}

export function Modal({ open, onClose, title, description, size = 'medium', width, children, footer, footerStart, dismissDisabled = false }: ModalProps) {
  // Controlled dialogs have no Radix Trigger, so remember the opener and
  // return focus to it on close.
  const openerRef = useRef<HTMLElement | null>(null)
  const [bodyRef, edges] = useScrollEdges('y')
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement
    }
  }, [open])
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !dismissDisabled && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <div className={styles.positioner}>
          <Dialog.Content
            className={[styles.content, size === 'large' ? styles.large : ''].filter(Boolean).join(' ')}
            style={width ? { maxWidth: `min(${width}px, 100%)` } : undefined}
            {...(description ? {} : { 'aria-describedby': undefined })}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              openerRef.current?.focus()
            }}
            onOpenAutoFocus={(e) => {
              // Focus the dialog itself so screen readers announce the title first.
              e.preventDefault()
              if (e.currentTarget instanceof HTMLElement) e.currentTarget.focus()
            }}
          >
            <div className={styles.head}>
              <div>
                <Dialog.Title className={styles.title}>{title}</Dialog.Title>
                {description && <Dialog.Description className={styles.description}>{description}</Dialog.Description>}
              </div>
              <Dialog.Close asChild>
                <IconButton className={styles.close} ghost aria-label="Close" icon={<XMarkIcon aria-hidden="true" />} disabled={dismissDisabled} />
              </Dialog.Close>
            </div>
            {/* Fades + hairlines at the body's edges show when content is scrolled out of view.
                While it overflows, the body is a tab stop so read-only content can be
                scrolled from the keyboard (axe scrollable-region-focusable). */}
            <div className={styles.bodyFrame} data-scroll-start={edges.start || undefined} data-scroll-end={edges.end || undefined}>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be keyboard-reachable */}
              <div ref={bodyRef} className={styles.body} tabIndex={edges.start || edges.end ? 0 : undefined}>
                {children}
              </div>
            </div>
            {(footer || footerStart) && (
              <div className={styles.footer}>
                {footerStart}
                <div className={styles.footerEnd}>{footer}</div>
              </div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
