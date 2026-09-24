import { usePageTitle } from './usePageTitle'

export function PlaceholderPage({ title }: { title: string }) {
  usePageTitle(title)
  return (
    <div style={{ padding: 32 }}>
      <h1>{title}</h1>
      <p>Screen not implemented yet (Phase 1 in progress).</p>
    </div>
  )
}
