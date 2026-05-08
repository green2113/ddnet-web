/// <reference types="@cloudflare/workers-types" />

export interface UClientUpdatePlatform {
  name?: string
  path?: string
  url?: string
  sha256?: string
  size?: number
}

export interface UClientLatestUpdate {
  version: string
  releasedAt?: string
  platforms?: Record<string, UClientUpdatePlatform>
}

export interface UClientVersionEntry {
  version: string
  releasedAt?: string
}

export interface Env {
  DOWNLOAD?: R2Bucket
  UCLIENT_UPDATE_KV?: KVNamespace
  UCLIENT_UPDATE_LATEST_KEY?: string
  UCLIENT_UPDATE_VERSIONS_KEY?: string
}

const DEFAULT_LATEST_R2_KEY = 'uclient/latest.json'
const DEFAULT_VERSIONS_R2_KEY = 'uclient/versions.json'
const DEFAULT_LATEST_KV_KEY = 'uclient:update:latest'
const DEFAULT_VERSIONS_KV_KEY = 'uclient:update:versions'

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
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
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    },
  })
}

export function errorJson(error: string, status = 500) {
  return json(
    {
      ok: false,
      error,
    },
    { status },
  )
}

function normalizeVersion(value: unknown) {
  if(typeof value !== 'string') {
    return ''
  }
  const trimmed = value.trim()
  if(!trimmed) {
    return ''
  }
  if(trimmed[0] === 'v' || trimmed[0] === 'V') {
    return trimmed.slice(1)
  }
  return trimmed
}

function normalizeReleasedAt(value: unknown) {
  if(typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function looksLikePlatformMap(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizePlatform(value: unknown): UClientUpdatePlatform {
  if(!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const source = value as Record<string, unknown>
  return {
    name: typeof source.name === 'string' ? source.name : undefined,
    path: typeof source.path === 'string' ? source.path : undefined,
    url:
      typeof source.url === 'string'
        ? source.url
        : typeof source.download_url === 'string'
          ? source.download_url
          : typeof source.browser_download_url === 'string'
            ? source.browser_download_url
            : undefined,
    sha256: typeof source.sha256 === 'string' ? source.sha256 : undefined,
    size: typeof source.size === 'number' ? source.size : undefined,
  }
}

export function normalizeLatestPayload(value: unknown): UClientLatestUpdate | null {
  if(!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const source = value as Record<string, unknown>
  const version = normalizeVersion(source.version ?? source.tag_name ?? source.name)
  if(!version) {
    return null
  }
  const releasedAt = normalizeReleasedAt(source.releasedAt ?? source.released_at ?? source.publishedAt ?? source.published_at)

  const platforms: Record<string, UClientUpdatePlatform> = {}
  if(looksLikePlatformMap(source.platforms)) {
    for(const [platformKey, platformValue] of Object.entries(source.platforms)) {
      const normalized = normalizePlatform(platformValue)
      if(normalized.url) {
        platforms[platformKey] = normalized
      }
    }
  }

  const latest: UClientLatestUpdate = { version }
  if(releasedAt) {
    latest.releasedAt = releasedAt
  }
  if(Object.keys(platforms).length > 0) {
    latest.platforms = platforms
  }
  return latest
}

export function normalizeVersionsPayload(value: unknown): UClientVersionEntry[] {
  if(!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const versions: UClientVersionEntry[] = []
  for(const item of value) {
    if(!item || typeof item !== 'object' || Array.isArray(item)) {
      continue
    }
    const source = item as Record<string, unknown>
    const version = normalizeVersion(source.version ?? source.tag_name ?? source.name)
    if(!version || seen.has(version)) {
      continue
    }
    const releasedAt = normalizeReleasedAt(source.releasedAt ?? source.released_at ?? source.publishedAt ?? source.published_at)
    seen.add(version)
    versions.push({ version, releasedAt })
  }
  return versions
}

async function readJsonFromKv(kv: KVNamespace, key: string): Promise<unknown | null> {
  return kv.get(key, 'json')
}

async function readJsonFromR2(r2: R2Bucket, key: string): Promise<unknown | null> {
  const object = await r2.get(key)
  if(!object) {
    return null
  }
  return object.json()
}

export async function loadLatest(env: Env): Promise<UClientLatestUpdate | null> {
  if(env.UCLIENT_UPDATE_KV) {
    const key = (env.UCLIENT_UPDATE_LATEST_KEY || DEFAULT_LATEST_KV_KEY).trim()
    const fromKv = await readJsonFromKv(env.UCLIENT_UPDATE_KV, key)
    const normalizedKv = normalizeLatestPayload(fromKv)
    if(normalizedKv) {
      return normalizedKv
    }
  }

  if(env.DOWNLOAD) {
    const fromR2 = await readJsonFromR2(env.DOWNLOAD, DEFAULT_LATEST_R2_KEY)
    const normalizedR2 = normalizeLatestPayload(fromR2)
    if(normalizedR2) {
      return normalizedR2
    }
  }

  return null
}

export async function loadVersions(env: Env): Promise<UClientVersionEntry[]> {
  if(env.UCLIENT_UPDATE_KV) {
    const key = (env.UCLIENT_UPDATE_VERSIONS_KEY || DEFAULT_VERSIONS_KV_KEY).trim()
    const fromKv = await readJsonFromKv(env.UCLIENT_UPDATE_KV, key)
    const normalizedKv = normalizeVersionsPayload(fromKv)
    if(normalizedKv.length > 0) {
      return normalizedKv
    }
  }

  if(env.DOWNLOAD) {
    const fromR2 = await readJsonFromR2(env.DOWNLOAD, DEFAULT_VERSIONS_R2_KEY)
    const normalizedR2 = normalizeVersionsPayload(fromR2)
    if(normalizedR2.length > 0) {
      return normalizedR2
    }
  }

  return []
}
