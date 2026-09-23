/** CSS-hover info tooltip ("i" button) — the prototype's ia-tip pattern.
 *  Pure CSS (proto.css); shows on hover and focus, no JS needed. */

export function InfoTip({
  text,
  down = false,
  size = 14,
  color,
}: {
  text: string
  /** Bubble opens below instead of above. */
  down?: boolean
  size?: number
  color?: string
}) {
  return (
    <span className={down ? 'ia-tip ia-tip-down' : 'ia-tip'}>
      <button type="button" className="ia-tip-btn" aria-label={text} style={color ? { color } : undefined}>
        <svg width={size - 1} height={size - 1} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="5.1" r="0.9" fill="currentColor" />
        </svg>
      </button>
      <span className="ia-tip-bub" role="tooltip">
        {text}
      </span>
    </span>
  )
}
