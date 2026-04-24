/// <reference types="@cloudflare/workers-types" />

import {
  badRequest,
  Env,
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
  SwitchInput,
  writeRecord,
} from './_shared'

export const onRequestOptions = async () => optionsResponse('POST, OPTIONS')

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.PRESENCE_KV) return kvUnavailable()

  const payload = await parseJson<SwitchInput>(request)
  if (!payload) return badRequest('invalid_json')

  const playerId = normalizePlayerId(payload.playerId)
  if (!playerId) return badRequest('player_id_required')

  const toServer = normalizeServer(payload.toServer)
  if (!toServer) return badRequest('to_server_required')

  const cfg = settings(env)
  const eventTimeMs = Number.isFinite(payload.timestampMs) ? Math.floor(payload.timestampMs as number) : nowMs()
  const existing = await readRecord(env.PRESENCE_KV, playerId)
  const previousServer = normalizeServer(payload.server || existing?.server)

  const next = {
    playerId,
    sessionId: normalizeSessionId(payload.sessionId, existing?.sessionId || `${playerId}:${eventTimeMs}`),
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
