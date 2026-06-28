/// <reference types="@cloudflare/workers-types" />

import {
  badRequest,
  Env,
  invalidatePresenceListSnapshot,
  json,
  kvUnavailable,
  normalizeDisplayName,
  normalizePlayerId,
  normalizeServer,
  normalizeServerClientId,
  normalizeSessionId,
  nowMs,
  PresenceEventType,
  readRecord,
  settings,
  writeRecord,
} from './_shared'

interface SyncInput {
  event?: PresenceEventType
  playerId?: string
  sessionId?: string
  server?: string
  name?: string
  clientId?: string
  fromServer?: string
  toServer?: string
  timestampMs?: number
}

function timingSafeEqual(left: string, right: string) {
  if(left.length !== right.length) {
    return false
  }
  let diff = 0
  for(let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

async function verifySyncHmac(request: Request, env: Env, rawBody: string) {
  const secret = (env.PRESENCE_UDP_SYNC_SECRET || '').trim()
  if(!secret) {
    return false
  }
  const provided = (request.headers.get('X-UClient-Presence-Sync') || '').trim().toLowerCase()
  if(!provided) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return timingSafeEqual(provided, expected)
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if(request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
  }
  if(!env.PRESENCE_KV) {
    return kvUnavailable()
  }

  const rawBody = await request.text()
  if(!(await verifySyncHmac(request, env, rawBody))) {
    return json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let payload: SyncInput | null = null
  try {
    payload = JSON.parse(rawBody) as SyncInput
  } catch {
    payload = null
  }
  if(!payload) {
    return badRequest('invalid_json')
  }

  const event = (payload.event || '').trim()
  if(event !== 'join' && event !== 'heartbeat' && event !== 'leave' && event !== 'switch') {
    return badRequest('invalid_event')
  }

  const playerId = normalizePlayerId(payload.playerId)
  if(!playerId) {
    return badRequest('player_id_required')
  }

  const cfg = settings(env)
  const eventTimeMs = Number.isFinite(payload.timestampMs) ? Math.floor(payload.timestampMs as number) : nowMs()
  const sessionId = normalizeSessionId(payload.sessionId, 'default')
  const existing = await readRecord(env.PRESENCE_KV, playerId, sessionId)

  if(event === 'join') {
    const server = normalizeServer(payload.server)
    if(!server) {
      return badRequest('server_required')
    }

    const next = {
      playerId,
      sessionId,
      server,
      displayName: normalizeDisplayName(payload.name),
      serverClientId: normalizeServerClientId(payload.clientId),
      status: 'online' as const,
      lastSeenMs: eventTimeMs,
      updatedAtMs: eventTimeMs,
      lastEvent: 'join' as const,
      previousServer: existing?.server,
    }

    await writeRecord(env.PRESENCE_KV, next, cfg.recordTtlSec)
    await invalidatePresenceListSnapshot(env.PRESENCE_KV)

    return json({
      ok: true,
      accepted: {
        event,
        server: next.server,
        name: next.displayName,
        clientId: next.serverClientId,
        previousServer: next.previousServer || null,
        status: next.status,
        lastSeenMs: next.lastSeenMs,
      },
    })
  }

  if(event === 'heartbeat') {
    const next = {
      playerId,
      sessionId,
      server: normalizeServer(payload.server || existing?.server),
      displayName: normalizeDisplayName(payload.name || existing?.displayName),
      serverClientId: normalizeServerClientId(payload.clientId || existing?.serverClientId),
      status: 'online' as const,
      lastSeenMs: eventTimeMs,
      updatedAtMs: eventTimeMs,
      lastEvent: 'heartbeat' as const,
      previousServer: existing?.previousServer,
    }

    const heartbeatWindowMs = cfg.heartbeatIntervalSec * 1000
    const previous = existing || null
    const shouldPersist =
      !previous ||
      previous.status !== next.status ||
      previous.server !== next.server ||
      previous.displayName !== next.displayName ||
      previous.serverClientId !== next.serverClientId ||
      previous.lastEvent !== next.lastEvent ||
      Math.max(0, next.lastSeenMs - previous.lastSeenMs) >= heartbeatWindowMs

    if(shouldPersist) {
      await writeRecord(env.PRESENCE_KV, next, cfg.recordTtlSec)
      await invalidatePresenceListSnapshot(env.PRESENCE_KV)
    }

    return json({
      ok: true,
      accepted: {
        event,
        server: next.server,
        name: next.displayName,
        clientId: next.serverClientId,
        status: next.status,
        lastSeenMs: next.lastSeenMs,
        persisted: shouldPersist,
      },
    })
  }

  if(event === 'leave') {
    const next = {
      playerId,
      sessionId,
      server: normalizeServer(payload.server || existing?.server),
      displayName: normalizeDisplayName(payload.name || existing?.displayName),
      serverClientId: normalizeServerClientId(payload.clientId || existing?.serverClientId),
      status: 'offline' as const,
      lastSeenMs: eventTimeMs,
      updatedAtMs: eventTimeMs,
      lastEvent: 'leave' as const,
      previousServer: existing?.previousServer,
    }

    await writeRecord(env.PRESENCE_KV, next, cfg.recordTtlSec)
    await invalidatePresenceListSnapshot(env.PRESENCE_KV)

    return json({
      ok: true,
      accepted: {
        event,
        server: next.server,
        name: next.displayName,
        clientId: next.serverClientId,
        status: next.status,
        lastSeenMs: next.lastSeenMs,
      },
    })
  }

  const toServer = normalizeServer(payload.toServer || payload.server)
  if(!toServer) {
    return badRequest('to_server_required')
  }
  const previousServer = normalizeServer(payload.fromServer || payload.server || existing?.server)

  const next = {
    playerId,
    sessionId,
    server: toServer,
    displayName: normalizeDisplayName(payload.name || existing?.displayName),
    serverClientId: normalizeServerClientId(payload.clientId || existing?.serverClientId),
    status: 'online' as const,
    lastSeenMs: eventTimeMs,
    updatedAtMs: eventTimeMs,
    lastEvent: 'switch' as const,
    previousServer,
  }

  await writeRecord(env.PRESENCE_KV, next, cfg.recordTtlSec)
  await invalidatePresenceListSnapshot(env.PRESENCE_KV)

  return json({
    ok: true,
    accepted: {
      event,
      server: next.server,
      name: next.displayName,
      clientId: next.serverClientId,
      previousServer: next.previousServer || null,
      status: next.status,
      lastSeenMs: next.lastSeenMs,
    },
  })
}
