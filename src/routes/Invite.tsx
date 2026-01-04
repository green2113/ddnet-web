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
    <div className="min-h-screen grid place-items-center px-6" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="w-full max-w-[420px] rounded-2xl border px-6 py-7" style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="text-lg font-semibold mb-2">서버 초대</div>
        {loading ? <div className="text-sm">불러오는 중...</div> : null}
        {!loading && error ? <div className="text-sm text-red-400">{error}</div> : null}
        {!loading && invite ? (
          <div className="space-y-4">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {invite.server.name} 서버에 참여합니다.
            </div>
            <button
              type="button"
              className="w-full h-10 rounded-md text-white font-semibold"
              style={{ background: 'var(--accent)', opacity: joining ? 0.7 : 1 }}
              onClick={handleJoin}
              disabled={joining}
            >
              참여하기
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
