# Textpile

A low-maintenance Cloudflare Pages + Functions + KV application that enables small-medium communities to post Markdown content instantly without attribution. Posts expire automatically and the system requires zero maintenance.

## What is Textpile?

Textpile is a temporary reading surface for communities - not an archive. It's designed for groups that want to share long-form content without the burden of permanent storage, user accounts, or complex moderation.

**Key Features:**
- **Non-attributed posting**: No author identity collected or stored
- **Auto-expiring content**: Posts expire automatically based on user-selected retention windows
- **Zero maintenance**: No databases, no builds, no cron jobs, no manual review
- **Instant publishing**: Submit Markdown or plain text, get a URL immediately
- **Optional access control**: Optional shared submit token to prevent spam
- **Quick takedown**: Admin API for rapid content removal if needed

## Core Philosophy

> **Textpile is a temporary reading surface, not an archive.**
> Posts expire automatically. Maintainers do not back them up.
> Authors are responsible for retaining their own copies.

This design choice dramatically lowers operational burden and makes clear that if maintaining Textpile becomes burdensome, it may be shut down without notice.

## Routes

- `GET /` - Table of contents (latest posts)
- `GET /submit` - Submission form
- `GET /p/:id` - Individual post view
- `GET /api/index` - JSON API for TOC
- `POST /api/submit` - Publish endpoint
- `POST /api/remove` - Admin removal endpoint (optional)

## Technology Stack

- **Cloudflare Pages**: Static asset hosting
- **Cloudflare Pages Functions**: Server-side API endpoints
- **Cloudflare KV**: Key-value storage with automatic TTL expiration
- **marked.js**: Client-side Markdown rendering (CDN)

## Quick Start

See [INSTALLATION.md](INSTALLATION.md) for detailed deployment instructions.

For usage information, see [User's Guide.md](User's%20Guide.md).

## Authorship & License

**Authors**: ChatGPT 5.2, Claude Code Sonnet 4.5, and Peter Kaminski
**Copyright**: Peter Kaminski
**License**: MIT (see [LICENSE](LICENSE))

## Design Principles

- **Low-maintenance by design**: Zero background jobs, no database migrations
- **Socially legible shutdown**: Clear expectations that service may end if burdensome
- **No implied custody**: Authors responsible for their own content archival
- **Temporary by default**: Forced expiration prevents accidental permanence
- **Non-attributed at artifact layer**: No author metadata stored
