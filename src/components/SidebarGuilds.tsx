type Server = {
  id: string
  name: string
}

type Props = {
  accent?: string
  servers?: Server[]
  activeId?: string
  onSelect?: (serverId: string) => void
  onCreate?: () => void
  t: {
    sidebarGuilds: {
      add: string
    }
  }
}

export default function SidebarGuilds({
  accent = 'var(--accent)',
  servers = [],
  activeId,
  onSelect,
  onCreate,
  t,
}: Props) {
  return (
    <aside
      className="w-16 hidden md:flex flex-col items-center py-3 gap-3 h-full"
      style={{ background: 'var(--rail-bg)' }}
    >
      <button
        type="button"
        onClick={() => onSelect?.('@me')}
        className="w-12 h-12 rounded-xl grid place-items-center text-white text-[18px] select-none cursor-pointer transition-all"
        style={{
          background: activeId === '@me' ? accent : 'var(--input-bg)',
          boxShadow: activeId === '@me' ? '0 10px 18px rgba(0,0,0,0.25)' : 'none',
        }}
        title="홈"
        aria-label="홈"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-3v6H5a1 1 0 0 1-1-1v-8.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="w-8 h-[2px] rounded bg-black/15" />
      {servers.map((server) => {
        const isActive = server.id === activeId
        const label = server.name?.slice(0, 2).toUpperCase() || 'SV'
        return (
          <button
            key={server.id}
            type="button"
            onClick={() => onSelect?.(server.id)}
            className="w-12 h-12 rounded-2xl grid place-items-center text-white text-sm font-bold select-none cursor-pointer transition-all"
            style={{
              background: isActive ? accent : 'var(--input-bg)',
              transform: isActive ? 'scale(1.04)' : 'scale(1)',
            }}
            title={server.name}
          >
            {label}
          </button>
        )
      })}
      <div className="w-12 h-[2px] rounded bg-black/10" />
      <button
        className="w-12 h-12 rounded-2xl grid place-items-center text-[22px] text-white cursor-pointer"
        style={{ background: 'var(--input-bg)' }}
        title={t.sidebarGuilds.add}
        onClick={onCreate}
      >
        +
      </button>
    </aside>
  )
}
