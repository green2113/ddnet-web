import { useEffect, useMemo } from 'react'
import { getStoredLanguage, getTranslations } from '../i18n'

export default function Login() {
  const t = useMemo(() => getTranslations(getStoredLanguage()), [])

  useEffect(() => {
    // 원래 페이지 기억 (이미 다른 곳에서 저장했을 수 있음)
    const stored = localStorage.getItem('return_to')
    const returnTo = stored || window.history.state?.usr?.from || '/'
    localStorage.setItem('return_to', returnTo)
    const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
    const authPath = apiBase ? `${apiBase.replace(/\/$/, '')}/auth/discord` : '/auth/discord'
    const params = new URLSearchParams({ return_to: returnTo })
    const authUrl = `${authPath}?${params.toString()}`
    const electronAPI = (window as any).electronAPI
    const absoluteUrl = authUrl.startsWith('/') ? `${window.location.origin}${authUrl}` : authUrl

    if (electronAPI?.openAuth) {
      electronAPI.openAuth(absoluteUrl)
      return
    }

    window.location.href = absoluteUrl
    
  }, [])

  return (
    <div className="h-full grid place-items-center" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="text-center">
        {t.login.redirecting}
        <br />
        {t.login.fallback}{' '}
        <a
          href={(() => {
            const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
            const returnTo = localStorage.getItem('return_to') || '/'
            const authPath = apiBase ? `${apiBase.replace(/\/$/, '')}/auth/discord` : '/auth/discord'
            const params = new URLSearchParams({ return_to: returnTo })
            return `${authPath}?${params.toString()}`
          })()}
          style={{ textDecoration: 'underline' }}
        >
          {t.login.clickHere}
        </a>
        {t.login.pleaseDo}
      </div>
    </div>
  )
}
