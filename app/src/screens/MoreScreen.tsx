import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { buildInfo } from '../lib/buildInfo'

const SOON = ['Cloud-Sync (Worker-URL & Token)', 'Groq API-Key', 'Benachrichtigungen', 'Apple Shortcuts', 'Export / Import']

export function MoreScreen() {
  const rows: [string, string][] = [
    ['Version', buildInfo.version],
    ['Build', new Date(buildInfo.builtAt).toLocaleString('de-DE')],
    ['Commit', buildInfo.commit],
  ]
  return (
    <Screen title="Mehr" subtitle="Einstellungen & Module">
      <SectionLabel>App</SectionLabel>
      <Card className="divide-y divide-line p-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px]">{k}</span>
            <span className="font-mono text-[13px] text-text-2">{v}</span>
          </div>
        ))}
      </Card>
      <SectionLabel>Bald hier</SectionLabel>
      <Card className="divide-y divide-line p-0">
        {SOON.map((t) => (
          <div key={t} className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px]">{t}</span>
            <span className="text-[12px] font-semibold text-text-3">Meilenstein 3</span>
          </div>
        ))}
      </Card>
    </Screen>
  )
}
