import { Calendar, MessageSquare, Settings, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { FoldersTab } from '@/components/dashboard/FoldersTab'
import logo from '@/assets/logo.png'

interface SidebarProps {
  activeFolderId: string | null
  onFolderSelect: (id: string | null) => void
}

export function Sidebar({ activeFolderId, onFolderSelect }: SidebarProps) {
  const location = useLocation()
  const { profile, user, signOut } = useAuthStore()

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User'
  const email = user?.email || ''

  const navItems = [
    { label: 'Calendar', icon: Calendar, path: '/dashboard' },
    { label: 'Chat',     icon: MessageSquare, path: '/chat' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ]

  return (
    <aside className="w-[240px] border-r border-sky-100 bg-white flex flex-col h-full overflow-y-auto">
      {/* Brand */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <img src={logo} alt="TaskForce" className="h-16 w-auto object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-600 font-medium'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Live Folders */}
        <FoldersTab
          activeFolderId={activeFolderId}
          onFolderSelect={onFolderSelect}
        />
      </nav>

      {/* User Info / Bottom */}
      <div className="p-4 border-t border-sky-50 space-y-2">
        <div className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left">
          <div className="w-8 h-8 rounded-full bg-sky-200 flex items-center justify-center text-sky-600 font-semibold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors text-left text-xs font-medium"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
