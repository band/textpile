// RSS feed for recent posts
import { marked } from 'marked';
import { escapeXml } from './lib/escape.js';
import { checkKvNamespace } from './lib/kv.js';

marked.setOptions({
  gfm: true,
  breaks: true,
});

function getBaseUrl(request, env) {
  if (env.BASE_URL) {
    return String(env.BASE_URL).replace(/\/+$/, '');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function stripMarkdown(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-+*\s]+/gm, '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/[*_~]/g, '')
    .trim();
}

function excerpt(markdown, max = 240) {
  const text = stripMarkdown(markdown);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function cdataSafe(value) {
  return String(value || '').replace(/]]>/g, ']]]]><![CDATA[>');
}

export async function onRequestGet({ env, request }) {
  const kvError = checkKvNamespace(env);
  if (kvError) return kvError;

  const rawIndex = await env.KV.get('index');
  const items = rawIndex ? JSON.parse(rawIndex) : [];

  // Filter out expired items
  const now = Date.now();
  const activeItems = items.filter((item) => {
    if (!item.expiresAt) return true;
    return new Date(item.expiresAt).getTime() > now;
  });

  // Take first 50 posts
  const recentItems = activeItems.slice(0, 50);
  const baseUrl = getBaseUrl(request, env);
  const communityName = env.COMMUNITY_NAME || 'COMMUNITY_NAME';
  const instanceName = env.INSTANCE_NAME || 'Textpile';

  // Fetch bodies in parallel for rich feed content.
  const recentWithBodies = await Promise.all(recentItems.map(async (item) => {
    const body = await env.KV.get(`post:${item.id}`);
    return { ...item, body: body || '' };
  }));

  const rssItems = recentWithBodies.map((item) => {
    const pubDate = item.createdAt ? new Date(item.createdAt).toUTCString() : new Date().toUTCString();
    const title = item.title || '(untitled)';
    const link = `${baseUrl}${item.url}`;
    const html = marked.parse(item.body || '');
    const shortDescription = excerpt(item.body || title);

    return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(shortDescription)}</description>
      <content:encoded><![CDATA[${cdataSafe(html)}]]></content:encoded>${item.expiresAt ? `
      <expirationDate>${escapeXml(item.expiresAt)}</expirationDate>` : ''}
    </item>`.trim();
  }).join('\n');

  const buildDate = new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(instanceName)} - ${escapeXml(communityName)}</title>
    <link>${baseUrl}/</link>
    <description>Long-form posts for ${escapeXml(communityName)}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
