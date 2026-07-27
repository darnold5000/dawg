#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/signalworks-modules"
MODULES=(auth-recovery email toast forms)
SIBLING="$ROOT/../signalworks-modules"

vendor_has_modules() {
  [ -d "$DEST/auth-recovery/src" ]
}

use_vendor_only() {
  if vendor_has_modules; then
    echo "Using committed vendor/signalworks-modules (no local signalworks-modules sync)."
    exit 0
  fi
  echo "error: vendor/signalworks-modules is empty. Run npm run prebuild from a full clone or add ../signalworks-modules." >&2
  exit 1
}

# Vercel and other CI never have the sibling monorepo checkout.
if [ "${VERCEL:-}" = "1" ] || [ "${CI:-}" = "true" ]; then
  use_vendor_only
fi

if [ ! -d "$SIBLING" ]; then
  use_vendor_only
fi

SRC="$(cd "$SIBLING" && pwd)"
mkdir -p "$DEST"
for mod in "${MODULES[@]}"; do
  if [ ! -d "$SRC/$mod" ]; then
    echo "error: missing module $SRC/$mod" >&2
    exit 1
  fi
  rsync -a --delete "$SRC/$mod/" "$DEST/$mod/"
done
echo "Synced modules to $DEST"
