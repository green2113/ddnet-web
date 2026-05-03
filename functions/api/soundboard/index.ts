/// <reference types="@cloudflare/workers-types" />

import { DEFAULT_INSTALL_ID, Env, SoundboardItem, json, normalizeInstallId, optionsResponse, parseDefaultsFromEnv, readPersonal } from './_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const installId = normalizeInstallId(request.headers.get('x-uclient-install-id')) || DEFAULT_INSTALL_ID
  const defaults = parseDefaultsFromEnv(env)

  let personal: SoundboardItem[] = []
  if(env.SOUNDBOARD_KV && installId !== DEFAULT_INSTALL_ID) {
    personal = await readPersonal(env.SOUNDBOARD_KV, installId, request, env.SOUNDBOARD_PUBLIC_BASE)
  }

  return json({
    ok: true,
    limits: {
      maxBytes: Number(env.SOUNDBOARD_MAX_BYTES || 5 * 1024 * 1024),
      maxSeconds: Number(env.SOUNDBOARD_MAX_SECONDS || 10),
      allowedTypes: ['audio/wav', 'audio/mpeg', 'audio/ogg'],
    },
    defaults,
    personal,
  })
}
