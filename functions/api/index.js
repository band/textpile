export async function onRequestGet({ env }) {
  const raw = await env.KV.get("index");
  const items = raw ? JSON.parse(raw) : [];

  // Filter out expired items
  const now = Date.now();
  const activeItems = items.filter(item => {
    if (!item.expiresAt) return true; // Keep items without expiry (legacy)
    return new Date(item.expiresAt).getTime() > now;
  });

  return Response.json({ success: true, items: activeItems }, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
