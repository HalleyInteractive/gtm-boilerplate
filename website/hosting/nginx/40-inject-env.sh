#!/bin/sh
set -e

PLATFORM="${PLATFORM_NAME:-}"
HTML_FILE="/usr/share/nginx/html/index.html"

if [ -f "$HTML_FILE" ]; then
  sed -i "s/__APP_PLATFORM_NAME__/${PLATFORM}/g" "$HTML_FILE"
fi
