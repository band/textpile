export async function onRequestPost({ request, env }) {
  const token = env.ADMIN_TOKEN;
  if (!token) {
    return Response.json({ error: "ADMIN_TOKEN not configured." }, { status: 501 });
  }

  let data;
  try { data = await request.json(); }
  catch { return Response.json({ error: "Expected JSON body." }, { status: 400 }); }

  if ((data?.token || "") !== token) {
    return Response.json({ error: "Invalid admin token." }, { status: 403 });
  }

  const id = String(data?.id || "").trim();
  if (!id) return Response.json({ error: "id required." }, { status: 400 });

  await env.KV.delete(`post:${id}`);

  const rawIndex = await env.KV.get("index");
  const index = rawIndex ? JSON.parse(rawIndex) : [];
  const next = index.filter((it) => it?.id !== id);
  await env.KV.put("index", JSON.stringify(next));

  return Response.json({ ok: true });
}
