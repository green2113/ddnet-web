import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import SidebarGuilds from './components/SidebarGuilds'
import SidebarChannels from './components/SidebarChannels'
import Header from './components/Header'
import MessageList from './components/MessageList'
import Composer from './components/Composer'

type User = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
}

type ChatMessage = {
  id: string
  author: { id: string; username: string; displayName?: string; avatar?: string | null }
  content: string
  timestamp: number
  source: 'ddnet' | 'discord' | 'web'
  channelId?: string
  channel?: string
}

type Channel = {
  id: string
  name: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [input, setInput] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [hiddenChannelIds, setHiddenChannelIds] = useState<string[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string>('')
  const [isDark, setIsDark] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; message: ChatMessage | null }>({ visible: false, x: 0, y: 0, message: null })
  const activeChannelId = 'general'

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

  const serverBase = useMemo(() => {
    const api = (import.meta as any).env?.VITE_API_BASE as string | undefined
    return api ? api.replace(/\/$/, '') : ''
  }, [])

  const adminId = useMemo(() => (import.meta as any).env?.VITE_ADMIN_ID as string | undefined, [])
  const isAdmin = Boolean(adminId && user?.id === adminId)

  const visibleChannels = useMemo(() => channels.filter((channel) => !hiddenChannelIds.includes(channel.id)), [channels, hiddenChannelIds])
  const defaultChannelId = visibleChannels[0]?.id || 'general'

  const fetchHistory = (channelId = activeChannelId || defaultChannelId) => {
    setLoadingMessages(true)
    setLoadError(false)
    axios
      .get(`${serverBase}/api/history`, { withCredentials: true, params: { limit: 200, channel: channelId } })
      .then((res) => {
        if (Array.isArray(res.data)) {
          const normalized = res.data.map((message: ChatMessage) => ({
            ...message,
            channelId: message.channelId || message.channel || channelId,
          }))
          setMessages(normalized)
        }
        setLoadingMessages(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoadingMessages(false)
      })
  }

  useEffect(() => {
    setLoadingMessages(true)
    axios
      .get(`${serverBase}/api/me`, { withCredentials: true })
      .then((res) => setUser(res.data || null))
      .catch(() => {
        setUser(null)
      })

    fetchHistory()
  }, [serverBase])

  useEffect(() => {
    const fallbackChannels: Channel[] = [
      { id: 'general', name: 'general' },
      { id: 'ddnet', name: 'ddnet-bridge' },
    ]

    axios
      .get(`${serverBase}/api/channels`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setChannels(res.data)
          return
        }
        setChannels(fallbackChannels)
      })
      .catch(() => {
        setChannels(fallbackChannels)
      })
  }, [serverBase])

  useEffect(() => {
    if (!visibleChannels.length) return
    const stillExists = visibleChannels.some((channel) => channel.id === activeChannelId)
    if (!stillExists) {
      setActiveChannelId(visibleChannels[0].id)
    }
  }, [activeChannelId, visibleChannels])

  useEffect(() => {
    if (!activeChannelId) return
    fetchHistory(activeChannelId)
  }, [activeChannelId])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

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
    socket.on('chat:message', (msg: ChatMessage) => {
      const normalized = {
        ...msg,
        channelId: msg.channelId || msg.channel || defaultChannelId,
      }
      setMessages((prev) => {
        const next = [...prev, normalized]
        // 하단 정렬 유지: 새 메시지 후 스크롤 맨 아래
        requestAnimationFrame(() => {
          const el = document.getElementById('messages-scroll')
          if (el) el.scrollTop = el.scrollHeight
        })
        return next
      })
      const isOwn = user && msg.author?.id === user.id
      const hasFocus = document.visibilityState === 'visible'
      if (!isOwn && !hasFocus && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${msg.author?.displayName || '누군가'}`, { body: msg.content || '' })
        playNotificationSound()
      }
    })
    socket.on('chat:delete', (id: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    })
    return () => {
      socket.disconnect()
    }
  }, [serverBase, user, defaultChannelId])

  // 메시지 변경 시 항상 스크롤을 맨 아래로 유지 (하단 정렬)
  useEffect(() => {
    const el = document.getElementById('messages-scroll')
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const login = () => {
    // 로그인 진입은 항상 프런트를 경유하지만, /login 내부에서 VITE_API_BASE를 사용해 서버로 이동
    window.location.href = '/login'
  }

  const logout = async () => {
    await axios.post(`${serverBase}/auth/logout`, {}, { withCredentials: true })
    setUser(null)
  }

  const sendMessage = () => {
    if (!input.trim()) return
    if (!user) {
      setShowAuthModal(true)
      return
    }
    socketRef.current?.emit('chat:send', {
      content: input,
      source: 'web',
      channelId: activeChannelId || defaultChannelId,
    })
    setInput('')
  }

  const handleCreateChannel = () => {
    const name = window.prompt('새 채널 이름을 입력하세요')
    if (!name) return
    const trimmed = name.trim()
    if (!trimmed) return
    const baseId = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
    if (!baseId) return
    let nextId = baseId
    let index = 1
    while (channels.some((channel) => channel.id === nextId)) {
      nextId = `${baseId}-${index}`
      index += 1
    }
    const nextChannel = { id: nextId, name: trimmed }
    setChannels((prev) => [...prev, nextChannel])
    setActiveChannelId(nextId)
  }

  const handleChannelAction = (channelId: string, action: 'delete' | 'hide') => {
    if (action === 'delete') {
      setChannels((prev) => prev.filter((channel) => channel.id !== channelId))
      setHiddenChannelIds((prev) => prev.filter((id) => id !== channelId))
      return
    }
    if (action === 'hide') {
      setHiddenChannelIds((prev) => (prev.includes(channelId) ? prev : [...prev, channelId]))
    }
  }

  const activeChannel = visibleChannels.find((channel) => channel.id === activeChannelId) || visibleChannels[0]
  const activeChannelName = activeChannel?.name || 'general'

  return (
    <div className={(isDark ? 'theme-dark ' : '') + 'app-shell flex'} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <SidebarGuilds />
      <div className="flex-1 flex min-w-0">
        <SidebarChannels
          channels={visibleChannels}
          activeId={activeChannelId || defaultChannelId}
          onCreateChannel={handleCreateChannel}
          onSelectChannel={setActiveChannelId}
          onChannelAction={handleChannelAction}
          isAdmin={isAdmin}
        />
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            title={`# ${activeChannelName}`}
            isDark={isDark}
            onLight={() => setIsDark(false)}
            onDark={() => setIsDark(true)}
            user={user}
            onLogin={login}
            onLogout={logout}
          />
          <MessageList messages={messages} activeChannelId={activeChannelId || defaultChannelId} loading={loadingMessages} error={loadError} onRetry={fetchHistory} />
          <Composer value={input} onChange={setInput} onSend={sendMessage} />
          {menu.visible && menu.message && (
            <div
              className="fixed z-50 min-w-[180px] rounded-md p-2 text-sm"
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
                메시지 복사
              </button>
              {user && menu.message.author.id === user.id && (
                <button
                  className="w-full text-left px-3 py-2 hover-surface cursor-pointer"
                  style={{ color: '#f87171' }}
                  onClick={() => {
                    // 서버에 삭제 요청(소켓). 성공 시 서버가 chat:delete 브로드캐스트함
                    socketRef.current?.emit('chat:delete', { id: menu.message!.id })
                    setMenu({ visible: false, x: 0, y: 0, message: null })
                  }}
                >
                  메시지 삭제
                </button>
              )}
            </div>
          )}
          {showAuthModal && (
            <div className="fixed inset-0 grid place-items-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="w-[520px] max-w-[90vw] rounded-lg" style={{ background: 'var(--header-bg)', border: '1px solid var(--border)' }}>
                <div className="px-5 py-4 text-base" style={{ color: 'var(--text-primary)' }}>
                  해당 기능은 로그인이 필요한 기능입니다. 로그인 후 이용해주세요.
                </div>
                <div className="px-5 py-3 flex justify-end gap-2" style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
                  <button className="px-3 h-9 rounded-md cursor-pointer" style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }} onClick={() => setShowAuthModal(false)}>
                    취소
                  </button>
                  <button
                    className="px-3 h-9 rounded-md text-white cursor-pointer"
                    style={{ background: '#5865f2' }}
                    onClick={() => {
                      setShowAuthModal(false)
                      // 원래 페이지 기억
                      localStorage.setItem('return_to', window.location.pathname + window.location.search)
                      login()
                    }}
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
