# Implementation Plan for Copy Title and URL Button

## Wishlist Item and Requirements

**Status:** In Progress

Add a **“Copy Title and URL”** button alongside the existing **“Copy URL”** button on the post detail page.

### Supported formats

The copy output is controlled by configuration.

**Built-in formats:**

1. ``** (default)**

   - Output: `Title - URL`
   - Use case: Plain text, email, chat apps

2. ``

   - Output: `[Title](URL)`
   - Use case: Markdown contexts (GitHub, Discord, etc.)

3. ``

   - Output: `Title\nURL`
   - Use case: When you want title and URL on separate lines
   - **Note:** No special escaping/quoting of the title is required.

### Configuration

**Environment Variable:** `COPY_TITLE_AND_URL_FORMAT`

**Accepted values:**

- One of the built-in format names: `plain`, `markdown`, `multiline`
- OR a **template string** containing `${title}` and `${url}` placeholders.

**Default behavior (if not set, invalid, too long, or malformed):** `plain`

### Template support

You may provide a custom template, for example:

```
title: ${title}
url: ${url}
```

Validation rules:

- Only `${title}` and `${url}` are allowed.
- If any other `${...}` variable appears, treat as invalid.
- If the string is too long or malformed, treat as invalid.
- If invalid, **log a warning** and fall back to default (`plain`).

### Title fallback

If a post has no title, use:

- `Post from INSTANCE_NAME`

(Where `INSTANCE_NAME` is the configured instance/community name already available in config.)

---

## Implementation Details

### 1. Backend Changes

#### New configuration field

**File:** `functions/api/config.js`

Add a new config property:

```js
copyTitleAndUrlFormat: env.COPY_TITLE_AND_URL_FORMAT || "plain"
```

(Ensure the config object also includes whatever is needed to render `INSTANCE_NAME` on the client side, if it isn’t already.)

### 2. Frontend Changes

#### Post detail page

**File:** `functions/p/[id].js`

**Current state:**

- Has “Copy URL” button that copies `window.location.href`
- Uses temporary button text feedback (“Copied!”)

**Changes needed:**

- Add “Copy Title and URL” button next to “Copy URL”
- Copy formatted text according to `CONFIG.copyTitleAndUrlFormat`
- Use the same feedback mechanism

**Button placement:**

```
[Copy URL] [Copy Title and URL]
```

#### Format generation logic

Implement a single function that:

- Normalizes invalid built-in format strings to `plain`
- Supports template strings
- Avoids duplicating the default template anywhere

**Suggested approach:**

- Define a constant for the default output behavior (built-in `plain`).
- Validate templates (allowed variables only, length limit, basic sanity checks).
- If invalid, log a warning and use `plain`.

Pseudo-code sketch:

```js
function formatTitleAndUrl({ title, url, format, instanceName }) {
  const resolvedTitle = title?.trim() ? title.trim() : `Post from ${instanceName}`;

  // Built-in formats
  if (format === 'markdown') return `[${resolvedTitle}](${url})`;
  if (format === 'multiline') return `${resolvedTitle}\n${url}`;
  if (format === 'plain') return `${resolvedTitle} - ${url}`;

  // Template format
  if (isTemplateString(format) && isValidTemplate(format)) {
    return format
      .replaceAll('${title}', resolvedTitle)
      .replaceAll('${url}', url);
  }

  // Invalid format: warn + fallback to plain
  console.warn('Invalid COPY_TITLE_AND_URL_FORMAT; falling back to plain');
  format = 'plain';
  return `${resolvedTitle} - ${url}`;
}
```

Notes:

- For multiline format, do **not** escape/quote the title.
- The “invalid format” branch should explicitly change the local `format` to `plain` (even if it’s not reused) to match intent and keep logic clear.

#### Copy button handler

- Fetch title from the page (or from whatever data you already have for the post).
- Use `window.location.href` for the URL.
- Use config format from `CONFIG.copyTitleAndUrlFormat`.

Edge cases:

- Empty/missing title: use `Post from INSTANCE_NAME`.

### 3. Documentation Updates

#### CONFIGURATION.md

Add/update section:

```md
### COPY_TITLE_AND_URL_FORMAT

**Type:** String
**Default:** `plain`

Controls the output of the “Copy Title and URL” button.

Built-in formats:
- `plain`: `Title - URL`
- `markdown`: `[Title](URL)`
- `multiline`: `Title\nURL`

Custom template:
You may supply a template containing `${title}` and `${url}`, e.g.

```

title: \${title} url: \${url}

```

If the value is invalid (unknown format, unsupported variables, too long, or malformed), Textpile will log a warning and fall back to `plain`.
```

#### User’s Guide.md

Update “Sharing Posts” section to mention two copy buttons and that admins control the format via configuration.

#### WISHLIST.md

Delete the “Copy title and URL” section entirely (do not mark implemented).

#### CHANGELOG.md

Add a note to the next release:

- “Add ‘Copy Title and URL’ button with configurable output format (built-ins + templates).”

---

## Testing Plan

### Manual testing

1. **Built-in formats**

   - `COPY_TITLE_AND_URL_FORMAT=plain`
   - `COPY_TITLE_AND_URL_FORMAT=markdown`
   - `COPY_TITLE_AND_URL_FORMAT=multiline`
   - Unset variable (defaults to `plain`)

2. **Template formats**

   - Valid template:
     - `title: ${title}\nurl: ${url}`
   - Invalid template variables:
     - `x: ${title}\ny: ${slug}` → warn + fallback
   - Too-long template → warn + fallback
   - Malformed template → warn + fallback

3. **Edge cases**

   - Post with no title → `Post from INSTANCE_NAME`
   - Titles with special characters
   - Very long titles

4. **Feedback mechanism**

   - Button shows “Copied!”
   - Button returns to original label after 2 seconds
   - Rapid clicking

5. **Clipboard behavior**

   - Verify copied text exactly matches expected output
   - Paste into markdown editor, plain text, etc.

### Browser compatibility

- Chrome/Edge
- Firefox
- Safari

---

## Files to Modify

1. `functions/api/config.js`
2. `functions/p/[id].js`
3. `CONFIGURATION.md`
4. `User's Guide.md`
5. `WISHLIST.md`
6. `CHANGELOG.md`

---

## Implementation Checklist

-

