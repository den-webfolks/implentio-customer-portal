/**
 * Toast — ports the prototype's bottom-right toast (template ~7221,
 * showToast ~13793): one toast at a time, ok/warn dot, 3.6s auto-clear.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'

export type ToastKind = 'ok' | 'warn'

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
        <div className={styles.toast} role="status">
          <span className={toast.kind === 'warn' ? styles.dotWarn : styles.dotOk} />
          <span className={styles.msg}>{toast.msg}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}
