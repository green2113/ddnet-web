/// <reference types="@cloudflare/workers-types" />

import { Env, getCachedPresenceList, json, jsonPresenceList, kvUnavailable, optionsResponse, settings } from './presence/_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  if (!env.PRESENCE_KV) {
    return kvUnavailable()
  }

  const cfg = settings(env)
  const serverKeyed = await getCachedPresenceList(
    env.PRESENCE_KV,
    cfg.staleAfterSec,
    cfg.maxList,
    cfg.listCacheSec,
  )
  return jsonPresenceList(serverKeyed, cfg.listCacheSec)
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
