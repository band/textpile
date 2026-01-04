function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  // Sortable-ish: YYYYMMDDTHHMMSSZ + random
  const t = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}

function clampTitle(title) {
  if (!title) return null;
  const t = String(title).trim().slice(0, 140);
  return t.length ? t : null;
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }

  // Optional shared token gate: if SUBMIT_TOKEN is set, require it.
  const required = env.SUBMIT_TOKEN;
  if (required) {
    const token = (data?.token ? String(data.token) : "").trim();
    if (!token || token !== required) {
      return Response.json({ error: "Submit token required or invalid." }, { status: 403 });
    }
  }

  const body = data?.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    return Response.json({ error: "Body is required." }, { status: 400 });
  }

  // No author identity accepted/stored. Title only.
  const title = clampTitle(data?.title);
  const id = makeId();
  const createdAt = nowIso();
  const url = `/p/${encodeURIComponent(id)}`;

  // Store post and metadata.
  await env.KV.put(`post:${id}`, body, { metadata: { createdAt, title } });

  // Update index (prepend newest). Cap for sanity.
  const rawIndex = await env.KV.get("index");
  const index = rawIndex ? JSON.parse(rawIndex) : [];

  const entry = { id, title, createdAt, url };
  const next = [entry, ...index].slice(0, 1000);

  await env.KV.put("index", JSON.stringify(next));

  return Response.json({ id, url });
}
