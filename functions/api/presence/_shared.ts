/// <reference types="@cloudflare/workers-types" />

export type PresenceStatus = 'online' | 'offline'
export type PresenceEventType = 'join' | 'switch' | 'leave' | 'heartbeat'

export interface PresenceRecord {
  playerId: string
  sessionId: string
  server: string
  displayName: string
  serverClientId: string
  version?: string
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
  PRESENCE_LIST_CACHE_SEC?: string
  PRESENCE_UDP_SYNC_SECRET?: string
}

export const DEFAULT_HEARTBEAT_INTERVAL_SEC = 60
export const DEFAULT_STALE_AFTER_SEC = 180
export const DEFAULT_RECORD_TTL_SEC = 24 * 60 * 60
export const DEFAULT_MAX_LIST = 2000
export const DEFAULT_LIST_CACHE_SEC = 30

const KEY_PREFIX = 'presence:player:'
const SNAPSHOT_KEY = 'presence:list:snapshot'
const KV_GET_BATCH_SIZE = 32

export type PresenceListPlayer = { name: string; client_id: number; last_seen: number; version?: string }
export type PresenceListServerKeyed = Array<Record<string, { players: PresenceListPlayer[] }>>

interface PresenceListSnapshot {
  builtAtMs: number
  serverKeyed: PresenceListServerKeyed
}

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

export function jsonPresenceList(data: PresenceListServerKeyed, listCacheSec: number) {
  const maxAge = Math.max(10, listCacheSec)
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`,
      'access-control-allow-origin': '*',
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

async function readRecordsBatch(kv: KVNamespace, keyNames: string[]) {
  const records: Array<PresenceRecord | null> = []
  for(let i = 0; i < keyNames.length; i += KV_GET_BATCH_SIZE) {
    const chunk = keyNames.slice(i, i + KV_GET_BATCH_SIZE)
    const chunkRecords = await Promise.all(chunk.map((name) => kv.get<PresenceRecord>(name, 'json')))
    records.push(...chunkRecords)
  }
  return records
}

export async function listOnline(kv: KVNamespace, staleAfterSec: number, maxList: number) {
  const now = nowMs()
  const targetCount = Math.max(1, maxList)
  const online: PresenceRecord[] = []
  const byServer: Record<string, number> = {}
  const byServerMembers: Record<string, PresenceListPlayer[]> = {}

  let cursor: string | undefined = undefined
  do {
    const listResult: KVNamespaceListResult<unknown> = await kv.list({
      prefix: KEY_PREFIX,
      limit: Math.min(1000, targetCount),
      cursor,
    })

    const keyNames = listResult.keys.map((item) => item.name)
    const values = await readRecordsBatch(kv, keyNames)
    for(const value of values) {
      if(!value) {
        continue
      }
      if(!isOnline(value, now, staleAfterSec)) {
        continue
      }

      online.push(value)
      const server = value.server || 'unknown'
      byServer[server] = (byServer[server] || 0) + 1
      if(!byServerMembers[server]) {
        byServerMembers[server] = []
      }
      const parsedClientId = Number.parseInt(value.serverClientId || '-1', 10)
      const player: PresenceListPlayer = {
        name: value.displayName || 'unknown',
        client_id: Number.isFinite(parsedClientId) ? parsedClientId : -1,
        last_seen: Math.floor(value.lastSeenMs / 1000),
      }
      if(value.version) {
        player.version = value.version
      }
      byServerMembers[server].push(player)

      if(online.length >= targetCount) {
        break
      }
    }

    if(online.length >= targetCount) {
      break
    }

    cursor = listResult.list_complete ? undefined : listResult.cursor
  } while(cursor)

  return {
    nowMs: now,
    onlineCount: online.length,
    byServer,
    servers: Object.keys(byServerMembers)
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
      })),
  }
}

async function readPresenceListSnapshot(kv: KVNamespace, listCacheSec: number): Promise<PresenceListSnapshot | null> {
  const snapshot = await kv.get<PresenceListSnapshot>(SNAPSHOT_KEY, 'json')
  if(!snapshot || !Number.isFinite(snapshot.builtAtMs) || !Array.isArray(snapshot.serverKeyed)) {
    return null
  }
  if(nowMs() - snapshot.builtAtMs > listCacheSec * 1000) {
    return null
  }
  return snapshot
}

async function writePresenceListSnapshot(kv: KVNamespace, serverKeyed: PresenceListServerKeyed, listCacheSec: number) {
  const snapshot: PresenceListSnapshot = {
    builtAtMs: nowMs(),
    serverKeyed,
  }
  await kv.put(SNAPSHOT_KEY, JSON.stringify(snapshot), {
    expirationTtl: listCacheSec + 60,
  })
}

export async function invalidatePresenceListSnapshot(kv: KVNamespace) {
  await kv.delete(SNAPSHOT_KEY)
}

export async function getCachedPresenceList(
  kv: KVNamespace,
  staleAfterSec: number,
  maxList: number,
  listCacheSec: number,
): Promise<PresenceListServerKeyed> {
  const cached = await readPresenceListSnapshot(kv, listCacheSec)
  if(cached) {
    return cached.serverKeyed
  }

  const online = await listOnline(kv, staleAfterSec, maxList)
  const serverKeyed = online.servers.map((entry) => ({
    [entry.server_address]: {
      players: entry.players,
    },
  }))

  await writePresenceListSnapshot(kv, serverKeyed, listCacheSec)
  return serverKeyed
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
  version?: string
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

export function normalizeVersion(value: string | undefined) {
  const normalized = (value || '').trim()
  if(!normalized) {
    return ''
  }
  return normalized.slice(0, 64)
}

export function settings(env: Env) {
  const staleAfterSec = clampInt(env.PRESENCE_STALE_AFTER_SEC, DEFAULT_STALE_AFTER_SEC, 10, 600)
  const heartbeatIntervalSec = clampInt(env.PRESENCE_HEARTBEAT_INTERVAL_SEC, DEFAULT_HEARTBEAT_INTERVAL_SEC, 5, 300)
  const recordTtlSec = clampInt(env.PRESENCE_RECORD_TTL_SEC, DEFAULT_RECORD_TTL_SEC, staleAfterSec + 10, 7 * 24 * 60 * 60)
  const maxList = clampInt(env.PRESENCE_MAX_LIST, DEFAULT_MAX_LIST, 1, 1000)
  const listCacheSec = clampInt(env.PRESENCE_LIST_CACHE_SEC, DEFAULT_LIST_CACHE_SEC, 10, 120)
  return { staleAfterSec, heartbeatIntervalSec, recordTtlSec, maxList, listCacheSec }
}
