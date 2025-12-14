export async function onRequest(context: {
  request: Request;
  env: { ASSETS: { fetch(r: Request): Promise<Response> } };
  params: { path?: string[] };
}) {
  const { request, env, params } = context;
  const segments = params.path ?? [];
  const path = segments.join("/");

  // allow only the version JSON files to be served from Pages assets
  const serveLocally =
    path === "" || path === "update.json" || path === "update/info.json";

  if (!serveLocally) {
    const redirectUrl = "https://update.under1111.com/download/" + path;
    return Response.redirect(redirectUrl, 302);
  }

  return env.ASSETS.fetch(request);
}
