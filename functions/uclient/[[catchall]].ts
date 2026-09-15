/// <reference types="@cloudflare/workers-types" />

interface Env {
  DOWNLOAD: R2Bucket
}

function contentTypeForFilename(filename: string) {
  const lower = filename.toLowerCase()
  if(lower.endsWith('.zip')) {
    return 'application/zip'
  }
  if(lower.endsWith('.dmg')) {
    return 'application/octet-stream'
  }
  if(lower.endsWith('.tar.xz')) {
    return 'application/x-xz'
  }
  if(lower.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }
  return 'application/octet-stream'
}

const VERSION_SEGMENT = /^\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/
const SAFE_SEGMENT = /^[A-Za-z0-9._+-]+$/

function isVersionSegment(segment: string) {
  return VERSION_SEGMENT.test(segment)
}

function isSafePathSegment(segment: string) {
  return SAFE_SEGMENT.test(segment)
}

/** Maps /uclient/<path> to an R2 object key under uclient/, or null if not a release asset. */
function r2KeyForUclientAsset(assetPath: string): string | null {
  if(!assetPath || assetPath.includes('..') || assetPath.includes('\\')) {
    return null
  }

  const segments = assetPath.split('/').filter(Boolean)
  if(segments.length === 0 || !segments.every(isSafePathSegment)) {
    return null
  }

  // Legacy full distribution: 2.4.1/windows/UClient-windows.zip
  if(segments.length >= 3 && isVersionSegment(segments[0])) {
    return `uclient/${assetPath}`
  }

  // Channel pointers: client/latest.json, launcher/latest.json
  if(
    segments.length === 2 &&
    (segments[0] === 'client' || segments[0] === 'launcher') &&
    segments[1] === 'latest.json'
  ) {
    return `uclient/${assetPath}`
  }

  // Channel packages: client/2.10.1/windows/..., launcher/1.1.2/windows/...
  if(
    (segments[0] === 'client' || segments[0] === 'launcher') &&
    segments.length >= 4 &&
    isVersionSegment(segments[1])
  ) {
    return `uclient/${assetPath}`
  }

  // Per-version launcher metadata: launcher/1.1.2/latest.json
  if(
    segments[0] === 'launcher' &&
    segments.length === 3 &&
    segments[2] === 'latest.json' &&
    isVersionSegment(segments[1])
  ) {
    return `uclient/${assetPath}`
  }

  return null
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, next } = context

  const raw = params.catchall
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : []
  const assetPath = segments.join('/')
  const r2Key = r2KeyForUclientAsset(assetPath)
  if(!r2Key) {
    return next()
  }

  if(!env.DOWNLOAD) {
    return new Response('Storage not configured', { status: 503 })
  }

  const object = await env.DOWNLOAD.get(r2Key)
  if(!object) {
    return new Response('Not Found', { status: 404 })
  }

  const filename = segments[segments.length - 1] || 'UClient-download'
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  headers.set('Content-Type', contentTypeForFilename(filename))
  if(object.size) {
    headers.set('Content-Length', String(object.size))
  }
  headers.set('Cache-Control', 'public, max-age=3600')

  return new Response(object.body, { headers })
}
