export async function onRequest({ params }: { params: { path?: string[] } }) {
  const path = params.path?.join("/") ?? "";

  // update.json이나 info.json이면 리다이렉트하지 않고 정적 자산으로 처리
  if (path === "update.json" || path === "info.json") {
    return new Response(null, { status: 404 }); // Pages가 정적 파일을 서빙하도록 넘김
  }

  const releaseUrl =
    "https://github.com/<user>/<repo>/releases/download/<tag>/" + path;
  return Response.redirect(releaseUrl, 302);
}
