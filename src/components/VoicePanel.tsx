import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { formatText, type UiText } from '../i18n'
import { HeadsetIcon, MicIcon } from './icons/VoiceIcons'

type User = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
}

type VoiceMember = {
  id: string
  username: string
  displayName?: string
  avatar?: string | null
  muted?: boolean
  deafened?: boolean
}

type VoicePanelProps = {
  channelId: string
  socket: Socket | null
  user: User | null
  forceHeadsetMuted?: boolean
  noiseSuppressionMode: 'webrtc' | 'off'
  t: UiText
  onRequireLogin?: () => void
  onJoinStateChange?: (channelId: string, joined: boolean) => void
  onSpeakingChange?: (channelId: string, speakingIds: string[]) => void
  autoJoin?: boolean
  onAutoJoinHandled?: () => void
  leaveSignal?: number
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]
const memberNameCollator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' })
const getMemberLabel = (member: VoiceMember) => member.displayName || member.username
const sortMembersByName = (members: VoiceMember[]) =>
  [...members].sort((a, b) => memberNameCollator.compare(getMemberLabel(a), getMemberLabel(b)))

const emitMuteState = (micMuted: boolean, headsetMuted: boolean) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('voice-mute-update', { detail: { micMuted, headsetMuted } }))
}

export default function VoicePanel({
  channelId,
  socket,
  user,
  forceHeadsetMuted = false,
  noiseSuppressionMode,
  t,
  onRequireLogin,
  onJoinStateChange,
  onSpeakingChange,
  autoJoin = false,
  onAutoJoinHandled,
  leaveSignal = 0,
}: VoicePanelProps) {
  const [joined, setJoined] = useState(false)
  const [members, setMembers] = useState<VoiceMember[]>([])
  const [speakingIds, setSpeakingIds] = useState<string[]>([])
  const lastLeaveSignalRef = useRef(leaveSignal)
  const [micMuted, setMicMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    const storedMic = window.localStorage.getItem('voice-mic-muted') === 'true'
    const storedHeadset = window.localStorage.getItem('voice-headset-muted') === 'true'
    return storedMic || storedHeadset
  })
  const [headsetMuted, setHeadsetMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('voice-headset-muted') === 'true'
  })
  const [micSensitivity, setMicSensitivity] = useState(-60)
  const forcedHeadsetRef = useRef(false)
  const micBeforeForceRef = useRef(false)
  const headsetBeforeForceRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const rawStreamRef = useRef<MediaStream | null>(null)
  const micContextRef = useRef<AudioContext | null>(null)
  const micGainRef = useRef<GainNode | null>(null)
  const micDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const speakingRef = useRef<Set<string>>(new Set())
  const speakingThresholdRef = useRef<Map<string, number>>(new Map())
  const localGateRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; data: Float32Array; raf: number } | null>(null)
  const analyserRef = useRef<
    Map<
      string,
      {
        ctx: AudioContext
        analyser: AnalyserNode
        data: Float32Array
        raf: number
      }
    >
  >(new Map())
  const DEFAULT_SPEAKING_THRESHOLD = -60

  const normalizeLevel = (data: Float32Array) => {
    let sum = 0
    for (const value of data) sum += value * value
    const rms = Math.sqrt(sum / data.length)
    if (!Number.isFinite(rms) || rms <= 0) return -100
    const db = 20 * Math.log10(rms)
    return Math.min(0, Math.max(-100, Math.round(db)))
  }

  const cleanupPeer = (peerId: string) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.close()
      peersRef.current.delete(peerId)
    }
    const analyser = analyserRef.current.get(peerId)
    if (analyser) {
      cancelAnimationFrame(analyser.raf)
      analyser.ctx.close()
      analyserRef.current.delete(peerId)
    }
    speakingThresholdRef.current.delete(peerId)
    if (speakingRef.current.has(peerId)) {
      speakingRef.current.delete(peerId)
      setSpeakingIds(Array.from(speakingRef.current))
    }
    const audio = document.getElementById(`voice-audio-${peerId}`) as HTMLAudioElement | null
    if (audio) {
      audio.srcObject = null
      audio.remove()
    }
  }

  const startSpeakingMonitor = (peerId: string, stream: MediaStream, threshold?: number) => {
    if (analyserRef.current.has(peerId)) return
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const data = new Float32Array(analyser.fftSize)
    if (threshold !== undefined) {
      speakingThresholdRef.current.set(peerId, threshold)
    } else if (!speakingThresholdRef.current.has(peerId)) {
      speakingThresholdRef.current.set(peerId, DEFAULT_SPEAKING_THRESHOLD)
    }

    const tick = () => {
      analyser.getFloatTimeDomainData(data)
      const normalized = normalizeLevel(data)
      const thresholdValue = speakingThresholdRef.current.get(peerId) ?? DEFAULT_SPEAKING_THRESHOLD
      const isSpeaking = normalized >= thresholdValue
      const currentlySpeaking = speakingRef.current.has(peerId)
      if (isSpeaking !== currentlySpeaking) {
        if (isSpeaking) {
          speakingRef.current.add(peerId)
        } else {
          speakingRef.current.delete(peerId)
        }
        setSpeakingIds(Array.from(speakingRef.current))
      }
      const raf = requestAnimationFrame(tick)
      const current = analyserRef.current.get(peerId)
      if (current) current.raf = raf
    }

    const raf = requestAnimationFrame(tick)
    analyserRef.current.set(peerId, { ctx, analyser, data, raf })
  }

  const leaveVoice = () => {
    if (socket && joined) {
      socket.emit('voice:leave', { channelId })
    }
    peersRef.current.forEach((_, peerId) => cleanupPeer(peerId))
    if (socket?.id) {
      cleanupPeer(socket.id)
    }
    rawStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    micContextRef.current?.close()
    micContextRef.current = null
    micGainRef.current = null
    micDestinationRef.current = null
    rawStreamRef.current = null
    localStreamRef.current = null
    setJoined(false)
    setMembers([])
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('voice-mic-sensitivity')
    const parsed = stored ? Number(stored) : NaN
    setMicSensitivity(Number.isFinite(parsed) ? Math.min(0, Math.max(-100, parsed)) : -60)
    const handleSensitivityUpdate = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail
      if (!Number.isFinite(detail)) return
      setMicSensitivity(Math.min(0, Math.max(-100, detail)))
    }
    window.addEventListener('voice-mic-sensitivity', handleSensitivityUpdate)
    return () => window.removeEventListener('voice-mic-sensitivity', handleSensitivityUpdate)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('voice-mic-muted', String(micMuted))
    window.localStorage.setItem('voice-headset-muted', String(headsetMuted))
    emitMuteState(micMuted, headsetMuted)
  }, [headsetMuted, micMuted])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ micMuted?: boolean; headsetMuted?: boolean }>).detail
      if (!detail) return
      const nextMicMuted = detail.micMuted ?? micMuted
      const nextHeadsetMuted = detail.headsetMuted ?? headsetMuted
      if (nextMicMuted !== micMuted) setMicMuted(nextMicMuted)
      if (nextHeadsetMuted !== headsetMuted) setHeadsetMuted(nextHeadsetMuted)
    }
    window.addEventListener('voice-mute-update', handler as EventListener)
    return () => window.removeEventListener('voice-mute-update', handler as EventListener)
  }, [headsetMuted, micMuted])

  useEffect(() => {
    if (!socket?.id) return
    speakingThresholdRef.current.set(socket.id, micSensitivity)
  }, [micSensitivity, socket?.id])

  const createPeer = async (peerId: string, initiate: boolean) => {
    if (!socket) return
    if (peersRef.current.has(peerId)) return
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peersRef.current.set(peerId, peer)

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current as MediaStream)
    })

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:ice', { channelId, targetId: peerId, candidate: event.candidate })
      }
    }

    peer.ontrack = (event) => {
      const audioId = `voice-audio-${peerId}`
      let audio = document.getElementById(audioId) as HTMLAudioElement | null
      if (!audio) {
        audio = document.createElement('audio')
        audio.id = audioId
        audio.autoplay = true
        audio.setAttribute('playsinline', 'true')
        document.body.appendChild(audio)
      }
      const [stream] = event.streams
      if (stream) {
        audio.srcObject = stream
        startSpeakingMonitor(peerId, stream)
      }
    }

    if (initiate) {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      socket.emit('voice:offer', { channelId, targetId: peerId, sdp: offer })
    }
  }

  const updateOutputMute = (muted: boolean) => {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="voice-audio-"]').forEach((audio) => {
      audio.muted = muted
    })
  }

  const joinVoice = async () => {
    if (!socket) return
    if (!user) {
      onRequireLogin?.()
      return
    }
    if (joined) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: noiseSuppressionMode === 'webrtc',
        },
      })
      rawStreamRef.current = stream
      const ctx = new AudioContext()
      micContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const gain = ctx.createGain()
      const destination = ctx.createMediaStreamDestination()
      micGainRef.current = gain
      micDestinationRef.current = destination
      source.connect(gain)
      gain.connect(destination)
      localStreamRef.current = destination.stream
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !micMuted && !headsetMuted
      })
      setJoined(true)
      socket.emit('voice:join', { channelId, muted: micMuted, deafened: headsetMuted })
      socket.emit('voice:status', { channelId, muted: micMuted, deafened: headsetMuted })
    } catch (error) {
      console.error('[voice] failed to get user media', error)
    }
  }

  useEffect(() => {
    if (!autoJoin) return
    if (joined) return
    void joinVoice()
    onAutoJoinHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, channelId, joined, user?.id])

  useEffect(() => {
    if (!socket) return

    const handleMembers = (payload: { channelId: string; members: VoiceMember[] }) => {
      if (payload.channelId !== channelId) return
      setMembers(payload.members)
      if (!joined) return
      const selfId = socket.id
      payload.members.forEach((member) => {
        if (!selfId || member.id === selfId) return
        const initiate = selfId < member.id
        void createPeer(member.id, initiate)
      })
    }

    const handleOffer = async (payload: { channelId: string; fromId: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.channelId !== channelId) return
      await createPeer(payload.fromId, false)
      const peer = peersRef.current.get(payload.fromId)
      if (!peer) return
      await peer.setRemoteDescription(payload.sdp)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      socket.emit('voice:answer', { channelId, targetId: payload.fromId, sdp: answer })
    }

    const handleAnswer = async (payload: { channelId: string; fromId: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.channelId !== channelId) return
      const peer = peersRef.current.get(payload.fromId)
      if (!peer) return
      await peer.setRemoteDescription(payload.sdp)
    }

    const handleIce = async (payload: { channelId: string; fromId: string; candidate: RTCIceCandidateInit }) => {
      if (payload.channelId !== channelId) return
      const peer = peersRef.current.get(payload.fromId)
      if (!peer) return
      await peer.addIceCandidate(payload.candidate)
    }

    const handleLeave = (payload: { channelId: string; peerId: string }) => {
      if (payload.channelId !== channelId) return
      cleanupPeer(payload.peerId)
    }

    const handleForceLeave = (payload: { channelId: string }) => {
      if (payload.channelId !== channelId) return
      leaveVoice()
    }

    socket.on('voice:members', handleMembers)
    socket.on('voice:offer', handleOffer)
    socket.on('voice:answer', handleAnswer)
    socket.on('voice:ice', handleIce)
    socket.on('voice:leave', handleLeave)
    socket.on('voice:force-leave', handleForceLeave)

    return () => {
      socket.off('voice:members', handleMembers)
      socket.off('voice:offer', handleOffer)
      socket.off('voice:answer', handleAnswer)
      socket.off('voice:ice', handleIce)
      socket.off('voice:leave', handleLeave)
      socket.off('voice:force-leave', handleForceLeave)
    }
  }, [channelId, joined, socket, user])

  useEffect(() => {
    onJoinStateChange?.(channelId, joined)
  }, [channelId, joined, onJoinStateChange])

  useEffect(() => {
    if (!joined) {
      onSpeakingChange?.(channelId, [])
      return
    }
    onSpeakingChange?.(channelId, speakingIds)
  }, [channelId, joined, onSpeakingChange, speakingIds])

  useEffect(() => {
    if (!socket) return
    if (!user) return
    return () => {
      leaveVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, socket, user?.id])

  useEffect(() => {
    if (!joined || !socket?.id) return
    const stream = rawStreamRef.current
    if (!stream) return
    startSpeakingMonitor(socket.id, stream, micSensitivity)
  }, [joined, micSensitivity, socket?.id])

  useEffect(() => {
    if (!joined) return
    const stream = rawStreamRef.current
    const outputStream = localStreamRef.current
    if (!stream || !outputStream) return
    if (micMuted || headsetMuted) {
      outputStream.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
      return
    }

    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const data = new Float32Array(analyser.fftSize)

    const tick = () => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      analyser.getFloatTimeDomainData(data)
      const normalized = normalizeLevel(data)
      const shouldTransmit = normalized >= micSensitivity && !micMuted && !headsetMuted
      outputStream.getAudioTracks().forEach((track) => {
        track.enabled = shouldTransmit
      })
    }

    tick()
    const intervalId = window.setInterval(tick, 120)
    localGateRef.current = { ctx, analyser, data, raf: intervalId }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(intervalId)
      ctx.close()
      localGateRef.current = null
    }
  }, [joined, micMuted, headsetMuted, micSensitivity])

  useEffect(() => {
    if (!joined || !socket) return
    socket.emit('voice:status', { channelId, muted: micMuted, deafened: headsetMuted })
  }, [channelId, headsetMuted, joined, micMuted, socket])

  useEffect(() => {
    updateOutputMute(headsetMuted)
    if (micMuted || headsetMuted) {
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
    }
  }, [headsetMuted, micMuted])

  useEffect(() => {
    if (!joined) return
    if (forceHeadsetMuted) {
      if (!forcedHeadsetRef.current) {
        forcedHeadsetRef.current = true
        micBeforeForceRef.current = micMuted
        headsetBeforeForceRef.current = headsetMuted
      }
      setHeadsetMuted(true)
      setMicMuted(true)
      return
    }
    if (forcedHeadsetRef.current) {
      forcedHeadsetRef.current = false
      setHeadsetMuted(headsetBeforeForceRef.current)
      setMicMuted(micBeforeForceRef.current)
    }
  }, [forceHeadsetMuted, joined, headsetMuted, micMuted])

  useEffect(() => {
    if (!joined) {
      lastLeaveSignalRef.current = leaveSignal
      return
    }
    if (leaveSignal === lastLeaveSignalRef.current) return
    lastLeaveSignalRef.current = leaveSignal
    leaveVoice()
  }, [joined, leaveSignal])

  return (
    <div className="flex-1 flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{t.voice.title}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {formatText(t.voice.membersCount, { count: members.length })}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {(members.length > 1 ? sortMembersByName(members) : members).map((member) => {
          const isSpeaking = speakingIds.includes(member.id) && !member.muted && !member.deafened
          return (
            <div
              key={member.id}
              className={`flex items-center justify-between gap-3 rounded-md px-2 py-2${isSpeaking ? ' voice-speaking-card' : ''}`}
              style={{
                background: 'var(--panel)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{getMemberLabel(member)}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {member.username}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 justify-end">
                {member.muted ? (
                  <span title={t.voice.micMuted} style={{ color: '#f87171' }}>
                    <MicIcon size={16} muted outlineColor="var(--panel)" />
                  </span>
                ) : null}
                {member.deafened ? (
                  <span title={t.voice.headsetMuted} style={{ color: '#f87171' }}>
                    <HeadsetIcon size={16} muted outlineColor="var(--panel)" />
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
