import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onAddAttachment?: (file: File) => void
  onRemoveAttachment?: (id: string) => void
  uploading?: boolean
  attachments?: Array<{ id: string; name: string; isImage: boolean; previewUrl?: string }>
  disabled?: boolean
  t: {
    composer: {
      placeholderLogin: string
      placeholderMessage: string
      send: string
    }
  }
}

export default function Composer({
  value,
  onChange,
  onSend,
  onAddAttachment,
  onRemoveAttachment,
  uploading = false,
  attachments = [],
  disabled = false,
  t,
}: Props) {
  const isEnabled = !disabled && (value.trim().length > 0 || attachments.length > 0)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const adjustHeight = () => {
    if (typeof window === 'undefined') return
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    const style = window.getComputedStyle(el)
    const fontSize = parseFloat(style.fontSize) || 14
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.4
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
    const max = 180 // px, max height
    const minHeight = lineHeight + padding
    const threshold = minHeight + 2
    const next = el.scrollHeight <= threshold ? minHeight : Math.min(el.scrollHeight, max)
    el.style.height = `${Math.ceil(next)}px`
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  useEffect(() => {
    const target: EventTarget | null = typeof window === 'undefined' ? null : window
    if (!target) return
    const el = taRef.current
    if (!el) return
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => adjustHeight())
      observer.observe(el)
    } else {
      const onResize = () => adjustHeight()
      target.addEventListener('resize', onResize)
      return () => target.removeEventListener('resize', onResize)
    }
    return () => {
      observer?.disconnect()
    }
  }, [])
  return (
    <div className="px-4 pb-4">
      <div className={`rounded-[10px] ${disabled ? 'cursor-not-allowed opacity-90' : ''}`} style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
        {attachments.length > 0 ? (
          <div className="px-3 pt-3">
            <div className="flex flex-wrap gap-3">
            {attachments.map((item) => (
              <div key={item.id} className="relative w-48 p-2">
                <div
                  className="w-48 rounded-md overflow-hidden"
                  style={{ background: 'var(--input-bg)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {item.isImage && item.previewUrl ? (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <img src={item.previewUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 grid place-items-center" style={{ color: 'var(--text-muted)' }}>
                      <span className="text-[11px]">FILE</span>
                    </div>
                  )}
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.name}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full grid place-items-center cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                  onClick={() => onRemoveAttachment?.(item.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 px-3 py-3">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onAddAttachment?.(file)
              if (event.target) event.target.value = ''
            }}
            accept="image/*,application/pdf,text/plain,application/zip,application/x-zip-compressed"
            disabled={disabled || uploading}
          />
          <button
            type="button"
            aria-label="Attach file"
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
            className={`p-2 rounded-md transition-colors ${disabled || uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ color: disabled || uploading ? '#9aa0a6' : 'var(--text-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M21 12.5V17a4 4 0 0 1-8 0V7a3 3 0 1 1 6 0v9a2 2 0 1 1-4 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 12v5a4 4 0 0 0 8 0v-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => !disabled && onChange(e.target.value)}
            onPaste={(event) => {
              if (!onAddAttachment || disabled || uploading) return
              const items = event.clipboardData?.items
              if (!items) return
              const fileItem = Array.from(items).find((item) => item.kind === 'file')
              if (!fileItem) return
              const file = fileItem.getAsFile()
              if (!file) return
              event.preventDefault()
              onAddAttachment(file)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (isEnabled) onSend()
              }
            }}
            placeholder={disabled ? t.composer.placeholderLogin : t.composer.placeholderMessage}
            disabled={disabled}
            className={`flex-1 bg-transparent outline-none resize-none leading-6 text-[14px] ${disabled ? 'cursor-not-allowed' : ''}`}
            rows={1}
            style={{ maxHeight: 180 }}
            maxLength={1000}
          />
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              aria-label={t.composer.send}
              disabled={!isEnabled || uploading}
              onClick={() => isEnabled && onSend()}
              className={`p-2 rounded-md transition-colors ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{
                color: isEnabled && !uploading ? '#ffffff' : '#9aa0a6',
                backgroundColor: isEnabled && !uploading ? 'var(--accent)' : 'rgba(127,127,127,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


