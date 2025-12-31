import type { ReactNode } from 'react'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'center' | 'start' | 'end'

type TooltipProps = {
  label: string
  children: ReactNode
  side?: TooltipSide
  align?: TooltipAlign
}

const sideOffsetMap: Record<TooltipSide, string> = {
  top: 'bottom-full mb-3',
  right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
  bottom: 'top-full mt-0',
  left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
}

const alignClassMap: Record<TooltipAlign, string> = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
}

const arrowClassMap: Record<TooltipSide, string> = {
  top: 'top-full -translate-y-[1px]',
  right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2',
  bottom: 'bottom-full translate-y-[1px]',
  left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2',
}

const arrowAlignMap: Record<TooltipAlign, string> = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-3',
  end: 'right-3',
}

const arrowRotateMap: Record<TooltipSide, string> = {
  top: 'rotate-180',
  right: '-rotate-90',
  bottom: '',
  left: 'rotate-90',
}

export default function Tooltip({ label, children, side = 'top', align = 'center' }: TooltipProps) {
  const placementClass =
    side === 'top' || side === 'bottom'
      ? `${sideOffsetMap[side]} ${alignClassMap[align]}`
      : sideOffsetMap[side]
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 rounded-lg px-3 py-2 text-[13px] whitespace-nowrap opacity-0 translate-y-1 transition duration-150 ease-out ${placementClass} group-hover:opacity-100 group-hover:translate-y-0`}
        style={{
          background: 'var(--tooltip-bg)',
          color: 'var(--text-primary)',
          boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
          border: '1px solid var(--tooltip-border)',
        }}
      >
        {label}
        <svg
          aria-hidden
          width="16"
          height="10"
          viewBox="0 0 16 10"
          className={`absolute ${arrowClassMap[side]} ${arrowRotateMap[side]} ${side === 'top' || side === 'bottom' ? arrowAlignMap[align] : ''}`}
        >
          <path
            d="M1 9 L8 1 L15 9 Z"
            fill="var(--tooltip-bg)"
          />
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
    </span>
  )
}
