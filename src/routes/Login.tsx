import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredLanguage, getTranslations } from '../i18n'

export default function Login() {
  const t = useMemo(() => getTranslations(getStoredLanguage()), [])
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false, username: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestError, setGuestError] = useState('')
  const [guestLoading, setGuestLoading] = useState(false)
  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const usernameRef = useRef<HTMLInputElement | null>(null)
  const guestRef = useRef<HTMLInputElement | null>(null)
  const usernameCheckRef = useRef(0)

  const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
  const baseUrl = apiBase ? apiBase.replace(/\/$/, '') : ''

  const checkUsernameAvailability = async (rawHandle: string) => {
    if (!rawHandle) return
    const requestId = ++usernameCheckRef.current
    try {
      const res = await fetch(
        `${baseUrl}/auth/username-check?username=${encodeURIComponent(rawHandle)}`,
      )
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      if (requestId !== usernameCheckRef.current) return
      if (data && data.available === false) {
        setUsernameError('이미 다른 유저가 사용 중입니다.')
      }
    } catch {
      // ignore
    }
  }

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
    setUsernameError('')
    setFieldErrors({ email: false, password: false, username: false })
    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login'
      const payload: Record<string, string> = { email, password }
      const missingUsername = mode === 'signup' && !username.trim()
      const missingEmail = !email.trim()
      const missingPassword = !password.trim()
      if (missingUsername || missingEmail || missingPassword) {
        const nextErrors = { email: false, password: false, username: false }
        if (missingUsername) {
          nextErrors.username = true
        } else if (missingEmail) {
          nextErrors.email = true
        } else {
          nextErrors.password = true
        }
        setFieldErrors(nextErrors)
        setLoading(false)
        if (nextErrors.username) {
          usernameRef.current?.focus()
        } else if (nextErrors.email) {
          emailRef.current?.focus()
        } else {
          passwordRef.current?.focus()
        }
        return
      }
      if (mode === 'signup') {
        const raw = username.trim().replace(/^@+/, '')
        if (!/^[A-Za-z0-9_]{1,15}$/.test(raw)) {
          setUsernameError('영문, 숫자, _ 만 사용 가능합니다. (최대 15자)')
          setFieldErrors((prev) => ({ ...prev, username: true }))
          setLoading(false)
          usernameRef.current?.focus()
          return
        }
        payload.username = raw
      }
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.error === 'username already used') {
          setUsernameError('이미 다른 유저가 사용 중입니다.')
          setFieldErrors((prev) => ({ ...prev, username: true }))
        } else {
          setError(data?.error || t.login.errorGeneric)
        }
        return
      }
      localStorage.removeItem('return_to')
      navigate('/channels/@me', { replace: true })
    } catch {
      setError(t.login.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    if (guestLoading) return
    const name = guestName.trim()
    if (!name) {
      setGuestError(t.login.guestRequired)
      guestRef.current?.focus()
      return
    }
    setGuestError('')
    setGuestLoading(true)
    try {
      const res = await fetch(`${baseUrl}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        setGuestError(t.login.errorGeneric)
        return
      }
      const returnTo = localStorage.getItem('return_to') || '/'
      localStorage.removeItem('return_to')
      navigate(returnTo, { replace: true })
    } catch {
      setGuestError(t.login.errorGeneric)
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-ambient" />
      <div className="login-card">
        <div className="login-hero">
          <div className="login-badge">CHAT</div>
          <h1 className="login-title">대화는 가볍게. 연결은 단단하게.</h1>
          <p className="login-subtitle">서버를 만들고, 초대하고, 바로 시작하세요.</p>
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
                <div
                  className={`login-username-field${
                    usernameError || fieldErrors.username ? ' is-invalid' : ''
                  }`}
                >
                  <span className="login-username-prefix select-none" aria-hidden>
                    @
                  </span>
                  <input
                    value={username}
                    ref={usernameRef}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      if (usernameError) setUsernameError('')
                      if (fieldErrors.username) {
                        setFieldErrors((prev) => ({ ...prev, username: false }))
                      }
                    }}
                    onBlur={() => {
                      const raw = username.trim().replace(/^@+/, '')
                  if (!raw) return
                  if (!/^[A-Za-z0-9_]{1,15}$/.test(raw)) {
                    setUsernameError('영문, 숫자, _ 만 사용 가능합니다. (최대 15자)')
                    return
                  }
                  checkUsernameAvailability(raw)
                }}
                    className="login-username-input"
                    placeholder="사용자 이름을 입력해 주세요."
                  />
                </div>
                {fieldErrors.username ? <div className="login-error">필수 입력입니다.</div> : null}
                {usernameError ? <div className="login-error">{usernameError}</div> : null}
              </div>
          ) : null}
            <div>
              <label className="login-label">{t.login.emailLabel}</label>
            <input
              value={email}
              ref={emailRef}
              onChange={(event) => {
                setEmail(event.target.value)
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: false }))
              }}
              type="email"
              className={`login-input${fieldErrors.email ? ' is-invalid' : ''}`}
              placeholder={t.login.emailPlaceholder}
            />
            {fieldErrors.email ? <div className="login-error">필수 입력입니다.</div> : null}
          </div>
          <div>
            <label className="login-label">{t.login.passwordLabel}</label>
            <input
              value={password}
              ref={passwordRef}
              onChange={(event) => {
                setPassword(event.target.value)
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: false }))
              }}
              type="password"
              className={`login-input${fieldErrors.password ? ' is-invalid' : ''}`}
              placeholder={t.login.passwordPlaceholder}
            />
            {fieldErrors.password ? <div className="login-error">필수 입력입니다.</div> : null}
          </div>
            {error ? <div className="login-error">{error}</div> : null}
            <button type="submit" className="login-submit" disabled={loading}>
              {mode === 'signup' ? t.login.signupAction : t.login.loginAction}
            </button>
          </form>

          {mode === 'login' ? (
            <>
              <div className="login-divider">
                <span />
                <span>{t.login.guestDivider}</span>
                <span />
              </div>
              <div className="login-guest">
                <label className="login-label">{t.login.guestLabel}</label>
                <input
                  value={guestName}
                  ref={guestRef}
                  onChange={(event) => {
                    setGuestName(event.target.value)
                    if (guestError) setGuestError('')
                  }}
                  className={`login-input${guestError ? ' is-invalid' : ''}`}
                  placeholder={t.login.guestPlaceholder}
                />
                {guestError ? <div className="login-error">{guestError}</div> : null}
                <button type="button" onClick={handleGuest} className="login-discord" disabled={guestLoading}>
                  {guestLoading ? t.login.guestLoading : t.login.guestAction}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
