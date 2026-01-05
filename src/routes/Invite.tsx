import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type InviteInfo = {
  code: string
  server: {
    id: string
    name: string
    ownerId?: string
  }
}

export default function Invite() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
  const baseUrl = apiBase ? apiBase.replace(/\/$/, '') : ''

  useEffect(() => {
    if (!code) return
    setLoading(true)
    fetch(`${baseUrl}/api/invite/${code}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) {
          throw new Error(data?.error || 'invalid')
        }
        setInvite(data)
      })
      .catch(() => {
        setError('초대 링크를 찾을 수 없습니다.')
      })
      .finally(() => setLoading(false))
  }, [baseUrl, code])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/me`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (data) return
        const returnTo = `/invite/${code || ''}`
        localStorage.setItem('return_to', returnTo)
        navigate('/login', { replace: true, state: { from: returnTo } })
      } catch {
        // ignore
      }
    }
    checkSession()
  }, [baseUrl, code, navigate])

  const handleJoin = async () => {
    if (!code || joining) return
    setJoining(true)
    try {
      const res = await fetch(`${baseUrl}/api/invite/${code}/join`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.server?.id) {
        setError(data?.error || '가입에 실패했습니다.')
        return
      }
      navigate(`/channels/${data.server.id}`, { replace: true })
    } catch {
      setError('가입에 실패했습니다.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="invite-page">
      <div className="invite-bg">
        <div className="invite-orb orb-1" />
        <div className="invite-orb orb-2" />
        <div className="invite-orb orb-3" />
      </div>
      <div className="invite-card">
        <div className="invite-badge">INVITE</div>
        <h1 className="invite-title">서버 초대</h1>
        <p className="invite-subtitle">초대 링크로 서버에 참여할 수 있어요.</p>
        {loading ? <div className="invite-status">불러오는 중...</div> : null}
        {!loading && error ? <div className="invite-error">{error}</div> : null}
        {!loading && invite ? (
          <div className="invite-server">
            <div className="invite-avatar">{invite.server.name.slice(0, 1)}</div>
            <div className="invite-meta">
              <div className="invite-name">{invite.server.name}</div>
              <div className="invite-desc">이 서버로 바로 이동합니다.</div>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="invite-cta"
          onClick={handleJoin}
          disabled={joining || !invite || Boolean(error)}
        >
          {joining ? '입장 중...' : '참여하기'}
        </button>
      </div>
    </div>
  )
}
