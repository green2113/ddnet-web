/// <reference types="@cloudflare/workers-types" />

export interface SoundboardItem {
  id: string
  title: string
  url: string
  ownerId: string
  scope: 'default' | 'personal'
  durationMs: number
  contentType: string
  sizeBytes: number
  createdAt: string
}

export interface Env {
  SOUNDBOARD_MEDIA?: R2Bucket
  SOUNDBOARD_KV?: KVNamespace
  SOUNDBOARD_PUBLIC_BASE?: string
  SOUNDBOARD_MAX_BYTES?: string
  SOUNDBOARD_MAX_SECONDS?: string
  SOUNDBOARD_DEFAULTS_JSON?: string
}

export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
export const DEFAULT_MAX_SECONDS = 10
export const DEFAULT_INSTALL_ID = 'anonymous'

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      ...(init?.headers || {}),
    },
  })
}

export function optionsResponse(allowMethods: string) {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': allowMethods,
      'access-control-allow-headers': 'content-type, x-uclient-install-id, x-sound-title, x-sound-duration-ms',
      'access-control-max-age': '86400',
    },
  })
}

export function normalizeInstallId(value: string | null | undefined) {
  const installId = (value || '').trim()
  if(!installId) {
    return ''
  }
  return installId.slice(0, 128)
}

export function normalizeTitle(value: string | null | undefined) {
  const title = (value || '').trim()
  if(!title) {
    return 'Untitled sound'
  }
  return title.slice(0, 64)
}

export function normalizePublicBase(value?: string) {
  return (value || '').replace(/\/$/, '')
}

export function buildServeUrl(request: Request, key: string, publicBase?: string) {
  const base = normalizePublicBase(publicBase)
  if(base) {
    return `${base}/${key}`
  }
  const origin = new URL(request.url).origin
  return `${origin}/api/media/get?key=${encodeURIComponent(key)}`
}

export function extensionFromType(contentType: string) {
  switch(contentType) {
    case 'audio/wav':
    case 'audio/wave':
    case 'audio/x-wav':
      return 'wav'
    case 'audio/mpeg':
      return 'mp3'
    case 'audio/ogg':
      return 'ogg'
    default:
      return ''
  }
}

export function generateUuid() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function personalKey(installId: string) {
  return `soundboard:user:${installId}`
}

export async function readPersonal(kv: KVNamespace, installId: string): Promise<SoundboardItem[]> {
  const v = await kv.get<SoundboardItem[]>(personalKey(installId), 'json')
  if(!Array.isArray(v)) {
    return []
  }
  // Heal legacy URLs that were stored with a duplicate path segment
  // e.g. https://media.under1111.com/soundboard/soundboard/personal/... → .../soundboard/personal/...
  return v.map(item => ({
    ...item,
    url: item.url.replace(/\/(soundboard)\/\1\//, '/$1/'),
  }))
}

export async function writePersonal(kv: KVNamespace, installId: string, items: SoundboardItem[]) {
  await kv.put(personalKey(installId), JSON.stringify(items.slice(0, 200)), { expirationTtl: 365 * 24 * 60 * 60 })
}

export function parseDefaultsFromEnv(env: Env): SoundboardItem[] {
  const raw = (env.SOUNDBOARD_DEFAULTS_JSON || '').trim()
  if(!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    if(!Array.isArray(parsed)) {
      return []
    }
    const out: SoundboardItem[] = []
    for(const item of parsed) {
      if(!item || typeof item !== 'object') {
        continue
      }
      const entry = item as Partial<SoundboardItem>
      if(typeof entry.id !== 'string' || typeof entry.title !== 'string' || typeof entry.url !== 'string') {
        continue
      }
      out.push({
        id: entry.id,
        title: entry.title,
        url: entry.url,
        ownerId: 'default',
        scope: 'default',
        durationMs: Number(entry.durationMs || 0),
        contentType: typeof entry.contentType === 'string' ? entry.contentType : 'audio/unknown',
        sizeBytes: Number(entry.sizeBytes || 0),
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      })
    }
    return out
  } catch {
    return []
  }
}
