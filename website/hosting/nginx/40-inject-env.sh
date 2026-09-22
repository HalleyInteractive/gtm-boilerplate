#!/bin/sh
set -e

MEASUREMENT="${MEASUREMENT_PATH:-/d4t4}"
# Strip any trailing slash
MEASUREMENT=$(echo "$MEASUREMENT" | sed 's:/*$::')
if [ -z "$MEASUREMENT" ]; then
  MEASUREMENT="/d4t4"
fi

HTML_ROOT="/usr/share/nginx/html"
mkdir -p "${HTML_ROOT}/raw-origin"

# Substitute __APP_MEASUREMENT_PATH__ in all HTML files and copy untouched snapshots to /raw-origin/*.txt
find "${HTML_ROOT}" -name "index.html" | while read -r file; do
  sed -i "s|__APP_MEASUREMENT_PATH__|${MEASUREMENT}|g" "$file"

  rel_dir=$(dirname "$file" | sed "s|^${HTML_ROOT}||" | sed 's|^/||')
  if [ -z "$rel_dir" ]; then
    cp "$file" "${HTML_ROOT}/raw-origin/index.txt"
  else
    cp "$file" "${HTML_ROOT}/raw-origin/${rel_dir}.txt"
  fi
done
