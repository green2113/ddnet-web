/// <reference types="@cloudflare/workers-types" />

import {
  badRequest,
  Env,
  JoinInput,
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

  const payload = await parseJson<JoinInput>(request)
  if (!payload) return badRequest('invalid_json')

  const playerId = normalizePlayerId(payload.playerId)
  if (!playerId) return badRequest('player_id_required')

  const server = normalizeServer(payload.server)
  if (!server) return badRequest('server_required')

  const cfg = settings(env)
  const eventTimeMs = Number.isFinite(payload.timestampMs) ? Math.floor(payload.timestampMs as number) : nowMs()
  const sessionId = normalizeSessionId(payload.sessionId, 'default')
  const existing = await readRecord(env.PRESENCE_KV, playerId, sessionId)

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

  return json({
    ok: true,
    accepted: {
      server: next.server,
      name: next.displayName,
      clientId: next.serverClientId,
      previousServer: next.previousServer || null,
      status: next.status,
      lastSeenMs: next.lastSeenMs,
    },
  })
}
