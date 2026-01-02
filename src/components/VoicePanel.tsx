import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

type ScreenShareTile = {
  id: string
  stream: MediaStream
  label: string
  isLocal?: boolean
}

type DesktopSource = {
  id: string
  name: string
  thumbnail: string
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
  const [inputDeviceId, setInputDeviceId] = useState(() => {
    if (typeof window === 'undefined') return 'default'
    return window.localStorage.getItem('voice-input-device') || 'default'
  })
  const [outputDeviceId, setOutputDeviceId] = useState(() => {
    if (typeof window === 'undefined') return 'default'
    return window.localStorage.getItem('voice-output-device') || 'default'
  })
  const [screenShares, setScreenShares] = useState<ScreenShareTile[]>([])
  const [screenShareSources, setScreenShareSources] = useState<DesktopSource[]>([])
  const [showScreenSharePicker, setShowScreenSharePicker] = useState(false)
  const forcedHeadsetRef = useRef(false)
  const micBeforeForceRef = useRef(false)
  const headsetBeforeForceRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const rawStreamRef = useRef<MediaStream | null>(null)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  const screenShareSendersRef = useRef<Map<string, RTCRtpSender>>(new Map())
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
    if (screenShareSendersRef.current.has(peerId)) {
      screenShareSendersRef.current.delete(peerId)
    }
    setScreenShares((prev) => prev.filter((share) => share.id !== peerId))
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
    if (screenShareStreamRef.current) {
      stopScreenShare()
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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (!detail) return
      setInputDeviceId(detail)
    }
    window.addEventListener('voice-input-device', handler as EventListener)
    return () => window.removeEventListener('voice-input-device', handler as EventListener)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (!detail) return
      setOutputDeviceId(detail)
    }
    window.addEventListener('voice-output-device', handler as EventListener)
    return () => window.removeEventListener('voice-output-device', handler as EventListener)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (!joined) return
      if (screenShareStreamRef.current) {
        stopScreenShare()
      } else {
        void startScreenShare()
      }
    }
    window.addEventListener('voice-screen-share-toggle', handler as EventListener)
    return () => window.removeEventListener('voice-screen-share-toggle', handler as EventListener)
  }, [joined])

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
    const screenTrack = screenShareStreamRef.current?.getVideoTracks()[0]
    if (screenTrack && screenShareStreamRef.current) {
      const sender = peer.addTrack(screenTrack, screenShareStreamRef.current)
      screenShareSendersRef.current.set(peerId, sender)
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:ice', { channelId, targetId: peerId, candidate: event.candidate })
      }
    }

    peer.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) {
        if (event.track.kind === 'video') {
          setScreenShares((prev) => {
            const next = prev.filter((share) => share.id !== peerId)
            return [...next, { id: peerId, stream, label: getMemberLabel(members.find((m) => m.id === peerId) || { id: peerId, username: peerId }) }]
          })
        } else {
          const audioId = `voice-audio-${peerId}`
          let audio = document.getElementById(audioId) as HTMLAudioElement | null
          if (!audio) {
            audio = document.createElement('audio')
            audio.id = audioId
            audio.autoplay = true
            audio.setAttribute('playsinline', 'true')
            document.body.appendChild(audio)
          }
          applyOutputDevice(audio, outputDeviceId)
          audio.srcObject = stream
          startSpeakingMonitor(peerId, stream)
        }
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

  const applyOutputDevice = (audio: HTMLAudioElement, deviceId: string) => {
    if (!deviceId || deviceId === 'default') return
    const setSinkId = (audio as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId
    if (typeof setSinkId !== 'function') return
    setSinkId.call(audio, deviceId).catch(() => {})
  }

  const attachScreenShareStream = (stream: MediaStream) => {
    screenShareStreamRef.current = stream
    const track = stream.getVideoTracks()[0]
    if (track) {
      track.onended = () => {
        stopScreenShare()
      }
    }
    setScreenShares((prev) => {
      const next = prev.filter((share) => share.id !== 'local')
      return [...next, { id: 'local', stream, label: t.voice.screenShareYou, isLocal: true }]
    })
    peersRef.current.forEach((peer, peerId) => {
      if (!track) return
      const sender = peer.addTrack(track, stream)
      screenShareSendersRef.current.set(peerId, sender)
      void renegotiatePeer(peerId)
    })
    window.dispatchEvent(new CustomEvent('voice-screen-share-state', { detail: true }))
  }

  const requestScreenShareSources = async () => {
    const electronAPI = (window as any)?.electronAPI
    if (!electronAPI?.getDesktopSources) return false
    try {
      const sources = await electronAPI.getDesktopSources()
      if (!Array.isArray(sources) || sources.length === 0) {
        window.dispatchEvent(new CustomEvent('voice-screen-share-error', { detail: 'failed' }))
        return true
      }
      setScreenShareSources(sources)
      setShowScreenSharePicker(true)
      return true
    } catch (error) {
      console.error('[voice] failed to get desktop sources', error)
      window.dispatchEvent(new CustomEvent('voice-screen-share-error', { detail: 'failed' }))
      return true
    }
  }

  const startElectronScreenShare = async (sourceId: string) => {
    setShowScreenSharePicker(false)
    setScreenShareSources([])
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      } as any)
      attachScreenShareStream(stream)
    } catch (error) {
      console.error('[voice] failed to start electron screen share', error)
      window.dispatchEvent(new CustomEvent('voice-screen-share-error', { detail: 'failed' }))
    }
  }

  const resolveInputConstraints = () => {
    if (!inputDeviceId || inputDeviceId === 'default') return {}
    return { deviceId: { exact: inputDeviceId } }
  }

  const renegotiatePeer = async (peerId: string) => {
    if (!socket) return
    const peer = peersRef.current.get(peerId)
    if (!peer) return
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    socket.emit('voice:offer', { channelId, targetId: peerId, sdp: offer })
  }

  const startScreenShare = async () => {
    if (!joined) return
    if (screenShareStreamRef.current) return
    if (await requestScreenShareSources()) return
    if (!navigator.mediaDevices?.getDisplayMedia) {
      window.dispatchEvent(new CustomEvent('voice-screen-share-error', { detail: 'unsupported' }))
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      attachScreenShareStream(stream)
    } catch (error) {
      window.dispatchEvent(new CustomEvent('voice-screen-share-error', { detail: 'failed' }))
      console.error('[voice] failed to start screen share', error)
    }
  }

  const stopScreenShare = () => {
    const stream = screenShareStreamRef.current
    if (!stream) return
    stream.getTracks().forEach((track) => track.stop())
    screenShareStreamRef.current = null
    peersRef.current.forEach((peer, peerId) => {
      const sender = screenShareSendersRef.current.get(peerId)
      if (!sender) return
      peer.removeTrack(sender)
      screenShareSendersRef.current.delete(peerId)
      void renegotiatePeer(peerId)
    })
    setScreenShares((prev) => prev.filter((share) => share.id !== 'local'))
    window.dispatchEvent(new CustomEvent('voice-screen-share-state', { detail: false }))
  }

  const joinVoice = async () => {
    if (!socket) return
    if (!user) {
      onRequireLogin?.()
      return
    }
    if (joined) return
    try {
      const audioConstraints = {
        noiseSuppression: noiseSuppressionMode === 'webrtc',
        ...resolveInputConstraints(),
      }
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
      } catch (error) {
        if (inputDeviceId && inputDeviceId !== 'default') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { noiseSuppression: noiseSuppressionMode === 'webrtc' } })
        } else {
          throw error
        }
      }
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
    document.querySelectorAll<HTMLAudioElement>('audio[id^="voice-audio-"]').forEach((audio) => {
      applyOutputDevice(audio, outputDeviceId)
    })
  }, [outputDeviceId])

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
      {showScreenSharePicker
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-50 modal-overlay"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                onClick={() => {
                  setShowScreenSharePicker(false)
                  setScreenShareSources([])
                }}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="w-full max-w-3xl rounded-2xl p-6 modal-panel"
                  style={{ background: 'var(--header-bg)', border: '1px solid var(--border)' }}
                >
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {t.voice.screenShareSelectTitle}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {t.voice.screenShareSelectHint}
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                    {screenShareSources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className="screen-share-source"
                        onClick={() => startElectronScreenShare(source.id)}
                      >
                        <img src={source.thumbnail} alt="" />
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {source.name}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="w-full h-11 rounded-lg font-semibold hover-surface"
                      style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        setShowScreenSharePicker(false)
                        setScreenShareSources([])
                      }}
                    >
                      {t.voice.screenShareSelectCancel}
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{t.voice.title}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {formatText(t.voice.membersCount, { count: members.length })}
          </div>
        </div>
      </div>
      {screenShares.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {screenShares.map((share) => (
            <ScreenShareCard key={share.id} stream={share.stream} label={share.label} isLocal={share.isLocal} />
          ))}
        </div>
      ) : null}
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

function ScreenShareCard({ stream, label, isLocal }: { stream: MediaStream; label: string; isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.srcObject = stream
  }, [stream])

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
      <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="bg-black/60">
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-[220px] object-contain" />
      </div>
    </div>
  )
}
