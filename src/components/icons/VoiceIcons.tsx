type VoiceIconProps = {
  size?: number
  muted?: boolean
  outlineColor?: string
}

const getSlashWidths = (size: number) => {
  const outlineWidth = Math.max(6.0, size * 0.42)
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
          <path d="M20 4L4 20" stroke={outlineColor} strokeWidth={outlineWidth} strokeLinecap="round" />
          <path d="M20 4L4 20" stroke="currentColor" strokeWidth={lineWidth} strokeLinecap="round" />
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
          <path d="M20 4L4 20" stroke={outlineColor} strokeWidth={outlineWidth} strokeLinecap="round" />
          <path d="M20 4L4 20" stroke="currentColor" strokeWidth={lineWidth} strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

export function VolumeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2,6A2,2,0,0,0,0,8v8a2,2,0,0,0,2,2H4.8L12,23.977V.017L4.8,6Z" />
      <path d="M20,12a5.006,5.006,0,0,0-5-5H14V9h1a3,3,0,0,1,0,6H14v2h1A5.006,5.006,0,0,0,20,12Z" />
      <path d="M15,3H14V5h1a7,7,0,0,1,0,14H14v2h1A9,9,0,0,0,15,3Z" />
    </svg>
  )
}

export function ScreenShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 5a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h6l-1.6 1.6a1 1 0 0 0 1.4 1.4L12 18.3l2.2 2.2a1 1 0 0 0 1.4-1.4L14 17.5h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4Z" />
    </svg>
  )
}
