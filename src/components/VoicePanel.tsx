import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'

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
  onRequireLogin?: () => void
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export default function VoicePanel({ channelId, socket, user, forceHeadsetMuted = false, onRequireLogin }: VoicePanelProps) {
  const [joined, setJoined] = useState(false)
  const [members, setMembers] = useState<VoiceMember[]>([])
  const [speakingIds, setSpeakingIds] = useState<string[]>([])
  const [micMuted, setMicMuted] = useState(false)
  const [headsetMuted, setHeadsetMuted] = useState(false)
  const [micSensitivity, setMicSensitivity] = useState(-60)
  const micBeforeDeafenRef = useRef(false)
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
      socket.emit('voice:join', { channelId })
    } catch (error) {
      console.error('[voice] failed to get user media', error)
    }
  }

  // ... (rest of file unchanged)
}
