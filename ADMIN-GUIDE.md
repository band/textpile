# Textpile Administrator's Guide

This guide covers operational tasks for Textpile administrators, including spam prevention, access control, emergency procedures, and monitoring.

## Table of Contents

- [Spam Prevention](#spam-prevention)
- [Access Control](#access-control)
- [Rate Limiting](#rate-limiting)
- [Emergency Procedures](#emergency-procedures)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Security Best Practices](#security-best-practices)

---

## Spam Prevention

### Submit Token (First Line of Defense)

The simplest anti-spam measure is requiring a shared submit token.

**Enable Submit Token:**

1. Go to Cloudflare Pages → Your Project → Settings → Environment variables
2. Click **Add variable**
3. Set:
   - Variable name: `SUBMIT_TOKEN`
   - Value: A strong random string (e.g., `openssl rand -hex 32`)
   - Environment: Production
4. Click **Save**
5. Redeploy your site

**Share the token privately** with your community members via email, private chat, etc.

**Rotate the token** if it's compromised:
- Generate a new token
- Update the environment variable
- Notify legitimate users
- Old token immediately stops working

### Content Monitoring

**Check recent posts:**
- Visit your Textpile homepage regularly
- Review the table of contents
- Check for spam patterns (gibberish, commercial content, etc.)

**Set up alerts** (optional):
- Use Cloudflare Logpush to send logs to external services
- Monitor for unusual submission patterns
- Alert on high submission rates

---

## Access Control

### Cloudflare Access (Advanced Protection)

Cloudflare Access adds authentication in front of your entire site or specific paths.

#### Protecting the Submit Page

**Step 1: Enable Cloudflare Access**

1. In Cloudflare Dashboard, go to **Zero Trust**
2. Navigate to **Access** → **Applications**
3. Click **Add an application**
4. Select **Self-hosted**

**Step 2: Configure Application**

- Application name: `Textpile Submit`
- Session duration: `24 hours` (or as needed)
- Application domain: `your-textpile.pages.dev` (or custom domain)
- Path: `/submit`

**Step 3: Create Access Policy**

Choose one of these authentication methods:

**Option A: Email-based (Simple)**
- Policy name: `Allowed Submitters`
- Action: `Allow`
- Include: `Emails` → Add allowed email addresses

**Option B: Google Workspace**
- Policy name: `Organization Members`
- Action: `Allow`
- Include: `Emails ending in` → `@yourcompany.com`

**Option C: GitHub (For Open Source Communities)**
- Policy name: `GitHub Team Members`
- Action: `Allow`
- Include: `GitHub` → Select your organization/team

**Step 4: Apply and Test**

1. Click **Save application**
2. Visit `/submit` in an incognito window
3. You should see Cloudflare Access login page
4. Authenticate to confirm it works

#### Protecting the Entire Site

To make the entire Textpile private:

1. Set Path to: `/`
2. This requires authentication for reading AND submitting
3. Useful for internal-only deployments

**Cost**: Cloudflare Access free tier includes 50 users. Beyond that, $3/user/month.

### IP Allow Lists (Advanced)

Restrict access to specific IP ranges:

1. Cloudflare Dashboard → **Security** → **WAF**
2. Create a **Custom Rule**:
   - Name: `Textpile Submit Allowlist`
   - Expression: `(http.request.uri.path contains "/api/submit") and (not ip.src in {1.2.3.4 5.6.7.8})`
   - Action: `Block`

This blocks all submit requests except from specified IPs.

---

## Rate Limiting

### Cloudflare Rate Limiting Rules

Prevent abuse by limiting submission frequency.

**Step 1: Create Rate Limiting Rule**

1. Cloudflare Dashboard → **Security** → **WAF**
2. Go to **Rate limiting rules** tab
3. Click **Create rule**

**Step 2: Configure Rule**

**Example: Limit Submissions**

- Rule name: `Textpile Submit Rate Limit`
- If incoming requests match:
  ```
  (http.request.uri.path eq "/api/submit" and http.request.method eq "POST")
  ```
- Then:
  - Choose action: `Block`
  - Duration: `1 hour`
  - Requests: `10` requests per `1 minute`
  - With the same: `IP`

**Step 3: Save and Deploy**

This allows max 10 posts per minute per IP. Adjust as needed for your community size.

**Recommended Rates:**

- **Small community (< 20 users)**: 5 posts/minute per IP
- **Medium community (20-100 users)**: 10 posts/minute per IP
- **Large community (100+ users)**: 20 posts/minute per IP

**Cost**: Cloudflare Rate Limiting included in free tier (10,000 requests/month). Pro plan: unlimited.

### Application-Level Rate Limiting

For finer control, implement rate limiting in the submit function using KV:

```javascript
// In functions/api/submit.js
const ipKey = `ratelimit:${request.headers.get('CF-Connecting-IP')}`;
const count = await env.KV.get(ipKey);

if (count && parseInt(count) > 10) {
  return Response.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
}

await env.KV.put(ipKey, String((parseInt(count) || 0) + 1), { expirationTtl: 60 });
```

---

## Emergency Procedures

### Disable Posting Immediately

**Method 1: Remove Submit Token** (if using)

1. Cloudflare Pages → Settings → Environment variables
2. Delete the `SUBMIT_TOKEN` variable
3. Redeploy
4. Result: All submissions fail with "Submit token required"

**Method 2: Set Invalid Token**

1. Set `SUBMIT_TOKEN` to a known impossible value (e.g., `DISABLED`)
2. Don't share this value
3. Result: All submissions blocked

**Method 3: Block Submit Endpoint via WAF**

1. Cloudflare Dashboard → Security → WAF → Custom Rules
2. Create rule:
   - Name: `Block Submit`
   - Expression: `(http.request.uri.path eq "/api/submit")`
   - Action: `Block`
3. Result: Immediate 403 Forbidden for all submissions

### Hide All Posts (Emergency Blackout)

**Option 1: Clear the Index** (Reversible)

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login: `wrangler login`
3. Clear index:
   ```bash
   wrangler kv:key put --binding=KV "index" "[]"
   ```
4. Result: Homepage shows "No posts yet" but posts still accessible via direct URL

**Option 2: Replace Homepage** (Quick)

Create a temporary `public/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Textpile - Temporarily Offline</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div style="text-align: center; padding: 60px 20px;">
    <h1>Textpile is temporarily offline</h1>
    <p>We're addressing some issues. Check back soon.</p>
  </div>
</body>
</html>
```

Commit and push. Redeploys in ~1 minute.

**Option 3: Maintenance Mode via WAF**

1. Create custom rule to serve maintenance page for all requests except admin IPs
2. Allows you to review while users see maintenance message

### Remove Individual Posts

**Via API** (if `ADMIN_TOKEN` is set):

```bash
curl -X POST https://your-textpile.pages.dev/api/remove \
  -H 'content-type: application/json' \
  -d '{"id":"POST_ID_HERE","token":"YOUR_ADMIN_TOKEN"}'
```

**Via KV Dashboard** (manual):

1. Cloudflare Dashboard → Workers & Pages → KV
2. Select your Textpile namespace
3. Find key `post:POST_ID`
4. Click **Delete**
5. Also manually edit the `index` key to remove the entry (JSON)

### Nuclear Option: Delete Everything

**Delete all posts and index:**

```bash
wrangler kv:key list --binding=KV | jq -r '.[].name' | xargs -I {} wrangler kv:key delete --binding=KV "{}"
```

**Or via Dashboard:**
1. Delete the entire KV namespace
2. Create a new one with the same name
3. Rebind in Pages settings

---

## Monitoring and Maintenance

### Check Storage Usage

```bash
# List all keys
wrangler kv:key list --binding=KV

# Count total posts
wrangler kv:key list --binding=KV | jq '. | length'
```

### View Recent Activity

**Cloudflare Analytics:**
1. Pages project → Analytics
2. View requests to `/api/submit`
3. Check error rates

**Real-time Logs:**
```bash
wrangler pages deployment tail
```

Shows live function invocations, errors, and console.log output.

### Periodic Cleanup

**Posts auto-expire**, so no manual cleanup needed. However, you can:

**Manually expire old posts** (if needed):
```bash
# List all posts
wrangler kv:key list --binding=KV --prefix="post:"

# Delete specific post
wrangler kv:key delete --binding=KV "post:YYYYMMDDTHHMMSS-xxxxx"
```

**Rebuild index from scratch** (if corrupted):

```javascript
// Script to rebuild index from all posts
const posts = await env.KV.list({ prefix: "post:" });
const index = [];

for (const key of posts.keys) {
  const meta = await env.KV.getWithMetadata(key.name);
  if (meta.metadata) {
    const id = key.name.replace("post:", "");
    index.push({
      id,
      title: meta.metadata.title,
      createdAt: meta.metadata.createdAt,
      expiresAt: meta.metadata.expiresAt,
      url: `/p/${id}`
    });
  }
}

// Sort by creation date, newest first
index.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

await env.KV.put("index", JSON.stringify(index));
```

---

## Security Best Practices

### Protect Your Tokens

**DO:**
- ✅ Use long random tokens (`openssl rand -hex 32`)
- ✅ Store tokens in Cloudflare environment variables (encrypted at rest)
- ✅ Use different tokens for `SUBMIT_TOKEN` and `ADMIN_TOKEN`
- ✅ Rotate tokens periodically (every 3-6 months)
- ✅ Share tokens via secure channels (Signal, encrypted email)

**DON'T:**
- ❌ Commit tokens to git
- ❌ Share tokens in public forums
- ❌ Use simple/guessable tokens
- ❌ Reuse tokens from other services

### Enable HTTPS Only

Cloudflare Pages enforces HTTPS by default, but ensure:

1. Dashboard → SSL/TLS → Overview
2. Encryption mode: **Full** or **Full (strict)**
3. Always Use HTTPS: **On**

### Monitor for Anomalies

Set up alerts for:
- Sudden spike in submissions
- High error rates (might indicate attacks)
- Storage approaching limits
- Unusual traffic patterns

**Cloudflare Notifications:**
1. Dashboard → Notifications
2. Create notification for:
   - WAF events
   - Rate limiting triggered
   - Pages deployment failures

### Regular Security Checklist

**Monthly:**
- [ ] Review recent posts for spam/abuse
- [ ] Check Cloudflare Analytics for unusual patterns
- [ ] Verify rate limiting rules are working
- [ ] Test admin removal endpoint

**Quarterly:**
- [ ] Rotate `SUBMIT_TOKEN` and `ADMIN_TOKEN`
- [ ] Review Cloudflare Access policies (if using)
- [ ] Check for Textpile updates
- [ ] Verify backups of important posts (user responsibility, but remind them)

**Annually:**
- [ ] Review overall usage and decide if continuing service
- [ ] Communicate expectations with community
- [ ] Consider if additional anti-spam measures needed

---

## Troubleshooting

### "Submit token required or invalid"

**Causes:**
- Token not set in environment variables
- Wrong environment (set in Preview but accessing Production)
- Token has spaces or special characters (escape properly)

**Fix:**
- Verify token is set in Production environment
- Redeploy after setting
- Test in incognito window

### Rate Limiting Too Aggressive

**Symptoms:**
- Legitimate users getting blocked
- "Too many requests" errors

**Fix:**
- Increase rate limit thresholds
- Adjust time windows
- Consider using token buckets instead of fixed windows

### Posts Not Expiring

**Causes:**
- Old posts created before v0.2.0 (no TTL set)
- KV TTL not working (rare)

**Fix:**
- Manually delete old posts without `expiresAt` metadata
- Verify TTL is set in submit.js code
- Check Cloudflare KV status page

### Index Growing Too Large

**Symptoms:**
- Slow loading of homepage
- Index exceeding KV value size limit (25 MB)

**Fix:**
- Reduce cap from 1000 to 500 entries (in submit.js)
- Implement pagination
- Archive old entries

---

## Cost Management

### Cloudflare Pricing (as of 2025)

**Free Tier Includes:**
- Pages: Unlimited requests
- Functions: 100,000 invocations/day
- KV: 100,000 reads/day, 1,000 writes/day, 1 GB storage
- Rate Limiting: 10,000 requests/month

**When You'll Need Paid:**

**Workers Paid ($5/month):**
- More than 100,000 function calls/day
- More than 1,000 KV writes/day
- More than 1 GB KV storage

**Typical Small Community (< 50 active users):**
- ~100 posts/day = 100 KV writes
- ~1,000 page views/day = 1,000 function calls
- ~500 posts stored = 1-2 MB
- **Cost: Free tier is sufficient**

**Medium Community (100-500 users):**
- ~500 posts/day = 500 KV writes
- ~5,000 page views/day = 5,000 function calls
- ~2,000 posts stored = 5-10 MB
- **Cost: Still free, approaching limits**

**Large Community (500+ users):**
- May need Workers Paid ($5/month)
- Consider reducing retention windows
- Implement caching

---

## When to Shut Down

Remember: **Textpile is designed to be easy to shut down.**

**Consider shutting down if:**
- Maintenance burden becomes annoying
- Spam is overwhelming despite anti-spam measures
- Community has moved to another platform
- Costs exceed acceptable budget
- You're no longer willing to be responsible for the service

**How to communicate shutdown:**

1. **Give advance notice** (2-4 weeks if possible)
2. **Remind users** that Textpile is temporary by design
3. **Encourage users** to save their own copies
4. **Set all retention to minimum** (1 week) to accelerate expiration
5. **Disable submissions** via methods above
6. **Delete the Pages project** when ready
7. **Delete the KV namespace**

**Sample shutdown message:**

```html
<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px;">
  <h3>⚠️ Textpile Shutting Down</h3>
  <p>This Textpile will shut down on <strong>March 1, 2026</strong>.</p>
  <p>Please save any content you need. Textpile does not maintain backups.</p>
  <p>Thank you for being part of this experiment!</p>
</div>
```

---

## Support and Resources

- **Textpile Documentation**: See [README.md](README.md) and [User's Guide](User's%20Guide.md)
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Cloudflare Community**: https://community.cloudflare.com/
- **Report Security Issues**: Follow [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Remember**: You're providing a service, not making a promise. Set boundaries, communicate clearly, and don't hesitate to shut down if needed.
