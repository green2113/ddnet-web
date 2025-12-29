import { createPortal } from 'react-dom'

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
  language: 'ko' | 'en' | 'zh-Hans' | 'zh-Hant'
  onLanguageChange: (value: 'ko' | 'en' | 'zh-Hans' | 'zh-Hant') => void
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
}

export default function UserSettings({
  showUserSettings,
  settingsTab,
  onSetTab,
  onCloseUserSettings,
  user,
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
}: UserSettingsProps) {
  if (!showUserSettings) return null

  const text = {
    en: {
      account: 'My Account',
      voiceVideo: 'Voice & Video',
      language: 'Language',
      titleAccount: 'My Account',
      titleVoice: 'Voice Settings',
      titleLanguage: 'Language Settings',
      subtitleAccount: 'Check your profile and account information.',
      subtitleVoice: 'Adjust mic sensitivity and voice input.',
      subtitleLanguage: 'Choose the language to display.',
      nickname: 'Nickname',
      profileHint: 'You can review your profile photo and info in settings.',
      micSensitivity: 'Mic Sensitivity',
      currentInput: 'Current input',
      detectThreshold: 'Detection threshold',
      detected: 'Detected',
      quiet: 'Quiet',
      sensitivityHint: 'Higher values let the mic react to smaller sounds.',
      noiseSuppression: 'Noise Suppression',
      noiseSuppressionHint: 'Use WebRTC noise suppression to reduce background noise.',
      rejoinHint: 'Rejoin the voice channel after changing this setting.',
      on: 'On',
      off: 'Off',
      inputTest: 'Input Test',
      inputTestHint: 'Use this to test your mic settings.',
      startTest: 'Start Test',
      stopTest: 'Stop Test',
      testingHint: 'Mic test is running. Try speaking.',
      close: 'Close user settings',
      guest: 'Guest',
      guestAccount: 'Guest account',
      myAccount: 'My account',
      languageOptions: {
        ko: 'Korean',
        en: 'English',
        'zh-Hans': 'Chinese (Simplified)',
        'zh-Hant': 'Chinese (Traditional)',
      },
    },
    ko: {
      account: '내 계정',
      voiceVideo: '음성 및 비디오',
      language: '언어',
      titleAccount: '내 계정',
      titleVoice: '음성 설정',
      titleLanguage: '언어 설정',
      subtitleAccount: '프로필과 계정 정보를 확인하세요.',
      subtitleVoice: '마이크 민감도와 음성 입력을 조정하세요.',
      subtitleLanguage: '표시할 언어를 선택하세요.',
      nickname: '닉네임',
      profileHint: '설정 화면에서 프로필 사진과 정보를 확인할 수 있습니.',
      micSensitivity: '마이크 민감도',
      currentInput: '현재 입력',
      detectThreshold: '감지 기준',
      detected: '감지됨',
      quiet: '조용함',
      sensitivityHint: '높을수록 작은 소리에도 마이크가 반응합니다.',
      noiseSuppression: '잡음 제거',
      noiseSuppressionHint: 'WebRTC의 노이즈 억제를 사용해 주변 소음을 줄입니다.',
      rejoinHint: '설정 변경 후 음성 채널을 다시 입장하면 적용됩니다.',
      on: '켜짐',
      off: '꺼짐',
      inputTest: '입력 테스트',
      inputTestHint: '마이크 설정을 테스트할 때 사용하세요.',
      startTest: '테스트 시작',
      stopTest: '테스트 중지',
      testingHint: '마이크 테스트 중입니다. 말해보세요.',
      close: '사용자 설정 닫기',
      guest: '게스트',
      guestAccount: '게스트 계정',
      myAccount: '내 계정',
      languageOptions: {
        ko: '한국어',
        en: 'English',
        'zh-Hans': '中文(简体)',
        'zh-Hant': '中文(繁體)',
      },
    },
    'zh-Hans': {
      account: '我的账户',
      voiceVideo: '语音与视频',
      language: '语言',
      titleAccount: '我的账户',
      titleVoice: '语音设置',
      titleLanguage: '语言设置',
      subtitleAccount: '查看你的资料与账号信息。',
      subtitleVoice: '调整麦克风灵敏度与语音输入。',
      subtitleLanguage: '选择要显示的语言。',
      nickname: '昵称',
      profileHint: '你可以在设置中查看头像与资料信息。',
      micSensitivity: '麦克风灵敏度',
      currentInput: '当前输入',
      detectThreshold: '检测阈值',
      detected: '已检测',
      quiet: '安静',
      sensitivityHint: '数值越高，麦克风越容易响应微小声音。',
      noiseSuppression: '噪声抑制',
      noiseSuppressionHint: '使用 WebRTC 噪声抑制降低背景噪声。',
      rejoinHint: '更改后请重新进入语音频道以生效。',
      on: '开启',
      off: '关闭',
      inputTest: '输入测试',
      inputTestHint: '用于测试麦克风设置。',
      startTest: '开始测试',
      stopTest: '停止测试',
      testingHint: '麦克风测试中，请说话。',
      close: '关闭用户设置',
      guest: '访客',
      guestAccount: '访客账户',
      myAccount: '我的账户',
      languageOptions: {
        ko: '韩语',
        en: '英语',
        'zh-Hans': '中文（简体）',
        'zh-Hant': '中文（繁體）',
      },
    },
    'zh-Hant': {
      account: '我的帳號',
      voiceVideo: '語音與影片',
      language: '語言',
      titleAccount: '我的帳號',
      titleVoice: '語音設定',
      titleLanguage: '語言設定',
      subtitleAccount: '檢視你的個人檔案與帳號資訊。',
      subtitleVoice: '調整麥克風敏感度與語音輸入。',
      subtitleLanguage: '選擇要顯示的語言。',
      nickname: '暱稱',
      profileHint: '你可以在設定中查看頭像與個人資訊。',
      micSensitivity: '麥克風敏感度',
      currentInput: '目前輸入',
      detectThreshold: '偵測門檻',
      detected: '已偵測',
      quiet: '安靜',
      sensitivityHint: '數值越高，麥克風越容易回應細微聲音。',
      noiseSuppression: '雜訊抑制',
      noiseSuppressionHint: '使用 WebRTC 雜訊抑制降低背景噪音。',
      rejoinHint: '變更後請重新進入語音頻道以生效。',
      on: '開啟',
      off: '關閉',
      inputTest: '輸入測試',
      inputTestHint: '用於測試麥克風設定。',
      startTest: '開始測試',
      stopTest: '停止測試',
      testingHint: '麥克風測試中，請說話。',
      close: '關閉使用者設定',
      guest: '訪客',
      guestAccount: '訪客帳號',
      myAccount: '我的帳號',
      languageOptions: {
        ko: '韓語',
        en: '英語',
        'zh-Hans': '中文（简体）',
        'zh-Hant': '中文（繁體）',
      },
    },
  } as const

  const t = text[language] ?? text.ko
  const displayName = user?.displayName || user?.username || t.guest

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-8 py-5"
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
                <div className="text-xs opacity-70">{user?.isGuest ? t.guestAccount : t.myAccount}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md"
                style={{ background: settingsTab === 'profile' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('profile')}
              >
                {t.account}
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md"
                style={{ background: settingsTab === 'voice' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('voice')}
              >
                {t.voiceVideo}
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-md"
                style={{ background: settingsTab === 'language' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                onClick={() => onSetTab('language')}
              >
                {t.language}
              </button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-lg font-semibold">
                  {settingsTab === 'voice' ? t.titleVoice : settingsTab === 'language' ? t.titleLanguage : t.titleAccount}
                </div>
                <div className="text-sm opacity-70">
                  {settingsTab === 'voice' ? t.subtitleVoice : settingsTab === 'language' ? t.subtitleLanguage : t.subtitleAccount}
                </div>
              </div>
              <button className="h-8 w-8 rounded-full border border-white/20" onClick={onCloseUserSettings} aria-label={t.close}>
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
                    <div className="text-sm opacity-70">{t.nickname}</div>
                    <div className="text-lg font-semibold">{displayName}</div>
                    <div className="text-xs opacity-60 mt-1">{t.profileHint}</div>
                  </div>
                </div>
              </div>
            ) : settingsTab === 'voice' ? (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold mb-2">{t.micSensitivity}</div>
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
                        {t.currentInput}: {micLevelLabel}dB
                      </span>
                      <span>
                        {t.detectThreshold}: {micSensitivity}dB
                      </span>
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: micLevelLabel >= micSensitivity ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                      {micLevelLabel >= micSensitivity ? t.detected : t.quiet}
                    </div>
                  </div>
                  <div className="text-xs opacity-70 mt-2">{t.sensitivityHint}</div>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#1f202b' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t.noiseSuppression}</div>
                      <div className="text-xs opacity-70 mt-1">{t.noiseSuppressionHint}</div>
                    </div>
                    <button
                      type="button"
                      className="px-3 h-8 rounded-md text-sm"
                      style={{ background: noiseSuppressionEnabled ? '#22c55e' : '#4b5563' }}
                      onClick={() => onToggleNoiseSuppression(!noiseSuppressionEnabled)}
                    >
                      {noiseSuppressionEnabled ? t.on : t.off}
                    </button>
                  </div>
                  <div className="text-[11px] opacity-70 mt-3">{t.rejoinHint}</div>
                </div>
                <div className="rounded-xl p-5" style={{ background: '#1f202b' }}>
                  <div className="text-sm font-semibold mb-2">{t.inputTest}</div>
                  <div className="text-xs opacity-70">{t.inputTestHint}</div>
                  <button type="button" className="mt-4 px-4 h-9 rounded-md" style={{ background: isTestingMic ? '#4b5563' : '#5865f2' }} onClick={onToggleMicTest}>
                    {isTestingMic ? t.stopTest : t.startTest}
                  </button>
                  {isTestingMic ? <div className="mt-3 text-xs opacity-70">{t.testingHint}</div> : null}
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
                    <span className="text-sm">{t.languageOptions[option]}</span>
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
