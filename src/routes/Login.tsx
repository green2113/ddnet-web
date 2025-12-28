import { useEffect } from 'react'

export default function Login() {
  useEffect(() => {
    // 원래 페이지 기억 (이미 다른 곳에서 저장했을 수 있음)
    const stored = localStorage.getItem('return_to')
    const returnTo = stored || window.history.state?.usr?.from || '/'
    localStorage.setItem('return_to', returnTo)
    const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
    const authPath = apiBase ? `${apiBase.replace(/\/$/, '')}/auth/discord` : '/auth/discord'
    const params = new URLSearchParams({ return_to: returnTo })
    const authUrl = `${authPath}?${params.toString()}`
    
    window.location.href = authUrl
    
  }, [])

  return (
    <div className="h-full grid place-items-center" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="text-center">
        디스코드 로그인으로 리다이렉트 중입니다.
        <br />
        만약 이동이 되지 않는다면{' '}
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
          이 글씨를 클릭
        </a>
        해 주세요.
      </div>
    </div>
  )
}
