import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UiText } from '../i18n'
import Tooltip from './Tooltip'

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
  onLogout: () => void
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
  onUpdateProfile: (displayName: string) => Promise<void>
  onUploadAvatar: (file: File) => Promise<void>
}

export default function UserSettings({
  showUserSettings,
  settingsTab,
  onSetTab,
  onCloseUserSettings,
  onLogout,
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
  onUpdateProfile,
  onUploadAvatar,
}: UserSettingsProps) {
  const [isVisible, setIsVisible] = useState(showUserSettings)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [inputDeviceId, setInputDeviceId] = useState(() => {
    if (typeof window === 'undefined') return 'default'
    return window.localStorage.getItem('voice-input-device') || 'default'
  })
  const [outputDeviceId, setOutputDeviceId] = useState(() => {
    if (typeof window === 'undefined') return 'default'
    return window.localStorage.getItem('voice-output-device') || 'default'
  })

  useEffect(() => {
    if (showUserSettings) {
      setIsVisible(true)
      setIsClosing(false)
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      return
    }
    if (!isVisible) return
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, 180)
  }, [showUserSettings, isVisible])

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    setDisplayNameDraft(user?.displayName || user?.username || '')
  }, [user?.displayName, user?.username])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return
    let mounted = true
    const updateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!mounted) return
        setAudioInputs(devices.filter((device) => device.kind === 'audioinput'))
        setAudioOutputs(devices.filter((device) => device.kind === 'audiooutput'))
      } catch {
        // Ignore device enumeration errors (permissions or unsupported).
      }
    }
    updateDevices()
    const handleChange = () => {
      updateDevices()
    }
    navigator.mediaDevices.addEventListener?.('devicechange', handleChange)
    return () => {
      mounted = false
      navigator.mediaDevices.removeEventListener?.('devicechange', handleChange)
    }
  }, [])

  if (!isVisible) return null

  const displayName = user?.displayName || user?.username || t.userSettings.guest

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center px-14 py-12 user-settings-overlay${isClosing ? ' is-exiting' : ''} theme-dark app-no-drag`}
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onMouseDown={onCloseUserSettings}
    >
      <div
        className={`rounded-2xl overflow-hidden shadow-xl user-settings-panel${isClosing ? ' is-exiting' : ''} app-no-drag`}
        style={{ background: 'var(--header-bg)', color: 'var(--text-primary)', width: '1280px', height: '820px', maxWidth: '94vw', maxHeight: '92vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-full">
          <div className="w-64 p-8" style={{ background: 'var(--sidebar-bg)' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--input-bg)' }}>
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
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 cursor-pointer"
                style={{ background: settingsTab === 'profile' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('profile')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" />
                </svg>
                <span>{t.userSettings.account}</span>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 cursor-pointer"
                style={{ background: settingsTab === 'voice' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('voice')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2Z" />
                </svg>
                <span>{t.userSettings.voiceVideo}</span>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 cursor-pointer"
                style={{ background: settingsTab === 'language' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('language')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 2c1.9 0 3.63 1.03 4.58 2.71H7.42A5.24 5.24 0 0 1 12 4Zm-6.92 4H18.92a8.09 8.09 0 0 1 0 8H5.08a8.09 8.09 0 0 1 0-8Zm2.34 10h9.16A5.24 5.24 0 0 1 12 20a5.24 5.24 0 0 1-4.58-2Z" />
                </svg>
                <span>{t.userSettings.language}</span>
              </button>
              <div className="my-3" style={{ height: 1, background: 'var(--border)' }} />
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 cursor-pointer"
                style={{ background: 'transparent' }}
                onClick={() => {
                  onLogout()
                  onCloseUserSettings()
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M10 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2h2v2h6V5h-6v2h-2Zm-1.5 4.5 3-3 1.4 1.4-1.6 1.6H15v2h-4.7l1.6 1.6-1.4 1.4-3-3a1 1 0 0 1 0-1.4Z" />
                </svg>
                <span>{t.userSettings.logout}</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-10 overflow-y-auto" style={{ background: 'var(--header-bg)' }}>
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
              <button
                className="h-8 w-8 rounded-full"
                style={{ color: 'var(--text-primary)', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                onClick={onCloseUserSettings}
                aria-label={t.userSettings.close}
              >
                ✕
              </button>
            </div>
            {settingsTab === 'profile' ? (
              <div className="rounded-xl p-6" style={{ background: 'var(--panel)' }}>
                <div className="flex items-center gap-5">
                  {user?.isGuest ? (
                    <Tooltip label={t.sidebarChannels.guestDisabled} side="top" offsetY={12}>
                      <button
                        type="button"
                        className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center avatar-edit avatar-edit-disabled"
                        style={{ background: 'var(--input-bg)' }}
                        aria-disabled
                        onClick={() => {}}
                      >
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-semibold">{(user?.displayName || user?.username || 'G').slice(0, 1)}</span>
                        )}
                        <span className="avatar-edit-label avatar-edit-label-disabled">
                          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                            <path
                              d="M2.5 18.2V22h3.8l11.7-11.7-3.8-3.8L2.5 18.2Zm3.1 2.1H5v-.6l8.7-8.7.6.6-8.7 8.7ZM20.6 7.4c.4-.4.4-1.1 0-1.5l-2.5-2.5c-.4-.4-1.1-.4-1.5 0l-1.7 1.7 4 4 1.7-1.7Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span className="avatar-edit-text">{t.userSettings.changeAvatar}</span>
                        </span>
                      </button>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center avatar-edit"
                      style={{ background: 'var(--input-bg)' }}
                      onClick={() => {
                        avatarInputRef.current?.click()
                      }}
                    >
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-semibold">{(user?.displayName || user?.username || 'G').slice(0, 1)}</span>
                      )}
                      <span className="avatar-edit-label">
                        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                          <path
                            d="M2.5 18.2V22h3.8l11.7-11.7-3.8-3.8L2.5 18.2Zm3.1 2.1H5v-.6l8.7-8.7.6.6-8.7 8.7ZM20.6 7.4c.4-.4.4-1.1 0-1.5l-2.5-2.5c-.4-.4-1.1-.4-1.5 0l-1.7 1.7 4 4 1.7-1.7Z"
                            fill="currentColor"
                          />
                        </svg>
                        <span className="avatar-edit-text">{t.userSettings.changeAvatar}</span>
                      </span>
                    </button>
                  )}
                  <div>
                    <div className="text-sm opacity-70">{t.userSettings.nickname}</div>
                    <div className="text-lg font-semibold">{displayName}</div>
                    <div className="text-xs opacity-60 mt-1">{t.userSettings.profileHint}</div>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="text-sm font-semibold">{t.userSettings.displayNameLabel}</div>
                  <input
                    value={displayNameDraft}
                    onChange={(event) => setDisplayNameDraft(event.target.value)}
                    placeholder={t.userSettings.displayNamePlaceholder}
                    className="w-full h-10 rounded-md px-3 text-sm"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    disabled={user?.isGuest}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="h-9 px-4 rounded-md text-sm font-semibold hover-surface"
                      style={{ background: 'var(--accent)', color: '#1f1f1f' }}
                      onClick={async () => {
                        if (user?.isGuest) return
                        const next = displayNameDraft.trim()
                        if (!next) return
                        setIsSavingProfile(true)
                        try {
                          await onUpdateProfile(next)
                        } finally {
                          setIsSavingProfile(false)
                        }
                      }}
                      disabled={user?.isGuest || isSavingProfile}
                    >
                      {isSavingProfile ? t.userSettings.saving : t.userSettings.saveChanges}
                    </button>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setIsUploadingAvatar(true)
                      try {
                        await onUploadAvatar(file)
                      } finally {
                        setIsUploadingAvatar(false)
                        event.target.value = ''
                      }
                    }}
                  />
                </div>
              </div>
            ) : settingsTab === 'voice' ? (
              <div className="space-y-6">
                <div className="rounded-xl p-5" style={{ background: 'var(--panel)' }}>
                  <div className="text-sm font-semibold mb-3">{t.userSettings.outputDevice}</div>
                  <select
                    value={outputDeviceId}
                    onChange={(event) => {
                      const next = event.target.value
                      setOutputDeviceId(next)
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('voice-output-device', next)
                        window.dispatchEvent(new CustomEvent('voice-output-device', { detail: next }))
                      }
                    }}
                    className="w-full h-10 rounded-md px-3 text-sm device-select"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    <option value="default">{t.userSettings.deviceDefault}</option>
                    {audioOutputs.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `${t.userSettings.deviceDefault} ${index + 1}`}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm font-semibold mt-5 mb-3">{t.userSettings.inputDevice}</div>
                  <select
                    value={inputDeviceId}
                    onChange={(event) => {
                      const next = event.target.value
                      setInputDeviceId(next)
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('voice-input-device', next)
                        window.dispatchEvent(new CustomEvent('voice-input-device', { detail: next }))
                      }
                    }}
                    className="w-full h-10 rounded-md px-3 text-sm device-select"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    <option value="default">{t.userSettings.deviceDefault}</option>
                    {audioInputs.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `${t.userSettings.deviceDefault} ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">{t.userSettings.micSensitivity}</div>
                  <div className="flex items-center gap-4">
                    <input type="range" min={-100} max={0} step={1} value={micSensitivity} onChange={(e) => onMicSensitivityChange(Number(e.target.value))} className="flex-1" />
                    <span className="text-sm w-16 text-right">{micSensitivity}dB</span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full overflow-hidden relative" style={{ background: 'var(--input-bg)' }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${micLevelPercent}%`,
                          background: micLevelLabel >= micSensitivity ? '#22c55e' : 'var(--accent)',
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
                <div className="rounded-xl p-5" style={{ background: 'var(--panel)' }}>
                  <div className="text-sm font-semibold">{t.userSettings.noiseSuppression}</div>
                  <div className="text-xs opacity-70 mt-1">{t.userSettings.noiseSuppressionHint}</div>
                  <div className="mt-4 space-y-2">
                    {(['webrtc', 'off'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 rounded-md"
                        style={{
                          background: noiseSuppressionMode === option ? 'color-mix(in oklch, var(--accent) 18%, transparent)' : 'transparent',
                          border: noiseSuppressionMode === option ? '1px solid color-mix(in oklch, var(--accent) 60%, transparent)' : '1px solid transparent',
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
                <div className="rounded-xl p-5" style={{ background: 'var(--panel)' }}>
                  <div className="text-sm font-semibold mb-2">{t.userSettings.inputTest}</div>
                  <div className="text-xs opacity-70">{t.userSettings.inputTestHint}</div>
                  <button type="button" className="mt-4 px-4 h-9 rounded-md" style={{ background: isTestingMic ? 'var(--hover-bg)' : 'var(--accent)' }} onClick={onToggleMicTest}>
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
