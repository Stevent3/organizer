import { CalendarDays, CheckSquare, ClipboardList, Ellipsis, Sun, type LucideIcon } from 'lucide-react'

export type TabId = 'today' | 'calendar' | 'tasks' | 'planner' | 'more'

/** Die KI ist kein Tab mehr, sondern die schwebende Sprechblase (AiBubble) */
export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Heute', icon: Sun },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'tasks', label: 'To-dos', icon: CheckSquare },
  { id: 'planner', label: 'Planer', icon: ClipboardList },
  { id: 'more', label: 'Mehr', icon: Ellipsis },
]
