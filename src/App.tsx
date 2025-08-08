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
  author: { id: string; username: string; avatar?: string | null }
  content: string
  timestamp: number
  source: 'ddnet' | 'discord' | 'web'
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const [isDark, setIsDark] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; message: ChatMessage | null }>({ visible: false, x: 0, y: 0, message: null })

  const serverBase = useMemo(() => {
    const api = (import.meta as any).env?.VITE_API_BASE as string | undefined
    if (api) return api.replace(/\/$/, '')
    // 개발 편의를 위해 로컬 프록시 기본값 유지
    return window.location.origin.replace(/:\d+$/, ':4000')
  }, [])

  useEffect(() => {
    axios
      .get(`${serverBase}/api/me`, { withCredentials: true })
      .then((res) => setUser(res.data || null))
      .catch(() => {
        setUser(null)
        // 자동 이동 대신 필요 시 모달로 유도
      })

    axios
      .get(`${serverBase}/api/history?limit=200`, { withCredentials: true })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setMessages(res.data)
        }
      })
      .catch(() => {})
  }, [serverBase])

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
      setMessages((prev) => {
        const next = [...prev, msg]
        // scroll to bottom on new message
        requestAnimationFrame(() => {
          const el = document.getElementById('messages-scroll')
          if (el) el.scrollTop = el.scrollHeight
        })
        return next
      })
    })
    return () => {
      socket.disconnect()
    }
  }, [serverBase])

  // Whenever messages list changes (including when I send), keep scrolled to bottom
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
    })
    setInput('')
  }

  return (
    <div className={(isDark ? 'theme-dark ' : '') + 'h-full flex'} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <SidebarGuilds />
      <div className="flex-1 flex min-w-0">
        <SidebarChannels channels={[{ id: 'general', name: 'general' }, { id: 'ddnet', name: 'ddnet-bridge' }]} activeId={'general'} />
        <main className="flex-1 flex flex-col min-w-0">
          <Header
            title="# general"
            isDark={isDark}
            onLight={() => setIsDark(false)}
            onDark={() => setIsDark(true)}
            user={user}
            onLogin={login}
            onLogout={logout}
          />
          <MessageList messages={messages} />
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
                    setMessages((prev) => prev.filter((m) => m.id !== menu.message!.id))
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
