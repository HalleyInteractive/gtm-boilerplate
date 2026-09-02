# Google Tag Manager Ecommerce Demo Store

This repository provides a sample e-commerce demo store that is instrumented with Google Tag Manager and Google Analytics 4 (GA4).

It is built as an Angular 22 Single-Page Application (SPA) containerized with NGINX on Alpine Linux, designed for deployment to **Google Cloud Run** with automated CI/CD using **Google Cloud Build** on push to GitHub.

The Angular frontend source code is located in the `/ui` subdirectory.

## Google Tag Manager & Google Tag Gateway (GTG) Setup

1. Set up a Web Container in Google Tag Manager (or a GA4 Data Stream).
2. Note your Web Container ID (e.g. `GTM-XXXXXX`) or Tag ID (e.g. `G-XXXXXXXXXX`).
3. Set `gtmContainerId` in [environment.prod.ts](./ui/src/environments/environment.prod.ts) (or [environment.ts](./ui/src/environments/environment.ts)).
4. **Google Tag Gateway (GTG) Edge Proxy Routing**:
   - The NGINX container acts as a true Google Tag Gateway manual reverse proxy.
   - All paths under `${MEASUREMENT_PATH}` (default `/d4t4`) are routed to `https://${GTG_TAG_ID}.fps.goog/` with the required `Host: ${GTG_TAG_ID}.fps.goog` rewrite, preserving the measurement path.
   - This single unified route proxies tag script serving (`/d4t4/gtm.js`, `/d4t4/gtag/js`), telemetry data collection (`/d4t4/g/collect`), and GTG health check verification (`/d4t4/healthy`).
   - Visitor geolocation headers (`X-Forwarded-Country`, `X-Forwarded-Region`, and Google's preferred ISO 3166-2 `X-Forwarded-CountryRegion`, mapped from Google Cloud Run's native GFE `X-AppEngine-Country` and `X-AppEngine-Region` headers) and standard proxy headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`) are forwarded to ensure Consent Mode geo-rules and GA4 city-level accuracy work correctly.
   - `proxy_buffering off;` is maintained on the proxy route to avoid re-compressing Google's pre-compressed Gzip/Brotli streams on the fly, eliminating CPU and latency overhead.
   - Upstream response header buffer sizes (`proxy_buffer_size 128k;`) are configured to support Google's large debug headers (`x-encrypted-debug-headers`) and multiple `Set-Cookie` headers, preventing 502 Bad Gateway errors during Tag Assistant sessions.
   - Configurable via environment variables `MEASUREMENT_PATH` and `GTG_TAG_ID` in Cloud Run and `environment.measurementPath` in Angular.

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

To automatically deploy new revisions whenever changes are committed and pushed to `main`:

1. Open [Google Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers).
2. Click **Connect Repository** and choose **GitHub (Cloud Build GitHub App)**.
3. Authenticate and select your repository (`gtm-boilerplate`).
4. Click **Create Trigger**:
   - **Name**: `deploy-gtm-boilerplate-on-push`
   - **Event**: `Push to a branch`
   - **Source**: `^main$`
   - **Configuration**: `Cloud Build configuration file (yaml)`
   - **Location**: `website/cloudbuild.yaml` (or `cloudbuild.yaml`)
5. Save the trigger.

Every commit to `main` will now automatically build the multi-stage Docker container image, push it to Artifact Registry, and deploy to Cloud Run!

### 3. Manual Local Deployment (Alternative)

If you wish to trigger a direct deployment immediately from your terminal without committing:

```bash
cd website
gcloud builds submit --config=cloudbuild.yaml
```

---

## Local Development

To run the Angular application locally in development mode:

```bash
cd ui
npm install
npm run start
```
Navigate to `http://localhost:4200/`.

To build the container locally with Docker:

```bash
cd website
docker build -t gtm-boilerplate .
docker run -p 8080:8080 gtm-boilerplate
```
Navigate to `http://localhost:8080/`.

---

## Disclaimers

__This is not an officially supported Google product.__

Copyright 2024 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind.
