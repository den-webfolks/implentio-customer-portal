/**
 * Figma ❖ Popover (5760:5358): a layer over the page, anchored to what opened
 * it — 4px away, with a caret toward it. Optional icon, title, close button,
 * text and action. Opens on click (not hover), so it can hold a picture and
 * be read on a phone; Escape or a click outside closes it (Radix Popover).
 */
import { useId, type ReactElement, type ReactNode } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import { XMarkIcon } from '@heroicons/react/24/outline'
import styles from './Popover.module.css'

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left'

export interface PopoverProps {
  /** A single button that opens the popover. */
  children: ReactElement
  title?: ReactNode
  /** Small icon before the title. */
  icon?: ReactNode
  /** The popover's text, and anything else it holds. */
  content: ReactNode
  /** An action at the bottom, e.g. a small Button. */
  action?: ReactNode
  side?: PopoverSide
  align?: 'start' | 'center' | 'end'
  /** Max width in px (default 340). */
  width?: number
  /** The popover's name for screen readers when it has no title. */
  'aria-label'?: string
}

export function Popover({
  children,
  title,
  icon,
  content,
  action,
  side = 'bottom',
  align = 'start',
  width = 340,
  'aria-label': ariaLabel,
}: PopoverProps) {
  const titleId = useId()
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{children}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={12}
          className={styles.content}
          // A dialog needs a name: its title, or the label passed in.
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          style={{ maxWidth: `min(${width}px, calc(100vw - 24px))` }}
        >
          {(title || icon) && (
            <div className={styles.head}>
              {icon && (
                <span className={styles.icon} aria-hidden="true">
                  {icon}
                </span>
              )}
              {title && (
                <div id={titleId} className={styles.title}>
                  {title}
                </div>
              )}
            </div>
          )}
          <div className={styles.body}>{content}</div>
          {action && <div className={styles.action}>{action}</div>}
          <RadixPopover.Close className={styles.close} aria-label="Close">
            <XMarkIcon aria-hidden="true" />
          </RadixPopover.Close>
          <RadixPopover.Arrow className={styles.arrow} width={12} height={6} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
