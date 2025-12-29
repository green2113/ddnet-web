import { createPortal } from 'react-dom'

type ServerSettingsProps = {
  showSettings: boolean
  canManage: boolean
  onCloseSettings: () => void
  adminInput: string
  onAdminInputChange: (value: string) => void
  onAddAdmin?: (id: string) => void
  onRemoveAdmin?: (id: string) => void
  adminIds: string[]
}

export default function ServerSettings({
  showSettings,
  canManage,
  onCloseSettings,
  adminInput,
  onAdminInputChange,
  onAddAdmin,
  onRemoveAdmin,
  adminIds,
}: ServerSettingsProps) {
  if (!showSettings || !canManage) return null

  return createPortal(
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
}
