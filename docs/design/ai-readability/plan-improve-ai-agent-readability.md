# Plan: Improve AI Agent Readability

## Goal

Make Textpile content easily readable and parseable by AI agents, web crawlers, and accessibility tools by adding semantic markup, structured data, content negotiation, and progressive enhancement patterns.

## Current Baseline

### Post List (public/index.html)
- Client-side JavaScript renders post list from `/api/index`
- Generic `<div class="card">` containers without semantic HTML
- Plain text metadata strings (no machine-readable dates)
- Visual indicators (📌) without semantic meaning
- Shows "Loading..." to non-JavaScript agents

### Individual Posts (functions/p/[id].js)
- Returns HTML with empty `<article id="content"></article>`
- Content rendered client-side via marked.js from inline JSON
- Uses `<article>` element but minimal semantic structure
- Metadata in plain text format
- No structured data (JSON-LD, microdata, schema.org)
- No alternate format access (plain text, markdown)

### Missing Infrastructure
- No robots.txt
- No sitemap.xml
- No OpenGraph/Twitter Card metadata
- No content negotiation support
- Limited accessibility markup

## Principles

- **Progressive enhancement** - Content must be accessible without JavaScript
- **Standards-compliant** - Use established web standards (HTML5 semantic elements, HTTP content negotiation, Schema.org)
- **Zero breaking changes** - Existing URLs and user flows remain unchanged
- **Minimal performance impact** - Server-side rendering should not significantly increase function execution time
- **Maintainability** - Avoid duplicating rendering logic between server and client

## Tier 1: High-Impact Improvements

### 1. Server-Side Content Rendering (No-JS Fallback)

**Problem**: AI agents without JavaScript execution see empty content containers.

**Solution**: Render markdown to HTML on the server in `functions/p/[id].js`.

**Implementation**:
- Add marked.js as a dependency for server-side use (via npm)
- Import and configure marked in the post rendering function
- Render markdown to HTML server-side before returning response
- Keep client-side rendering for interactive features (toggle plain/formatted view)
- Add data attribute with raw markdown for client-side access

**Code approach**:
```javascript
import { marked } from 'marked';

// Configure marked (match client-side config)
marked.setOptions({
  breaks: true,
  gfm: true,
});

// In response HTML
const renderedHtml = marked.parse(body);

// Include both rendered and raw
<article id="content">${renderedHtml}</article>
<script>
  const raw = ${JSON.stringify(body)};
  // Client-side toggle still works
</script>
```

**Benefits**:
- AI agents see content immediately
- Better SEO
- Screen readers get content faster
- Graceful degradation for users with JS disabled

### 2. Semantic HTML Structure

**Problem**: Generic divs and plain text metadata are hard for machines to parse.

**Solution**: Use semantic HTML5 elements and structured metadata.

**Changes for Post List (public/index.html)**:
```html
<!-- Before -->
<div class="card">
  <div><a href="/p/abc123">📌 My Post</a></div>
  <div class="meta">Created 2024-01-15 20:30 · Expires 2024-02-15 · abc123</div>
</div>

<!-- After -->
<article class="card" data-pinned="true">
  <h2><a href="/p/abc123">My Post</a></h2>
  <dl class="meta">
    <dt>Created</dt>
    <dd><time datetime="2024-01-15T20:30:00Z">2024-01-15 20:30</time></dd>
    <dt>Expires</dt>
    <dd><time datetime="2024-02-15T23:59:59Z">2024-02-15 (31 days)</time></dd>
    <dt>ID</dt>
    <dd>abc123</dd>
  </dl>
  <span class="pin-indicator" aria-label="Pinned post">📌</span>
</article>
```

**Changes for Individual Posts (functions/p/[id].js)**:
```html
<!-- Add semantic metadata -->
<article id="content">
  <header>
    <h1>${escapeHtml(title || "(untitled)")}</h1>
    <dl class="meta">
      <dt>Created</dt>
      <dd><time datetime="${createdAt}">${escapeHtml(formattedDate)}</time></dd>
      <dt>Expires</dt>
      <dd><time datetime="${expiresAt}">${escapeHtml(expirationInfo)}</time></dd>
      <dt>Post ID</dt>
      <dd>${escapeHtml(id)}</dd>
    </dl>
  </header>

  <div class="post-body">
    ${renderedHtml}
  </div>
</article>
```

**Benefits**:
- AI agents can extract dates, titles, IDs programmatically
- Screen readers provide better navigation
- Easier to style with CSS (target `<time>` elements)
- Standards-compliant semantic structure

### 3. Content Negotiation for Markdown/Plain Text

**Problem**: AI agents have no way to request raw markdown without HTML parsing.

**Solution**: Implement HTTP content negotiation on `/p/[id]` endpoint.

**Implementation**:
```javascript
export async function onRequestGet({ params, env, request }) {
  // ... existing KV fetch logic ...

  const accept = request.headers.get('accept') || '';

  // Support both text/markdown and text/plain
  if (accept.includes('text/markdown') || accept.includes('text/plain')) {
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/markdown; charset=utf-8',
        'cache-control': 'no-store',
        'content-disposition': `inline; filename="${sanitizeFilename(title || id)}.md"`,
      },
    });
  }

  // ... existing HTML rendering ...

  // Add Link header to advertise alternate format
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'link': `</p/${id}>; rel="alternate"; type="text/markdown"`,
    },
  });
}
```

**Advertising in HTML**:
```html
<head>
  <!-- ... existing head content ... -->
  <link rel="alternate" type="text/markdown" href="/p/${id}">
</head>
```

**Optional human-accessible query param**:
- Support `?format=text` query parameter as explicit override
- Makes it easy for users to share raw markdown links

**Benefits**:
- Standard REST API practice
- AI agents can request format they need
- Single URL serves multiple representations
- Discoverable via `<link rel="alternate">`

### 4. JSON-LD Structured Data

**Problem**: No machine-readable structured data for search engines and AI agents.

**Solution**: Add Schema.org BlogPosting markup via JSON-LD.

**Implementation in functions/p/[id].js**:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${escapeHtml(title || 'Untitled Post')}",
  "datePublished": "${createdAt}",
  "dateModified": "${createdAt}",
  ${expiresAt ? `"expires": "${expiresAt}",` : ''}
  "author": {
    "@type": "Organization",
    "name": "Anonymous"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Textpile",
    "url": "${env.BASE_URL || 'https://textpile.org'}"
  },
  "articleBody": ${JSON.stringify(body)},
  "url": "${env.BASE_URL || ''}${url}",
  "identifier": "${id}"
}
</script>
```

**Benefits**:
- Google, Bing, and other search engines understand content structure
- AI agents can extract structured data without parsing HTML
- Rich snippets in search results
- Standard way to express content metadata

## Tier 2: Medium-Impact Improvements

### 5. OpenGraph and Twitter Card Meta Tags

**Problem**: Link previews in social media and AI tools are generic or missing.

**Solution**: Add OpenGraph and Twitter Card meta tags to post pages.

**Implementation in functions/p/[id].js**:
```html
<head>
  <!-- Existing head content -->

  <!-- OpenGraph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title || 'Untitled Post')}">
  <meta property="og:description" content="${escapeHtml(generateExcerpt(body, 200))}">
  <meta property="og:url" content="${env.BASE_URL || ''}${url}">
  <meta property="og:site_name" content="Textpile">
  ${createdAt ? `<meta property="article:published_time" content="${createdAt}">` : ''}
  ${expiresAt ? `<meta property="article:expiration_time" content="${expiresAt}">` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title || 'Untitled Post')}">
  <meta name="twitter:description" content="${escapeHtml(generateExcerpt(body, 200))}">
</head>
```

**Utility function needed**:
```javascript
function generateExcerpt(markdown, maxLength) {
  // Strip markdown syntax, get first paragraph, truncate
  const plainText = markdown
    .replace(/[#*`_~\[\]]/g, '')  // Remove markdown chars
    .replace(/\n\n+/g, ' ')        // Collapse paragraphs
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength - 3) + '...';
}
```

**Benefits**:
- Better link previews in Slack, Discord, Twitter, LinkedIn
- AI agents that parse OpenGraph data get structured info
- Improved social sharing experience

### 6. Better Accessibility & ARIA Markup

**Problem**: Limited semantic landmarks and ARIA labels.

**Solution**: Add ARIA landmarks, skip links, and improved heading hierarchy.

**Changes to both index.html and functions/p/[id].js**:
```html
<body>
  <!-- Skip link for keyboard navigation -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header role="banner">
    <!-- existing header -->
  </header>

  <nav role="navigation" aria-label="Site navigation">
    <!-- nav links -->
  </nav>

  <main id="main-content" role="main">
    <!-- page content -->
  </main>

  <footer role="contentinfo">
    <!-- footer content -->
  </footer>
</body>
```

**CSS for skip link**:
```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

**Benefits**:
- Screen reader users get better navigation
- AI agents parsing page structure understand content organization
- Keyboard navigation improved
- WCAG compliance

### 7. robots.txt and sitemap.xml

**Problem**: No guidance for crawlers on what to index, no systematic content discovery.

**Solution**: Add robots.txt and dynamic sitemap generation.

**Create public/robots.txt**:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://yourdomain.com/sitemap.xml
```

**Create functions/sitemap.xml.js**:
```javascript
export async function onRequestGet({ env }) {
  const kvError = checkKvNamespace(env);
  if (kvError) return kvError;

  const indexData = await env.KV.get("index");
  if (!indexData) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'content-type': 'application/xml' },
    });
  }

  const items = JSON.parse(indexData);
  const baseUrl = env.BASE_URL || 'https://textpile.org';
  const now = Date.now();

  // Filter expired posts
  const activeItems = items.filter(item => {
    if (!item.expiresAt) return true;
    return new Date(item.expiresAt).getTime() > now;
  });

  const urls = activeItems.map(item => {
    const lastmod = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '';
    return `
    <url>
      <loc>${escapeXml(baseUrl + item.url)}</loc>
      ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
      <changefreq>never</changefreq>
      <priority>${item.pinned ? '0.9' : '0.5'}</priority>
    </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
```

**Benefits**:
- Search engines discover content systematically
- AI crawlers respect rate limits and access rules
- Better SEO through proper sitemap
- Expired posts automatically excluded from index

## Tier 3: Nice-to-Have Improvements

### 8. RSS Feed Enhancements

**Problem**: Need to verify RSS feed includes full content and proper metadata.

**Review and enhance functions/feed.xml.js**:
- Ensure `<description>` or `<content:encoded>` contains full post body
- Include proper `<guid>` elements
- Add `<pubDate>` in RFC 822 format
- Consider adding custom elements for expiration date
- Validate against RSS 2.0 spec

**Example enhancement**:
```xml
<item>
  <title>${escapeXml(title)}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <pubDate>${formatRFC822(createdAt)}</pubDate>
  <description><![CDATA[${renderedHtml}]]></description>
  ${expiresAt ? `<expirationDate>${expiresAt}</expirationDate>` : ''}
</item>
```

**Benefits**:
- RSS readers get full content
- AI agents monitoring RSS get complete posts
- Better content distribution

### 9. Link Relations

**Problem**: Missing standard link relations for content discovery.

**Solution**: Add appropriate `<link rel="">` tags.

**Implementation in post pages**:
```html
<head>
  <!-- Canonical URL -->
  <link rel="canonical" href="${env.BASE_URL || ''}${url}">

  <!-- Alternate formats -->
  <link rel="alternate" type="text/markdown" href="${url}">
  <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml">

  <!-- Navigation hints (if applicable) -->
  ${prevPostUrl ? `<link rel="prev" href="${prevPostUrl}">` : ''}
  ${nextPostUrl ? `<link rel="next" href="${nextPostUrl}">` : ''}

  <!-- Homepage -->
  <link rel="home" href="/">
</head>
```

**Benefits**:
- Agents understand content relationships
- Better SEO via canonical URLs
- Improved content discovery

## Implementation Order

### Phase 1: Core Server-Side Rendering
1. Add marked as npm dependency
2. Implement server-side markdown rendering in `functions/p/[id].js`
3. Preserve client-side toggle functionality
4. Test with various markdown samples

### Phase 2: Semantic HTML
1. Update post list rendering in `public/index.html`
2. Update post page structure in `functions/p/[id].js`
3. Add CSS for new semantic elements (maintain visual appearance)
4. Update date formatting utilities to support `<time datetime="">`

### Phase 3: Content Negotiation
1. Implement Accept header detection in `functions/p/[id].js`
2. Add markdown/plain text response path
3. Add `Link:` HTTP header
4. Add `<link rel="alternate">` in HTML
5. Optional: add `?format=text` query param support

### Phase 4: Structured Data
1. Add JSON-LD script to post pages
2. Add OpenGraph meta tags
3. Add Twitter Card meta tags
4. Test with validation tools

### Phase 5: Accessibility & Infrastructure
1. Add ARIA landmarks
2. Add skip links and CSS
3. Create `public/robots.txt`
4. Implement `functions/sitemap.xml.js`
5. Review and enhance RSS feed

### Phase 6: Link Relations
1. Add canonical and alternate links
2. Add navigation hints if applicable

## Testing Plan

### Manual Testing
1. **No-JS test**: Disable JavaScript in browser, verify post content visible
2. **Screen reader test**: Use VoiceOver/NVDA to navigate pages
3. **Crawler simulation**: Use curl with various Accept headers
4. **Validation**: Run through HTML validator, accessibility checker

### Automated Testing
1. Test content negotiation:
   ```bash
   curl -H "Accept: text/markdown" https://domain.com/p/abc123
   curl -H "Accept: text/plain" https://domain.com/p/abc123
   curl -H "Accept: text/html" https://domain.com/p/abc123
   ```

2. Validate structured data:
   - Google Rich Results Test
   - Schema.org validator
   - OpenGraph debugger (Facebook, LinkedIn)

3. Test sitemap:
   ```bash
   curl https://domain.com/sitemap.xml
   # Validate XML structure
   ```

### Regression Testing
- Verify existing user flows unchanged
- Test post submission still works
- Verify client-side features (copy, download, toggle) still work
- Check mobile responsiveness maintained

## Files Expected to Change

### New Files
- `docs/design/ai-readability/plan-improve-ai-agent-readability.md` (this file)
- `public/robots.txt`
- `functions/sitemap.xml.js`

### Modified Files
- `package.json` - add marked dependency
- `functions/p/[id].js` - server-side rendering, content negotiation, semantic HTML, structured data
- `public/index.html` - semantic HTML for post list
- `public/style.css` - styles for semantic elements, skip link
- `functions/feed.xml.js` - RSS enhancements (if needed)
- `User's Guide.md` - document content negotiation feature

### Utility Functions
- May need to create `functions/lib/markdown.js` for shared marked configuration
- May need to create `functions/lib/excerpt.js` for meta description generation
- May need to create `functions/lib/xml.js` for XML escaping in sitemap

## Performance Considerations

- **Server-side rendering**: Marked is fast (~1-2ms for typical posts), minimal impact
- **Sitemap generation**: Cache sitemap for 1 hour to reduce KV reads
- **No additional KV operations**: All changes use existing data
- **Minimal HTML size increase**: JSON-LD and meta tags add ~1-2KB

## Security Considerations

- **Marked configuration**: Ensure no unsafe HTML rendering enabled
- **XML escaping**: Properly escape content in sitemap.xml
- **Content negotiation**: Validate Accept header input
- **No new attack surface**: Content negotiation returns same data, different format

## Documentation Updates

Update `User's Guide.md` to document:
- How to request markdown format: `curl -H "Accept: text/markdown" <url>`
- Query parameter alternative: `<url>?format=text`
- Sitemap location for indexing tools

## Success Metrics

After implementation:
1. ✅ AI agents without JavaScript can read full post content
2. ✅ Posts validate as BlogPosting in Schema.org validator
3. ✅ OpenGraph previews work in Slack, Discord, Twitter
4. ✅ Sitemap lists all active posts
5. ✅ Content negotiation returns markdown when requested
6. ✅ Screen readers navigate pages efficiently
7. ✅ All semantic HTML validates

## Out of Scope

- WYSIWYG editor
- Full-text search API
- JSON API for posts (could add later if needed)
- Historical post archive/changelog
- Automated AI agent testing framework
- Content recommendation algorithms

## Future Enhancements

After initial implementation, consider:
- JSON API endpoint (`Accept: application/json`) returning structured post data
- Atom feed in addition to RSS
- WebSub/PubSubHubbub for real-time feed updates
- Microformats2 markup (h-entry) for IndieWeb compatibility
- ActivityPub integration for federation
