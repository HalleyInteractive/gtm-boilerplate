#!/bin/bash
# Wrapper to invoke hosting/gcp/setup_load_balancer.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/hosting/gcp/setup_load_balancer.sh" "$@"
