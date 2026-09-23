/* Dev-only token showcase — used to verify the ported tokens against the
   prototype side by side. Not part of the product. */

const purple = ['100', '200', '300', '400', '500'] as const
const orange = ['100', '200', '300', '400', '500'] as const
const gray = ['100', '200', '300', '400', '500', '600', '700', '800', '900'] as const

function Swatch({ token }: { token: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 72,
          height: 48,
          borderRadius: 'var(--imp-radius-sm)',
          border: '1px solid var(--imp-border)',
          background: `var(${token})`,
        }}
      />
      <code style={{ fontSize: 10 }}>{token}</code>
    </div>
  )
}

function Row({ label, tokens }: { label: string; tokens: readonly string[] }) {
  return (
    <section>
      <h2 className="imp-h4" style={{ margin: '24px 0 8px' }}>
        {label}
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tokens.map((t) => (
          <Swatch key={t} token={t} />
        ))}
      </div>
    </section>
  )
}

export function TokensPage() {
  return (
    <main style={{ padding: 32, maxWidth: 960 }}>
      <p className="imp-eyebrow">Dev</p>
      <h1 className="imp-h2">Design tokens</h1>

      <Row label="Purple" tokens={purple.map((s) => `--imp-purple-${s}`)} />
      <Row label="Orange" tokens={orange.map((s) => `--imp-orange-${s}`)} />
      <Row label="Gray" tokens={gray.map((s) => `--imp-gray-${s}`)} />
      <Row
        label="Semantic"
        tokens={[
          '--imp-success',
          '--imp-success-bg',
          '--imp-warning',
          '--imp-warning-bg',
          '--imp-error',
          '--imp-error-bg',
          '--imp-ink',
          '--imp-paper',
        ]}
      />

      <h2 className="imp-h4" style={{ margin: '24px 0 8px' }}>
        Type
      </h2>
      <p className="imp-h1">Sora H1 — $10,459.83</p>
      <p className="imp-h3">Sora H3 — Parcel Credit Tracker</p>
      <p className="imp-lead">Montserrat lead — review findings, manage the dispute.</p>
      <p className="imp-body">Montserrat body — Each credit memo represents one review period.</p>
      <p className="imp-small">Montserrat small — Downloaded by Tori Matthews · Jul 15, 2026</p>
      <p className="imp-eyebrow">Eyebrow — Reconciliation</p>
      <p className="imp-num">$9,387.70</p>

      <h2 className="imp-h4" style={{ margin: '24px 0 8px' }}>
        Shadows
      </h2>
      <div style={{ display: 'flex', gap: 24, padding: 16 }}>
        {(['xs', 'sm', 'md'] as const).map((s) => (
          <div
            key={s}
            style={{
              width: 120,
              height: 72,
              background: 'var(--imp-white)',
              border: '1.5px solid var(--imp-ink)',
              borderRadius: 'var(--imp-radius-md)',
              boxShadow: `var(--imp-shadow-${s})`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <code>shadow-{s}</code>
          </div>
        ))}
        {(['soft-sm', 'soft-md'] as const).map((s) => (
          <div
            key={s}
            style={{
              width: 120,
              height: 72,
              background: 'var(--imp-white)',
              borderRadius: 'var(--imp-radius-md)',
              boxShadow: `var(--imp-shadow-${s})`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <code>{s}</code>
          </div>
        ))}
      </div>
    </main>
  )
}
