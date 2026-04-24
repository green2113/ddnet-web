/// <reference types="@cloudflare/workers-types" />

import { Env, json, kvUnavailable, listOnline, optionsResponse, settings } from './presence/_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  if (!env.PRESENCE_KV) {
    return kvUnavailable()
  }

  const cfg = settings(env)
  const online = await listOnline(env.PRESENCE_KV, cfg.staleAfterSec, cfg.maxList)
  return json({
    ok: true,
    mode: 'snapshot_by_server',
    note: 'UUIDs are used internally and never returned in this response.',
    heartbeatIntervalSec: cfg.heartbeatIntervalSec,
    staleAfterSec: cfg.staleAfterSec,
    ...online,
  })
}

export const onRequestPost = async () => {
  return json(
    {
      ok: false,
      error: 'use_event_specific_endpoint',
      endpoints: {
        join: '/api/presence/join',
        switch: '/api/presence/switch',
        leave: '/api/presence/leave',
        heartbeat: '/api/presence/heartbeat',
      },
    },
    { status: 400 },
  )
}
