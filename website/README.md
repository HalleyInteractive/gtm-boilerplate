# Google Tag Manager Ecommerce Demo Store

This repository provides a sample e-commerce demo store instrumented with Google Tag Manager, Google Tag Gateway (GTG), and Google Analytics 4 (GA4).

It is built as an Angular 22 Single-Page Application (SPA) with a **unified multi-platform deployment architecture**. A single Git branch (`main`) and Cloud Build trigger automatically builds the Angular application once and deploys it across all major hosting configurations:

1. **Main / Standard (`gtm-boilerplate`)**: NGINX Alpine on Cloud Run.
2. **NGINX Dedicated (`gtm-boilerplate-nginx`)**: NGINX Alpine on Cloud Run with full GTG manual reverse proxy.
3. **Apache Dedicated (`gtm-boilerplate-apache`)**: Apache HTTP Server 2.4 on Cloud Run with GTG reverse proxy (`mod_proxy`, `mod_rewrite`, SSL engine, dynamic geo-header translation).
4. **GCP Cloud Load Balancer (`gtm-boilerplate-gcp`)**: Cloud Run backend combined with GCP External Application Load Balancer + Internet NEG for edge proxying.

The Angular frontend source code is located in the `ui/` subdirectory.
The hosting configurations are located in modular directories under `hosting/`:
- `hosting/nginx/`: NGINX Alpine Dockerfile, configuration template, and dynamic environment injection hook.
- `hosting/apache/`: Apache HTTP Server Dockerfile, configuration template, entrypoint script, and error pages.
- `hosting/gcp/`: GCP External Application Load Balancer provisioning script (`setup_load_balancer.sh`) and Terraform module (`terraform/`).

---

## Google Tag Manager & Google Tag Gateway (GTG) Setup

1. Set up a Web Container in Google Tag Manager (or a GA4 Data Stream).
2. Note your Web Container ID (e.g. `GTM-XXXXXX` / `GTM-KDFCRJM5`).
3. Set `gtmContainerId` in [environment.prod.ts](./ui/src/environments/environment.prod.ts) (or [environment.ts](./ui/src/environments/environment.ts)).
4. **Google Tag Gateway (GTG) Edge Proxy Routing**:
   - Both NGINX and Apache act as true Google Tag Gateway manual reverse proxies.
   - All paths under `${MEASUREMENT_PATH}` (default `/d4t4`) are proxied to `https://${GTG_TAG_ID}.fps.goog/` with the required `Host: ${GTG_TAG_ID}.fps.goog` rewrite, preserving the measurement path.
   - This single unified route proxies tag script serving (`/d4t4/gtm.js`, `/d4t4/gtag/js`), telemetry data collection (`/d4t4/g/collect`), and GTG health check verification (`/d4t4/healthy`).
   - Visitor geolocation headers (`X-Forwarded-Country`, `X-Forwarded-Region`, and Google's preferred ISO 3166-2 `X-Forwarded-CountryRegion`, mapped from Google Cloud Run's native GFE `X-AppEngine-Country` and `X-AppEngine-Region` headers) and standard proxy headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) are forwarded to ensure Consent Mode geo-rules and GA4 city-level accuracy work correctly.
   - `proxy_buffering off;` is maintained on the proxy route to avoid re-compressing Google's pre-compressed Gzip/Brotli streams on the fly, eliminating CPU and latency overhead.
   - Upstream response header buffer sizes (`proxy_buffer_size 128k;`) are configured to support Google's large debug headers (`x-encrypted-debug-headers`) and multiple `Set-Cookie` headers, preventing 502 Bad Gateway errors during Tag Assistant sessions.
   - Configurable via environment variables `MEASUREMENT_PATH` and `GTG_TAG_ID` in Cloud Run and `environment.measurementPath` in Angular.

---

## Dynamic Platform Branding

The Angular application is built once for all hosting environments. At container startup, the runtime platform name (`PLATFORM_NAME` environment variable) is injected into `window.__APP_ENV__` inside `index.html`:
- On `gtm-boilerplate`: Displays `Demo E-commerce Store`
- On `gtm-boilerplate-nginx`: Displays `Demo E-commerce Store - NGINX`
- On `gtm-boilerplate-apache`: Displays `Demo E-commerce Store - APACHE`
- On `gtm-boilerplate-gcp`: Displays `Demo E-commerce Store - GCP`

---

## Currency & Localization

By default, the demo store uses `GBP` (£) as currency. You can change currency and locale settings in [environment.prod.ts](./ui/src/environments/environment.prod.ts).

---

## Deployment & Automated CI/CD (Google Cloud Run + Cloud Build)

### 1. One-Time GCP Infrastructure Setup

Run the automated setup script to enable APIs, create your Artifact Registry Docker repository, and grant Cloud Build necessary deployment permissions:

```bash
cd website
bash setup_cloud_run.sh
```

### 2. Connect GitHub to Cloud Build (Continuous Deployment)

To automatically deploy new revisions to all 4 configurations whenever changes are committed and pushed to `main`:

1. Open [Google Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers).
2. Click **Connect Repository** and choose **GitHub (Cloud Build GitHub App)**.
3. Authenticate and select your repository (`gtm-boilerplate`).
4. Click **Create Trigger**:
   - **Name**: `deploy-gtm-boilerplate-all-on-push`
   - **Event**: `Push to a branch`
   - **Source**: `^main$`
   - **Configuration**: `Cloud Build configuration file (yaml)`
   - **Location**: `cloudbuild.yaml`
5. Save the trigger.

Every commit pushed to `main` will automatically:
1. Build the Angular app once in a lightweight Node container.
2. Build NGINX and Apache Docker images in parallel (leveraging the pre-built Angular artifacts).
3. Push both container images to Artifact Registry.
4. Deploy all 4 Cloud Run services (`gtm-boilerplate`, `gtm-boilerplate-nginx`, `gtm-boilerplate-apache`, and `gtm-boilerplate-gcp`).
5. Provision/update the GCP External Application Load Balancer with graceful warning fallback in case of organization policy restrictions.

### 3. Manual Local Deployment (Alternative)

If you wish to trigger the unified multi-platform deployment pipeline directly from your terminal:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

---

## Local Development

To run the Angular application locally in development mode:

```bash
cd website/ui
npm install
npm run start
```
Navigate to `http://localhost:4200/`.

To build and run either container locally:

**NGINX:**
```bash
cd website
docker build -t gtm-nginx -f hosting/nginx/Dockerfile .
docker run -p 8080:8080 -e PLATFORM_NAME=NGINX gtm-nginx
```

**Apache:**
```bash
cd website
docker build -t gtm-apache -f hosting/apache/Dockerfile .
docker run -p 8080:8080 -e PLATFORM_NAME=APACHE gtm-apache
```

---

## Disclaimers

__This is not an officially supported Google product.__

Copyright 2024 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind.
