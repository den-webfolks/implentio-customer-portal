/**
 * The dark demo-harness strip — TEMPORARY prototype/dev infrastructure,
 * URL-gated (see demo-mode.ts). Ported from the prototype's harness bar
 * (template ~1156–1190) minus the product-notes toggle (notes were mined
 * into PRODUCT.md instead of being rebuilt in-app).
 */
import { useLocation } from 'react-router'
import { scenarios, type ScenarioId } from './scenarios'
import { scenarioUrl } from './demo-mode'

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  processing: 'Audit in progress',
  'report-ready': 'Report ready — new',
  'report-downloaded': 'Report downloaded',
  'updated-v2': 'Updated report — Version 2',
  'updated-downloaded': 'Updated report downloaded',
  'findings-unavailable': 'Detailed findings unavailable',
  'all-clear': 'All clear — no significant variance',
  'fcm-awaiting': 'FCM dispute — awaiting Biller response',
  'fcm-full': 'FCM dispute — fully collected',
  'pwv-partial': 'PWV dispute — partly collected',
  'lcc-denied': 'LCC dispute — denied by Biller',
  'dispute-not-started': 'Dispute flow — ready to dispute',
  'dispute-prep-started': 'Dispute flow — dispute draft',
  'dispute-plus-new': 'Dispute flow — more findings available',
  'dispute-awaiting': 'Dispute flow — awaiting Biller response',
  'dispute-recorded': 'Dispute flow — outcomes partially recorded',
  'dispute-finalized': 'Dispute flow — dispute completed',
}

export default function HarnessBar({ activeScenarioId }: { activeScenarioId: string }) {
  const location = useLocation()
  const active = scenarios.find((s) => s.id === activeScenarioId)?.id ?? 'report-ready'

  const switchTo = (id: string) => {
    const scenario = scenarios.find((s) => s.id === id)
    window.location.assign(scenarioUrl(id, scenario?.initialLocation))
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '9px 24px',
        background: 'var(--imp-ink)',
        color: '#fff',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          font: '700 11px var(--imp-font-body)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.75,
        }}
      >
        Prototype Harness
      </span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px var(--imp-font-display)' }}>
        Demo scenario
        <select
          value={active}
          onChange={(e) => switchTo(e.target.value)}
          style={{
            background: '#26224f',
            color: '#fff',
            border: '1.5px solid #4b4680',
            borderRadius: 7,
            padding: '5px 9px',
            font: '600 12px var(--imp-font-body)',
            outline: 'none',
          }}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.available}>
              {SCENARIO_LABELS[s.id]}
              {s.available ? '' : ' (Phase 1.5)'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.location.assign(scenarioUrl(active, location.pathname))}
          aria-label="Reload scenario"
          title="Reload scenario"
          style={{
            background: 'none',
            border: '1.5px solid #4b4680',
            borderRadius: 7,
            width: 26,
            height: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 12a9 9 0 1 1 3 6.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M3 17v-5h5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </label>
      <span style={{ marginLeft: 'auto', font: '500 11px var(--imp-font-body)', opacity: 0.6 }}>
        Internal demo tool — fixture data
      </span>
    </div>
  )
}
