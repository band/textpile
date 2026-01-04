export async function onRequestGet({ env }) {
  const raw = await env.KV.get("index");
  const items = raw ? JSON.parse(raw) : [];
  return Response.json({ items }, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
