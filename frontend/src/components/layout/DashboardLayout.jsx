import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TickerBar from './TickerBar'

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 p-3 md:p-6 pt-16 md:pt-24 pb-10 overflow-x-auto">
        <Outlet />
      </main>
      <Sidebar />
      <TickerBar />
    </div>
  )
}
