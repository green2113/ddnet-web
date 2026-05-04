/// <reference types="@cloudflare/workers-types" />

import {
  DEFAULT_INSTALL_ID,
  Env,
  json,
  normalizeInstallId,
  normalizeLegacySoundboardKeyFromUrl,
  optionsResponse,
  readPersonal,
  writePersonal,
} from './_shared'

export const onRequestOptions = async () => optionsResponse('DELETE, OPTIONS')

export const onRequestDelete = async ({
  request,
  env,
  params,
}: {
  request: Request
  env: Env
  params: Record<string, string>
}) => {
  if(!env.SOUNDBOARD_KV) {
    return json({ ok: false, error: 'soundboard_kv_not_configured' }, { status: 500 })
  }

  const installId = normalizeInstallId(request.headers.get('x-uclient-install-id'))
  if(!installId || installId === DEFAULT_INSTALL_ID) {
    return json({ ok: false, error: 'install_id_required' }, { status: 400 })
  }

  const targetId = (params.id || '').trim()
  if(!targetId) {
    return json({ ok: false, error: 'id_required' }, { status: 400 })
  }

  const items = await readPersonal(env.SOUNDBOARD_KV, installId)
  const index = items.findIndex((item) => item.id === targetId)
  if(index === -1) {
    return json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const [removed] = items.splice(index, 1)
  await writePersonal(env.SOUNDBOARD_KV, installId, items)

  // Best-effort R2 delete
  if(env.SOUNDBOARD_MEDIA && removed.url) {
    const key = normalizeLegacySoundboardKeyFromUrl(removed.url)
    if(key) {
      await env.SOUNDBOARD_MEDIA.delete(key).catch(() => {})
    }
  }

  return json({ ok: true })
}
