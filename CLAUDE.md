# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Textpile is a Cloudflare Pages site with Pages Functions and KV storage that enables small-medium communities to post Markdown content instantly without attribution. Posts expire automatically based on user-selected retention windows, and the system requires zero maintenance (no databases, no builds, no manual review).

## Architecture

### Platform: Cloudflare Pages + Functions + KV

- **Static Assets**: Served from `public/` directory
- **Server Functions**: File-based routing in `functions/` directory
- **Storage**: Cloudflare KV namespace (bound as `env.KV`)

### Directory Structure

```
public/
  index.html      # TOC (table of contents) page
  submit.html     # Submission form
  style.css       # Shared styles
functions/
  api/
    index.js      # GET /api/index - returns TOC JSON
    submit.js     # POST /api/submit - publish new post
    remove.js     # POST /api/remove - admin takedown
  p/
    [id].js       # GET /p/:id - render individual post
```

### Key Routes

- `GET /` - TOC listing (latest posts)
- `GET /submit` - Submission form
- `GET /p/:id` - Individual post view (renders Markdown)
- `GET /api/index` - JSON API for TOC
- `POST /api/submit` - Publish endpoint
- `POST /api/remove` - Admin removal endpoint (optional)

## KV Data Model

### Post Storage
- **Key**: `post:${id}` where ID is sortable timestamp + random suffix
- **Value**: Raw Markdown body text
- **Metadata**: `{ createdAt, title, expiresAt }`
- **TTL**: Automatically expires based on user-selected retention window

### Index Storage
- **Key**: `index`
- **Value**: JSON array of post entries `[{ id, title, createdAt, url, expiresAt }, ...]`
- **Ordering**: Newest first, capped at 1000 entries

### ID Format
`YYYYMMDDTHHMMSSZ-${random}` - sortable by creation time

## Environment Variables

Configure via Cloudflare Pages Settings → Variables and Secrets:

- `SUBMIT_TOKEN` (optional) - Shared token to gate submissions (anti-spam)
- `ADMIN_TOKEN` (optional) - Required for `/api/remove` endpoint

**Behavior**:
- If `SUBMIT_TOKEN` is unset, submissions are open to all
- If set, users must provide it in the submit form
- `ADMIN_TOKEN` enables quick takedown via API

## Expiration & Retention Philosophy

**Core Principle**: Textpile is a temporary reading surface, not an archive.

- Posts expire automatically via KV TTL (no cron jobs needed)
- Maintainers do not back up content
- Authors are responsible for retaining their own copies
- Retention windows: 1 week, 1 month, 3 months, 6 months, 1 year (no "forever")

### Expiration Behavior

- When a post expires, KV automatically deletes it
- `/api/index` filters out expired items at read time
- Expired post URLs return **410 Gone** (not 404)
- No background cleanup tasks required

## Development & Deployment

### Local Development

Cloudflare Pages Functions can be tested locally using Wrangler:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Run local dev server
wrangler pages dev public/

# With KV namespace binding for local development
wrangler pages dev public/ --kv=KV
```

### Deployment

1. **Create KV Namespace** in Cloudflare dashboard (e.g., `COMMUNITY_PASTES`)
2. **Create Pages Project** from GitHub repo
3. **Build Settings**:
   - Framework preset: **None**
   - Build command: *(blank)*
   - Output directory: `public`
4. **Add KV Binding**:
   - Settings → Bindings → KV Namespace
   - Variable name: `KV`
   - Select your namespace
5. **Configure Environment Variables** (optional):
   - `SUBMIT_TOKEN` for submission gating
   - `ADMIN_TOKEN` for admin removal

## Client-Side Rendering

- Markdown rendering uses **marked.js** (loaded from CDN)
- Rendering happens client-side in `/p/:id` to keep Functions lightweight
- HTML escaping is critical for security (prevent XSS)

## Security Considerations

- No authentication or user identity is collected or stored
- HTML escaping required in all user-generated content displays
- Admin takedown requires `ADMIN_TOKEN` in request body
- Optional `SUBMIT_TOKEN` prevents open spam submissions

## Quick Takedown

If `ADMIN_TOKEN` is configured:

```bash
curl -X POST https://YOURDOMAIN/api/remove \
  -H 'content-type: application/json' \
  -d '{"id":"PASTE_ID","token":"ADMIN_TOKEN"}'
```

## Design Philosophy

- **Low-maintenance by design**: Zero background jobs, no database migrations
- **Socially legible shutdown**: Clear expectations that service may end if burdensome
- **No implied custody**: Authors responsible for their own content archival
- **Temporary by default**: Forced expiration prevents accidental permanence
- **Non-attributed at artifact layer**: No author metadata stored
