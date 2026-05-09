/// <reference types="@cloudflare/workers-types" />

import { Env, errorJson, json, loadLatest, optionsResponse } from './_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const latest = await loadLatest(env)
    if(!latest) {
      return errorJson('uclient_update_latest_not_found', 404)
    }
    return json(latest)
  } catch {
    return errorJson('uclient_update_latest_load_failed', 500)
  }
}
