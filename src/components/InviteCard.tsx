import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type InviteInfo = {
  code: string
  server: {
    id: string
    name: string
    ownerId?: string
  }
}

type InviteCardProps = {
  code: string
  url: string
}

const inviteCache = new Map<string, InviteInfo>()
const inviteMemberCache = new Map<string, boolean>()

export default function InviteCard({ code, url }: InviteCardProps) {
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [isMember, setIsMember] = useState(false)

  const baseUrl = useMemo(() => {
    const api = (import.meta as any).env?.VITE_API_BASE as string | undefined
    return api ? api.replace(/\/$/, '') : ''
  }, [])

  useEffect(() => {
    const cached = inviteCache.get(code)
    if (cached) {
      setInvite(cached)
      setLoading(false)
      setError('')
    } else if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(`invite:${code}`)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as InviteInfo
          if (parsed?.code === code) {
            setInvite(parsed)
            setLoading(false)
            setError('')
            inviteCache.set(code, parsed)
          }
        } catch {}
      }
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`${baseUrl}/api/invite/${code}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) throw new Error(data?.error || 'invalid')
        if (!cancelled) {
          setInvite(data)
          inviteCache.set(code, data)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`invite:${code}`, JSON.stringify(data))
          }
        }
      })
      .catch((e) => {
        if (cancelled) return
        if (!inviteCache.has(code)) {
          setError(e?.message || 'invalid')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [baseUrl, code])

  useEffect(() => {
    if (!invite?.server?.id) return
    const cachedMember = inviteMemberCache.get(invite.server.id)
    if (cachedMember !== undefined) {
      setIsMember(cachedMember)
      return
    }
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(`invite-member:${invite.server.id}`)
      if (raw === 'true' || raw === 'false') {
        const value = raw === 'true'
        setIsMember(value)
        inviteMemberCache.set(invite.server.id, value)
        return
      }
    }
    let cancelled = false
    fetch(`${baseUrl}/api/servers`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data)) {
          const value = data.some((server) => server?.id === invite.server.id)
          setIsMember(value)
          inviteMemberCache.set(invite.server.id, value)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`invite-member:${invite.server.id}`, String(value))
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [baseUrl, invite?.server?.id])

  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('invite-card-ready'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loading, invite, error])

  const handleJoin = async () => {
    if (joining) return
    setJoining(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}/api/invite/${code}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.server?.id) {
        setError(data?.error || 'join failed')
        return
      }
      navigate(`/channels/${data.server.id}`)
    } catch {
      setError('join failed')
    } finally {
      setJoining(false)
    }
  }

  if (loading && !invite && !error) {
    return (
      <div
        className="max-w-[420px] rounded-xl p-3"
        style={{ background: 'var(--panel)', border: '1px solid var(--border)', minHeight: '88px' }}
      >
        <div className="text-xs mb-2 skeleton" style={{ width: '140px', height: '12px' }} />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl skeleton" />
          <div className="min-w-0 flex-1">
            <div className="skeleton" style={{ width: '160px', height: '14px', marginBottom: '6px' }} />
            <div className="skeleton" style={{ width: '200px', height: '12px' }} />
          </div>
          <div className="h-8 w-[84px] rounded-md skeleton" />
        </div>
      </div>
    )
  }

  const serverName = invite?.server?.name || 'Server'
  const serverInitial = serverName.slice(0, 1).toUpperCase()

  return (
    <div className="max-w-[420px] rounded-xl p-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
        서버 가입 초대장을 보냈어요
      </div>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
          {serverInitial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{serverName}</div>
          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {url}
          </div>
        </div>
        <button
          type="button"
          className="h-8 px-3 rounded-md text-sm font-semibold cursor-pointer hover-surface"
          style={{ background: 'var(--accent)', color: '#111' }}
          onClick={handleJoin}
          disabled={loading || joining || !!error || isMember}
        >
          {loading ? '불러오는 중' : joining ? '참가 중' : error ? '만료됨' : isMember ? '참가 완료' : '참가하기'}
        </button>
      </div>
      {error && !loading ? (
        <div className="text-xs mt-2" style={{ color: '#f87171' }}>
          초대 링크를 확인할 수 없어요.
        </div>
      ) : null}
    </div>
  )
}
