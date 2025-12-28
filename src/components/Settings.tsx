import { createPortal } from 'react-dom'

export type SettingsUser = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  isGuest?: boolean
}

type SettingsProps = {
  showSettings: boolean
  showUserSettings: boolean
  canManage: boolean
  settingsTab: 'profile' | 'voice'
  onSetTab: (tab: 'profile' | 'voice') => void
  onCloseSettings: () => void
  onCloseUserSettings: () => void
  adminInput: string
  onAdminInputChange: (value: string) => void
  onAddAdmin?: (id: string) => void
  onRemoveAdmin?: (id: string) => void
  adminIds: string[]
  user: SettingsUser | null
  micSensitivity: number
  onMicSensitivityChange: (value: number) => void
  micLevelPercent: number
  micLevelLabel: number
  micSensitivityPercent: number
  isTestingMic: boolean
  onToggleMicTest: () => void
  micTestError: string
}

export default function Settings({
  showSettings,
  showUserSettings,
  canManage,
  settingsTab,
  onSetTab,
  onCloseSettings,
  onCloseUserSettings,
  adminInput,
  onAdminInputChange,
  onAddAdmin,
  onRemoveAdmin,
  adminIds,
  user,
  micSensitivity,
  onMicSensitivityChange,
  micLevelPercent,
  micLevelLabel,
  micSensitivityPercent,
  isTestingMic,
  onToggleMicTest,
  micTestError,
}: SettingsProps) {
  return (
    <>
      {showSettings && canManage
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex" style={{ background: 'rgba(0,0,0,0.65)' }} onMouseDown={onCloseSettings}>
              <div className="w-[280px] bg-[#1e1f2b] p-6 text-sm text-white" onMouseDown={(e) => e.stopPropagation()}>
                <div className="text-xs uppercase opacity-60 mb-3">DD Server</div>
                <button className="w-full text-left px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  서버 프로필
                </button>
                <div className="mt-6 text-xs uppercase opacity-60 mb-3">관리</div>
                <button className="w-full text-left px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  관리자
                </button>
              </div>
              <div className="flex-1 bg-[#2b2c3c] p-8 text-white overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-lg font-semibold">관리자</div>
                    <div className="text-sm opacity-70">관리자 ID를 추가하거나 삭제할 수 있습니다.</div>
                  </div>
                  <button className="h-8 w-8 rounded-full border border-white/20" onClick={onCloseSettings} aria-label="Close settings">
                    ✕
                  </button>
                </div>
                <div className="mb-6">
                  <label className="text-xs uppercase opacity-60">관리자 추가</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={adminInput}
                      onChange={(e) => onAdminInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminInput.trim()) {
                          onAddAdmin?.(adminInput.trim())
                          onAdminInputChange('')
                        }
                      }}
                      className="flex-1 h-10 rounded-md px-3 text-white"
                      style={{ background: '#1f202b', border: '1px solid rgba(255,255,255,0.1)' }}
                      placeholder="Discord 사용자 ID"
                    />
                    <button
                      className="px-4 h-10 rounded-md text-white"
                      style={{ background: '#5865f2' }}
                      onClick={() => {
                        if (!adminInput.trim()) return
                        onAddAdmin?.(adminInput.trim())
                        onAdminInputChange('')
                      }}
                    >
                      입력
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase opacity-60">관리자 목록</label>
                  <div className="mt-2 space-y-2">
                    {adminIds.map((id) => (
                      <div key={id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: '#1f202b' }}>
                        <span className="text-sm">{id}</span>
                        <button className="text-sm text-red-300 hover:text-red-400" onClick={() => onRemoveAdmin?.(id)} aria-label={`Remove ${id}`}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {showUserSettings
        ? createPortal(
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
                        <div className="text-sm font-semibold">{user?.displayName || user?.username || '게스트'}</div>
                        <div className="text-xs opacity-70">{user?.isGuest ? '게스트 계정' : '내 계정'}</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-md"
                        style={{ background: settingsTab === 'profile' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                        onClick={() => onSetTab('profile')}
                      >
                        내 계정
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 rounded-md"
                        style={{ background: settingsTab === 'voice' ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                        onClick={() => onSetTab('voice')}
                      >
                        음성 및 비디오
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-lg font-semibold">{settingsTab === 'voice' ? '음성 설정' : '내 계정'}</div>
                        <div className="text-sm opacity-70">{settingsTab === 'voice' ? '마이크 민감도와 음성 입력을 조정하세요.' : '프로필과 계정 정보를 확인하세요.'}</div>
                      </div>
                      <button className="h-8 w-8 rounded-full border border-white/20" onClick={onCloseUserSettings} aria-label="Close user settings">
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
                            <div className="text-sm opacity-70">닉네임</div>
                            <div className="text-lg font-semibold">{user?.displayName || user?.username || '게스트'}</div>
                            <div className="text-xs opacity-60 mt-1">설정 화면에서 프로필 사진과 정보를 확인할 수 있습니다.</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <div className="text-sm font-semibold mb-2">마이크 민감도</div>
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
                              <span>현재 입력: {micLevelLabel}dB</span>
                              <span>감지 기준: {micSensitivity}dB</span>
                            </div>
                            <div className="text-[11px] mt-1" style={{ color: micLevel >= micSensitivity ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                              {micLevel >= micSensitivity ? '감지됨' : '조용함'}
                            </div>
                          </div>
                          <div className="text-xs opacity-70 mt-2">높을수록 작은 소리에도 마이크가 반응합니다.</div>
                        </div>
                        <div className="rounded-xl p-5" style={{ background: '#1f202b' }}>
                          <div className="text-sm font-semibold mb-2">입력 테스트</div>
                          <div className="text-xs opacity-70">마이크 설정을 테스트할 때 사용하세요.</div>
                          <button type="button" className="mt-4 px-4 h-9 rounded-md" style={{ background: isTestingMic ? '#4b5563' : '#5865f2' }} onClick={onToggleMicTest}>
                            {isTestingMic ? '테스트 중지' : '테스트 시작'}
                          </button>
                          {isTestingMic ? <div className="mt-3 text-xs opacity-70">마이크 테스트 중입니다. 말해보세요.</div> : null}
                          {micTestError ? <div className="mt-3 text-xs text-red-300">{micTestError}</div> : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
