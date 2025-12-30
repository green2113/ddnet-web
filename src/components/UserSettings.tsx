import { createPortal } from 'react-dom'
import type { UiText } from '../i18n'

export type UserSettingsUser = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  isGuest?: boolean
}

type UserSettingsProps = {
  showUserSettings: boolean
  settingsTab: 'profile' | 'voice' | 'language'
  onSetTab: (tab: 'profile' | 'voice' | 'language') => void
  onCloseUserSettings: () => void
  user: UserSettingsUser | null
  t: UiText
  language: 'ko' | 'en' | 'zh-Hans' | 'zh-Hant'
  onLanguageChange: (value: 'ko' | 'en' | 'zh-Hans' | 'zh-Hant') => void
  micSensitivity: number
  onMicSensitivityChange: (value: number) => void
  noiseSuppressionMode: 'webrtc' | 'off'
  onNoiseSuppressionModeChange: (value: 'webrtc' | 'off') => void
  micLevelPercent: number
  micLevelLabel: number
  micSensitivityPercent: number
  isTestingMic: boolean
  onToggleMicTest: () => void
  micTestError: string
}

export default function UserSettings({
  showUserSettings,
  settingsTab,
  onSetTab,
  onCloseUserSettings,
  user,
  t,
  language,
  onLanguageChange,
  micSensitivity,
  onMicSensitivityChange,
  noiseSuppressionMode,
  onNoiseSuppressionModeChange,
  micLevelPercent,
  micLevelLabel,
  micSensitivityPercent,
  isTestingMic,
  onToggleMicTest,
  micTestError,
}: UserSettingsProps) {
  if (!showUserSettings) return null

  const displayName = user?.displayName || user?.username || t.userSettings.guest

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-10 py-9"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onMouseDown={onCloseUserSettings}
    >
      <div
        className="w-full h-full rounded-2xl overflow-hidden shadow-xl"
        style={{ background: '#2b2c3c', color: 'white' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-full">
          <div className="w-64 p-6" style={{ background: '#1e1f2b' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#2f3142' }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{(user?.displayName || user?.username || 'G').slice(0, 1)}</span>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold">{displayName}</div>
                <div className="text-xs opacity-70">{user?.isGuest ? t.userSettings.guestAccount : t.userSettings.myAccount}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2"
                style={{ background: settingsTab === 'profile' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('profile')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span>{t.userSettings.account}</span>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2"
                style={{ background: settingsTab === 'voice' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('voice')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span>{t.userSettings.voiceVideo}</span>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2"
                style={{ background: settingsTab === 'language' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('language')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12 3a14 14 0 0 0 0 18a14 14 0 0 0 0-18Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span>{t.userSettings.language}</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-lg font-semibold">
                  {settingsTab === 'voice'
                    ? t.userSettings.titleVoice
                    : settingsTab === 'language'
                      ? t.userSettings.titleLanguage
                      : t.userSettings.titleAccount}
                </div>
                <div className="text-sm opacity-70">
                  {settingsTab === 'voice'
                    ? t.userSettings.subtitleVoice
                    : settingsTab === 'language'
                      ? t.userSettings.subtitleLanguage
                      : t.userSettings.subtitleAccount}
                </div>
              </div>
              <button className="h-8 w-8 rounded-full border border-white/20" onClick={onCloseUserSettings} aria-label={t.userSettings.close}>
                ✕
              </button>
            </div>
            {settingsTab === 'profile' ? (
              <div className="rounded-xl p-6" style={{ background: '#1f202b' }}>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#2f3142' }}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold">{(user?.displayName || user?.username || 'G').slice(0, 1)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm opacity-70">{t.userSettings.nickname}</div>
                    <div className="text-lg font-semibold">{displayName}</div>
                    <div className="text-xs opacity-60 mt-1">{t.userSettings.profileHint}</div>
                  </div>
                </div>
              </div>
            ) : settingsTab === 'voice' ? (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold mb-2">{t.userSettings.micSensitivity}</div>
                  <div className="flex items-center gap-4">
                    <input type="range" min={-100} max={0} step={1} value={micSensitivity} onChange={(e) => onMicSensitivityChange(Number(e.target.value))} className="flex-1" />
                    <span className="text-sm w-16 text-right">{micSensitivity}dB</span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full overflow-hidden relative" style={{ background: '#2f3142' }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${micLevelPercent}%`,
                          background: micLevelLabel >= micSensitivity ? '#22c55e' : '#5865f2',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: `${micSensitivityPercent}%`,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          background: 'rgba(255,255,255,0.6)',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] opacity-70 mt-2">
                      <span>
                        {t.userSettings.currentInput}: {micLevelLabel}dB
                      </span>
                      <span>
                        {t.userSettings.detectThreshold}: {micSensitivity}dB
                      </span>
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: micLevelLabel >= micSensitivity ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                      {micLevelLabel >= micSensitivity ? t.userSettings.detected : t.userSettings.quiet}
                    </div>
                  </div>
                  <div className="text-xs opacity-70 mt-2">{t.userSettings.sensitivityHint}</div>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#1f202b' }}>
                  <div className="text-sm font-semibold">{t.userSettings.noiseSuppression}</div>
                  <div className="text-xs opacity-70 mt-1">{t.userSettings.noiseSuppressionHint}</div>
                  <div className="mt-4 space-y-2">
                    {(['webrtc', 'off'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 rounded-md"
                        style={{
                          background: noiseSuppressionMode === option ? 'rgba(88,101,242,0.2)' : 'transparent',
                          border: noiseSuppressionMode === option ? '1px solid rgba(88,101,242,0.6)' : '1px solid transparent',
                        }}
                        onClick={() => onNoiseSuppressionModeChange(option)}
                      >
                        <span className="text-sm">{t.userSettings.noiseSuppressionOptions[option]}</span>
                        {noiseSuppressionMode === option ? <span className="text-xs opacity-70">{t.userSettings.on}</span> : null}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] opacity-70 mt-3">{t.userSettings.rejoinHint}</div>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#1f202b' }}>
                  <div className="text-sm font-semibold mb-2">{t.userSettings.inputTest}</div>
                  <div className="text-xs opacity-70">{t.userSettings.inputTestHint}</div>
                  <button type="button" className="mt-4 px-4 h-9 rounded-md" style={{ background: isTestingMic ? '#4b5563' : '#5865f2' }} onClick={onToggleMicTest}>
                    {isTestingMic ? t.userSettings.stopTest : t.userSettings.startTest}
                  </button>
                  {isTestingMic ? <div className="mt-3 text-xs opacity-70">{t.userSettings.testingHint}</div> : null}
                  {micTestError ? <div className="mt-3 text-xs text-red-300">{micTestError}</div> : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 space-y-3" style={{ background: '#1f202b' }}>
                {(['ko', 'en', 'zh-Hans', 'zh-Hant'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-md"
                    style={{
                      background: language === option ? 'rgba(88,101,242,0.2)' : 'transparent',
                      border: language === option ? '1px solid rgba(88,101,242,0.6)' : '1px solid transparent',
                    }}
                    onClick={() => onLanguageChange(option)}
                  >
                    <span className="text-sm">{t.userSettings.languageOptions[option]}</span>
                    {language === option ? <span className="text-xs opacity-70">✓</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
