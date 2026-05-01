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

function buildServeUrl(request: Request, key: string, publicBase?: string) {
  const base = normalizeBaseUrl(publicBase)
  if (base) {
    return `${base}/${key}`
  }

  const origin = new URL(request.url).origin
  return `${origin}/api/media/get?key=${encodeURIComponent(key)}`
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

function generateUuid(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Set version 4 bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  // Set variant bits
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
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

  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const ext = extensionFromType(contentType)
  const dayPrefix = `chat/${yyyy}/${mm}/${dd}/`
  const uuid = generateUuid()
  let key = `${dayPrefix}${uuid}.${ext}`

  // Extremely unlikely, but ensure no collision exists.
  while (await env.CHAT_MEDIA.head(key)) {
    key = `${dayPrefix}${generateUuid()}.${ext}`
  }

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
      url: buildServeUrl(request, key, env.CHAT_MEDIA_PUBLIC_BASE),
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
