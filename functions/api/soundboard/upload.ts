/// <reference types="@cloudflare/workers-types" />

import {
  DEFAULT_INSTALL_ID,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_SECONDS,
  buildSoundboardServeUrl,
  Env,
  SoundboardItem,
  extensionFromType,
  generateUuid,
  json,
  normalizeInstallId,
  normalizeTitle,
  optionsResponse,
  readPersonal,
  writePersonal,
} from './_shared'

const ALLOWED_TYPES = new Set(['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mpeg', 'audio/ogg'])

export const onRequestOptions = async () => optionsResponse('POST, OPTIONS')

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if(!env.SOUNDBOARD_MEDIA) {
    return json({ ok: false, error: 'soundboard_media_not_configured' }, { status: 500 })
  }
  if(!env.SOUNDBOARD_KV) {
    return json({ ok: false, error: 'soundboard_kv_not_configured' }, { status: 500 })
  }

  const installId = normalizeInstallId(request.headers.get('x-uclient-install-id'))
  if(!installId || installId === DEFAULT_INSTALL_ID) {
    return json({ ok: false, error: 'install_id_required' }, { status: 400 })
  }

  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if(!ALLOWED_TYPES.has(contentType)) {
    return json({ ok: false, error: 'unsupported_content_type' }, { status: 415 })
  }

  const maxBytes = Number(env.SOUNDBOARD_MAX_BYTES || DEFAULT_MAX_BYTES)
  const maxSeconds = Number(env.SOUNDBOARD_MAX_SECONDS || DEFAULT_MAX_SECONDS)
  const durationMsHeader = Number(request.headers.get('x-sound-duration-ms') || '0')
  if(Number.isFinite(durationMsHeader) && durationMsHeader > 0 && durationMsHeader > maxSeconds * 1000) {
    return json({ ok: false, error: 'duration_too_long', maxSeconds }, { status: 413 })
  }

  const body = await request.arrayBuffer()
  if(!body || body.byteLength === 0) {
    return json({ ok: false, error: 'empty_body' }, { status: 400 })
  }
  if(maxBytes > 0 && body.byteLength > maxBytes) {
    return json({ ok: false, error: 'payload_too_large', maxBytes }, { status: 413 })
  }

  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const ext = extensionFromType(contentType)
  if(!ext) {
    return json({ ok: false, error: 'unsupported_content_type' }, { status: 415 })
  }

  const title = normalizeTitle(request.headers.get('x-sound-title'))
  const id = generateUuid()
  const keyPrefix = `soundboard/personal/${installId}/${yyyy}/${mm}/${dd}`
  let key = `${keyPrefix}/${id}.${ext}`
  while(await env.SOUNDBOARD_MEDIA.head(key)) {
    key = `${keyPrefix}/${generateUuid()}.${ext}`
  }

  await env.SOUNDBOARD_MEDIA.put(key, body, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      source: 'uclient-soundboard-upload',
      ownerId: installId,
      title,
    },
  })

  const item: SoundboardItem = {
    id,
    title,
    url: buildSoundboardServeUrl(request, key, env.SOUNDBOARD_PUBLIC_BASE),
    ownerId: installId,
    scope: 'personal',
    durationMs: Number.isFinite(durationMsHeader) && durationMsHeader > 0 ? Math.floor(durationMsHeader) : 0,
    contentType,
    sizeBytes: body.byteLength,
    createdAt: now.toISOString(),
  }

  const current = await readPersonal(env.SOUNDBOARD_KV, installId, request, env.SOUNDBOARD_PUBLIC_BASE)
  current.unshift(item)
  await writePersonal(env.SOUNDBOARD_KV, installId, current)

  return json({ ok: true, item })
}
