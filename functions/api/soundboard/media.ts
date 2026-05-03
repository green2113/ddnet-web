/// <reference types="@cloudflare/workers-types" />

import { Env, optionsResponse } from './_shared'

function buildHeaders(base?: HeadersInit) {
  return {
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=31536000, immutable',
    ...(base || {}),
  }
}

function validKey(key: string) {
  if(!key.startsWith('soundboard/')) {
    return false
  }
  if(key.includes('..')) {
    return false
  }
  return true
}

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  if(!env.SOUNDBOARD_MEDIA) {
    return new Response('soundboard media not configured', { status: 500, headers: buildHeaders() })
  }

  const url = new URL(request.url)
  const key = (url.searchParams.get('key') || '').trim()
  if(!key || !validKey(key)) {
    return new Response('invalid key', { status: 400, headers: buildHeaders() })
  }

  const object = await env.SOUNDBOARD_MEDIA.get(key)
  if(!object) {
    return new Response('not found', { status: 404, headers: buildHeaders() })
  }

  const headers = new Headers(buildHeaders())
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, {
    status: 200,
    headers,
  })
}
