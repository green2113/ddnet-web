/// <reference types="@cloudflare/workers-types" />

export interface Env {
  CHAT_MEDIA: R2Bucket
}

function buildHeaders(base?: HeadersInit) {
  return {
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=31536000, immutable',
    ...(base || {}),
  }
}

function validKey(key: string) {
  if (!key.startsWith('chat/')) return false
  if (key.includes('..')) return false
  return true
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const url = new URL(request.url)
  const key = url.searchParams.get('key') || ''

  if (!key || !validKey(key)) {
    return new Response('invalid key', { status: 400, headers: buildHeaders() })
  }

  const object = await env.CHAT_MEDIA.get(key)
  if (!object) {
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
