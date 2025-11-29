export async function onRequest({ params }: { params: { path?: string[] } }) {
  if (!params.path || params.path.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const filename = params.path.join("/");
  const releaseUrl = `https://github.com/green2113/ddnet-web/releases/download/client/${filename}`;
  return Response.redirect(releaseUrl, 302);
}
