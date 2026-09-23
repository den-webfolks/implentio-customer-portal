/**
 * Clock abstraction. Feature code never calls `new Date()` / `Date.now()`
 * directly (enforced by lint); it reads time through this interface so that
 * fixture/demo mode can freeze "now" and keep the demo data's deadline states
 * rendering as designed (and VRT deterministic).
 */
import { createContext, useContext } from 'react'

export interface Clock {
  now(): Date
}

/**
 * The demo dataset's "today": after the latest seeded dispute event
 * (Sep 16, 2026) and before the earliest open dispute deadline (Sep 20,
 * 2026), so countdowns and expired states match the prototype's design.
 */
export const DEMO_NOW = new Date('2026-09-17T10:00:00-04:00')

export const frozenClock = (at: Date): Clock => ({ now: () => new Date(at.getTime()) })

export const systemClock: Clock = { now: () => new Date() }

const ClockContext = createContext<Clock>(systemClock)

export const ClockProvider = ClockContext.Provider

export function useClock(): Clock {
  return useContext(ClockContext)
}
