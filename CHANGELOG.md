# Changelog

All notable changes to Textpile will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-01-04

### Added
- **ADMIN-GUIDE.md**: Comprehensive administrator's guide
  - Spam prevention strategies (submit tokens, rate limiting)
  - Cloudflare Access setup for authentication
  - Rate limiting configuration with WAF rules
  - Emergency procedures (disable posting, hide posts, remove content)
  - Monitoring and maintenance guidance
  - Cost management and graceful shutdown procedures
- **ARCHITECTURE.md**: Non-technical architectural overview
  - Plain-language explanation of how Textpile works
  - Cost implications and sustainability analysis
  - Risk scenarios (spam, legal issues, user expectations)
  - Social and ethical considerations for operators
  - Decision guide: "Should you run a Textpile?"
  - Clear explanation of operator and user responsibilities
- **CONTRIBUTING.md**: Developer contribution guidelines
  - Bug reporting process and template
  - Feature request guidelines aligned with project philosophy
  - Development setup instructions
  - Coding standards and style guide
  - Pull request workflow
  - Security vulnerability reporting procedures

### Changed
- **README.md**: Added organized Documentation section
  - Categorized guides by audience (Getting Started, Understanding, Admin, Developer)
  - Clear descriptions for each documentation file

## [0.2.0] - 2026-01-04

### Added
- **Auto-expiration feature** (critical missing functionality)
  - User-selectable retention windows: 1 week, 1 month, 3 months, 6 months, 1 year
  - Retention period selector in submit form UI
  - KV entries now use `expirationTtl` for automatic deletion
  - Posts include `expiresAt` metadata for tracking
  - Index filtering: expired items automatically removed at read time
  - 410 Gone response for expired posts with clear explanation page
  - Default retention: 1 month
- **Timing-safe token comparison** (security enhancement)
  - Implemented in `functions/api/submit.js` and `functions/api/remove.js`
  - Uses `crypto.subtle` when available with XOR fallback
  - Prevents timing attacks on SUBMIT_TOKEN and ADMIN_TOKEN
- **Client-side form validation**
  - Body field validated before submission
  - Immediate user feedback
  - Reduces unnecessary API calls
- **Comprehensive documentation** in CLAUDE.md
  - Race condition analysis and mitigation options
  - CORS considerations with implementation examples
  - Security best practices

### Fixed
- **ID generation bug** (functions/api/submit.js:7)
  - Changed `.replace("Z", "Z")` (no-op) to `.replace(/[-:.Z]/g, "")`
  - IDs now properly sortable without trailing "Z"
- **Redundant KV fetches** (functions/p/[id].js:7-14)
  - Reduced from 3 separate fetches to 1 single `getWithMetadata()` call
  - Saves KV read costs and reduces latency by ~200ms
- **XSS vulnerability** (public/index.html:45)
  - URL now escaped before insertion into href attribute
  - Defense-in-depth security enhancement
- **Race condition in index updates** (documented)
  - Added inline code comments explaining read-modify-write pattern
  - Documented acceptable trade-off for low-traffic sites
  - Provided mitigation options for high-traffic scenarios

### Changed
- **Standardized API error responses**
  - All endpoints now return consistent format with `success` field
  - Proper HTTP status codes: 200, 201, 400, 403, 410, 501
  - Clear, actionable error messages
- **Enhanced post view**
  - Shows expiration information in metadata
  - Graceful handling of legacy posts without expiry
- **Submit form UI improvements**
  - Added retention period selector with clear labels
  - Warning text about auto-expiration and no backups
  - HTML5 `required` attribute for body field
- **Style enhancements**
  - Added `select` element styling to match existing form inputs

### Security
- Timing-safe comparison prevents token guessing attacks
- XSS vulnerability patched in index rendering
- HTML escaping applied to all user-generated content

## [0.1.0] - 2026-01-04

### Added
- Initial Textpile implementation
- **Core architecture**: Cloudflare Pages + Functions + KV
- **Public pages**:
  - `public/index.html`: Table of contents page
  - `public/submit.html`: Submission form
  - `public/style.css`: Shared stylesheet with light/dark mode
- **API endpoints**:
  - `GET /api/index`: Returns TOC JSON
  - `POST /api/submit`: Publish new posts
  - `POST /api/remove`: Admin removal endpoint
- **Post rendering**:
  - `GET /p/:id`: Individual post view
  - Client-side Markdown rendering with marked.js
- **Features**:
  - Non-attributed posting (no author identity stored)
  - Instant publishing with sortable IDs
  - Optional SUBMIT_TOKEN for spam prevention
  - Optional ADMIN_TOKEN for quick takedown
  - Index capped at 1000 posts
  - HTML escaping for security
- **Documentation**:
  - README.md with project overview
  - INSTALLATION.md with Cloudflare deployment guide
  - User's Guide.md for end users
  - CLAUDE.md for technical architecture
  - LICENSE (MIT)
  - .gitignore for Node.js/Cloudflare projects

### Known Issues (Fixed in v0.2.0)
- ⚠️ Auto-expiration not implemented (documented but missing)
- ⚠️ ID generation bug (no-op .replace)
- ⚠️ Redundant KV fetches (performance issue)
- ⚠️ XSS vulnerability in index.html
- ⚠️ Non-timing-safe token comparison
- ⚠️ No 410 Gone for expired posts

## Project Philosophy

Textpile is designed to be:
- **Temporary by default**: Forced expiration prevents accidental permanence
- **Low-maintenance by design**: Zero background jobs, no database migrations
- **Non-attributed at artifact layer**: No author metadata stored
- **Socially legible shutdown**: Clear expectations that service may end if burdensome
- **No implied custody**: Authors responsible for their own content archival

---

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (0.x.x → 1.x.x): Breaking changes, incompatible API changes
- **MINOR** (0.0.x → 0.1.x): New features, backwards compatible
- **PATCH** (0.0.0 → 0.0.1): Bug fixes, documentation, backwards compatible

## Links

- [Repository](https://github.com/peterkaminski/textpile) (update with actual URL)
- [Documentation](README.md)
- [Installation Guide](INSTALLATION.md)
- [Contributing Guidelines](CONTRIBUTING.md)

---

**Note**: Dates use YYYY-MM-DD format (ISO 8601).

[Unreleased]: https://github.com/peterkaminski/textpile/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/peterkaminski/textpile/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/peterkaminski/textpile/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/peterkaminski/textpile/releases/tag/v0.1.0
