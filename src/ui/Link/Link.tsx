import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'
import styles from './Link.module.css'

export type LinkVariant = 'default' | 'accent' | 'muted'
export type LinkSize = 'small' | 'medium' | 'large'

interface LinkStyle {
  variant?: LinkVariant
  size?: LinkSize
  bold?: boolean
  underline?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  className?: string
  children: ReactNode
}

type RouteTarget = { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>
type AnchorTarget = { href: string; to?: undefined } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'>
type ButtonTarget = { to?: undefined; href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export type LinkProps = LinkStyle & (RouteTarget | AnchorTarget | ButtonTarget)

function isRoute(t: RouteTarget | AnchorTarget | ButtonTarget): t is RouteTarget {
  return typeof t.to === 'string'
}

function isAnchor(t: RouteTarget | AnchorTarget | ButtonTarget): t is AnchorTarget {
  return 'href' in t && typeof t.href === 'string'
}

/**
 * Figma ❖ Link. Renders a router link (`to`), an anchor (`href`), or a
 * button (neither) — text actions look like links whatever they do.
 */
export function Link({ variant = 'default', size = 'medium', bold = false, underline = false, iconLeft, iconRight, className, children, ...target }: LinkProps) {
  const cls = [
    styles.link,
    variant === 'default' ? '' : styles[variant],
    size === 'medium' ? '' : styles[size],
    bold ? styles.bold : '',
    underline ? styles.underline : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const content = (
    <>
      {iconLeft && <span className={styles.icon}>{iconLeft}</span>}
      {children}
      {iconRight && <span className={styles.icon}>{iconRight}</span>}
    </>
  )

  if (isRoute(target)) {
    return (
      <RouterLink className={cls} {...target}>
        {content}
      </RouterLink>
    )
  }
  if (isAnchor(target)) {
    return (
      <a className={cls} {...target}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={cls} {...target}>
      {content}
    </button>
  )
}
