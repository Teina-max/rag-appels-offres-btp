#!/bin/bash
# Git pre-commit hook — flag hand-written source files over the size limit.
# Mirrors the file-single-responsibility rule: >400 lines = split, >200 = review.
# Cross-agent by design: fires for Claude, Codex, and manual commits alike.
# Bypass (documented reason only): git commit --no-verify

set -euo pipefail

HARD_LIMIT=400   # block the commit
SOFT_LIMIT=200   # warn only

# Hand-written source this rule targets.
CODE_RE='\.(ts|tsx|js|jsx|mjs|cjs|sql|py|go|rs|rb|java|kt|swift|c|cc|cpp|h|hpp|sh|bash|vue|svelte|php|scala)$'

# Generated / vendored / build output are exempt (data, config, md, migrations are
# already out because they don't match CODE_RE — except .sql, hence /migrations?/).
EXCLUDE_RE='(\.gen\.|/generated/|/migrations?/|/vendor/|/node_modules/|/dist/|/build/|routeTree\.gen|\.min\.(js|css)$)'

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
[ -z "$REPO_ROOT" ] && exit 0
cd "$REPO_ROOT"

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true)
[ -z "$STAGED" ] && exit 0

violations=""
warnings=""

while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "$f" | grep -qE "$CODE_RE" || continue
  echo "$f" | grep -qE "$EXCLUDE_RE" && continue
  [ -f "$f" ] || continue
  lines=$(wc -l < "$f" | tr -d ' ')
  if [ "$lines" -gt "$HARD_LIMIT" ]; then
    violations="${violations}  $f — $lines lines\n"
  elif [ "$lines" -gt "$SOFT_LIMIT" ]; then
    warnings="${warnings}  $f — $lines lines\n"
  fi
done <<< "$STAGED"

if [ -n "$warnings" ]; then
  echo "file-size: over ${SOFT_LIMIT} lines — review for single-responsibility:"
  echo -e "$warnings"
fi

if [ -n "$violations" ]; then
  echo "BLOCKED — file-size: over ${HARD_LIMIT} lines, split by responsibility before committing:"
  echo -e "$violations"
  echo "Rule: one file = one responsibility. If genuinely one cohesive unit, bypass with a documented reason:"
  echo "  git commit --no-verify"
  exit 1
fi

exit 0
