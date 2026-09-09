type Option<T extends string> = { id: T; label: string }

export function Segmented<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value))
  return (
    <div className="relative grid rounded-full bg-fill p-1" style={{ gridTemplateColumns: 'repeat(' + options.length + ', 1fr)' }} role="tablist">
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-full bg-elev shadow-sm transition-transform duration-300"
        style={{ width: 'calc((100% - 8px) / ' + options.length + ')', left: 4, transform: 'translateX(' + idx * 100 + '%)', transitionTimingFunction: 'var(--ease-out)' }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={'relative z-10 rounded-full py-1.5 text-[13px] font-semibold transition-colors ' + (o.id === value ? 'text-text' : 'text-text-2')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
