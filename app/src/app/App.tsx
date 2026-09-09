import { useEffect, useState } from 'react'
import { TabBar } from '../components/TabBar'
import { TABS, type TabId } from './tabs'
import { TodayScreen } from '../screens/TodayScreen'
import { MoreScreen } from '../screens/MoreScreen'
import { PlaceholderScreen } from '../screens/PlaceholderScreen'
import { CalendarScreen } from '../screens/CalendarScreen'
import { autoImportOnce } from '../lib/importV3'
import { startSyncEngine } from '../lib/syncEngine'

export default function App() {
  const [tab, setTab] = useState<TabId>('today')

  useEffect(() => {
    autoImportOnce()
    startSyncEngine()
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <main
        className="flex-1 overflow-y-auto pt-safe"
        style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        {tab === 'today' && <TodayScreen onOpenCalendar={() => setTab('calendar')} />}
        {tab === 'calendar' && <CalendarScreen />}
        {tab === 'tasks' && <PlaceholderScreen title="Aufgaben" hint="Listen und Bring-Einkaufsliste folgen in Meilenstein 4." />}
        {tab === 'ai' && <PlaceholderScreen title="KI" hint="Chat mit Tool-Calling folgt in Meilenstein 4." />}
        {tab === 'more' && <MoreScreen />}
      </main>
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
    </div>
  )
}
