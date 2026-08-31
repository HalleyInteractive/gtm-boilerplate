# Google Tag Manager Ecommerce Demo Store

This repository provides a sample e-commerce demo store that is instrumented with Google Tag Manager and Google Analytics 4 (GA4).

It is built as an Angular 22 Single-Page Application (SPA) containerized with NGINX on Alpine Linux, designed for deployment to **Google Cloud Run** with automated CI/CD using **Google Cloud Build** on push to GitHub.

The Angular frontend source code is located in the `/ui` subdirectory.

## Google Tag Manager Setup & Edge Routing

1. Set up a Web Container in Google Tag Manager (or a GA4 Data Stream).
2. Note your Web Container ID (e.g. `GTM-XXXXXX`).
3. Set `gtmContainerId` in [environment.prod.ts](./ui/src/environments/environment.prod.ts) (or [environment.ts](./ui/src/environments/environment.ts)).
4. **Edge Measurement Routing**:
   - The NGINX container includes a reverse proxy route (`${MEASUREMENT_PATH}`, default `/analytics`).
   - Requests to `/analytics/gtm.js` and `/analytics/gtag/js` are proxied to `www.googletagmanager.com`.
   - Telemetry hits to `/analytics/g/collect` are proxied to `region1.google-analytics.com`, and `/analytics/collect` to `www.google-analytics.com`.
   - The path is easily configurable via the `MEASUREMENT_PATH` environment variable in Cloud Run and `environment.measurementPath` in the Angular frontend.

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
