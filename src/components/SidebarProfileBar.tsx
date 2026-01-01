import { useEffect, useRef, useState } from 'react'
import UserSettings, { type UserSettingsUser } from './UserSettings'
import Tooltip from './Tooltip'
import type { UiText } from '../i18n'

type SidebarProfileBarProps = {
  user: UserSettingsUser | null
  showUserSettings: boolean
  settingsTab: 'profile' | 'voice' | 'language'
  onSetTab: (tab: 'profile' | 'voice' | 'language') => void
  onCloseUserSettings: () => void
  onOpenUserSettings: (tab: 'profile' | 'voice' | 'language') => void
  onLogout: () => void
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
  renderSettings?: boolean
}

export default function SidebarProfileBar({
  user,
  showUserSettings,
  settingsTab,
  onSetTab,
  onCloseUserSettings,
  onOpenUserSettings,
  onLogout,
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
  renderSettings = true,
}: SidebarProfileBarProps) {
  const [micMuted, setMicMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    const storedMic = window.localStorage.getItem('voice-mic-muted') === 'true'
    const storedHeadset = window.localStorage.getItem('voice-headset-muted') === 'true'
    return storedMic || storedHeadset
  })
  const [headsetMuted, setHeadsetMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('voice-headset-muted') === 'true'
  })
  const micBeforeDeafenRef = useRef(false)

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ micMuted?: boolean; headsetMuted?: boolean }>).detail
      if (!detail) return
      const nextMicMuted = detail.micMuted ?? micMuted
      const nextHeadsetMuted = detail.headsetMuted ?? headsetMuted
      if (nextHeadsetMuted && !headsetMuted) {
        micBeforeDeafenRef.current = micMuted
      }
      if (nextMicMuted !== micMuted) setMicMuted(nextMicMuted)
      if (nextHeadsetMuted !== headsetMuted) setHeadsetMuted(nextHeadsetMuted)
    }
    window.addEventListener('voice-mute-update', handler as EventListener)
    return () => window.removeEventListener('voice-mute-update', handler as EventListener)
  }, [headsetMuted, micMuted])

  const applyMuteState = (nextMicMuted: boolean, nextHeadsetMuted: boolean) => {
    setMicMuted(nextMicMuted)
    setHeadsetMuted(nextHeadsetMuted)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('voice-mic-muted', String(nextMicMuted))
      window.localStorage.setItem('voice-headset-muted', String(nextHeadsetMuted))
      window.dispatchEvent(new CustomEvent('voice-mute-update', { detail: { micMuted: nextMicMuted, headsetMuted: nextHeadsetMuted } }))
    }
  }

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
              {user?.displayName || user?.username || t.userSettings.guest}
            </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {user?.isGuest ? t.userSettings.guestMode : t.userSettings.online}
          </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip label={micMuted ? t.voice.micOn : t.voice.micOff}>
              <button
                type="button"
                aria-label={micMuted ? t.voice.micOn : t.voice.micOff}
                className="h-8 w-8 cursor-pointer rounded-md flex items-center justify-center hover-surface"
                style={{ color: micMuted ? '#f87171' : 'var(--text-primary)' }}
                onClick={() => {
                  if (micMuted) {
                    const nextHeadsetMuted = headsetMuted ? false : headsetMuted
                    applyMuteState(false, nextHeadsetMuted)
                  } else {
                    applyMuteState(true, headsetMuted)
                  }
                }}
              >
                <Icon name="mic" muted={micMuted} />
              </button>
            </Tooltip>
            <Tooltip label={headsetMuted ? t.voice.headsetOn : t.voice.headsetOff}>
              <button
                type="button"
                aria-label={headsetMuted ? t.voice.headsetOn : t.voice.headsetOff}
                className="h-8 w-8 cursor-pointer rounded-md flex items-center justify-center hover-surface"
                style={{ color: headsetMuted ? '#f87171' : 'var(--text-primary)' }}
                onClick={() => {
                  if (headsetMuted) {
                    applyMuteState(micBeforeDeafenRef.current, false)
                  } else {
                    micBeforeDeafenRef.current = micMuted
                    applyMuteState(true, true)
                  }
                }}
              >
                <Icon name="headset" muted={headsetMuted} />
              </button>
            </Tooltip>
            <Tooltip label={t.userSettings.open}>
              <button
                type="button"
                aria-label={t.userSettings.open}
                className="h-8 w-8 cursor-pointer rounded-md flex items-center justify-center hover-surface"
                style={{ color: 'var(--text-primary)' }}
                onClick={() => onOpenUserSettings('profile')}
              >
                <Icon name="settings" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      {renderSettings ? (
        <UserSettings
          showUserSettings={showUserSettings}
          settingsTab={settingsTab}
          onSetTab={onSetTab}
          onCloseUserSettings={onCloseUserSettings}
          onLogout={onLogout}
          user={user}
          t={t}
          language={language}
          onLanguageChange={onLanguageChange}
          micSensitivity={micSensitivity}
          onMicSensitivityChange={onMicSensitivityChange}
          noiseSuppressionMode={noiseSuppressionMode}
          onNoiseSuppressionModeChange={onNoiseSuppressionModeChange}
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

function Icon({ name, muted }: { name: 'settings' | 'mic' | 'headset'; muted?: boolean }) {
  switch (name) {
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .33 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.86-.33 1.7 1.7 0 0 0-1 1.53V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1-1.53 1.7 1.7 0 0 0-1.86.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .33-1.86 1.7 1.7 0 0 0-1.53-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.53-1 1.7 1.7 0 0 0-.33-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.86-.33 1.7 1.7 0 0 0 1-1.53V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.53 1.7 1.7 0 0 0 1.86-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.33 1.86 1.7 1.7 0 0 0 1.53 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.53 1Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'mic':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0V8a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {muted ? <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
        </svg>
      )
    case 'headset':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M4 12v6a2 2 0 0 0 2 2h2v-6H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M20 12v6a2 2 0 0 1-2 2h-2v-6h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          {muted ? <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
        </svg>
      )
    default:
      return null
  }
}
