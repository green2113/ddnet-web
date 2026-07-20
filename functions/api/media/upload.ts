/// <reference types="@cloudflare/workers-types" />

export interface Env {
  CHAT_MEDIA: R2Bucket
  CHAT_MEDIA_PUBLIC_BASE?: string
  CHAT_MEDIA_MAX_BYTES?: string
  CHAT_MEDIA_MAP_MAX_BYTES?: string
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_MAP_MAX_BYTES = 32 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const MAP_CONTENT_TYPE = 'application/octet-stream'

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
    case MAP_CONTENT_TYPE:
      return 'map'
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
// Used for skin/map sharing, where the file must keep the sharer's name so the
// receiver can save it under the same name.
function sanitizeFileName(value: string): string {
  const base = value.replace(/\.[^.]*$/, '')
  return base.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48)
}

function isMapName(value: string): boolean {
  return /\.map$/i.test((value || '').trim())
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
  const rawName = new URL(request.url).searchParams.get('name') || ''
  const isMapUpload = contentType === MAP_CONTENT_TYPE && isMapName(rawName)

  if (!ALLOWED_IMAGE_TYPES.has(contentType) && !isMapUpload) {
    return json({ error: 'unsupported_content_type' }, { status: 415, headers: { 'access-control-allow-origin': '*' } })
  }

  const maxBytes = isMapUpload
    ? Number(env.CHAT_MEDIA_MAP_MAX_BYTES || DEFAULT_MAP_MAX_BYTES)
    : Number(env.CHAT_MEDIA_MAX_BYTES || DEFAULT_MAX_BYTES)
  const body = await request.arrayBuffer()
  if (!body || body.byteLength === 0) {
    return json({ error: 'empty_body' }, { status: 400, headers: { 'access-control-allow-origin': '*' } })
  }
  if (maxBytes > 0 && body.byteLength > maxBytes) {
    return json({ error: 'payload_too_large' }, { status: 413, headers: { 'access-control-allow-origin': '*' } })
  }

  const ext = isMapUpload ? 'map' : extensionFromType(contentType)
  if (!ext) {
    return json({ error: 'unsupported_content_type' }, { status: 415, headers: { 'access-control-allow-origin': '*' } })
  }

  // Content-addressed key: identical bytes always map to the same object,
  // so re-uploading the same file reuses the existing URL instead of duplicating it.
  const hash = await sha256Hex(body)

  // Optional file name (e.g. shared skin/map name). When provided, the object is stored
  // so the served URL ends with "<name>.<ext>", allowing the receiver to derive the
  // name from the URL. Still deduplicated per (content, name) via the hash path.
  const nameParam = sanitizeFileName(rawName)
  const key = nameParam
    ? `chat/named/${hash}/${nameParam}.${ext}`
    : `chat/sha256/${hash}.${ext}`

  // Only store when this content has not been uploaded before.
  const existing = await env.CHAT_MEDIA.head(key)
  if (!existing) {
    await env.CHAT_MEDIA.put(key, body, {
      httpMetadata: {
        contentType: isMapUpload ? MAP_CONTENT_TYPE : contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        source: isMapUpload ? 'uclient-map-upload' : 'uclient-chat-upload',
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
