/// <reference types="@cloudflare/workers-types" />

interface Env {
  DOWNLOAD: R2Bucket
}

export const onRequestGet = async ({ env }: { env: Env }) => {
  if (!env.DOWNLOAD) {
    return new Response('Storage not configured', { status: 503 })
  }

  const object = await env.DOWNLOAD.get('uclient/win64/UClient-windows.zip')
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Content-Disposition', 'attachment; filename="UClient-windows.zip"')
  headers.set('Content-Type', 'application/zip')
  if (object.size) {
    headers.set('Content-Length', String(object.size))
  }

  return new Response(object.body, { headers })
}
