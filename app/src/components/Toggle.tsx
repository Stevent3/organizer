/** iOS-Schalter */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className={'relative ml-3 h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200 ' + (on ? 'bg-green' : 'bg-fill-strong')}>
      <span className={'absolute left-0 top-[3px] h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ' + (on ? 'translate-x-[23px]' : 'translate-x-[3px]')} />
    </button>
  )
}
