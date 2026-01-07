import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Socket } from 'socket.io-client'
import { formatText, type UiText } from '../i18n'
import { HeadsetIcon, MicIcon } from './icons/VoiceIcons'
import { playSfx } from '../sfx'

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
  const [selectedScreenSourceId, setSelectedScreenSourceId] = useState<string | null>(null)
  const [selectedScreenSourceName, setSelectedScreenSourceName] = useState('')
  const [screenShareAvailable, setScreenShareAvailable] = useState<string[]>([])
  const [focusedShareId, setFocusedShareId] = useState<string | null>(null)
  const [hideFocusedCursor, setHideFocusedCursor] = useState(false)
  const [showScreenShareSettings, setShowScreenShareSettings] = useState(false)
  const [screenShareAudioMuted, setScreenShareAudioMuted] = useState(false)
  const [screenShareResolution, setScreenShareResolution] = useState<'720p' | '1080p' | '1440p'>('1080p')
  const [screenShareFrameRate, setScreenShareFrameRate] = useState<15 | 30 | 60>(30)
  const [screenShareSubmenu, setScreenShareSubmenu] = useState<'resolution' | 'frameRate' | null>(null)
  const prevJoinedRef = useRef(false)
  const forcedHeadsetRef = useRef(false)
  const micBeforeForceRef = useRef(false)
  const headsetBeforeForceRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const rawStreamRef = useRef<MediaStream | null>(null)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  const screenShareSendersRef = useRef<Map<string, RTCRtpSender>>(new Map())
  const screenShareViewersRef = useRef<Set<string>>(new Set())
  const localShareIdRef = useRef<string | null>(null)
  const hideCursorTimerRef = useRef<number | null>(null)
  const screenShareSettingsRef = useRef<HTMLDivElement | null>(null)
  const prevMemberIdsRef = useRef<Set<string>>(new Set())
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
    if (screenShareViewersRef.current.has(peerId)) {
      screenShareViewersRef.current.delete(peerId)
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
    setScreenShareAvailable([])
    setFocusedShareId(null)
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
    stream.addEventListener('inactive', stopScreenShare)
    const track = stream.getVideoTracks()[0]
    if (track) {
      track.onended = () => {
        stopScreenShare()
      }
      track.onmute = () => {
        pauseScreenShareSenders()
      }
      track.onunmute = () => {
        resumeScreenShareSenders()
      }
    }
    const localShareId = socket?.id || 'local'
    localShareIdRef.current = localShareId
    setScreenShares((prev) => {
      const next = prev.filter((share) => share.id !== localShareId)
      return [...next, { id: localShareId, stream, label: t.voice.screenShareYou, isLocal: true }]
    })
    setScreenShareAvailable((prev) => (prev.includes(localShareId) ? prev : [...prev, localShareId]))
    screenShareViewersRef.current.forEach((peerId) => {
      void addScreenShareToPeer(peerId)
    })
    if (socket) {
      socket.emit('screen:announce', { channelId, active: true })
    }
    window.dispatchEvent(new CustomEvent('voice-screen-share-state', { detail: true }))
  }

  const requestScreenShareSources = async () => {
    const electronAPI = (window as any)?.electronAPI
    if (!electronAPI?.getDesktopSources) return false
    try {
      const sources = await electronAPI.getDesktopSources()
      if (!Array.isArray(sources) || sources.length === 0) {
        return false
      }
      setSelectedScreenSourceId(null)
      setSelectedScreenSourceName('')
      setScreenShareSources(sources)
      setShowScreenSharePicker(true)
      return true
    } catch (error) {
      console.error('[voice] failed to get desktop sources', error)
      return false
    }
  }

  const startElectronScreenShare = async (sourceId: string) => {
    setShowScreenSharePicker(false)
    setScreenShareSources([])
    try {
      const resolution =
        screenShareResolution === '720p'
          ? { width: 1280, height: 720 }
          : screenShareResolution === '1440p'
            ? { width: 2560, height: 1440 }
            : { width: 1920, height: 1080 }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: screenShareAudioMuted
          ? false
          : ({
              mandatory: {
                chromeMediaSource: 'desktop',
              },
            } as any),
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: resolution.width,
            maxHeight: resolution.height,
            maxFrameRate: screenShareFrameRate,
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

  const addScreenShareToPeer = async (peerId: string) => {
    const stream = screenShareStreamRef.current
    if (!stream) return
    const peer = peersRef.current.get(peerId)
    if (!peer) return
    if (screenShareSendersRef.current.has(peerId)) return
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return
    const sender = peer.addTrack(videoTrack, stream)
    screenShareSendersRef.current.set(peerId, sender)
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack && !screenShareAudioMuted) {
      peer.addTrack(audioTrack, stream)
    }
    await renegotiatePeer(peerId)
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
      const resolution =
        screenShareResolution === '720p'
          ? { width: 1280, height: 720 }
          : screenShareResolution === '1440p'
            ? { width: 2560, height: 1440 }
            : { width: 1920, height: 1080 }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: resolution.width },
          height: { ideal: resolution.height },
          frameRate: { ideal: screenShareFrameRate, max: screenShareFrameRate },
        },
        audio: !screenShareAudioMuted,
      })
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
    const localShareId = localShareIdRef.current
    localShareIdRef.current = null
    screenShareViewersRef.current.clear()
    peersRef.current.forEach((peer, peerId) => {
      const sender = screenShareSendersRef.current.get(peerId)
      if (!sender) return
      peer.removeTrack(sender)
      screenShareSendersRef.current.delete(peerId)
      void renegotiatePeer(peerId)
    })
    if (localShareId) {
      setScreenShares((prev) => prev.filter((share) => share.id !== localShareId))
      setScreenShareAvailable((prev) => prev.filter((id) => id !== localShareId))
      setFocusedShareId((prev) => (prev === localShareId ? null : prev))
    }
    if (socket) {
      socket.emit('screen:announce', { channelId, active: false })
    }
    window.dispatchEvent(new CustomEvent('voice-screen-share-state', { detail: false }))
  }

  const pauseScreenShareSenders = () => {
    peersRef.current.forEach((peer, peerId) => {
      const sender = screenShareSendersRef.current.get(peerId)
      if (!sender) return
      peer.removeTrack(sender)
      screenShareSendersRef.current.delete(peerId)
      void renegotiatePeer(peerId)
    })
  }

  const resumeScreenShareSenders = () => {
    screenShareViewersRef.current.forEach((peerId) => {
      void addScreenShareToPeer(peerId)
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

    const handleScreenAnnounce = (payload: { channelId: string; peerId: string; active: boolean }) => {
      if (payload.channelId !== channelId) return
      if (payload.active) {
        setScreenShareAvailable((prev) => (prev.includes(payload.peerId) ? prev : [...prev, payload.peerId]))
        return
      }
      setScreenShareAvailable((prev) => prev.filter((id) => id !== payload.peerId))
      setScreenShares((prev) => prev.filter((share) => share.id !== payload.peerId))
      screenShareViewersRef.current.delete(payload.peerId)
      setFocusedShareId((prev) => (prev === payload.peerId ? null : prev))
    }

    const handleScreenRequest = (payload: { channelId: string; fromId: string }) => {
      if (payload.channelId !== channelId) return
      if (!screenShareStreamRef.current) return
      screenShareViewersRef.current.add(payload.fromId)
      void addScreenShareToPeer(payload.fromId)
    }

    socket.on('voice:members', handleMembers)
    socket.on('voice:offer', handleOffer)
    socket.on('voice:answer', handleAnswer)
    socket.on('voice:ice', handleIce)
    socket.on('voice:leave', handleLeave)
    socket.on('voice:force-leave', handleForceLeave)
    socket.on('screen:announce', handleScreenAnnounce)
    socket.on('screen:request', handleScreenRequest)

    return () => {
      socket.off('voice:members', handleMembers)
      socket.off('voice:offer', handleOffer)
      socket.off('voice:answer', handleAnswer)
      socket.off('voice:ice', handleIce)
      socket.off('voice:leave', handleLeave)
      socket.off('voice:force-leave', handleForceLeave)
      socket.off('screen:announce', handleScreenAnnounce)
      socket.off('screen:request', handleScreenRequest)
    }
  }, [channelId, joined, socket, user])

  useEffect(() => {
    if (!showScreenShareSettings) return
    const handleClick = (event: MouseEvent) => {
      if (screenShareSettingsRef.current?.contains(event.target as Node)) return
      setShowScreenShareSettings(false)
      setScreenShareSubmenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showScreenShareSettings])

  useEffect(() => {
    const stream = screenShareStreamRef.current
    if (!stream) return
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !screenShareAudioMuted
    })
  }, [screenShareAudioMuted])

  useEffect(() => {
    onJoinStateChange?.(channelId, joined)
  }, [channelId, joined, onJoinStateChange])

  useEffect(() => {
    if (!socket || !joined) return
    socket.emit('screen:list', { channelId }, (payload: { channelId: string; peers: string[] } | null) => {
      if (!payload || payload.channelId !== channelId) return
      setScreenShareAvailable(payload.peers || [])
    })
  }, [channelId, joined, socket])

  useEffect(() => {
    if (!joined) {
      onSpeakingChange?.(channelId, [])
      return
    }
    onSpeakingChange?.(channelId, speakingIds)
  }, [channelId, joined, onSpeakingChange, speakingIds])

  useEffect(() => {
    if (!joined) {
      prevMemberIdsRef.current = new Set()
      return
    }
    const currentIds = new Set(members.map((member) => member.id))
    const previousIds = prevMemberIdsRef.current
    const selfId = socket?.id
    let hasOtherJoin = false
    let hasOtherLeave = false
    currentIds.forEach((id) => {
      if (!previousIds.has(id) && id !== selfId) {
        hasOtherJoin = true
      }
    })
    previousIds.forEach((id) => {
      if (!currentIds.has(id) && id !== selfId) {
        hasOtherLeave = true
      }
    })
    if (hasOtherJoin) {
      playSfx('voiceJoinOther')
    }
    if (hasOtherLeave) {
      playSfx('voiceLeaveOther')
    }
    prevMemberIdsRef.current = currentIds
  }, [joined, members, socket?.id])

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
    if (!prevJoinedRef.current && joined) {
      playSfx('voiceJoin')
    }
    if (prevJoinedRef.current && !joined) {
      playSfx('voiceLeave')
    }
    prevJoinedRef.current = joined
  }, [joined])

  useEffect(() => {
    if (hideCursorTimerRef.current) {
      window.clearTimeout(hideCursorTimerRef.current)
      hideCursorTimerRef.current = null
    }
    setHideFocusedCursor(false)
  }, [focusedShareId])

  const focusedShare = focusedShareId ? screenShares.find((share) => share.id === focusedShareId) : null
  const availableShareIds = screenShareAvailable.filter((id) => id && id !== socket?.id)
  const availableShareCards = availableShareIds.map((peerId) => {
    const member = members.find((item) => item.id === peerId)
    const streamShare = screenShares.find((share) => share.id === peerId)
    return { peerId, member, streamShare }
  })
  const extraScreenShares = screenShares.filter((share) => !availableShareIds.includes(share.id))

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
    <div className={`flex-1 min-h-0 flex flex-col gap-4${focusedShareId ? '' : ' p-6'}`}>
      {showScreenSharePicker
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-50 modal-overlay"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                onClick={() => {
                  setShowScreenSharePicker(false)
                  setScreenShareSources([])
                  setSelectedScreenSourceId(null)
                  setSelectedScreenSourceName('')
                }}
              />
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onMouseDown={() => {
                  setShowScreenSharePicker(false)
                  setScreenShareSources([])
                  setSelectedScreenSourceId(null)
                  setSelectedScreenSourceName('')
                }}
              >
                <div
                  className="w-full max-w-3xl rounded-2xl p-6 modal-panel"
                  style={{ background: 'var(--header-bg)', border: '1px solid var(--border)', position: 'relative' }}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {t.voice.screenShareSelectTitle}
                      </div>
                      <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {t.voice.screenShareSelectHint}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="screen-share-close grid place-items-center"
                      aria-label={t.voice.screenShareSelectCancel}
                      onClick={() => {
                        setShowScreenSharePicker(false)
                        setScreenShareSources([])
                        setSelectedScreenSourceId(null)
                        setSelectedScreenSourceName('')
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                    {screenShareSources.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className={`screen-share-source${selectedScreenSourceId === source.id ? ' is-selected' : ''}`}
                        onClick={() => {
                          setSelectedScreenSourceId(source.id)
                          setSelectedScreenSourceName(source.name)
                          void startElectronScreenShare(source.id)
                        }}
                      >
                        <img src={source.thumbnail} alt="" className="screen-share-thumb" />
                        <div className="screen-share-overlay">
                          <span className="screen-share-label">화면 공유</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {source.name}
                          </div>
                          <span className="screen-share-radio" aria-hidden />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                      {selectedScreenSourceName || t.voice.screenShareSelectNone}
                    </div>
                  </div>
                  <div className="screen-share-settings-wrap" ref={screenShareSettingsRef}>
                    <button
                      type="button"
                      className="screen-share-settings-button"
                      aria-label={t.voice.screenShareSettings}
                      onClick={() => setShowScreenShareSettings((prev) => !prev)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M19.14 12.936c.03-.308.046-.62.046-.936s-.016-.628-.046-.936l2.036-1.58a.5.5 0 0 0 .12-.64l-1.928-3.34a.5.5 0 0 0-.6-.22l-2.4.96a7.94 7.94 0 0 0-1.62-.936l-.36-2.54a.5.5 0 0 0-.5-.42h-3.856a.5.5 0 0 0-.5.42l-.36 2.54a7.94 7.94 0 0 0-1.62.936l-2.4-.96a.5.5 0 0 0-.6.22l-1.928 3.34a.5.5 0 0 0 .12.64l2.036 1.58c-.03.308-.046.62-.046.936s.016.628.046.936l-2.036 1.58a.5.5 0 0 0-.12.64l1.928 3.34a.5.5 0 0 0 .6.22l2.4-.96c.5.39 1.04.712 1.62.936l.36 2.54a.5.5 0 0 0 .5.42h3.856a.5.5 0 0 0 .5-.42l.36-2.54c.58-.224 1.12-.546 1.62-.936l2.4.96a.5.5 0 0 0 .6-.22l1.928-3.34a.5.5 0 0 0-.12-.64l-2.036-1.58ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />
                      </svg>
                    </button>
                    {showScreenShareSettings ? (
                      <div
                        className="screen-share-settings-menu"
                        onMouseLeave={() => setScreenShareSubmenu(null)}
                      >
                        <div
                          className="screen-share-settings-row"
                          onMouseEnter={() => setScreenShareSubmenu('resolution')}
                        >
                          <div className="screen-share-settings-item">
                            <span>{t.voice.screenShareResolution}</span>
                            <span className="screen-share-settings-current">{screenShareResolution}</span>
                            <span className="screen-share-settings-arrow">›</span>
                          </div>
                        {screenShareSubmenu === 'resolution' ? (
                          <div className="screen-share-submenu-wrap">
                            <div className="screen-share-submenu">
                              {(['720p', '1080p', '1440p'] as const).map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`screen-share-submenu-item${
                                    screenShareResolution === value ? ' is-active' : ''
                                  }`}
                                  onClick={() => {
                                    setScreenShareResolution(value)
                                    setScreenShareSubmenu(null)
                                  }}
                                >
                                  {value}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        </div>
                        <div
                          className="screen-share-settings-row"
                          onMouseEnter={() => setScreenShareSubmenu('frameRate')}
                        >
                          <div className="screen-share-settings-item">
                            <span>{t.voice.screenShareFrameRate}</span>
                            <span className="screen-share-settings-current">{screenShareFrameRate}fps</span>
                            <span className="screen-share-settings-arrow">›</span>
                          </div>
                        {screenShareSubmenu === 'frameRate' ? (
                          <div className="screen-share-submenu-wrap">
                            <div className="screen-share-submenu">
                              {[15, 30, 60].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`screen-share-submenu-item${
                                    screenShareFrameRate === value ? ' is-active' : ''
                                  }`}
                                  onClick={() => {
                                    setScreenShareFrameRate(value as 15 | 30 | 60)
                                    setScreenShareSubmenu(null)
                                  }}
                                >
                                  {value}fps
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        </div>
                        <div className="screen-share-settings-divider" />
                        <label
                          className="screen-share-settings-toggle"
                          onMouseEnter={() => setScreenShareSubmenu(null)}
                        >
                          <span>{t.voice.screenShareMuteAudio}</span>
                          <input
                            type="checkbox"
                            checked={screenShareAudioMuted}
                            onChange={(event) => setScreenShareAudioMuted(event.target.checked)}
                          />
                          <span className="screen-share-settings-check" />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
      {focusedShareId ? null : (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{t.voice.title}</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {formatText(t.voice.membersCount, { count: members.length })}
            </div>
          </div>
        </div>
      )}
      {focusedShareId ? (
        <div
          className={`flex-1 w-full focused-share-stage${hideFocusedCursor ? ' focused-share-hidden' : ''}`}
          onMouseMove={() => {
            if (hideCursorTimerRef.current) {
              window.clearTimeout(hideCursorTimerRef.current)
            }
            if (hideFocusedCursor) setHideFocusedCursor(false)
            hideCursorTimerRef.current = window.setTimeout(() => {
              setHideFocusedCursor(true)
              hideCursorTimerRef.current = null
            }, 1600)
          }}
          onMouseLeave={() => {
            if (hideCursorTimerRef.current) {
              window.clearTimeout(hideCursorTimerRef.current)
              hideCursorTimerRef.current = null
            }
            setHideFocusedCursor(false)
          }}
        >
          {focusedShare ? (
            <div className="w-full h-full" onClick={() => setFocusedShareId(null)}>
              <FocusedShareVideo stream={focusedShare.stream} muted={focusedShare.isLocal} />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              방송을 불러오는 중이에요.
            </div>
          )}
        </div>
      ) : (
        <>
          {availableShareCards.length > 0 || extraScreenShares.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {availableShareCards.map(({ peerId, member, streamShare }) =>
                streamShare ? (
                  <ScreenShareCard
                    key={peerId}
                    stream={streamShare.stream}
                    label={streamShare.label}
                    isLocal={streamShare.isLocal}
                    onClick={() => setFocusedShareId(peerId)}
                  />
                ) : (
                  <div
                    key={peerId}
                    className="rounded-2xl border px-4 py-6 flex flex-col items-center justify-center gap-3"
                    style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                  >
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {member ? getMemberLabel(member) : '화면 공유'}
                    </div>
                    <button
                      type="button"
                      className="h-10 px-4 rounded-lg font-semibold hover-surface"
                      style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        if (!socket) return
                        socket.emit('screen:request', { channelId, targetId: peerId })
                        setFocusedShareId(peerId)
                      }}
                    >
                      방송 보기
                    </button>
                  </div>
                )
              )}
              {extraScreenShares.map((share) => (
                <ScreenShareCard
                  key={share.id}
                  stream={share.stream}
                  label={share.label}
                  isLocal={share.isLocal}
                  onClick={() => setFocusedShareId(share.id)}
                />
              ))}
            </div>
          ) : null}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 272px))', justifyContent: 'start' }}
          >
            {(members.length > 1 ? sortMembersByName(members) : members).map((member) => {
              const isSpeaking = speakingIds.includes(member.id) && !member.muted && !member.deafened
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between gap-3 rounded-md px-2 py-2${isSpeaking ? ' voice-speaking-card' : ''}`}
                  style={{
                    background: 'var(--panel)',
                    maxWidth: 272,
                    width: '100%',
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
                    const ev = new CustomEvent('open-user-profile', {
                      detail: { user: member, x: rect.right + 8, y: rect.top },
                    })
                    window.dispatchEvent(ev)
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
        </>
      )}
    </div>
  )
}

function ScreenShareCard({
  stream,
  isLocal,
  onClick,
  className = '',
}: {
  stream: MediaStream
  label: string
  isLocal?: boolean
  onClick?: () => void
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [aspectRatio, setAspectRatio] = useState(16 / 9)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    const updateAspect = () => {
      if (!video.videoWidth || !video.videoHeight) return
      setAspectRatio(video.videoWidth / video.videoHeight)
    }
    updateAspect()
    video.addEventListener('loadedmetadata', updateAspect)
    video.addEventListener('resize', updateAspect)
    return () => {
      video.removeEventListener('loadedmetadata', updateAspect)
      video.removeEventListener('resize', updateAspect)
    }
  }, [stream])

  return (
    <div
      className={`rounded-2xl overflow-hidden w-full${onClick ? ' cursor-pointer' : ''} ${className}`.trim()}
      style={{ background: 'var(--panel)', border: '1px solid var(--border)', aspectRatio }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover" />
    </div>
  )
}

function FocusedShareVideo({ stream, muted }: { stream: MediaStream; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
  }, [stream])

  return <video ref={videoRef} autoPlay playsInline muted={muted} className="focused-share-video" />
}
