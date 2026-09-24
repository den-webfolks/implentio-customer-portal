import { useSyncExternalStore } from 'react'

/**
 * Below this viewport width the 240px sidebar (or even the 68px rail) leaves
 * the page column narrower than its content can use, so the shell switches
 * to a top bar with an off-canvas navigation drawer. Derived from content,
 * not a device preset: at 720px the rail would leave ~600px of page column,
 * which is where finding cards and KPI rows start to break.
 */
export const COMPACT_SHELL_QUERY = '(max-width: 720px)'

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(COMPACT_SHELL_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return typeof window.matchMedia === 'function' && window.matchMedia(COMPACT_SHELL_QUERY).matches
}

export function useCompactShell(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
