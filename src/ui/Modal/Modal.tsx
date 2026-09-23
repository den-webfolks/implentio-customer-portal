/**
 * Modal dialog — Radix Dialog underneath (focus trap, aria wiring, Escape,
 * focus return: the a11y the prototype's inline modals lacked), styled to
 * match the prototype's modal chrome exactly (template ~2300).
 */
import { useEffect, useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import styles from './Modal.module.css'

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible title, rendered in the header row. */
  title: ReactNode
  /** Dialog width in px (prototype modals range 420–1080). */
  width?: number
  children: ReactNode
  /** Optional footer row (action buttons), right-aligned like the prototype. */
  footer?: ReactNode
}

export function Modal({ open, onClose, title, width = 420, children, footer }: ModalProps) {
  // Controlled dialogs have no Radix Trigger, so remember the opener and
  // return focus to it on close (prototype behavior; a11y baseline).
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      openerRef.current = document.activeElement
    }
  }, [open])
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <div className={styles.positioner}>
          <Dialog.Content
            className={styles.content}
            style={{ width }}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              openerRef.current?.focus()
            }}
            onOpenAutoFocus={(e) => {
              // Match prototype behavior: focus stays on the dialog, not the
              // first input, so screen readers announce the title first.
              e.preventDefault()
              ;(e.currentTarget as HTMLElement | null)?.focus?.()
            }}
          >
            <div className={styles.head}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close" className={styles.close}>
                  ×
                </button>
              </Dialog.Close>
            </div>
            {children}
            {footer && <div className={styles.footer}>{footer}</div>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
