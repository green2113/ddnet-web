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
  onRequireLogin?: () => void
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export default function VoicePanel({ channelId, socket, user, onRequireLogin }: VoicePanelProps) {
  const [joined, setJoined] = useState(false)
  const [members, setMembers] = useState<VoiceMember[]>([])
  const [speakingIds, setSpeakingIds] = useState<string[]>([])
  const [micMuted, setMicMuted] = useState(false)
  const [headsetMuted, setHeadsetMuted] = useState(false)
  const micBeforeDeafenRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const speakingRef = useRef<Set<string>>(new Set())
  const analyserRef = useRef<
    Map<
      string,
      {
        ctx: AudioContext
        analyser: AnalyserNode
        data: Uint8Array
        raf: number
      }
    >
  >(new Map())

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

  const startSpeakingMonitor = (peerId: string, stream: MediaStream) => {
    if (analyserRef.current.has(peerId)) return
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (const value of data) sum += value
      const avg = sum / data.length
      const isSpeaking = avg > 22
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
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setJoined(false)
    setMembers([])
  }

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
      localStreamRef.current = stream
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !micMuted && !headsetMuted
      })
      setJoined(true)
      socket.emit('voice:join', { channelId })
    } catch (error) {
      console.error('[voice] failed to get user media', error)
    }
  }

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

    socket.on('voice:members', handleMembers)
    socket.on('voice:offer', handleOffer)
    socket.on('voice:answer', handleAnswer)
    socket.on('voice:ice', handleIce)
    socket.on('voice:leave', handleLeave)

    return () => {
      socket.off('voice:members', handleMembers)
      socket.off('voice:offer', handleOffer)
      socket.off('voice:answer', handleAnswer)
      socket.off('voice:ice', handleIce)
      socket.off('voice:leave', handleLeave)
    }
  }, [channelId, joined, socket, user])

  useEffect(() => {
    if (!socket) return
    if (!user) return
    joinVoice()
    return () => {
      leaveVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, socket, user?.id])

  useEffect(() => {
    if (!joined || !socket?.id) return
    const stream = localStreamRef.current
    if (!stream) return
    startSpeakingMonitor(socket.id, stream)
  }, [joined, socket?.id])

  useEffect(() => {
    if (!joined || !socket) return
    socket.emit('voice:status', { channelId, muted: micMuted, deafened: headsetMuted })
  }, [channelId, headsetMuted, joined, micMuted, socket])

  useEffect(() => {
    updateOutputMute(headsetMuted)
    const trackEnabled = !micMuted && !headsetMuted
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = trackEnabled
    })
  }, [headsetMuted, micMuted])

  return (
    <div className="flex-1 flex flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">음성 채널</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            현재 {members.length}명 참여 중
          </div>
        </div>
        {joined ? (
          <button
            className="px-4 h-9 rounded-md text-white cursor-pointer"
            style={{ background: '#ef4444' }}
            onClick={leaveVoice}
          >
            나가기
          </button>
        ) : (
          <button
            className="px-4 h-9 rounded-md text-white cursor-pointer"
            style={{ background: '#5865f2' }}
            onClick={joinVoice}
          >
            입장하기
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {members.map((member) => {
          const isSpeaking = speakingIds.includes(member.id)
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md px-2 py-2 transition-shadow"
              style={{
                background: 'var(--panel)',
                boxShadow: isSpeaking ? '0 0 0 2px rgba(34,197,94,0.9), 0 0 12px rgba(34,197,94,0.6)' : 'none',
              }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                {member.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{member.displayName || member.username}</div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {member.username}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {member.muted ? (
                  <span title="마이크 꺼짐" style={{ color: '#f87171' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 5a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0V8a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : null}
                {member.deafened ? (
                  <span title="헤드셋 꺼짐" style={{ color: '#f87171' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M4 12v6a2 2 0 0 0 2 2h2v-6H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M20 12v6a2 2 0 0 1-2 2h-2v-6h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {joined ? (
        <div className="flex items-center gap-3 rounded-md px-3 py-2" style={{ background: 'var(--panel)' }}>
          <button
            type="button"
            className="flex items-center gap-2 px-3 h-9 rounded-md cursor-pointer hover-surface"
            style={{ color: micMuted ? '#f87171' : 'var(--text-primary)' }}
            onClick={() => setMicMuted((prev) => !prev)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0V8a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              {micMuted ? <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
            </svg>
            <span className="text-sm">{micMuted ? '마이크 켜기' : '마이크 끄기'}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3 h-9 rounded-md cursor-pointer hover-surface"
            style={{ color: headsetMuted ? '#f87171' : 'var(--text-primary)' }}
            onClick={() => {
              if (headsetMuted) {
                setHeadsetMuted(false)
                setMicMuted(micBeforeDeafenRef.current)
              } else {
                micBeforeDeafenRef.current = micMuted
                setHeadsetMuted(true)
                setMicMuted(true)
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M4 12v6a2 2 0 0 0 2 2h2v-6H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M20 12v6a2 2 0 0 1-2 2h-2v-6h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              {headsetMuted ? <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> : null}
            </svg>
            <span className="text-sm">{headsetMuted ? '헤드셋 켜기' : '헤드셋 끄기'}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
