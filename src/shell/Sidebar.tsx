import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArchiveBoxIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChartBarIcon,
  CubeIcon,
  DocumentTextIcon,
  ScaleIcon,
  TableCellsIcon,
  TruckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { IconButton } from '@/ui/Button/Button'
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
  icon: ComponentType<SVGProps<SVGSVGElement>>
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
        icon: ChartBarIcon,
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
        icon: ArchiveBoxIcon,
        to: '/tracker/memos',
        activeOn: ['/tracker', '/memos'],
      },
      {
        key: 'fcm',
        label: 'Fulfillment Credit Memos',
        icon: CubeIcon,
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
        icon: TruckIcon,
        to: '/reports/lcc',
        activeOn: ['/reports/lcc'],
      },
      {
        key: 'pwv',
        label: 'Product Weight Validator',
        icon: ScaleIcon,
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
        icon: DocumentTextIcon,
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
        <nav aria-label="Primary" className={styles.railNav}>
          {groups.map((g) => (
            <div key={g.label} style={{ display: 'contents' }}>
              <div className="ia-rail-init" aria-hidden="true">
                {g.initial}
              </div>
              {g.items.map((item) => (
                <Tooltip key={item.key} content={item.label} side="right">
                  <RouterLink to={item.to} className="ia-rail-btn" aria-label={item.label} aria-current={isActive(item) ? 'page' : undefined}>
                    <item.icon width={20} height={20} aria-hidden="true" />
                  </RouterLink>
                </Tooltip>
              ))}
            </div>
          ))}
          <div className="ia-rail-init" aria-hidden="true">
            R
          </div>
          <Tooltip content="Rate Cards — Future" side="right">
            <span className="ia-rail-btn" role="link" aria-disabled="true" tabIndex={0} aria-label="Rate Cards — Future">
              <TableCellsIcon width={20} height={20} aria-hidden="true" />
            </span>
          </Tooltip>
        </nav>
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
      <NavBody
        groups={groups}
        isActive={isActive}
        onNavigate={navigate}
        onLogout={onLogout}
        profileOpen={profileOpen}
        onProfileOpenChange={setProfileOpen}
        brandAction={
          <button
            type="button"
            className={`ia-nav-toggle ${styles.brandAction}`}
            onClick={toggleNav}
            aria-expanded={true}
            aria-label="Collapse navigation"
          >
            <ChevronLeftIcon width={18} height={18} aria-hidden="true" />
          </button>
        }
      />
    </aside>
  )
}

/**
 * Compact shell (below COMPACT_SHELL_QUERY): a sticky top bar whose menu
 * button opens the full navigation in an off-canvas drawer, so the page
 * column keeps the whole viewport width.
 */
export function CompactNav({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const isActive = useIsActive()
  const groups = NAV_GROUPS.filter(
    (g) => SHOW_BI_NAV || g.items.some((i) => i.key !== 'bi'),
  )
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header className={styles.topBar}>
        <Dialog.Trigger asChild>
          <IconButton ghost aria-label="Open navigation" icon={<Bars3Icon aria-hidden="true" />} />
        </Dialog.Trigger>
        <a href="/" className={styles.brandLink} aria-label="Implentio home">
          <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 18, width: 'auto' }} />
        </a>
      </header>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.drawerOverlay} />
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">Navigation</Dialog.Title>
          <NavBody
            groups={groups}
            isActive={isActive}
            onNavigate={go}
            onLinkClick={() => setOpen(false)}
            onLogout={() => {
              setOpen(false)
              onLogout()
            }}
            profileOpen={profileOpen}
            onProfileOpenChange={setProfileOpen}
            brandAction={
              <Dialog.Close asChild>
                <IconButton ghost size="small" className={styles.brandAction} aria-label="Close navigation" icon={<XMarkIcon aria-hidden="true" />} />
              </Dialog.Close>
            }
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** The expanded navigation: brand row, grouped links, profile menu. */
function NavBody({
  groups,
  isActive,
  onNavigate,
  onLinkClick,
  onLogout,
  profileOpen,
  onProfileOpenChange,
  brandAction,
}: {
  groups: NavGroup[]
  isActive: (item: NavItem) => boolean
  onNavigate: (to: string) => void
  /** Called when a nav link is followed (the drawer closes itself). */
  onLinkClick?: () => void
  onLogout: () => void
  profileOpen: boolean
  onProfileOpenChange: (open: boolean) => void
  brandAction: ReactNode
}) {
  return (
    <>
      <div className={styles.brandRow}>
        <a href="/" className={styles.brandLink} aria-label="Implentio home">
          <img src="/brand/implentio-wordmark.svg" alt="Implentio" style={{ height: 20, width: 'auto' }} />
        </a>
        {brandAction}
      </div>
      <nav aria-label="Primary" style={{ display: 'contents' }}>
      {groups.map((g, gi) => (
        <div key={g.label} className="db-nav-section" style={gi === 0 ? { marginTop: 12 } : undefined}>
          <div className={`db-nav-h ${styles.navHead}`}>{g.label}</div>
          {g.items.map((item) => (
            <RouterLink
              key={item.key}
              to={item.to}
              className={isActive(item) ? 'db-nav-item is-active' : 'db-nav-item'}
              aria-current={isActive(item) ? 'page' : undefined}
              onClick={onLinkClick}
            >
              <item.icon className="db-nav-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </RouterLink>
          ))}
        </div>
      ))}
      <div className="db-nav-section">
        <div className={`db-nav-h ${styles.navHead}`}>Reference Data</div>
        <div className={`db-nav-item ${styles.navDisabled}`} aria-disabled="true">
          <span>Rate Cards</span>
        </div>
      </div>
      </nav>
      <div className="db-side-footer" style={{ marginTop: 'auto' }}>
        <Menu
          open={profileOpen}
          onOpenChange={onProfileOpenChange}
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
          <MenuItem icon={<Cog6ToothIcon aria-hidden="true" />} onSelect={() => onNavigate('/account/profile')}>
            Account settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem danger icon={<ArrowRightStartOnRectangleIcon aria-hidden="true" />} onSelect={onLogout}>
            Log out
          </MenuItem>
        </Menu>
      </div>
    </>
  )
}
