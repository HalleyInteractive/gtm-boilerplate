#!/bin/sh
set -e

# Default Cloud Run environment variables
export PORT="${PORT:-8080}"
export MEASUREMENT_PATH="${MEASUREMENT_PATH:-/d4t4}"
export GTG_TAG_ID="${GTG_TAG_ID:-GTM-KDFCRJM5}"
export DEFAULT_GEO_COUNTRY="${DEFAULT_GEO_COUNTRY:-NL}"

# Ensure health check endpoint exists
printf "healthy\n" > /usr/local/apache2/htdocs/healthz

# Substitute environment variables into active Apache virtual host configuration
envsubst '$PORT $MEASUREMENT_PATH $GTG_TAG_ID $DEFAULT_GEO_COUNTRY' \
  < /usr/local/apache2/conf/extra/apache.conf.template \
  > /usr/local/apache2/conf/extra/gtm-boilerplate.conf

exec "$@"
