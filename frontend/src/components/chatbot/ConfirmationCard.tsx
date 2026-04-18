import { CheckCircle2, Calendar, Trash2, Clock, CalendarDays, RefreshCw } from 'lucide-react'
import type { ToolCall, ToolName } from '@/types/chat.types'

const TOOL_CONFIG: Record<
  ToolName,
  { icon: React.ElementType; label: string; color: string; bg: string; border: string }
> = {
  create_task:      { icon: CheckCircle2, label: 'Task created',      color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
  update_task:      { icon: RefreshCw,    label: 'Task updated',      color: 'text-sky-600',     bg: 'bg-sky-50',      border: 'border-sky-100' },
  delete_task:      { icon: Trash2,       label: 'Task deleted',      color: 'text-red-500',     bg: 'bg-red-50',      border: 'border-red-100' },
  create_event:     { icon: Calendar,     label: 'Event created',     color: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-100' },
  delete_event:     { icon: Trash2,       label: 'Event deleted',     color: 'text-red-500',     bg: 'bg-red-50',      border: 'border-red-100' },
  get_schedule:     { icon: CalendarDays, label: 'Schedule fetched',  color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-100' },
  suggest_schedule: { icon: Clock,        label: 'Finding time slot', color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-100' },
}

function getSubtitle(toolCall: ToolCall): string {
  const { tool, args } = toolCall
  if ((tool === 'create_task' || tool === 'update_task') && args.title) return args.title as string
  if (tool === 'create_event' && args.title) return args.title as string
  if (tool === 'suggest_schedule' && args.task_title) return args.task_title as string
  return ''
}

export function ConfirmationCard({ toolCall }: { toolCall: ToolCall }) {
  const cfg = TOOL_CONFIG[toolCall.tool]
  if (!cfg) return null

  const Icon = cfg.icon
  const subtitle = getSubtitle(toolCall)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cfg.bg} ${cfg.border}`}
    >
      <Icon size={12} className={`shrink-0 ${cfg.color}`} />
      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
      {subtitle && (
        <span className="text-slate-400 truncate">— {subtitle}</span>
      )}
    </div>
  )
}
