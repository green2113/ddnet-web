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

type Channel = { id: string; name: string; hidden?: boolean; type?: 'text' | 'voice' | 'category'; categoryId?: string | null; order?: number }
type TextVoiceChannel = { id: string; name: string; hidden?: boolean; type?: 'text' | 'voice'; categoryId?: string | null; order?: number }

export type SidebarChannelsProps = {
  channels: Channel[]
  activeId?: string
  joinedVoiceChannelId?: string
  serverName?: string
  voiceMembersByChannel?: Record<string, VoiceMember[]>
  voiceCallStartByChannel?: Record<string, number>
  voiceSpeakingByChannel?: Record<string, string[]>
  unreadByChannel?: Record<string, boolean>
  t: UiText
  onSelect?: (channelId: string) => void
  onCreateChannel?: (categoryId?: string | null) => void
  onCreateCategory?: () => void
  onDeleteChannel?: (channelId: string) => void
  onToggleChannelHidden?: (channelId: string, hidden: boolean) => void
  onRenameChannel?: (channelId: string, name: string) => void
  onReorderChannels?: (orderedIds: string[], categoryId?: string | null) => void
  onReorderCategories?: (orderedIds: string[]) => void
  canManage?: boolean
  onOpenServerSettings?: () => void
  onCreateInvite?: () => void
  onLeaveServer?: () => void
  isOwner?: boolean
}

export default function SidebarChannels({
  channels,
  activeId,
  joinedVoiceChannelId,
  serverName,
  voiceMembersByChannel = {},
  voiceCallStartByChannel = {},
  voiceSpeakingByChannel = {},
  unreadByChannel = {},
  t,
  onSelect,
  onCreateChannel,
  onCreateCategory,
  onDeleteChannel,
  onToggleChannelHidden,
  onRenameChannel,
  onReorderChannels,
  onReorderCategories,
  canManage = false,
  onOpenServerSettings,
  onCreateInvite,
  onLeaveServer,
  isOwner = false,
}: SidebarChannelsProps) {
  const [open, setOpen] = useState(false)
  const [showHiddenChannels, setShowHiddenChannels] = useState(false)
  const [channelMenu, setChannelMenu] = useState<{ visible: boolean; x: number; y: number; channel: { id: string; name: string; hidden?: boolean } | null }>({
    visible: false,
    x: 0,
    y: 0,
    channel: null,
  })
  const channelMenuSizeRef = useRef({ width: 200, height: 140 })
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below' | null>(null)
  const [categoryDragOverId, setCategoryDragOverId] = useState<string | null>(null)
  const [categoryDragOverPos, setCategoryDragOverPos] = useState<'above' | 'below' | null>(null)
  const [serverMenuPos, setServerMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const serverMenuRef = useRef<HTMLDivElement | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const dragGroupRef = useRef<string | null>(null)
  const dragCategoryIdRef = useRef<string | null>(null)
  const dragOriginOrderRef = useRef<number | null>(null)
  const dragCategoryOriginOrderRef = useRef<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const hasActiveVoice = Object.values(voiceCallStartByChannel).some((value) => typeof value === 'number')

  const formatCallDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const mm = String(minutes).padStart(2, '0')
    const ss = String(secs).padStart(2, '0')
    if (hours > 0) {
      const hh = String(hours).padStart(2, '0')
      return `${hh}:${mm}:${ss}`
    }
    return `${mm}:${ss}`
  }
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
    if (!hasActiveVoice) return
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [hasActiveVoice])
  
  useEffect(() => {
    if (!channelMenu.visible) return
    const panel = document.getElementById('channel-context-menu')
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    if (rect.width && rect.height) {
      channelMenuSizeRef.current = { width: rect.width, height: rect.height }
    }
  }, [channelMenu.visible, channelMenu.channel])

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
  const isCategory = (channel: Channel): channel is Channel & { type: 'category' } => channel.type === 'category'
  const isTextOrVoice = (channel: Channel): channel is TextVoiceChannel => channel.type !== 'category'
  const categories = visibleChannels
    .filter(isCategory)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const uncategorizedChannels = visibleChannels
    .filter((channel): channel is TextVoiceChannel => isTextOrVoice(channel) && !channel.categoryId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const categoryChannelMap = new Map<string, TextVoiceChannel[]>()
  categories.forEach((category) => {
    const categoryChannels = visibleChannels
      .filter((channel): channel is TextVoiceChannel => isTextOrVoice(channel) && channel.categoryId === category.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    categoryChannelMap.set(category.id, categoryChannels)
  })
  const orderedKeys: string[] = []
  uncategorizedChannels.forEach((channel) => orderedKeys.push(`ch:${channel.id}`))
  categories.forEach((category) => {
    orderedKeys.push(`cat:${category.id}`)
    const categoryChannels = categoryChannelMap.get(category.id) || []
    categoryChannels.forEach((channel) => orderedKeys.push(`ch:${channel.id}`))
  })
  const orderIndexMap = new Map<string, number>()
  orderedKeys.forEach((key, index) => {
    orderIndexMap.set(key, index)
  })

  const computeReorder = (sourceIds: string[], draggedId: string, targetId: string, position: 'above' | 'below') => {
    if (!draggedId || !targetId || draggedId === targetId) return null
    const ids = [...sourceIds]
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return null
    ids.splice(fromIndex, 1)
    let adjustedToIndex = toIndex
    if (fromIndex < toIndex) adjustedToIndex = toIndex - 1
    const insertIndex = position === 'above' ? adjustedToIndex : adjustedToIndex + 1
    ids.splice(insertIndex, 0, draggedId)
    const isSameOrder = sourceIds.every((id, index) => id === ids[index])
    if (isSameOrder) return null
    return ids
  }

  const computeReorderWithInsert = (
    sourceIds: string[],
    draggedId: string,
    targetId: string,
    position: 'above' | 'below',
  ) => {
    if (!draggedId || !targetId || draggedId === targetId) return null
    const ids = [...sourceIds]
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    if (toIndex === -1) return null
    if (fromIndex !== -1) {
      ids.splice(fromIndex, 1)
    }
    let adjustedToIndex = toIndex
    if (fromIndex !== -1 && fromIndex < toIndex) adjustedToIndex = toIndex - 1
    const insertIndex = position === 'above' ? adjustedToIndex : adjustedToIndex + 1
    ids.splice(insertIndex, 0, draggedId)
    const isSameOrder = sourceIds.every((id, index) => id === ids[index])
    if (isSameOrder) return null
    return ids
  }

  const renderChannelItem = (channel: TextVoiceChannel, list: Array<{ id: string }>, groupId: string) => {
    const ids = list.map((item) => item.id)
    const members = voiceMembersByChannel[channel.id] || []
    const sortedMembers = members.length > 1 ? sortMembersByName(members) : members
    const speakingIds = voiceSpeakingByChannel[channel.id] || []
    const isVoice = channel.type === 'voice'
    const callStart = voiceCallStartByChannel[channel.id]
    const callDuration =
      callStart && members.length > 0 ? formatCallDuration(Math.max(0, Math.floor((nowMs - callStart) / 1000))) : null
    return (
      <div key={channel.id} className={isVoice ? 'space-y-1' : undefined}>
        <div
          className="px-2 py-1 rounded-md cursor-pointer flex items-center gap-2 hover:opacity-90"
          style={{
            color: 'var(--text-primary)',
            background: channel.id === activeId ? 'rgba(255,255,255,0.12)' : 'transparent',
            opacity: channel.hidden ? 0.6 : 1,
            userSelect: 'none',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (channel.id === activeId) return
            e.currentTarget.style.background = 'color-mix(in oklch, var(--text-primary) 8%, transparent)'
          }}
          onMouseLeave={(e) => {
            if (channel.id === activeId) return
            e.currentTarget.style.background = 'transparent'
          }}
          draggable={canManage}
          onClick={() => onSelect?.(channel.id)}
          onDoubleClick={() => {
            if (!canManage) return
            const name = window.prompt(t.sidebarChannels.channelNamePrompt, channel.name)
            if (!name) return
            onRenameChannel?.(channel.id, name)
          }}
          onDragStart={(event) => {
            if (!canManage) return
            dragIdRef.current = channel.id
            dragGroupRef.current = groupId
            dragOriginOrderRef.current = orderIndexMap.get(`ch:${channel.id}`) ?? null
            setDragOverId(null)
            setDragOverPos(null)
            if (event.dataTransfer) {
              event.dataTransfer.setData('text/plain', channel.id)
              event.dataTransfer.effectAllowed = 'move'
            }
          }}
          onDragEnd={() => {
            dragIdRef.current = null
            dragGroupRef.current = null
            dragOriginOrderRef.current = null
            setDragOverId(null)
            setDragOverPos(null)
            setCategoryDragOverId(null)
            setCategoryDragOverPos(null)
          }}
          onDragOver={(e) => {
            if (!canManage || !dragIdRef.current) return
            e.preventDefault()
            if (e.dataTransfer) {
              e.dataTransfer.dropEffect = 'move'
            }
            const originIndex = dragOriginOrderRef.current
            const targetIndex = orderIndexMap.get(`ch:${channel.id}`)
            if (originIndex === null || targetIndex === undefined) return
            const position = targetIndex < originIndex ? 'above' : 'below'
            const nextOrder = computeReorderWithInsert(ids, dragIdRef.current, channel.id, position)
            setDragOverId(nextOrder ? channel.id : null)
            setDragOverPos(nextOrder ? position : null)
          }}
          onDrop={(e) => {
            if (!canManage) return
            e.preventDefault()
            const draggedId = dragIdRef.current
            dragIdRef.current = null
            dragGroupRef.current = null
            setDragOverId(null)
            setDragOverPos(null)
            if (!draggedId || draggedId === channel.id) return
            const originIndex = dragOriginOrderRef.current
            const targetIndex = orderIndexMap.get(`ch:${channel.id}`)
            if (originIndex === null || targetIndex === undefined) return
            const position = targetIndex < originIndex ? 'above' : 'below'
            const nextOrder = computeReorderWithInsert(ids, draggedId, channel.id, position)
            if (!nextOrder) return
            onReorderChannels?.(nextOrder, groupId === 'uncategorized' ? null : groupId)
          }}
          onDragLeave={() => {
            if (!canManage) return
            setDragOverId((prev) => (prev === channel.id ? null : prev))
            setDragOverPos((prev) => (dragOverId === channel.id ? null : prev))
          }}
          onContextMenu={(e) => {
            if (!canManage) return
            e.preventDefault()
            setOpen(false)
            const width = Math.max(channelMenuSizeRef.current.width, 180)
            const height = Math.max(channelMenuSizeRef.current.height, 120)
            const margin = 12
            const nextX = Math.min(Math.max(e.clientX, margin), Math.max(margin, window.innerWidth - width - margin))
            const nextY = Math.min(Math.max(e.clientY, margin), Math.max(margin, window.innerHeight - height - margin))
            setChannelMenu({ visible: true, x: nextX, y: nextY, channel: channel })
          }}
        >
          {canManage && dragOverId === channel.id && dragOverPos ? (
            <div
              style={{
                position: 'absolute',
                left: 8,
                right: 8,
                top: dragOverPos === 'above' ? -2 : 'auto',
                bottom: dragOverPos === 'below' ? -2 : 'auto',
                height: 3,
                borderRadius: 999,
                background: 'var(--accent)',
                boxShadow: '0 0 6px color-mix(in oklch, var(--accent) 60%, transparent)',
              }}
            />
          ) : null}
          <span style={{ color: channel.id === activeId ? '#ffffff' : 'var(--text-muted)' }}>
            {isVoice ? <VolumeIcon size={16} /> : '#'}
          </span>
          <span
            className="truncate"
            style={{
              color:
                channel.id === activeId
                  ? 'var(--text-primary)'
                  : isVoice && joinedVoiceChannelId === channel.id
                    ? '#ffffff'
                    : unreadByChannel[channel.id]
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
            }}
          >
            {channel.name}
          </span>
          {isVoice && callDuration ? (
            <span className="ml-auto text-[11px] font-semibold" style={{ color: '#22c55e' }}>
              {callDuration}
            </span>
          ) : null}
          {channel.hidden ? (
            <span className="ml-auto text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
              {t.sidebarChannels.hidden}
            </span>
          ) : null}
        </div>
        {isVoice && members.length > 0 ? (
          <div className="pl-6 space-y-1.5">
            {sortedMembers.map((member) => {
              const isSpeaking = speakingIds.includes(member.id) && !member.muted && !member.deafened
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 text-[13px] cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation()
                    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
                    const ev = new CustomEvent('open-user-profile', {
                      detail: { user: member, x: rect.right + 8, y: rect.top },
                    })
                    window.dispatchEvent(ev)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const ev = new CustomEvent('open-member-menu', {
                      detail: { member, x: event.clientX, y: event.clientY },
                    })
                    window.dispatchEvent(ev)
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = 'color-mix(in oklch, var(--text-primary) 8%, transparent)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'transparent'
                  }}
                  style={{ borderRadius: '8px', padding: '4px 6px' }}
                >
                  <div className={`voice-avatar voice-avatar-lg${isSpeaking ? ' voice-speaking-ring' : ''}`}>
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
                    {member.muted ? <MicIcon size={14} muted outlineColor="var(--sidebar-bg)" /> : null}
                    {member.deafened ? <HeadsetIcon size={14} muted outlineColor="var(--sidebar-bg)" /> : null}
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

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
          {serverName ? (
            <span className="truncate font-medium">{serverName}</span>
          ) : (
            <span className="inline-block h-4 w-[120px] rounded-md" style={{ background: 'var(--input-bg)' }} />
          )}
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
                {canManage ? (
                  <MenuItem
                    icon="folder"
                    label={t.sidebarChannels.createCategory}
                    bold
                    onClick={() => {
                      onCreateCategory?.()
                      setOpen(false)
                    }}
                  />
                ) : null}
                <MenuItem
                  icon="invite"
                  label={t.sidebarChannels.invite}
                  bold
                  onClick={() => {
                    onCreateInvite?.()
                    setOpen(false)
                  }}
                />
                <MenuItem icon="bell" label={t.sidebarChannels.notifications} bold />
                {!isOwner ? (
                  <>
                    <div className="m-2" style={{ height: '1px', background: 'var(--divider)', opacity: 0.25 }} />
                    <MenuItem
                      icon="leave"
                      label={t.sidebarChannels.leaveServer}
                      bold
                      tone="danger"
                      onClick={() => {
                        onLeaveServer?.()
                        setOpen(false)
                      }}
                    />
                  </>
                ) : null}
              </div>,
              document.getElementById('overlay-root') || document.body
            )
          : null}
      </div>

      <div className="p-3 flex-1 overflow-y-auto overflow-x-visible channels-scroll">
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
          <div
            className="space-y-4"
            onDragOver={(event) => {
              if (!canManage || !dragIdRef.current) return
              event.preventDefault()
              if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move'
              }
            }}
          >
          {uncategorizedChannels.length > 0 ? (
            <div
              className="space-y-1"
              onDragOver={(event) => {
                if (!canManage || !dragIdRef.current) return
                event.preventDefault()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = 'move'
                }
              }}
            >
              {uncategorizedChannels.map((channel) =>
                renderChannelItem(channel, uncategorizedChannels, 'uncategorized')
              )}
            </div>
          ) : null}
          {categories.map((category, index) => {
            const categoryChannels = visibleChannels
              .filter((channel): channel is TextVoiceChannel => isTextOrVoice(channel) && channel.categoryId === category.id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            const categoryIds = categories.map((item) => item.id)
            const prevCategoryId = index > 0 ? categories[index - 1].id : null
            return (
              <div key={category.id} className="space-y-1">
                <div className="relative">
                  {canManage && categoryDragOverId === category.id && categoryDragOverPos ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: categoryDragOverPos === 'above' ? -4 : 'auto',
                        bottom: categoryDragOverPos === 'below' ? -4 : 'auto',
                        height: 3,
                        borderRadius: 999,
                        background: 'var(--accent)',
                        boxShadow: '0 0 6px color-mix(in oklch, var(--accent) 60%, transparent)',
                      }}
                    />
                  ) : null}
                  <div
                    className="px-2 py-1 rounded-md cursor-pointer uppercase tracking-wide text-[11px] flex items-center justify-between gap-2"
                    style={{
                      color: 'var(--text-muted)',
                      background: 'transparent',
                    }}
                    draggable={canManage}
                    onContextMenu={(event) => {
                      if (!canManage) return
                      event.preventDefault()
                      setOpen(false)
                      const width = Math.max(channelMenuSizeRef.current.width, 180)
                      const height = Math.max(channelMenuSizeRef.current.height, 120)
                      const margin = 12
                      const nextX = Math.min(Math.max(event.clientX, margin), Math.max(margin, window.innerWidth - width - margin))
                      const nextY = Math.min(Math.max(event.clientY, margin), Math.max(margin, window.innerHeight - height - margin))
                      setChannelMenu({ visible: true, x: nextX, y: nextY, channel: category })
                    }}
                    onDoubleClick={() => {
                      if (!canManage) return
                      const name = window.prompt(t.sidebarChannels.channelNamePrompt, category.name)
                      if (!name) return
                      onRenameChannel?.(category.id, name)
                    }}
                    onDragStart={(event) => {
                      if (!canManage) return
                      dragCategoryIdRef.current = category.id
                      dragCategoryOriginOrderRef.current = orderIndexMap.get(`cat:${category.id}`) ?? null
                      setCategoryDragOverId(null)
                      setCategoryDragOverPos(null)
                      if (event.dataTransfer) {
                        event.dataTransfer.setData('text/plain', category.id)
                        event.dataTransfer.effectAllowed = 'move'
                      }
                    }}
                    onDragEnd={() => {
                      dragCategoryIdRef.current = null
                      dragCategoryOriginOrderRef.current = null
                      setCategoryDragOverId(null)
                      setCategoryDragOverPos(null)
                    }}
                    onDragOver={(event) => {
                      if (!canManage) return
                      if (dragCategoryIdRef.current) {
                        if (dragCategoryIdRef.current === category.id) return
                        event.preventDefault()
                        if (event.dataTransfer) {
                          event.dataTransfer.dropEffect = 'move'
                        }
                        const originIndex = dragCategoryOriginOrderRef.current
                        const targetIndex = orderIndexMap.get(`cat:${category.id}`)
                        if (originIndex === null || targetIndex === undefined) return
                        const position = targetIndex < originIndex ? 'above' : 'below'
                        const nextOrder = computeReorder(categoryIds, dragCategoryIdRef.current, category.id, position)
                        setCategoryDragOverId(nextOrder ? category.id : null)
                        setCategoryDragOverPos(nextOrder ? position : null)
                        return
                      }
                      if (!dragIdRef.current) return
                      event.preventDefault()
                      if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move'
                      }
                      const originIndex = dragOriginOrderRef.current
                      const targetIndex = orderIndexMap.get(`cat:${category.id}`)
                      if (originIndex === null || targetIndex === undefined) return
                      const position = targetIndex < originIndex ? 'above' : 'below'
                      setCategoryDragOverId(category.id)
                      setCategoryDragOverPos(position)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      setCategoryDragOverId(null)
                      setCategoryDragOverPos(null)
                      if (dragCategoryIdRef.current) {
                        const draggedId = dragCategoryIdRef.current || event.dataTransfer?.getData('text/plain')
                        const originIndex = dragCategoryOriginOrderRef.current
                        dragCategoryIdRef.current = null
                        setCategoryDragOverId(null)
                        setCategoryDragOverPos(null)
                        if (!draggedId || draggedId === category.id) return
                        const targetIndex = orderIndexMap.get(`cat:${category.id}`)
                        if (originIndex === null || targetIndex === undefined) return
                        const position = targetIndex < originIndex ? 'above' : 'below'
                        const nextOrder = computeReorder(categoryIds, draggedId, category.id, position)
                        if (!nextOrder) return
                        onReorderCategories?.(nextOrder)
                        dragCategoryOriginOrderRef.current = null
                        return
                      }
                      if (!dragIdRef.current) return
                      const draggedId = dragIdRef.current
                      dragIdRef.current = null
                      dragGroupRef.current = null
                      const position = categoryDragOverPos ?? 'below'
                      const targetCategoryId = position === 'below' ? category.id : prevCategoryId
                      const targetChannels =
                        targetCategoryId === null
                          ? uncategorizedChannels
                          : visibleChannels
                              .filter(
                                (channel): channel is TextVoiceChannel =>
                                  isTextOrVoice(channel) && channel.categoryId === targetCategoryId
                              )
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      const filtered = targetChannels.map((item) => item.id).filter((id) => id !== draggedId)
                      if (filtered.length === 0) {
                        onReorderChannels?.([draggedId], targetCategoryId)
                        return
                      }
                      const nextOrder = position === 'below' ? [draggedId, ...filtered] : [...filtered, draggedId]
                      onReorderChannels?.(nextOrder, targetCategoryId)
                    }}
                    onDragLeave={() => {
                      if (!canManage) return
                      setCategoryDragOverId((prev) => (prev === category.id ? null : prev))
                      setCategoryDragOverPos((prev) => (categoryDragOverId === category.id ? null : prev))
                    }}
                  >
                    <span className="truncate">{category.name}</span>
                    {canManage ? (
                      <Tooltip label={t.sidebarChannels.createTitle} side="top">
                        <button
                          type="button"
                          className="h-6 w-6 rounded-md grid place-items-center hover-surface cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                          onClick={(event) => {
                            event.stopPropagation()
                            onCreateChannel?.(category.id)
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </button>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
                <div
                  className="space-y-1"
                  onDragOver={(event) => {
                    if (!canManage || !dragIdRef.current) return
                    event.preventDefault()
                    if (event.dataTransfer) {
                      event.dataTransfer.dropEffect = 'move'
                    }
                  }}
                >
                  {categoryChannels.map((channel) =>
                    renderChannelItem(channel, categoryChannels, category.id)
                  )}
                </div>
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
                id="channel-context-menu"
                className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm pointer-events-auto"
                style={{
                  top: channelMenu.y,
                  left: channelMenu.x,
                  background: 'var(--header-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
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
                <div className="my-2 mx-2" style={{ height: '1px', background: 'var(--divider)', opacity: 0.6 }} />
                <button
                  className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(channelMenu.channel!.id)
                    setChannelMenu({ visible: false, x: 0, y: 0, channel: null })
                  }}
                >
                  채널 ID 복사하기
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.14 12.936c.03-.308.046-.62.046-.936s-.016-.628-.046-.936l2.036-1.58a.5.5 0 0 0 .12-.64l-1.928-3.34a.5.5 0 0 0-.6-.22l-2.4.96a7.94 7.94 0 0 0-1.62-.936l-.36-2.54a.5.5 0 0 0-.5-.42h-3.856a.5.5 0 0 0-.5.42l-.36 2.54a7.94 7.94 0 0 0-1.62.936l-2.4-.96a.5.5 0 0 0-.6.22l-1.928 3.34a.5.5 0 0 0 .12.64l2.036 1.58c-.03.308-.046.62-.046.936s.016.628.046.936l-2.036 1.58a.5.5 0 0 0-.12.64l1.928 3.34a.5.5 0 0 0 .6.22l2.4-.96c.5.39 1.04.712 1.62.936l.36 2.54a.5.5 0 0 0 .5.42h3.856a.5.5 0 0 0 .5-.42l.36-2.54c.58-.224 1.12-.546 1.62-.936l2.4.96a.5.5 0 0 0 .6-.22l1.928-3.34a.5.5 0 0 0-.12-.64l-2.036-1.58ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />
        </svg>
      )
    case 'bell':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z" />
        </svg>
      )
    case 'invite':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M15.5 12a3.5 3.5 0 1 0-3.3-4.8 5.5 5.5 0 0 1 0 9.6A3.5 3.5 0 1 0 15.5 12ZM7 13a4 4 0 1 0-3.8-5.5 4 4 0 0 0 0 9A4 4 0 0 0 7 13Zm9 5c-1.9 0-3.6.6-4.7 1.6-.4.3-.3.9.1 1.1.6.3 1.2.3 1.8 0 1-.5 2.1-.7 2.8-.7 2 0 4 1 4 2.5 0 .6.4 1.1 1 1.1s1-.5 1-1.1C22 19.1 19.2 18 16 18Zm-9 0c-2.6 0-6 1.2-6 3.6 0 .6.4 1.1 1 1.1s1-.5 1-1.1C3 20.4 5.2 19 7 19c1.4 0 2.8.4 3.9 1 .6.3 1.2.3 1.8 0 .4-.2.5-.8.1-1.1C11.6 18.6 9.6 18 7 18Z"
          />
        </svg>
      )
    case 'folder':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path
            d="M4 6.5a2 2 0 0 1 2-2h4.1a2 2 0 0 1 1.4.6l1.3 1.3a2 2 0 0 0 1.4.6H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5z"
          />
        </svg>
      )
    case 'leave':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13 4a2 2 0 0 1 2 2v3h-2V6H6v12h7v-3h2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7z" />
          <path d="M15.5 16a1 1 0 0 1-.7-1.7l2.3-2.3-2.3-2.3a1 1 0 1 1 1.4-1.4l4 4-4 4a1 1 0 0 1-.7.3z" />
          <path d="M10 11h9v2h-9z" />
        </svg>
      )
    default:
      return null
  }
}

function MenuItem({
  label,
  icon,
  bold,
  tone = 'default',
  onClick,
}: {
  label: string
  icon?: string
  bold?: boolean
  tone?: 'default' | 'danger'
  onClick?: () => void
}) {
  const textColor = tone === 'danger' ? '#f87171' : 'var(--text-primary)'
  const hoverColor = tone === 'danger' ? 'rgba(248,113,113,0.15)' : 'rgba(127,127,127,0.12)'
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 rounded cursor-pointer flex items-center gap-2 ${bold ? 'font-semibold' : ''}`}
      style={{ background: 'transparent', color: textColor, transition: 'background-color 150ms ease' }}
      onClick={onClick}
      onMouseEnter={(e) => ((e.currentTarget.style.background as any) = hoverColor)}
      onMouseLeave={(e) => ((e.currentTarget.style.background as any) = 'transparent')}
    >
      <span className="truncate flex-1">{label}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  )
}
