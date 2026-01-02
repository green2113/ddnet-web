type VoiceIconProps = {
  size?: number
  muted?: boolean
  outlineColor?: string
}

const getSlashWidths = (size: number) => {
  const outlineWidth = Math.max(3.2, size * 0.24)
  const lineWidth = Math.max(2.0, size * 0.14)
  return { outlineWidth, lineWidth }
}

export function MicIcon({ size = 18, muted = false, outlineColor = 'var(--panel)' }: VoiceIconProps) {
  const { outlineWidth, lineWidth } = getSlashWidths(size)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20h2v-2.08A7 7 0 0 0 19 11h-2Z" />
      {muted ? (
        <>
          <path d="M4 4l16 16" stroke={outlineColor} strokeWidth={outlineWidth} strokeLinecap="round" />
          <path d="M4 4l16 16" stroke="currentColor" strokeWidth={lineWidth} strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

export function HeadsetIcon({ size = 18, muted = false, outlineColor = 'var(--panel)' }: VoiceIconProps) {
  const { outlineWidth, lineWidth } = getSlashWidths(size)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 4a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h2v-7H6v-1a6 6 0 0 1 12 0v1h-3v7h2a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8Z" />
      {muted ? (
        <>
          <path d="M4 4l16 16" stroke={outlineColor} strokeWidth={outlineWidth} strokeLinecap="round" />
          <path d="M4 4l16 16" stroke="currentColor" strokeWidth={lineWidth} strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}
