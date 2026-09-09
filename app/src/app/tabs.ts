import { CalendarDays, CheckSquare, Ellipsis, Sun, type LucideIcon } from 'lucide-react'

export type TabId = 'today' | 'calendar' | 'tasks' | 'more'

/** Die KI ist kein Tab mehr, sondern die schwebende Sprechblase (AiBubble) */
export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Heute', icon: Sun },
  { id: 'calendar', label: 'Kalender', icon: CalendarDays },
  { id: 'tasks', label: 'Aufgaben', icon: CheckSquare },
  { id: 'more', label: 'Mehr', icon: Ellipsis },
]
