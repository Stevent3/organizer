import { create } from 'zustand'
import { isConfigured, useConfig } from './config'
import { applyCalendar, mergeRemoteState, toWireState } from './sync'
import { todayKey } from './time'
import { WorkerApi } from './worker'
import { useStore } from '../store/useStore'

export type SyncStatus = 'unconfigured' | 'idle' | 'syncing' | 'ok' | 'error'

type SyncState = { status: SyncStatus; lastOk: number | null; error: string | null; remoteUpdatedAt: number }
export const useSyncStatus = create<SyncState>()(() => ({ status: 'idle', lastOk: null, error: null, remoteUpdatedAt: 0 }))

let pushTimer: ReturnType<typeof setTimeout> | null = null
let running = false

function api(): WorkerApi | null {
  const c = useConfig.getState()
  return isConfigured(c) ? new WorkerApi(c.url, c.secret) : null
}

/** Pull (Kalender + State), danach Push, falls lokal neuer und Schreib-Sync aktiv */
export async function syncNow(): Promise<boolean> {
  const w = api()
  if (!w) {
    useSyncStatus.setState({ status: 'unconfigured' })
    return false
  }
  if (running) return false
  running = true
  useSyncStatus.setState({ status: 'syncing', error: null })
  const day = todayKey()
  try {
    const [cal, st] = await Promise.all([w.getCalendar(), w.getState()])
    const store = useStore.getState()
    let next = store.snapshot()
    const merged = mergeRemoteState(next, st.state, day)
    if (merged) next = merged
    next = applyCalendar(next, cal.events ?? [], day)
    store.replaceState(next)
    const remoteUpdatedAt = Number(st.state?.updatedAt ?? 0)
    useSyncStatus.setState({ remoteUpdatedAt })
    if (useConfig.getState().writeSync && next.updatedAt > remoteUpdatedAt) await pushNow()
    useSyncStatus.setState({ status: 'ok', lastOk: Date.now(), error: null })
    return true
  } catch (e) {
    useSyncStatus.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    return false
  } finally {
    running = false
  }
}

export async function pushNow(): Promise<void> {
  const w = api()
  if (!w || !useConfig.getState().writeSync) return
  const s = useStore.getState().snapshot()
  await w.postState(toWireState(s, todayKey()))
  useSyncStatus.setState({ remoteUpdatedAt: s.updatedAt })
}

/** Debounce 3 s nach jeder Änderung (wie v7) */
export function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    pushNow().catch((e) => useSyncStatus.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }))
  }, 3000)
}

let started = false
/** Liefert das Promise des ersten Pulls, damit Aufrufer (Kurzbefehle) auf echte Daten warten können */
export function startSyncEngine(): Promise<boolean> {
  if (started) return Promise.resolve(false)
  started = true
  useStore.subscribe((s, prev) => {
    if (s.updatedAt !== prev.updatedAt) schedulePush()
  })
  const onVisible = () => document.visibilityState === 'visible' && syncNow()
  document.addEventListener('visibilitychange', onVisible)
  return syncNow()
}
