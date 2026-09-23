import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './shell/AppLayout'
import { PlaceholderPage } from './shell/PlaceholderPage'
import { TokensPage } from './dev/TokensPage'

// Route scheme (see ARCHITECTURE.md): paths carry navigation, major tabs and
// selected entities; query params carry contextual selections and dev state.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/tracker/memos" replace /> },
      { path: '/tracker', element: <Navigate to="/tracker/memos" replace /> },
      { path: '/tracker/memos', element: <PlaceholderPage title="Parcel Credit Tracker — Credit Memos" /> },
      { path: '/tracker/outcomes', element: <PlaceholderPage title="Parcel Credit Tracker — Credit Outcomes" /> },
      { path: '/memos/:memoId', element: <PlaceholderPage title="Credit Memo — Summary & Findings" /> },
      { path: '/memos/:memoId/invoices', element: <PlaceholderPage title="Credit Memo — Invoices" /> },
      { path: '/memos/:memoId/activity', element: <PlaceholderPage title="Credit Memo — Activity & exports" /> },
      { path: '/invoices', element: <PlaceholderPage title="Invoices" /> },
      { path: '/invoices/:invoiceId', element: <PlaceholderPage title="Invoices" /> },
      { path: '/account', element: <Navigate to="/account/profile" replace /> },
      { path: '/account/:tab', element: <PlaceholderPage title="Account Settings" /> },
      { path: '/bi', element: <PlaceholderPage title="Logistics Cost Performance" /> },
      ...(import.meta.env.DEV ? [{ path: '/dev/tokens', element: <TokensPage /> }] : []),
      { path: '*', element: <PlaceholderPage title="Not found" /> },
    ],
  },
])
