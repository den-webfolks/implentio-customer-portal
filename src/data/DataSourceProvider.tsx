/**
 * Binds the active AppDataSource implementation. Phase 1 always uses the
 * fixture source (loaded lazily so the ~1MB demo data stays in its own
 * chunk); Phase 3 selects SupabaseDataSource here when demo mode is off.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppDataSource } from './source'
import { ClockProvider, DEMO_NOW, frozenClock, type Clock } from '@/lib/clock'

const DataSourceContext = createContext<AppDataSource | null>(null)

export function useDataSource(): AppDataSource {
  const ds = useContext(DataSourceContext)
  if (!ds) throw new Error('useDataSource called outside DataSourceProvider')
  return ds
}

interface Bound {
  source: AppDataSource
  clock: Clock
}

async function bindFixtureSource(scenarioId: string | null): Promise<Bound> {
  const { FixtureDataSource } = await import('@/demo/fixture-source')
  const clock = frozenClock(DEMO_NOW)
  return { source: new FixtureDataSource(scenarioId, clock), clock }
}

export function DataSourceProvider({
  scenarioId,
  children,
}: {
  scenarioId: string | null
  children: ReactNode
}) {
  const [bound, setBound] = useState<Bound | null>(null)

  useEffect(() => {
    let cancelled = false
    bindFixtureSource(scenarioId).then((b) => {
      if (!cancelled) setBound(b)
    })
    return () => {
      cancelled = true
    }
  }, [scenarioId])

  if (!bound) return null
  return (
    <ClockProvider value={bound.clock}>
      <DataSourceContext.Provider value={bound.source}>{children}</DataSourceContext.Provider>
    </ClockProvider>
  )
}
