Our goal for this feature is to “help Textpile spread”. It implements an instance zip is basically a **one-click “take this home and run it”** affordance. Cloudflare Pages is a good fit because you can generate and serve a static artifact easily.

As part of the build process, the build could create a zip file named "textpile-$VERSION_STRING.zip" including all the source and documentation files

## Suggested approach for Cloudflare Pages

### 1) Create the zip during the Pages build (only when enabled)

Use `git archive` so you automatically exclude `node_modules` and other non-tracked “libraries” without playing whack-a-mole with zip exclude rules.

Add a script like `scripts/build_source_zip.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Only run when explicitly enabled
if [[ "${PUBLIC_SOURCE_ZIP:-}" != "true" ]]; then
  echo "PUBLIC_SOURCE_ZIP not enabled; skipping source zip."
  exit 0
fi

VERSION="$(node -p "require('./package.json').version")"
OUTDIR="public/assets"
OUTFILE="${OUTDIR}/textpile-${VERSION}-source.zip"

mkdir -p "$OUTDIR"

# Archive the repo at the current commit into a zip.
# This naturally excludes node_modules (not tracked) and other build artifacts.
git archive --format=zip --output "$OUTFILE" HEAD

echo "Wrote $OUTFILE"
```

Make it executable locally once:

```bash
chmod +x scripts/build_source_zip.sh
```

Then in `package.json`, chain it after your normal build:

```json
{
  "scripts": {
    "build": "your-existing-build-command && ./scripts/build_source_zip.sh"
  }
}
```

Cloudflare Pages will run `npm run build` (or whatever you’ve configured). The zip ends up at:
`/assets/textpile-0.11.1-source.zip`

### 2) Enable it per-instance (default off)

In Cloudflare Pages → your project → **Settings → Environment variables**:

* `PUBLIC_SOURCE_ZIP` = `true` (for instances where you want it)

Leave it unset everywhere else.

## Footer wiring

You want:

> This site runs Textpile 0.11.1 · [GitHub repo](https://github.com/peterkaminski/textpile) · [Download source code from this instance](/assets/textpile-0.11.1-source.zip)

(Use HTML for the footer, not the markdown examples.)

"GitHub repo" replaces the previous link label, "source".

"Download source code from this instance" is a link to the generated source code zip file.

Implementation pattern:

* Always show version + GitHub repo link
* Only show the zip link when `PUBLIC_SOURCE_ZIP=true`

You can treat it as a build-time env var and conditionally render in the footer component/layout.

Example idea (pseudo-ish, adjust for your stack):

```js
const showZip = process.env.PUBLIC_SOURCE_ZIP === "true";
const version = "0.11.1"; // however you currently source this
const zipHref = `/assets/textpile-${version}-source.zip`;
```

Then render the third link only when `showZip`.

## Robots + AI policy: “don’t crawl the zip”

Robots.txt wildcards are inconsistently honored across crawlers, so do **both**:

### A) robots.txt (best-effort)

In `public/robots.txt`:

```
User-agent: *
Disallow: /assets/textpile-
```

That’s blunt but effective: it blocks all URLs beginning with `/assets/textpile-...` (covers your zip naming scheme without needing wildcards).

If you also want to be explicit for common AI crawlers, you can add:

```
User-agent: GPTBot
Disallow: /assets/textpile-

User-agent: Google-Extended
Disallow: /assets/textpile-
```

(You can add others you care about similarly.)

### B) Stronger: X-Robots-Tag header for the zip

In Pages, add `public/_headers`:

```
/assets/*.zip
  X-Robots-Tag: noindex, nofollow
```

Even if robots rules are ignored, this header is widely respected by search engines and reduces accidental indexing.

## Fork naming / provenance

Given your stated priorities, I’d keep this lightweight:

* In `CONTRIBUTING.md`, add a short guideline like: “If you ship a modified public instance, please add a suffix to the version string or rename the project in the footer.”

