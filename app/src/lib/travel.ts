// „Losgehen um" (ideen #11, App-Seite): Fahrzeit vom Worker holen (Nominatim + OSRM, dort gecacht), hier je Ort gemerkt.
import { useEffect, useState } from 'react'
import { isConfigured, useConfig } from './config'
import { looksLikePlace } from './maps'
import { WorkerApi } from './worker'

const cache = new Map<string, number>()
const pending = new Map<string, Promise<number>>()

export async function travelMinutes(place: string): Promise<number> {
  const key = place.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key)!
  if (pending.has(key)) return pending.get(key)!
  const c = useConfig.getState()
  if (!isConfigured(c)) return 0
  const p = new WorkerApi(c.url, c.secret).travel(place).then((r) => r.minutes || 0).catch(() => 0)
  pending.set(key, p)
  const min = await p
  pending.delete(key)
  cache.set(key, min)
  return min
}

/** Abfahrt für einen Termin: Start − Fahrzeit − 5 Min Puffer; null solange unbekannt */
export function departureMin(startMin: number, travel: number): number | null {
  return travel > 0 ? startMin - travel - 5 : null
}

/** Hook: Fahrzeit zum Ort (0 = keine), lädt einmal je Ort */
export function useTravel(place: string | undefined, fromCalendar = false): number {
  const [min, setMin] = useState(() => (place && cache.has(place.trim().toLowerCase()) ? cache.get(place.trim().toLowerCase())! : 0))
  useEffect(() => {
    if (!place || !looksLikePlace(place, fromCalendar)) { setMin(0); return }
    let alive = true
    void travelMinutes(place).then((m) => { if (alive) setMin(m) })
    return () => { alive = false }
  }, [place, fromCalendar])
  return min
}

/** Für Tests: Cache leeren */
export function resetTravelCache() { cache.clear(); pending.clear() }
