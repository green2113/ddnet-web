
type Props = {
  channels: Array<{ id: string; name: string }>
  activeId?: string
}

export default function SidebarChannels({ channels, activeId }: Props) {
  return (
    <aside
      className="w-64 hidden lg:flex lg:flex-col p-3"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
    >
      <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
        text channels
      </div>
      <div className="flex-1 space-y-1">
        {channels.map((c) => (
          <div
            key={c.id}
            className="px-2 py-1 rounded cursor-pointer flex items-center gap-2 hover:opacity-90"
            style={{
              color: 'var(--text-primary)',
              background: c.id === activeId ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'transparent',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>#</span>
            <span className="truncate">{c.name}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}


