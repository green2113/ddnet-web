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
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  const cleanupPeer = (peerId: string) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.close()
      peersRef.current.delete(peerId)
    }
    const audio = document.getElementById(`voice-audio-${peerId}`) as HTMLAudioElement | null
    if (audio) {
      audio.srcObject = null
      audio.remove()
    }
  }

  const leaveVoice = () => {
    if (socket && joined) {
      socket.emit('voice:leave', { channelId })
    }
    peersRef.current.forEach((_, peerId) => cleanupPeer(peerId))
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
      }
    }

    if (initiate) {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      socket.emit('voice:offer', { channelId, targetId: peerId, sdp: offer })
    }
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-md px-3 py-2" style={{ background: 'var(--panel)' }}>
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
          </div>
        ))}
      </div>
    </div>
  )
}
