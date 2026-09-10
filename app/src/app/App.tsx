import { useEffect, useState } from 'react'
import { TabBar } from '../components/TabBar'
import { TABS, type TabId } from './tabs'
import { TodayScreen } from '../screens/TodayScreen'
import { MoreScreen } from '../screens/MoreScreen'
import { CalendarScreen } from '../screens/CalendarScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { PlannerScreen } from '../screens/PlannerScreen'
import { AiBubble } from '../components/ai/AiBubble'
import { autoImportOnce } from '../lib/importV3'
import { applySetupFromUrl } from '../lib/setupLink'
import { startSyncEngine } from '../lib/syncEngine'

export default function App() {
  const [tab, setTab] = useState<TabId>('today')

  useEffect(() => {
    applySetupFromUrl()
    autoImportOnce()
    startSyncEngine()
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 'calc(var(--safe-top) + 24px)', paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 96px)' }}
      >
        {tab === 'today' && <TodayScreen />}
        {tab === 'calendar' && <CalendarScreen />}
        {tab === 'tasks' && <TasksScreen />}
        {tab === 'planner' && <PlannerScreen />}
        {tab === 'more' && <MoreScreen />}
      </main>
      <AiBubble />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  )
}
