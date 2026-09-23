import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './shell/AppLayout'
import { PlaceholderPage } from './shell/PlaceholderPage'
import { TokensPage } from './dev/TokensPage'
import { ComponentGallery } from './dev/ComponentGallery'
import { TrackerPage } from './features/tracker/TrackerPage'
import { MemoPage } from './features/memo/MemoPage'
import { InvoicesPage } from './features/invoices/InvoicesPage'
import { AccountPage } from './features/account/AccountPage'

// Route scheme (see ARCHITECTURE.md): paths carry navigation, major tabs and
// selected entities; query params carry contextual selections and dev state.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/tracker/memos" replace /> },
      { path: '/tracker', element: <Navigate to="/tracker/memos" replace /> },
      { path: '/tracker/:tab', element: <TrackerPage /> },
      { path: '/memos/:memoId', element: <MemoPage tab="summary" /> },
      { path: '/memos/:memoId/invoices', element: <MemoPage tab="invoices" /> },
      { path: '/memos/:memoId/activity', element: <MemoPage tab="activity" /> },
      { path: '/invoices', element: <InvoicesPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/account/:tab', element: <Navigate to="/account" replace /> },
      { path: '/bi', element: <PlaceholderPage title="Logistics Cost Performance" /> },
      ...(import.meta.env.DEV
        ? [
            { path: '/dev/tokens', element: <TokensPage /> },
            { path: '/dev/components', element: <ComponentGallery /> },
          ]
        : []),
      { path: '*', element: <PlaceholderPage title="Not found" /> },
    ],
  },
])
