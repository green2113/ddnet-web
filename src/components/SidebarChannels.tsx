import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Settings, { type SettingsUser } from './Settings'

type VoiceMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
}

type SidebarUser = SettingsUser

export type SidebarChannelsProps = {
  channels: Array<{ id: string; name: string; hidden?: boolean; type?: 'text' | 'voice' }>
  activeId?: string
  serverName?: string
  adminIds?: string[]
  voiceMembersByChannel?: Record<string, VoiceMember[]>
  unreadByChannel?: Record<string, boolean>
  user?: SidebarUser | null
  onMicTestToggle?: (active: boolean) => void
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
  user = null,
  onMicTestToggle,
  onAddAdmin,
  onRemoveAdmin,
  onSelect,
  onCreateChannel,
  onDeleteChannel,
  onToggleChannelHidden,
  onRenameChannel,
  onReorderChannels,
  canManage = false,
}: SidebarChannelsProps) {
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'voice'>('profile')
  const [micSensitivity, setMicSensitivity] = useState(() => {
    if (typeof window === 'undefined') return -60
    const stored = window.localStorage.getItem('voice-mic-sensitivity')
    const parsed = stored ? Number(stored) : NaN
    if (!Number.isFinite(parsed)) return -60
    return Math.min(0, Math.max(-100, parsed))
  })
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micLevel, setMicLevel] = useState(-100)
  const [micTestError, setMicTestError] = useState('')
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
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestContextRef = useRef<AudioContext | null>(null)
  const micTestAnimationRef = useRef<number | null>(null)
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

  useEffect(() => {
    onMicTestToggle?.(isTestingMic)
  }, [isTestingMic, onMicTestToggle])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('voice-mic-sensitivity', String(micSensitivity))
    window.dispatchEvent(new CustomEvent('voice-mic-sensitivity', { detail: micSensitivity }))
  }, [micSensitivity])

  const rmsToDb = (rms: number) => {
    if (!Number.isFinite(rms) || rms <= 0) return -100
    const db = 20 * Math.log10(rms)
    return Math.min(0, Math.max(-100, Math.round(db)))
  }

  const dbToPercent = (db: number) => {
    const clamped = Math.min(0, Math.max(-100, db))
    return Math.round(((clamped + 100) / 100) * 100)
  }

  useEffect(() => {
    const stopMicTest = () => {
      micTestStreamRef.current?.getTracks().forEach((track) => track.stop())
      micTestStreamRef.current = null
      if (micTestAnimationRef.current) {
        cancelAnimationFrame(micTestAnimationRef.current)
        micTestAnimationRef.current = null
      }
      if (micTestContextRef.current) {
        micTestContextRef.current.close()
        micTestContextRef.current = null
      }
      setMicLevel(-100)
    }

    if (!isTestingMic) {
      stopMicTest()
      return
    }

    let cancelled = false
    setMicTestError('')
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        micTestStreamRef.current = stream
        const ctx = new AudioContext()
        micTestContextRef.current = ctx
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        const source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        const data = new Float32Array(analyser.fftSize)

        const tick = () => {
          analyser.getFloatTimeDomainData(data)
          let sum = 0
          for (const value of data) sum += value * value
          const rms = Math.sqrt(sum / data.length)
          setMicLevel(rmsToDb(rms))
          micTestAnimationRef.current = requestAnimationFrame(tick)
        }
        micTestAnimationRef.current = requestAnimationFrame(tick)
      })
      .catch(() => {
        setMicTestError('마이크 접근 권한이 필요합니다.')
        setIsTestingMic(false)
      })

    return () => {
      cancelled = true
      stopMicTest()
    }
  }, [isTestingMic])

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

      <div className="p-3 flex-1 overflow-y-auto">
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
      <div className="mt-auto border-t px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--header-bg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {(user?.displayName || user?.username || 'G').slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>
              {user?.displayName || user?.username || '게스트'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {user?.isGuest ? '게스트 모드' : '온라인'}
            </div>
          </div>
          <button
            type="button"
            aria-label="사용자 설정"
            className="h-9 w-9 rounded-md flex items-center justify-center hover-surface"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => {
              setSettingsTab('profile')
              setShowUserSettings(true)
            }}
          >
            <Icon name="settings" />
          </button>
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
      <Settings
        showSettings={showSettings}
        showUserSettings={showUserSettings}
        canManage={canManage}
        settingsTab={settingsTab}
        onSetTab={setSettingsTab}
        onCloseSettings={() => setShowSettings(false)}
        onCloseUserSettings={() => {
          setShowUserSettings(false)
          setIsTestingMic(false)
        }}
        adminInput={adminInput}
        onAdminInputChange={setAdminInput}
        onAddAdmin={onAddAdmin}
        onRemoveAdmin={onRemoveAdmin}
        adminIds={adminIds}
        user={user}
        micSensitivity={micSensitivity}
        onMicSensitivityChange={(value) => setMicSensitivity(value)}
        micLevelPercent={dbToPercent(micLevel)}
        micLevelLabel={micLevel}
        micSensitivityPercent={dbToPercent(micSensitivity)}
        isTestingMic={isTestingMic}
        onToggleMicTest={() => setIsTestingMic((prev) => !prev)}
        micTestError={micTestError}
      />
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
