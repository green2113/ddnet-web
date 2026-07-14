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

async function sha256Hex(body: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', body)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Sanitize an optional file name so it is safe to embed in an object key / URL.
// Used for skin sharing, where the file must keep the sharer's skin name so the
// receiver can save it under the same name (skins are matched by name).
function sanitizeFileName(value: string): string {
  const base = value.replace(/\.[^.]*$/, '')
  return base.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48)
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

  const ext = extensionFromType(contentType)
  // Content-addressed key: identical image bytes always map to the same object,
  // so re-uploading the same image reuses the existing URL instead of duplicating it.
  const hash = await sha256Hex(body)

  // Optional file name (e.g. shared skin name). When provided, the object is stored
  // so the served URL ends with "<name>.<ext>", allowing the receiver to derive the
  // skin name from the URL. Still deduplicated per (content, name) via the hash path.
  const nameParam = sanitizeFileName(new URL(request.url).searchParams.get('name') || '')
  const key = nameParam
    ? `chat/named/${hash}/${nameParam}.${ext}`
    : `chat/sha256/${hash}.${ext}`

  // Only store when this content has not been uploaded before.
  const existing = await env.CHAT_MEDIA.head(key)
  if (!existing) {
    await env.CHAT_MEDIA.put(key, body, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        source: 'uclient-chat-upload',
      },
    })
  }

  return json(
    {
      url: buildServeUrl(request, key, env.CHAT_MEDIA_PUBLIC_BASE),
      key,
      deduplicated: !!existing,
    },
    {
      status: 200,
      headers: {
        'access-control-allow-origin': '*',
      },
    },
  )
}
