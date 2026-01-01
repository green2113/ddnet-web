import { useEffect, useRef } from 'react'

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
  t: {
    composer: {
      placeholderLogin: string
      placeholderMessage: string
      send: string
    }
  }
}

export default function Composer({ value, onChange, onSend, disabled = false, t }: Props) {
  const isEnabled = !disabled && value.trim().length > 0
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const adjustHeight = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    const max = 180 // px, max height
    el.style.height = Math.min(el.scrollHeight, max) + 'px'
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
      <div className="flex items-center gap-2">
        <div className={`flex w-full items-center rounded-[10px] px-3 py-3 ${disabled ? 'cursor-not-allowed opacity-90' : ''}`} style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => !disabled && onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (isEnabled) onSend()
              }
            }}
            placeholder={disabled ? t.composer.placeholderLogin : t.composer.placeholderMessage}
            disabled={disabled}
            className={`flex-1 bg-transparent outline-none resize-none leading-6 text-[13px] ${disabled ? 'cursor-not-allowed' : ''}`}
            rows={1}
            style={{ maxHeight: 180 }}
            maxLength={1000}
          />
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              aria-label={t.composer.send}
              disabled={!isEnabled}
              onClick={() => isEnabled && onSend()}
              className={`p-2 rounded-md transition-colors ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              style={{
                color: isEnabled ? '#ffffff' : '#9aa0a6',
                backgroundColor: isEnabled ? 'var(--accent)' : 'rgba(127,127,127,0.35)',
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


