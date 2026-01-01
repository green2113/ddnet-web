import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import SidebarGuilds from './components/SidebarGuilds'
import SidebarChannels from './components/SidebarChannels'
import SidebarProfileBar from './components/SidebarProfileBar'
import ServerSettings from './components/ServerSettings'
import Header from './components/Header'
import MessageList from './components/MessageList'
import Composer from './components/Composer'
import VoicePanel from './components/VoicePanel'
import { getStoredLanguage, getTranslations, type Language } from './i18n'

type User = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  isGuest?: boolean
}

type ChatMessage = {
  id: string
  author: { id: string; username: string; displayName?: string; avatar?: string | null }
  content: string
  timestamp: number
  channelId: string
  source: 'ddnet' | 'discord' | 'web'
}

type MessageCache = Record<string, ChatMessage[]>

type VoiceMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  muted?: boolean
  deafened?: boolean
}

type VoiceMembersByChannel = Record<string, VoiceMember[]>
type UnreadByChannel = Record<string, boolean>
type NoiseSuppressionMode = 'webrtc' | 'off'

type Channel = {
  id: string
  name: string
  hidden?: boolean
  type?: 'text' | 'voice'
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageCache, setMessageCache] = useState<MessageCache>({})
  const [voiceMembersByChannel, setVoiceMembersByChannel] = useState<VoiceMembersByChannel>({})
  const [unreadByChannel, setUnreadByChannel] = useState<UnreadByChannel>({})
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [adminIds, setAdminIds] = useState<string[]>([])
  const [activeChannelId, setActiveChannelId] = useState('')
  const [voiceChannelId, setVoiceChannelId] = useState('')
  const [joinedVoiceChannelId, setJoinedVoiceChannelId] = useState('')
  const [voiceSpeakingByChannel, setVoiceSpeakingByChannel] = useState<Record<string, string[]>>({})
  const [input, setInput] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const activeChannelRef = useRef('')
  const lastHistoryChannelIdRef = useRef('')
  const watchedVoiceRef = useRef<Set<string>>(new Set())
  const [isDark, setIsDark] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryStep, setEntryStep] = useState<'choice' | 'guest'>('choice')
  const [guestName, setGuestName] = useState(() => localStorage.getItem('guest_name') || '')
  const [guestSubmitting, setGuestSubmitting] = useState(false)
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; message: ChatMessage | null }>({ visible: false, x: 0, y: 0, message: null })
  const [showMobileChannels, setShowMobileChannels] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'voice' | 'language'>('profile')
  const [voiceSwitchTargetId, setVoiceSwitchTargetId] = useState<string | null>(null)
  const [skipVoiceSwitchConfirm, setSkipVoiceSwitchConfirm] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('skip-voice-switch-confirm') === 'true'
  })
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage())
  const [micSensitivity, setMicSensitivity] = useState(() => {
    if (typeof window === 'undefined') return -60
    const stored = window.localStorage.getItem('voice-mic-sensitivity')
    const parsed = stored ? Number(stored) : NaN
    if (!Number.isFinite(parsed)) return -60
    return Math.min(0, Math.max(-100, parsed))
  })
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState<NoiseSuppressionMode>(() => {
    if (typeof window === 'undefined') return 'webrtc'
    const stored = window.localStorage.getItem('voice-noise-mode')
    if (stored === 'webrtc' || stored === 'off') return stored
    const legacy = window.localStorage.getItem('voice-noise-suppression')
    if (legacy === null) return 'webrtc'
    return legacy === 'true' ? 'webrtc' : 'off'
  })
  const [isTestingMic, setIsTestingMic] = useState(false)
  const [micLevel, setMicLevel] = useState(-100)
  const [micTestError, setMicTestError] = useState('')
  const [adminInput, setAdminInput] = useState('')
  const { channelId: routeChannelId } = useParams()
  const navigate = useNavigate()
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestContextRef = useRef<AudioContext | null>(null)
  const micTestAnimationRef = useRef<number | null>(null)
  const t = useMemo(() => getTranslations(language), [language])
  const serverLabel = t.sidebarChannels.serverName

  const playNotificationSound = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    osc.onended = () => {
      ctx.close()
    }
  }

  const rmsToDb = (rms: number) => {
    if (!Number.isFinite(rms) || rms <= 0) return -100
    const db = 20 * Math.log10(rms)
    return Math.min(0, Math.max(-100, Math.round(db)))
  }

  const dbToPercent = (db: number) => {
    const clamped = Math.min(0, Math.max(-100, db))
    return Math.round(((clamped + 100) / 100) * 100)
  }

  const serverBase = useMemo(() => {
    const api = (import.meta as any).env?.VITE_API_BASE as string | undefined
    return api ? api.replace(/\/$/, '') : ''
  }, [])

  const scrollMessagesToBottom = () => {
    requestAnimationFrame(() => {
      const el = document.getElementById('messages-scroll')
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  const fetchHistory = (channelId: string) => {
    if (!channelId) return
    setLoadingMessages(true)
    setLoadError(false)
    axios
      .get(`${serverBase}/api/history`, { params: { limit: 200, channelId }, withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setMessages(res.data)
          setMessageCache((prev) => ({ ...prev, [channelId]: res.data }))
          scrollMessagesToBottom()
        }
        setLoadingMessages(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoadingMessages(false)
      })
  }

  const fetchChannels = () => {
    axios
      .get(`${serverBase}/api/channels`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setChannels(res.data)
        }
      })
      .catch(() => {})
  }

  const fetchAdmins = () => {
    axios
      .get(`${serverBase}/api/admins`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAdminIds(res.data)
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLoadingMessages(true)
    axios
      .get(`${serverBase}/api/me`, { withCredentials: true })
      .then((res) => setUser(res.data || null))
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setAuthReady(true)
      })

    fetchChannels()
  }, [serverBase])

  useEffect(() => {
    if (!user) {
      setAdminIds([])
      return
    }
    fetchAdmins()
  }, [user, serverBase])

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setEntryStep('choice')
      setShowEntryModal(true)
    }
  }, [authReady, user])

  useEffect(() => {
    if (!channels.length) return
    const requested = routeChannelId && channels.find((channel) => channel.id === routeChannelId)
    if (requested) {
      setActiveChannelId(requested.id)
      return
    }
    if (!activeChannelId || !channels.find((channel) => channel.id === activeChannelId)) {
      setActiveChannelId(channels[0].id)
    }
  }, [channels, activeChannelId, routeChannelId])

  useEffect(() => {
    const active = channels.find((channel) => channel.id === activeChannelId)
    if (active?.type === 'voice') {
      setVoiceChannelId(active.id)
    }
  }, [activeChannelId, channels])

  useEffect(() => {
    activeChannelRef.current = activeChannelId
    if (activeChannelId) {
      setUnreadByChannel((prev) => ({ ...prev, [activeChannelId]: false }))
    }
    const active = channels.find((channel) => channel.id === activeChannelId)
    if (activeChannelId && active?.type !== 'voice') {
      if (lastHistoryChannelIdRef.current !== activeChannelId) {
        lastHistoryChannelIdRef.current = activeChannelId
        const cached = messageCache[activeChannelId]
        if (cached) {
          setMessages(cached)
          scrollMessagesToBottom()
        } else {
          fetchHistory(activeChannelId)
        }
      }
    } else if (active?.type === 'voice') {
      lastHistoryChannelIdRef.current = ''
    }
  }, [activeChannelId, channels, messageCache])

  useEffect(() => {
    if (!activeChannelId) return
    if (routeChannelId !== activeChannelId) {
      navigate(`/channels/${activeChannelId}`, { replace: true })
    }
  }, [activeChannelId, navigate, routeChannelId])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('voice-mic-sensitivity', String(micSensitivity))
    window.dispatchEvent(new CustomEvent('voice-mic-sensitivity', { detail: micSensitivity }))
  }, [micSensitivity])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('voice-noise-mode', noiseSuppressionMode)
  }, [noiseSuppressionMode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('ui-language', language)
  }, [language])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('skip-voice-switch-confirm', String(skipVoiceSwitchConfirm))
  }, [skipVoiceSwitchConfirm])

  useEffect(() => {
    if (!micTestError) return
    setMicTestError(t.userSettings.micPermission)
  }, [t, micTestError])

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
      .getUserMedia({
        audio: {
          noiseSuppression: noiseSuppressionMode === 'webrtc',
        },
      })
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
        setMicTestError(t.userSettings.micPermission)
        setIsTestingMic(false)
      })

    return () => {
      cancelled = true
      stopMicTest()
    }
  }, [isTestingMic, noiseSuppressionMode, t])

  useEffect(() => {
    const handler = (e: any) => {
      const { x, y, message } = e.detail || {}
      setMenu({ visible: true, x, y, message })
    }
    const closer = () => setMenu((m) => ({ ...m, visible: false }))
    window.addEventListener('open-msg-menu', handler as any)
    window.addEventListener('click', closer)
    return () => {
      window.removeEventListener('open-msg-menu', handler as any)
      window.removeEventListener('click', closer)
    }
  }, [])

  useEffect(() => {
    const socket = io(serverBase, { withCredentials: true })
    socketRef.current = socket
    socket.on('connect', () => {})
    socket.on('channels:update', () => {
      fetchChannels()
    })
    socket.on('chat:message', (msg: ChatMessage) => {
      const channelId = msg.channelId
      if (!channelId) return
      setMessageCache((prev) => {
        const existing = prev[channelId] || []
        const next = [...existing, msg]
        if (channelId === activeChannelRef.current) {
          setMessages(next)
          requestAnimationFrame(() => {
            const el = document.getElementById('messages-scroll')
            if (el) el.scrollTop = el.scrollHeight
          })
          setUnreadByChannel((prevUnread) => ({ ...prevUnread, [channelId]: false }))
        } else {
          setUnreadByChannel((prevUnread) => ({ ...prevUnread, [channelId]: true }))
        }
        return { ...prev, [channelId]: next }
      })
      const isOwn = user && msg.author?.id === user.id
      const hasFocus = document.visibilityState === 'visible'
      if (!isOwn && !hasFocus && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${msg.author?.displayName || msg.author?.username || t.app.someone}`, { body: msg.content || '' })
        playNotificationSound()
      }
    })
    socket.on('chat:delete', (id: string) => {
      if (!id) return
      setMessageCache((prev) => {
        const next: MessageCache = {}
        Object.entries(prev).forEach(([channelId, list]) => {
          next[channelId] = list.filter((m) => m.id !== id)
        })
        const activeList = activeChannelRef.current ? next[activeChannelRef.current] : null
        if (activeList) {
          setMessages(activeList)
        }
        return next
      })
    })
    socket.on('voice:members', (payload: { channelId: string; members: VoiceMember[] }) => {
      if (!payload?.channelId) return
      setVoiceMembersByChannel((prev) => ({ ...prev, [payload.channelId]: payload.members || [] }))
    })
    return () => {
      socket.disconnect()
    }
  }, [serverBase, user])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    const voiceIds = channels.filter((channel) => channel.type === 'voice').map((channel) => channel.id)
    const watched = watchedVoiceRef.current
    voiceIds.forEach((channelId) => {
      if (!watched.has(channelId)) {
        watched.add(channelId)
        socket.emit('voice:watch', { channelId })
      }
    })
    Array.from(watched).forEach((channelId) => {
      if (!voiceIds.includes(channelId)) {
        watched.delete(channelId)
        socket.emit('voice:unwatch', { channelId })
      }
    })
  }, [channels])

  useEffect(() => {
    const el = document.getElementById('messages-scroll')
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const login = () => {
    localStorage.setItem('return_to', window.location.pathname + window.location.search)
    window.location.href = '/login'
  }

  const logout = async () => {
    await axios.post(`${serverBase}/auth/logout`, {}, { withCredentials: true })
    setUser(null)
    setEntryStep('choice')
    setShowEntryModal(true)
  }

  const sendMessage = () => {
    if (!input.trim()) return
    if (!activeChannelId) return
    if (!user) {
      setEntryStep('choice')
      setShowEntryModal(true)
      return
    }
    socketRef.current?.emit('chat:send', {
      content: input,
      channelId: activeChannelId,
      source: 'web',
    })
    setInput('')
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId)
  const isVoiceChannel = activeChannel?.type === 'voice'
  const canManageChannels = Boolean(user?.id && adminIds.includes(user.id))
  const voiceSwitchTarget = voiceSwitchTargetId ? channels.find((channel) => channel.id === voiceSwitchTargetId) : null

  const applyChannelSelect = (channelId: string) => {
    activeChannelRef.current = channelId
    setActiveChannelId(channelId)
    setUnreadByChannel((prev) => ({ ...prev, [channelId]: false }))
    navigate(`/channels/${channelId}`)
    setShowMobileChannels(false)
  }

  const handleSelectChannel = (channelId: string) => {
    const channel = channels.find((item) => item.id === channelId)
    if (!channel) return
    if (
      channel.type === 'voice' &&
      joinedVoiceChannelId &&
      joinedVoiceChannelId !== channelId &&
      !skipVoiceSwitchConfirm
    ) {
      setVoiceSwitchTargetId(channelId)
      return
    }
    applyChannelSelect(channelId)
  }

  const createGuest = () => {
    const name = guestName.trim()
    if (!name || guestSubmitting) return
    setGuestSubmitting(true)
    axios
      .post(
        `${serverBase}/auth/guest`,
        { name },
        { withCredentials: true },
      )
      .then((res) => {
        if (res.data) {
          setUser(res.data)
          localStorage.setItem('guest_name', res.data.displayName || name)
          setShowEntryModal(false)
        }
      })
      .finally(() => {
        setGuestSubmitting(false)
      })
  }

  return (
    <div
      className={(isDark ? 'theme-dark ' : '') + 'app-shell flex flex-col'}
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="h-9 flex items-center justify-center no-select" style={{ background: 'var(--topbar-bg)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
            <span className="text-xs font-semibold">{serverLabel.slice(0, 1)}</span>
          </div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{serverLabel}</span>
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="hidden md:flex flex-col w-[320px] h-full" style={{ background: 'var(--rail-bg)' }}>
          <div className="flex flex-1 min-h-0">
            <SidebarGuilds t={t} />
          <div
            className="w-64 min-h-0"
            style={{
              background: 'var(--sidebar-bg)',
              boxShadow: 'inset 1px 0 0 var(--topbar-divider), inset 0 1px 0 var(--topbar-divider)',
              borderTopLeftRadius: 'var(--topbar-radius)',
              overflow: 'hidden',
            }}
          >
              <SidebarChannels
                channels={channels}
                activeId={activeChannelId}
                voiceMembersByChannel={voiceMembersByChannel}
                voiceSpeakingByChannel={voiceSpeakingByChannel}
                unreadByChannel={unreadByChannel}
                t={t}
              onSelect={(channelId) => {
                handleSelectChannel(channelId)
              }}
                onOpenServerSettings={() => setShowSettings(true)}
                onRenameChannel={(channelId, name) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/${channelId}/name`, { name }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                onCreateChannel={(type) => {
                  if (!canManageChannels) return
                  const name = window.prompt(t.sidebarChannels.channelNamePrompt)
                  if (!name) return
                  axios.post(`${serverBase}/api/channels`, { name, type }, { withCredentials: true }).then(fetchChannels).catch(() => {})
                }}
                onDeleteChannel={(channelId) => {
                  if (!canManageChannels) return
                  axios.delete(`${serverBase}/api/channels/${channelId}`, { withCredentials: true }).then(fetchChannels).catch(() => {})
                }}
                onToggleChannelHidden={(channelId, hidden) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/${channelId}/hidden`, { hidden }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                onReorderChannels={(orderedIds) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/order`, { orderedIds }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                canManage={canManageChannels}
              />
            </div>
          </div>
        <div
          className="px-3 pb-3"
          style={{ background: 'var(--sidebar-bg)', boxShadow: 'inset 1px 0 0 var(--topbar-divider)' }}
        >
          <SidebarProfileBar
            user={user}
            showUserSettings={showUserSettings}
            settingsTab={settingsTab}
            onSetTab={setSettingsTab}
            onCloseUserSettings={() => {
              setShowUserSettings(false)
              setIsTestingMic(false)
            }}
            onOpenUserSettings={(tab) => {
              setSettingsTab(tab)
              setShowUserSettings(true)
            }}
            onLogout={logout}
            t={t}
            language={language}
            onLanguageChange={setLanguage}
            micSensitivity={micSensitivity}
            onMicSensitivityChange={setMicSensitivity}
              noiseSuppressionMode={noiseSuppressionMode}
              onNoiseSuppressionModeChange={setNoiseSuppressionMode}
              micLevelPercent={dbToPercent(micLevel)}
              micLevelLabel={micLevel}
              micSensitivityPercent={dbToPercent(micSensitivity)}
              isTestingMic={isTestingMic}
              onToggleMicTest={() => setIsTestingMic((prev) => !prev)}
              micTestError={micTestError}
            />
          </div>
        </div>
        <div className="flex-1 flex min-w-0 relative">
        {showMobileChannels ? (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setShowMobileChannels(false)}
            aria-hidden
          />
        ) : null}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 md:hidden ${
            showMobileChannels ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col" style={{ background: 'var(--rail-bg)' }}>
            <div
              className="flex-1 min-h-0"
              style={{
                background: 'var(--sidebar-bg)',
                boxShadow: 'inset 1px 0 0 var(--topbar-divider), inset 0 1px 0 var(--topbar-divider)',
                borderTopLeftRadius: 'var(--topbar-radius)',
                overflow: 'hidden',
              }}
            >
              <SidebarChannels
                channels={channels}
                activeId={activeChannelId}
                voiceMembersByChannel={voiceMembersByChannel}
                voiceSpeakingByChannel={voiceSpeakingByChannel}
                unreadByChannel={unreadByChannel}
                t={t}
                onSelect={(channelId) => {
                  handleSelectChannel(channelId)
                }}
                onOpenServerSettings={() => setShowSettings(true)}
                onRenameChannel={(channelId, name) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/${channelId}/name`, { name }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                onCreateChannel={(type) => {
                  if (!canManageChannels) return
                  const name = window.prompt(t.sidebarChannels.channelNamePrompt)
                  if (!name) return
                  axios.post(`${serverBase}/api/channels`, { name, type }, { withCredentials: true }).then(fetchChannels).catch(() => {})
                }}
                onDeleteChannel={(channelId) => {
                  if (!canManageChannels) return
                  axios.delete(`${serverBase}/api/channels/${channelId}`, { withCredentials: true }).then(fetchChannels).catch(() => {})
                }}
                onToggleChannelHidden={(channelId, hidden) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/${channelId}/hidden`, { hidden }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                onReorderChannels={(orderedIds) => {
                  if (!canManageChannels) return
                  axios
                    .patch(`${serverBase}/api/channels/order`, { orderedIds }, { withCredentials: true })
                    .then(fetchChannels)
                    .catch(() => {})
                }}
                canManage={canManageChannels}
              />
            </div>
            <div
              className="px-3 pb-3"
              style={{ background: 'var(--sidebar-bg)', boxShadow: 'inset 1px 0 0 var(--topbar-divider)' }}
            >
              <SidebarProfileBar
                user={user}
                showUserSettings={showUserSettings}
                settingsTab={settingsTab}
                onSetTab={setSettingsTab}
                onCloseUserSettings={() => {
                  setShowUserSettings(false)
                  setIsTestingMic(false)
                }}
                onOpenUserSettings={(tab) => {
                  setSettingsTab(tab)
                  setShowUserSettings(true)
                }}
                onLogout={logout}
                t={t}
                language={language}
                onLanguageChange={setLanguage}
                micSensitivity={micSensitivity}
                onMicSensitivityChange={setMicSensitivity}
                noiseSuppressionMode={noiseSuppressionMode}
                onNoiseSuppressionModeChange={setNoiseSuppressionMode}
                micLevelPercent={dbToPercent(micLevel)}
                micLevelLabel={micLevel}
                micSensitivityPercent={dbToPercent(micSensitivity)}
                isTestingMic={isTestingMic}
                onToggleMicTest={() => setIsTestingMic((prev) => !prev)}
                micTestError={micTestError}
                renderSettings={false}
              />
            </div>
          </div>
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            title={`${isVoiceChannel ? '?��' : '#'} ${activeChannel?.name || 'general'}`}
            isDark={isDark}
            onLight={() => setIsDark(false)}
            onDark={() => setIsDark(true)}
            user={user}
            onToggleChannels={() => setShowMobileChannels((prev) => !prev)}
            t={t}
          />
          {voiceChannelId ? (
            <div style={{ display: isVoiceChannel ? 'block' : 'none' }}>
              <VoicePanel
                channelId={voiceChannelId}
                socket={socketRef.current}
                user={user}
                noiseSuppressionMode={noiseSuppressionMode}
                t={t}
                onJoinStateChange={(channelId, joined) => {
                  setJoinedVoiceChannelId((prev) => {
                    if (joined) return channelId
                    if (prev === channelId) return ''
                    return prev
                  })
                }}
                onSpeakingChange={(channelId, speakingIds) => {
                  setVoiceSpeakingByChannel((prev) => ({ ...prev, [channelId]: speakingIds }))
                }}
                onRequireLogin={() => {
                  setEntryStep('choice')
                  setShowEntryModal(true)
                }}
              />
            </div>
          ) : null}
          {isVoiceChannel ? null : (
            <>
              <MessageList
                messages={messages}
                adminIds={adminIds}
                loading={loadingMessages}
                error={loadError}
                onRetry={() => fetchHistory(activeChannelId)}
                t={t}
              />
              <Composer value={input} onChange={setInput} onSend={sendMessage} t={t} />
            </>
          )}
          {menu.visible && menu.message
            ? createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40 pointer-events-auto"
                    onMouseDown={() => setMenu({ visible: false, x: 0, y: 0, message: null })}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setMenu({ visible: false, x: 0, y: 0, message: null })
                    }}
                  />
                  <div
                    className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm pointer-events-auto"
                    style={{ top: menu.y, left: menu.x, background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(menu.message!.content || '')
                        setMenu({ visible: false, x: 0, y: 0, message: null })
                      }}
                    >
                      {t.app.copyMessage}
                    </button>
                    {user && (menu.message.author.id === user.id || adminIds.includes(user.id)) && (
                      <button
                        className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                        style={{ color: '#f87171' }}
                        onClick={() => {
                          // ?��e��??????�� ?��i����(?��i����). ?��e���� ???��e��?e�Ƣ� chat:delete e����e����?��i��??��i?��??
                          socketRef.current?.emit('chat:delete', { id: menu.message!.id })
                          setMenu({ visible: false, x: 0, y: 0, message: null })
                        }}
                      >
                        {t.app.deleteMessage}
                      </button>
                    )}
                  </div>
                </>,
                document.getElementById('overlay-root') || document.body
              )
            : null}
          {voiceSwitchTarget ? (
            <div
              className="fixed inset-0 z-50 grid place-items-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={() => setVoiceSwitchTargetId(null)}
            >
              <div
                className="w-[560px] max-w-[92vw] rounded-2xl p-6"
                style={{ background: 'var(--header-bg)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="text-lg font-semibold">확실하세요?</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label="close"
                    onClick={() => setVoiceSwitchTargetId(null)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  다른 음성 채널에 계신 것 같아요. {voiceSwitchTarget.name}(으)로 전환하시겠어요?
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-5 h-10 rounded-md cursor-pointer"
                    style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                    onClick={() => setVoiceSwitchTargetId(null)}
                  >
                    취소
                  </button>
                  <button
                    className="px-5 h-10 rounded-md text-white cursor-pointer"
                    style={{ background: '#5865f2' }}
                    onClick={() => {
                      if (!voiceSwitchTargetId) return
                      applyChannelSelect(voiceSwitchTargetId)
                      setVoiceSwitchTargetId(null)
                    }}
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {showEntryModal && (
            <div className="fixed inset-0 grid place-items-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="w-[520px] max-w-[90vw] rounded-lg" style={{ background: 'var(--header-bg)', border: '1px solid var(--border)' }}>
                {entryStep === 'choice' ? (
                  <>
                    <div className="px-5 pt-4 pb-2 text-base" style={{ color: 'var(--text-primary)' }}>
                      {t.app.loginTitle}
                    </div>
                    <div className="px-5 pb-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t.app.loginSubtitle}
                    </div>
                    <div className="px-5 py-3 flex justify-end gap-2" style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
                      <button
                        className="px-3 h-9 rounded-md cursor-pointer"
                        style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                        onClick={() => setEntryStep('guest')}
                      >
                        {t.app.loginWithout}
                      </button>
                      <button
                        className="px-3 h-9 rounded-md text-white cursor-pointer"
                        style={{ background: '#5865f2' }}
                        onClick={() => {
                          setShowEntryModal(false)
                          login()
                        }}
                      >
                        {t.app.loginDiscord}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-5 py-4 text-base" style={{ color: 'var(--text-primary)' }}>
                      {t.app.guestTitle}
                    </div>
                    <div className="px-5 pb-4">
                      <input
                        value={guestName}
                        onChange={(event) => setGuestName(event.target.value)}
                        placeholder={t.app.guestPlaceholder}
                        className="w-full h-10 px-3 rounded-md"
                        style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      />
                    </div>
                    <div className="px-5 py-3 flex justify-between gap-2" style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
                      <button
                        className="px-3 h-9 rounded-md cursor-pointer"
                        style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                        onClick={() => setEntryStep('choice')}
                      >
                        {t.app.back}
                      </button>
                      <button
                        className="px-3 h-9 rounded-md text-white cursor-pointer disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                        onClick={createGuest}
                        disabled={!guestName.trim() || guestSubmitting}
                      >
                        {t.app.confirm}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    <ServerSettings
        showSettings={showSettings}
        canManage={canManageChannels}
        onCloseSettings={() => setShowSettings(false)}
        adminInput={adminInput}
        onAdminInputChange={setAdminInput}
        t={t}
        onAddAdmin={(id) => {
          if (!canManageChannels) return
          axios
            .post(`${serverBase}/api/admins`, { id }, { withCredentials: true })
            .then((res) => {
              if (Array.isArray(res.data)) setAdminIds(res.data)
            })
            .catch(() => {})
        }}
        onRemoveAdmin={(id) => {
          if (!canManageChannels) return
          axios
            .delete(`${serverBase}/api/admins/${id}`, { withCredentials: true })
            .then((res) => {
              if (Array.isArray(res.data)) setAdminIds(res.data)
            })
            .catch(() => {})
        }}
        adminIds={adminIds}
      />
      <div id="overlay-root" style={{ position: 'fixed', inset: 0, zIndex: 999, pointerEvents: 'none' }} />
    </div>
  )
}

export default App

