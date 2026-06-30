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
  return 'application/octet-stream'
}

function isVersionedReleasePath(path: string) {
  if(!path || path.includes('..') || path.includes('\\')) {
    return false
  }

  const segments = path.split('/').filter(Boolean)
  if(segments.length < 3) {
    return false
  }

  // Only handle release assets like 2.4.1/windows/UClient-windows.zip
  if(!/^\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(segments[0])) {
    return false
  }

  return segments.every((segment) => /^[A-Za-z0-9._+-]+$/.test(segment))
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params, next } = context

  const raw = params.catchall
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : []
  const assetPath = segments.join('/')
  if(!isVersionedReleasePath(assetPath)) {
    return next()
  }

  if(!env.DOWNLOAD) {
    return new Response('Storage not configured', { status: 503 })
  }

  const r2Key = `uclient/${assetPath}`
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
