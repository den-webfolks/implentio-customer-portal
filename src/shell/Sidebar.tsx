import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowRightStartOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpDownIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { Avatar } from '@/ui/Display/Display'
import { Tooltip } from '@/ui/Tooltip/Tooltip'
import { Menu, MenuItem, MenuSeparator } from '@/ui/Menu/Menu'
import styles from './Sidebar.module.css'

/** Whether the BI nav item is visible (shell parity); flip off for
 *  external-facing demos while the BI area is deferred. */
const SHOW_BI_NAV = true

interface NavItem {
  key: string
  label: string
  icon: string
  to: string
  /** Route prefixes that mark this item active. */
  activeOn: string[]
}

interface NavGroup {
  label: string
  /** Rail group initial (collapsed sidebar). */
  initial: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Analytics',
    initial: 'A',
    items: [
      {
        key: 'bi',
        label: 'Logistics Cost Performance',
        icon: '/brand/nav-bi.svg',
        to: '/bi',
        activeOn: ['/bi'],
      },
    ],
  },
  {
    label: 'Reconciliation',
    initial: 'R',
    items: [
      {
        key: 'parcel',
        label: 'Parcel Credit Memos',
        icon: '/brand/nav-parcel.svg',
        to: '/tracker/memos',
        activeOn: ['/tracker', '/memos'],
      },
      {
        key: 'fcm',
        label: 'Fulfillment Credit Memos',
        icon: '/brand/nav-fcm.svg',
        to: '/reports/fcm',
        activeOn: ['/reports/fcm'],
      },
    ],
  },
  {
    label: 'Optimization',
    initial: 'O',
    items: [
      {
        key: 'lcc',
        label: 'Least Cost Carrier',
        icon: '/brand/nav-lcc.svg',
        to: '/reports/lcc',
        activeOn: ['/reports/lcc'],
      },
      {
        key: 'pwv',
        label: 'Product Weight Validator',
        icon: '/brand/nav-pwv.svg',
        to: '/reports/pwv',
        activeOn: ['/reports/pwv'],
      },
    ],
  },
  {
    label: 'Billing Data',
    initial: 'B',
    items: [
      {
        key: 'invoices',
        label: 'Invoices',
        icon: '/brand/nav-invoices.svg',
        to: '/invoices',
        activeOn: ['/invoices'],
      },
    ],
  },
]

const NAV_PREF_KEY = 'ia25.navCollapsed'

function readNavPref(): boolean {
  try {
    return localStorage.getItem(NAV_PREF_KEY) === '1'
  } catch {
    return false
  }
}

function writeNavPref(collapsed: boolean) {
  try {
    localStorage.setItem(NAV_PREF_KEY, collapsed ? '1' : '0')
  } catch {
    // preference just won't persist
  }
}

function useIsActive() {
  const { pathname } = useLocation()
  return (item: NavItem) => item.activeOn.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(readNavPref)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const isActive = useIsActive()

  const toggleNav = () => {
    setCollapsed((c) => {
      writeNavPref(!c)
      return !c
    })
  }

  const expandToProfile = () => {
    setCollapsed(false)
    writeNavPref(false)
    setProfileOpen(true)
  }

  const groups = NAV_GROUPS.filter(
    (g) => SHOW_BI_NAV || g.items.some((i) => i.key !== 'bi'),
  )

  if (collapsed) {
    return (
      <aside className={`ia-aside ${styles.asideCollapsed}`}>
        <div className={styles.brandRowCollapsed}>
          <a href="/" className={styles.brandLink} aria-label="Implentio home">
            <img src="/brand/implentio-mark.svg" alt="Implentio" style={{ width: 24, height: 24 }} />
          </a>
          <button
            type="button"
            className="ia-nav-toggle"
            onClick={toggleNav}
            aria-expanded={false}
            aria-label="Expand navigation"
          >
            <ChevronRightIcon width={18} height={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.railNav}>
          {groups.map((g) => (
            <div key={g.label} style={{ display: 'contents' }}>
              <div className="ia-rail-init" aria-hidden="true">
                {g.initial}
              </div>
              {g.items.map((item) => (
                <Tooltip key={item.key} content={item.label} side="right">
                  <button
                    type="button"
                    className="ia-rail-btn"
                    onClick={() => navigate(item.to)}
                    aria-label={item.label}
                    aria-current={isActive(item) ? 'page' : undefined}
                    style={{ background: isActive(item) ? 'var(--ds-bg-brand-disabled)' : 'transparent' }}
                  >
                    <img src={item.icon} alt="" style={{ width: 20, height: 20 }} />
                  </button>
                </Tooltip>
              ))}
            </div>
          ))}
          <div className="ia-rail-init" aria-hidden="true">
            R
          </div>
          <Tooltip content="Rate Cards — Future" side="right">
            <span className="ia-rail-btn" role="link" aria-disabled="true" tabIndex={0} aria-label="Rate Cards — Future">
              <img src="/brand/nav-ratecards.svg" alt="" style={{ width: 20, height: 20, opacity: 0.32 }} />
            </span>
          </Tooltip>
        </div>
        <div className={styles.railFooter}>
          <Tooltip content="Tori Matthews · Implentio Operations" side="right">
            <button
              type="button"
              onClick={expandToProfile}
              aria-label="Tori Matthews, Implentio Operations — expand navigation"
              className={styles.railAvatarBtn}
            >
              <Avatar name="Tori Matthews" />
            </button>
          </Tooltip>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`ia-aside ${styles.asideExpanded}`}>
      <div className={styles.brandRow}>
        <a href="/" className={styles.brandLink} aria-label="Implentio home">
          <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 20, width: 'auto' }} />
        </a>
        <button
          type="button"
          className="ia-nav-toggle"
          onClick={toggleNav}
          aria-expanded={true}
          aria-label="Collapse navigation"
          style={{ marginLeft: 'auto' }}
        >
          <ChevronLeftIcon width={18} height={18} aria-hidden="true" />
        </button>
      </div>
      {groups.map((g, gi) => (
        <div key={g.label} className="db-nav-section" style={gi === 0 ? { marginTop: 12 } : undefined}>
          <div className={`db-nav-h ${styles.navHead}`}>{g.label}</div>
          {g.items.map((item) => (
            <button
              key={item.key}
              className={isActive(item) ? 'db-nav-item is-active' : 'db-nav-item'}
              onClick={() => navigate(item.to)}
              style={{ color: 'var(--ds-fg-default)' }}
            >
              <img
                className="db-nav-icon"
                src={item.icon}
                alt=""
                style={{ width: 18, height: 18, flex: 'none', alignSelf: 'flex-start', marginTop: 1 }}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
      <div className="db-nav-section">
        <div className={`db-nav-h ${styles.navHead}`}>Reference Data</div>
        <div className={`db-nav-item ${styles.navDisabled}`} aria-disabled="true">
          <span>Rate Cards</span>
        </div>
      </div>
      <div className="db-side-footer" style={{ marginTop: 'auto' }}>
        <Menu
          open={profileOpen}
          onOpenChange={setProfileOpen}
          side="top"
          align="start"
          className={styles.profileMenu}
          trigger={
            <button type="button" className={styles.profileTrigger}>
              <Avatar name="Tori Matthews" />
              <div style={{ minWidth: 0 }}>
                <div className="db-side-user-name">Tori Matthews</div>
                <div className="db-side-user-org">Implentio Operations</div>
              </div>
              <ChevronUpDownIcon width={16} height={16} aria-hidden="true" className={styles.profileChevron} />
            </button>
          }
        >
          <MenuItem icon={<Cog6ToothIcon aria-hidden="true" />} onSelect={() => navigate('/account/profile')}>
            Account Settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem danger icon={<ArrowRightStartOnRectangleIcon aria-hidden="true" />} onSelect={onLogout}>
            Log out
          </MenuItem>
        </Menu>
      </div>
    </aside>
  )
}
