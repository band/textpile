# Implementation Plan: Public Source Zip Feature

This plan implements the "help Textpile spread" feature described in PRD-Public-Source-Zip.md, adapted for the Textpile codebase.

## Issues Found in PRD (Resolution Required)

### 1. Version Source Discrepancy ✓ Resolved
**Issue**: PRD assumes `package.json` is version source of truth, but this repo uses `public/version.js`.

**Resolution**: Modify the build script to read from `public/version.js` instead of `package.json`.

### 2. No Build Command ✓ Noted
**Issue**: Cloudflare Pages currently has no build command (all static files).

**Resolution**: Add a `build` script to `package.json` that only runs the source zip script (since there's no other build step needed).

### 3. Client-Side Footer Access to Env Var ✓ Resolved
**Issue**: Footer is generated client-side in `public/textpile-utils.js`, but `PUBLIC_SOURCE_ZIP` is a server-side env var.

**Resolution**: Expose `PUBLIC_SOURCE_ZIP` through `/api/config` endpoint so client code can access it.

### Status: No Blocking Issues
All PRD issues have clear resolutions. Ready for implementation.

---

## Phase 1: Build Infrastructure

### 1.1 Create Build Script

**File**: `scripts/build-source-zip.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Only run when explicitly enabled
if [[ "${PUBLIC_SOURCE_ZIP:-}" != "true" ]]; then
  echo "PUBLIC_SOURCE_ZIP not enabled; skipping source zip."
  exit 0
fi

# Read version from public/version.js (source of truth)
VERSION=$(node -e "
  import('./public/version.js')
    .then(m => console.log(m.TEXTPILE_VERSION))
    .catch(() => {
      const fs = require('fs');
      const content = fs.readFileSync('public/version.js', 'utf-8');
      const match = content.match(/TEXTPILE_VERSION\\s*=\\s*[\"']([^\"']+)[\"']/);
      console.log(match ? match[1] : 'unknown');
    });
")

OUTDIR="public/assets"
OUTFILE="${OUTDIR}/textpile-${VERSION}-source.zip"

mkdir -p "$OUTDIR"

# Archive the repo at current commit into a zip
# Naturally excludes node_modules, .git, and other untracked files
git archive --format=zip --output "$OUTFILE" HEAD

echo "✓ Created $OUTFILE"
```

**Actions**:
- Create `scripts/build-source-zip.sh` with above content
- Make executable: `chmod +x scripts/build-source-zip.sh`

### 1.2 Update package.json

**File**: `package.json`

**Change**: Add `build` script to scripts section (currently lines 7-11):

```json
{
  "scripts": {
    "build": "./scripts/build-source-zip.sh",
    "update-version": "node scripts/update-version.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Note**: Cloudflare Pages will run `npm run build` if it exists. If `PUBLIC_SOURCE_ZIP` is not set, the script exits cleanly with no output.

---

## Phase 2: API Configuration Update

### 2.1 Expose PUBLIC_SOURCE_ZIP in Config API

**File**: `functions/api/config.js`

**Change**: Add `publicSourceZip` to config object (after line 15):

```javascript
export async function onRequestGet({ env }) {
  return Response.json({
    success: true,
    config: {
      instanceName: env.INSTANCE_NAME || "INSTANCE_NAME",
      communityName: env.COMMUNITY_NAME || "COMMUNITY_NAME",
      adminEmail: env.ADMIN_EMAIL || "ADMIN_EMAIL",
      defaultRetention: env.DEFAULT_RETENTION || "1month",
      dateFormat: env.DATE_FORMAT || "YYYY-MM-DD",
      timeFormat: env.TIME_FORMAT || "HH:mm",
      copyTitleAndUrlFormat: env.COPY_TITLE_AND_URL_FORMAT || "plain",
      textpileVersion: TEXTPILE_VERSION,
      publicSourceZip: env.PUBLIC_SOURCE_ZIP === "true",  // NEW LINE
    }
  }, {
    headers: {
      "cache-control": "public, max-age=300",
    },
  });
}
```

---

## Phase 3: Footer Update

### 3.1 Update Footer Function

**File**: `public/textpile-utils.js`

**Change**: Replace footer generation (lines 92-94) with:

```javascript
footerHTML += '<br>';
footerHTML += 'This site runs ';
footerHTML += `Textpile ${escapeHtml(CONFIG.textpileVersion)}`;
footerHTML += ` &middot; <a href="https://github.com/peterkaminski/textpile">GitHub repo</a>`;

// Add source zip link if enabled
if (CONFIG.publicSourceZip) {
  const zipUrl = `/assets/textpile-${escapeHtml(CONFIG.textpileVersion)}-source.zip`;
  footerHTML += ` &middot; <a href="${zipUrl}">Download source zip from this instance</a>`;
}
```

**Note**: Changes "source" link text to "GitHub repo" and adds conditional source zip link.

---

## Phase 4: Robots & Crawling Policy

### 4.1 Create robots.txt

**File**: `public/robots.txt` (new file)

```txt
User-agent: *
Disallow: /assets/textpile-

User-agent: GPTBot
Disallow: /assets/textpile-

User-agent: Google-Extended
Disallow: /assets/textpile-

User-agent: CCBot
Disallow: /assets/textpile-

User-agent: anthropic-ai
Disallow: /assets/textpile-

User-agent: Claude-Web
Disallow: /assets/textpile-
```

### 4.2 Create _headers for X-Robots-Tag

**File**: `public/_headers` (new file)

```
/assets/*.zip
  X-Robots-Tag: noindex, nofollow
```

**Note**: Cloudflare Pages supports `_headers` files for custom headers.

---

## Phase 5: Documentation Updates

### 5.1 Update CONTRIBUTING.md

**Location**: After "Release Checklist" section (after line 569)

**Add new section**:

```markdown
### Enabling Public Source Zip

Some Textpile instances may choose to offer a downloadable source zip for easier forking and deployment. This is **opt-in** and disabled by default.

**To enable on your instance:**

1. In Cloudflare Pages → Settings → Environment variables, add:
   - `PUBLIC_SOURCE_ZIP` = `true`

2. The next deployment will automatically generate:
   - `/assets/textpile-{version}-source.zip`

3. A footer link will appear: "Download source zip from this instance"

**What's included in the zip:**
- All tracked files in the git repository at deployment time
- Excludes `node_modules`, `.git`, and other untracked files

**Robots/AI crawling:**
- The zip is blocked from indexing via `robots.txt` and `X-Robots-Tag` headers
- This prevents search engines and AI crawlers from ingesting the source multiple times

### Fork Naming & Provenance

If you fork Textpile and deploy a modified public instance, please help maintain clarity about what instance users are visiting:

**Recommended practices:**
- Add a suffix to the version string (e.g., `0.11.1-mycommunity`)
- Or rename the project in the footer (e.g., "MyCommunity Paste" instead of "Textpile")
- Update `INSTANCE_NAME` environment variable to reflect your community name

**Why this matters:**
- Users can distinguish official Textpile from forks
- Bug reports go to the right maintainer
- Credit is properly attributed

**How to customize:**
1. **Version suffix**: Edit `public/version.js` and append your suffix
2. **Instance name**: Set `INSTANCE_NAME` environment variable in Cloudflare Pages
3. **Footer text**: Modify `public/textpile-utils.js` if you want custom branding

This is a courtesy guideline, not a legal requirement (MIT license allows any use). We trust the community to be good stewards of attribution.
```

### 5.2 Update CONFIGURATION.md

**Location**: Add new section after existing environment variables documentation

**Add**:

```markdown
### PUBLIC_SOURCE_ZIP

**Type**: Boolean (`"true"` or `"false"`)
**Default**: Not set (disabled)
**Optional**: Yes

Enables automatic generation of a source code zip file during Cloudflare Pages builds.

**When to enable:**
- You want to make it easy for visitors to fork and deploy your instance
- You're running an open, public instance and want to help Textpile spread
- You want visitors to see exactly what code is running on your instance

**When to leave disabled:**
- Private or internal instances
- You don't want to encourage forking
- Bandwidth/storage concerns (zip adds ~200KB to deployment)

**Example:**
```bash
PUBLIC_SOURCE_ZIP="true"
```

**What it does:**
1. During build, creates `/assets/textpile-{version}-source.zip`
2. Adds footer link: "Download source zip from this instance"
3. Zip includes all git-tracked files (excludes node_modules, .git, etc.)
4. Robots.txt blocks indexing to prevent redundant AI training data

**Build requirement:**
Cloudflare Pages must have a build command configured (usually `npm run build`). If no build command is set, the zip will not be generated even if this variable is set to `"true"`.
```

### 5.3 Update README.md

**Change 1**: Add to "Features" section:

```markdown
- **Optional Source Zip** (opt-in): One-click download of complete source code from any instance running the feature
```

**Change 2**: Add to deployment instructions (in "Deployment" section):

```markdown
6. **(Optional) Enable public source zip**
   - In Settings → Environment variables, add:
     - `PUBLIC_SOURCE_ZIP` = `true`
   - Next deployment will include downloadable source zip
   - See CONFIGURATION.md for details
```

### 5.4 Update CLAUDE.md

**Change 1**: Add to "Environment Variables" section:

```markdown
- `PUBLIC_SOURCE_ZIP` (optional) - Set to `"true"` to generate downloadable source zip during build (default: disabled)
```

**Change 2**: Add to "Important Coding Patterns" section:

```markdown
### Source Zip Generation

The build process can optionally generate a source zip using `git archive`:

```bash
# Only runs when PUBLIC_SOURCE_ZIP="true"
./scripts/build-source-zip.sh
```

**Key points:**
- Uses `git archive` to automatically exclude node_modules and untracked files
- Reads version from `public/version.js` (source of truth)
- Outputs to `public/assets/textpile-{version}-source.zip`
- Blocked from crawlers via robots.txt and X-Robots-Tag header
```

---

## Phase 6: Testing & Verification

### 6.1 Local Testing

```bash
# Test script with PUBLIC_SOURCE_ZIP enabled
PUBLIC_SOURCE_ZIP=true npm run build

# Verify zip was created
ls -lh public/assets/textpile-*-source.zip

# Test script with PUBLIC_SOURCE_ZIP disabled (default)
npm run build  # Should output "skipping source zip" and exit cleanly

# Verify no zip exists
ls public/assets/ 2>/dev/null || echo "Assets dir doesn't exist (expected)"
```

### 6.2 Integration Testing

1. Deploy to Cloudflare Pages test environment
2. **Without `PUBLIC_SOURCE_ZIP`**: Verify build succeeds, no zip, no footer link
3. **With `PUBLIC_SOURCE_ZIP=true`**: Verify build succeeds, zip exists, footer link appears
4. Test zip download
5. Extract and verify contents match repository
6. Check robots.txt is accessible at `/robots.txt`
7. Verify X-Robots-Tag header on zip file

### 6.3 Footer Display Testing

1. **Load homepage without PUBLIC_SOURCE_ZIP**
   - Should show: "This site runs Textpile {version} · GitHub repo"

2. **Load homepage with PUBLIC_SOURCE_ZIP=true**
   - Should show: "This site runs Textpile {version} · GitHub repo · Download source zip from this instance"

3. **Click source zip link**, verify download works and filename is correct

---

## Phase 7: Deployment

### 7.1 Cloudflare Pages Build Configuration

**No changes needed** - Cloudflare Pages will automatically:
1. Detect `package.json` has a `build` script
2. Run `npm install` (if needed)
3. Run `npm run build`
4. Deploy `public/` directory

**Build settings:**
- Framework preset: None
- Build command: `npm run build`
- Build output directory: `public`

**To enable the feature on an instance:**
- In Cloudflare Pages → Settings → Environment variables
- Add: `PUBLIC_SOURCE_ZIP` = `true`

---

## Files Changed Summary

### New Files

- `scripts/build-source-zip.sh` - Build script for source zip
- `public/robots.txt` - Crawler exclusion rules
- `public/_headers` - X-Robots-Tag for zip files

### Modified Files

- `package.json` - Add build script
- `functions/api/config.js` - Expose PUBLIC_SOURCE_ZIP
- `public/textpile-utils.js` - Update footer with conditional zip link
- `CONTRIBUTING.md` - Add fork naming guidance and source zip docs
- `CONFIGURATION.md` - Document PUBLIC_SOURCE_ZIP variable
- `README.md` - Add feature mention and deployment step
- `CLAUDE.md` - Document source zip generation pattern

### Generated Files (not committed)

- `public/assets/textpile-{version}-source.zip` - Created at build time when enabled

---

## Architecture Decisions

### 1. Default Off
Source zip generation is opt-in to respect operator preferences about forking and bandwidth.

### 2. Build-Time Generation
Using `git archive` ensures we capture exactly what's deployed without manual maintenance of exclusion rules.

### 3. Version from version.js
Consistent with existing release process where `public/version.js` is source of truth.

### 4. Client-Side Footer Rendering
Maintain existing pattern where footer is generated in `textpile-utils.js` with config from API.

### 5. Robots Double-Layer
Both robots.txt and X-Robots-Tag provide defense-in-depth against unwanted indexing.

### 6. No .gitignore for assets/
We don't gitignore `public/assets/` because the zip is only created during Cloudflare Pages build, not locally. Local builds won't create it unless explicitly testing.

### 7. Link Text Change
Change "source" → "GitHub repo" to clarify that it links to the official repository, not this specific instance's source. The new "Download source zip from this instance" link provides instance-specific source.

---

## Release Notes for Future Version

When this feature ships, add to CHANGELOG.md:

```markdown
### Added
- Optional public source zip download feature (opt-in via `PUBLIC_SOURCE_ZIP` environment variable)
  - Automatically generates source code zip during Cloudflare Pages builds when enabled
  - Uses `git archive` to include all tracked files (excludes node_modules, .git, etc.)
  - Adds footer link "Download source zip from this instance" when enabled
  - Blocked from search engine and AI crawler indexing via robots.txt and X-Robots-Tag
  - Build script: `scripts/build-source-zip.sh`
  - Output: `/assets/textpile-{version}-source.zip`
- Fork naming guidance in CONTRIBUTING.md for maintaining attribution and clarity
- robots.txt file to control crawler behavior
- _headers file for X-Robots-Tag on zip files

### Changed
- Footer link text: "source" → "GitHub repo" for clarity about official repository vs instance source
```

---

## Questions for Review

None - the plan is complete and all PRD issues have been resolved. Ready for implementation approval.
