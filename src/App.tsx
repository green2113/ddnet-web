import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import SidebarGuilds from './components/SidebarGuilds'
import SidebarChannels from './components/SidebarChannels'
import SidebarProfileBar from './components/SidebarProfileBar'
import ServerSettings from './components/ServerSettings'
import Header from './components/Header'
import MessageList from './components/MessageList'
import Composer from './components/Composer'
import VoicePanel from './components/VoicePanel'
import Tooltip from './components/Tooltip'
import { ScreenShareIcon, VolumeIcon } from './components/icons/VoiceIcons'
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

type ServerMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  isGuest?: boolean
}

type Channel = {
  id: string
  name: string
  hidden?: boolean
  type?: 'text' | 'voice' | 'category'
  categoryId?: string | null
  order?: number
}

type Server = {
  id: string
  name: string
  ownerId?: string
  icon?: string | null
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageCache, setMessageCache] = useState<MessageCache>({})
  const [voiceMembersByChannel, setVoiceMembersByChannel] = useState<VoiceMembersByChannel>({})
  const [voiceCallStartByChannel, setVoiceCallStartByChannel] = useState<Record<string, number>>({})
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([])
  const [serverBans, setServerBans] = useState<ServerMember[]>([])
  const [unreadByChannel, setUnreadByChannel] = useState<UnreadByChannel>({})
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [adminIds, setAdminIds] = useState<string[]>([])
  const canManageChannels = Boolean(user?.id && adminIds.includes(user.id))
  const [servers, setServers] = useState<Server[]>([])
  const [serverOrder, setServerOrder] = useState<string[]>([])
  const [activeServerId, setActiveServerId] = useState('')
  const [isMeView, setIsMeView] = useState(false)
  const [activeChannelId, setActiveChannelId] = useState('')
  const [voiceChannelId, setVoiceChannelId] = useState('')
  const [joinedVoiceChannelId, setJoinedVoiceChannelId] = useState('')
  const [voiceLeaveSignal, setVoiceLeaveSignal] = useState(0)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [voiceSpeakingByChannel, setVoiceSpeakingByChannel] = useState<Record<string, string[]>>({})
  const [autoJoinVoiceChannelId, setAutoJoinVoiceChannelId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ id: string; file: File; name: string; isImage: boolean; previewUrl?: string }>>([])
  const socketRef = useRef<Socket | null>(null)
  const [socketId, setSocketId] = useState<string | null>(null)
  const activeServerRef = useRef('')
  const activeChannelRef = useRef('')
  const lastHistoryChannelIdRef = useRef('')
  const watchedVoiceRef = useRef<Set<string>>(new Set())
  const channelsRef = useRef<Channel[]>([])
  const [isDark, setIsDark] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; message: ChatMessage | null; imageUrl?: string | null }>({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
  const menuSizeRef = useRef({ width: 220, height: 140 })
  const [memberMenu, setMemberMenu] = useState<{ visible: boolean; x: number; y: number; member: ServerMember | null }>({
    visible: false,
    x: 0,
    y: 0,
    member: null,
  })
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null)
  const [imageViewerClosing, setImageViewerClosing] = useState(false)
  const [profileCard, setProfileCard] = useState<{
    visible: boolean
    x: number
    y: number
    user: { id: string; username?: string; displayName?: string; avatar?: string | null }
  } | null>(null)
  const isNearBottomRef = useRef(true)
  const forceScrollRef = useRef(false)
  const [showMobileChannels, setShowMobileChannels] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showLeaveServerConfirm, setShowLeaveServerConfirm] = useState(false)
  const [moderationAction, setModerationAction] = useState<{ type: 'kick' | 'ban'; member: ServerMember } | null>(null)
  const [moderationReason, setModerationReason] = useState('')
  const [leaveServerLoading, setLeaveServerLoading] = useState(false)
  const [createChannelClosing, setCreateChannelClosing] = useState(false)
  const createChannelCloseTimerRef = useRef<number | null>(null)
  const [createChannelType, setCreateChannelType] = useState<'text' | 'voice' | 'category'>('text')
  const [createChannelName, setCreateChannelName] = useState('')
  const [createChannelCategoryId, setCreateChannelCategoryId] = useState<string>('')
  const [createServerName, setCreateServerName] = useState('')
  const [showServerAction, setShowServerAction] = useState(false)
  const [serverActionClosing, setServerActionClosing] = useState(false)
  const serverActionCloseTimerRef = useRef<number | null>(null)
  const [serverActionStep, setServerActionStep] = useState<'select' | 'create' | 'join'>('select')
  const [joinInviteInput, setJoinInviteInput] = useState('')
  const [joinInviteError, setJoinInviteError] = useState('')
  const [joinInviteLoading, setJoinInviteLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteClosing, setInviteClosing] = useState(false)
  const inviteCloseTimerRef = useRef<number | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const imageViewerCloseTimerRef = useRef<number | null>(null)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'voice' | 'language'>('profile')
  const [voiceSwitchTargetId, setVoiceSwitchTargetId] = useState<string | null>(null)
  const [voiceSwitchClosing, setVoiceSwitchClosing] = useState(false)
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
  const [serverNameSaving, setServerNameSaving] = useState(false)
  const [serverIconUploading, setServerIconUploading] = useState(false)
  const [serverSettingsError, setServerSettingsError] = useState('')
  const { serverId: routeServerId, channelId: routeChannelId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestContextRef = useRef<AudioContext | null>(null)
  const micTestAnimationRef = useRef<number | null>(null)
  const t = useMemo(() => getTranslations(language), [language])
  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeServerId) || null,
    [servers, activeServerId]
  )
  useEffect(() => {
    if (!showSettings) return
    setServerSettingsError('')
  }, [showSettings, activeServer?.name])
  const isServerOwner = Boolean(activeServer?.ownerId && user?.id && activeServer.ownerId === user.id)
  const serverLabel = isMeView ? '메인 메뉴' : (activeServer?.name || '')
  const activeGuildId = isMeView ? '@me' : activeServerId
  const orderedServers = useMemo(() => {
    if (!serverOrder.length) return servers
    const orderSet = new Set(serverOrder)
    const ordered = serverOrder
      .map((id) => servers.find((server) => server.id === id))
      .filter(Boolean) as Server[]
    const rest = servers.filter((server) => !orderSet.has(server.id))
    return [...ordered, ...rest]
  }, [servers, serverOrder])

  const handleJoinStateChange = useCallback((channelId: string, joined: boolean) => {
    setJoinedVoiceChannelId((prev) => {
      if (joined) return channelId
      if (prev === channelId) return ''
      return prev
    })
  }, [])

  const handleSpeakingChange = useCallback((channelId: string, speakingIds: string[]) => {
    setVoiceSpeakingByChannel((prev) => ({ ...prev, [channelId]: speakingIds }))
  }, [])

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

  const requireLogin = useCallback(() => {
    if (location.pathname !== '/login') {
      const returnTo = `${location.pathname}${location.search}${location.hash}`
      localStorage.setItem('return_to', returnTo || '/')
      navigate('/login', { replace: true, state: { from: returnTo } })
    }
  }, [location, navigate])

  const scrollMessagesToBottom = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('messages-scroll')
        if (el) el.scrollTop = el.scrollHeight
      })
    })
    window.setTimeout(() => {
      const el = document.getElementById('messages-scroll')
      if (el) el.scrollTop = el.scrollHeight
    }, 80)
  }

  const copyImageToClipboard = async (url: string) => {
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.copyImageFromUrl) {
        try {
          await electronAPI.copyImageFromUrl({ url })
        } catch {}
        return
      }
      const res = await fetch(url)
      const blob = await res.blob()
      const ClipboardItemCtor = (window as any).ClipboardItem
      if (ClipboardItemCtor && navigator.clipboard?.write) {
        const item = new ClipboardItemCtor({ [blob.type]: blob })
        await navigator.clipboard.write([item])
        return
      }
      await navigator.clipboard.writeText(url)
    } catch {
      try {
        await navigator.clipboard.writeText(url)
      } catch {}
    }
  }

  const saveImageToDisk = async (url: string) => {
    try {
      const name = (() => {
        try {
          const u = new URL(url)
          const filename = u.pathname.split('/').pop()
          return filename || 'image'
        } catch {
          return 'image'
        }
      })()
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.saveImageFromUrl) {
        try {
          await electronAPI.saveImageFromUrl({ url, filename: name })
        } catch {}
        return
      }
      const res = await fetch(url)
      const blob = await res.blob()
      const savePicker = (window as any).showSaveFilePicker as
        | ((options: { suggestedName?: string; types?: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<any>)
        | undefined
      if (savePicker && window.isSecureContext) {
        const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
        const type = blob.type || 'application/octet-stream'
        const handle = await savePicker({
          suggestedName: name,
          types: [
            {
              description: 'Image',
              accept: { [type]: ext ? [ext] : ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  useEffect(() => {
    const composer = document.getElementById('composer')
    if (!composer || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      scrollMessagesToBottom()
    })
    observer.observe(composer)
    return () => observer.disconnect()
  }, [])

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

  const fetchServers = useCallback(() => {
    if (!user) return Promise.resolve([] as Server[])
    return axios
      .get(`${serverBase}/api/servers`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setServers(res.data)
          return res.data as Server[]
        }
        return [] as Server[]
      })
      .catch(() => [] as Server[])
  }, [serverBase, user])

  const fetchChannels = useCallback((serverId: string) => {
    if (!serverId) return
    axios
      .get(`${serverBase}/api/servers/${serverId}/channels`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setChannels(res.data)
        }
      })
      .catch(() => {})
  }, [serverBase])

  const refreshChannels = useCallback(() => {
    if (!activeServerId) return
    fetchChannels(activeServerId)
  }, [activeServerId, fetchChannels])

  const fetchAdmins = useCallback((serverId: string) => {
    if (!serverId) return
    axios
      .get(`${serverBase}/api/servers/${serverId}/admins`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAdminIds(res.data)
        }
      })
      .catch(() => {})
  }, [serverBase])

  const fetchBans = useCallback((serverId: string) => {
    if (!serverId) return
    axios
      .get(`${serverBase}/api/servers/${serverId}/bans`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setServerBans(res.data)
        }
      })
      .catch(() => {})
  }, [serverBase])

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
  }, [serverBase])

  useEffect(() => {
    if (!user) {
      setServers([])
      setActiveServerId('')
      setAdminIds([])
      setChannels([])
      setActiveChannelId('')
      return
    }
    fetchServers()
  }, [user, fetchServers])

  useEffect(() => {
    if (!user) {
      setServerOrder([])
      return
    }
    axios
      .get(`${serverBase}/api/servers/order`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setServerOrder(res.data.map((id) => String(id)))
        }
      })
      .catch(() => {})
  }, [user, serverBase])

  useEffect(() => {
    if (!user) return
    if (!servers.length) return
    setServerOrder((prev) => {
      const existing = new Set(servers.map((server) => server.id))
      const next = prev.filter((id) => existing.has(id))
      const missing = servers.map((server) => server.id).filter((id) => !next.includes(id))
      return [...next, ...missing]
    })
  }, [servers, user])

  useEffect(() => {
    if (!authReady) return
    if (!user) requireLogin()
  }, [authReady, user, requireLogin])

  useEffect(() => {
    if (!authReady || user) return
    if (location.pathname === '/login') return
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    localStorage.setItem('return_to', returnTo || '/')
  }, [authReady, user, location])

  useEffect(() => {
    const isMeRoute = location.pathname === '/channels/@me' || location.pathname.startsWith('/channels/@me/')
    if (isMeRoute) {
      setIsMeView(true)
      setActiveServerId('')
      setAdminIds([])
      setChannels([])
      setActiveChannelId('')
      return
    }
    setIsMeView(false)
    if (!servers.length) return
    const requested = routeServerId && servers.find((server) => server.id === routeServerId)
    if (requested) {
      setActiveServerId(requested.id)
      return
    }
    if (!activeServerId || !servers.find((server) => server.id === activeServerId)) {
      setActiveServerId(servers[0].id)
    }
  }, [servers, routeServerId, activeServerId, location.pathname])

  useEffect(() => {
    if (!authReady || !user) return
    if (servers.length > 0) return
    if (location.pathname === '/channels/@me' || location.pathname.startsWith('/channels/@me/')) return
    if (routeServerId && location.pathname.startsWith('/channels/')) return
    navigate('/channels/@me', { replace: true })
  }, [authReady, user, servers.length, navigate, location.pathname, routeServerId])

  useEffect(() => {
    if (!activeServerId) return
    setChannels([])
    setActiveChannelId('')
    setVoiceChannelId('')
    setMessageCache({})
    setMessages([])
    setUnreadByChannel({})
    lastHistoryChannelIdRef.current = ''
    fetchChannels(activeServerId)
    fetchAdmins(activeServerId)
  }, [activeServerId, fetchChannels, fetchAdmins])

  useEffect(() => {
    if (!showSettings || !activeServerId || !canManageChannels) return
    fetchBans(activeServerId)
  }, [showSettings, activeServerId, canManageChannels, fetchBans])

  useEffect(() => {
    if (!user || !activeServerId) {
      setServerMembers([])
      return
    }
    let cancelled = false
    axios
      .get(`${serverBase}/api/servers/${activeServerId}/members`, { withCredentials: true })
      .then((res) => {
        if (cancelled) return
        const members = Array.isArray(res.data) ? res.data : []
        setServerMembers(members.filter((member: ServerMember) => !member.isGuest))
      })
      .catch(() => {
        if (cancelled) return
        setServerMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [activeServerId, serverBase, user])

  useEffect(() => {
    if (voiceSwitchTargetId) {
      setVoiceSwitchClosing(false)
    }
  }, [voiceSwitchTargetId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as any).electronAPI) return
    document.body.classList.add('is-electron')
    return () => {
      document.body.classList.remove('is-electron')
    }
  }, [])


  useEffect(() => {
    if (!channels.length) return
    channelsRef.current = channels
    const requested =
      routeChannelId &&
      (!routeServerId || routeServerId === activeServerId) &&
      channels.find((channel) => channel.id === routeChannelId && channel.type !== 'category')
    if (requested) {
      setActiveChannelId(requested.id)
      return
    }
    const firstChannel = channels.find((channel) => channel.type !== 'category')
    if (!activeChannelId || !channels.find((channel) => channel.id === activeChannelId && channel.type !== 'category')) {
      if (firstChannel) setActiveChannelId(firstChannel.id)
    }
  }, [channels, activeChannelId, routeChannelId, routeServerId, activeServerId])

  useEffect(() => {
    const active = channels.find((channel) => channel.id === activeChannelId)
    if (active?.type === 'voice') {
      setVoiceChannelId(active.id)
    }
  }, [activeChannelId, channels])

  useEffect(() => {
    activeServerRef.current = activeServerId
  }, [activeServerId])

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
          setMessages([])
          fetchHistory(activeChannelId)
        }
      }
    } else if (active?.type === 'voice') {
      lastHistoryChannelIdRef.current = ''
    }
  }, [activeChannelId, channels, messageCache])

  useEffect(() => {
    const isMeRoute = location.pathname === '/channels/@me' || location.pathname.startsWith('/channels/@me/')
    if (isMeView || routeServerId === '@me' || isMeRoute) return
    if (!activeChannelId || !activeServerId) return
    if (routeChannelId !== activeChannelId || routeServerId !== activeServerId) {
      navigate(`/channels/${activeServerId}/${activeChannelId}`, { replace: true })
    }
  }, [activeChannelId, activeServerId, navigate, routeChannelId, routeServerId, isMeView, location.pathname])

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
    if (typeof document === 'undefined') return
    if (isDark) {
      document.body.classList.add('theme-dark')
    } else {
      document.body.classList.remove('theme-dark')
    }
    return () => {
      document.body.classList.remove('theme-dark')
    }
  }, [isDark])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail === 'unsupported') {
        window.alert(t.voice.screenShareUnsupported)
        return
      }
      window.alert(t.voice.screenShareFailed)
    }
    window.addEventListener('voice-screen-share-error', handler as EventListener)
    return () => window.removeEventListener('voice-screen-share-error', handler as EventListener)
  }, [t])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setIsScreenSharing(Boolean(detail))
    }
    window.addEventListener('voice-screen-share-state', handler as EventListener)
    return () => window.removeEventListener('voice-screen-share-state', handler as EventListener)
  }, [])

  useEffect(() => {
    if (!menu.visible) return
    const panel = document.getElementById('context-menu-panel')
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    if (rect.width && rect.height) {
      menuSizeRef.current = { width: rect.width, height: rect.height }
    }
  }, [menu.visible, menu.message, menu.imageUrl])

  useEffect(() => {
    if (!joinedVoiceChannelId) {
      setIsScreenSharing(false)
    }
  }, [joinedVoiceChannelId])


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
    const inputDeviceId = window.localStorage.getItem('voice-input-device')
    const audioConstraints: MediaTrackConstraints = {
      noiseSuppression: noiseSuppressionMode === 'webrtc',
    }
    if (inputDeviceId && inputDeviceId !== 'default') {
      audioConstraints.deviceId = { exact: inputDeviceId }
    }
    navigator.mediaDevices
      .getUserMedia({
        audio: audioConstraints,
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
      const { x, y, message, imageUrl } = e.detail || {}
      const canDelete = Boolean(user && message && (message.author?.id === user.id || adminIds.includes(user.id)))
      const itemCount = 1 + (imageUrl ? 2 : 0) + (canDelete ? 1 : 0)
      const itemHeight = 34
      const padding = 16
      const width = Math.max(menuSizeRef.current.width, 180)
      const height = Math.max(menuSizeRef.current.height, padding + itemCount * itemHeight)
      const margin = 12
      const prefersLeft = x + width + margin > window.innerWidth
      const rawX = prefersLeft ? x - width : x
      const nextX = Math.min(Math.max(rawX, margin), Math.max(margin, window.innerWidth - width - margin))
      const nextY = Math.min(Math.max(y, margin), Math.max(margin, window.innerHeight - height - margin))
      setMenu({ visible: true, x: nextX, y: nextY, message, imageUrl: imageUrl || null })
    }
    const closer = () => setMenu((m) => ({ ...m, visible: false, imageUrl: null }))
    window.addEventListener('open-msg-menu', handler as any)
    window.addEventListener('click', closer)
    return () => {
      window.removeEventListener('open-msg-menu', handler as any)
      window.removeEventListener('click', closer)
    }
  }, [adminIds, user])

  useEffect(() => {
    const socket = io(serverBase, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      setSocketId(socket.id || null)
      watchedVoiceRef.current.clear()
      const voiceIds = channelsRef.current.filter((channel) => channel.type === 'voice').map((channel) => channel.id)
      voiceIds.forEach((channelId) => {
        watchedVoiceRef.current.add(channelId)
        socket.emit('voice:watch', { channelId })
      })
    })
    socket.on('disconnect', () => setSocketId(null))
    socket.on('channels:update', (payload?: { serverId?: string }) => {
      const serverId = activeServerRef.current
      if (!serverId) return
      if (payload?.serverId && payload.serverId !== serverId) return
      fetchChannels(serverId)
    })
    socket.on('servers:update', () => {
      fetchServers()
    })
    socket.on('chat:message', (msg: ChatMessage) => {
      const channelId = msg.channelId
      if (!channelId) return
      setMessageCache((prev) => {
        const existing = prev[channelId] || []
        const next = [...existing, msg]
        if (channelId === activeChannelRef.current) {
          setMessages(next)
          const shouldScroll = Boolean(forceScrollRef.current || isNearBottomRef.current)
          if (shouldScroll) {
            forceScrollRef.current = false
            scrollMessagesToBottom()
          }
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
    socket.on('voice:members', (payload: { channelId: string; members: VoiceMember[]; startedAt?: number | null }) => {
      if (!payload?.channelId) return
      setVoiceMembersByChannel((prev) => ({ ...prev, [payload.channelId]: payload.members || [] }))
      setVoiceCallStartByChannel((prev) => {
        const next = { ...prev }
        if (payload.startedAt) {
          next[payload.channelId] = payload.startedAt
        } else {
          delete next[payload.channelId]
        }
        return next
      })
    })
    return () => {
      socket.disconnect()
    }
  }, [fetchServers, serverBase, user])

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

  useEffect(
    () => () => {
      if (createChannelCloseTimerRef.current) {
        window.clearTimeout(createChannelCloseTimerRef.current)
      }
      if (inviteCloseTimerRef.current) {
        window.clearTimeout(inviteCloseTimerRef.current)
      }
      if (imageViewerCloseTimerRef.current) {
        window.clearTimeout(imageViewerCloseTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (loadingMessages) return
    const el = document.getElementById('messages-scroll')
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loadingMessages])

  useEffect(() => {
    const handler = () => {
      if (isNearBottomRef.current) {
        scrollMessagesToBottom()
      }
    }
    window.addEventListener('invite-card-ready', handler as EventListener)
    return () => window.removeEventListener('invite-card-ready', handler as EventListener)
  }, [])

  useEffect(() => {
    let raf = 0
    let cleanup: (() => void) | null = null
    const attach = () => {
      const el = document.getElementById('messages-scroll')
      if (!el) return false
      const update = () => {
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight
        isNearBottomRef.current = distance < 120
      }
      update()
      const onScroll = () => {
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(update)
      }
      el.addEventListener('scroll', onScroll)
      cleanup = () => {
        el.removeEventListener('scroll', onScroll)
        if (raf) cancelAnimationFrame(raf)
      }
      return true
    }
    if (!attach()) {
      const retry = window.setTimeout(() => {
        attach()
      }, 0)
      cleanup = () => {
        window.clearTimeout(retry)
        if (raf) cancelAnimationFrame(raf)
      }
    }
    return () => cleanup?.()
  }, [])

  const refreshMe = () => {
    axios
      .get(`${serverBase}/api/me`, { withCredentials: true })
      .then((res) => setUser(res.data || null))
      .catch(() => {
        setUser(null)
      })
  }

  useEffect(() => {
    const handler = () => {
      refreshMe()
      fetchServers()
      const serverId = activeServerRef.current
      if (serverId) fetchAdmins(serverId)
    }
    window.addEventListener('auth-complete', handler as EventListener)
    return () => window.removeEventListener('auth-complete', handler as EventListener)
  }, [serverBase, fetchServers, fetchAdmins])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string }>).detail
      if (detail?.url) {
        openImageViewer(detail.url)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeImageViewer()
    }
    window.addEventListener('open-image-viewer', handler as EventListener)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-image-viewer', handler as EventListener)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{
        user?: { id: string; username?: string; displayName?: string; avatar?: string | null }
        x?: number
        y?: number
      }>).detail
      if (!detail?.user?.id) return
      const width = 296
      const height = 320
      const margin = 12
      const anchorX = typeof detail.x === 'number' ? detail.x : window.innerWidth / 2
      const anchorY = typeof detail.y === 'number' ? detail.y : window.innerHeight / 2
      const prefersLeft = anchorX + width + margin > window.innerWidth
      const rawX = prefersLeft ? anchorX - width : anchorX
      const nextX = Math.min(Math.max(rawX, margin), Math.max(margin, window.innerWidth - width - margin))
      const nextY = Math.min(Math.max(anchorY, margin), Math.max(margin, window.innerHeight - height - margin))
      setProfileCard({ visible: true, x: nextX, y: nextY, user: detail.user })
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileCard(null)
    }
    window.addEventListener('open-user-profile', handler as EventListener)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-user-profile', handler as EventListener)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const logout = async () => {
    await axios.post(`${serverBase}/auth/logout`, {}, { withCredentials: true })
    setUser(null)
    requireLogin()
  }

  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return
    if (!activeChannelId) return
    if (!user) {
      requireLogin()
      return
    }
    forceScrollRef.current = true
    if (attachments.length > 0) {
      const uploadedUrls: string[] = []
      setUploading(true)
      try {
        for (const item of attachments) {
          const form = new FormData()
          form.append('file', item.file)
          form.append('channelId', activeChannelId)
          const res = await axios.post(`${serverBase}/api/upload`, form, { withCredentials: true })
          const url = res.data?.url as string | undefined
          if (url) uploadedUrls.push(url)
        }
        const parts = []
        if (input.trim()) parts.push(input.trim())
        if (uploadedUrls.length) parts.push(uploadedUrls.join('\n'))
        socketRef.current?.emit('chat:send', {
          content: parts.join('\n'),
          channelId: activeChannelId,
          source: 'web',
        })
        setInput('')
        setAttachments((prev) => {
          prev.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
          })
          return []
        })
      } catch (error) {
        window.alert('업로드에 실패했습니다.')
      } finally {
        setUploading(false)
      }
      return
    }
    socketRef.current?.emit('chat:send', {
      content: input,
      channelId: activeChannelId,
      source: 'web',
    })
    setInput('')
  }

  const addAttachment = (file: File) => {
    if (!activeChannelId) return
    if (file.size > 50 * 1024 * 1024) {
      window.alert('파일 크기가 50MB를 초과합니다.')
      return
    }
    if (!user) {
      requireLogin()
      return
    }
    const isImage = file.type.startsWith('image/')
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`
    setAttachments((prev) => [...prev, { id, file, name: file.name, isImage, previewUrl }])
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const next = prev.filter((item) => item.id !== id)
      const removed = prev.find((item) => item.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId)
  const isVoiceChannel = activeChannel?.type === 'voice'
  const voiceSidebarChannel = joinedVoiceChannelId ? channels.find((channel) => channel.id === joinedVoiceChannelId) : null
  const isSelfSpeaking = Boolean(
    socketId &&
      voiceSidebarChannel &&
      voiceSpeakingByChannel[voiceSidebarChannel.id]?.includes(socketId)
  )

  const closeVoiceSwitch = () => {
    if (voiceSwitchClosing) return
    setVoiceSwitchClosing(true)
    window.setTimeout(() => {
      setVoiceSwitchTargetId(null)
      setVoiceSwitchClosing(false)
    }, 180)
  }

  const confirmVoiceSwitch = () => {
    if (!voiceSwitchTargetId) return
    const targetId = voiceSwitchTargetId
    setAutoJoinVoiceChannelId(targetId)
    applyChannelSelect(targetId)
    closeVoiceSwitch()
  }
  const voiceSwitchTarget = voiceSwitchTargetId ? channels.find((channel) => channel.id === voiceSwitchTargetId) : null

  const applyChannelSelect = (channelId: string) => {
    activeChannelRef.current = channelId
    setActiveChannelId(channelId)
    setUnreadByChannel((prev) => ({ ...prev, [channelId]: false }))
    if (activeServerId) {
      navigate(`/channels/${activeServerId}/${channelId}`)
    } else {
      navigate(`/`)
    }
    setShowMobileChannels(false)
  }

  const handleSelectChannel = (channelId: string) => {
    const channel = channels.find((item) => item.id === channelId)
    if (!channel) return
    if (channel.type === 'voice' && joinedVoiceChannelId && joinedVoiceChannelId !== channelId) {
      setVoiceSwitchTargetId(channelId)
      return
    }
    if (channel.type === 'voice') {
      setAutoJoinVoiceChannelId(channelId)
    }
    applyChannelSelect(channelId)
  }

  const isElectronApp = typeof window !== 'undefined' && (window as any).electronAPI
  const hasNativeControls = !!(window as any)?.electronAPI?.hasNativeControls

  const closeCreateChannel = () => {
    if (createChannelClosing) return
    setCreateChannelClosing(true)
    createChannelCloseTimerRef.current = window.setTimeout(() => {
      setShowCreateChannel(false)
      setCreateChannelClosing(false)
      createChannelCloseTimerRef.current = null
    }, 180)
  }
  const headerTitle = isMeView ? (
    <div className="flex items-center gap-2 min-w-0">
      <span style={{ color: 'var(--text-muted)' }}>🏠</span>
      <span className="truncate">홈</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 min-w-0">
      {isVoiceChannel ? (
        <span style={{ color: 'var(--text-muted)' }}>
          <VolumeIcon size={16} />
        </span>
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>#</span>
      )}
      <span className="truncate">{activeChannel?.name || 'general'}</span>
    </div>
  )

  if (authReady && !user && location.pathname !== '/login') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from: returnTo }} />
  }
  const handleSelectServer = (serverId: string) => {
    if (!serverId) return
    if (serverId === '@me') {
      navigate('/channels/@me')
      return
    }
    if (serverId === activeServerId) return
    setActiveServerId(serverId)
    navigate(`/channels/${serverId}`)
  }

  const openCreateServerModal = () => {
    if (!user) {
      requireLogin()
      return
    }
    if (user.isGuest) return
    const defaultName = `${user?.displayName || user?.username || '사용자'}님의 서버`
    setCreateServerName(defaultName)
    setServerActionStep('create')
    setShowServerAction(true)
    setServerActionClosing(false)
    if (serverActionCloseTimerRef.current) {
      window.clearTimeout(serverActionCloseTimerRef.current)
      serverActionCloseTimerRef.current = null
    }
  }

  const openServerActionModal = () => {
    if (!user) {
      requireLogin()
      return
    }
    setServerActionStep('select')
    setShowServerAction(true)
    setServerActionClosing(false)
    if (serverActionCloseTimerRef.current) {
      window.clearTimeout(serverActionCloseTimerRef.current)
      serverActionCloseTimerRef.current = null
    }
  }

  const handleCreateServer = () => {
    openServerActionModal()
  }

  const handleReorderServers = (orderedIds: string[]) => {
    if (!user) return
    setServerOrder(orderedIds)
    axios.put(`${serverBase}/api/servers/order`, { orderedIds }, { withCredentials: true }).catch(() => {})
  }

  const closeServerAction = () => {
    if (serverActionClosing) return
    setServerActionClosing(true)
    serverActionCloseTimerRef.current = window.setTimeout(() => {
      setShowServerAction(false)
      setServerActionClosing(false)
      serverActionCloseTimerRef.current = null
    }, 180)
  }

  const openJoinServerModal = () => {
    if (!user) {
      requireLogin()
      return
    }
    setJoinInviteInput('')
    setJoinInviteError('')
    setServerActionStep('join')
    setShowServerAction(true)
    setServerActionClosing(false)
    if (serverActionCloseTimerRef.current) {
      window.clearTimeout(serverActionCloseTimerRef.current)
      serverActionCloseTimerRef.current = null
    }
  }

  const parseInviteCode = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const match = trimmed.match(/invite\/([A-Za-z0-9]+)/i)
    if (match) return match[1]
    if (/^[A-Za-z0-9]+$/.test(trimmed)) return trimmed
    try {
      const url = new URL(trimmed)
      const parts = url.pathname.split('/').filter(Boolean)
      const inviteIndex = parts.findIndex((part) => part.toLowerCase() === 'invite')
      if (inviteIndex >= 0 && parts[inviteIndex + 1]) return parts[inviteIndex + 1]
      if (parts.length) return parts[parts.length - 1]
    } catch {
      // ignore
    }
    return ''
  }

  const handleJoinServer = async () => {
    if (!user) {
      requireLogin()
      return
    }
    const code = parseInviteCode(joinInviteInput)
    if (!code) {
      setJoinInviteError(t.app.serverActionJoinMissing)
      return
    }
    setJoinInviteError('')
    setJoinInviteLoading(true)
    try {
      const res = await axios.post(`${serverBase}/api/invite/${code}/join`, {}, { withCredentials: true })
      const joined = res.data?.server as Server | undefined
      await fetchServers()
      if (joined?.id) {
        setActiveServerId(joined.id)
        navigate(`/channels/${joined.id}`)
      }
      closeServerAction()
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 404) {
        setJoinInviteError(t.app.serverActionJoinInvalid)
      } else if (status === 410) {
        setJoinInviteError(t.app.serverActionJoinExpired)
      } else if (status === 401) {
        setJoinInviteError('로그인이 필요합니다.')
      } else {
        setJoinInviteError(t.app.serverActionJoinFailed)
      }
    } finally {
      setJoinInviteLoading(false)
    }
  }

  const handleKickMember = async (member: ServerMember) => {
    if (!activeServerId || !canManageChannels) return
    try {
      await axios.post(
        `${serverBase}/api/servers/${activeServerId}/kick`,
        { userId: member.id },
        { withCredentials: true },
      )
      setServerMembers((prev) => prev.filter((entry) => entry.id !== member.id))
    } catch {
      // ignore
    }
  }

  const handleBanMember = async (member: ServerMember) => {
    if (!activeServerId || !canManageChannels) return
    try {
      await axios.post(
        `${serverBase}/api/servers/${activeServerId}/bans`,
        { userId: member.id },
        { withCredentials: true },
      )
      setServerMembers((prev) => prev.filter((entry) => entry.id !== member.id))
      setServerBans((prev) => {
        if (prev.some((entry) => entry.id === member.id)) return prev
        return [...prev, member]
      })
    } catch {
      // ignore
    }
  }

  const handleUnbanMember = async (id: string) => {
    if (!activeServerId || !canManageChannels) return
    try {
      await axios.delete(`${serverBase}/api/servers/${activeServerId}/bans/${id}`, { withCredentials: true })
      setServerBans((prev) => prev.filter((entry) => entry.id !== id))
    } catch {
      // ignore
    }
  }

  const handleUpdateServerName = async (name: string) => {
    if (!activeServerId) return
    setServerSettingsError('')
    setServerNameSaving(true)
    try {
      const res = await axios.patch(
        `${serverBase}/api/servers/${activeServerId}`,
        { name },
        { withCredentials: true },
      )
      const updated = res.data as Server | undefined
      if (updated?.id) {
        setServers((prev) => prev.map((server) => (server.id === updated.id ? updated : server)))
      }
    } catch (e: any) {
      const status = e?.response?.status
      setServerSettingsError(status === 400 ? t.serverSettings.nameRequired : t.serverSettings.nameSaveFailed)
    } finally {
      setServerNameSaving(false)
    }
  }

  const handleUpdateServerIcon = async (file: File) => {
    if (!activeServerId) return
    setServerSettingsError('')
    setServerIconUploading(true)
    try {
      const form = new FormData()
      form.append('icon', file)
      const res = await axios.post(`${serverBase}/api/servers/${activeServerId}/icon`, form, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const updated = res.data as Server | undefined
      if (updated?.id) {
        setServers((prev) => prev.map((server) => (server.id === updated.id ? updated : server)))
      }
    } catch {
      setServerSettingsError(t.serverSettings.iconSaveFailed)
    } finally {
      setServerIconUploading(false)
    }
  }

  const openImageViewer = (url: string) => {
    if (imageViewerCloseTimerRef.current) {
      window.clearTimeout(imageViewerCloseTimerRef.current)
      imageViewerCloseTimerRef.current = null
    }
    setImageViewerClosing(false)
    setImageViewerUrl(url)
  }

  const closeImageViewer = () => {
    if (imageViewerClosing) return
    setImageViewerClosing(true)
    imageViewerCloseTimerRef.current = window.setTimeout(() => {
      setImageViewerUrl(null)
      setImageViewerClosing(false)
      imageViewerCloseTimerRef.current = null
    }, 180)
  }

  const openLeaveServerModal = () => {
    if (!activeServerId) return
    setShowLeaveServerConfirm(true)
    setLeaveServerLoading(false)
  }

  const closeLeaveServerModal = () => {
    if (leaveServerLoading) return
    setShowLeaveServerConfirm(false)
  }

  const closeModerationModal = () => {
    setModerationAction(null)
    setModerationReason('')
  }

  const handleLeaveServerConfirm = async () => {
    if (!activeServerId) return
    setLeaveServerLoading(true)
    try {
      await axios.delete(`${serverBase}/api/servers/${activeServerId}/leave`, { withCredentials: true })
      setServerOrder((prev) => prev.filter((id) => id !== activeServerId))
      const list = await fetchServers()
      if (Array.isArray(list) && list.length > 0) {
        setActiveServerId(list[0].id)
        navigate(`/channels/${list[0].id}`)
      } else {
        navigate('/channels/@me')
      }
      setShowLeaveServerConfirm(false)
    } catch {
      window.alert(t.sidebarChannels.leaveServerFailed)
    } finally {
      setLeaveServerLoading(false)
    }
  }


  const closeInviteModal = () => {
    if (inviteClosing) return
    setInviteClosing(true)
    inviteCloseTimerRef.current = window.setTimeout(() => {
      setShowInviteModal(false)
      setInviteClosing(false)
      inviteCloseTimerRef.current = null
    }, 180)
  }

  const openInviteModal = async () => {
    if (!activeServerId) return
    setInviteError('')
    setInviteUrl('')
    setInviteCopied(false)
    setInviteLoading(true)
    setShowInviteModal(true)
    setInviteClosing(false)
    if (inviteCloseTimerRef.current) {
      window.clearTimeout(inviteCloseTimerRef.current)
      inviteCloseTimerRef.current = null
    }
    try {
      const res = await axios.post(
        `${serverBase}/api/servers/${activeServerId}/invites`,
        {},
        { withCredentials: true }
      )
      const url = res.data?.url as string | undefined
      if (url) {
        setInviteUrl(url)
      } else {
        setInviteError(t.app.inviteLinkFailed)
      }
    } catch {
      setInviteError(t.app.inviteLinkFailed)
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div
      className={(isDark ? 'theme-dark ' : '') + 'app-shell flex flex-col'}
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="h-8 w-full relative flex items-center no-select app-drag z-10" style={{ background: 'var(--topbar-bg)' }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 app-no-drag pointer-events-auto text-sm">
            {isMeView ? (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ color: 'var(--text-primary)' }}>
                <path
                  d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-3v6H5a1 1 0 0 1-1-1v-8.5z"
                  fill="currentColor"
                />
              </svg>
            ) : serverLabel ? (
              <div className="w-7 h-7 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
                <span className="text-sm font-semibold">{serverLabel.slice(0, 1)}</span>
              </div>
            ) : (
              <div className="w-7 h-7 rounded-2xl" style={{ background: 'var(--input-bg)' }} />
            )}
            {isMeView ? (
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>홈</span>
            ) : serverLabel ? (
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{serverLabel}</span>
            ) : (
              <span className="inline-block h-4 w-[110px] rounded-md" style={{ background: 'var(--input-bg)' }} />
            )}
          </div>
        </div>
      </div>
      {isElectronApp && !hasNativeControls
        ? createPortal(
            <div
              className="fixed right-0 top-0 h-8 z-[1000] flex items-center app-no-drag pointer-events-auto"
              style={{ color: 'var(--text-primary)' }}
            >
              <button
                type="button"
                className="h-full w-10 grid place-items-center hover-surface cursor-pointer"
                aria-label="Minimize"
                onClick={() => (window as any).electronAPI.minimize()}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="h-full w-10 grid place-items-center hover-surface cursor-pointer"
                aria-label="Maximize"
                onClick={() => (window as any).electronAPI.toggleMaximize()}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
              <button
                type="button"
                className="h-full w-10 grid place-items-center cursor-pointer hover:bg-[#ef4444] hover:text-white"
                aria-label="Close"
                onClick={() => (window as any).electronAPI.close()}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>,
            document.body
          )
        : null}
      <div className="flex-1 flex min-h-0">
        <div className="hidden md:flex flex-col w-[320px] h-full" style={{ background: 'var(--rail-bg)' }}>
          <div className="flex flex-1 min-h-0">
            <SidebarGuilds
              t={t}
              servers={orderedServers}
              activeId={activeGuildId}
              onSelect={handleSelectServer}
              onCreate={handleCreateServer}
              onReorder={handleReorderServers}
            />
            <div
              className="w-64 min-h-0 flex flex-col"
              style={{
                background: 'var(--sidebar-bg)',
                boxShadow: 'inset 1px 0 0 var(--topbar-divider), inset 0 1px 0 var(--topbar-divider)',
                borderTopLeftRadius: 'var(--topbar-radius)',
                overflow: 'hidden',
              }}
            >
              {isMeView ? (
                <div className="flex flex-col h-full">
                  <div
                    className="px-3 h-12 flex items-center"
                    style={{
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                      borderTop: '1px solid var(--topbar-divider)',
                      borderLeft: '1px solid var(--topbar-divider)',
                      borderTopLeftRadius: 'var(--topbar-radius)',
                    }}
                  >
                    <span className="font-medium">홈</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md"
                      style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
                    >
                      홈
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      메시지 요청
                    </button>
                  </div>
                </div>
              ) : (
            <SidebarChannels
              channels={channels}
              activeId={activeChannelId}
              joinedVoiceChannelId={joinedVoiceChannelId}
              serverName={activeServer?.name}
              isOwner={isServerOwner}
              voiceMembersByChannel={voiceMembersByChannel}
              voiceCallStartByChannel={voiceCallStartByChannel}
              voiceSpeakingByChannel={voiceSpeakingByChannel}
              unreadByChannel={unreadByChannel}
              t={t}
                  onSelect={(channelId) => {
                    handleSelectChannel(channelId)
                  }}
                  onOpenServerSettings={() => setShowSettings(true)}
              onCreateChannel={(categoryId) => {
                const nextCategoryId =
                  typeof categoryId === 'string'
                    ? categoryId
                    : channels.find((channel) => channel.type === 'category')?.id || ''
                setCreateChannelType('text')
                setCreateChannelName('')
                setCreateChannelCategoryId(nextCategoryId)
                setShowCreateChannel(true)
                setCreateChannelClosing(false)
                if (createChannelCloseTimerRef.current) {
                  window.clearTimeout(createChannelCloseTimerRef.current)
                  createChannelCloseTimerRef.current = null
                }
              }}
              onCreateCategory={() => {
                setCreateChannelType('category')
                setCreateChannelName('')
                setCreateChannelCategoryId('')
                setShowCreateChannel(true)
                setCreateChannelClosing(false)
                if (createChannelCloseTimerRef.current) {
                  window.clearTimeout(createChannelCloseTimerRef.current)
                  createChannelCloseTimerRef.current = null
                }
              }}
              onCreateInvite={openInviteModal}
              onLeaveServer={openLeaveServerModal}
              onRenameChannel={(channelId, name) => {
                if (!canManageChannels) return
                if (!activeServerId) return
                    axios
                      .patch(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}/name`, { name }, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onDeleteChannel={(channelId) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .delete(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}`, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onToggleChannelHidden={(channelId, hidden) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}/hidden`, { hidden }, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onReorderChannels={(orderedIds, categoryId) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(
                        `${serverBase}/api/servers/${activeServerId}/channels/order`,
                        { orderedIds, categoryId },
                        { withCredentials: true }
                      )
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
              onReorderCategories={(orderedIds) => {
                if (!canManageChannels) return
                if (!activeServerId) return
                axios
                  .patch(`${serverBase}/api/servers/${activeServerId}/categories/order`, { orderedIds }, { withCredentials: true })
                  .then(refreshChannels)
                  .catch(() => {})
              }}
              canManage={canManageChannels}
            />
              )}
            </div>
          </div>
          <div
            className="px-3 pb-3 shrink-0"
            style={{ background: 'var(--sidebar-bg)', boxShadow: 'inset 1px 0 0 var(--topbar-divider)' }}
          >
          {voiceSidebarChannel ? (
            <div
              className="border rounded-t-xl px-3 py-2"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--header-bg)',
                boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold" style={{ color: '#22c55e' }}>
                    {t.voice.title}
                  </div>
                  <button
                    type="button"
                    className="text-sm truncate text-left cursor-pointer hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => handleSelectChannel(voiceSidebarChannel.id)}
                  >
                    {voiceSidebarChannel.name}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {user?.isGuest ? (
                    <Tooltip label={t.sidebarChannels.guestDisabled}>
                      <button
                        type="button"
                        aria-label={t.sidebarChannels.guestDisabled}
                        aria-disabled
                        className="h-8 w-8 rounded-md grid place-items-center"
                        style={{ color: 'rgba(255,255,255,0.35)', cursor: 'not-allowed' }}
                        onClick={() => {}}
                      >
                        <ScreenShareIcon size={16} />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip label={isScreenSharing ? t.voice.stopShare : t.voice.screenShare}>
                      <button
                        type="button"
                        aria-label={isScreenSharing ? t.voice.stopShare : t.voice.screenShare}
                        aria-pressed={isScreenSharing}
                        className="h-8 w-8 rounded-md grid place-items-center hover-surface cursor-pointer"
                        style={{ color: '#ffffff' }}
                        onClick={() => window.dispatchEvent(new CustomEvent('voice-screen-share-toggle'))}
                      >
                        <ScreenShareIcon size={16} />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip label={t.voice.disconnect}>
                    <button
                      type="button"
                      aria-label={t.voice.leave}
                      className="h-8 w-8 rounded-md grid place-items-center hover-surface cursor-pointer"
                      style={{ color: '#cbd5e1' }}
                      onClick={() => setVoiceLeaveSignal((prev) => prev + 1)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M24,6.24c0,7.64-10.13,17.76-17.76,17.76-1.67,0-3.23-.63-4.38-1.78l-1-1.15c-1.16-1.16-1.16-3.12,.05-4.33,.03-.03,2.44-1.88,2.44-1.88,1.2-1.14,3.09-1.14,4.28,0l1.46,1.17c3.2-1.36,5.47-3.64,6.93-6.95l-1.16-1.46c-1.15-1.19-1.15-3.09,0-4.28,0,0,1.85-2.41,1.88-2.44,1.21-1.21,3.17-1.21,4.38,0l1.05,.91c1.2,1.19,1.83,2.75,1.83,4.42Z" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : null}
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
            hasVoicePanel={!!voiceSidebarChannel}
            isSpeaking={isSelfSpeaking}
            onUpdateProfile={async (displayName) => {
              const res = await axios.patch(
                `${serverBase}/api/users/me`,
                { displayName },
                { withCredentials: true },
              )
              setUser(res.data || null)
            }}
            onUploadAvatar={async (file) => {
              const form = new FormData()
              form.append('avatar', file)
              const res = await axios.post(`${serverBase}/api/users/me/avatar`, form, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
              })
              setUser(res.data || null)
            }}
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
              className="flex-1 min-h-0 flex flex-col"
              style={{
                background: 'var(--sidebar-bg)',
                boxShadow: 'inset 1px 0 0 var(--topbar-divider), inset 0 1px 0 var(--topbar-divider)',
                borderTopLeftRadius: 'var(--topbar-radius)',
                overflow: 'hidden',
              }}
            >
              {isMeView ? (
                <div className="flex flex-col h-full">
                  <div
                    className="px-3 h-12 flex items-center"
                    style={{
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border)',
                      borderTop: '1px solid var(--topbar-divider)',
                      borderLeft: '1px solid var(--topbar-divider)',
                      borderTopLeftRadius: 'var(--topbar-radius)',
                    }}
                  >
                    <span className="font-medium">홈</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md"
                      style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}
                    >
                      홈
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      친구
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      메시지 요청
                    </button>
                  </div>
                </div>
              ) : (
            <SidebarChannels
              channels={channels}
              activeId={activeChannelId}
              joinedVoiceChannelId={joinedVoiceChannelId}
              serverName={activeServer?.name}
              isOwner={isServerOwner}
                  voiceMembersByChannel={voiceMembersByChannel}
                  voiceCallStartByChannel={voiceCallStartByChannel}
                  voiceSpeakingByChannel={voiceSpeakingByChannel}
                  unreadByChannel={unreadByChannel}
                  t={t}
                  onSelect={(channelId) => {
                    handleSelectChannel(channelId)
                  }}
                  onOpenServerSettings={() => setShowSettings(true)}
              onCreateChannel={(categoryId) => {
                const nextCategoryId =
                  typeof categoryId === 'string'
                    ? categoryId
                    : channels.find((channel) => channel.type === 'category')?.id || ''
                setCreateChannelType('text')
                setCreateChannelName('')
                setCreateChannelCategoryId(nextCategoryId)
                setShowCreateChannel(true)
                setCreateChannelClosing(false)
                if (createChannelCloseTimerRef.current) {
                  window.clearTimeout(createChannelCloseTimerRef.current)
                  createChannelCloseTimerRef.current = null
                }
              }}
              onCreateCategory={() => {
                setCreateChannelType('category')
                setCreateChannelName('')
                setCreateChannelCategoryId('')
                setShowCreateChannel(true)
                setCreateChannelClosing(false)
                if (createChannelCloseTimerRef.current) {
                  window.clearTimeout(createChannelCloseTimerRef.current)
                  createChannelCloseTimerRef.current = null
                }
              }}
              onCreateInvite={openInviteModal}
              onLeaveServer={openLeaveServerModal}
                  onRenameChannel={(channelId, name) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}/name`, { name }, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onDeleteChannel={(channelId) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .delete(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}`, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onToggleChannelHidden={(channelId, hidden) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(`${serverBase}/api/servers/${activeServerId}/channels/${channelId}/hidden`, { hidden }, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onReorderChannels={(orderedIds, categoryId) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(
                        `${serverBase}/api/servers/${activeServerId}/channels/order`,
                        { orderedIds, categoryId },
                        { withCredentials: true }
                      )
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  onReorderCategories={(orderedIds) => {
                    if (!canManageChannels) return
                    if (!activeServerId) return
                    axios
                      .patch(`${serverBase}/api/servers/${activeServerId}/categories/order`, { orderedIds }, { withCredentials: true })
                      .then(refreshChannels)
                      .catch(() => {})
                  }}
                  canManage={canManageChannels}
                />
              )}
            </div>
            <div
              className="px-3 pb-3 shrink-0"
              style={{ background: 'var(--sidebar-bg)', boxShadow: 'inset 1px 0 0 var(--topbar-divider)' }}
            >
              {voiceSidebarChannel ? (
                <div
                  className="border rounded-t-xl px-3 py-2"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--header-bg)',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold" style={{ color: '#22c55e' }}>
                        {t.voice.title}
                      </div>
                      <button
                        type="button"
                        className="text-sm truncate text-left cursor-pointer hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => handleSelectChannel(voiceSidebarChannel.id)}
                      >
                        {voiceSidebarChannel.name}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.isGuest ? (
                        <Tooltip label={t.sidebarChannels.guestDisabled}>
                          <button
                            type="button"
                            aria-label={t.sidebarChannels.guestDisabled}
                            aria-disabled
                            className="h-8 w-8 rounded-md grid place-items-center"
                            style={{ color: 'rgba(255,255,255,0.35)', cursor: 'not-allowed' }}
                            onClick={() => {}}
                          >
                            <ScreenShareIcon size={16} />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip label={isScreenSharing ? t.voice.stopShare : t.voice.screenShare}>
                          <button
                            type="button"
                            aria-label={isScreenSharing ? t.voice.stopShare : t.voice.screenShare}
                            aria-pressed={isScreenSharing}
                            className="h-8 w-8 rounded-md grid place-items-center hover-surface cursor-pointer"
                            style={{ color: '#ffffff' }}
                            onClick={() => window.dispatchEvent(new CustomEvent('voice-screen-share-toggle'))}
                          >
                            <ScreenShareIcon size={16} />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip label={t.voice.disconnect}>
                        <button
                          type="button"
                          aria-label={t.voice.leave}
                          className="h-8 w-8 rounded-md grid place-items-center hover-surface cursor-pointer"
                          style={{ color: '#cbd5e1' }}
                          onClick={() => setVoiceLeaveSignal((prev) => prev + 1)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M24,6.24c0,7.64-10.13,17.76-17.76,17.76-1.67,0-3.23-.63-4.38-1.78l-1-1.15c-1.16-1.16-1.16-3.12,.05-4.33,.03-.03,2.44-1.88,2.44-1.88,1.2-1.14,3.09-1.14,4.28,0l1.46,1.17c3.2-1.36,5.47-3.64,6.93-6.95l-1.16-1.46c-1.15-1.19-1.15-3.09,0-4.28,0,0,1.85-2.41,1.88-2.44,1.21-1.21,3.17-1.21,4.38,0l1.05,.91c1.2,1.19,1.83,2.75,1.83,4.42Z" />
                          </svg>
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ) : null}
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
                hasVoicePanel={!!voiceSidebarChannel}
                isSpeaking={isSelfSpeaking}
                onUpdateProfile={async (displayName) => {
                  const res = await axios.patch(
                    `${serverBase}/api/users/me`,
                    { displayName },
                    { withCredentials: true },
                  )
                  setUser(res.data || null)
                }}
                onUploadAvatar={async (file) => {
                  const form = new FormData()
                  form.append('avatar', file)
                  const res = await axios.post(`${serverBase}/api/users/me/avatar`, form, {
                    withCredentials: true,
                    headers: { 'Content-Type': 'multipart/form-data' },
                  })
                  setUser(res.data || null)
                }}
              />
            </div>
          </div>
        </div>
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            title={headerTitle}
            isDark={isDark}
            onLight={() => setIsDark(false)}
            onDark={() => setIsDark(true)}
            user={user}
            onToggleChannels={() => setShowMobileChannels((prev) => !prev)}
            t={t}
          />
          {!isMeView && voiceChannelId ? (
            <div
              className="flex-1 min-h-0 flex"
              style={{ display: isVoiceChannel ? 'flex' : 'none' }}
            >
              <VoicePanel
                channelId={voiceChannelId}
                socket={socketRef.current}
                user={user}
                noiseSuppressionMode={noiseSuppressionMode}
                t={t}
                autoJoin={autoJoinVoiceChannelId === voiceChannelId}
                onAutoJoinHandled={() => {
                  setAutoJoinVoiceChannelId(null)
                }}
                leaveSignal={voiceLeaveSignal}
                onJoinStateChange={handleJoinStateChange}
                onSpeakingChange={handleSpeakingChange}
                onRequireLogin={() => {
                  requireLogin()
                }}
              />
            </div>
          ) : null}
          {isMeView ? (
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0 flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>
                <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold">친구</div>
                    <button
                      type="button"
                      className="h-8 px-3 rounded-md text-sm font-semibold cursor-pointer hover-surface"
                      style={{ background: 'var(--accent)', color: '#111' }}
                    >
                      친구 추가하기
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <button className="px-3 h-8 rounded-md cursor-pointer hover-surface" style={{ background: 'var(--hover-bg)', color: 'var(--text-primary)' }}>온라인</button>
                    <button className="px-3 h-8 rounded-md cursor-pointer hover-surface" style={{ color: 'var(--text-muted)' }}>모두</button>
                    <button className="px-3 h-8 rounded-md cursor-pointer hover-surface" style={{ color: 'var(--text-muted)' }}>대기 중</button>
                    <button className="px-3 h-8 rounded-md cursor-pointer hover-surface" style={{ color: 'var(--text-muted)' }}>차단됨</button>
                  </div>
                </div>
                <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 rounded-md px-3 h-10" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>🔍</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>대화 찾기 또는 시작하기</span>
                  </div>
                </div>
                
              </div>
              <div className="w-[280px] shrink-0 p-4 space-y-3">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>현재 활동 중</div>
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="rounded-xl p-3 hover-surface cursor-pointer" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--input-bg)' }} />
                      <div>
                        <div className="text-sm font-semibold">활동 {idx}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>지금 참여 중</div>
                      </div>
                    </div>
                    <div className="mt-3 h-24 rounded-md" style={{ background: 'var(--input-bg)' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : isVoiceChannel ? null : (
            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0 flex flex-col">
                <MessageList
                  messages={messages}
                  adminIds={adminIds}
                  loading={loadingMessages}
                  error={loadError}
                  onRetry={() => fetchHistory(activeChannelId)}
                  t={t}
                />
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={sendMessage}
                  onAddAttachment={addAttachment}
                  onRemoveAttachment={removeAttachment}
                  uploading={uploading}
                  attachments={attachments}
                  channelName={activeChannel?.name || 'general'}
                  t={t}
                />
              </div>
              <aside
                className="hidden lg:flex flex-col w-64 shrink-0 border-l px-4 py-4"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-app)' }}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t.header.members} - {serverMembers.length}
                </div>
                <div className="mt-3 space-y-0">
                  {serverMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1 hover-surface cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation()
                        const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
                        const ev = new CustomEvent('open-user-profile', {
                          detail: { user: member, x: rect.left - 8, y: rect.top },
                        })
                        window.dispatchEvent(ev)
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        const showAdminActions = Boolean(canManageChannels && user && member.id !== user.id)
                        const itemCount = 1 + (showAdminActions ? 2 : 0)
                        const itemHeight = 34
                        const padding = 16
                        const width = 210
                        const height = padding + itemCount * itemHeight
                        const margin = 12
                        const prefersLeft = event.clientX + width + margin > window.innerWidth
                        const rawX = prefersLeft ? event.clientX - width : event.clientX
                        const nextX = Math.min(Math.max(rawX, margin), Math.max(margin, window.innerWidth - width - margin))
                        const nextY = Math.min(Math.max(event.clientY, margin), Math.max(margin, window.innerHeight - height - margin))
                        setMemberMenu({ visible: true, x: nextX, y: nextY, member })
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
                        style={{ background: 'var(--panel)' }}
                      >
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold">
                            {(member.displayName || member.username || 'U').slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{member.displayName || member.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}
          {menu.visible && menu.message
            ? createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40 pointer-events-auto"
                    onMouseDown={() => setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
                    }}
                  />
                  <div
                    id="context-menu-panel"
                    className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm pointer-events-auto"
                    style={{
                      top: menu.y,
                      left: menu.x,
                      background: 'var(--header-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {menu.imageUrl ? (
                      <>
                        <button
                          className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                          onClick={() => {
                            copyImageToClipboard(menu.imageUrl!)
                            setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
                          }}
                        >
                          {t.app.copyImage}
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                          onClick={() => {
                            saveImageToDisk(menu.imageUrl!)
                            setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
                          }}
                        >
                          {t.app.saveImage}
                        </button>
                      </>
                    ) : null}
                    <button
                      className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(menu.message!.content || '')
                        setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
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
                          setMenu({ visible: false, x: 0, y: 0, message: null, imageUrl: null })
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
          {memberMenu.visible && memberMenu.member
            ? createPortal(
                <>
                  <div
                    className="fixed inset-0 z-40 pointer-events-auto"
                    onMouseDown={() => setMemberMenu({ visible: false, x: 0, y: 0, member: null })}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setMemberMenu({ visible: false, x: 0, y: 0, member: null })
                    }}
                  />
                  <div
                    className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm pointer-events-auto"
                    style={{
                      top: memberMenu.y,
                      left: memberMenu.x,
                      background: 'var(--header-bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canManageChannels && user && memberMenu.member.id !== user.id ? (
                      <>
                        <button
                          className="w-full text-left px-3 py-2 cursor-pointer member-menu-danger"
                          onClick={() => {
                            setModerationReason('')
                            setModerationAction({ type: 'kick', member: memberMenu.member! })
                            setMemberMenu({ visible: false, x: 0, y: 0, member: null })
                          }}
                        >
                          {t.app.kickUser.replace('{name}', memberMenu.member.displayName || memberMenu.member.username)}
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 cursor-pointer member-menu-danger"
                          onClick={() => {
                            setModerationReason('')
                            setModerationAction({ type: 'ban', member: memberMenu.member! })
                            setMemberMenu({ visible: false, x: 0, y: 0, member: null })
                          }}
                        >
                          {t.app.banUser.replace('{name}', memberMenu.member.displayName || memberMenu.member.username)}
                        </button>
                      </>
                    ) : null}
                    <button
                      className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(memberMenu.member!.id)
                        setMemberMenu({ visible: false, x: 0, y: 0, member: null })
                      }}
                    >
                      {t.app.copyUserId}
                    </button>
                  </div>
                </>,
                document.getElementById('overlay-root') || document.body
              )
            : null}
          {voiceSwitchTarget ? (
            <div
              className={`fixed inset-0 z-50 grid place-items-center voice-switch-overlay${voiceSwitchClosing ? ' is-exiting' : ''}`}
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeVoiceSwitch}
            >
              <div
                className={`w-[560px] max-w-[92vw] rounded-2xl p-6 voice-switch-panel${voiceSwitchClosing ? ' is-exiting' : ''}`}
                style={{ background: 'var(--header-bg)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="text-lg font-semibold">확실하세요?</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label="close"
                    onClick={closeVoiceSwitch}
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
                    onClick={closeVoiceSwitch}
                  >
                    취소
                  </button>
                  <button
                    className="px-5 h-10 rounded-md text-white cursor-pointer"
                    style={{ background: '#5865f2' }}
                    onClick={confirmVoiceSwitch}
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {showCreateChannel ? (
            <div
              className={`fixed inset-0 z-50 grid place-items-center modal-overlay${createChannelClosing ? ' is-exiting' : ''}`}
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeCreateChannel}
            >
              <div
                className={`w-[520px] max-w-[92vw] rounded-2xl p-6 modal-panel${createChannelClosing ? ' is-exiting' : ''}`}
                style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold">
                    {createChannelType === 'category'
                      ? t.sidebarChannels.createCategoryTitle
                      : t.sidebarChannels.createTitle}
                  </div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label={t.sidebarChannels.closeCreate}
                    onClick={closeCreateChannel}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  {createChannelType === 'category'
                    ? t.sidebarChannels.createCategorySubtitle
                    : t.sidebarChannels.createSubtitle}
                </div>
                {createChannelType !== 'category' ? (
                  <>
                    <div className="text-sm font-semibold mb-2">{t.sidebarChannels.channelType}</div>
                    <div className="space-y-2 mb-5">
                      {(['text', 'voice'] as const).map((option) => {
                        const isSelected = createChannelType === option
                        const icon = option === 'text' ? <span style={{ color: 'var(--text-muted)' }}>#</span> : <VolumeIcon size={18} />
                        return (
                          <button
                            key={option}
                            type="button"
                            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--accent) 18%, transparent)' : 'var(--panel)',
                              border: isSelected ? '1px solid color-mix(in oklch, var(--accent) 60%, transparent)' : '1px solid var(--border)',
                            }}
                            onClick={() => setCreateChannelType(option)}
                          >
                            <div className="h-9 w-9 rounded-full grid place-items-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              {icon}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-semibold">
                                {option === 'text' ? t.sidebarChannels.textOption : t.sidebarChannels.voiceOption}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {option === 'text' ? t.sidebarChannels.textOptionDesc : t.sidebarChannels.voiceOptionDesc}
                              </div>
                            </div>
                            <div
                              className="h-5 w-5 rounded-full border grid place-items-center"
                              style={{
                                borderColor: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                background: isSelected ? 'var(--accent)' : 'transparent',
                              }}
                            >
                              {isSelected ? <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#fff' }} /> : null}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
                <div className="text-sm font-semibold mb-2 mt-5">
                  {createChannelType === 'category' ? t.sidebarChannels.categoryNameLabel : t.sidebarChannels.channelNameLabel}
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 channel-name-field" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                  {createChannelType === 'category' ? null : (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {createChannelType === 'text' ? '#' : <VolumeIcon size={16} />}
                    </span>
                  )}
                  <input
                    value={createChannelName}
                    onChange={(event) => setCreateChannelName(event.target.value)}
                    placeholder={
                      createChannelType === 'category'
                        ? t.sidebarChannels.categoryNamePlaceholder
                        : t.sidebarChannels.channelNamePlaceholder
                    }
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="flex-1 h-10 rounded-md"
                    style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                    onClick={closeCreateChannel}
                  >
                    {t.sidebarChannels.cancelCreate}
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-10 rounded-md text-white disabled:opacity-50"
                    style={{ background: 'var(--accent)' }}
                    onClick={() => {
                      if (!canManageChannels) return
                      if (!activeServerId) return
                      const name = createChannelName.trim()
                      if (!name) return
                      axios
                        .post(
                          `${serverBase}/api/servers/${activeServerId}/channels`,
                          {
                            name,
                            type: createChannelType,
                            categoryId: createChannelType === 'category' ? undefined : createChannelCategoryId || null,
                          },
                          { withCredentials: true }
                        )
                        .then(refreshChannels)
                        .catch(() => {})
                      closeCreateChannel()
                    }}
                    disabled={!createChannelName.trim()}
                  >
                    {t.sidebarChannels.confirmCreate}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {showServerAction ? (
            <div
              className={`fixed inset-0 z-50 grid place-items-center modal-overlay${serverActionClosing ? ' is-exiting' : ''}`}
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeServerAction}
            >
              <div
                className={`w-[560px] max-w-[92vw] rounded-2xl p-6 modal-panel${serverActionClosing ? ' is-exiting' : ''}`}
                style={{
                  height: serverActionStep === 'select' ? '320px' : '280px',
                  background: 'var(--header-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  transition: 'height 220ms ease',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {serverActionStep !== 'select' ? (
                      <button
                        type="button"
                        className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                        aria-label="back"
                        onClick={() => setServerActionStep('select')}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : null}
                    <div className="text-xl font-semibold">
                      {serverActionStep === 'create'
                        ? t.app.serverActionTitleCreate
                        : serverActionStep === 'join'
                          ? t.app.serverActionTitleJoin
                          : t.app.serverActionTitle}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label="close"
                    onClick={closeServerAction}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="relative overflow-hidden">
                  <div
                    className="flex"
                    style={{
                      width: '100%',
                      transform:
                        serverActionStep === 'create'
                          ? 'translateX(-100%)'
                          : serverActionStep === 'join'
                            ? 'translateX(-200%)'
                            : 'translateX(0)',
                      transition: 'transform 240ms ease',
                    }}
                  >
                    <div className="w-full shrink-0">
                      <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                        {t.app.serverActionSelectDescription}
                      </div>
                      <div className="grid gap-3">
                        {user?.isGuest ? (
                          <Tooltip label={t.sidebarChannels.guestDisabled} side="top" offsetY={20}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-4 rounded-xl cursor-pointer hover-surface flex items-center justify-between gap-3"
                              style={{
                                background: 'var(--panel)',
                                border: '1px solid var(--border)',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                              }}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.background = 'var(--panel)'
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.background = 'var(--panel)'
                              }}
                              onClick={() => {}}
                            >
                              <div>
                                <div className="text-[15px] font-semibold">{t.app.serverActionTitleCreate}</div>
                                <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                  {t.app.serverActionCreateDescription}
                                </div>
                              </div>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </Tooltip>
                        ) : (
                          <button
                            type="button"
                            className="w-full text-left px-4 py-4 rounded-xl cursor-pointer hover-surface flex items-center justify-between gap-3"
                            style={{
                              background: 'var(--panel)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.background = 'color-mix(in oklch, white 6%, var(--panel))'
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.background = 'var(--panel)'
                            }}
                            onClick={() => {
                              openCreateServerModal()
                            }}
                          >
                            <div>
                              <div className="text-[15px] font-semibold">{t.app.serverActionTitleCreate}</div>
                              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                {t.app.serverActionCreateDescription}
                              </div>
                            </div>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          className="w-full text-left px-4 py-4 rounded-xl cursor-pointer hover-surface flex items-center justify-between gap-3"
                          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.background = 'color-mix(in oklch, white 6%, var(--panel))'
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.background = 'var(--panel)'
                          }}
                          onClick={() => openJoinServerModal()}
                        >
                          <div>
                            <div className="text-[15px] font-semibold">{t.app.serverActionTitleJoin}</div>
                            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                              {t.app.serverActionJoinDescription}
                            </div>
                          </div>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="w-full shrink-0">
                      <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                        {t.app.serverActionNameHint}
                      </div>
                      <div className="text-[15px] font-semibold mb-2">{t.app.serverActionNameLabel}</div>
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                        <input
                          value={createServerName}
                          onChange={(event) => setCreateServerName(event.target.value)}
                          placeholder=""
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          className="flex-1 h-10 rounded-md cursor-pointer hover-surface"
                          style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                          onClick={() => setServerActionStep('select')}
                        >
                          {t.app.serverActionBack}
                        </button>
                        <button
                          type="button"
                          className="flex-1 h-10 rounded-md text-white disabled:opacity-50 cursor-pointer hover-surface"
                          style={{ background: 'var(--accent)' }}
                          onClick={async () => {
                            if (!user) {
                              requireLogin()
                              return
                            }
                            const name = createServerName.trim()
                            if (!name) return
                            try {
                              const res = await axios.post(
                                `${serverBase}/api/servers`,
                                { name },
                                { withCredentials: true }
                              )
                              const created = res.data as Server | null
                              await fetchServers()
                              if (created?.id) {
                                setActiveServerId(created.id)
                              }
                              closeServerAction()
                            } catch {
                              window.alert(t.app.serverActionCreateFailed)
                            }
                          }}
                          disabled={!createServerName.trim()}
                        >
                          {t.app.serverActionCreateButton}
                        </button>
                      </div>
                    </div>
                    <div className="w-full shrink-0">
                      <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                        {t.app.serverActionJoinInstruction}
                      </div>
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                        <input
                          value={joinInviteInput}
                          onChange={(event) => {
                            setJoinInviteInput(event.target.value)
                            if (joinInviteError) setJoinInviteError('')
                          }}
                          placeholder={t.app.serverActionJoinPlaceholder}
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        />
                      </div>
                      {joinInviteError ? (
                  <div className="text-sm mt-3" style={{ color: '#f87171' }}>
                          {joinInviteError}
                        </div>
                      ) : null}
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          className="flex-1 h-10 rounded-md cursor-pointer hover-surface"
                          style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                          onClick={() => setServerActionStep('select')}
                        >
                          {t.app.serverActionBack}
                        </button>
                        <button
                          type="button"
                          className="flex-1 h-10 rounded-md text-white disabled:opacity-50 cursor-pointer hover-surface"
                          style={{ background: 'var(--accent)' }}
                          onClick={handleJoinServer}
                          disabled={!joinInviteInput.trim() || joinInviteLoading}
                        >
                          {joinInviteLoading ? t.app.serverActionJoinLoading : t.app.serverActionJoinButton}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {showInviteModal ? (
            <div
              className={`fixed inset-0 z-50 grid place-items-center modal-overlay${inviteClosing ? ' is-exiting' : ''}`}
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeInviteModal}
            >
              <div
                className={`w-[520px] max-w-[92vw] rounded-2xl p-6 modal-panel${inviteClosing ? ' is-exiting' : ''}`}
                style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold">서버에 초대하기</div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label="close"
                    onClick={closeInviteModal}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  이 링크를 공유해서 서버에 초대할 수 있어요.
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <input
                    value={inviteUrl}
                    readOnly
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder={inviteLoading ? t.app.inviteLinkLoading : t.app.inviteLinkFailed}
                  />
                  <button
                    type="button"
                    className="px-3 h-9 rounded-md text-white cursor-pointer hover-surface"
                    style={{ background: 'var(--accent)' }}
                    onClick={async () => {
                      if (!inviteUrl) return
                      try {
                        await navigator.clipboard.writeText(inviteUrl)
                        setInviteCopied(true)
                        window.setTimeout(() => setInviteCopied(false), 1600)
                      } catch {}
                    }}
                    disabled={!inviteUrl}
                  >
                    {inviteCopied ? '✓ 복사됨' : '복사'}
                  </button>
                </div>
                {inviteError ? (
                  <div className="text-xs mt-3" style={{ color: '#f87171' }}>{inviteError}</div>
                ) : null}
              </div>
            </div>
          ) : null}
          {showLeaveServerConfirm ? (
            <div
              className="fixed inset-0 z-50 grid place-items-center modal-overlay"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeLeaveServerModal}
            >
              <div
                className="w-[520px] max-w-[92vw] rounded-2xl p-6 modal-panel"
                style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-lg font-semibold">{t.sidebarChannels.leaveServerTitle}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  {t.sidebarChannels.leaveServerPrompt}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 h-10 rounded-md cursor-pointer hover-surface"
                    style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                    onClick={closeLeaveServerModal}
                    disabled={leaveServerLoading}
                  >
                    {t.sidebarChannels.leaveServerCancel}
                  </button>
                  <button
                    type="button"
                    className="px-4 h-10 rounded-md text-white cursor-pointer hover-surface"
                    style={{ background: '#ef4444' }}
                    onClick={handleLeaveServerConfirm}
                    disabled={leaveServerLoading}
                  >
                    {t.sidebarChannels.leaveServerConfirm}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {moderationAction ? (
            <div
              className="fixed inset-0 z-50 grid place-items-center modal-overlay"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onMouseDown={closeModerationModal}
            >
              <div
                className="w-[560px] max-w-[92vw] rounded-2xl p-6 modal-panel"
                style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">
                      {moderationAction.type === 'ban'
                        ? t.app.banTitle.replace('{name}', moderationAction.member.displayName || moderationAction.member.username)
                        : t.app.kickTitle.replace('{name}', moderationAction.member.displayName || moderationAction.member.username)}
                    </div>
                    <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                      {moderationAction.type === 'ban' ? t.app.banPrompt : t.app.kickPrompt}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full grid place-items-center hover-surface cursor-pointer"
                    aria-label="close"
                    onClick={closeModerationModal}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="mt-5">
                  <label className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                    {t.app.reasonLabel}
                  </label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    className="w-full mt-2 h-24 rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder={t.app.reasonPlaceholder}
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 h-10 rounded-md cursor-pointer hover-surface"
                    style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
                    onClick={closeModerationModal}
                  >
                    {t.app.moderationCancel}
                  </button>
                  <button
                    type="button"
                    className="px-4 h-10 rounded-md text-white cursor-pointer hover-surface"
                    style={{ background: '#ef4444' }}
                    onClick={async () => {
                      if (!moderationAction) return
                      if (moderationAction.type === 'ban') {
                        await handleBanMember(moderationAction.member)
                      } else {
                        await handleKickMember(moderationAction.member)
                      }
                      closeModerationModal()
                    }}
                  >
                    {moderationAction.type === 'ban' ? t.app.banConfirm : t.app.kickConfirm}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {imageViewerUrl ? (
            <div
              className={`fixed inset-0 z-50 grid place-items-center image-viewer-overlay${imageViewerClosing ? ' is-exiting' : ''}`}
              onMouseDown={closeImageViewer}
            >
              <div
                className={`relative image-viewer-panel${imageViewerClosing ? ' is-exiting' : ''}`}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-3 right-3 h-9 w-9 rounded-lg grid place-items-center image-viewer-close"
                  aria-label="close"
                  onClick={closeImageViewer}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <img src={imageViewerUrl} alt="preview" className="image-viewer-image" />
              </div>
            </div>
          ) : null}
          {profileCard?.visible ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onMouseDown={() => setProfileCard(null)}
              />
              <div
                className="fixed z-50 profile-card"
                style={{ top: profileCard.y, left: profileCard.x }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="profile-card-banner" />
                <div className="profile-card-body">
                  <div className="profile-card-avatar">
                    {profileCard.user.avatar ? (
                      <img src={profileCard.user.avatar} alt={profileCard.user.username || 'user'} />
                    ) : (
                      <span>
                        {(profileCard.user.displayName || profileCard.user.username || 'U').slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="profile-card-name">
                    {profileCard.user.displayName || profileCard.user.username || 'User'}
                  </div>
                  {profileCard.user.username ? (
                    <div className="profile-card-username">
                      {profileCard.user.username.startsWith('@') ? profileCard.user.username : `@${profileCard.user.username}`}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
    <ServerSettings
        showSettings={showSettings}
        canManage={canManageChannels}
        serverName={activeServer?.name}
        serverIcon={activeServer?.icon}
        nameSaving={serverNameSaving}
        iconUploading={serverIconUploading}
        saveError={serverSettingsError}
        onCloseSettings={() => setShowSettings(false)}
        onUpdateName={handleUpdateServerName}
        onUpdateIcon={handleUpdateServerIcon}
        t={t}
        serverMembers={serverMembers}
        bannedMembers={serverBans}
        onUnban={handleUnbanMember}
        onAddAdmin={(id) => {
          if (!canManageChannels) return
          if (!activeServerId) return
          axios
            .post(`${serverBase}/api/servers/${activeServerId}/admins`, { id }, { withCredentials: true })
            .then((res) => {
              if (Array.isArray(res.data)) setAdminIds(res.data)
            })
            .catch(() => {})
        }}
        onRemoveAdmin={(id) => {
          if (!canManageChannels) return
          if (!activeServerId) return
          axios
            .delete(`${serverBase}/api/servers/${activeServerId}/admins/${id}`, { withCredentials: true })
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
