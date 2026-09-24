import { lazy, Suspense, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router'
import { Button } from '@/ui/Button/Button'
import { Sidebar } from './Sidebar'
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

  if (loggedOut) {
    // Signing back in reloads the app, which reseeds the fixture store —
    // matching the prototype's freshState-on-sign-in behavior.
    return <SignedOutOverlay onSignIn={() => window.location.reload()} />
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--ds-neutral-100)',
        color: 'var(--ds-fg-default)',
      }}
    >
      <Sidebar onLogout={() => setLoggedOut(true)} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {demo && (
          <Suspense fallback={null}>
            <HarnessBar activeScenarioId={searchParams.get('scenario') ?? ''} />
          </Suspense>
        )}
        <div style={{ padding: '22px 24px 56px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
