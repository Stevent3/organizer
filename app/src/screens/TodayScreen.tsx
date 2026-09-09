import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { buildInfo } from '../lib/buildInfo'

function greeting(h: number) {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Hallo'
  return 'Guten Abend'
}

const STEPS: [string, string][] = [
  ['Design-System & App-Shell', 'aktiv'],
  ['Kalender Tag / Woche / Monat', 'Meilenstein 2'],
  ['Sync, Migration, Einstellungen', 'Meilenstein 3'],
  ['Aufgaben, KI, Planer', 'Meilenstein 4'],
]

export function TodayScreen() {
  const now = new Date()
  return (
    <Screen title={greeting(now.getHours())} subtitle={format(now, 'EEEE, d. MMMM', { locale: de })}>
      <Card tone="accent" className="mt-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider opacity-80">Organizer Next</p>
        <p className="mt-1 text-[22px] font-bold leading-snug">Das Redesign ist im Bau.</p>
        <p className="mt-2 text-[14px] opacity-90">
          Diese Version läuft parallel zur bisherigen App. Deine Daten bleiben in v7, bis der Umzug fertig ist.
        </p>
        <p className="mt-3 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">{buildInfo.version}</p>
      </Card>

      <SectionLabel>Jetzt dran</SectionLabel>
      <Card>
        <p className="text-[15px] font-semibold">Noch nichts geplant</p>
        <p className="mt-1 text-[13px] text-text-2">Termine, Aufgaben und der KI-Tagesplan erscheinen hier, sobald der Sync angebunden ist.</p>
      </Card>

      <SectionLabel>Nächste Schritte</SectionLabel>
      <Card className="divide-y divide-line p-0">
        {STEPS.map(([t, s]) => (
          <div key={t} className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px]">{t}</span>
            <span className={'text-[12px] font-semibold ' + (s === 'aktiv' ? 'text-green' : 'text-text-3')}>{s}</span>
          </div>
        ))}
      </Card>
    </Screen>
  )
}
