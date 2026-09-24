/**
 * Figma ❖ Toast: one toast at a time, bottom-right. Neutral and positive
 * toasts clear after 3.6s (prototype timing), pausing while hovered or
 * focused; danger toasts carry errors and stay until dismissed.
 *
 * Announcements go through two live regions that are always rendered and
 * only have their text swapped — a region inserted together with its text
 * is announced inconsistently across screen readers.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import styles from './Toast.module.css'

/** Figma types: neutral, danger (system errors), positive. */
export type ToastKind = 'neutral' | 'danger' | 'positive'

interface ToastState {
  kind: ToastKind
  msg: string
}

const AUTO_CLEAR_MS = 3600

const ToastContext = createContext<((kind: ToastKind, msg: string) => void) | null>(null)

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast called outside ToastProvider')
  return show
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [announcement, setAnnouncement] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frame = useRef<number>(undefined)

  const startTimer = useCallback((kind: ToastKind) => {
    clearTimeout(timer.current)
    if (kind !== 'danger') timer.current = setTimeout(() => setToast(null), AUTO_CLEAR_MS)
  }, [])

  const show = useCallback(
    (kind: ToastKind, msg: string) => {
      setToast({ kind, msg })
      startTimer(kind)
      // Clear then set on the next frame so a repeated message is re-announced.
      setAnnouncement(null)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => setAnnouncement({ kind, msg }))
    },
    [startTimer],
  )

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const pause = () => clearTimeout(timer.current)
  const resume = () => toast && startTimer(toast.kind)

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="visually-hidden" role="status">
        {announcement && announcement.kind !== 'danger' ? announcement.msg : ''}
      </div>
      <div className="visually-hidden" role="alert">
        {announcement?.kind === 'danger' ? announcement.msg : ''}
      </div>
      {toast && (
        <div
          className={`${styles.toast} ${styles[toast.kind]}`}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocus={pause}
          onBlur={resume}
        >
          <span className={styles.msg}>{toast.msg}</span>
          <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => setToast(null)}>
            <XMarkIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}
