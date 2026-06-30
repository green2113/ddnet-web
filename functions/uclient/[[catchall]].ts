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

function isSafeAssetPath(path: string) {
  if(!path || path.includes('..') || path.includes('\\')) {
    return false
  }
  const segments = path.split('/').filter(Boolean)
  if(segments.length < 3) {
    return false
  }
  return segments.every((segment) => /^[A-Za-z0-9._+-]+$/.test(segment))
}

export const onRequestGet = async ({
  params,
  env,
}: {
  params: { catchall?: string | string[] }
  env: Env
}) => {
  if(!env.DOWNLOAD) {
    return new Response('Storage not configured', { status: 503 })
  }

  const raw = params.catchall
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : []
  const assetPath = segments.join('/')
  if(!isSafeAssetPath(assetPath)) {
    return new Response('Not Found', { status: 404 })
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
