import { MapPin, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { describeCode, useWeather } from '../lib/weather'
import { Sheet } from './Sheet'

/** Wetter-Chip im Dashboard-Kopf; Tap öffnet Heute/Morgen im Detail */
export function WeatherChip() {
  const { data, loading, error, location, refresh } = useWeather()
  const [open, setOpen] = useState(false)
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  const now = data ? describeCode(data.code, data.isDay) : null
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Wetter" className="press mb-2 flex items-center gap-1.5 rounded-full bg-elev px-3 py-1.5 text-[13px] font-semibold shadow-sm">
        {data && now ? (
          <><span className="text-[16px] leading-none">{now.emoji}</span>{data.temp}°</>
        ) : loading ? (
          <RefreshCw size={14} className="animate-spin text-text-3" />
        ) : (
          <span className="text-text-3">Wetter</span>
        )}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Wetter">
        <p className="flex items-center gap-1 text-[13px] text-text-2"><MapPin size={13} /> {location.name}</p>
        {data && now ? (
          <>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-[56px] leading-none">{now.emoji}</span>
              <div>
                <p className="text-[40px] font-bold leading-none tracking-tight">{data.temp}°</p>
                <p className="mt-1 text-[14px] text-text-2">{now.text} · gefühlt {data.feels}°</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.days.slice(0, 2).map((d, i) => {
                const dd = describeCode(d.code)
                return (
                  <div key={d.date} className="rounded-md bg-fill px-3 py-2.5">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-text-3">{i === 0 ? 'Heute' : 'Morgen'}</p>
                    <p className="mt-1 text-[15px] font-semibold">{dd.emoji} {d.max}° / {d.min}°</p>
                    <p className="text-[12px] text-text-2">{dd.text}{d.rain > 0 ? ' · ' + d.rain + '% Regen' : ''}</p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-text-3">Open-Meteo · Stand {new Date(data.fetchedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · Standort unter „Mehr" ändern</p>
          </>
        ) : (
          <p className="mt-3 text-[14px] text-text-2">{loading ? 'Lade …' : error ? 'Wetter gerade nicht erreichbar (' + error + ').' : 'Noch keine Daten.'}</p>
        )}
        <button onClick={() => void refresh(true)} disabled={loading} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-fill py-2.5 text-[14px] font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Aktualisieren
        </button>
      </Sheet>
    </>
  )
}
