import { Sidebar } from '@/components/dashboard/Sidebar'
import { ChatWindow } from '@/components/chatbot/ChatWindow'

export default function ChatPage() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      <Sidebar activeFolderId={null} onFolderSelect={() => {}} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  )
}
