type Props = {
  title: string
  isDark: boolean
  onLight: () => void
  onDark: () => void
  user: { username: string; isGuest?: boolean } | null
  onLogin: () => void
  onLogout: () => void
  onToggleChannels?: () => void
  t: {
    header: {
      channelListAria: string
      channel: string
      members: string
      light: string
      dark: string
      lightTheme: string
      darkTheme: string
      guestSuffix: string
      logout: string
      loginDiscord: string
    }
  }
}

export default function Header({ title, isDark, onLight, onDark, user, onLogin, onLogout, onToggleChannels, t }: Props) {
  return (
    <header
      className="h-12 px-4 flex items-center gap-3"
      style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--border)' }}
    >
      <button
        type="button"
        aria-label={t.header.channelListAria}
        className="md:hidden p-2 -ml-2 rounded-md cursor-pointer hover-surface"
        onClick={onToggleChannels}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div className="min-w-0 flex-1 font-semibold truncate">{title}</div>
      <div className="ml-auto flex items-center gap-2">
        <button
          aria-label={isDark ? t.header.light : t.header.dark}
          onClick={() => (isDark ? onLight() : onDark())}
          className="p-2 rounded-md cursor-pointer hover-surface"
          title={isDark ? t.header.lightTheme : t.header.darkTheme}
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
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {user.username}
              {user.isGuest ? t.header.guestSuffix : ''}
            </div>
            <button onClick={onLogout} className="text-xs px-2 py-1 rounded hover:opacity-90 cursor-pointer" style={{ background: 'var(--input-bg)' }}>
              {t.header.logout}
            </button>
          </>
        ) : (
          <button onClick={onLogin} className="text-xs px-2 py-2 text-white rounded hover:brightness-110 cursor-pointer" style={{ background: 'var(--accent)' }}>
            {t.header.loginDiscord}
          </button>
        )}
      </div>
    </header>
  )
}
