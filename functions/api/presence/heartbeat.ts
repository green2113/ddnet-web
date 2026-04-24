/// <reference types="@cloudflare/workers-types" />

import {
  badRequest,
  Env,
  HeartbeatInput,
  json,
  kvUnavailable,
  normalizeDisplayName,
  normalizePlayerId,
  normalizeServer,
  normalizeServerClientId,
  normalizeSessionId,
  nowMs,
  optionsResponse,
  parseJson,
  readRecord,
  settings,
  writeRecord,
} from './_shared'

export const onRequestOptions = async () => optionsResponse('POST, OPTIONS')

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.PRESENCE_KV) return kvUnavailable()

  const payload = await parseJson<HeartbeatInput>(request)
  if (!payload) return badRequest('invalid_json')

  const playerId = normalizePlayerId(payload.playerId)
  if (!playerId) return badRequest('player_id_required')

  const cfg = settings(env)
  const eventTimeMs = Number.isFinite(payload.timestampMs) ? Math.floor(payload.timestampMs as number) : nowMs()
  const sessionId = normalizeSessionId(payload.sessionId, 'default')
  const existing = await readRecord(env.PRESENCE_KV, playerId, sessionId)

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

  await writeRecord(env.PRESENCE_KV, next, cfg.recordTtlSec)

  return json({
    ok: true,
    accepted: {
      server: next.server,
      name: next.displayName,
      clientId: next.serverClientId,
      status: next.status,
      lastSeenMs: next.lastSeenMs,
    },
  })
}
