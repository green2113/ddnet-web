import type { ReactNode } from 'react'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'

type TooltipProps = {
  label: string
  children: ReactNode
  side?: TooltipSide
}

const sideClassMap: Record<TooltipSide, string> = {
  top: 'bottom-full mb-3 left-1/2 -translate-x-1/2',
  right: 'left-full ml-1.5 top-1/2 -translate-y-1/2',
  bottom: 'top-full mt-0 left-1/2 -translate-x-1/2',
  left: 'right-full mr-1.5 top-1/2 -translate-y-1/2',
}

const arrowClassMap: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 -translate-y-[1px]',
  right: 'right-full top-1/2 -translate-y-1/2 translate-x-1/2',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-[1px]',
  left: 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2',
}

const arrowRotateMap: Record<TooltipSide, string> = {
  top: 'rotate-180',
  right: '-rotate-90',
  bottom: '',
  left: 'rotate-90',
}

export default function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 rounded-lg px-3 py-2 text-[13px] whitespace-nowrap opacity-0 translate-y-1 transition duration-150 ease-out ${sideClassMap[side]} group-hover:opacity-100 group-hover:translate-y-0`}
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
          className={`absolute ${arrowClassMap[side]} ${arrowRotateMap[side]}`}
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
