import UserSettings, { type UserSettingsUser } from './UserSettings'
import type { Language } from '../i18n'

type SidebarProfileBarProps = {
  user: UserSettingsUser | null
  showUserSettings: boolean
  settingsTab: 'profile' | 'voice' | 'language'
  onSetTab: (tab: 'profile' | 'voice' | 'language') => void
  onCloseUserSettings: () => void
  onOpenUserSettings: (tab: 'profile' | 'voice' | 'language') => void
  language: Language
  onLanguageChange: (value: Language) => void
  micSensitivity: number
  onMicSensitivityChange: (value: number) => void
  noiseSuppressionEnabled: boolean
  onToggleNoiseSuppression: (value: boolean) => void
  micLevelPercent: number
  micLevelLabel: number
  micSensitivityPercent: number
  isTestingMic: boolean
  onToggleMicTest: () => void
  micTestError: string
  renderSettings?: boolean
}

export default function SidebarProfileBar({
  user,
  showUserSettings,
  settingsTab,
  onSetTab,
  onCloseUserSettings,
  onOpenUserSettings,
  language,
  onLanguageChange,
  micSensitivity,
  onMicSensitivityChange,
  noiseSuppressionEnabled,
  onToggleNoiseSuppression,
  micLevelPercent,
  micLevelLabel,
  micSensitivityPercent,
  isTestingMic,
  onToggleMicTest,
  micTestError,
  renderSettings = true,
}: SidebarProfileBarProps) {
  return (
    <>
      <div
        className="border rounded-xl px-3 py-3"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--header-bg)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {(user?.displayName || user?.username || 'G').slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm" style={{ color: 'var(--text-primary)' }}>
              {user?.displayName || user?.username || '게스트'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {user?.isGuest ? '게스트 모드' : '온라인'}
            </div>
          </div>
          <button
            type="button"
            aria-label="사용자 설정"
            className="h-9 w-9 rounded-md flex items-center justify-center hover-surface"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => onOpenUserSettings('profile')}
          >
            <Icon name="settings" />
          </button>
        </div>
      </div>
      {renderSettings ? (
        <UserSettings
          showUserSettings={showUserSettings}
          settingsTab={settingsTab}
          onSetTab={onSetTab}
          onCloseUserSettings={onCloseUserSettings}
          user={user}
          language={language}
          onLanguageChange={onLanguageChange}
          micSensitivity={micSensitivity}
          onMicSensitivityChange={onMicSensitivityChange}
          noiseSuppressionEnabled={noiseSuppressionEnabled}
          onToggleNoiseSuppression={onToggleNoiseSuppression}
          micLevelPercent={micLevelPercent}
          micLevelLabel={micLevelLabel}
          micSensitivityPercent={micSensitivityPercent}
          isTestingMic={isTestingMic}
          onToggleMicTest={onToggleMicTest}
          micTestError={micTestError}
        />
      ) : null}
    </>
  )
}

function Icon({ name }: { name: string }) {
  switch (name) {
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .33 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.86-.33 1.7 1.7 0 0 0-1 1.53V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1-1.53 1.7 1.7 0 0 0-1.86.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .33-1.86 1.7 1.7 0 0 0-1.53-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.53-1 1.7 1.7 0 0 0-.33-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.86.33 1.7 1.7 0 0 0 1-1.53V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.53 1.7 1.7 0 0 0 1.86-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.33 1.86 1.7 1.7 0 0 0 1.53 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.53 1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return null
  }
}
