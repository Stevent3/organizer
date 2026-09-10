import { create } from 'zustand'

/**
 * Wetter über Open-Meteo (gratis, kein Key, CORS offen). Standort ist konfigurierbar,
 * Standard Hannover. Ergebnis wird 30 Minuten im localStorage gehalten.
 */
export type Location = { name: string; lat: number; lon: number }
export const DEFAULT_LOCATION: Location = { name: 'Hannover', lat: 52.3759, lon: 9.732 }

export type DayForecast = { date: string; max: number; min: number; rain: number; code: number }
export type Weather = {
  fetchedAt: number
  location: string
  temp: number
  feels: number
  code: number
  isDay: boolean
  days: DayForecast[] // heute, morgen
}

const KEY_LOC = 'organizer_v8_weather_location'
const KEY_CACHE = 'organizer_v8_weather_cache'
export const WEATHER_TTL = 30 * 60 * 1000

/** WMO-Wettercode → Emoji + deutscher Text (Open-Meteo weather_code) */
export function describeCode(code: number, isDay = true): { emoji: string; text: string } {
  if (code === 0) return { emoji: isDay ? '☀️' : '🌙', text: 'Klar' }
  if (code === 1) return { emoji: isDay ? '🌤️' : '🌙', text: 'Überwiegend klar' }
  if (code === 2) return { emoji: '⛅', text: 'Teils bewölkt' }
  if (code === 3) return { emoji: '☁️', text: 'Bedeckt' }
  if (code === 45 || code === 48) return { emoji: '🌫️', text: 'Nebel' }
  if (code >= 51 && code <= 57) return { emoji: '🌦️', text: 'Nieselregen' }
  if (code >= 61 && code <= 67) return { emoji: '🌧️', text: code >= 65 ? 'Starker Regen' : 'Regen' }
  if (code >= 71 && code <= 77) return { emoji: '🌨️', text: 'Schnee' }
  if (code >= 80 && code <= 82) return { emoji: '🌦️', text: 'Schauer' }
  if (code === 85 || code === 86) return { emoji: '🌨️', text: 'Schneeschauer' }
  if (code >= 95 && code <= 99) return { emoji: '⛈️', text: 'Gewitter' }
  return { emoji: '🌡️', text: 'Wetter' }
}

export function readLocation(): Location {
  try {
    const raw = localStorage.getItem(KEY_LOC)
    if (!raw) return DEFAULT_LOCATION
    const l = JSON.parse(raw) as Partial<Location>
    if (typeof l.lat === 'number' && typeof l.lon === 'number') return { name: String(l.name || 'Standort'), lat: l.lat, lon: l.lon }
  } catch { /* egal */ }
  return DEFAULT_LOCATION
}

export function forecastUrl(l: Location): string {
  const p = new URLSearchParams({
    latitude: String(l.lat),
    longitude: String(l.lon),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'Europe/Berlin',
    forecast_days: '2',
  })
  return 'https://api.open-meteo.com/v1/forecast?' + p.toString()
}

type ApiResponse = {
  current?: { temperature_2m?: number; apparent_temperature?: number; weather_code?: number; is_day?: number }
  daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[]; weather_code?: number[] }
}

/** Antwort von Open-Meteo in unser Format bringen (rein, testbar) */
export function parseForecast(r: ApiResponse, location: string, fetchedAt = Date.now()): Weather {
  const c = r.current ?? {}
  const d = r.daily ?? {}
  const days: DayForecast[] = (d.time ?? []).map((date, i) => ({
    date,
    max: Math.round(d.temperature_2m_max?.[i] ?? 0),
    min: Math.round(d.temperature_2m_min?.[i] ?? 0),
    rain: Math.round(d.precipitation_probability_max?.[i] ?? 0),
    code: d.weather_code?.[i] ?? 0,
  }))
  return {
    fetchedAt,
    location,
    temp: Math.round(c.temperature_2m ?? 0),
    feels: Math.round(c.apparent_temperature ?? c.temperature_2m ?? 0),
    code: c.weather_code ?? 0,
    isDay: (c.is_day ?? 1) === 1,
    days,
  }
}

function readCache(): Weather | null {
  try {
    const raw = localStorage.getItem(KEY_CACHE)
    return raw ? (JSON.parse(raw) as Weather) : null
  } catch {
    return null
  }
}

type WeatherStore = {
  data: Weather | null
  loading: boolean
  error: string | null
  location: Location
  /** Holt neu, wenn der Cache älter als 30 Minuten ist (oder force) */
  refresh: (force?: boolean) => Promise<void>
  setLocation: (l: Location) => void
}

export const useWeather = create<WeatherStore>()((set, get) => ({
  data: readCache(),
  loading: false,
  error: null,
  location: readLocation(),
  refresh: async (force = false) => {
    const { data, location, loading } = get()
    if (loading) return
    if (!force && data && data.location === location.name && Date.now() - data.fetchedAt < WEATHER_TTL) return
    set({ loading: true, error: null })
    try {
      const res = await fetch(forecastUrl(location))
      if (!res.ok) throw new Error('Status ' + res.status)
      const w = parseForecast((await res.json()) as ApiResponse, location.name)
      try { localStorage.setItem(KEY_CACHE, JSON.stringify(w)) } catch { /* egal */ }
      set({ data: w, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  },
  setLocation: (l) => {
    try { localStorage.setItem(KEY_LOC, JSON.stringify(l)) } catch { /* egal */ }
    set({ location: l })
    void get().refresh(true)
  },
}))

/** Aktuellen Standort ermitteln und benennen (Reverse-Geocoding über Open-Meteo gibt es nicht → Koordinaten als Name-Fallback) */
export async function locateMe(): Promise<Location> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Kein Standortdienst')); return }
    navigator.geolocation.getCurrentPosition(resolve, (e) => reject(new Error(e.message || 'Standort verweigert')), { timeout: 10000, maximumAge: 300000 })
  })
  const lat = Math.round(pos.coords.latitude * 1000) / 1000, lon = Math.round(pos.coords.longitude * 1000) / 1000
  let name = lat + ', ' + lon
  try {
    const res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=' + lat + '&lon=' + lon, { headers: { Accept: 'application/json' } })
    if (res.ok) {
      const j = (await res.json()) as { address?: { city?: string; town?: string; village?: string; municipality?: string } }
      name = j.address?.city || j.address?.town || j.address?.village || j.address?.municipality || name
    }
  } catch { /* Koordinaten bleiben */ }
  return { name, lat, lon }
}
