export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  API_BASE?: string
}

const UPSTREAM_PATH_PREFIXES = [
  '/api',
  '/auth',
  '/socket.io',
]

export const onRequest = async ({ request, env }: any) => {
  const url = new URL(request.url)
  const isApiLike = UPSTREAM_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))

  // 정적 자산은 그대로 제공
  if (!isApiLike) {
    return env.ASSETS.fetch(request)
  }

  const apiBase = (env.API_BASE || '').replace(/\/$/, '')
  if (!apiBase) {
    return new Response('API_BASE is not configured', { status: 500 })
  }

  const upstreamUrl = apiBase + url.pathname + url.search

  // 원본 요청을 최대한 보존하여 프록시 (쿠키/헤더/바디 포함)
  const init: RequestInit = {
    method: request.method,
    headers: new Headers(request.headers),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  }

  // 호스트/오리진을 업스트림에 맞게 보정 (일부 백엔드가 검증할 수 있음)
  const headers = init.headers as any
  try {
    headers.set('host', new URL(apiBase).host)
  } catch {}

  const upstreamRequest = new Request(upstreamUrl, init)
  const response = await fetch(upstreamRequest)

  // Set-Cookie 등 헤더를 그대로 전달 (도메인은 프록시 도메인으로 적용되어 1st-party 쿠키가 됨)
  const respHeaders = new Headers(response.headers)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: respHeaders })
}


