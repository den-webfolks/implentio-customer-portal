/**
 * Figma ❖ Toast: one toast at a time, bottom-right, 3.6s auto-clear
 * (timing unchanged from the prototype).
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

const ToastContext = createContext<((kind: ToastKind, msg: string) => void) | null>(null)

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast called outside ToastProvider')
  return show
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((kind: ToastKind, msg: string) => {
    clearTimeout(timer.current)
    setToast({ kind, msg })
    timer.current = setTimeout(() => setToast(null), 3600)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.kind]}`} role={toast.kind === 'danger' ? 'alert' : 'status'}>
          <span className={styles.msg}>{toast.msg}</span>
          <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => setToast(null)}>
            <XMarkIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}
