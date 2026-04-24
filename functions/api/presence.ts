/// <reference types="@cloudflare/workers-types" />

import { Env, json, kvUnavailable, listOnline, optionsResponse, settings } from './presence/_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  if (!env.PRESENCE_KV) {
    return kvUnavailable()
  }

  const cfg = settings(env)
  const online = await listOnline(env.PRESENCE_KV, cfg.staleAfterSec, cfg.maxList)
  return json(online.servers)
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
