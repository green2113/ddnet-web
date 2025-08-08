
type Props = {
  accent?: string
}

export default function SidebarGuilds({ accent = 'var(--accent)' }: Props) {
  return (
    <aside
      className="w-16 hidden md:flex flex-col items-center py-3 gap-3"
      style={{ background: 'var(--rail-bg)', borderRight: '1px solid var(--border)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl grid place-items-center text-white text-base font-bold select-none cursor-pointer"
        style={{ background: accent }}
      >
        DD
      </div>
      <div className="w-12 h-[2px] rounded bg-black/10" />
      <button
        className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] text-white cursor-pointer"
        style={{ background: 'var(--input-bg)' }}
        title="Add"
      >
        +
      </button>
    </aside>
  )
}


