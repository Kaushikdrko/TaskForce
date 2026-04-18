import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { AccountTab } from '@/components/settings/AccountTab'
import { ScheduleTab } from '@/components/settings/ScheduleTab'
import { AiTab } from '@/components/settings/AiTab'
import { SupportTab } from '@/components/settings/SupportTab'

const TABS = [
  { id: 'account',  label: 'Account' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'ai',       label: 'AI Settings' },
  { id: 'support',  label: 'Support' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('account')

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar activeFolderId={null} onFolderSelect={() => {}} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-sky-50 bg-white flex items-center px-6 shrink-0">
          <h2 className="text-lg font-medium text-slate-700">Settings</h2>
        </header>

        {/* Tab bar */}
        <div className="border-b border-sky-50 bg-white px-6 flex gap-0.5 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-sky-400 text-sky-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'account'  && <AccountTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
          {activeTab === 'ai'       && <AiTab />}
          {activeTab === 'support'  && <SupportTab />}
        </div>
      </main>
    </div>
  )
}
