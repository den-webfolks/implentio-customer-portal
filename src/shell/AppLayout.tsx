import { lazy, Suspense, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router'
import { Button } from '@/ui/Button/Button'
import { CompactNav, Sidebar } from './Sidebar'
import { useCompactShell } from './useCompactShell'
import styles from './AppLayout.module.css'
import { isDemoMode } from '@/demo/demo-mode'

const HarnessBar = lazy(() => import('@/demo/HarnessBar'))

function SignedOutOverlay({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--ds-neutral-100)',
      }}
    >
      <div
        className="db-card"
        style={{ width: 400, maxWidth: '100%', alignItems: 'center', textAlign: 'center', gap: 18, padding: '40px 32px' }}
      >
        <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 22 }} />
        <div>
          <h2 className="ds-heading-medium" style={{ margin: 0 }}>
            You&rsquo;ve been signed out
          </h2>
          <p className="imp-small" style={{ margin: '8px 0 0' }}>
            Your session has ended. Sign back in to return to your dashboard.
          </p>
        </div>
        <Button variant="primary" fullWidth onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    </div>
  )
}

export function AppLayout() {
  const [loggedOut, setLoggedOut] = useState(false)
  const [searchParams] = useSearchParams()
  const demo = isDemoMode()
  const compact = useCompactShell()

  if (loggedOut) {
    // Signing back in reloads the app, which reseeds the fixture store —
    // matching the prototype's freshState-on-sign-in behavior.
    return <SignedOutOverlay onSignIn={() => window.location.reload()} />
  }

  return (
    <div className={compact ? `${styles.shell} ${styles.shellCompact}` : styles.shell}>
      <a className={styles.skipLink} href="#main">
        Skip to content
      </a>
      {compact ? <CompactNav onLogout={() => setLoggedOut(true)} /> : <Sidebar onLogout={() => setLoggedOut(true)} />}
      <main id="main" tabIndex={-1} className={styles.main}>
        {demo && (
          <Suspense fallback={null}>
            <HarnessBar activeScenarioId={searchParams.get('scenario') ?? ''} />
          </Suspense>
        )}
        <div className={compact ? `${styles.content} ${styles.contentCompact}` : styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
