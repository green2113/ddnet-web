export async function onRequest(context: {
  request: Request;
  env: { ASSETS: { fetch(r: Request): Promise<Response> } };
  params: { path?: string[] };
}) {
  const { request, env, params } = context;
  const segments = params.path ?? [];
  const path = segments.join("/");

  if (path.endsWith(".exe")) {
    const releaseUrl =
      "https://github.com/green2113/ddnet-web/releases/download/client/" + path;
    return Response.redirect(releaseUrl, 302);
  }

  return env.ASSETS.fetch(request);
}
