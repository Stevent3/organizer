import { useEffect } from 'react'
import { TabBar } from '../components/TabBar'
import { TABS } from './tabs'
import { TodayScreen } from '../screens/TodayScreen'
import { MoreScreen } from '../screens/MoreScreen'
import { CalendarScreen } from '../screens/CalendarScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { PlannerScreen } from '../screens/PlannerScreen'
import { AiBubble } from '../components/ai/AiBubble'
import { autoImportOnce } from '../lib/importV3'
import { applySetupFromUrl } from '../lib/setupLink'
import { startSyncEngine } from '../lib/syncEngine'
import { useUi } from '../lib/ui'
import { applyActionFromUrl } from '../lib/actions'

export default function App() {
  const tab = useUi((u) => u.tab)
  const setTab = useUi((u) => u.go)
  const toast = useUi((u) => u.toast)

  useEffect(() => {
    applySetupFromUrl()
    autoImportOnce()
    startSyncEngine()
    // Kurzbefehle (Siri/Shortcuts) erst nach dem Import auswerten, damit sie auf echte Daten treffen
    applyActionFromUrl()
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
      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 18px)' }}>
          <p className="animate-fade-up max-w-lg rounded-full bg-text px-4 py-2 text-center text-[13px] font-semibold text-bg shadow-lg">{toast}</p>
        </div>
      )}
      <AiBubble />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  )
}
