# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Stage 1: Build Angular Frontend (builds locally if dist is not pre-built)
FROM node:22-alpine AS builder

WORKDIR /app/ui

COPY ui/package*.json ./
COPY ui/ ./
# If pre-built dist already exists, skip npm build; otherwise build it
RUN if [ ! -f dist/gtm-boilerplate/index.html ]; then npm install && npm run build; fi

# Stage 2: Production Web Server with NGINX Alpine
FROM nginx:alpine

# Copy dynamic NGINX configuration template ($PORT substitution supported natively)
COPY hosting/nginx/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy dynamic runtime environment injection script
COPY hosting/nginx/40-inject-env.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

# Copy compiled Angular distribution files
COPY --from=builder /app/ui/dist/gtm-boilerplate /usr/share/nginx/html

# Default Cloud Run PORT, Measurement Edge Route, GTG Tag ID, Geolocation fallback & Platform Name
ENV PORT=8080
ENV MEASUREMENT_PATH=/d4t4
ENV GTG_TAG_ID=GTM-KDFCRJM5
ENV DEFAULT_GEO_COUNTRY=NL
ENV PLATFORM_NAME=""
ENV NGINX_ENVSUBST_FILTER="PORT|MEASUREMENT_PATH|GTG_TAG_ID|DEFAULT_GEO_COUNTRY"

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
