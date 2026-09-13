#!/usr/bin/env bash
# One-time import of the full backend source into this repo.
# Usage: ./bootstrap.sh [path-to-olljira-backend.tar.gz]
set -e
SRC="${1:-}"
if [ -z "$SRC" ]; then
  echo "usage: ./bootstrap.sh path/to/olljira-backend.tar.gz" >&2
  exit 1
fi
tar -xzf "$SRC"
git add -A
git commit -m "Import full backend source"
git push
echo "Done — full source is now committed."
