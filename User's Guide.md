# Textpile User's Guide

## For Authors: Submitting Content

### How to Submit a Post

1. Navigate to the `/submit` page on your Textpile instance
2. Enter an optional title (max 140 characters)
3. Paste your content in Markdown or plain text
4. If required, enter the shared submit token
5. Click "Publish"
6. You'll be redirected to your published post

### Important Notes for Authors

**Textpile does not retain your content permanently:**
- Posts expire automatically based on retention settings
- Maintainers do not back up content
- **Keep your own copy** of everything you submit
- Save the Textpile URL along with your local copy

**No attribution is stored:**
- Textpile does not collect or store author identity
- Keep attribution and context in your own records
- Consider including version strings in your document title (e.g., "v2026-01-04-001")

### Content Formatting

Textpile supports Markdown formatting:

```markdown
# Heading 1
## Heading 2

**Bold text**
*Italic text*

- Bullet points
- Work great

[Links](https://example.com) are supported

> Blockquotes for emphasis

`inline code` and

```
code blocks
```
```

### Retention Windows

When expiration is enabled, posts automatically expire after:
- 1 week
- 1 month
- 3 months
- 6 months
- 1 year

**There is no "forever" option.** This is intentional to keep Textpile low-maintenance.

### What Happens When a Post Expires

When your post expires:
- The content is automatically deleted from storage
- The post URL will return "410 Gone"
- It will disappear from the table of contents
- **There is no recovery** - maintainers do not have backups

## For Readers: Finding and Reading Content

### Browsing Posts

The main page (`/`) displays the table of contents:
- Posts are listed newest first
- Each entry shows: title (or "untitled"), creation date, and post ID
- Click any title to read the full post

### Reading a Post

Individual posts (`/p/:id`) display:
- Title
- Creation timestamp
- Post ID
- Full Markdown-rendered content

### Expired Content

If you visit a URL for an expired post, you'll see:
- **410 Gone** status (not 404)
- A message explaining the content has expired
- Reminder that Textpile doesn't retain backups

## For Administrators

### Optional Submit Token

If `SUBMIT_TOKEN` is configured as an environment variable:
- Users must provide the token when submitting
- Share the token privately with your community
- Prevents open spam submissions

If `SUBMIT_TOKEN` is not set:
- Anyone can submit posts
- Useful for fully open communities or internal networks

### Quick Takedown

If `ADMIN_TOKEN` is configured, you can remove posts via API:

```bash
curl -X POST https://YOURDOMAIN/api/remove \
  -H 'content-type: application/json' \
  -d '{"id":"POST_ID_HERE","token":"YOUR_ADMIN_TOKEN"}'
```

This immediately:
- Deletes the post from KV storage
- Removes it from the table of contents
- Makes the URL return 404

### Maintenance Expectations

**Textpile is designed to require zero ongoing maintenance:**
- No database backups needed
- No manual content moderation required
- No sweeper jobs or cron tasks
- KV handles expiration automatically

**If maintenance becomes burdensome:**
- It's socially acceptable to shut down Textpile
- Users know this is a temporary surface
- No implied promise of stewardship

## Community Guidelines

### Recommended Practices

**For users:**
- Keep your own archive of submitted content
- Include title + version in your documents
- Add Textpile URLs back to your own records

**For maintainers:**
- Set clear expectations about retention
- Use `SUBMIT_TOKEN` if spam becomes an issue
- Don't hesitate to shut down if overhead grows

### What Textpile Is Not

- **Not an archive**: Content expires automatically
- **Not a publishing platform**: No author profiles or attribution
- **Not a discussion forum**: No comments or replies
- **Not a permanent record**: Maintainers can shut down anytime

### What Textpile Is

- **A temporary reading surface**: Share content for limited time
- **A coordination tool**: Complement to email/chat for long-form posts
- **A low-burden service**: Easy to maintain, easy to shut down
- **A conscious choice**: Temporary by design, not by accident
