/// <reference types="@cloudflare/workers-types" />

export interface Env {
  CHAT_MEDIA: R2Bucket
  CHAT_MEDIA_PUBLIC_BASE?: string
  CHAT_MEDIA_MAX_BYTES?: string
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init?.headers || {}),
    },
  })
}

function normalizeBaseUrl(value?: string) {
  return (value || '').replace(/\/$/, '')
}

function extensionFromType(contentType: string) {
  switch (contentType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return ''
  }
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-uclient-upload',
      'access-control-max-age': '86400',
    },
  })
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!ALLOWED_TYPES.has(contentType)) {
    return json({ error: 'unsupported_content_type' }, { status: 415, headers: { 'access-control-allow-origin': '*' } })
  }

  const maxBytes = Number(env.CHAT_MEDIA_MAX_BYTES || DEFAULT_MAX_BYTES)
  const body = await request.arrayBuffer()
  if (!body || body.byteLength === 0) {
    return json({ error: 'empty_body' }, { status: 400, headers: { 'access-control-allow-origin': '*' } })
  }
  if (maxBytes > 0 && body.byteLength > maxBytes) {
    return json({ error: 'payload_too_large' }, { status: 413, headers: { 'access-control-allow-origin': '*' } })
  }

  const publicBase = normalizeBaseUrl(env.CHAT_MEDIA_PUBLIC_BASE)
  if (!publicBase) {
    return json({ error: 'CHAT_MEDIA_PUBLIC_BASE_missing' }, { status: 500, headers: { 'access-control-allow-origin': '*' } })
  }

  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const ext = extensionFromType(contentType)
  const key = `chat/${yyyy}/${mm}/${dd}/${crypto.randomUUID()}.${ext}`

  await env.CHAT_MEDIA.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      source: 'uclient-chat-upload',
    },
  })

  return json(
    {
      url: `${publicBase}/${key}`,
      key,
    },
    {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
      },
    },
  )
}
