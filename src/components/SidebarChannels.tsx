import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type VoiceMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
}

type Props = {
  channels: Array<{ id: string; name: string; hidden?: boolean; type?: 'text' | 'voice' }>
  activeId?: string
  serverName?: string
  adminIds?: string[]
  voiceMembersByChannel?: Record<string, VoiceMember[]>
  unreadByChannel?: Record<string, boolean>
  onAddAdmin?: (id: string) => void
  onRemoveAdmin?: (id: string) => void
  onSelect?: (channelId: string) => void
  onCreateChannel?: (type: 'text' | 'voice') => void
  onDeleteChannel?: (channelId: string) => void
  onToggleChannelHidden?: (channelId: string, hidden: boolean) => void
  onRenameChannel?: (channelId: string, name: string) => void
  onReorderChannels?: (orderedIds: string[]) => void
  canManage?: boolean
}

export default function SidebarChannels({
  channels,
  activeId,
  serverName = 'DDNet Server',
  adminIds = [],
  voiceMembersByChannel = {},
  unreadByChannel = {},
  onAddAdmin,
  onRemoveAdmin,
  onSelect,
  onCreateChannel,
  onDeleteChannel,
  onToggleChannelHidden,
  onRenameChannel,
  onReorderChannels,
  canManage = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [showHiddenChannels, setShowHiddenChannels] = useState(false)
  const [channelMenu, setChannelMenu] = useState<{ visible: boolean; x: number; y: number; channel: { id: string; name: string; hidden?: boolean } | null }>({
    visible: false,
    x: 0,
    y: 0,
    channel: null,
  })
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const dragIdRef = useRef<string | null>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (event.button !== 0) return
      setChannelMenu((prev) => ({ ...prev, visible: false }))
    }
    window.addEventListener('mousedown', closeMenu)
    return () => window.removeEventListener('mousedown', closeMenu)
  }, [])

  const hiddenChannelsCount = canManage ? channels.filter((channel) => channel.hidden).length : 0
  const visibleChannels = channels.filter((channel) => {
    if (!channel.hidden) return true
    return canManage && showHiddenChannels
  })
  const textChannels = visibleChannels.filter((channel) => channel.type !== 'voice')
  const voiceChannels = visibleChannels.filter((channel) => channel.type === 'voice')

  return (
    <aside className="w-64 flex flex-col p-0 h-full" style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}>
      {/* 서버 헤더 */}
      <div ref={wrapRef} className="relative select-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
            if (!open) {
              setChannelMenu((prev) => ({ ...prev, visible: false }))
            }
          }}
          className="w-full px-3 h-12 flex items-center justify-between cursor-pointer"
          style={{ color: 'var(--text-primary)', background: 'var(--header-bg)', borderBottom: '1px solid var(--border)', transition: 'background-color 150ms ease' }}
          onMouseEnter={(e) => ((e.currentTarget.style.background as any) = 'var(--hover-bg)')}
          onMouseLeave={(e) => ((e.currentTarget.style.background as any) = 'var(--header-bg)')}
        >
          <span className="truncate font-medium">{serverName}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div
            className="absolute left-2 right-2 z-40 mt-2 rounded-xl p-2 text-sm"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.32)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {canManage ? (
              <>
                <MenuItem
                  icon="settings"
                  label="서버 설정"
                  bold
                  onClick={() => {
                    setShowSettings(true)
                    setOpen(false)
                  }}
                />
                <div
                  className="m-2"
                  style={{ height: '1px', background: 'var(--divider)', opacity: 0.25 }}
                />
              </>
            ) : null}
            <MenuItem icon="bell" label="알림 설정" bold />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>text channels</span>
          {canManage ? (
            <button
              type="button"
              aria-label="Add text channel"
              className="rounded-md p-1 cursor-pointer hover-surface"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => {
                e.stopPropagation()
                onCreateChannel?.('text')
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
        {canManage && hiddenChannelsCount > 0 ? (
          <button
            type="button"
            className="mb-2 text-[11px] uppercase tracking-wide px-2 py-1 rounded cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setShowHiddenChannels((prev) => !prev)}
          >
            {showHiddenChannels ? '숨겨진 채널 숨기기' : `숨겨진 채널 보기 (${hiddenChannelsCount})`}
          </button>
        ) : null}
        <div className="flex-1 space-y-1">
          {textChannels.map((c) => (
            <div
              key={c.id}
              className="px-2 py-1 rounded cursor-pointer flex items-center gap-2 hover:opacity-90"
              style={{
                color: 'var(--text-primary)',
                background: c.id === activeId ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'transparent',
                opacity: c.hidden ? 0.6 : 1,
                userSelect: 'none',
              }}
              draggable={canManage}
              onClick={() => onSelect?.(c.id)}
              onDoubleClick={() => {
                if (!canManage) return
                const name = window.prompt('채널 이름을 입력하세요', c.name)
                if (!name) return
                onRenameChannel?.(c.id, name)
              }}
              onDragStart={(event) => {
                if (!canManage) return
                dragIdRef.current = c.id
                if (event.dataTransfer) {
                  event.dataTransfer.setData('text/plain', c.id)
                  event.dataTransfer.effectAllowed = 'move'
                }
              }}
              onDragEnd={() => {
                dragIdRef.current = null
              }}
              onDragOver={(e) => {
                if (!canManage || !dragIdRef.current) return
                e.preventDefault()
              }}
              onDrop={(e) => {
                if (!canManage) return
                e.preventDefault()
                const draggedId = dragIdRef.current
                dragIdRef.current = null
                if (!draggedId || draggedId === c.id) return
                const updated = [...channels]
                const fromIndex = updated.findIndex((channel) => channel.id === draggedId)
                const toIndex = updated.findIndex((channel) => channel.id === c.id)
                if (fromIndex === -1 || toIndex === -1) return
                const [moved] = updated.splice(fromIndex, 1)
                updated.splice(toIndex, 0, moved)
                onReorderChannels?.(updated.map((channel) => channel.id))
              }}
              onContextMenu={(e) => {
                if (!canManage) return
                e.preventDefault()
                setOpen(false)
                setChannelMenu({ visible: true, x: e.clientX, y: e.clientY, channel: c })
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>#</span>
              <span
                className="truncate"
                style={{
                  color: c.id === activeId ? 'var(--text-primary)' : unreadByChannel[c.id] ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {c.name}
              </span>
              {c.hidden ? (
                <span className="ml-auto text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                  숨김
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>voice channels</span>
          {canManage ? (
            <button
              type="button"
              aria-label="Add voice channel"
              className="rounded-md p-1 cursor-pointer hover-surface"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => {
                e.stopPropagation()
                onCreateChannel?.('voice')
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="flex-1 space-y-1">
          {voiceChannels.map((c) => {
            const members = voiceMembersByChannel[c.id] || []
            return (
              <div key={c.id} className="space-y-1">
                <div
                  className="px-2 py-1 rounded cursor-pointer flex items-center gap-2 hover:opacity-90"
                  style={{
                    color: 'var(--text-primary)',
                    background: c.id === activeId ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'transparent',
                    opacity: c.hidden ? 0.6 : 1,
                    userSelect: 'none',
                  }}
                  draggable={canManage}
                  onClick={() => onSelect?.(c.id)}
                  onDoubleClick={() => {
                    if (!canManage) return
                    const name = window.prompt('채널 이름을 입력하세요', c.name)
                    if (!name) return
                    onRenameChannel?.(c.id, name)
                  }}
                  onDragStart={(event) => {
                    if (!canManage) return
                    dragIdRef.current = c.id
                    if (event.dataTransfer) {
                      event.dataTransfer.setData('text/plain', c.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }
                  }}
                  onDragEnd={() => {
                    dragIdRef.current = null
                  }}
                  onDragOver={(e) => {
                    if (!canManage || !dragIdRef.current) return
                    e.preventDefault()
                  }}
                  onDrop={(e) => {
                    if (!canManage) return
                    e.preventDefault()
                    const draggedId = dragIdRef.current
                    dragIdRef.current = null
                    if (!draggedId || draggedId === c.id) return
                    const updated = [...channels]
                    const fromIndex = updated.findIndex((channel) => channel.id === draggedId)
                    const toIndex = updated.findIndex((channel) => channel.id === c.id)
                    if (fromIndex === -1 || toIndex === -1) return
                    const [moved] = updated.splice(fromIndex, 1)
                    updated.splice(toIndex, 0, moved)
                    onReorderChannels?.(updated.map((channel) => channel.id))
                  }}
                  onContextMenu={(e) => {
                    if (!canManage) return
                    e.preventDefault()
                    setOpen(false)
                    setChannelMenu({ visible: true, x: e.clientX, y: e.clientY, channel: c })
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M5 9v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M9 8v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M13 6v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M17 8c1.5 1.5 1.5 6 0 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M19.5 6c2.5 3 2.5 9 0 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span
                    className="truncate"
                    style={{
                      color: c.id === activeId ? 'var(--text-primary)' : unreadByChannel[c.id] ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {c.name}
                  </span>
                  {members.length > 0 ? (
                    <span className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {members.length}
                    </span>
                  ) : null}
                  {c.hidden ? (
                    <span className="ml-2 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      숨김
                    </span>
                  ) : null}
                </div>
                {members.length > 0 ? (
                  <div className="pl-6 space-y-1">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-5 h-5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <span className="truncate">{member.displayName || member.username}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      {channelMenu.visible && channelMenu.channel && canManage
        ? createPortal(
            <div
              className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm"
              style={{ top: channelMenu.y, left: channelMenu.x, background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                onClick={() => {
                  const name = window.prompt('채널 이름을 입력하세요', channelMenu.channel!.name)
                  if (!name) return
                  onRenameChannel?.(channelMenu.channel!.id, name)
                  setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                }}
              >
                채널 이름
              </button>
              <button
                className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                onClick={() => {
                  const nextHidden = !channelMenu.channel!.hidden
                  if (nextHidden) {
                    setShowHiddenChannels(true)
                  }
                  onToggleChannelHidden?.(channelMenu.channel!.id, nextHidden)
                  setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                }}
              >
                {channelMenu.channel.hidden ? '채널 표시' : '채널 숨기기'}
              </button>
              <button
                className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                style={{ color: '#f87171' }}
                onClick={() => {
                  onDeleteChannel?.(channelMenu.channel!.id)
                  setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                }}
              >
                채널 삭제
              </button>
            </div>,
            document.body
          )
        : null}
      {showSettings && canManage
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex" style={{ background: 'rgba(0,0,0,0.65)' }}>
              <div className="w-[280px] bg-[#1e1f2b] p-6 text-sm text-white">
                <div className="text-xs uppercase opacity-60 mb-3">DD Server</div>
                <button className="w-full text-left px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  서버 프로필
                </button>
                <div className="mt-6 text-xs uppercase opacity-60 mb-3">관리</div>
                <button className="w-full text-left px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  관리자
                </button>
              </div>
              <div className="flex-1 bg-[#2b2c3c] p-8 text-white overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-lg font-semibold">관리자</div>
                    <div className="text-sm opacity-70">관리자 ID를 추가하거나 삭제할 수 있습니다.</div>
                  </div>
                  <button
                    className="h-8 w-8 rounded-full border border-white/20"
                    onClick={() => setShowSettings(false)}
                    aria-label="Close settings"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-6">
                  <label className="text-xs uppercase opacity-60">관리자 추가</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={adminInput}
                      onChange={(e) => setAdminInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminInput.trim()) {
                          onAddAdmin?.(adminInput.trim())
                          setAdminInput('')
                        }
                      }}
                      className="flex-1 h-10 rounded-md px-3 text-white"
                      style={{ background: '#1f202b', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Discord 사용자 ID"
                    />
                    <button
                      className="px-4 h-10 rounded-md text-white"
                      style={{ background: '#5865f2' }}
                      onClick={() => {
                        if (!adminInput.trim()) return
                        onAddAdmin?.(adminInput.trim())
                        setAdminInput('')
                      }}
                    >
                      입력
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase opacity-60">관리자 목록</label>
                  <div className="mt-2 space-y-2">
                    {adminIds.map((id) => (
                      <div key={id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: '#1f202b' }}>
                        <span className="text-sm">{id}</span>
                        <button
                          className="text-sm text-red-300 hover:text-red-400"
                          onClick={() => onRemoveAdmin?.(id)}
                          aria-label={`Remove ${id}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </aside>
  )
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path fill="currentColor" fillRule="evenodd" d="M10.56 1.1c-.46.05-.7.53-.64.98.18 1.16-.19 2.2-.98 2.53-.8.33-1.79-.15-2.49-1.1-.27-.36-.78-.52-1.14-.24-.77.59-1.45 1.27-2.04 2.04-.28.36-.12.87.24 1.14.96.7 1.43 1.7 1.1 2.49-.33.8-1.37 1.16-2.53.98-.45-.07-.93.18-.99.64a11.1 11.1 0 0 0 0 2.88c.06.46.54.7.99.64 1.16-.18 2.2.19 2.53.98.33.8-.14 1.79-1.1 2.49-.36.27-.52.78-.24 1.14.59.77 1.27 1.45 2.04 2.04.36.28.87.12 1.14-.24.7-.95 1.7-1.43 2.49-1.1.8.33 1.16 1.37.98 2.53-.07.45.18.93.64.99a11.1 11.1 0 0 0 2.88 0c.46-.06.7-.54.64-.99-.18-1.16.19-2.2.98-2.53.8-.33 1.79.14 2.49 1.1.27.36.78.52 1.14.24.77-.59 1.45-1.27 2.04-2.04.28-.36.12.87-.24-1.14.96-.7 1.43-1.7 1.0-2.49.33-.8 1.37-1.16 2.53-.98.45.07.93-.18.99-.64a11.1 11.1 0 0 0 0-2.88c-.06-.46-.54-.7-.99-.64-1.16.18-2.2-.19-2.53-.98-.33-.814-1.79 1.1-2.49.36-.27.52-.78.24-1.14a11.07 11.07 0 0 0-2.04-2.04c-.36-.28.87-.12-1.14.24-.7.96-1.7 1.43-2.49 1.1-.8-.33-1.16-1.37-.98-2.53.07-.45.18-.93.64-.99a11.1 11.1 0 0 0-2.88 0ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd"></path>
        </svg>
      )
    case 'bell':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
        </svg>
      )
    default:
      return null
  }
}

function MenuItem({ label, icon, bold, onClick }: { label: string; icon?: string; bold?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 rounded cursor-pointer flex items-center gap-2 ${bold ? 'font-semibold' : ''}`}
      style={{ background: 'transparent', color: 'var(--text-primary)', transition: 'background-color 150ms ease' }}
      onClick={onClick}
      onMouseEnter={(e) => ((e.currentTarget.style.background as any) = 'rgba(127,127,127,0.12)')}
      onMouseLeave={(e) => ((e.currentTarget.style.background as any) = 'transparent')}
    >
      <span className="truncate flex-1">{label}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  )
}
