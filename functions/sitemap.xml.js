import { escapeXml } from './lib/escape.js';
import { checkKvNamespace } from './lib/kv.js';

function getBaseUrl(request, env) {
  if (env.BASE_URL) {
    return String(env.BASE_URL).replace(/\/+$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function onRequestGet({ env, request }) {
  const kvError = checkKvNamespace(env);
  if (kvError) return kvError;

  const rawIndex = await env.KV.get('index');
  const items = rawIndex ? JSON.parse(rawIndex) : [];
  const now = Date.now();
  const baseUrl = getBaseUrl(request, env);

  const activeItems = items.filter((item) => {
    if (!item.expiresAt) return true;
    return new Date(item.expiresAt).getTime() > now;
  });

  const postUrls = activeItems.map((item) => {
    const loc = `${baseUrl}${item.url || `/p/${encodeURIComponent(item.id)}`}`;
    const lastmod = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null;

    return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>never</changefreq>\n    <priority>${item.pinned ? '0.9' : '0.5'}</priority>\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(baseUrl)}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeXml(baseUrl)}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
${postUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
