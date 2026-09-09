import type { LucideIcon } from 'lucide-react'

type Tab<T extends string> = { id: T; label: string; icon: LucideIcon }

type Props<T extends string> = { tabs: Tab<T>[]; active: T; onChange: (id: T) => void }

export function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <nav
      role="tablist"
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-elev/85 backdrop-blur-xl pb-safe"
    >
      <div className="mx-auto flex max-w-lg items-stretch" style={{ height: 'var(--tabbar-h)' }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const on = id === active
          const color = on ? 'text-accent' : 'text-text-3'
          const pill = on ? 'bg-accent-soft' : ''
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              onClick={() => onChange(id)}
              className={'press flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold tracking-wide transition-colors ' + color}
            >
              <span className={'grid h-7 w-12 place-items-center rounded-full transition-colors duration-300 ' + pill}>
                <Icon size={21} strokeWidth={on ? 2.4 : 2} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
