import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

type TooltipProps = {
  label: string
  children: ReactNode
  side?: TooltipSide
}

const arrowClassMap: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -translate-y-[1px]',
  right: 'right-full top-1/2 -translate-y-1/2 translate-x-1',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-[1px]',
  left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2',
}

const arrowRotateMap: Record<TooltipSide, string> = {
  top: 'rotate-180',
  right: '-rotate-90',
  bottom: '',
  left: 'rotate-90',
}

const portalTransformMap: Record<TooltipSide, string> = {
  top: 'translate(-50%, calc(-100% - 8px))',
  right: 'translate(12px, -50%)',
  bottom: 'translate(-50%, 8px)',
  left: 'translate(calc(-100% - 8px), -50%)',
}

const getPortalRoot = () => (typeof document === 'undefined' ? null : document.getElementById('overlay-root') || document.body)

export default function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [visible, setVisible] = useState(false)
  const [portalPos, setPortalPos] = useState<{ left: number; top: number } | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const updatePortalPos = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    if (side === 'left') {
      setPortalPos({ left: rect.left, top: rect.top + rect.height / 2 })
      return
    }
    if (side === 'right') {
      setPortalPos({ left: rect.right, top: rect.top + rect.height / 2 })
      return
    }
    if (side === 'bottom') {
      setPortalPos({ left: rect.left + rect.width / 2, top: rect.bottom })
      return
    }
    setPortalPos({ left: rect.left + rect.width / 2, top: rect.top })
  }

  useEffect(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (open) {
      updatePortalPos()
      setRendered(true)
      requestAnimationFrame(() => setVisible(true))
      window.addEventListener('resize', updatePortalPos)
      window.addEventListener('scroll', updatePortalPos, true)
      return () => {
        window.removeEventListener('resize', updatePortalPos)
        window.removeEventListener('scroll', updatePortalPos, true)
      }
    }
    setVisible(false)
    hideTimerRef.current = window.setTimeout(() => {
      setRendered(false)
      hideTimerRef.current = null
    }, 150)
  }, [open, side])

  useEffect(() => {
    const closeTooltipImmediate = () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      setOpen(false)
      setVisible(false)
      setRendered(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTooltipImmediate()
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') closeTooltipImmediate()
    }
    window.addEventListener('mousedown', closeTooltipImmediate)
    window.addEventListener('touchstart', closeTooltipImmediate, { passive: true })
    window.addEventListener('blur', closeTooltipImmediate)
    window.addEventListener('keydown', handleKey)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
      }
      window.removeEventListener('mousedown', closeTooltipImmediate)
      window.removeEventListener('touchstart', closeTooltipImmediate)
      window.removeEventListener('blur', closeTooltipImmediate)
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const transitionClass = side === 'right'
    ? (visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2')
    : (visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1')
  const tooltip = rendered && portalPos ? (
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-50 rounded-lg px-3 py-1.5 text-[14px] whitespace-nowrap transition duration-150 ease-out ${transitionClass}`}
      style={{
        background: 'var(--tooltip-bg)',
        color: 'var(--text-primary)',
        boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
        border: '1px solid var(--tooltip-border)',
        ...(portalPos ? { left: portalPos.left, top: portalPos.top, transform: portalTransformMap[side] } : {}),
      }}
    >
      {label}
      <svg
        aria-hidden
        width="16"
        height="10"
        viewBox="0 0 16 10"
        className={`absolute ${arrowClassMap[side]} ${arrowRotateMap[side]}`}
      >
        <path d="M1 9 L8 1 L15 9 Z" fill="var(--tooltip-bg)" />
        <path
          d="M1 9 L6.6 2.6 Q8 1 9.4 2.6 L15 9"
          fill="none"
          stroke="var(--tooltip-border)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : null

  const portalRoot = getPortalRoot()
  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        updatePortalPos()
        requestAnimationFrame(() => setOpen(true))
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        updatePortalPos()
        requestAnimationFrame(() => setOpen(true))
      }}
      onBlur={() => setOpen(false)}
    >
      {children}
      {portalRoot && tooltip ? createPortal(tooltip, portalRoot) : tooltip}
    </span>
  )
}
