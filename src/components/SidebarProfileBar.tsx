import { useEffect, useRef, useState } from 'react'
import UserSettings, { type UserSettingsUser } from './UserSettings'
import Tooltip from './Tooltip'
import { HeadsetIcon, MicIcon } from './icons/VoiceIcons'
import type { UiText } from '../i18n'
import { playSfx } from '../sfx'

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
  hasVoicePanel?: boolean
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
  hasVoicePanel = false,
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
        className={`border px-3 py-3 ${hasVoicePanel ? 'rounded-b-xl border-t-0' : 'rounded-xl'}`}
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
                    playSfx('micOn')
                    const nextHeadsetMuted = headsetMuted ? false : headsetMuted
                    applyMuteState(false, nextHeadsetMuted)
                  } else {
                    playSfx('micOff')
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
                    playSfx('headsetOn')
                    applyMuteState(micBeforeDeafenRef.current, false)
                  } else {
                    playSfx('headsetOff')
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.14 12.936c.03-.308.046-.62.046-.936s-.016-.628-.046-.936l2.036-1.58a.5.5 0 0 0 .12-.64l-1.928-3.34a.5.5 0 0 0-.6-.22l-2.4.96a7.94 7.94 0 0 0-1.62-.936l-.36-2.54a.5.5 0 0 0-.5-.42h-3.856a.5.5 0 0 0-.5.42l-.36 2.54a7.94 7.94 0 0 0-1.62.936l-2.4-.96a.5.5 0 0 0-.6.22l-1.928 3.34a.5.5 0 0 0 .12.64l2.036 1.58c-.03.308-.046.62-.046.936s.016.628.046.936l-2.036 1.58a.5.5 0 0 0-.12.64l1.928 3.34a.5.5 0 0 0 .6.22l2.4-.96c.5.39 1.04.712 1.62.936l.36 2.54a.5.5 0 0 0 .5.42h3.856a.5.5 0 0 0 .5-.42l.36-2.54c.58-.224 1.12-.546 1.62-.936l2.4.96a.5.5 0 0 0 .6-.22l1.928-3.34a.5.5 0 0 0-.12-.64l-2.036-1.58ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />
        </svg>
      )
    case 'mic':
      return <MicIcon muted={muted} outlineColor="var(--header-bg)" />
    case 'headset':
      return <HeadsetIcon muted={muted} outlineColor="var(--header-bg)" />
    default:
      return null
  }
}
