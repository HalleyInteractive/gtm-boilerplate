# GTM Boilerplate - e-commerce website

## Setup

Welcome to the guided deployment of the e-commerce website. We will deploy the demo site on **[Google Cloud Run](https://cloud.google.com/run)** using **[Google Cloud Build](https://cloud.google.com/build)**.

## Cloud Project

To start we need to select the Google Cloud Project to deploy the site in.

We'll be using `gcloud` to deploy the solution on Google Cloud, which is available directly in your Cloud Shell environment.

<walkthrough-project-setup></walkthrough-project-setup>

Run the following command to set your active project ID:

```bash
export GOOGLE_CLOUD_PROJECT=<walkthrough-project-id/>
```

## Configure Google Cloud Infrastructure & Permissions

To enable required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry) and configure IAM permissions:

```sh
bash setup_cloud_run.sh
```

## Prepare Tracking & Environment Configuration

Before deploying, you can review and configure your currency and locale parameters in [environment.prod.ts](./ui/src/environments/environment.prod.ts):

Variable  | Description
--------- | -----------
currency  | Currency code used for products and conversion events (default: `GBP`)
localCode | Locale code used for currency formatting (default: `en-GB`)

Google Tag Manager is initialized directly in [index.html](./ui/src/index.html) after the Consent Mode v2 default/update scripts. When using Cloudflare Google Tag Gateway (with "Set up tag" toggled OFF), Cloudflare injects the first-party container script at the top of `<head>`, so `index.html` only pushes `{'gtm.start': new Date().getTime(), event: 'gtm.js'}` to `window.dataLayer`.

## Continuous Deployment via GitHub (Automated on Push)

1. Open [Cloud Build Triggers Console](https://console.cloud.google.com/cloud-build/triggers).
2. Connect your GitHub repository.
3. Create a trigger (`GTM-Boilerplate-CICD`) that executes `cloudbuild.yaml` on pushes to `^main$`.

## Manual Deployment

You can also trigger a deployment directly using Cloud Build:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Once the build completes, the Cloud Run service URL will be printed to your console.
