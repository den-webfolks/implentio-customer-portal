import { useEffect } from 'react'

/** Sets `document.title` for the current route, so tabs, history and screen
 *  readers can tell pages apart. Parts are joined most-specific first. */
export function usePageTitle(...parts: (string | undefined)[]) {
  const title = [...parts.filter(Boolean), 'Implentio'].join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}
