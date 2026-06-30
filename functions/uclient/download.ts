/// <reference types="@cloudflare/workers-types" />

import {
  Env,
  loadLatest,
  UClientUpdatePlatform,
} from '../api/uclient/update/_shared'

type PlatformKey = 'windows' | 'macos' | 'linux'

const LEGACY_DOWNLOADS: Partial<
  Record<PlatformKey, { r2Key: string; filename: string; contentType: string }>
> = {
  windows: {
    r2Key: 'uclient/win64/UClient-windows.zip',
    filename: 'UClient-windows.zip',
    contentType: 'application/zip',
  },
}

function normalizePlatformHint(value: string | null | undefined): PlatformKey | null {
  if(!value) {
    return null
  }
  const hint = value.trim().toLowerCase()
  if(hint === 'windows' || hint === 'win' || hint === 'win64') {
    return 'windows'
  }
  if(hint === 'macos' || hint === 'mac' || hint === 'darwin' || hint === 'osx') {
    return 'macos'
  }
  if(hint === 'linux' || hint === 'ubuntu') {
    return 'linux'
  }
  return null
}

function detectPlatform(request: Request): PlatformKey {
  const fromQuery = normalizePlatformHint(new URL(request.url).searchParams.get('platform'))
  if(fromQuery) {
    return fromQuery
  }

  const clientHint = request.headers.get('Sec-CH-UA-Platform')?.replace(/"/g, '').trim().toLowerCase()
  if(clientHint) {
    if(clientHint.includes('win')) {
      return 'windows'
    }
    if(clientHint.includes('mac')) {
      return 'macos'
    }
    if(clientHint.includes('linux') || clientHint.includes('chrome os')) {
      return 'linux'
    }
  }

  const userAgent = request.headers.get('User-Agent') || ''
  if(/\b(iPhone|iPad|iPod)\b/i.test(userAgent)) {
    return 'macos'
  }
  if(/\bMac OS X\b|\bMacintosh\b/i.test(userAgent)) {
    return 'macos'
  }
  if(/\bWindows\b|\bWin64\b|\bWOW64\b/i.test(userAgent)) {
    return 'windows'
  }
  if(/\bLinux\b/i.test(userAgent) && !/\bAndroid\b/i.test(userAgent)) {
    return 'linux'
  }

  return 'windows'
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

function filenameForPlatform(platform: PlatformKey, info?: UClientUpdatePlatform) {
  if(info?.name?.trim()) {
    return info.name.trim()
  }
  if(info?.path?.trim()) {
    const parts = info.path.split('/')
    const last = parts[parts.length - 1]
    if(last) {
      return last
    }
  }
  switch(platform) {
  case 'macos':
    return 'UClient-macos.dmg'
  case 'linux':
    return 'UClient-ubuntu-linux_x86_64.tar.xz'
  default:
    return 'UClient-windows.zip'
  }
}

async function streamR2Object(env: Env, r2Key: string, filename: string, contentType: string) {
  const object = await env.DOWNLOAD!.get(r2Key)
  if(!object) {
    return null
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Content-Disposition', `attachment; filename="${filename}"`)
  headers.set('Content-Type', contentType)
  if(object.size) {
    headers.set('Content-Length', String(object.size))
  }
  headers.set('Cache-Control', 'public, max-age=300')

  return new Response(object.body, { headers })
}

async function servePlatformDownload(env: Env, platform: PlatformKey, info?: UClientUpdatePlatform) {
  const filename = filenameForPlatform(platform, info)
  const contentType = contentTypeForFilename(filename)

  if(info?.path?.trim()) {
    const streamed = await streamR2Object(env, info.path.trim(), filename, contentType)
    if(streamed) {
      return streamed
    }
  }

  if(info?.url?.trim()) {
    return Response.redirect(info.url.trim(), 302)
  }

  const legacy = LEGACY_DOWNLOADS[platform]
  if(legacy) {
    const streamed = await streamR2Object(env, legacy.r2Key, legacy.filename, legacy.contentType)
    if(streamed) {
      return streamed
    }
  }

  return null
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  if(!env.DOWNLOAD) {
    return new Response('Storage not configured', { status: 503 })
  }

  const platform = detectPlatform(request)
  let latestPlatform: UClientUpdatePlatform | undefined

  try {
    const latest = await loadLatest(env)
    latestPlatform = latest?.platforms?.[platform]
  } catch {
    latestPlatform = undefined
  }

  const response = await servePlatformDownload(env, platform, latestPlatform)
  if(response) {
    response.headers.set('X-UClient-Platform', platform)
    if(latestPlatform?.sha256) {
      response.headers.set('X-UClient-Sha256', latestPlatform.sha256)
    }
    return response
  }

  return new Response(`No UClient download available for platform: ${platform}`, {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'X-UClient-Platform': platform,
    },
  })
}
