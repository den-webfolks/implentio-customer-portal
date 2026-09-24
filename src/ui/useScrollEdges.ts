import { useEffect, useState } from 'react'

export interface ScrollEdges {
  /** Content is scrolled away from the leading edge (something hidden before). */
  start: boolean
  /** More content lies past the trailing edge (something hidden after). */
  end: boolean
}

/**
 * Tracks whether a scroll container hides content at either edge, so the
 * container can show a visible cue (progressive disclosure needs one).
 * Re-measures on scroll, on resize and when children change.
 */
export function useScrollEdges(axis: 'x' | 'y') {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false })

  useEffect(() => {
    if (!el) return
    const update = () => {
      // scrollLeft is negative in RTL; the distance from the start is what counts.
      const pos = axis === 'x' ? Math.abs(el.scrollLeft) : el.scrollTop
      const max = axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
      const start = pos > 1
      const end = pos < max - 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    const observeChildren = () => {
      resize?.disconnect()
      resize?.observe(el)
      for (const child of Array.from(el.children)) resize?.observe(child)
    }
    observeChildren()
    const mutation =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            observeChildren()
            update()
          })
        : null
    mutation?.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', update)
      resize?.disconnect()
      mutation?.disconnect()
    }
  }, [el, axis])

  return [setEl, edges] as const
}
