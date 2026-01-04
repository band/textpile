function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

export async function onRequestGet({ params, env }) {
  const id = params.id;

  // Single KV fetch with metadata
  const result = await env.KV.getWithMetadata(`post:${id}`, { type: "text" });

  if (!result.value) {
    return new Response("Not found", { status: 404 });
  }

  const body = result.value;
  const metadata = result.metadata || {};
  const title = metadata.title || null;
  const createdAt = metadata.createdAt || null;
  const expiresAt = metadata.expiresAt || null;

  // Check if post has expired
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    const expiredHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Post Expired</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header>
    <h1>Post Expired</h1>
    <div class="actions">
      <a href="/">TOC</a>
      <a href="/submit">Submit</a>
    </div>
  </header>

  <div class="card">
    <h2>This Textpile item has expired.</h2>
    <p>Textpile does not retain backups.</p>
    <p>If you need the text, ask the original author or check your own records.</p>
    <p class="meta">Post ID: ${escapeHtml(id)}</p>
    <p class="meta">Expired: ${escapeHtml(new Date(expiresAt).toLocaleString())}</p>
  </div>
</body>
</html>`;

    return new Response(expiredHtml, {
      status: 410,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

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
