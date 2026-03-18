import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 p-6 pt-24 overflow-x-auto">
        <Outlet />
      </main>
      <Sidebar />
    </div>
  )
}
