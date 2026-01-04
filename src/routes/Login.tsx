import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredLanguage, getTranslations } from '../i18n'

export default function Login() {
  const t = useMemo(() => getTranslations(getStoredLanguage()), [])
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
  const baseUrl = apiBase ? apiBase.replace(/\/$/, '') : ''

  useEffect(() => {
    const stored = localStorage.getItem('return_to')
    if (!stored) {
      const next = window.history.state?.usr?.from || '/'
      localStorage.setItem('return_to', next)
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/me`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!data) return
        const returnTo = localStorage.getItem('return_to') || '/channels/general'
        localStorage.removeItem('return_to')
        navigate(returnTo, { replace: true })
      } catch {
        // ignore
      }
    }
    checkSession()
  }, [baseUrl, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login'
      const payload: Record<string, string> = { email, password }
      if (mode === 'signup') payload.username = username
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || t.login.errorGeneric)
        return
      }
      const returnTo = localStorage.getItem('return_to') || '/'
      localStorage.removeItem('return_to')
      navigate(returnTo, { replace: true })
    } catch {
      setError(t.login.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  const handleDiscord = () => {
    const returnTo = localStorage.getItem('return_to') || '/'
    const authPath = baseUrl ? `${baseUrl}/auth/discord` : '/auth/discord'
    const params = new URLSearchParams({ return_to: returnTo })
    const authUrl = `${authPath}?${params.toString()}`
    const electronAPI = (window as any).electronAPI
    const absoluteUrl = authUrl.startsWith('/') ? `${window.location.origin}${authUrl}` : authUrl

    if (electronAPI?.openAuth) {
      const expectedOrigin = (import.meta as any).env?.VITE_WEB_ORIGIN || window.location.origin
      electronAPI.openAuth(absoluteUrl, expectedOrigin)
      return
    }

    window.location.href = absoluteUrl
  }

  return (
    <div className="min-h-screen grid place-items-center px-6" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div
        className="w-full max-w-[420px] rounded-2xl border px-6 py-7"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-5">
          <button
            type="button"
            className={`flex-1 h-10 rounded-md text-sm font-semibold ${mode === 'login' ? '' : 'opacity-60'}`}
            style={{ background: mode === 'login' ? 'var(--header-bg)' : 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setMode('login')}
          >
            {t.login.loginTab}
          </button>
          <button
            type="button"
            className={`flex-1 h-10 rounded-md text-sm font-semibold ${mode === 'signup' ? '' : 'opacity-60'}`}
            style={{ background: mode === 'signup' ? 'var(--header-bg)' : 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setMode('signup')}
          >
            {t.login.signupTab}
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <div>
              <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {t.login.usernameLabel}
              </label>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 w-full h-10 rounded-md px-3"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                placeholder={t.login.usernamePlaceholder}
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t.login.emailLabel}
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="mt-2 w-full h-10 rounded-md px-3"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              placeholder={t.login.emailPlaceholder}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t.login.passwordLabel}
            </label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full h-10 rounded-md px-3"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              placeholder={t.login.passwordPlaceholder}
            />
          </div>
          {error ? (
            <div className="text-sm" style={{ color: '#f87171' }}>
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className="w-full h-10 rounded-md text-white font-semibold"
            style={{ background: 'var(--accent)', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {mode === 'signup' ? t.login.signupAction : t.login.loginAction}
          </button>
        </form>

        <div className="my-5" style={{ height: 1, background: 'var(--border)' }} />

        <button
          type="button"
          onClick={handleDiscord}
          className="w-full h-10 rounded-md text-white font-semibold"
          style={{ background: '#5865f2' }}
        >
          {t.login.discordAction}
        </button>
      </div>
    </div>
  )
}
