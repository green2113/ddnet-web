/// <reference types="@cloudflare/workers-types" />

export type PresenceStatus = 'online' | 'offline'
export type PresenceEventType = 'join' | 'switch' | 'leave' | 'heartbeat'

export interface PresenceRecord {
  playerId: string
  sessionId: string
  server: string
  displayName: string
  serverClientId: string
  status: PresenceStatus
  lastSeenMs: number
  updatedAtMs: number
  lastEvent: PresenceEventType
  previousServer?: string
}

export interface Env {
  PRESENCE_KV?: KVNamespace
  PRESENCE_HEARTBEAT_INTERVAL_SEC?: string
  PRESENCE_STALE_AFTER_SEC?: string
  PRESENCE_RECORD_TTL_SEC?: string
  PRESENCE_MAX_LIST?: string
}

export const DEFAULT_HEARTBEAT_INTERVAL_SEC = 30
export const DEFAULT_STALE_AFTER_SEC = 45
export const DEFAULT_RECORD_TTL_SEC = 24 * 60 * 60
export const DEFAULT_MAX_LIST = 2000

const KEY_PREFIX = 'presence:player:'

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      ...(init?.headers || {}),
    },
  })
}

export function badRequest(error: string) {
  return json({ ok: false, error }, { status: 400 })
}

export function kvUnavailable() {
  return json(
    {
      ok: false,
      error: 'presence_kv_not_configured',
      hint: 'Bind PRESENCE_KV in wrangler/pages settings.',
    },
    { status: 500 },
  )
}

export function optionsResponse(allowMethods: string) {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': allowMethods,
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  })
}

export function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  const rounded = Math.floor(parsed)
  return Math.max(min, Math.min(max, rounded))
}

export function nowMs() {
  return Date.now()
}

function keyForSession(playerId: string, sessionId: string) {
  return `${KEY_PREFIX}${playerId}:${sessionId}`
}

export function normalizePlayerId(value: string | undefined) {
  const normalized = (value || '').trim()
  if (!normalized) {
    return ''
  }
  return normalized.slice(0, 128)
}

export function normalizeServer(value: string | undefined) {
  const normalized = (value || '').trim()
  if (!normalized) {
    return ''
  }
  return normalized.slice(0, 256)
}

export function normalizeSessionId(value: string | undefined, fallback: string) {
  const normalized = (value || '').trim()
  if (!normalized) {
    return fallback
  }
  return normalized.slice(0, 128)
}

export async function readRecord(kv: KVNamespace, playerId: string, sessionId: string): Promise<PresenceRecord | null> {
  return kv.get<PresenceRecord>(keyForSession(playerId, sessionId), 'json')
}

export async function writeRecord(kv: KVNamespace, record: PresenceRecord, ttlSec: number) {
  await kv.put(keyForSession(record.playerId, record.sessionId), JSON.stringify(record), {
    expirationTtl: ttlSec,
  })
}

function isOnline(record: PresenceRecord, now: number, staleAfterSec: number) {
  if (record.status !== 'online') {
    return false
  }
  return now - record.lastSeenMs <= staleAfterSec * 1000
}

export async function listOnline(kv: KVNamespace, staleAfterSec: number, maxList: number) {
  const now = nowMs()

  const online: PresenceRecord[] = []
  const byServer: Record<string, number> = {}
  const byServerMembers: Record<string, Array<{ name: string; client_id: number; last_seen: number }>> = {}

  let cursor: string | undefined = undefined
  const targetCount = Math.max(1, maxList)
  do {
    const listResult: KVNamespaceListResult<unknown> = await kv.list({
      prefix: KEY_PREFIX,
      limit: Math.min(1000, targetCount),
      cursor,
    })

    for(const item of listResult.keys) {
      const value = await kv.get<PresenceRecord>(item.name, 'json')
      if (!value) {
        continue
      }
      if (!isOnline(value, now, staleAfterSec)) {
        continue
      }

      online.push(value)
      const server = value.server || 'unknown'
      byServer[server] = (byServer[server] || 0) + 1
      if(!byServerMembers[server]) {
        byServerMembers[server] = []
      }
      const parsedClientId = Number.parseInt(value.serverClientId || '-1', 10)
      byServerMembers[server].push({
        name: value.displayName || 'unknown',
        client_id: Number.isFinite(parsedClientId) ? parsedClientId : -1,
        last_seen: Math.floor(value.lastSeenMs / 1000),
      })

      if(online.length >= targetCount) {
        break
      }
    }

    if(online.length >= targetCount) {
      break
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor
  } while(cursor)

  const servers = Object.keys(byServer)
    .sort((a, b) => a.localeCompare(b))
    .map((server) => ({
      server_address: server,
      players: (byServerMembers[server] || []).sort((a, b) => {
        const byName = a.name.localeCompare(b.name)
        if(byName !== 0) {
          return byName
        }
        return a.client_id - b.client_id
      }),
    }))

  return {
    nowMs: now,
    onlineCount: online.length,
    byServer,
    servers,
  }
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export interface PresenceInputBase {
  playerId: string
  sessionId?: string
  name?: string
  clientId?: string
  timestampMs?: number
}

export interface JoinInput extends PresenceInputBase {
  server: string
}

export interface HeartbeatInput extends PresenceInputBase {
  server?: string
}

export interface LeaveInput extends PresenceInputBase {
  server?: string
}

export interface SwitchInput extends PresenceInputBase {
  server?: string
  toServer: string
}

export function normalizeDisplayName(value: string | undefined) {
  const normalized = (value || '').trim()
  if(!normalized) {
    return 'unknown'
  }
  return normalized.slice(0, 32)
}

export function normalizeServerClientId(value: string | undefined) {
  const normalized = (value || '').trim()
  if(!normalized) {
    return ''
  }
  return normalized.slice(0, 16)
}

export function settings(env: Env) {
  const staleAfterSec = clampInt(env.PRESENCE_STALE_AFTER_SEC, DEFAULT_STALE_AFTER_SEC, 10, 600)
  const heartbeatIntervalSec = clampInt(env.PRESENCE_HEARTBEAT_INTERVAL_SEC, DEFAULT_HEARTBEAT_INTERVAL_SEC, 5, 300)
  const recordTtlSec = clampInt(env.PRESENCE_RECORD_TTL_SEC, DEFAULT_RECORD_TTL_SEC, staleAfterSec + 10, 7 * 24 * 60 * 60)
  const maxList = clampInt(env.PRESENCE_MAX_LIST, DEFAULT_MAX_LIST, 1, 1000)
  return { staleAfterSec, heartbeatIntervalSec, recordTtlSec, maxList }
}
