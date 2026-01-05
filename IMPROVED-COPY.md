This file documents improvements to page copy. Check template variables, some may be new and need implementation in the code. For implementation purposes, ignore the explanatory notes.

# 1) Home Page (Index)

**Purpose:**
Orient readers, signal ephemerality and author responsibility, point to About.

**Final language**

```html
<p class="small">
  Long-form posts for <span id="community-name">{COMMUNITY_NAME}</span>.<br>
  Posts expire automatically; authors keep their own records.<br>
  <a href="/about">Important use notes →</a>
</p>
```

**Why this is correct**

* Mentions only what affects *reading*
* No submission-specific details (like IP logging)
* No policy sprawl
* Clear pointer to canonical terms

---

# 2) Submit Page

**Purpose:**
Ensure informed consent at the moment of action.

**Final language (top of page)**

```html
<p class="small">
  Paste plain text or Markdown.<br>
  No author identity is collected. IP addresses are logged. Posts expire automatically.<br>
  <a href="/about">Important use notes →</a>
</p>
```

**Why this is correct**

* Disclosure is explicit but calm
* No false promise of anonymity
* Ephemerality is reinforced before submission
* Avoids legalistic framing

Your existing **Important** retention warning further down the page is consistent and should remain.

---

# 3) Footer (All Pages)

**Purpose:**
Clarify provenance without implying service, support, or endorsement.

**Final language**

```html
<footer class="small">
  This is an instance of
  <a href="https://github.com/peterkaminski/textpile">Textpile {TEXTPILE_VERSION}</a>,
  operated by <a href="mailto:{ADMIN_EMAIL}"{ADMIN_EMAIL}</a>.
</footer>
```

**Why this is correct**

* Tool, not platform
* No uptime or service implication
* Clean separation between instance and software

---

# 4) About Page (Full, Canonical)

(implement with HTML)

## About Textpile

Textpile is a low-maintenance reading surface for sharing longer texts within a bounded community.

It is intentionally simple, temporary, and unattributed.

---

### What Textpile Is

* A place to read longer texts that don’t fit well in email
* A shared surface for reference and rereading
* A tool operated for the convenience of the community

---

### What Textpile Is Not

* An archive
* A system of record
* A moderated publishing platform
* A service with guaranteed availability or retention

Textpile does not promise permanence.

---

### Attribution and Identity

Textpile does not store author attribution.

When submitting content:

* no author identity is collected
* IP addresses may be logged as part of normal operation

Authors are responsible for keeping their own copies, including:

* title
* version identifier
* the Textpile URL

---

### Retention and Expiration

All posts expire automatically after a fixed period.

Expiration is intentional:

* to limit long-term maintenance burden
* to avoid implicit archival responsibility
* to encourage authors to retain their own records

Maintainers do not back up content.

Once a post expires, it may no longer be recoverable.

---

### Use Expectations

Textpile is provided for good-faith use by the community.

It may not be used to:

* facilitate illegal activity
* cause harm
* evade ethical or legal responsibilities

Textpile does not include moderation or review workflows.

---

### Operation and Shutdown

Textpile is run on a best-effort basis.

If operating this instance becomes burdensome — due to time, legal risk, or support overhead — it may be shut down and all content removed.

This is not a failure mode; it is an explicit design choice.

---
