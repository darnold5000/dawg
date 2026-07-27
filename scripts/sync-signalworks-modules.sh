#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/signalworks-modules"
MODULES=(auth-recovery email toast forms)

if [ ! -d "$ROOT/../signalworks-modules" ]; then
  if [ -d "$DEST/auth-recovery/src" ]; then
    echo "signalworks-modules repo not found; using committed vendor/signalworks-modules"
    exit 0
  fi
  echo "error: ../signalworks-modules is missing and vendor/signalworks-modules is empty" >&2
  exit 1
fi

SRC="$(cd "$ROOT/../signalworks-modules" && pwd)"
mkdir -p "$DEST"
for mod in "${MODULES[@]}"; do
  if [ ! -d "$SRC/$mod" ]; then
    echo "error: missing module $SRC/$mod" >&2
    exit 1
  fi
  rsync -a --delete "$SRC/$mod/" "$DEST/$mod/"
done
echo "Synced modules to $DEST"
