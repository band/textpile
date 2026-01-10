# Textpile Wishlist

Feature ideas and enhancements for future consideration. Not all items may be implemented.

## Post Expiration Awareness

**Status:** Proposed

Add a prominent notice at the top of each post page reminding readers that the content will expire:

> "This post will expire in X days. Save it now if you want to keep it."

**Rationale:** Makes the temporary nature of Textpile explicit to readers who may not be familiar with the platform.

**Implementation notes:**
- Calculate days remaining from `expiresAt` metadata
- Show different messaging for posts expiring soon (< 7 days)
- Style as an info banner, not intrusive

---

## Show Expiration Dates in Index

**Status:** Proposed

Display expiration information alongside creation dates throughout the interface.

**Options:**
- "Created Jan 8 · Expires Feb 8"
- "Created Jan 8 (29 days remaining)"
- Relative time: "Created 2 hours ago · Expires in 29 days"

**Rationale:** Helps readers understand post lifecycle at a glance.

**Implementation notes:**
- Add to index listing
- Add to post view header
- Consider color coding for posts expiring soon

---

## Copy Title and URL Button

**Status:** Proposed

Add a "Copy Title and URL" button alongside the existing "Copy URL" button.

**Format options:**
- `[Title](URL)` (Markdown link)
- `Title - URL` (plain text)
- `Title\nURL` (multi-line)
- Let user configure preference

**Rationale:** Common sharing pattern - people often want to share both title and link together.

**Implementation notes:**
- Use same feedback mechanism as "Copy URL"
- Consider making format configurable via environment variable

---

## Post Comparison Tool

**Status:** Proposed (limited scope)

Provide a way to compare two posts when people submit multiple versions of the same content.

**Approaches:**
- Line-by-line diff (like git diff)
- Side-by-side comparison view
- ~~AI-powered qualitative comparison~~ (out of scope for standard Textpile)

**Use cases:**
- Author posts v1, then posts v2 with edits
- Community posts similar content, want to see differences
- Reviewing edits before reposting

**Implementation notes:**
- Could be client-side JavaScript using a diff library
- Requires way to specify which two posts to compare (URL parameters?)
- Consider privacy implications of cross-referencing posts

---

## Privacy and Security Content Scanning

**Status:** Proposed

Add pre-submission scanning to detect and warn about potential privacy/security risks.

**Detection patterns:**
- Email addresses
- Credit card numbers (Luhn validation)
- National ID numbers (SSN, passport numbers, etc.)
- Keywords: "password", "secret", "api key", "token", etc.
- Phone numbers
- Street addresses (harder, may generate false positives)

**Response levels:**

1. **Warning + Allow:** Email addresses, phone numbers
   - "This post appears to contain an email address. Are you sure you want to post this publicly?"
   - User can confirm or go back to edit

2. **Warning + Strong Discourage:** SSN, passwords, API keys
   - "This post contains what looks like a password or secret key. This is likely a mistake."
   - Require explicit confirmation checkbox

3. **Block:** Credit card numbers, other financial data
   - "Posts containing credit card numbers cannot be submitted. Please remove this information and try again."
   - No way to bypass

**Implementation notes:**
- Client-side scanning (immediate feedback)
- Server-side validation as backup
- Regex patterns for common formats
- Consider false positive rate carefully
- Make patterns configurable via environment variables

**Privacy consideration:** Scanning happens locally/server-side only, no data sent to third parties.

---

## Smart Untitled Post Previews

**Status:** Proposed

When a post has no title, show a meaningful snippet instead of just "(Untitled)".

**Current behavior:**
```
(Untitled)
Created Jan 8, 2026
```

**Proposed behavior:**
```
(Untitled) "Lorem ipsum dolor sit amet, consectetur..."
Created Jan 8, 2026
```

**Snippet extraction algorithm:**
1. Skip common preamble patterns:
   - Markdown headers that are just "Introduction", "Summary", etc.
   - Quoted greetings ("Hi everyone", "Hello", etc.)
   - Common starting phrases ("This is a post about...", "I wanted to share...")
2. Take first 40-60 characters of meaningful content
3. Try to break at word boundaries
4. Add ellipsis if truncated

**Implementation notes:**
- Extract snippet during post submission (store in index)
- Or extract client-side when rendering index (slower but more flexible)
- Consider storing snippet in post metadata for performance
- Fallback to simple truncation if algorithm fails

**Edge cases:**
- Post is only whitespace → "(Untitled - Empty post)"
- Post is only code → Use first line of code
- Post is all Markdown syntax → Strip syntax and extract text

---

## Notes

- Items are listed in rough order of proposal, not priority
- Some items may conflict with Textpile's core philosophy of simplicity
- Implementation complexity varies significantly
- Community feedback welcome on priorities

