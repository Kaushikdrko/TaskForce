import { Sidebar } from '@/components/dashboard/Sidebar'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { RightPanel } from '@/components/dashboard/RightPanel'

export default function Dashboard() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content (Calendar) */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-sky-50 bg-white flex items-center px-6 shrink-0">
          <h2 className="text-lg font-medium text-slate-700">My Dashboard</h2>
          <div className="ml-auto flex items-center gap-4">
             {/* We can add search or notifications here later */}
             <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200" />
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden">
          <CalendarView />
        </div>
      </main>

      {/* Right Information Panel */}
      <RightPanel />
    </div>
  )
}
