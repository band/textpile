# Textpile

This is a new open source tool called "Textpile". Here are implementation instructions / guidelines.

It implements a **Cloudflare Pages site + Pages Functions + KV so a small-medium community can post Markdown instantly, anonymously-at-the-artifact layer, with an auto-updating TOC, and easy takedown.

---

# What we’re building (minimal but real)

- `GET /` — TOC (latest posts)
- `GET /p/:id` — read a post
- `GET /api/index` — returns TOC JSON (from KV)
- `POST /api/submit` — accepts `{ title?, body }` and publishes immediately
- Optional: `POST /api/hide` — remove from TOC (quick takedown)

Below is a complete “drop-in repo” you can create, push to GitHub, and deploy on **Cloudflare Pages**. It gives you:

- `/` TOC (auto-updates instantly)
- `/submit` submit form (title + markdown/text)
- `POST /api/submit` publish immediately (no identity fields)
- `/p/<id>` read post (renders Markdown)
- `POST /api/remove` quick takedown (optional admin token)

No database, no builds, no manual review. Just Pages + Functions + KV.

---

## 1) Create this repo structure

```
community-pastes/
  public/
    index.html
    submit.html
    style.css
  functions/
    api/
      index.js
      submit.js
      remove.js
    p/
      [id].js
```

---

## 2) Paste these files

### `public/style.css`

```css
:root { color-scheme: light dark; }
body { font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 860px; margin: 32px auto; padding: 0 16px; }
header { display: flex; gap: 12px; align-items: baseline; justify-content: space-between; margin-bottom: 18px; }
h1 { font-size: 22px; margin: 0; }
a { text-decoration: none; }
a:hover { text-decoration: underline; }
.card { border: 1px solid rgba(127,127,127,.35); border-radius: 12px; padding: 14px 16px; margin: 12px 0; }
.meta { opacity: .75; font-size: 13px; margin-top: 6px; }
.small { font-size: 13px; opacity: .8; }
textarea, input { width: 100%; box-sizing: border-box; font: inherit; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(127,127,127,.35); background: transparent; }
textarea { min-height: 260px; }
button { font: inherit; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(127,127,127,.35); background: rgba(127,127,127,.12); cursor: pointer; }
button:hover { background: rgba(127,127,127,.18); }
.row { display: grid; gap: 10px; }
.actions { display: flex; gap: 10px; align-items: center; }
hr { border: 0; border-top: 1px solid rgba(127,127,127,.25); margin: 18px 0; }
pre { overflow: auto; padding: 12px; border-radius: 12px; border: 1px solid rgba(127,127,127,.25); }
```

### `public/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Community Pastes</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header>
      <h1>Community Pastes</h1>
      <div class="actions">
        <a href="/submit">Submit</a>
      </div>
    </header>

    <p class="small">
      Long-form posts for the list. No author attribution stored here; keep metadata in email.
    </p>

    <div id="status" class="small">Loading…</div>
    <div id="list"></div>

    <script type="module">
      const status = document.getElementById("status");
      const list = document.getElementById("list");

      function escapeHtml(s) {
        return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
      }

      try {
        const res = await fetch("/api/index", { headers: { "accept": "application/json" }});
        if (!res.ok) throw new Error(`Index fetch failed: ${res.status}`);
        const data = await res.json();

        const items = Array.isArray(data.items) ? data.items : [];
        status.textContent = items.length ? `${items.length} posts` : "No posts yet.";

        list.innerHTML = items.map(it => {
          const title = it.title ? escapeHtml(it.title) : "(untitled)";
          const created = it.createdAt ? new Date(it.createdAt).toLocaleString() : "";
          return `
            <div class="card">
              <div><a href="${it.url}">${title}</a></div>
              <div class="meta">${escapeHtml(created)} · ${escapeHtml(it.id)}</div>
            </div>
          `;
        }).join("");
      } catch (err) {
        status.textContent = "Failed to load posts.";
        list.innerHTML = `<pre>${String(err?.stack || err)}</pre>`;
      }
    </script>
  </body>
</html>
```

### `public/submit.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Submit · Community Pastes</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header>
      <h1>Submit</h1>
      <div class="actions"><a href="/">TOC</a></div>
    </header>

    <p class="small">
      Paste plain text or Markdown. This page does not collect author identity; keep attribution and context in the email thread.
    </p>

    <form id="form" class="row">
      <label>
        Title (optional)
        <input id="title" name="title" maxlength="140" placeholder="e.g. Prompt + reply: political analysis framing" />
      </label>

      <label>
        Body (required)
        <textarea id="body" name="body" placeholder="Paste Markdown or plain text here"></textarea>
      </label>

      <div class="actions">
        <button type="submit" id="btn">Publish</button>
        <span id="msg" class="small"></span>
      </div>

      <hr />

      <details>
        <summary class="small">Optional: shared submit token</summary>
        <p class="small">
          If the site owner has enabled a submit token, paste it here. Otherwise leave blank.
        </p>
        <input id="token" name="token" placeholder="submit token (if required)" />
      </details>
    </form>

    <script type="module">
      const form = document.getElementById("form");
      const msg = document.getElementById("msg");
      const btn = document.getElementById("btn");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        msg.textContent = "";
        btn.disabled = true;

        const title = document.getElementById("title").value.trim();
        const body = document.getElementById("body").value;
        const token = document.getElementById("token").value.trim();

        try {
          const res = await fetch("/api/submit", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: title || null, body, token: token || null })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || `Submit failed: ${res.status}`);
          }

          msg.textContent = "Published. Redirecting…";
          window.location.href = data.url;
        } catch (err) {
          msg.textContent = String(err.message || err);
        } finally {
          btn.disabled = false;
        }
      });
    </script>
  </body>
</html>
```

---

## 3) Pages Functions (server-side)

### `functions/api/index.js`

```js
export async function onRequestGet({ env }) {
  const raw = await env.KV.get("index");
  const items = raw ? JSON.parse(raw) : [];
  return Response.json({ items }, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
```

### `functions/api/submit.js`

```js
function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  // Sortable-ish: YYYYMMDDTHHMMSSZ + random
  const t = new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z");
  const r = Math.random().toString(36).slice(2, 8);
  return `${t}-${r}`;
}

function clampTitle(title) {
  if (!title) return null;
  const t = String(title).trim().slice(0, 140);
  return t.length ? t : null;
}

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON body." }, { status: 400 });
  }

  // Optional shared token gate: if SUBMIT_TOKEN is set, require it.
  const required = env.SUBMIT_TOKEN;
  if (required) {
    const token = (data?.token ? String(data.token) : "").trim();
    if (!token || token !== required) {
      return Response.json({ error: "Submit token required or invalid." }, { status: 403 });
    }
  }

  const body = data?.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    return Response.json({ error: "Body is required." }, { status: 400 });
  }

  // No author identity accepted/stored. Title only.
  const title = clampTitle(data?.title);
  const id = makeId();
  const createdAt = nowIso();
  const url = `/p/${encodeURIComponent(id)}`;

  // Store post and metadata.
  await env.KV.put(`post:${id}`, body, { metadata: { createdAt, title } });

  // Update index (prepend newest). Cap for sanity.
  const rawIndex = await env.KV.get("index");
  const index = rawIndex ? JSON.parse(rawIndex) : [];

  const entry = { id, title, createdAt, url };
  const next = [entry, ...index].slice(0, 1000);

  await env.KV.put("index", JSON.stringify(next));

  return Response.json({ id, url });
}
```

### `functions/p/[id].js`

```js
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

export async function onRequestGet({ params, env }) {
  const id = params.id;
  const body = await env.KV.get(`post:${id}`, { type: "text" });
  if (!body) return new Response("Not found", { status: 404 });

  // Pull title from KV metadata if available
  const withMeta = await env.KV.get(`post:${id}`, { type: "text" });
  const meta = await env.KV.getWithMetadata
    ? await env.KV.getWithMetadata(`post:${id}`)
    : null;

  const title = meta?.metadata?.title || null;
  const createdAt = meta?.metadata?.createdAt || null;

  // Render Markdown client-side using marked (CDN) to keep the function tiny.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title || "Post")}</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header>
    <h1>${escapeHtml(title || "(untitled)")}</h1>
    <div class="actions">
      <a href="/">TOC</a>
      <a href="/submit">Submit</a>
    </div>
  </header>

  <div class="meta">${escapeHtml(createdAt ? new Date(createdAt).toLocaleString() : "")} · ${escapeHtml(id)}</div>
  <hr />

  <article id="content"></article>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
    const raw = ${JSON.stringify(body)};
    document.getElementById("content").innerHTML = marked.parse(raw);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
```

### `functions/api/remove.js` (optional takedown)

```js
export async function onRequestPost({ request, env }) {
  const token = env.ADMIN_TOKEN;
  if (!token) {
    return Response.json({ error: "ADMIN_TOKEN not configured." }, { status: 501 });
  }

  let data;
  try { data = await request.json(); }
  catch { return Response.json({ error: "Expected JSON body." }, { status: 400 }); }

  if ((data?.token || "") !== token) {
    return Response.json({ error: "Invalid admin token." }, { status: 403 });
  }

  const id = String(data?.id || "").trim();
  if (!id) return Response.json({ error: "id required." }, { status: 400 });

  await env.KV.delete(`post:${id}`);

  const rawIndex = await env.KV.get("index");
  const index = rawIndex ? JSON.parse(rawIndex) : [];
  const next = index.filter((it) => it?.id !== id);
  await env.KV.put("index", JSON.stringify(next));

  return Response.json({ ok: true });
}
```

---

## 4) Deploy on Cloudflare Pages

1. Create a **KV namespace** named e.g. `COMMUNITY_PASTES`
2. Create a **Cloudflare Pages project** from this GitHub repo
3. Build settings:

- Framework preset: **None**
- Build command: *(blank)*
- Output directory: `public`

4. Add binding:

- Settings → Bindings → KV Namespace
  - Variable name: `KV`
  - Select your namespace

5. (Recommended) Add secrets:

- Settings → Variables and Secrets
  - `SUBMIT_TOKEN` = a shared token you email to the list (optional but protects from spam)
  - `ADMIN_TOKEN` = for takedown via `/api/remove` (optional)

Behavior:

- If `SUBMIT_TOKEN` is **unset**, submit is open.
- If it’s **set**, users must paste it in the submit page.

---

## 5) How to remove a post quickly

If you set `ADMIN_TOKEN`, you can remove via curl:

```bash
curl -X POST https://YOURDOMAIN/api/remove \
  -H 'content-type: application/json' \
  -d '{"id":"PASTE_ID_HERE","token":"YOUR_ADMIN_TOKEN"}'
```

---

One of the principles of running a Textpile is that it should be very low-maintenance, and the community should know if it has much overhead (time, legal ramifications, annoying support emails), the maintainers will likely turn it off / shut it down / delete everything.

This fits Textpile’s character perfectly:\
**low-maintenance by design, socially legible shutdown conditions, and no implied custody.**

What you’re describing is not just a feature tweak; it’s a **governance stance encoded in defaults**.

Below is a clean way to bake this in without adding operational burden.

---

## Core principle (state it explicitly)

> **Textpile is a temporary reading surface, not an archive.**\
> Posts expire automatically. Maintainers do not back them up.\
> Authors are responsible for retaining their own copies.

That sentence alone does a lot of work—technically, socially, and legally.

---

## Expiration model (simple, explicit, configurable)

### Submission-time choice (recommended)

At submit time, the poster selects **one of a small set of retention windows**:

- 1 week
- 1 month
- 3 months
- 6 months
- 1 year

No “forever.”\
No custom dates.\
No silent defaults.

This:

- forces conscious choice
- avoids accidental permanence
- mirrors PrivateBin’s ethos without copying its constraints

### Implementation (KV-only, zero cron jobs)

Cloudflare KV supports **per-key TTL**. You don’t need a sweeper, job, or review.

When you store the post:

```js
const ttlSeconds = EXPIRY_MAP[choice]; // e.g. 30 * 24 * 3600
await env.KV.put(`post:${id}`, body, {
  expirationTtl: ttlSeconds,
  metadata: { title, createdAt, expiresAt }
});
```

When the key expires:

- the post disappears
- it automatically drops out of reads
- your `/api/index` will naturally stop listing it if you rebuild the index defensively

**No cleanup code. No alerts. No maintenance.**

---

## Index behavior (important detail)

To avoid “dangling links” in the TOC:

- Store `expiresAt` in metadata
- When serving `/api/index`, **filter out expired items**
- Optionally, prune the index opportunistically when serving it

This keeps the UI clean without background tasks.

---

## Read-time behavior (clear but calm)

When someone visits an expired post URL:

- return **410 Gone** (not 404)
- short explanation page:

> **This Textpile item has expired.**\
> Textpile does not retain backups.\
> If you need the text, ask the original poster.

That single page prevents confusion *and* support email.

---

## Submission UI: set expectations early

On `/submit`, add a short, plain-language notice **above the form**:

> **About Textpile**
>
> - Posts expire automatically.
> - Maintainers do not back up content.
> - Keep your own copy, including the title/version and the Textpile URL.
> - If this creates overhead, Textpile may be shut down.

That last line is important. It’s not a threat; it’s **informed consent**.

---

## Author responsibility (make it a norm, not a rule)

You already do this naturally; codify it lightly:

Encourage (don’t enforce) a convention like:

```
Title: Crypto analysis prompt + reply
Version: v2026-01-04-001
```

Then in the UI copy:

> **Tip:** include a title + version string in your document\
> and add the Textpile URL back into your own archive.

This keeps Textpile from becoming a de facto system of record.

---

## Why this dramatically lowers risk

### Operational

- No backups to manage
- No restore requests
- No long-tail moderation burden
- No “can you find that thing from 2 years ago?”

### Legal / social

- No implied retention or stewardship
- Clear user responsibility
- Clear shutdown legitimacy (“this was always temporary”)

### Cultural

- Encourages *reading now*, not hoarding
- Discourages performative publishing
- Keeps email as the coordination layer

---

## Textpile’s quiet contract (you might want this verbatim)

You could put this in the README or `/about`:

> Textpile is a low-maintenance reading surface for groups.\
> It is intentionally temporary.\
> Content expires automatically and is not backed up.\
> If maintaining Textpile becomes burdensome, it may be shut down without notice.\
> Authors are responsible for retaining their own copies.

That’s honest, calm, and surprisingly reassuring.

---

## Net effect

You get:

- a **usable shared reading surface**
- with **almost zero long-term obligation**
- and **no accidental promise of care**

Which is exactly what you set out to build.

If you want, next I can:

- show the **exact minimal changes** to the submit form + function to add expiry
- draft the `/about` page text in the same restrained tone
- or sanity-check this model against edge cases (links in email, follow-ups after expiry, etc.)

But conceptually: this is a *very* strong design choice.
