import { useEffect } from 'react'

export default function Login() {
  useEffect(() => {
    // 원래 페이지 기억 (이미 다른 곳에서 저장했을 수 있음)
    if (!localStorage.getItem('return_to')) {
      localStorage.setItem('return_to', window.history.state?.usr?.from || '/')
    }
    const timer = setTimeout(() => {
      window.location.href = `${window.location.origin.replace(/:\\d+$/, ':4000')}/auth/discord`
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full grid place-items-center" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <div className="text-center">
        디스코드 로그인으로 리다이렉트 중입니다.
        <br />
        만약 이동이 되지 않는다면{' '}
        <a
          href={`${window.location.origin.replace(/:\\d+$/, ':4000')}/auth/discord`}
          style={{ textDecoration: 'underline' }}
        >
          이 글씨를 클릭
        </a>
        해 주세요.
      </div>
    </div>
  )
}


