# ADR 001: Version Source of Truth

## Status

Proposed

## Context

Textpile needs to display its version number in multiple places:
- Client-side footer (rendered in browser)
- Server-side API responses (from Cloudflare Functions)
- Build scripts (generating source zip filenames)
- Documentation files (README.md, CONFIGURATION.md)

Currently, `public/version.js` serves as the single source of truth:
```javascript
export const TEXTPILE_VERSION = "0.11.1";
```

This is synced to other files via `npm run update-version`, which updates:
- `package.json` - version field
- `README.md` - version badge
- `CONFIGURATION.md` - footer example

As we add the optional source zip build feature, we need to decide whether to:
1. Keep `public/version.js` as source of truth, or
2. Switch to `package.json` (Node.js ecosystem standard)

### Textpile's Design Philosophy

Textpile's core principle is **"low-maintenance by design"**:
- Zero build steps for the core application
- No bundlers, transpilers, or complex toolchains
- Can be deployed by simply uploading files to Cloudflare Pages
- Minimizes maintenance burden and failure points

### Current State

**Works without build:**
- Static HTML files in `public/`
- ES6 modules loaded directly by browser (`type="module"`)
- Cloudflare Functions in `functions/` (no bundling required)
- No npm scripts needed for deployment

**Optional build features:**
- `npm run update-version` - Syncs version to multiple files (release process only)
- `npm run build` - Will generate source zip (opt-in feature, not required for core app)

## Decision

**Keep `public/version.js` as the single source of truth for version number.**

Rationale:
1. Preserves zero-build architecture for core application
2. Allows both client and server code to import using same ES6 syntax
3. Maintains deployment simplicity (can deploy without npm tooling)
4. Build script for optional source zip feature can easily read from it
5. Current sync script works well and is part of documented release process

## Consequences

### Positive

1. **Zero build requirement maintained** - Core app continues to work without any build step
2. **Universal import syntax** - Same `import { TEXTPILE_VERSION } from './version.js'` works everywhere
3. **Deployment flexibility** - Can deploy via git push, file upload, or any other method
4. **Simple source zip script** - Build script can read version with straightforward Node.js code
5. **Aligns with philosophy** - Keeps Textpile simple and low-maintenance
6. **No regression risk** - No changes to existing, working system

### Negative

1. **Unconventional** - Differs from typical Node.js projects where `package.json` is version source
2. **Manual sync required** - Must run `npm run update-version` during release (but this is already in checklist)
3. **Education burden** - New contributors may expect `package.json` to be authoritative
4. **Two version files** - Both `version.js` and `package.json` exist, though only one is source of truth

### Neutral

1. **Source zip build script complexity** - Slightly more complex than `require('./package.json').version`, but not significantly:
   ```bash
   # Current approach (version.js):
   VERSION=$(node -e "
     import('./public/version.js')
       .then(m => console.log(m.TEXTPILE_VERSION))
       .catch(() => { /* fallback */ });
   ")

   # Alternative approach (package.json):
   VERSION=$(node -p "require('./package.json').version")
   ```
   Difference is minimal.

## Alternatives Considered

### Alternative 1: Switch to package.json as Source of Truth

**Would require:**
1. Generate `public/version.js` from `package.json` during build
2. Add build step to core application (contradicts zero-build philosophy)
3. Update all imports to read from generated file
4. Make build step mandatory, not optional

**Pros:**
- Follows Node.js ecosystem conventions
- Could use `npm version` commands for releases
- Slightly simpler build script for source zip

**Cons:**
- **Breaks zero-build philosophy** - Core app would require build step
- **Deployment complexity** - Must run build before deployment
- **Tooling dependency** - npm becomes required, not optional
- **Risk of desync** - Generated files can get out of sync if build forgotten

**Decision:** Rejected because it contradicts Textpile's core design principle of zero-build simplicity.

### Alternative 2: Dual Source of Truth (Manual Sync)

**Keep both, sync manually:**
- Manually update both `version.js` and `package.json`
- No sync script, just remember to update both

**Pros:**
- No sync script needed
- Both files are "real" sources

**Cons:**
- **High error risk** - Easy to forget to update both, causing version mismatch
- **No single source of truth** - Which is authoritative when they differ?
- **Poor developer experience** - Manual sync is error-prone

**Decision:** Rejected because it's more error-prone than current automated sync.

### Alternative 3: Version in Environment Variable Only

**No version in code:**
- Set `TEXTPILE_VERSION` as environment variable in Cloudflare Pages
- Read from `env.TEXTPILE_VERSION` everywhere

**Pros:**
- Truly single source (the deployment environment)
- No version drift possible

**Cons:**
- **Lost in code** - Can't tell version by reading repository
- **Deployment complexity** - Must set env var for every deployment
- **Testing complexity** - Local development needs manual env var setup
- **Git tagging unclear** - What version does a git tag represent?

**Decision:** Rejected because it makes version invisible in the codebase and complicates development.

## Implementation Notes

### For the Source Zip Build Script

The build script (`scripts/build-source-zip.sh`) will read version from `public/version.js`:

```bash
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
```

This approach:
- Tries ES6 module import first (works in Node 14+)
- Falls back to regex parsing if import fails
- Handles edge cases gracefully

### Release Process (Unchanged)

The release process documented in CONTRIBUTING.md remains:
1. Edit `public/version.js` with new version
2. Run `npm run update-version` to sync to other files
3. Update `CHANGELOG.md`
4. Commit, tag, and push

This is already working well and is part of the established workflow.

### Documentation Updates

Add to `CLAUDE.md` under "Architecture Patterns":

```markdown
### Version Management

**Source of truth**: `public/version.js`

```javascript
export const TEXTPILE_VERSION = "0.11.1";
```

**Why version.js instead of package.json?**
- Preserves zero-build architecture for core application
- Works from both client-side (browser) and server-side (Functions) code
- Allows deployment without npm tooling
- Synced to other files via `npm run update-version` during release

**Synced files** (auto-updated by script):
- `package.json` - version field
- `README.md` - version badge
- `CONFIGURATION.md` - footer examples

See ADR 001 for full rationale.
```

## Future Reconsideration Triggers

This decision should be revisited if:

1. **Build tooling is added for other reasons** - If Textpile adopts bundling, transpilation, or other build processes for the core app, switching to `package.json` would make sense as part of that larger architectural shift.

2. **Client-side version import becomes problematic** - If browser ES6 module support becomes an issue or Cloudflare Pages changes how static files are served.

3. **Sync script becomes burdensome** - If the update-version script starts failing frequently or becomes complex to maintain.

4. **Community consensus shifts** - If contributors consistently express confusion about the current approach and it becomes a barrier to contribution.

**Current recommendation**: None of these triggers apply. Keep current approach.

## References

- [Textpile Design Philosophy](../../CLAUDE.md#design-philosophy)
- [Release Process](../../CONTRIBUTING.md#releasing-a-new-version)
- [PRD: Public Source Zip](../../PRD-Public-Source-Zip.md)
- [Semantic Versioning](https://semver.org/)

## Metadata

- **Date**: 2026-01-19
- **Author**: Claude Code (Sonnet 4.5)
- **Reviewers**: Peter Kaminski (pending)
- **Status**: Proposed → (awaiting approval)
