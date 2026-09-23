/**
 * Demo/harness gating — TEMPORARY prototype infrastructure (see
 * ARCHITECTURE.md, "Scenario harness"). The harness bar shows when the URL
 * carries ?demo=1 (persisted for the session) or the build sets
 * VITE_DEMO_TOOLS=1. Revisit before any customer-facing deployment.
 */
const KEY = 'ia25.demoMode'

export function isDemoMode(): boolean {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === '1') {
      sessionStorage.setItem(KEY, '1')
      return true
    }
    if (params.get('demo') === '0') {
      sessionStorage.removeItem(KEY)
      return false
    }
    if (sessionStorage.getItem(KEY) === '1') return true
  } catch {
    // storage unavailable — fall through to the build flag
  }
  return import.meta.env.VITE_DEMO_TOOLS === '1'
}

/** Switch scenario via full navigation so the fixture store reseeds cleanly. */
export function scenarioUrl(scenarioId: string, location: string | undefined): string {
  const path = location ?? window.location.pathname
  return `${path}?scenario=${encodeURIComponent(scenarioId)}&demo=1`
}
