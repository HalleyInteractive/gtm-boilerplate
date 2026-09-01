#!/bin/bash
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

echo "========================================================================="
echo "🚀 GCP External Application Load Balancer & GTG Reverse Proxy Setup"
echo "========================================================================="

# -----------------------------------------------------------------------------
# 1. Environment & Variable Detection
# -----------------------------------------------------------------------------
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "❌ ERROR: No active Google Cloud project detected."
  echo "Please set your project: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi

REGION=${GCP_REGION:-"europe-west4"}
SERVICE_NAME=${CLOUD_RUN_SERVICE:-"gtm-boilerplate-gcp"}
DOMAIN=${DOMAIN:-"gcp.nielsoverwijn.dev"}
MEASUREMENT_PATH=${MEASUREMENT_PATH:-"/d4t4"}
GTG_TAG_ID=${GTG_TAG_ID:-"GTM-KDFCRJM5"}
PREFIX="gtm-gcp"

# Normalize measurement path (ensure leading slash, no trailing slash)
MEASUREMENT_PATH="/$(echo "${MEASUREMENT_PATH}" | sed 's|^/||;s|/$||')"

echo "📋 Configuration Summary:"
echo "   - Project ID:         ${PROJECT_ID}"
echo "   - Region:             ${REGION}"
echo "   - Cloud Run Service:  ${SERVICE_NAME}"
echo "   - Custom Domain:      ${DOMAIN}"
echo "   - Measurement Path:   ${MEASUREMENT_PATH}"
echo "   - GTG Tag ID:         ${GTG_TAG_ID}"
echo "   - Resource Prefix:    ${PREFIX}"
echo ""

# -----------------------------------------------------------------------------
# 2. Enable Required APIs
# -----------------------------------------------------------------------------
echo "🔌 Ensuring Compute & Network APIs are enabled..."
gcloud services enable compute.googleapis.com --project="${PROJECT_ID}" --quiet

# -----------------------------------------------------------------------------
# 3. Reserve Global Static External IPv4 Address
# -----------------------------------------------------------------------------
IP_NAME="${PREFIX}-ip"
echo "🌐 Checking Global Static IP '${IP_NAME}'..."
if ! gcloud compute addresses describe "${IP_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Reserving new Global Static IP '${IP_NAME}'..."
  gcloud compute addresses create "${IP_NAME}" \
    --global \
    --ip-version=IPV4 \
    --description="Global Anycast IP for ${DOMAIN}" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Global Static IP '${IP_NAME}' already exists."
fi

LB_IP=$(gcloud compute addresses describe "${IP_NAME}" --global --project="${PROJECT_ID}" --format="value(address)")
echo "📌 Reserved Global IP Address: ${LB_IP}"

# -----------------------------------------------------------------------------
# 4. Google-Managed SSL Certificate
# -----------------------------------------------------------------------------
SSL_CERT_NAME="${PREFIX}-cert"
echo "🔒 Checking Google-Managed SSL Certificate '${SSL_CERT_NAME}' for ${DOMAIN}..."
if ! gcloud compute ssl-certificates describe "${SSL_CERT_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Google-managed SSL certificate '${SSL_CERT_NAME}' for ${DOMAIN}..."
  gcloud compute ssl-certificates create "${SSL_CERT_NAME}" \
    --domains="${DOMAIN}" \
    --global \
    --description="Managed SSL Certificate for ${DOMAIN}" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ SSL Certificate '${SSL_CERT_NAME}' already exists."
fi

# -----------------------------------------------------------------------------
# 5. Cloud Run Serverless Network Endpoint Group (NEG) & Backend Service
# -----------------------------------------------------------------------------
CR_NEG_NAME="${PREFIX}-cr-neg"
CR_BACKEND_NAME="${PREFIX}-cr-backend"

echo "📦 Checking Cloud Run Serverless NEG '${CR_NEG_NAME}'..."
if ! gcloud compute network-endpoint-groups describe "${CR_NEG_NAME}" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Serverless NEG '${CR_NEG_NAME}' pointing to Cloud Run service '${SERVICE_NAME}'..."
  gcloud compute network-endpoint-groups create "${CR_NEG_NAME}" \
    --region="${REGION}" \
    --network-endpoint-type=SERVERLESS \
    --cloud-run-service="${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Serverless NEG '${CR_NEG_NAME}' already exists."
fi

echo "📦 Checking Cloud Run Backend Service '${CR_BACKEND_NAME}'..."
if ! gcloud compute backend-services describe "${CR_BACKEND_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Backend Service '${CR_BACKEND_NAME}'..."
  gcloud compute backend-services create "${CR_BACKEND_NAME}" \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --description="Backend service for Cloud Run SPA (${SERVICE_NAME})" \
    --project="${PROJECT_ID}" \
    --quiet

  echo "🔗 Attaching Serverless NEG to Backend Service..."
  gcloud compute backend-services add-backend "${CR_BACKEND_NAME}" \
    --global \
    --network-endpoint-group="${CR_NEG_NAME}" \
    --network-endpoint-group-region="${REGION}" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Cloud Run Backend Service '${CR_BACKEND_NAME}' already exists."
fi

# -----------------------------------------------------------------------------
# 6. Google Tag Gateway (GTG) Internet NEG & Backend Service (Edge Reverse Proxy)
# -----------------------------------------------------------------------------
GTG_NEG_NAME="${PREFIX}-gtg-neg"
GTG_BACKEND_NAME="${PREFIX}-gtg-backend"
GTG_FQDN="${GTG_TAG_ID}.fps.goog"

echo "🎯 Checking Internet NEG '${GTG_NEG_NAME}' for Google Tag Gateway (${GTG_FQDN})..."
if ! gcloud compute network-endpoint-groups describe "${GTG_NEG_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Internet NEG '${GTG_NEG_NAME}' (internet-fqdn-port)..."
  gcloud compute network-endpoint-groups create "${GTG_NEG_NAME}" \
    --network-endpoint-type="internet-fqdn-port" \
    --global \
    --description="Internet NEG for Google Tag Gateway (${GTG_FQDN})" \
    --project="${PROJECT_ID}" \
    --quiet

  echo "🔗 Adding endpoint '${GTG_FQDN}:443' to Internet NEG..."
  gcloud compute network-endpoint-groups update "${GTG_NEG_NAME}" \
    --add-endpoint="fqdn=${GTG_FQDN},port=443" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Internet NEG '${GTG_NEG_NAME}' already exists."
fi

echo "🎯 Checking GTG Backend Service '${GTG_BACKEND_NAME}'..."
if ! gcloud compute backend-services describe "${GTG_BACKEND_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating GTG Backend Service '${GTG_BACKEND_NAME}' with Host rewrite..."
  gcloud compute backend-services create "${GTG_BACKEND_NAME}" \
    --global \
    --protocol=HTTPS \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --custom-request-header="Host: ${GTG_FQDN}" \
    --description="Edge reverse proxy backend service for Google Tag Gateway" \
    --project="${PROJECT_ID}" \
    --quiet

  echo "🔗 Attaching Internet NEG to GTG Backend Service..."
  gcloud compute backend-services add-backend "${GTG_BACKEND_NAME}" \
    --global \
    --global-network-endpoint-group \
    --network-endpoint-group="${GTG_NEG_NAME}" \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ GTG Backend Service '${GTG_BACKEND_NAME}' already exists."
  # Ensure custom Host header is set properly
  gcloud compute backend-services update "${GTG_BACKEND_NAME}" \
    --global \
    --custom-request-header="Host: ${GTG_FQDN}" \
    --project="${PROJECT_ID}" \
    --quiet >/dev/null 2>&1 || true
fi

# -----------------------------------------------------------------------------
# 7. URL Map & Path Matcher (Directing Traffic at the Edge)
# -----------------------------------------------------------------------------
URL_MAP_NAME="${PREFIX}-url-map"
echo "🗺️ Checking URL Map '${URL_MAP_NAME}'..."

if ! gcloud compute url-maps describe "${URL_MAP_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating URL Map '${URL_MAP_NAME}' with default backend '${CR_BACKEND_NAME}'..."
  gcloud compute url-maps create "${URL_MAP_NAME}" \
    --default-service="${CR_BACKEND_NAME}" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet

  echo "🔀 Adding Path Matcher for GTG Measurement Routes (${MEASUREMENT_PATH}/* -> ${GTG_BACKEND_NAME})..."
  gcloud compute url-maps add-path-matcher "${URL_MAP_NAME}" \
    --default-service="${CR_BACKEND_NAME}" \
    --path-matcher-name="gtg-matcher" \
    --backend-service-path-rules="${MEASUREMENT_PATH}/*=${GTG_BACKEND_NAME},${MEASUREMENT_PATH}=${GTG_BACKEND_NAME}" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ URL Map '${URL_MAP_NAME}' already exists. Updating path rules..."
  gcloud compute url-maps set-path-matcher "${URL_MAP_NAME}" \
    --default-service="${CR_BACKEND_NAME}" \
    --path-matcher-name="gtg-matcher" \
    --backend-service-path-rules="${MEASUREMENT_PATH}/*=${GTG_BACKEND_NAME},${MEASUREMENT_PATH}=${GTG_BACKEND_NAME}" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet >/dev/null 2>&1 || true
fi

# -----------------------------------------------------------------------------
# 8. Target HTTPS Proxy & HTTPS Forwarding Rule (Port 443)
# -----------------------------------------------------------------------------
HTTPS_PROXY_NAME="${PREFIX}-https-proxy"
HTTPS_RULE_NAME="${PREFIX}-https-rule"

echo "🔐 Checking Target HTTPS Proxy '${HTTPS_PROXY_NAME}'..."
if ! gcloud compute target-https-proxies describe "${HTTPS_PROXY_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Target HTTPS Proxy '${HTTPS_PROXY_NAME}'..."
  gcloud compute target-https-proxies create "${HTTPS_PROXY_NAME}" \
    --ssl-certificates="${SSL_CERT_NAME}" \
    --url-map="${URL_MAP_NAME}" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Target HTTPS Proxy '${HTTPS_PROXY_NAME}' already exists."
fi

echo "🚪 Checking HTTPS Global Forwarding Rule '${HTTPS_RULE_NAME}' (Port 443)..."
if ! gcloud compute forwarding-rules describe "${HTTPS_RULE_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Global Forwarding Rule '${HTTPS_RULE_NAME}'..."
  gcloud compute forwarding-rules create "${HTTPS_RULE_NAME}" \
    --address="${IP_NAME}" \
    --global \
    --target-https-proxy="${HTTPS_PROXY_NAME}" \
    --ports=443 \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ HTTPS Forwarding Rule '${HTTPS_RULE_NAME}' already exists."
fi

# -----------------------------------------------------------------------------
# 9. HTTP-to-HTTPS Automatic Redirect (Port 80)
# -----------------------------------------------------------------------------
HTTP_REDIRECT_MAP="${PREFIX}-http-redirect-map"
HTTP_PROXY_NAME="${PREFIX}-http-proxy"
HTTP_RULE_NAME="${PREFIX}-http-rule"

echo "🔄 Checking HTTP-to-HTTPS Redirect URL Map '${HTTP_REDIRECT_MAP}'..."
if ! gcloud compute url-maps describe "${HTTP_REDIRECT_MAP}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating HTTP-to-HTTPS Redirect URL Map..."
  gcloud compute url-maps import "${HTTP_REDIRECT_MAP}" --global --project="${PROJECT_ID}" --quiet --source=- <<EOF
name: ${HTTP_REDIRECT_MAP}
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
  stripQuery: false
EOF
else
  echo "✅ HTTP Redirect URL Map '${HTTP_REDIRECT_MAP}' already exists."
fi

echo "🔄 Checking Target HTTP Proxy '${HTTP_PROXY_NAME}'..."
if ! gcloud compute target-http-proxies describe "${HTTP_PROXY_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Target HTTP Proxy '${HTTP_PROXY_NAME}'..."
  gcloud compute target-http-proxies create "${HTTP_PROXY_NAME}" \
    --url-map="${HTTP_REDIRECT_MAP}" \
    --global \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ Target HTTP Proxy '${HTTP_PROXY_NAME}' already exists."
fi

echo "🚪 Checking HTTP Global Forwarding Rule '${HTTP_RULE_NAME}' (Port 80)..."
if ! gcloud compute forwarding-rules describe "${HTTP_RULE_NAME}" --global --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating HTTP Forwarding Rule '${HTTP_RULE_NAME}'..."
  gcloud compute forwarding-rules create "${HTTP_RULE_NAME}" \
    --address="${IP_NAME}" \
    --global \
    --target-http-proxy="${HTTP_PROXY_NAME}" \
    --ports=80 \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --project="${PROJECT_ID}" \
    --quiet
else
  echo "✅ HTTP Forwarding Rule '${HTTP_RULE_NAME}' already exists."
fi

# -----------------------------------------------------------------------------
# 10. Enforce Ingress Restriction on Cloud Run Service
# -----------------------------------------------------------------------------
echo "🛡️ Configuring Cloud Run ingress restriction for '${SERVICE_NAME}'..."
gcloud run services update "${SERVICE_NAME}" \
  --ingress=internal-and-cloud-load-balancing \
  --region="${REGION}" \
  --platform=managed \
  --project="${PROJECT_ID}" \
  --quiet >/dev/null 2>&1 || echo "ℹ️ Note: Cloud Run service '${SERVICE_NAME}' ingress will be enforced once the service is deployed."

# -----------------------------------------------------------------------------
# 11. Final Output & Cloudflare DNS Instructions
# -----------------------------------------------------------------------------
echo ""
echo "========================================================================="
echo "🎉 GCP Load Balancer & GTG Reverse Proxy Successfully Configured!"
echo "========================================================================="
echo ""
echo "📡 ACTION REQUIRED: Configure Cloudflare DNS Record:"
echo "   --------------------------------------------------"
echo "   1. Log in to Cloudflare Dashboard -> Select domain: nielsoverwijn.dev"
echo "   2. Go to DNS -> Records -> Click 'Add Record':"
echo "        Type:         A"
echo "        Name:         gcp   (or your configured subdomain)"
echo "        IPv4 address: ${LB_IP}"
echo "        Proxy status: DNS ONLY (Grey Cloud ⚪)"
echo "        TTL:          Auto"
echo "   3. Save the record."
echo ""
echo "⏳ Google-Managed SSL Certificate Provisioning:"
echo "   Once the DNS record is pointing to ${LB_IP}, Google automatically completes"
echo "   domain authorization (Domain Validation) and activates the SSL certificate."
echo "   This typically takes 10-20 minutes."
echo ""
echo "   To monitor SSL certificate provisioning status:"
echo "     gcloud compute ssl-certificates describe ${SSL_CERT_NAME} --global --format='get(managed.status,managed.domainStatus)'"
echo ""
echo "🔍 Verification Endpoints (once SSL is ACTIVE):"
echo "   - Web Store SPA:         https://${DOMAIN}/"
echo "   - GTG Health Check:      https://${DOMAIN}${MEASUREMENT_PATH}/healthy"
echo "   - GTG Tag Script:        https://${DOMAIN}${MEASUREMENT_PATH}/gtm.js?id=${GTG_TAG_ID}"
echo "   - GA4 Collect Endpoint:  https://${DOMAIN}${MEASUREMENT_PATH}/g/collect"
echo "========================================================================="
