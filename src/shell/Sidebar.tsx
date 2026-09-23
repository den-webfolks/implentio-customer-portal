import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
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
  const footerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!profileOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (footerRef.current && e.target instanceof Node && !footerRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10 7l5 5-5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={styles.railNav}>
          {groups.map((g) => (
            <div key={g.label} style={{ display: 'contents' }}>
              <div className="ia-rail-init" aria-hidden="true">
                {g.initial}
              </div>
              {g.items.map((item) => (
                <span key={item.key} className="ia-tip ia-tip-right" style={{ justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="ia-rail-btn"
                    onClick={() => navigate(item.to)}
                    aria-label={item.label}
                    aria-current={isActive(item) ? 'page' : undefined}
                    style={{ background: isActive(item) ? 'var(--imp-purple-100)' : 'transparent' }}
                  >
                    <img src={item.icon} alt="" style={{ width: 20, height: 20 }} />
                  </button>
                  <span className="ia-tip-bub">{item.label}</span>
                </span>
              ))}
            </div>
          ))}
          <div className="ia-rail-init" aria-hidden="true">
            R
          </div>
          <span className="ia-tip ia-tip-right" style={{ justifyContent: 'center' }}>
            <span
              className="ia-rail-btn"
              role="link"
              aria-disabled="true"
              tabIndex={0}
              aria-label="Rate Cards — Future"
            >
              <img
                src="/brand/nav-ratecards.svg"
                alt=""
                style={{ width: 20, height: 20, opacity: 0.32 }}
              />
            </span>
            <span className="ia-tip-bub">Rate Cards — Future</span>
          </span>
        </div>
        <div className={styles.railFooter}>
          <span className="ia-tip ia-tip-right">
            <button
              type="button"
              onClick={expandToProfile}
              aria-label="Tori Matthews, Implentio Operations — expand navigation"
              className={styles.railAvatarBtn}
            >
              <div className="db-avatar">TM</div>
            </button>
            <span className="ia-tip-bub">Tori Matthews · Implentio Operations</span>
          </span>
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 7l-5 5 5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
              style={{ color: 'var(--imp-ink)' }}
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
      <div ref={footerRef} className="db-side-footer" style={{ marginTop: 'auto', position: 'relative' }}>
        {profileOpen && (
          <div className={styles.profileMenu}>
            <button
              type="button"
              className="ia-profile-item"
              onClick={() => {
                setProfileOpen(false)
                navigate('/account/profile')
              }}
            >
              Account Settings
            </button>
            <button
              type="button"
              className="ia-profile-item"
              style={{ color: 'var(--imp-error)', borderTop: '1.5px solid var(--imp-gray-200)' }}
              onClick={() => {
                setProfileOpen(false)
                onLogout()
              }}
            >
              Log out
            </button>
          </div>
        )}
        <button
          type="button"
          className={styles.profileTrigger}
          onClick={(e) => {
            e.stopPropagation()
            setProfileOpen((o) => !o)
          }}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
        >
          <div className="db-avatar">TM</div>
          <div style={{ minWidth: 0 }}>
            <div className="db-side-user-name">Tori Matthews</div>
            <div className="db-side-user-org">Implentio Operations</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.profileChevron}>
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  )
}
