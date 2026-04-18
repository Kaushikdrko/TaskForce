import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, FolderOpen } from 'lucide-react'
import springApi from '@/lib/springApi'

export interface Folder {
  id: string
  name: string
  color: string
  icon?: string
}

interface FoldersTabProps {
  activeFolderId: string | null
  onFolderSelect: (id: string | null) => void
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#64748b', // slate
]

export function FoldersTab({ activeFolderId, onFolderSelect }: FoldersTabProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [saving, setSaving] = useState(false)

  const fetchFolders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await springApi.get<Folder[]>('/api/folders')
      if (Array.isArray(data)) setFolders(data)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFolders() }, [fetchFolders])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    try {
      const { data } = await springApi.post<Folder>('/api/folders', {
        name: newName.trim(),
        color: newColor,
      })
      setFolders(prev => [...prev, data])
      setNewName('')
      setCreating(false)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await springApi.delete(`/api/folders/${id}`)
      setFolders(prev => prev.filter(f => f.id !== id))
      if (activeFolderId === id) onFolderSelect(null)
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <span>Folders</span>
        <button
          onClick={() => setCreating(v => !v)}
          className="hover:text-sky-500 transition-colors"
          title="New folder"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* All folders shortcut */}
      <ul className="mt-1 space-y-0.5">
        <li>
          <button
            onClick={() => onFolderSelect(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
              activeFolderId === null
                ? 'bg-sky-50 text-sky-600 font-medium'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FolderOpen size={13} className="shrink-0" />
            All folders
          </button>
        </li>

        {loading ? (
          <li className="flex items-center justify-center py-4">
            <Loader2 size={14} className="animate-spin text-slate-300" />
          </li>
        ) : folders.length > 0 ? (
          folders.map(folder => (
            <li key={folder.id}>
              <button
                onClick={() => onFolderSelect(folder.id)}
                className={`group w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  activeFolderId === folder.id
                    ? 'bg-sky-50 text-sky-700 font-medium'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-transparent group-hover:ring-slate-200 transition-all"
                  style={{ backgroundColor: folder.color }}
                />
                <span className="flex-1 text-left truncate">{folder.name}</span>
                <button
                  onClick={e => handleDelete(e, folder.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all ml-1 shrink-0"
                  title="Delete folder"
                >
                  <Trash2 size={11} />
                </button>
              </button>
            </li>
          ))
        ) : (
          <li className="px-3 py-2 text-[10px] text-slate-300 italic">No folders yet</li>
        )}
      </ul>

      {/* Inline create form */}
      {creating && (
        <form
          onSubmit={handleCreate}
          className="mt-2 mx-3 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2"
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-300 bg-white"
          />
          {/* Color swatches */}
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`w-4 h-4 rounded-full transition-transform ${
                  newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 py-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="flex-1 py-1 bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : null}
              Create
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
