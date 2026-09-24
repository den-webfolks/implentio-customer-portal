/* Dev-only component gallery: every shared UI component rendered in
   isolation with its variants and states. Demo state stays local. */
import { useState, type ReactNode } from 'react'
import { ArrowDownTrayIcon, EnvelopeIcon, MagnifyingGlassIcon, PaperAirplaneIcon, PlusIcon, TrashIcon, XMarkIcon, ChevronDownIcon, CheckIcon, NoSymbolIcon, ClockIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { Button, ButtonLink, IconButton } from '@/ui/Button/Button'
import { Link } from '@/ui/Link/Link'
import { TextField, TextArea } from '@/ui/Form/TextField'
import { Select } from '@/ui/Form/Select'
import { Checkbox, RadioGroup } from '@/ui/Form/Choice'
import { StatusChip, Tag } from '@/ui/Chip/StatusChip'
import { Tooltip, InfoTip } from '@/ui/Tooltip/Tooltip'
import { Menu, MenuItem, MenuSeparator, MenuLabel } from '@/ui/Menu/Menu'
import { Modal } from '@/ui/Modal/Modal'
import { useToast } from '@/ui/Toast/ToastProvider'
import { Banner } from '@/ui/Banner/Banner'
import { Tabs, ActionTab, ActionTabs } from '@/ui/Tabs/Tabs'
import { Stepper, Avatar, Statistic, StatisticGroup, EmptyState, Spinner } from '@/ui/Display/Display'
import { Table, TableScroll, SortableHeader, ValueDiff, nextSort, type SortDirection } from '@/ui/Table/Table'
import { useFilters, FilterButton, FilterGroup, matchesFilter, type FilterField, type FilterValues } from '@/ui/Filters/Filters'

const SECTIONS = [
  ['foundations', 'Foundations'],
  ['buttons', 'Button & IconButton'],
  ['links', 'Link'],
  ['inputs', 'TextField & TextArea'],
  ['select', 'Select'],
  ['choices', 'Checkbox & RadioGroup'],
  ['chips', 'StatusChip & Tag'],
  ['tabs', 'Tabs & ActionTab'],
  ['statistic', 'Statistic'],
  ['stepper', 'Stepper'],
  ['avatar', 'Avatar'],
  ['tooltip', 'Tooltip & InfoTip'],
  ['menu', 'Menu'],
  ['banner', 'Banner'],
  ['toast', 'Toast'],
  ['modal', 'Modal'],
  ['filters', 'Filters'],
  ['table', 'Table primitives'],
  ['empty', 'EmptyState & Spinner'],
] as const

type SectionId = (typeof SECTIONS)[number][0]

function Section({ id, source, note, children }: { id: SectionId; source: string; note?: ReactNode; children: ReactNode }) {
  const title = SECTIONS.find(([k]) => k === id)?.[1]
  return (
    <section id={id} className="db-card" style={{ scrollMarginTop: 16 }}>
      <div>
        <h2 className="ds-heading-small" style={{ margin: 0 }}>
          {title}
        </h2>
        <code className="ds-body-small ds-muted" style={{ overflowWrap: 'anywhere' }}>
          {source}
        </code>
        {note && (
          <p className="ds-body-base ds-muted" style={{ margin: '6px 0 0', maxWidth: '80ch' }}>
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
      <div className="ds-caption-small ds-muted" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  )
}

const SWATCHES = [
  ['bg-brand-emphasis', 'bg-dark-brand-emphasis', 'bg-brand-disabled', 'bg-accent-emphasis', 'bg-emphasis', 'bg-muted', 'bg-disabled'],
  ['bg-success-emphasis', 'bg-success-muted', 'bg-warning-emphasis', 'bg-warning-muted', 'bg-danger-emphasis', 'bg-danger-muted', 'status-info-bg'],
  ['stroke-emphasis', 'stroke-muted', 'stroke-disabled', 'stroke-focus', 'stroke-brand-muted'],
] as const

const TEXT_STYLES = [
  ['ds-heading-xlarge', 'heading/x-large · 30'],
  ['ds-heading-large', 'heading/large · 25'],
  ['ds-heading-medium', 'heading/medium · 21'],
  ['ds-heading-small', 'heading/small · 17'],
  ['ds-heading-tiny', 'heading/tiny · 14'],
  ['ds-body-medium', 'body/medium · 16'],
  ['ds-body-base', 'body/base · 14'],
  ['ds-body-small', 'body/small · 12'],
  ['ds-caption-small', 'caption/small · 12'],
  ['ds-caption-tiny', 'caption/tiny · 10'],
] as const

const FILTER_FIELDS: FilterField[] = [
  {
    key: 'biller',
    label: 'Biller',
    options: [
      { value: 'quickbox', label: 'QuickBox' },
      { value: 'flowspace', label: 'Flowspace' },
      { value: 'shipbob', label: 'ShipBob' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'variance', label: 'Variance identified' },
      { value: 'clear', label: 'No significant variance' },
      { value: 'pending', label: 'Audit not complete' },
    ],
  },
]

const ROWS = [
  { id: 'INV-10231', biller: 'quickbox', status: 'variance', date: '2026-07-03', invoiced: 4210.55, variance: -312.4 },
  { id: 'INV-10248', biller: 'flowspace', status: 'clear', date: '2026-07-10', invoiced: 3988.1, variance: 0 },
  { id: 'INV-10277', biller: 'shipbob', status: 'pending', date: '2026-07-17', invoiced: 5102.9, variance: 48.25 },
]

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const BRAND_ASSETS = ['implentio-mark.svg', 'implentio-wordmark.svg', 'gmail.png', 'outlook.png', 'empty-state.png']

export function ComponentGallery() {
  const showToast = useToast()
  const [tab, setTab] = useState<'memos' | 'outcomes' | 'archived'>('memos')
  const [action, setAction] = useState<'all' | 'collected' | 'awaiting'>('all')
  const [modal, setModal] = useState<'medium' | 'large' | 'narrow' | null>(null)
  const [checked, setChecked] = useState(true)
  const [boxed, setBoxed] = useState(false)
  const [radio, setRadio] = useState<'full' | 'partial' | 'none' | null>('partial')
  const [biller, setBiller] = useState<string | undefined>('quickbox')
  const [email, setEmail] = useState('tori@acme')
  const [filterValues, setFilterValues] = useState<FilterValues>({ biller: ['quickbox'] })
  const filters = useFilters(FILTER_FIELDS, filterValues, setFilterValues)
  const [sort, setSort] = useState<SortDirection>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const rows = ROWS.filter((r) => matchesFilter(filterValues, 'biller', r.biller) && matchesFilter(filterValues, 'status', r.status))
  const sorted = sort === null ? rows : [...rows].sort((a, b) => (sort === 'asc' ? 1 : -1) * a.date.localeCompare(b.date))

  return (
    <main className="db-main" style={{ maxWidth: 1100 }}>
      <div>
        <p className="imp-eyebrow" style={{ margin: 0 }}>
          Dev
        </p>
        <h1 className="ds-heading-xlarge" style={{ margin: '4px 0 0' }}>
          Component Gallery
        </h1>
        <p className="ds-body-base ds-muted" style={{ margin: '6px 0 0', maxWidth: '80ch' }}>
          The shared components in <code>src/ui/</code>, aligned with the Figma library (see DESIGN-SYSTEM.md). Dev-only — not routed in production builds.
          Hover, focus and press states are live.
        </p>
      </div>

      <nav aria-label="Gallery sections" className="db-card" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '6px 16px' }}>
        {SECTIONS.map(([id, title]) => (
          <Link key={id} href={`#${id}`} variant="accent" size="small">
            {title}
          </Link>
        ))}
      </nav>

      <Section id="foundations" source="src/styles/tokens.css — Figma variables, text styles, effect styles" note="Inter throughout; semantic colour tokens mirror Figma's Colors collection.">
        {SWATCHES.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {row.map((t) => (
              <div key={t} style={{ width: 132 }}>
                <div style={{ height: 40, borderRadius: 6, border: '1px solid var(--ds-stroke-disabled)', background: `var(--ds-${t})` }} />
                <code className="ds-body-small ds-muted">{t}</code>
              </div>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TEXT_STYLES.map(([cls, name]) => (
            <div key={cls} style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <code className="ds-body-small ds-muted" style={{ width: 160, flex: 'none' }}>
                {name}
              </code>
              <span className={cls} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>Credit memo CM-2026-0630 — $10,459.83</span>
            </div>
          ))}
        </div>
        <Example label="Radius · small 4 / medium 6 / large 8 / xlarge 12 — Effects · disabled / muted / popover">
          {(['small', 'medium', 'large', 'xlarge'] as const).map((r) => (
            <div key={r} style={{ width: 64, height: 40, border: '1px solid var(--ds-stroke-emphasis)', borderRadius: `var(--ds-radius-${r})` }} />
          ))}
          {(['disabled', 'muted', 'popover'] as const).map((s) => (
            <div key={s} style={{ width: 96, height: 40, borderRadius: 6, background: '#fff', boxShadow: `var(--ds-shadow-${s})`, display: 'grid', placeItems: 'center' }}>
              <code className="ds-body-small">{s}</code>
            </div>
          ))}
        </Example>
      </Section>

      <Section
        id="buttons"
        source="src/ui/Button/Button.tsx — Figma ❖ Button (button, icon-button)"
        note="Primary + Secondary; secondary variations: Emphasis (secondary action), Danger (reject/delete), Success (approve/accept), Attention. Sizes small 32 / medium 36 (default). One primary per view: repeated per-card actions use Emphasis or Secondary."
      >
        {(['medium', 'small'] as const).map((size) => (
          <Example key={size} label={`Variants · ${size}`}>
            <Button variant="primary" size={size}>
              Prepare dispute
            </Button>
            <Button variant="secondary" size={size}>
              Download report
            </Button>
            <Button variant="emphasis" size={size}>
              Review findings
            </Button>
            <Button variant="danger" size={size}>
              Remove
            </Button>
            <Button variant="success" size={size}>
              Mark collected
            </Button>
            <Button variant="attention" size={size}>
              Needs attention
            </Button>
          </Example>
        ))}
        <Example label="Icons · loading · disabled">
          <Button variant="primary" iconLeft={<PaperAirplaneIcon aria-hidden="true" />}>
            Send
          </Button>
          <Button iconLeft={<ArrowDownTrayIcon aria-hidden="true" />}>Download</Button>
          <Button variant="emphasis" iconRight={<ChevronDownIcon aria-hidden="true" />}>
            More
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={() => {
              setLoading(true)
              window.setTimeout(() => setLoading(false), 1500)
            }}
          >
            {loading ? 'Sending…' : 'Click to load'}
          </Button>
          <Button variant="primary" disabled>
            Primary disabled
          </Button>
          <Button disabled>Secondary disabled</Button>
        </Example>
        <Example label="ButtonLink · navigation that must look like a button (a real link: new tab, copy link)">
          <ButtonLink to="/tracker/memos" size="small" iconLeft={<ListBulletIcon aria-hidden="true" />}>
            Review findings
          </ButtonLink>
          <ButtonLink to="/tracker/memos" variant="emphasis" size="small">
            Prepare dispute
          </ButtonLink>
        </Example>
        <Example label="IconButton · tiny 24 / small 32 / medium 36 / large 44 · ghost · disabled">
          <IconButton size="tiny" aria-label="Search" icon={<MagnifyingGlassIcon aria-hidden="true" />} />
          <IconButton size="small" aria-label="Search" icon={<MagnifyingGlassIcon aria-hidden="true" />} />
          <IconButton aria-label="Search" icon={<MagnifyingGlassIcon aria-hidden="true" />} />
          <IconButton size="large" aria-label="Search" icon={<MagnifyingGlassIcon aria-hidden="true" />} />
          <IconButton ghost aria-label="Close" icon={<XMarkIcon aria-hidden="true" />} />
          <IconButton disabled aria-label="Delete" icon={<TrashIcon aria-hidden="true" />} />
          <Tooltip content="Tooltip Info">
            <IconButton aria-label="With tooltip" icon={<EnvelopeIcon aria-hidden="true" />} />
          </Tooltip>
        </Example>
      </Section>

      <Section id="links" source="src/ui/Link/Link.tsx — Figma ❖ Link" note="Renders a router link (to), an anchor (href) or a button (onClick).">
        {(['default', 'accent', 'muted'] as const).map((v) => (
          <Example key={v} label={v}>
            <Link variant={v} size="small" onClick={() => undefined}>
              Small link
            </Link>
            <Link variant={v} onClick={() => undefined}>
              Medium link
            </Link>
            <Link variant={v} size="large" onClick={() => undefined}>
              Large link
            </Link>
            <Link variant={v} bold onClick={() => undefined}>
              Bold
            </Link>
            <Link variant={v} underline onClick={() => undefined}>
              Underlined
            </Link>
            <Link variant={v} iconLeft={<ArrowDownTrayIcon aria-hidden="true" />} onClick={() => undefined}>
              With icon
            </Link>
          </Example>
        ))}
      </Section>

      <Section
        id="inputs"
        source="src/ui/Form/TextField.tsx — Figma ❖ Text Input"
        note="Validation = border colour + message below; the focus border overrides validation. Label optional (use for complex forms)."
      >
        <Example label="Default · with label · icon · small · disabled">
          <TextField aria-label="Search" placeholder="Search by invoice #" iconLeft={<MagnifyingGlassIcon />} />
          <TextField label="Contact name" placeholder="Jane Doe" />
          <TextField size="small" aria-label="Small" placeholder="Small (32px)" />
          <TextField label="Disabled" defaultValue="Read only value" disabled />
        </Example>
        <Example label="Validation · invalid / warning / success · caption">
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            validation={email.includes('.') ? 'success' : 'invalid'}
            message={email.includes('.') ? 'Looks good' : 'Enter a valid email address'}
          />
          <TextField label="Amount" defaultValue="12000" validation="warning" message="Above the requested amount" />
          <TextField label="Reference" optional placeholder="PO-1234" caption="Shown on the dispute email" />
        </Example>
        <Example label="TextArea">
          <TextArea label="Reason" placeholder="Add details about why the request was declined" rows={3} />
        </Example>
      </Section>

      <Section id="select" source="src/ui/Form/Select.tsx — Figma ❖ Select (select + select-menu), Radix Select">
        <Example label="With label · placeholder · small · disabled">
          <Select
            label="Biller"
            value={biller}
            onValueChange={setBiller}
            options={[
              { value: 'quickbox', label: 'QuickBox' },
              { value: 'flowspace', label: 'Flowspace' },
              { value: 'shipbob', label: 'ShipBob', disabled: true },
            ]}
          />
          <Select aria-label="Period" placeholder="Choose a period" value={undefined} onValueChange={() => undefined} options={[{ value: 'jul', label: 'Jul 2026' }]} />
          <Select aria-label="Small" size="small" value="a" onValueChange={() => undefined} options={[{ value: 'a', label: 'Small select' }]} />
          <Select label="Disabled" disabled value="a" onValueChange={() => undefined} options={[{ value: 'a', label: 'Disabled' }]} />
        </Example>
      </Section>

      <Section id="choices" source="src/ui/Form/Choice.tsx — Figma ❖ Checkbox (regular, withOutline) · ❖ Radio">
        <Example label="Checkbox · bordered · description · disabled">
          <Checkbox label="Default dispute contact" checked={checked} onCheckedChange={setChecked} />
          <Checkbox label="Include in dispute" bordered checked={boxed} onCheckedChange={setBoxed} />
          <Checkbox label="Attach evidence" description="Adds the package-level workbook" checked onCheckedChange={() => undefined} />
          <Checkbox label="Disabled" checked={false} disabled onCheckedChange={() => undefined} />
          <Checkbox label="Checked disabled" checked disabled onCheckedChange={() => undefined} />
        </Example>
        <Example label="RadioGroup · column · bordered row">
          <RadioGroup
            aria-label="Outcome"
            value={radio}
            onValueChange={setRadio}
            options={[
              { value: 'full', label: 'Collected in full' },
              { value: 'partial', label: 'Partially collected' },
              { value: 'none', label: 'Not issued', disabled: true },
            ]}
          />
          <RadioGroup
            aria-label="Outcome (bordered)"
            bordered
            direction="row"
            value={radio}
            onValueChange={setRadio}
            options={[
              { value: 'full', label: 'Collected in full' },
              { value: 'partial', label: 'Partially collected' },
              { value: 'none', label: 'Not issued' },
            ]}
          />
        </Example>
      </Section>

      <Section
        id="chips"
        source="src/ui/Chip/StatusChip.tsx — Figma ❖ Chips (status-chip, tag-chip)"
        note="Domain statuses map to tones in one place: features/status-tones.ts."
      >
        <Example label="Tones · filled">
          <StatusChip tone="neutral">Eligible</StatusChip>
          <StatusChip tone="info" icon={<ClockIcon />}>
            Awaiting outcome
          </StatusChip>
          <StatusChip tone="attention">Partially collected</StatusChip>
          <StatusChip tone="success" icon={<CheckIcon />}>
            Collected
          </StatusChip>
          <StatusChip tone="danger" icon={<NoSymbolIcon />}>
            Declined
          </StatusChip>
          <StatusChip tone="muted">Superseded</StatusChip>
        </Example>
        <Example label="Text only">
          <StatusChip tone="info" textOnly>
            Awaiting outcome
          </StatusChip>
          <StatusChip tone="success" textOnly icon={<CheckIcon />}>
            Collected
          </StatusChip>
        </Example>
        <Example label="Tag">
          <Tag>UPS</Tag>
          <Tag>FedEx</Tag>
          <Tag>USPS</Tag>
        </Example>
      </Section>

      <Section id="tabs" source="src/ui/Tabs/Tabs.tsx — Figma ❖ Tab (tab, actionTab)" note="An action tab is a button setting a specific set of filters; its stats row takes the tab's type colour when active.">
        <Example label="Tabs">
          <div style={{ width: '100%' }}>
            <Tabs
              tabs={[
                { key: 'memos', label: 'Credit memos' },
                { key: 'outcomes', label: 'Dispute outcomes' },
                { key: 'archived', label: 'Archived', disabled: true },
              ]}
              active={tab}
              onSelect={setTab}
            />
          </div>
        </Example>
        <Example label="ActionTab · neutral / positive / negative">
          <div style={{ width: '100%' }}>
            <ActionTabs ariaLabel="Outcome filters">
              <ActionTab label="Total identified" value="$24,310.12" active={action === 'all'} onClick={() => setAction('all')} />
              <ActionTab label="Collected" value="$9,387.70" counter={4} type="positive" active={action === 'collected'} onClick={() => setAction('collected')} />
              <ActionTab label="Awaiting Biller" value="–" type="negative" active={action === 'awaiting'} onClick={() => setAction('awaiting')} />
            </ActionTabs>
          </div>
        </Example>
      </Section>

      <Section id="statistic" source="src/ui/Display/Display.tsx — Figma ❖ Stat Summary (statistic, statistic.text-group)">
        <Example label="StatisticGroup">
          <div style={{ width: '100%' }}>
            <StatisticGroup
              items={[
                { label: 'Total invoiced', value: '$36,000,000' },
                { label: 'Total variance', value: '$10,459.83', type: 'negative' },
                { label: 'Recovered', value: '$515,000', type: 'positive' },
              ]}
            />
          </div>
        </Example>
        <Example label="Statistic sizes (bare)">
          <Statistic bare size="large" label="Total variance" value="$10,459.83" type="accent" sub="Across 852 packages" />
          <Statistic bare label="Packages" value="852" />
          <Statistic bare size="small" label="Invoices" value="14" />
        </Example>
      </Section>

      <Section id="stepper" source="src/ui/Display/Display.tsx — Figma ❖ Stepper" note="Step isn't clickable — it is a simple indicator.">
        <Stepper steps={['Review findings', 'Prepare email', 'Send']} current={step} />
        <Example label="Advance">
          <Button size="small" onClick={() => setStep((s) => (s + 1) % 4)}>
            Next step
          </Button>
        </Example>
      </Section>

      <Section id="avatar" source="src/ui/Display/Display.tsx — Figma ❖ Avatar" note="Without an image, the default avatar shows initials on the muted background.">
        <Example label="small · large · huge">
          <Avatar name="Tori Matthews" size="small" />
          <Avatar name="Tori Matthews" />
          <Avatar name="Tori Matthews" size="huge" />
        </Example>
      </Section>

      <Section id="tooltip" source="src/ui/Tooltip/Tooltip.tsx — Figma ❖ Tooltip (Radix Tooltip)">
        <Example label="Sides · InfoTip">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Tooltip key={side} content={`Tooltip on ${side}`} side={side}>
              <Button size="small">{side}</Button>
            </Tooltip>
          ))}
          <InfoTip text="Variance is the difference between invoiced and expected charges. Tooltips wrap across several lines when the text is long." />
        </Example>
      </Section>

      <Section id="menu" source="src/ui/Menu/Menu.tsx — Figma action-list (Radix DropdownMenu)">
        <Example label="Actions menu">
          <Menu trigger={<Button iconRight={<ChevronDownIcon aria-hidden="true" />}>Account</Button>}>
            <MenuLabel>Tori Matthews</MenuLabel>
            <MenuItem icon={<ArrowDownTrayIcon aria-hidden="true" />} onSelect={() => showToast('neutral', 'Export started')}>
              Export
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger icon={<TrashIcon aria-hidden="true" />} onSelect={() => showToast('danger', 'Deleted')}>
              Delete
            </MenuItem>
            <MenuItem disabled onSelect={() => undefined}>
              Disabled item
            </MenuItem>
          </Menu>
        </Example>
      </Section>

      <Section id="banner" source="src/ui/Banner/Banner.tsx — Figma banner (info / success / warning / error)">
        <Banner type="info" title="Disputes are sent from your own email account." />
        <Banner type="success" title="Dispute sent to QuickBox" actions={<Button size="small">View email</Button>}>
          The Biller usually responds within 10 business days.
        </Banner>
        <Banner type="warning" title="Deadline in 4 days" onDismiss={() => showToast('neutral', 'Dismissed')} />
        <Banner type="error" title="The report could not be downloaded.">
          Please try again or contact your Implentio team.
        </Banner>
      </Section>

      <Section id="toast" source="src/ui/Toast/ToastProvider.tsx — Figma ❖ Toast (neutral / danger / positive)">
        <Example label="Trigger">
          <Button size="small" onClick={() => showToast('neutral', 'Link copied')}>
            Neutral
          </Button>
          <Button size="small" onClick={() => showToast('positive', 'Downloading CM-2026-0630.xlsx')}>
            Positive
          </Button>
          <Button size="small" onClick={() => showToast('danger', 'The report could not be downloaded.')}>
            Danger
          </Button>
        </Example>
      </Section>

      <Section id="modal" source="src/ui/Modal/Modal.tsx — Figma ❖ Popup (Radix Dialog)" note="Medium: max 668×644, padding 24. Large: max 1320×712, padding 32. Content scrolls past max height. At most 2 stacked.">
        <Example label="Open">
          <Button size="small" onClick={() => setModal('narrow')}>
            Narrow (420)
          </Button>
          <Button size="small" onClick={() => setModal('medium')}>
            Medium
          </Button>
          <Button size="small" onClick={() => setModal('large')}>
            Large with stepper
          </Button>
        </Example>
        <Modal open={modal === 'narrow'} onClose={() => setModal(null)} title="Invite member" width={420} footer={<Button variant="primary" onClick={() => setModal(null)}>Send invite</Button>} footerStart={<Button onClick={() => setModal(null)}>Cancel</Button>}>
          <TextField label="Email" placeholder="name@company.com" />
        </Modal>
        <Modal open={modal === 'medium'} onClose={() => setModal(null)} title="Update credit memo dispute" description="Record what the Biller issued." footer={<Button variant="primary" onClick={() => setModal(null)}>Save</Button>} footerStart={<Button onClick={() => setModal(null)}>Cancel</Button>}>
          <RadioGroup aria-label="Outcome" bordered value={radio} onValueChange={setRadio} options={[{ value: 'full', label: 'Collected in full' }, { value: 'partial', label: 'Partially collected' }, { value: 'none', label: 'Not issued' }]} />
          <TextArea label="Note" optional rows={3} />
        </Modal>
        <Modal open={modal === 'large'} onClose={() => setModal(null)} size="large" title="Prepare dispute" footer={<Button variant="primary" onClick={() => setModal(null)}>Next</Button>} footerStart={<Button onClick={() => setModal(null)}>Cancel</Button>}>
          <Stepper steps={['Review findings', 'Prepare email', 'Send']} current={0} />
          <p className="ds-body-medium" style={{ margin: 0 }}>
            Choose the findings you'd like to dispute with your Biller.
          </p>
          <div style={{ height: 900, borderRadius: 8, background: 'var(--ds-bg-disabled)' }} />
        </Modal>
      </Section>

      <Section
        id="filters"
        source="src/ui/Filters/Filters.tsx — Figma Filter-Group, Filter Field, filter-chip"
        note="Filter opens the filter types; the group stays open until Filter is clicked again, then shows 'Filter: N active'. Values are multi-select and apply immediately."
      >
        <div>
          <FilterButton filters={filters} />
        </div>
        <FilterGroup filters={filters} />
        <p className="ds-body-small ds-muted" style={{ margin: 0 }}>
          {rows.length} of {ROWS.length} rows match.
        </p>
      </Section>

      <Section id="table" source="src/ui/Table/Table.tsx — Figma Row & Cols (table-label, table-row.bg, value-difference)">
        <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>Invoice</th>
              <SortableHeader label="Invoice date" direction={sort} onSort={() => setSort(nextSort)} />
              <th className="num">Invoiced</th>
              <th className="num">Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link variant="accent" onClick={() => undefined}>
                    {r.id}
                  </Link>
                </td>
                <td>{r.date}</td>
                <td className="num">{usd(r.invoiced)}</td>
                <td className="num">
                  <ValueDiff type={r.variance < 0 ? 'negative' : r.variance > 0 ? 'positive' : 'none'}>{usd(r.variance)}</ValueDiff>
                </td>
                <td>
                  <StatusChip tone={r.status === 'variance' ? 'attention' : r.status === 'clear' ? 'success' : 'muted'}>{FILTER_FIELDS[1]?.options.find((o) => o.value === r.status)?.label}</StatusChip>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              <td />
              <td className="num">{usd(sorted.reduce((s, r) => s + r.invoiced, 0))}</td>
              <td className="num">{usd(sorted.reduce((s, r) => s + r.variance, 0))}</td>
              <td />
            </tr>
          </tbody>
        </Table>
        </TableScroll>
      </Section>

      <Section id="empty" source="src/ui/Display/Display.tsx — Figma empty-state (with / without filters) · Spinner (no Figma source)">
        <div className="db-card" style={{ padding: 0 }}>
          <EmptyState title="No filtered invoices" subtitle="Currently, you don't have any invoices by selected filters" action={<Button size="small" iconLeft={<PlusIcon aria-hidden="true" />}>Clear filters</Button>} />
        </div>
        <Example label="Spinner 16 / 32 / 44">
          <Spinner />
          <Spinner size={32} />
          <Spinner size={44} label="Loading" />
        </Example>
        <Example label="Brand assets (public/brand)">
          {BRAND_ASSETS.map((f) => (
            <img key={f} src={`/brand/${f}`} alt={f} style={{ maxHeight: 40, maxWidth: 120 }} />
          ))}
        </Example>
      </Section>
    </main>
  )
}
