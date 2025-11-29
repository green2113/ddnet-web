export async function onRequest(context: {
  request: Request;
  env: { ASSETS: { fetch(r: Request): Promise<Response> } };
  params: { path?: string[] };
}) {
  const { request, env, params } = context;
  const segments = params.path ?? [];
  const path = segments.join("/");

  // 정적 파일로 서빙해야 하는 경우
  if (path === "update.json" || path === "info.json") {
    return env.ASSETS.fetch(request);
  }

  // 나머지는 GitHub Releases로 리다이렉트
  const releaseUrl =
    "https://github.com/green2113/ddnet-web/releases/download/client/" + path;
  return Response.redirect(releaseUrl, 302);
}
