/* Dev-only component gallery: every shared UI primitive rendered in
   isolation. Uses the real components/classes; demo state stays local. */
import { useState, type ReactNode } from 'react'
import { Modal } from '@/ui/Modal/Modal'
import { useToast } from '@/ui/Toast/ToastProvider'
import { UnderlineTabs, SecNav } from '@/ui/Tabs/UnderlineTabs'
import { FilterPanel, FilterChips, activeFilterCount, type FilterFieldDef, type FilterValues } from '@/ui/FilterPanel/FilterPanel'
import { InfoTip } from '@/ui/InfoTip'
import { outcomePillStyle } from '@/features/tracker/OutcomesTab'
import { STATUS_PILL } from '@/features/invoices/InvoicesPage'
import metricStyles from '@/features/tracker/OutcomesTab.module.css'

const SECTIONS = [
  ['buttons', 'Buttons & links'],
  ['inputs', 'Inputs, select, textarea, checkbox'],
  ['tabs', 'Tabs'],
  ['pills', 'Pills, badges, chips'],
  ['cards', 'Cards'],
  ['kpis', 'KPI tiles'],
  ['tooltips', 'Tooltips'],
  ['modals', 'Modals'],
  ['toasts', 'Toasts'],
  ['filters', 'Filters'],
  ['tables', 'Table primitives'],
  ['empty', 'Empty states'],
  ['assets', 'Icons & brand assets'],
  ['absent', 'Not in the codebase'],
] as const

type SectionId = (typeof SECTIONS)[number][0]

function Section({ id, source, note, children }: { id: SectionId; source: string; note?: ReactNode; children: ReactNode }) {
  const title = SECTIONS.find(([k]) => k === id)?.[1]
  return (
    <section id={id} className="db-card" style={{ scrollMarginTop: 16 }}>
      <div>
        <h2 className="db-h3">{title}</h2>
        <code className="db-tnum" style={{ overflowWrap: 'anywhere' }}>
          {source}
        </code>
        {note && (
          <p className="imp-small" style={{ margin: '6px 0 0', maxWidth: '80ch' }}>
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="db-kpi-sub" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  )
}

const FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: 'period',
    label: 'Period',
    allLabel: 'All periods',
    options: [
      { value: '2026-07', label: 'Jul 2026' },
      { value: '2026-08', label: 'Aug 2026' },
    ],
  },
  {
    key: 'biller',
    label: 'Biller',
    allLabel: 'All billers',
    options: [
      { value: 'quickbox', label: 'QuickBox' },
      { value: 'flowspace', label: 'Flowspace' },
      { value: 'shipbob', label: 'ShipBob' },
    ],
  },
]

const TABLE_ROWS = [
  { id: 'INV-10231', date: 'Jul 03, 2026', invoiced: 4210.55, variance: -312.4 },
  { id: 'INV-10248', date: 'Jul 10, 2026', invoiced: 3988.1, variance: 0 },
  { id: 'INV-10277', date: 'Jul 17, 2026', invoiced: 5102.9, variance: 48.25 },
]

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const BRAND_ASSETS = [
  'implentio-mark.svg',
  'implentio-wordmark.svg',
  'filter.svg',
  'credits-check.svg',
  'variance-arrow.svg',
  'title-swash.svg',
  'nav-parcel.svg',
  'nav-invoices.svg',
  'nav-lcc.svg',
  'nav-pwv.svg',
  'nav-fcm.svg',
  'nav-ratecards.svg',
  'nav-bi.svg',
  'gmail.png',
  'outlook.png',
  'empty-state.png',
]

export function ComponentGallery() {
  const showToast = useToast()
  const [underline, setUnderline] = useState<'memos' | 'outcomes'>('memos')
  const [secnav, setSecnav] = useState<'summary' | 'invoices' | 'activity'>('summary')
  const [segmented, setSegmented] = useState<'month' | 'quarter' | 'year'>('month')
  const [metric, setMetric] = useState<'all' | 'collected' | 'awaiting'>('all')
  const [filters, setFilters] = useState<FilterValues>({ period: 'all', biller: 'quickbox' })
  const [sortDesc, setSortDesc] = useState<boolean | null>(null)
  const [modal, setModal] = useState<'basic' | 'wide' | null>(null)
  const [checked, setChecked] = useState(true)

  const rows = sortDesc == null ? TABLE_ROWS : [...TABLE_ROWS].sort((a, b) => (sortDesc ? -1 : 1) * a.date.localeCompare(b.date))

  return (
    <main className="db-main" style={{ maxWidth: 1100 }}>
      <div>
        <p className="db-eyebrow">Dev</p>
        <h1 className="db-h1">Component Gallery</h1>
        <p className="imp-small" style={{ margin: '6px 0 0', maxWidth: '80ch' }}>
          Shared UI from <code>src/ui/</code> and the ported classes in <code>src/styles/proto.css</code>. Dev-only
          (not routed in production builds). Hover and focus states are live: hover or tab to see them.
        </p>
      </div>

      <nav aria-label="Gallery sections" className="db-card" style={{ gap: 6 }}>
        {SECTIONS.map(([id, title]) => (
          <a key={id} href={`#${id}`} style={{ font: '600 13px var(--imp-font-body)' }}>
            {title}
          </a>
        ))}
      </nav>

      <Section
        id="buttons"
        source="proto.css: .db-btn .db-btn-primary .db-btn-secondary .db-btn-sm · .db-icon-btn · .db-row-btn · .ia-crumb · .db-link · .ia-tracker-*"
        note="proto.css has no :disabled rule for .db-btn. Call sites apply opacity/cursor inline (e.g. FilterPanel's Apply button)."
      >
        <Example label="Primary / secondary">
          <button type="button" className="db-btn db-btn-primary">Prepare dispute</button>
          <button type="button" className="db-btn db-btn-secondary">Download report</button>
        </Example>
        <Example label="Small">
          <button type="button" className="db-btn db-btn-primary db-btn-sm">Apply filters</button>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm">Clear all</button>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm">
            <img src="/brand/filter.svg" alt="" style={{ width: 15, height: 15 }} />
            With icon
          </button>
        </Example>
        <Example label="Disabled attribute (no dedicated style)">
          <button type="button" className="db-btn db-btn-primary" disabled>Primary disabled</button>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" disabled>Secondary disabled</button>
        </Example>
        <Example label="Icon button (+ notification dot)">
          <button type="button" className="db-icon-btn" aria-label="Close">✕</button>
          <button type="button" className="db-icon-btn" aria-label="Notifications">
            <img src="/brand/credits-check.svg" alt="" />
            <span className="db-icon-dot" />
          </button>
        </Example>
        <Example label="Text actions">
          <button type="button" className="db-row-btn">View memo</button>
          <button type="button" className="ia-crumb">← Parcel Credit Tracker</button>
          <a className="db-link" href="#buttons">db-link (unused by screens)</a>
        </Example>
        <Example label="Tracker action classes">
          <button type="button" className="ia-tracker-review-btn">Review findings</button>
          <button type="button" className="ia-tracker-secondary-link">Update outcomes →</button>
        </Example>
      </Section>

      <Section
        id="inputs"
        source="proto.css: .ia-input (applied to input, select, textarea)"
        note="No error or success styling is defined; forms show validation as a text message below the field. Checkboxes are native."
      >
        <Example label="Text input">
          <input className="ia-input" aria-label="Default input" placeholder="Search by invoice #" />
          <input className="ia-input" aria-label="Filled input" defaultValue="tori@acme.com" />
          <input className="ia-input" aria-label="Disabled input" defaultValue="Disabled" disabled />
        </Example>
        <Example label="Select">
          <select className="ia-input" aria-label="Biller" defaultValue="quickbox">
            <option value="quickbox">QuickBox</option>
            <option value="flowspace">Flowspace</option>
          </select>
          <select className="ia-input" aria-label="Disabled select" disabled>
            <option>Disabled</option>
          </select>
        </Example>
        <Example label="Textarea">
          <textarea
            className="ia-input"
            aria-label="Reason"
            rows={3}
            placeholder="Add details about why the request was declined"
            style={{ width: 420, resize: 'vertical' }}
          />
        </Example>
        <Example label="Checkbox (native)">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span style={{ font: '600 13px var(--imp-font-body)' }}>Default dispute contact for this biller</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" disabled />
            <span style={{ font: '600 13px var(--imp-font-body)', color: 'var(--imp-fg-muted)' }}>Disabled</span>
          </label>
        </Example>
      </Section>

      <Section id="tabs" source="src/ui/Tabs/UnderlineTabs.tsx: UnderlineTabs, SecNav · proto.css: .db-tabs .db-tab">
        <Example label="UnderlineTabs (tracker)">
          <div style={{ width: '100%' }}>
            <UnderlineTabs
              tabs={[
                { key: 'memos', label: 'Credit memos' },
                { key: 'outcomes', label: 'Dispute outcomes' },
              ]}
              active={underline}
              onSelect={setUnderline}
            />
          </div>
        </Example>
        <Example label="SecNav (memo detail)">
          <SecNav
            ariaLabel="Example section nav"
            tabs={[
              { key: 'summary', label: 'Summary' },
              { key: 'invoices', label: 'Invoices' },
              { key: 'activity', label: 'Activity & exports' },
            ]}
            active={secnav}
            onSelect={setSecnav}
          />
        </Example>
        <Example label="Segmented .db-tabs (defined, unused by screens)">
          <div className="db-tabs">
            {(['month', 'quarter', 'year'] as const).map((k) => (
              <button key={k} type="button" className={segmented === k ? 'db-tab is-on' : 'db-tab'} onClick={() => setSegmented(k)}>
                {k[0]?.toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </Example>
      </Section>

      <Section
        id="pills"
        source="proto.css: .ia-pill · .db-badge · .ia-chip — tones from OutcomesTab.outcomePillStyle, InvoicesPage.STATUS_PILL"
        note=".ia-pill only sets shape; each feature supplies its tone colors inline. Not a shared tone API yet."
      >
        <Example label="Outcome tones (outcomePillStyle)">
          {(['eligible', 'success', 'warn', 'muted'] as const).map((t) => (
            <span key={t} className="ia-pill" style={outcomePillStyle(t)}>
              {t}
            </span>
          ))}
        </Example>
        <Example label="Invoice review status (STATUS_PILL)">
          {Object.entries(STATUS_PILL).map(([k, v]) => (
            <span key={k} className="ia-pill" style={v.style}>
              {v.label}
            </span>
          ))}
        </Example>
        <Example label=".db-badge ok / warn / err (defined, unused by screens)">
          {(['ok', 'warn', 'err'] as const).map((t) => (
            <span key={t} className={`db-badge ${t}`}>
              <span className="dot" />
              {t}
            </span>
          ))}
        </Example>
        <Example label="Chip (.ia-chip, as rendered by FilterChips)">
          <button type="button" className="ia-chip">
            Biller: QuickBox
            <span aria-hidden="true" style={{ fontSize: 11, opacity: 0.7 }}>✕</span>
          </button>
        </Example>
      </Section>

      <Section id="cards" source="proto.css: .db-card .db-card-head · .db-cta-strip · .db-avatar">
        <Example label="Card with header">
          <div className="db-card" style={{ width: 420 }}>
            <div className="db-card-head">
              <div>
                <div className="db-eyebrow">Credit memo</div>
                <h3 className="db-h3">CM-2026-0630</h3>
              </div>
              <button type="button" className="db-row-btn">Open</button>
            </div>
            <p className="imp-small" style={{ margin: 0 }}>QuickBox · Jun 2026 · 852 packages reviewed</p>
          </div>
        </Example>
        <Example label="CTA strip">
          <div className="db-cta-strip" style={{ width: '100%' }}>
            <span>
              <span className="db-money-orange">$10,459.83</span> in variance identified
            </span>
            <button type="button" className="db-btn db-btn-primary db-btn-sm">Review findings</button>
          </div>
        </Example>
        <Example label="Avatar">
          <span className="db-avatar">TM</span>
        </Example>
      </Section>

      <Section
        id="kpis"
        source="features/tracker/OutcomesTab.module.css: .metricGrid .metricBtn .metricNum (shared by 3 screens) · proto.css: .db-kpi-*"
        note="The metric tile is shared by Outcomes, Invoices and Memo invoices but lives in a feature CSS module."
      >
        <Example label="Metric tiles (selectable, aria-pressed)">
          <div className={metricStyles.metricGrid} style={{ width: '100%' }}>
            {(
              [
                ['all', 'Total identified', '$24,310.12', 'var(--imp-ink)'],
                ['collected', 'Collected', '$9,387.70', 'var(--imp-success)'],
                ['awaiting', 'Awaiting Biller', '$4,120.00', 'var(--imp-purple-500)'],
              ] as const
            ).map(([key, label, value, color]) => (
              <button
                key={key}
                type="button"
                className={metricStyles.metricBtn}
                aria-pressed={metric === key}
                style={{ borderTop: `3px solid ${metric === key ? color : 'transparent'}` }}
                onClick={() => setMetric(key)}
              >
                <div className="db-kpi-sub">{label}</div>
                <div className={metricStyles.metricNum} style={{ color }}>
                  {value}
                </div>
              </button>
            ))}
          </div>
        </Example>
        <Example label=".db-kpi-card with deltas (defined, unused by screens)">
          <div className="db-kpi-row" style={{ width: '100%' }}>
            {(
              [
                ['up', '+4.2% vs last month'],
                ['dn', '−1.8% vs last month'],
                ['neutral', 'No change'],
              ] as const
            ).map(([dir, text]) => (
              <div key={dir} className="db-kpi-card">
                <div className="db-kpi-sub">Recovery rate</div>
                <div className="db-kpi-val">
                  38<span className="db-pct">%</span>
                </div>
                <div className={`db-kpi-delta ${dir}`}>{text}</div>
              </div>
            ))}
          </div>
        </Example>
      </Section>

      <Section id="tooltips" source="src/ui/InfoTip.tsx (CSS hover/focus, .ia-tip) · .ia-tip-right used directly in Sidebar">
        <Example label="Above (default) / below / larger / custom color">
          <InfoTip text="Variance is the difference between invoiced and expected charges." />
          <InfoTip down text="Opens below: use near the top of a container." />
          <InfoTip size={18} text="Size 18." />
          <InfoTip color="var(--imp-orange-500)" text="Custom icon color." />
        </Example>
      </Section>

      <Section id="modals" source="src/ui/Modal/Modal.tsx (Radix Dialog: focus trap, Escape, focus return)">
        <Example label="Open">
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setModal('basic')}>
            Default (420px)
          </button>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setModal('wide')}>
            Wide (720px) with footer
          </button>
        </Example>
        <Modal open={modal === 'basic'} onClose={() => setModal(null)} title="Invite member">
          <p className="imp-small" style={{ margin: 0 }}>Body content without a footer. Press Escape or × to close.</p>
        </Modal>
        <Modal
          open={modal === 'wide'}
          onClose={() => setModal(null)}
          title="Update credit memo dispute"
          width={720}
          footer={
            <>
              <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="db-btn db-btn-primary db-btn-sm" onClick={() => setModal(null)}>Save</button>
            </>
          }
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="db-kpi-sub">Note</span>
            <textarea className="ia-input" rows={3} />
          </label>
        </Modal>
      </Section>

      <Section id="toasts" source="src/ui/Toast/ToastProvider.tsx: useToast() (one at a time, 3.6s)">
        <Example label="Trigger">
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => showToast('ok', 'Downloading CM-2026-0630.xlsx')}>
            Success (ok)
          </button>
          <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => showToast('warn', 'Connection needs to be re-authorized')}>
            Warning (warn)
          </button>
        </Example>
      </Section>

      <Section id="filters" source="src/ui/FilterPanel/FilterPanel.tsx: FilterPanel, FilterChips, activeFilterCount (bottom sheet under 640px)">
        <Example label={`Staged panel + applied chips (${activeFilterCount(filters)} active)`}>
          <FilterPanel fields={FILTER_FIELDS} values={filters} onApply={setFilters} />
          <FilterChips fields={FILTER_FIELDS} values={filters} onClear={(key) => setFilters((f) => ({ ...f, [key]: 'all' }))} />
        </Example>
      </Section>

      <Section
        id="tables"
        source="proto.css: .db-table .db-table-compact td.num/.neg/.pos .db-total-row .ia-sort-btn .db-row-btn"
        note="No table component; screens compose these classes directly."
      >
        {(['db-table', 'db-table db-table-compact'] as const).map((cls) => (
          <Example key={cls} label={cls === 'db-table' ? 'Default (hover rows, sortable date)' : 'Compact'}>
            <table className={cls}>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th aria-sort={sortDesc == null ? undefined : sortDesc ? 'descending' : 'ascending'}>
                    <button type="button" className="ia-sort-btn" onClick={() => setSortDesc((s) => (s == null ? true : !s))}>
                      Invoice Date
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ transform: sortDesc === false ? 'rotate(180deg)' : undefined, opacity: sortDesc == null ? 0.4 : 1 }}>
                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </th>
                  <th className="num">Invoiced</th>
                  <th className="num">Variance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.date}</td>
                    <td className="num">{usd(r.invoiced)}</td>
                    <td className={r.variance < 0 ? 'num neg' : r.variance > 0 ? 'num pos' : 'num'}>{usd(r.variance)}</td>
                    <td className="num">
                      <button type="button" className="db-row-btn">Open</button>
                    </td>
                  </tr>
                ))}
                <tr className="db-total-row">
                  <td>Total</td>
                  <td />
                  <td className="num">{usd(TABLE_ROWS.reduce((s, r) => s + r.invoiced, 0))}</td>
                  <td className="num">{usd(TABLE_ROWS.reduce((s, r) => s + r.variance, 0))}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </Example>
        ))}
      </Section>

      <Section id="empty" source="proto.css: .db-empty (on .db-card)">
        <Example label="Filtered-to-nothing">
          <div className="db-card db-empty" style={{ padding: '40px 32px', width: 480 }}>
            <h3 className="db-h3">No credit memos match these filters</h3>
            <p className="imp-small" style={{ margin: '6px auto 0', maxWidth: '44ch' }}>
              Adjust the filters above to see credit memos for other periods, statuses, or carriers.
            </p>
          </div>
        </Example>
        <Example label="With illustration">
          <div className="db-card db-empty" style={{ padding: '40px 32px', width: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <img src="/brand/empty-state.png" alt="" style={{ width: 200, height: 'auto', marginBottom: 14, opacity: 0.55 }} />
            <h3 className="db-h3">Detailed breakdown unavailable</h3>
          </div>
        </Example>
      </Section>

      <Section
        id="assets"
        source="public/brand/*"
        note="Icons are static SVG/PNG files referenced by <img>; there are no icon components. Small UI glyphs (chevrons, sort arrow, info) are inline SVG at the call site."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {BRAND_ASSETS.map((f) => (
            <figure key={f} style={{ margin: 0, textAlign: 'center' }}>
              <div style={{ height: 64, display: 'grid', placeItems: 'center', border: '1px solid var(--imp-gray-200)', borderRadius: 8, background: 'var(--imp-gray-100)' }}>
                <img src={`/brand/${f}`} alt="" style={{ maxWidth: 110, maxHeight: 44 }} />
              </div>
              <figcaption className="db-tnum" style={{ marginTop: 4 }}>{f}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="absent" source="—">
        <ul className="imp-small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><b>Radio, toggle/switch, drawer/sheet, pagination, skeletons</b>: none exist.</li>
          <li><b>Dropdown menu</b>: only feature-local (OutcomeModal's <code>.ia-om-dd-*</code>).</li>
          <li><b>Popover</b>: only FilterPanel&apos;s panel; <code>.ia-tb-pop</code> exists in proto.css for the deferred BI screen.</li>
          <li><b>Loading spinner</b>: inline-styled at call sites (SummaryTab, DisputeWizard, AccountPage) using <code>@keyframes imp-spin</code>.</li>
          <li><b>Defined in proto.css, unused by screens</b>: <code>.db-chart-* .db-bar-* .db-sla-* .db-search .db-kbd .ia-tb-*</code>.</li>
        </ul>
      </Section>
    </main>
  )
}
