import { CalendarDays, CheckSquare, Ellipsis, Sparkles, Sun, type LucideIcon } from 'lucide-react'

export type TabId = 'today' | 'calendar' | 'tasks' | 'ai' | 'more'

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Heute', icon: Sun },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'tasks', label: 'Aufgaben', icon: CheckSquare },
  { id: 'ai', label: 'KI', icon: Sparkles },
  { id: 'more', label: 'Mehr', icon: Ellipsis },
]
