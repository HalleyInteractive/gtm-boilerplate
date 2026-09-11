#!/bin/sh
set -e

PLATFORM="${PLATFORM_NAME:-}"
MEASUREMENT="${MEASUREMENT_PATH:-}"
HTML_FILE="/usr/share/nginx/html/index.html"

if [ -f "$HTML_FILE" ]; then
  sed -i "s/__APP_PLATFORM_NAME__/${PLATFORM}/g" "$HTML_FILE"
  # Pipe delimiter: the measurement path contains forward slashes.
  sed -i "s|__APP_MEASUREMENT_PATH__|${MEASUREMENT}|g" "$HTML_FILE"
fi
