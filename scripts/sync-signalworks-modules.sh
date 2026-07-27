#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$(cd "$ROOT/../signalworks-modules" && pwd)"
DEST="$ROOT/vendor/signalworks-modules"

mkdir -p "$DEST"
for mod in auth-recovery email toast forms; do
  rsync -a --delete "$SRC/$mod/" "$DEST/$mod/"
done
echo "Synced modules to $DEST"
