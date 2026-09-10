import { Check, Copy, Lightbulb, LocateFixed, MapPin, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card, SectionLabel } from '../components/Card'
import { Segmented } from '../components/Segmented'
import { Toggle } from '../components/Toggle'
import { APP_URL, SHORTCUT_EXAMPLES } from '../lib/actions'
import { useConfig } from '../lib/config'
import { DASH_LAYOUTS, DASH_SECTIONS, useDashboard } from '../lib/dashboard'
import { ACCENTS, THEME_MODES, useTheme } from '../lib/theme'
import { DEFAULT_LOCATION, locateMe, useWeather } from '../lib/weather'
import { addWish, readWishes, removeWish, toggleWish, wishesToText, type Wish } from '../lib/wishes'
import { DEFAULT_STYLE, readGreetingStyle } from '../lib/birthdays'
import { useStore } from '../store/useStore'

const input = 'w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3'

/** Mehr → Erscheinungsbild: Hell/Dunkel + Akzentfarbe, sofort sichtbar */
export function AppearanceSection() {
  const { mode, accent, set } = useTheme()
  return (
    <>
      <SectionLabel>Erscheinungsbild</SectionLabel>
      <Card>
        <Segmented options={THEME_MODES} value={mode} onChange={(m) => set({ mode: m })} />
        <p className="mb-2 mt-4 text-[12px] font-semibold uppercase tracking-wider text-text-3">Akzentfarbe</p>
        <div className="flex items-center justify-between">
          {ACCENTS.map((a) => {
            const on = a.id === accent
            return (
              <button key={a.id} onClick={() => set({ accent: a.id })} aria-label={a.label} aria-pressed={on} className="press flex flex-col items-center gap-1.5">
                <span className={'grid h-10 w-10 place-items-center rounded-full transition-transform ' + (on ? 'scale-110 ring-2 ring-offset-2 ring-offset-elev' : '')} style={{ background: a.swatch, ['--tw-ring-color' as string]: a.swatch }}>
                  {on && <Check size={18} strokeWidth={3} className="text-white" />}
                </span>
                <span className={'text-[11px] font-semibold ' + (on ? 'text-text' : 'text-text-3')}>{a.label}</span>
              </button>
            )
          })}
        </div>
      </Card>
    </>
  )
}

/** Mehr → Dashboard: Abschnitte ein-/ausblenden */
export function DashboardSection() {
  const { on, toggle, layout, setLayout } = useDashboard()
  return (
    <>
      <SectionLabel>Dashboard</SectionLabel>
      <Card className="p-3">
        <Segmented options={DASH_LAYOUTS} value={layout} onChange={setLayout} />
        <p className="mt-2 px-1 text-[12px] text-text-3">{layout === 'glance' ? 'Alles Wichtige ohne Scrollen: Jetzt dran, Kennzahlen, Termine, To-dos und Routinen nebeneinander. Darunter Kalender, Erledigtes und Tagesabschluss.' : 'Karten untereinander wie bisher.'}</p>
      </Card>
      <Card className="mt-2 divide-y divide-line p-0">
        {DASH_SECTIONS.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="text-[15px]">{s.label}</p>
              <p className="text-[12px] text-text-3">{s.hint}</p>
            </div>
            <Toggle on={on[s.id]} onChange={(v) => toggle(s.id, v)} />
          </div>
        ))}
      </Card>
    </>
  )
}

/** Mehr → Wetter: Standort (Name + Koordinaten) oder per Standortdienst */
export function WeatherSection() {
  const { location, setLocation, data } = useWeather()
  const [name, setName] = useState(location.name)
  const [lat, setLat] = useState(String(location.lat))
  const [lon, setLon] = useState(String(location.lon))
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  const save = () => {
    const la = Number(lat.replace(',', '.')), lo = Number(lon.replace(',', '.'))
    if (!name.trim() || Number.isNaN(la) || Number.isNaN(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { flash('Bitte Name und gültige Koordinaten'); return }
    setLocation({ name: name.trim(), lat: la, lon: lo })
    flash('Standort gespeichert')
  }
  const locate = async () => {
    setBusy(true)
    try {
      const l = await locateMe()
      setName(l.name); setLat(String(l.lat)); setLon(String(l.lon))
      setLocation(l)
      flash('Standort: ' + l.name)
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Standort nicht verfügbar')
    }
    setBusy(false)
  }
  const reset = () => { setName(DEFAULT_LOCATION.name); setLat(String(DEFAULT_LOCATION.lat)); setLon(String(DEFAULT_LOCATION.lon)); setLocation(DEFAULT_LOCATION) }

  return (
    <>
      <SectionLabel>Wetter</SectionLabel>
      <Card>
        <p className="flex items-center gap-1.5 text-[15px]"><MapPin size={15} className="text-text-3" /> {location.name}{data ? ' · ' + data.temp + '°' : ''}</p>
        <p className="mb-2 text-[12px] text-text-3">Open-Meteo, kostenlos und ohne Account. Koordinaten z. B. aus Apple Karten (Ort teilen).</p>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ort" className={input} />
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Breite" inputMode="decimal" className={input + ' w-24'} />
          <input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="Länge" inputMode="decimal" className={input + ' w-24'} />
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={save} className="press flex-1 rounded-md bg-accent py-2.5 text-[14px] font-semibold text-on-accent">Speichern</button>
          <button onClick={locate} disabled={busy} className="press flex items-center gap-1.5 rounded-md bg-fill px-3 py-2.5 text-[14px] font-semibold disabled:opacity-50"><LocateFixed size={15} /> Standort</button>
          <button onClick={reset} className="press rounded-md bg-fill px-3 py-2.5 text-[14px] font-semibold text-text-2">Hannover</button>
        </div>
        {msg && <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">{msg}</p>}
      </Card>
    </>
  )
}

/** Mehr → Kurzbefehle: URL-Schema für Siri/Shortcuts mit Kopieren */
export function ShortcutsSection() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(APP_URL + url) } catch { /* Safari ohne Berechtigung */ }
    setCopied(url)
    setTimeout(() => setCopied(null), 1500)
  }
  return (
    <>
      <SectionLabel>Kurzbefehle (Siri)</SectionLabel>
      <Card className="divide-y divide-line p-0">
        <p className="px-4 pb-2 pt-3 text-[12px] text-text-3">
          In der Kurzbefehle-App: „Text diktieren" → „URL öffnen" mit einer dieser Adressen, <span className="font-mono">{'{text}'}</span> durch den diktierten Text ersetzen (URL-codiert). Die App öffnet sich, trägt ein und zeigt eine Bestätigung.
        </p>
        {SHORTCUT_EXAMPLES.map((s) => (
          <button key={s.url} onClick={() => copy(s.url)} className="press flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <span className="min-w-0">
              <span className="block text-[15px]">{s.label}</span>
              <span className="block text-[12px] text-text-3">{s.hint}</span>
              <span className="block truncate font-mono text-[11px] text-text-2">{APP_URL.replace('https://', '')}{s.url}</span>
            </span>
            {copied === s.url ? <Check size={16} className="shrink-0 text-green" /> : <Copy size={16} className="shrink-0 text-text-3" />}
          </button>
        ))}
      </Card>
      <CalendarShortcutCard />
    </>
  )
}

/** Schritte für den Kalender-Kurzbefehl (Apple Kalender → Worker), 14 Tage im Voraus */
const CALENDAR_STEPS: { title: string; detail?: string }[] = [
  { title: 'Kalenderereignisse suchen', detail: 'Genau ein Filter mit „Alle": Startdatum „ist innerhalb der nächsten" 2 Wochen (die Zeile „ist heute" umstellen, zweite Zeile löschen). Beschränken aus. „Mindestens eine" liefert nichts, Apple-Fehler.' },
  { title: 'Wiederhole mit jedem → Text', detail: 'Chips aus „Objekt wiederholen": Startdatum, Enddatum, Titel (das Objekt selbst), Ort, Ist ganztägig. Unformatiert lassen („10.09.2026, 08:00"), der Worker liest Datum und Uhrzeit daraus.' },
  { title: 'Text kombinieren', detail: 'Nach der Schleife, Trenner: Zeilenumbruch.' },
  { title: 'Inhalte abrufen (POST)', detail: 'Header X-Secret = dein aktuelles Token (wie unter Cloud-Sync), Haupttext JSON: text = kombinierter Text. Antwort „Unauthorized" = Token veraltet.' },
  { title: 'Als Automation täglich um 23:55', detail: 'Nicht morgens: Apple zählt „nächste 2 Wochen" ab jetzt, um 06:00 fehlen die ganztägigen Termine des Tages. Um 23:55 ist der nächste Tag komplett dabei. Kein zweiter Lauf tagsüber.' },
]

/** Mehr → Kurzbefehle: Rezept für den Kalender-Kurzbefehl mit Datum (Zeitraum 14 Tage) */
export function CalendarShortcutCard() {
  const url = useConfig((c) => c.url)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* Safari ohne Berechtigung */ }
    setCopied(what)
    setTimeout(() => setCopied(null), 1500)
  }
  const line = '[Startdatum] | [Enddatum] | [Titel] | [Ort] | [Ist ganztägig]'
  const calUrl = url ? url + '/calendar' : ''
  return (
    <>
      <SectionLabel>Kalender-Kurzbefehl (14 Tage)</SectionLabel>
      <Card className="p-0">
        <p className="px-4 pb-2 pt-3 text-[12px] text-text-3">
          Liefert die Apple-Termine der nächsten zwei Wochen an den Worker. Jede Zeile trägt vorne das Datum; Zeilen ohne Datum gelten weiter als heute.
        </p>
        <ol className="space-y-2 px-4 pb-3">
          {CALENDAR_STEPS.map((st, i) => (
            <li key={st.title} className="flex gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{st.title}</span>
                {st.detail && <span className="block text-[12px] text-text-3">{st.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
        <button onClick={() => copy('line', line)} className="press flex w-full items-center justify-between gap-3 border-t border-line px-4 py-3 text-left">
          <span className="min-w-0">
            <span className="block text-[12px] text-text-3">Zeile im Kurzbefehl (ergibt z. B. 12.09.2026, 08:00 | 12.09.2026, 09:30 | Uni | Leuphana)</span>
            <span className="block truncate font-mono text-[12px]">{line}</span>
          </span>
          {copied === 'line' ? <Check size={16} className="shrink-0 text-green" /> : <Copy size={16} className="shrink-0 text-text-3" />}
        </button>
        <button onClick={() => calUrl && copy('url', calUrl)} className="press flex w-full items-center justify-between gap-3 border-t border-line px-4 py-3 text-left">
          <span className="min-w-0">
            <span className="block text-[12px] text-text-3">Adresse für „Inhalte abrufen"</span>
            <span className="block truncate font-mono text-[12px]">{calUrl || 'Worker-URL unter Cloud-Sync eintragen'}</span>
          </span>
          {copied === 'url' ? <Check size={16} className="shrink-0 text-green" /> : <Copy size={16} className="shrink-0 text-text-3" />}
        </button>
      </Card>
    </>
  )
}

/** Mehr → Geburtstage: Ton und Beispiel für KI-Glückwünsche (extra.greetingStyle, synchronisiert) */
export function GreetingSection() {
  const extra = useStore((s) => s.extra)
  const setExtra = useStore((s) => s.setExtra)
  const saved = readGreetingStyle(extra)
  const [tone, setTone] = useState(saved.tone)
  const [example, setExample] = useState(saved.example)
  const [msg, setMsg] = useState<string | null>(null)
  const dirty = tone.trim() !== saved.tone || example.trim() !== saved.example
  const save = () => {
    setExtra({ greetingStyle: { tone: tone.trim() || DEFAULT_STYLE.tone, example: example.trim() } })
    setMsg('Gespeichert, die KI schreibt ab jetzt so'); setTimeout(() => setMsg(null), 2000)
  }
  return (
    <>
      <SectionLabel>Geburtstage</SectionLabel>
      <Card>
        <p className="text-[12px] text-text-3">Geburtstage kommen aus dem Apple-Kalender (Titel mit „Geburtstag" oder „gebby"). Auf der Heute-Seite erscheint dann „Glückwunsch schreiben". Damit die KI klingt wie du:</p>
        <label className="mb-1 mt-3 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Dein Ton</label>
        <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder={DEFAULT_STYLE.tone} className={input} />
        <label className="mb-1 mt-3 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Ein echter Glückwunsch von dir (Vorlage für Stil und Länge)</label>
        <textarea value={example} onChange={(e) => setExample(e.target.value)} rows={3} placeholder={'z. B. „Ey happy birthday!! Feier schön heute und wir holen das Bier nächste Woche nach 🍻"'} className={input + ' resize-none'} />
        <button onClick={save} disabled={!dirty} className="press mt-3 w-full rounded-md bg-accent py-2.5 text-[14px] font-semibold text-on-accent disabled:opacity-40">Speichern</button>
        {msg && <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">{msg}</p>}
      </Card>
    </>
  )
}

/** Mehr → Wünsche & Ideen: Sammler für die nächste Entwicklungs-Sitzung (liegt im State, synchronisiert) */
export function WishesSection() {
  const extra = useStore((s) => s.extra)
  const setExtra = useStore((s) => s.setExtra)
  const list = readWishes(extra)
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2000) }
  const save = (l: Wish[]) => setExtra({ wishes: l })
  const submit = () => { if (!text.trim()) return; save(addWish(list, text)); setText('') }
  const copy = async () => {
    const t = wishesToText(list)
    if (!t) { flash('Keine offenen Wünsche'); return }
    try {
      if (navigator.share) { await navigator.share({ text: t }); return }
      await navigator.clipboard.writeText(t)
      flash('Kopiert, ab in die nächste Claude-Sitzung')
    } catch { /* abgebrochen */ }
  }
  const open = list.filter((w) => !w.done), done = list.filter((w) => w.done)
  return (
    <>
      <SectionLabel>Wünsche & Ideen</SectionLabel>
      <Card className="p-0">
        <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Lightbulb size={17} /></span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Was soll die App noch können?" enterKeyHint="done" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
        {open.length === 0 && done.length === 0 && <p className="border-t border-line px-4 py-3 text-[12px] text-text-3">Fällt dir im Alltag etwas auf, schreib es hier rein. Beim nächsten Entwickeln wird die Liste der Einstieg.</p>}
        {open.map((w) => (
          <div key={w.id} className="flex items-center gap-3 border-t border-line px-4 py-2.5">
            <button onClick={() => save(toggleWish(list, w.id))} aria-label="Erledigt" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-fill-strong" />
            <span className="flex-1 text-[15px]">{w.text}</span>
            <button onClick={() => save(removeWish(list, w.id))} aria-label="Löschen" className="text-text-3"><Trash2 size={15} /></button>
          </div>
        ))}
        {done.length > 0 && (
          <details className="border-t border-line">
            <summary className="cursor-pointer list-none px-4 py-2 text-[12px] font-semibold text-text-3">Umgesetzt · {done.length}</summary>
            {done.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-2">
                <button onClick={() => save(toggleWish(list, w.id))} aria-label="Wieder öffnen" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><Check size={14} strokeWidth={3} /></button>
                <span className="flex-1 text-[14px] text-text-3 line-through">{w.text}</span>
                <button onClick={() => save(removeWish(list, w.id))} aria-label="Löschen" className="text-text-3"><Trash2 size={15} /></button>
              </div>
            ))}
          </details>
        )}
        {list.length > 0 && (
          <button onClick={copy} className="press flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-[13px] font-semibold text-accent"><Share2 size={14} /> Offene Wünsche teilen / kopieren</button>
        )}
        {msg && <p className="mx-3 mb-3 rounded-md bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">{msg}</p>}
      </Card>
    </>
  )
}
