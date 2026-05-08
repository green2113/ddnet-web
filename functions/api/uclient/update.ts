/// <reference types="@cloudflare/workers-types" />

import { Env, json, optionsResponse } from './uclient/update/_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  return json({
    ok: true,
    endpoints: {
      latest: '/api/uclient/update/latest',
      versions: '/api/uclient/update/versions',
    },
    hasKv: !!env.UCLIENT_UPDATE_KV,
    hasDownloadR2: !!env.DOWNLOAD,
  })
}
