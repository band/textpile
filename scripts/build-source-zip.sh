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
