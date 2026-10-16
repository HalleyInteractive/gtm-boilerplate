# GTM Boilerplate — E-Commerce Website (`nielsoverwijn.dev`)

This directory contains the Angular demo e-commerce website deployed to **Google Cloud Run** (`gtm-boilerplate` in `europe-west4`, serving `https://nielsoverwijn.dev`) and connected to Google Tag Manager (`GTM-KDFCRJM5` Web / `GTM-WBDK738X` Server on `https://sgtm.nielsoverwijn.dev`).

## Architecture & Simplified GTM Setup

1. **Cloudflare Google Tag Gateway (GTG) with "Set up tag" OFF (`setUpTag: false`)**:
   - Cloudflare's edge `HTMLRewriter` automatically injects `window.google_tags_first_party.push('GTM-KDFCRJM5')` and the first-party container loader (`<script async src="/<measurement_path>/">`) at byte `0` of `<head>`.
   - Because **"Set up tag"** is toggled **OFF** in Cloudflare, Cloudflare does not push `gtm.start` at byte `0`.
2. **Manual `gtm.start` Initialization in [`ui/src/index.html`](./ui/src/index.html)**:
   - No custom JS snippet-loader service or UI tag-switcher component is used.
   - In [`ui/src/index.html`](./ui/src/index.html), Consent Mode v2 (`gtag('consent', 'default', ...)` and saved `consent-cookie` update) executes synchronously in `<head>`, followed immediately by the manual `gtm.start` push into `window.dataLayer`:
     ```html
     <!-- Google Tag Manager (Cloudflare GTG with "Set up tag" OFF injects the 1P container script; only gtm.start is needed in dataLayer) -->
     <script>
       window.dataLayer = window.dataLayer || [];
       window.dataLayer.push({
         'gtm.start': new Date().getTime(),
         event: 'gtm.js'
       });
     </script>
     <!-- End Google Tag Manager -->
     ```
   - *(Note: If deploying without Cloudflare GTG auto-injection, replace the block above with the standard Google Tag Manager `<head>` IIFE snippet for your `GTM-XXXXXXX` container).*
3. **E-Commerce & Consent `dataLayer` Events**:
   - [`EcommerceEventsService`](./ui/src/app/services/ecommerce-events.service.ts) pushes standard GA4 e-commerce events (`view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`) and Enhanced Conversions user data to `window.dataLayer`.
   - [`ConsentService`](./ui/src/app/services/consent.service.ts) and [`CookieBannerComponent`](./ui/src/app/components/cookie-banner/cookie-banner.component.ts) manage Consent Mode v2 (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`).

---

## Local Development

```bash
cd ui
npm install
npm start
```

Open `http://localhost:4200/` in your browser.

---

## Deploying to Google Cloud Run

The [`Dockerfile`](./Dockerfile) builds the Angular production bundle (`node:22-alpine`) and serves it via `nginx:alpine` using [`nginx.conf.template`](./nginx.conf.template).

### Automated CI/CD (Cloud Build)
Pushes to the `main` branch trigger the `GTM-Boilerplate-CICD` Cloud Build trigger (`europe-west4`) using [`../cloudbuild.yaml`](../cloudbuild.yaml), which builds, pushes to Artifact Registry (`gtm-boilerplate-repo/gtm-boilerplate`), and deploys the `gtm-boilerplate` Cloud Run service.

### Manual Deployment
```bash
gcloud builds submit --config=cloudbuild.yaml --project=nielsoverwijn-sgtm
```
