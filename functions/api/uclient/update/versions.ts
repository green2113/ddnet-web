/// <reference types="@cloudflare/workers-types" />

import { Env, errorJson, json, loadVersions, optionsResponse } from './_shared'

export const onRequestOptions = async () => optionsResponse('GET, OPTIONS')

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const versions = await loadVersions(env)
    return json(versions)
  } catch {
    return errorJson('uclient_update_versions_load_failed', 500)
  }
}
