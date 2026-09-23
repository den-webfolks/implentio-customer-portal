import { Outlet } from 'react-router'

export function AppLayout() {
  return (
    <div className="app-root">
      <Outlet />
    </div>
  )
}
