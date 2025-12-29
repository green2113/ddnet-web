import type React from 'react'

export type ChatMessage = {
  id: string
  author: { id: string; username: string; displayName?: string; avatar?: string | null }
  content: string
  timestamp: number
  source: 'ddnet' | 'discord' | 'web'
}

type Props = {
  messages: ChatMessage[]
  adminIds?: string[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  t: {
    locale: string
    messageList: {
      loadError: string
      retry: string
      loading: string
      empty: string
      adminTag: string
    }
  }
}

export default function MessageList({ messages, adminIds = [], loading = false, error = false, onRetry, t }: Props) {
  const adminIdSet = new Set(adminIds)
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(t.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })

  const renderContent = (content: string) => {
    const parts = content.split(/(https?:\/\/[^\s]+)/g)
    return parts.map((part, idx) => {
      if (/^https?:\/\//.test(part)) {
        return (
          <a key={`${part}-${idx}`} href={part} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
            {part}
          </a>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  // 날짜별 그룹 전개
  const groups = [] as Array<{ dateKey: string; dateLabel: string; items: typeof messages }>
  let current: { dateKey: string; dateLabel: string; items: typeof messages } | null = null
  for (const m of messages) {
    const d = new Date(m.timestamp)
    const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    const dateLabel = d.toLocaleDateString(t.locale)
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, dateLabel, items: [] as typeof messages }
      groups.push(current)
    }
    current.items.push(m)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 messages-scroll" id="messages-scroll">
      <div className="min-h-full flex flex-col justify-end">
        {error ? (
          <div className="text-center text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
            {t.messageList.loadError}
            <button
              type="button"
              className="ml-3 px-3 h-8 rounded-md cursor-pointer"
              style={{ background: 'rgba(127,127,127,0.2)', color: 'var(--text-primary)' }}
              onClick={() => onRetry && onRetry()}
            >
              {t.messageList.retry}
            </button>
          </div>
        ) : loading ? (
          <div className="px-2 -mx-2">
            <div className="flex items-center gap-3 text-[11px] no-select my-2" style={{ color: 'var(--text-muted)' }}>
              <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
              <span>{t.messageList.loading}</span>
              <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
            </div>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="relative px-2 -mx-2 mt-2">
                <div className="absolute left-2 rounded-full skeleton" style={{ width: '40px', height: '40px', top: '3px' }} />
                <div className="min-w-0 pl-[52px]">
                  <div className="flex items-baseline gap-2 mb-2">
                    <div className="skeleton" style={{ width: '120px', height: '14px' }} />
                    <div className="skeleton" style={{ width: '60px', height: '12px' }} />
                  </div>
                  <div className="skeleton" style={{ width: `${70 + i*5}%`, height: '14px', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ width: `${45 + i*7}%`, height: '14px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.length === 0 && (
            <div className="text-center text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
              {t.messageList.empty}
            </div>
          )
        )}
        {groups.map((g) => (
          <div key={g.dateKey} className="px-2 -mx-2">
            <div className="flex items-center gap-3 text-[11px] no-select my-2" style={{ color: 'var(--text-muted)' }}>
              <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
              <span>{g.dateLabel}</span>
              <span className="flex-1 h-px" style={{ background: 'var(--divider)' }} />
            </div>
            {g.items.map((m, idx) => {
              const prev = idx > 0 ? g.items[idx - 1] : undefined
              const isHead = !prev || prev.author.id !== m.author.id
              const isAdmin = adminIdSet.has(m.author.id)
              let pressTimer: number | null = null
              let touchX = 0
              let touchY = 0
              const startLongPress = (e: React.TouchEvent<HTMLDivElement>) => {
                if (e.touches && e.touches.length > 0) {
                  touchX = e.touches[0].clientX
                  touchY = e.touches[0].clientY
                }
                pressTimer = window.setTimeout(() => {
                  const ev = new CustomEvent('open-msg-menu', { detail: { message: m, x: touchX, y: touchY } })
                  window.dispatchEvent(ev)
                }, 500)
              }
              const cancelLongPress = () => {
                if (pressTimer) {
                  clearTimeout(pressTimer)
                  pressTimer = null
                }
              }
              return (
                <div
                  key={m.id}
                  className={`row-hover group relative px-2 -mx-2 ${isHead ? 'mt-2' : ''}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const ev = new CustomEvent('open-msg-menu', { detail: { message: m, x: e.clientX, y: e.clientY } })
                    window.dispatchEvent(ev)
                  }}
                  onTouchStart={startLongPress}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                >
                  {isHead && (
                    <div
                      className="absolute left-2 rounded-full overflow-hidden"
                      style={{ width: '40px', height: '40px', top: '3px', background: 'var(--input-bg)' }}
                    >
                      {m.author.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.author.avatar} alt={m.author.username} className="w-full h-full object-cover no-select" />
                      ) : null}
                    </div>
                  )}
                  {!isHead && (
                    <div
                      className="absolute left-2 top-1 text-[10px] opacity-0 group-hover:opacity-100 cursor-default no-select"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {formatTime(m.timestamp)}
                    </div>
                  )}
                  <div className="min-w-0 pl-[52px]">
                    {isHead && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium">{m.author.displayName || m.author.username}</span>
                        {isAdmin ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded uppercase" style={{ background: 'rgba(250,204,21,0.2)', color: '#facc15' }}>
                            {t.messageList.adminTag}
                          </span>
                        ) : null}
                        <span className="text-xs cursor-default" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(m.timestamp)}
                        </span>
                        <span className="text-[10px] uppercase cursor-default no-select" style={{ color: 'var(--text-muted)' }}>
                          {m.source}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">
                      <span>{renderContent(m.content)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      ))}
      </div>
    </div>
  )
}
