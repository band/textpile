function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

export async function onRequestGet({ params, env }) {
  const id = params.id;
  const body = await env.KV.get(`post:${id}`, { type: "text" });
  if (!body) return new Response("Not found", { status: 404 });

  // Pull title from KV metadata if available
  const withMeta = await env.KV.get(`post:${id}`, { type: "text" });
  const meta = await env.KV.getWithMetadata
    ? await env.KV.getWithMetadata(`post:${id}`)
    : null;

  const title = meta?.metadata?.title || null;
  const createdAt = meta?.metadata?.createdAt || null;

  // Render Markdown client-side using marked (CDN) to keep the function tiny.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title || "Post")}</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header>
    <h1>${escapeHtml(title || "(untitled)")}</h1>
    <div class="actions">
      <a href="/">TOC</a>
      <a href="/submit">Submit</a>
    </div>
  </header>

  <div class="meta">${escapeHtml(createdAt ? new Date(createdAt).toLocaleString() : "")} · ${escapeHtml(id)}</div>
  <hr />

  <article id="content"></article>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const raw = ${JSON.stringify(body)};
    document.getElementById("content").innerHTML = marked.parse(raw);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
