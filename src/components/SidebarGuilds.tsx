import { useRef, useState } from 'react'
import Tooltip from './Tooltip'

type Server = {
  id: string
  name: string
}

type Props = {
  accent?: string
  servers?: Server[]
  activeId?: string
  onSelect?: (serverId: string) => void
  onCreate?: () => void
  onReorder?: (orderedIds: string[]) => void
  t: {
    sidebarGuilds: {
      add: string
    }
  }
}

export default function SidebarGuilds({
  accent = 'var(--accent)',
  servers = [],
  activeId,
  onSelect,
  onCreate,
  onReorder,
  t,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverPos, setDragOverPos] = useState<'above' | 'below' | null>(null)
  const dragIdRef = useRef<string | null>(null)

  const computeReorder = (draggedId: string, targetId: string, position: 'above' | 'below') => {
    if (!draggedId || !targetId || draggedId === targetId) return null
    const ids = servers.map((server) => server.id)
    const fromIndex = ids.indexOf(draggedId)
    const toIndex = ids.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return null
    ids.splice(fromIndex, 1)
    let adjustedToIndex = toIndex
    if (fromIndex < toIndex) adjustedToIndex = toIndex - 1
    const insertIndex = position === 'above' ? adjustedToIndex : adjustedToIndex + 1
    ids.splice(insertIndex, 0, draggedId)
    const isSameOrder = servers.every((server, index) => server.id === ids[index])
    if (isSameOrder) return null
    return ids
  }

  return (
    <aside
      className="w-[78px] hidden md:flex flex-col items-center py-3 gap-3 h-full"
      style={{ background: 'var(--rail-bg)' }}
    >
      <div className="relative w-full flex items-center justify-center">
        <span
          className="absolute left-0 h-10 w-[6px] rounded-full bg-white transition-opacity"
          style={{ opacity: activeId === '@me' ? 1 : 0, clipPath: 'inset(0 0 0 50%)' }}
        />
        <button
          type="button"
          onClick={() => onSelect?.('@me')}
          className="w-11 h-11 rounded-xl grid place-items-center text-white text-[17px] select-none cursor-pointer transition-all"
          style={{
            background: activeId === '@me' ? accent : 'var(--input-bg)',
            boxShadow: activeId === '@me' ? '0 10px 18px rgba(0,0,0,0.25)' : 'none',
          }}
          aria-label="홈"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-3v6H5a1 1 0 0 1-1-1v-8.5z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      <div className="w-8 h-[2px] rounded bg-black/15" />
      <div
        className="w-full flex flex-col items-center gap-3"
        onDragOver={(event) => {
          if (!dragIdRef.current) return
          event.preventDefault()
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move'
          }
        }}
      >
      {servers.map((server) => {
        const isActive = server.id === activeId
        const isHovering = hoveredId === server.id
        const label = server.name?.slice(0, 2).toUpperCase() || 'SV'
        return (
          <div key={server.id} className="relative w-full flex items-center justify-center">
            <span
              className="absolute left-0 h-10 w-[6px] rounded-full bg-white transition-opacity"
              style={{ opacity: isActive ? 1 : 0, clipPath: 'inset(0 0 0 50%)' }}
            />
            {dragOverId === server.id && dragOverPos ? (
              <div
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  top: dragOverPos === 'above' ? -6 : 'auto',
                  bottom: dragOverPos === 'below' ? -6 : 'auto',
                  height: 3,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px color-mix(in oklch, var(--accent) 60%, transparent)',
                }}
              />
            ) : null}
            <Tooltip label={server.name} side="right">
              <button
                type="button"
                onClick={() => onSelect?.(server.id)}
                onMouseEnter={() => setHoveredId(server.id)}
                onMouseLeave={() => setHoveredId(null)}
                draggable
                onDragStart={(event) => {
                  dragIdRef.current = server.id
                  setDragOverId(null)
                  setDragOverPos(null)
                  if (event.dataTransfer) {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', server.id)
                  }
                }}
                onDragEnd={() => {
                  dragIdRef.current = null
                  setDragOverId(null)
                  setDragOverPos(null)
                }}
                onDragOver={(event) => {
                  if (!dragIdRef.current || dragIdRef.current === server.id) return
                  event.preventDefault()
                  if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'move'
                  }
                  const ids = servers.map((item) => item.id)
                  const fromIndex = ids.indexOf(dragIdRef.current)
                  const toIndex = ids.indexOf(server.id)
                  const position = fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex ? 'below' : 'above'
                  const nextOrder = computeReorder(dragIdRef.current, server.id, position)
                  setDragOverId(nextOrder ? server.id : null)
                  setDragOverPos(nextOrder ? position : null)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const draggedId = dragIdRef.current || event.dataTransfer?.getData('text/plain')
                  dragIdRef.current = null
                  setDragOverId(null)
                  setDragOverPos(null)
                  if (!draggedId || draggedId === server.id) return
                  const ids = servers.map((item) => item.id)
                  const fromIndex = ids.indexOf(draggedId)
                  const toIndex = ids.indexOf(server.id)
                  const position = fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex ? 'below' : 'above'
                  const nextOrder = computeReorder(draggedId, server.id, position)
                  if (!nextOrder) return
                  onReorder?.(nextOrder)
                }}
                onDragLeave={() => {
                  setDragOverId((prev) => (prev === server.id ? null : prev))
                  setDragOverPos((prev) => (dragOverId === server.id ? null : prev))
                }}
                className="w-11 h-11 rounded-2xl grid place-items-center text-white text-sm font-bold select-none cursor-pointer transition-all"
                style={{
                  background: isActive || isHovering ? accent : 'var(--input-bg)',
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                }}
                aria-label={server.name}
              >
                {label}
              </button>
            </Tooltip>
          </div>
        )
      })}
      </div>
      <div className="w-11 h-[2px] rounded bg-black/10" />
      <button
        className="w-11 h-11 rounded-2xl grid place-items-center text-[20px] text-white cursor-pointer"
        style={{ background: 'var(--input-bg)' }}
        aria-label={t.sidebarGuilds.add}
        onClick={onCreate}
      >
        +
      </button>
    </aside>
  )
}
