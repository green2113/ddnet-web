import { useEffect } from 'react'

export default function Login() {
  useEffect(() => {
    // 원래 페이지 기억 (이미 다른 곳에서 저장했을 수 있음)
    if (!localStorage.getItem('return_to')) {
      localStorage.setItem('return_to', window.history.state?.usr?.from || '/')
    }
    const apiBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
    const authUrl = apiBase
      ? `${apiBase.replace(/\/$/, '')}/auth/discord`
      : '/auth/discord' // 환경변수 미설정 시에도 서버 절대경로가 프록시/도메인에서 처리되도록 상대 경로 유지
    
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
            return apiBase ? `${apiBase.replace(/\/$/, '')}/auth/discord` : '/auth/discord'
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


