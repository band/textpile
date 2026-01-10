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

## Delete Code for Self-Service Removal

**Status:** Proposed

After submitting a post, show a unique "delete code" that allows the author to remove their post later without admin intervention.

**User flow:**
1. User submits post successfully
2. Post view page displays:
   ```
   ✓ Post created successfully!

   Delete Code: a7b3c9f2

   [Copy Delete Code]

   Save this code if you want to delete this post later.
   You can delete it at: /remove?code=a7b3c9f2
   ```
3. User can bookmark the delete URL or save the code
4. Later, visiting the delete URL removes the post

**Rationale:**
- Enables self-service deletion without requiring admin contact
- Maintains non-attribution (no account needed)
- Empowers authors to control their content

**Implementation notes:**
- Generate cryptographically random delete code on submission (16-32 chars)
- Store delete code in post metadata: `{ ..., deleteCode: "a7b3c9f2" }`
- Create `/remove` page that accepts `?code=` parameter
- Verify code matches post before deletion
- Consider rate limiting to prevent brute force attacks
- Delete code is single-use (post is removed after use)

**Security considerations:**
- Code must be long enough to prevent guessing (128+ bits entropy)
- Consider expiring delete codes after some time (e.g., 24 hours after post expires)
- Don't leak delete codes in index or public APIs

**Alternative approach:**
- Use delete URL instead: `/delete/<post-id>/<delete-token>`
- Requires both post ID and random token to delete

---

## Community Flagging System

**Status:** Proposed

Allow non-admin users to flag problematic posts, automatically hiding them after N flags from different IP addresses.

**Configuration (environment variables):**
```
FLAG_THRESHOLD=3          # Number of flags needed to hide post
FLAG_ENABLED=true         # Enable/disable flagging feature
FLAG_WINDOW_HOURS=24      # Time window for collecting flags
```

**User flow:**
1. Reader sees concerning post
2. Clicks "Flag this post" icon/button on post view
3. System records flag (IP address, timestamp)
4. Once threshold reached (e.g., 3 different IPs), post is hidden
5. Post remains in index but marked as "Hidden (flagged by community)"

**Implementation notes:**
- Store flags in KV: `flag:<post-id>` → `[{ ip, timestamp }, ...]`
- Check unique IPs (deduplicate by IP address)
- Hidden posts stay in KV but add `hidden: true` to metadata
- Post view shows "This post has been hidden by community flags" message
- Admin can still view and un-hide if needed
- Flags expire after `FLAG_WINDOW_HOURS` to prevent old flags from accumulating

**Anti-abuse measures:**
- Rate limit flags per IP (max N flags per hour)
- Consider requiring simple CAPTCHA for flagging
- Log all flag actions for admin review
- Admin interface to see flagged posts and flag history

**Privacy considerations:**
- Store only hashed IP addresses, not full IPs
- Or use IP address + date (not timestamp) to allow some privacy
- Clear flag data when post expires

**Admin visibility:**
- Admin panel shows flagged posts
- Show flag count and timestamps
- Allow admin to "un-hide" false positives
- Allow admin to "confirm hide" to prevent un-flagging

**Edge cases:**
- What if same person flags from different IPs? (VPN, mobile switching)
- False positives - community might flag legitimate content
- Coordination attacks - group decides to mass-flag

---

## Home Page Filtering and Views

**Status:** Proposed

Add filtering options to the home page for different ways to browse posts.

**Filter options:**

1. **Most Recent 25** (current default)
   - Show latest 25 posts, sorted by creation date

2. **Random 25**
   - Show 25 random posts from the entire index
   - Shuffled each page load
   - Good for discovering older content

3. **All Posts**
   - Show complete index (up to 10,000 posts)
   - Paginated in groups of 50 or 100
   - May be slow/heavy for large instances

4. **Filter by Month**
   - Dropdown or button row: "Jan 2026", "Dec 2025", etc.
   - Show all posts from selected month
   - Display months for which posts exist (not all 12 months)
   - Goes back 12 months or to first post, whichever is less

**UI Design:**

```
┌─────────────────────────────────────────────────────┐
│ Textpile                                            │
│                                                     │
│ View: [Recent 25 ▾] [Random 25] [All] [By Month ▾]│
│                                                     │
│ Post 1 Title                                        │
│ Post 2 Title                                        │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Implementation notes:**

- Use URL parameters: `/?view=recent25`, `/?view=random25`, `/?view=all`, `/?view=month&m=2026-01`
- Recent 25: Existing behavior (default)
- Random 25: Shuffle index client-side or server-side
- All posts: Return full index, implement client-side pagination
- By month: Filter by `createdAt` month in index

**Performance considerations:**
- "All posts" could be heavy (10,000 posts × metadata)
- Consider server-side pagination for "All" view
- Random sampling: shuffle in JavaScript vs server-side
- Cache month lists (months with posts available)

**Additional features:**
- "Surprise me!" button → redirects to random post
- Search within filtered results (future enhancement)
- Combine filters: "Random 25 from March 2026"

**Month filtering logic:**
```javascript
// Extract month from createdAt: "2026-01-08T..."
const postMonth = createdAt.substring(0, 7); // "2026-01"
if (postMonth === selectedMonth) {
  // Include in filtered results
}
```

**Alternative: Date range picker**
- Instead of month dropdown, allow custom date ranges
- "From: 2026-01-01 To: 2026-01-31"
- More flexible but more complex UI

---

## Notes

- Items are listed in rough order of proposal, not priority
- Some items may conflict with Textpile's core philosophy of simplicity
- Implementation complexity varies significantly
- Community feedback welcome on priorities

