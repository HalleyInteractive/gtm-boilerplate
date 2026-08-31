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

# Stage 2: Production Web Server with NGINX Alpine
FROM nginx:alpine

# Copy dynamic NGINX configuration template ($PORT substitution supported natively)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled Angular distribution files
COPY --from=builder /app/ui/dist/gtm-boilerplate /usr/share/nginx/html

# Default Cloud Run PORT & Measurement Edge Route
ENV PORT=8080
ENV MEASUREMENT_PATH=/analytics
ENV NGINX_ENVSUBST_FILTER="PORT|MEASUREMENT_PATH"

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
