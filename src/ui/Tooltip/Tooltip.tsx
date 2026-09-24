import type { ReactElement, ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import styles from './Tooltip.module.css'

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

export interface TooltipProps {
  content: ReactNode
  /** A single focusable element (button, link) that the tooltip describes. */
  children: ReactElement
  side?: TooltipSide
}

/** Figma ❖ Tooltip — shows on hover and keyboard focus (Radix Tooltip). */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content side={side} sideOffset={4} collisionPadding={8} className={styles.content}>
            {content}
            <RadixTooltip.Arrow className={styles.arrow} width={8} height={4} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}

/** "i" icon that explains nearby content (Figma table info-icon + tooltip). */
export function InfoTip({ text, side = 'top', size = 16, color }: { text: string; side?: TooltipSide; size?: number; color?: string }) {
  return (
    <Tooltip content={text} side={side}>
      <button type="button" className={styles.infoTrigger} aria-label={text} style={color ? { color } : undefined}>
        <InformationCircleIcon width={size} height={size} aria-hidden="true" />
      </button>
    </Tooltip>
  )
}
