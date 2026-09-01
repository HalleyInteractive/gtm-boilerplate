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

# Stage 1: Build Angular Frontend
FROM node:22-alpine AS builder

WORKDIR /app/ui

# Install dependencies inside the container
COPY ui/package*.json ./
RUN npm install

# Copy UI source code and build production distribution
COPY ui/ ./
RUN npm run build

# Stage 2: Production Web Server with Apache HTTP Server (Debian-based)
FROM httpd:2.4

# Install gettext-base for envsubst
RUN apt-get update && \
    apt-get install -y --no-install-recommends gettext-base && \
    rm -rf /var/lib/apt/lists/*

# Enable required Apache modules and virtual host inclusion in httpd.conf
RUN sed -i \
    -e 's/^#\(LoadModule .*mod_proxy.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_proxy_http.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_ssl.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_socache_shmcb.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_rewrite.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_headers.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_deflate.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_expires.so\)/\1/' \
    -e 's/^#\(LoadModule .*mod_setenvif.so\)/\1/' \
    -e 's/^Listen 80/#Listen 80/' \
    /usr/local/apache2/conf/httpd.conf && \
    echo "Include conf/extra/gtm-boilerplate.conf" >> /usr/local/apache2/conf/httpd.conf

# Copy Apache configuration template and entrypoint script
COPY apache.conf.template /usr/local/apache2/conf/extra/apache.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy error page
COPY 50x.html /usr/local/apache2/htdocs/50x.html

# Copy compiled Angular distribution files
COPY --from=builder /app/ui/dist/gtm-boilerplate /usr/local/apache2/htdocs

# Default Cloud Run PORT, Measurement Edge Route, GTG Tag ID & Geolocation fallback
ENV PORT=8080
ENV MEASUREMENT_PATH=/d4t4
ENV GTG_TAG_ID=GTM-KDFCRJM5
ENV DEFAULT_GEO_COUNTRY=NL

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["httpd-foreground"]
