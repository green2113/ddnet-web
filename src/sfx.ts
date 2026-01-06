type SfxName = 'micOn' | 'micOff' | 'headsetOn' | 'headsetOff' | 'voiceJoin' | 'voiceLeave'

type Tone = {
  freq: number
  duration: number
  gain?: number
  type?: OscillatorType
  offset?: number
}

let audioCtx: AudioContext | null = null

const getContext = () => {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  if (!audioCtx) {
    audioCtx = new AudioCtx()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

const scheduleTone = (ctx: AudioContext, tone: Tone, startAt: number) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const duration = Math.max(0.05, tone.duration)
  const gainValue = tone.gain ?? 0.08
  const type = tone.type ?? 'sine'
  osc.type = type
  osc.frequency.value = tone.freq
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(gainValue, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

const sfxMap: Record<SfxName, Tone[]> = {
  micOn: [{ freq: 920, duration: 0.12, gain: 0.08, type: 'sine' }],
  micOff: [{ freq: 620, duration: 0.12, gain: 0.08, type: 'sine' }],
  headsetOn: [{ freq: 520, duration: 0.14, gain: 0.08, type: 'triangle' }],
  headsetOff: [{ freq: 380, duration: 0.14, gain: 0.08, type: 'triangle' }],
  voiceJoin: [
    { freq: 520, duration: 0.12, gain: 0.07, type: 'sine', offset: 0 },
    { freq: 760, duration: 0.14, gain: 0.07, type: 'sine', offset: 0.06 },
  ],
  voiceLeave: [
    { freq: 760, duration: 0.12, gain: 0.07, type: 'sine', offset: 0 },
    { freq: 520, duration: 0.14, gain: 0.07, type: 'sine', offset: 0.06 },
  ],
}

export const playSfx = (name: SfxName) => {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime
  const tones = sfxMap[name]
  tones.forEach((tone) => {
    const offset = tone.offset ?? 0
    scheduleTone(ctx, tone, now + offset)
  })
}
