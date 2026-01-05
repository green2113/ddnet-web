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
        const returnTo = localStorage.getItem('return_to') || '/'
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
    <div className="login-shell">
      <div className="login-ambient" />
      <div className="login-card">
        <div className="login-hero">
          <div className="login-badge">CHAT</div>
          <h1 className="login-title">대화는 가볍게. 연결은 단단하게.</h1>
          <p className="login-subtitle">서버를 만들고, 초대를 공유하고, 바로 시작하세요.</p>
          <div className="login-stats">
            <div>
              <div className="login-stat-value">빠르게</div>
              <div className="login-stat-label">초대하고 시작</div>
            </div>
            <div>
              <div className="login-stat-value">간편하게</div>
              <div className="login-stat-label">연결 유지</div>
            </div>
          </div>
        </div>
        <div className="login-form">
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => setMode('login')}
            >
              {t.login.loginTab}
            </button>
            <div className="login-tab-divider" aria-hidden />
            <button
              type="button"
              className={`login-tab ${mode === 'signup' ? 'is-active' : ''}`}
              onClick={() => setMode('signup')}
            >
              {t.login.signupTab}
            </button>
          </div>

          <form className="login-fields" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <div>
                <label className="login-label">{t.login.usernameLabel}</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="login-input"
                  placeholder={t.login.usernamePlaceholder}
                />
              </div>
            ) : null}
            <div>
              <label className="login-label">{t.login.emailLabel}</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                className="login-input"
                placeholder={t.login.emailPlaceholder}
              />
            </div>
            <div>
              <label className="login-label">{t.login.passwordLabel}</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="login-input"
                placeholder={t.login.passwordPlaceholder}
              />
            </div>
            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" className="login-submit" disabled={loading}>
              {mode === 'signup' ? t.login.signupAction : t.login.loginAction}
            </button>
          </form>

          <div className="login-divider">
            <span />
            <span>또는</span>
            <span />
          </div>

          <button type="button" onClick={handleDiscord} className="login-discord">
            {t.login.discordAction}
          </button>
        </div>
      </div>
    </div>
  )
}
