import { migrateV3, type V3State } from './migrate'
import { mergeRemoteState } from './sync'
import { todayKey } from './time'
import { useStore } from '../store/useStore'

const V3_KEY = 'organizer_v3'
const FLAG = 'organizer_v8_imported'

export function readV3(): V3State | null {
  try {
    const raw = localStorage.getItem(V3_KEY)
    return raw ? (JSON.parse(raw) as V3State) : null
  } catch {
    return null
  }
}

export function v3Summary(v3: V3State | null) {
  if (!v3) return null
  const tasks = Object.values(v3.tasks ?? {}).reduce((n, l) => n + (l?.length ?? 0), 0)
  return { tasks, events: (v3.schedule?.length ?? 0) + (v3.calendarEvents?.length ?? 0), updatedAt: v3.updatedAt ?? 0 }
}

/** v7-Daten aus localStorage übernehmen (gleiche Origin). Andere Tage in v8 bleiben erhalten. */
export function importFromV7(): boolean {
  const v3 = readV3()
  if (!v3) return false
  const store = useStore.getState()
  const local = store.snapshot()
  const forced = { ...v3, updatedAt: Math.max(Number(v3.updatedAt ?? 0), local.updatedAt + 1) }
  const merged = mergeRemoteState(local, forced as Record<string, unknown>, todayKey()) ?? migrateV3(v3, todayKey())
  store.replaceState(merged)
  try { localStorage.setItem(FLAG, '1') } catch { /* egal */ }
  return true
}

/** Beim ersten Start automatisch übernehmen, wenn v8 noch leer ist */
export function autoImportOnce() {
  try {
    if (localStorage.getItem(FLAG)) return
  } catch { return }
  const s = useStore.getState()
  const empty = s.events.length === 0 && Object.values(s.tasks).every((l) => l.length === 0)
  if (empty && readV3()) importFromV7()
  else {
    try { localStorage.setItem(FLAG, '1') } catch { /* egal */ }
  }
}
