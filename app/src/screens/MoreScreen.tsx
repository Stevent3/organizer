import { Check, CloudOff, CloudUpload, Download, RefreshCw, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { buildInfo } from '../lib/buildInfo'
import { isConfigured, useConfig } from '../lib/config'
import { importFromV7, readV3, v3Summary } from '../lib/importV3'
import { syncNow, useSyncStatus } from '../lib/syncEngine'
import { WorkerApi } from '../lib/worker'
import { useStore } from '../store/useStore'
import type { AppState } from '../lib/model'

export function MoreScreen() {
  return (
    <Screen title="Mehr" subtitle="Einstellungen & Module">
      <SyncSection />
      <DataSection />
      <AiSection />
      <PushSection />
      <SectionLabel>App</SectionLabel>
      <Card className="divide-y divide-line p-0">
        <Row k="Version" v={buildInfo.version} />
        <Row k="Build" v={new Date(buildInfo.builtAt).toLocaleString('de-DE')} />
        <Row k="Commit" v={buildInfo.commit} />
      </Card>
    </Screen>
  )
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[15px]">{k}</span>
      <span className="text-right font-mono text-[13px] text-text-2">{v}</span>
    </div>
  )
}

function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-[13px] font-medium text-accent">{msg}</p>
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const show = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3500)
  }
  return { msg, show }
}

const input = 'w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3'
const btn = 'press flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[14px] font-semibold'

function SyncSection() {
  const cfg = useConfig()
  const sync = useSyncStatus()
  const [url, setUrl] = useState(cfg.url)
  const [secret, setSecret] = useState(cfg.secret)
  const [editing, setEditing] = useState(!isConfigured(cfg))
  const { msg, show } = useToast()

  const save = async () => {
    const api = new WorkerApi(url.trim().replace(/\/$/, ''), secret.trim())
    try {
      const r = await api.ping()
      if (!r.ok) throw new Error('kein ok')
      cfg.set({ url, secret })
      setEditing(false)
      show('Worker erreichbar, Verbindung gespeichert')
      syncNow()
    } catch (e) {
      show('Worker antwortet nicht: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const statusLabel =
    sync.status === 'unconfigured' ? 'Nicht verbunden'
    : sync.status === 'syncing' ? 'Synchronisiere …'
    : sync.status === 'error' ? 'Fehler: ' + (sync.error ?? '')
    : sync.lastOk ? 'Zuletzt ' + new Date(sync.lastOk).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : 'Bereit'

  return (
    <>
      <SectionLabel>Cloud-Sync</SectionLabel>
      <Card className="p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-[15px]">
            {sync.status === 'ok' ? <Check size={16} className="text-green" /> : sync.status === 'error' || sync.status === 'unconfigured' ? <CloudOff size={16} className="text-red" /> : <RefreshCw size={16} className="text-text-3" />}
            Status
          </span>
          <span className="max-w-[60%] truncate text-right text-[13px] text-text-2">{statusLabel}</span>
        </div>
        {editing ? (
          <div className="space-y-2 border-t border-line px-4 py-3">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://organizer.….workers.dev" inputMode="url" autoCapitalize="none" className={input} />
            <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Secret Token" type="password" autoCapitalize="none" className={input} />
            <p className="text-[12px] text-text-3">URL und Token werden mit der bisherigen App geteilt. Wenn dort alles läuft, ist hier schon alles eingetragen.</p>
            <div className="flex gap-2">
              <button onClick={save} disabled={!url.trim() || !secret.trim()} className={btn + ' flex-1 bg-accent text-on-accent disabled:opacity-40'}>Testen & speichern</button>
              {isConfigured(cfg) && <button onClick={() => { setUrl(cfg.url); setSecret(cfg.secret); setEditing(false) }} className={btn + ' bg-fill'}>Abbrechen</button>}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line border-t border-line">
            <button onClick={() => syncNow()} className="press flex w-full items-center justify-between px-4 py-3 text-[15px]">
              Jetzt synchronisieren <RefreshCw size={16} className={'text-text-3 ' + (sync.status === 'syncing' ? 'animate-spin' : '')} />
            </button>
            <button onClick={() => setEditing(true)} className="press flex w-full items-center justify-between px-4 py-3 text-[15px]">
              Verbindung ändern <span className="max-w-[55%] truncate font-mono text-[12px] text-text-3">{cfg.url.replace(/^https?:\/\//, '')}</span>
            </button>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[15px]">Änderungen hochladen</p>
                <p className="text-[12px] text-text-3">Aus, solange die alte App dein Hauptgerät ist. An: v8 schreibt Aufgaben, Energie und Termine in die Cloud, die alte App liest sie weiter.</p>
              </div>
              <Toggle on={cfg.writeSync} onChange={(v) => { cfg.set({ writeSync: v }); if (v) syncNow() }} />
            </div>
          </div>
        )}
        <div className="px-4 pb-3"><Toast msg={msg} /></div>
      </Card>
    </>
  )
}

function DataSection() {
  const { msg, show } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [v3, setV3] = useState(() => v3Summary(readV3()))
  const snapshot = useStore((s) => s.snapshot)
  const replaceState = useStore((s) => s.replaceState)
  const eventCount = useStore((s) => s.events.length)
  const taskCount = useStore((s) => Object.values(s.tasks).reduce((n, l) => n + l.length, 0))
  const counts = { events: eventCount, tasks: taskCount }

  useEffect(() => setV3(v3Summary(readV3())), [])

  const doImportV7 = () => {
    if (importFromV7()) show('v7-Daten übernommen')
    else show('Keine v7-Daten auf diesem Gerät gefunden')
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'organizer', version: 8, exportedAt: new Date().toISOString(), state: snapshot() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'organizer-export-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const importJson = async (f: File | undefined) => {
    if (!f) return
    try {
      const j = JSON.parse(await f.text()) as { state?: AppState }
      if (!j.state || j.state.version !== 8) throw new Error('kein v8-Export')
      replaceState({ ...j.state, updatedAt: Date.now() })
      show('Import fertig')
    } catch (e) {
      show('Import fehlgeschlagen: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <>
      <SectionLabel>Daten</SectionLabel>
      <Card className="divide-y divide-line p-0">
        <Row k="In dieser App" v={counts.events + ' Termine, ' + counts.tasks + ' Aufgaben'} />
        <button onClick={doImportV7} className="press flex w-full items-center justify-between px-4 py-3 text-[15px]">
          <span>
            Aus der alten App übernehmen
            {v3 && <span className="block text-[12px] text-text-3">{v3.events} Termine, {v3.tasks} Aufgaben (v7, Stand {v3.updatedAt ? new Date(v3.updatedAt).toLocaleDateString('de-DE') : 'unbekannt'})</span>}
            {!v3 && <span className="block text-[12px] text-text-3">Keine v7-Daten auf diesem Gerät</span>}
          </span>
          <Download size={16} className="text-text-3" />
        </button>
        <button onClick={exportJson} className="press flex w-full items-center justify-between px-4 py-3 text-[15px]">Export (JSON) <Upload size={16} className="text-text-3" /></button>
        <button onClick={() => fileRef.current?.click()} className="press flex w-full items-center justify-between px-4 py-3 text-[15px]">Import (JSON) <CloudUpload size={16} className="text-text-3" /></button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
        <div className="px-4 pb-1"><Toast msg={msg} /></div>
      </Card>
    </>
  )
}

function AiSection() {
  const cfg = useConfig()
  const [key, setKey] = useState(cfg.groqKey)
  const { msg, show } = useToast()
  return (
    <>
      <SectionLabel>KI</SectionLabel>
      <Card className="p-4">
        <p className="text-[15px]">Groq API-Key</p>
        <p className="mb-2 text-[12px] text-text-3">Bleibt nur auf diesem Gerät. Wird mit der alten App geteilt.</p>
        <div className="flex gap-2">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="gsk_…" type="password" autoCapitalize="none" className={input} />
          <button onClick={() => { cfg.set({ groqKey: key }); show('Gespeichert') }} className={btn + ' bg-accent text-on-accent'}>OK</button>
        </div>
        <Toast msg={msg} />
      </Card>
    </>
  )
}

function PushSection() {
  const cfg = useConfig()
  const [sub, setSub] = useState<boolean | null>(null)
  useEffect(() => {
    if (!isConfigured(cfg)) return
    new WorkerApi(cfg.url, cfg.secret).pushStatus().then((r) => setSub(r.subscribed)).catch(() => setSub(null))
  }, [cfg])
  return (
    <>
      <SectionLabel>Benachrichtigungen</SectionLabel>
      <Card className="divide-y divide-line p-0">
        <Row k="Push im Worker" v={sub == null ? '–' : sub ? 'aktiv (alte App)' : 'nicht aktiv'} />
        <p className="px-4 py-3 text-[12px] text-text-3">Push bleibt bis zum Umzug bei der alten App, damit nichts doppelt oder gar nicht ankommt. Beim Wechsel auf v8 aktivierst du es hier einmal neu.</p>
      </Card>
    </>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={'relative ml-3 h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 ' + (on ? 'bg-green' : 'bg-fill-strong')}>
      <span className={'absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ' + (on ? 'translate-x-[23px]' : 'translate-x-[3px]')} />
    </button>
  )
}
