/// <reference types="@cloudflare/workers-types" />

import { Env, getCachedPresenceList, json, jsonPresenceList, kvUnavailable, optionsResponse, settings } from './presence/_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

async function fetchFromOrigin(originUrl: string, listCacheSec: number): Promise<Response | null> {
  try {
    const upstream = await fetch(originUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      // Edge-cache the upstream JSON so we don't hammer the origin per request.
      cf: { cacheTtl: Math.max(10, listCacheSec), cacheEverything: true },
    } as RequestInit)

    if (!upstream.ok) {
      return null
    }

    const body = await upstream.text()
    const maxAge = Math.max(10, listCacheSec)
    return new Response(body, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=120`,
        'access-control-allow-origin': '*',
      },
    })
  } catch {
    return null
  }
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  const cfg = settings(env)
  const originUrl = (env.PRESENCE_ORIGIN_URL || '').trim()

  if (originUrl) {
    const proxied = await fetchFromOrigin(originUrl, cfg.listCacheSec)
    if (proxied) {
      return proxied
    }
    // Origin unreachable: fall back to KV if bound, otherwise report empty list.
    if (!env.PRESENCE_KV) {
      return jsonPresenceList([], cfg.listCacheSec)
    }
  }

  if (!env.PRESENCE_KV) {
    return kvUnavailable()
  }

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
