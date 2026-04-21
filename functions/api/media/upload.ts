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

async function nextImageIndex(bucket: R2Bucket, dayPrefix: string): Promise<number> {
  let maxIndex = 0
  let cursor: string | undefined = undefined

  do {
    const listed = await bucket.list({
      prefix: `${dayPrefix}image`,
      cursor,
      limit: 1000,
    })

    for (const obj of listed.objects) {
      const fileName = obj.key.slice(dayPrefix.length)
      const match = fileName.match(/^image(\d+)\.[^.]+$/i)
      if (!match) {
        continue
      }
      const parsed = Number(match[1])
      if (Number.isFinite(parsed)) {
        maxIndex = Math.max(maxIndex, parsed)
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined
  } while (cursor)

  return maxIndex + 1
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
  let nextIndex = await nextImageIndex(env.CHAT_MEDIA, dayPrefix)
  let key = `${dayPrefix}image${nextIndex}.${ext}`

  // If a concurrent upload used the same index, move to the next free slot.
  while (await env.CHAT_MEDIA.head(key)) {
    nextIndex += 1
    key = `${dayPrefix}image${nextIndex}.${ext}`
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
