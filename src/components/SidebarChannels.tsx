import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatText, type UiText } from '../i18n'
import Tooltip from './Tooltip'
import { HeadsetIcon, MicIcon, VolumeIcon } from './icons/VoiceIcons'

type VoiceMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  muted?: boolean
  deafened?: boolean
}

const memberNameCollator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })

const getMemberLabel = (member: VoiceMember) => member.displayName || member.username

const sortMembersByName = (members: VoiceMember[]) =>
  [...members].sort((a, b) => memberNameCollator.compare(getMemberLabel(a), getMemberLabel(b)))

export type SidebarChannelsProps = {
  channels: Array<{ id: string; name: string; hidden?: boolean; type?: 'text' | 'voice' }>
  activeId?: string
  serverName?: string
  voiceMembersByChannel?: Record<string, VoiceMember[]>
  voiceSpeakingByChannel?: Record<string, string[]>
  unreadByChannel?: Record<string, boolean>
  t: UiText
  onSelect?: (channelId: string) => void
  onCreateChannel?: (type: 'text' | 'voice') => void
  onDeleteChannel?: (channelId: string) => void
  onToggleChannelHidden?: (channelId: string, hidden: boolean) => void
  onRenameChannel?: (channelId: string, name: string) => void
  onReorderChannels?: (orderedIds: string[]) => void
  canManage?: boolean
  onOpenServerSettings?: () => void
}

export default function SidebarChannels({
  channels,
  activeId,
  serverName,
  voiceMembersByChannel = {},
  voiceSpeakingByChannel = {},
  unreadByChannel = {},
  t,
  onSelect,
  onCreateChannel,
  onDeleteChannel,
  onToggleChannelHidden,
  onRenameChannel,
  onReorderChannels,
  canManage = false,
  onOpenServerSettings,
}: SidebarChannelsProps) {
  const [open, setOpen] = useState(false)
  const [showHiddenChannels, setShowHiddenChannels] = useState(false)
  const [channelMenu, setChannelMenu] = useState<{ visible: boolean; x: number; y: number; channel: { id: string; name: string; hidden?: boolean } | null }>({
    visible: false,
    x: 0,
    y: 0,
    channel: null,
  })
  const [serverMenuPos, setServerMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const serverMenuRef = useRef<HTMLDivElement | null>(null)
  const dragIdRef = useRef<string | null>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (serverMenuRef.current?.contains(e.target as Node)) return
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

  useEffect(() => {
    if (!open) {
      setServerMenuPos(null)
      return
    }
    const update = () => {
      if (!wrapRef.current) return
      const rect = wrapRef.current.getBoundingClientRect()
      const inset = 8
      setServerMenuPos({
        top: rect.bottom + inset,
        left: rect.left + inset,
        width: Math.max(0, rect.width - inset * 2),
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  const hiddenChannelsCount = canManage ? channels.filter((channel) => channel.hidden).length : 0
  const visibleChannels = channels.filter((channel) => {
    if (!channel.hidden) return true
    return canManage && showHiddenChannels
  })
  const textChannels = visibleChannels.filter((channel) => channel.type !== 'voice')
  const voiceChannels = visibleChannels.filter((channel) => channel.type === 'voice')

  const resolvedServerName = serverName || t.sidebarChannels.serverName
  return (
    <aside className="w-full flex flex-col p-0 flex-1 min-h-0">
      {/* 서버 헤더 */}
      <div
        ref={wrapRef}
        className="relative select-none"
        style={{ background: 'var(--sidebar-bg)', borderTopLeftRadius: 'var(--topbar-radius)', overflow: 'hidden' }}
      >
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
          style={{
            color: 'var(--text-primary)',
            background: 'var(--sidebar-bg)',
            borderBottom: '1px solid var(--border)',
            borderTop: '1px solid var(--topbar-divider)',
            borderLeft: '1px solid var(--topbar-divider)',
            borderTopLeftRadius: 'var(--topbar-radius)',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget.style.background as any) = 'var(--hover-bg)')}
          onMouseLeave={(e) => ((e.currentTarget.style.background as any) = 'var(--sidebar-bg)')}
        >
          <span className="truncate font-medium">{resolvedServerName}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && serverMenuPos
          ? createPortal(
              <div
                ref={serverMenuRef}
                className="fixed z-50 rounded-xl p-2 text-sm"
                style={{
                  top: serverMenuPos.top,
                  left: serverMenuPos.left,
                  width: serverMenuPos.width,
                  background: 'var(--header-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {canManage ? (
                  <>
                    <MenuItem
                      icon="settings"
                      label={t.sidebarChannels.serverSettings}
                      bold
                      onClick={() => {
                        onOpenServerSettings?.()
                        setOpen(false)
                      }}
                    />
                    <div className="m-2" style={{ height: '1px', background: 'var(--divider)', opacity: 0.25 }} />
                  </>
                ) : null}
                <MenuItem icon="bell" label={t.sidebarChannels.notifications} bold />
              </div>,
              document.getElementById('overlay-root') || document.body
            )
          : null}
      </div>

      <div className="p-3 flex-1 overflow-y-auto overflow-x-visible channels-scroll">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>{t.sidebarChannels.textChannels}</span>
          {canManage ? (
            <Tooltip label={t.sidebarChannels.addTextChannel} side="top">
              <button
                type="button"
                aria-label={t.sidebarChannels.addTextChannel}
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
            </Tooltip>
          ) : null}
        </div>
        {canManage && hiddenChannelsCount > 0 ? (
          <button
            type="button"
            className="mb-2 text-[11px] uppercase tracking-wide px-2 py-1 rounded cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => setShowHiddenChannels((prev) => !prev)}
          >
            {showHiddenChannels
              ? t.sidebarChannels.hideHidden
              : formatText(t.sidebarChannels.showHidden, { count: hiddenChannelsCount })}
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
                const name = window.prompt(t.sidebarChannels.channelNamePrompt, c.name)
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
                  {t.sidebarChannels.hidden}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>{t.sidebarChannels.voiceChannels}</span>
          {canManage ? (
            <Tooltip label={t.sidebarChannels.addVoiceChannel} side="top">
              <button
                type="button"
                aria-label={t.sidebarChannels.addVoiceChannel}
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
            </Tooltip>
          ) : null}
        </div>
        <div className="flex-1 space-y-1">
          {voiceChannels.map((c) => {
            const members = voiceMembersByChannel[c.id] || []
            const sortedMembers = members.length > 1 ? sortMembersByName(members) : members
            const speakingIds = voiceSpeakingByChannel[c.id] || []
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
                    const name = window.prompt(t.sidebarChannels.channelNamePrompt, c.name)
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
                    <VolumeIcon size={16} />
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
                      {t.sidebarChannels.hidden}
                    </span>
                  ) : null}
                </div>
                {members.length > 0 ? (
                  <div className="pl-6 space-y-1">
                    {sortedMembers.map((member) => {
                      const isSpeaking = speakingIds.includes(member.id) && !member.muted && !member.deafened
                      return (
                        <div key={member.id} className="flex items-center gap-2 text-xs">
                        <div className={`voice-avatar${isSpeaking ? ' voice-speaking-ring' : ''}`}>
                          <div className="voice-avatar-inner">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                        </div>
                          <span
                            className="truncate"
                            style={{
                              color: isSpeaking ? '#ffffff' : 'var(--text-muted)',
                              textShadow: isSpeaking ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
                            }}
                          >
                            {getMemberLabel(member)}
                          </span>
                          <span className="ml-auto flex items-center gap-1" style={{ color: '#f87171' }}>
                            {member.muted ? (
                              <MicIcon size={12} muted outlineColor="var(--sidebar-bg)" />
                            ) : null}
                            {member.deafened ? (
                              <HeadsetIcon size={12} muted outlineColor="var(--sidebar-bg)" />
                            ) : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      {channelMenu.visible && channelMenu.channel && canManage
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-40 pointer-events-auto"
                onMouseDown={() => setChannelMenu({ visible: false, x: 0, y: 0, channel: null })}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                }}
              />
              <div
                className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm pointer-events-auto"
                style={{ top: channelMenu.y, left: channelMenu.x, background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                  onClick={() => {
                    const name = window.prompt(t.sidebarChannels.channelNamePrompt, channelMenu.channel!.name)
                    if (!name) return
                    onRenameChannel?.(channelMenu.channel!.id, name)
                    setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                  }}
                >
                  {t.sidebarChannels.channelName}
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
                  {channelMenu.channel.hidden ? t.sidebarChannels.channelShow : t.sidebarChannels.channelHide}
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                  style={{ color: '#f87171' }}
                  onClick={() => {
                    onDeleteChannel?.(channelMenu.channel!.id)
                    setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                  }}
                >
                  {t.sidebarChannels.channelDelete}
                </button>
              </div>
            </>,
            document.getElementById('overlay-root') || document.body
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
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .33 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.86-.33 1.7 1.7 0 0 0-1 1.53V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1-1.53 1.7 1.7 0 0 0-1.86.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .33-1.86 1.7 1.7 0 0 0-1.53-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.53-1 1.7 1.7 0 0 0-.33-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.86.33 1.7 1.7 0 0 0 1-1.53V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.53 1.7 1.7 0 0 0 1.86-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.33 1.86 1.7 1.7 0 0 0 1.53 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.53 1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
