import { Check, Copy, LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Card, SectionLabel } from '../components/Card'
import { Segmented } from '../components/Segmented'
import { Toggle } from '../components/Toggle'
import { APP_URL, SHORTCUT_EXAMPLES } from '../lib/actions'
import { DASH_SECTIONS, useDashboard } from '../lib/dashboard'
import { ACCENTS, THEME_MODES, useTheme } from '../lib/theme'
import { DEFAULT_LOCATION, locateMe, useWeather } from '../lib/weather'

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
  const { on, toggle } = useDashboard()
  return (
    <>
      <SectionLabel>Dashboard</SectionLabel>
      <Card className="divide-y divide-line p-0">
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
    </>
  )
}
