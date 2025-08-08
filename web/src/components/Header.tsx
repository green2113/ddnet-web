
type Props = {
  title: string
  isDark: boolean
  onLight: () => void
  onDark: () => void
  user: { username: string } | null
  onLogin: () => void
  onLogout: () => void
}

export default function Header({ title, isDark, onLight, onDark, user, onLogin, onLogout }: Props) {
  return (
    <header
      className="h-12 px-4 flex items-center gap-3"
      style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="font-semibold">{title}</div>
      <div className="ml-4 hidden md:flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <span className="chip" style={{ background: 'var(--input-bg)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 10H3m7-7v18m4-18v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          채널</span>
        <span className="chip" style={{ background: 'var(--input-bg)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          멤버</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          aria-label={isDark ? '라이트' : '다크'}
          onClick={() => (isDark ? onLight() : onDark())}
          className="p-2 rounded-md cursor-pointer hover-surface"
          title={isDark ? '라이트 테마' : '다크 테마'}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V2M12 22V20M4 12H2M22 12H20M5 5L3.5 3.5M20.5 20.5L19 19M5 19L3.5 20.5M20.5 3.5L19 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor"/>
            </svg>
          )}
        </button>
        {user ? (
          <>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.username}</div>
            <button onClick={onLogout} className="text-xs px-2 py-1 rounded hover:opacity-90 cursor-pointer" style={{ background: 'var(--input-bg)' }}>
              로그아웃
            </button>
          </>
        ) : (
          <button onClick={onLogin} className="text-xs px-2 py-1 text-white rounded hover:brightness-110 cursor-pointer" style={{ background: 'var(--accent)' }}>
            Discord로 로그인
          </button>
        )}
      </div>
    </header>
  )
}


