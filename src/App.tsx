import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { useState } from 'react'
import { router } from './router'
import { DataSourceProvider } from './data/DataSourceProvider'
import { ToastProvider } from './ui/Toast/ToastProvider'

export default function App() {
  const [queryClient] = useState(() => new QueryClient())
  // Scenario selection is boot-time state (temporary demo infrastructure —
  // see ARCHITECTURE.md); the harness bar switches it via full navigation.
  const [scenarioId] = useState(() => new URLSearchParams(window.location.search).get('scenario'))
  return (
    <QueryClientProvider client={queryClient}>
      <DataSourceProvider scenarioId={scenarioId}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </DataSourceProvider>
    </QueryClientProvider>
  )
}
