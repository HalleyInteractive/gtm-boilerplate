# Google Tag Gateway (GTG) & GTM Injection / `dataLayer` Order Test Suite

This application is a purpose-built static multi-page diagnostic test suite deployed on `nielsoverwijn.dev` (GTM Container `GTM-KDFCRJM5`) to test and prove how **Google Tag Gateway (via the in-UI GTM / Cloudflare integration)** handles:

1. **In-place tag rewriting vs. automatic `<head>` script injection** (both when the GTM UI automatic injection toggle is **OFF** and **ON**).
2. **HTML script placement & construction**: Standard GTM IIFE in `<head>`, Standard GTM IIFE at the bottom of `<body>`, Explicitly Retagged First-Party snippet (`/d4t4/gtm.js`), Direct `<script async src="...">` tag, Improperly Constructed / Dynamic JS Variable URL (`j.src = base + '/gtm.js'`), and No GTM Tag in Origin HTML.
3. **`window.dataLayer` pre-load verification**: Proving that items pushed to `window.dataLayer` prior to the GTM snippet in `<head>` (`head_pre_load_token`) and mid-`<body>` (`body_pre_load_token`) are present **before** `gtm.js` initializes when the page is properly tagged/retagged, whereas improper tag construction causes Cloudflare to inject a GTM script at the top of `<head>` *ahead* of `dataLayer` initialization.

---

## Test Routes on `nielsoverwijn.dev`

Each route is served by NGINX as an independent, static HTML document (`Cache-Control: no-cache, no-store`) so Cloudflare's HTMLRewriter evaluates each page's exact HTML over the wire:

| Path | GTM Placement in Origin HTML | Snippet Construction | What It Tests / Proves |
| :--- | :--- | :--- | :--- |
| `/` | `<head>` (after `#dl-head-init`) | Standard IIFE (`https://www.googletagmanager.com/gtm.js`) | Hub dashboard + baseline standard `<head>` test. |
| `/standard-head` | `<head>` (after `#dl-head-init`) | Standard IIFE (`https://www.googletagmanager.com/gtm.js`) | Proves Cloudflare recognizes the standard snippet and rewrites it **in-place** after `#dl-head-init`, keeping `head_pre_load_token` at `dataLayer[0]` before `gtm.js`. |
| `/standard-body-end` | Bottom of `<body>` (after `#dl-head-init` & `#dl-body-init`) | Standard IIFE (`https://www.googletagmanager.com/gtm.js`) | Tests whether Cloudflare rewrites a standard GTM snippet in-place at the bottom of `<body>` (preserving both `<head>` and `<body>` `dataLayer` pushes prior to `gtm.js`) vs. injecting in `<head>`. |
| `/retagged-head` | `<head>` (after `#dl-head-init`) | First-Party Retagged IIFE (`/${MEASUREMENT_PATH}/gtm.js`) | Explicitly retagged first-party snippet in `<head>` after `#dl-head-init`. |
| `/retagged-first-party` | Bottom of `<body>` (after `#dl-head-init` & `#dl-body-init`) | First-Party Retagged IIFE (`/${MEASUREMENT_PATH}/gtm.js`) | Proves that when a page is properly retagged at the bottom of `<body>`, GTM loads strictly where placed and **both** `head_pre_load_token` and `body_pre_load_token` are in `dataLayer` prior to `gtm.js`. |
| `/dynamic-broken` | Bottom of `<body>` | Dynamic JS variable URL (`w.__APP_ENV__.TAG_BASE + '/gtm.js'`) | Reproduces the old `index.html` bug where `j.src` is constructed dynamically via JS variables. Because Cloudflare does not recognize a standard tag in the HTML, it **injects its own GTM script at the top of `<head>`** *before* `#dl-head-init`! |
| `/no-tag` | None (0 GTM snippets in origin HTML) | None | Tests whether Cloudflare still injects the GTM script into `<head>` when no tag exists in the origin HTML (toggle OFF vs. ON). |
| `/direct-script-tag` | Bottom of `<body>` | `<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-KDFCRJM5">` | Tests a direct `<script src>` HTML tag at the bottom of `<body>` without the IIFE `insertBefore` DOM movement. |

---

## Setting Up GTM Trigger & Variable Verification (`GTM-KDFCRJM5`)

In addition to automatic on-page `window.dataLayer` index order inspection, synchronous parser snapshots (`__HEAD_SNAPSHOT__` and `__BODY_SNAPSHOT__`), and wire-level HTML diffs (`/raw-origin/*.txt` vs. `text/html`), every page listens for a callback from GTM Container `GTM-KDFCRJM5` to prove what values GTM actually read when `gtm.js` initialized:

1. **Create 2 User-Defined Data Layer Variables in `GTM-KDFCRJM5`**:
   - **`DLV - head_pre_load_token`** &rarr; Data Layer Variable Name: `head_pre_load_token`
   - **`DLV - body_pre_load_token`** &rarr; Data Layer Variable Name: `body_pre_load_token`
2. **Enable Built-In Variable**:
   - **`Event`**
3. **Create a Custom HTML Tag (`GTM Verification Callback`)**:
   - **Trigger**: `All Pages (Page View / gtm.js)`
   - **HTML**:
     ```html
     <script>
       window.__GTM_CALLBACK_DATA__ = window.__GTM_CALLBACK_DATA__ || [];
       var payload = {
         event: "gtm_verification_callback",
         triggerEvent: {{Event}},
         headTokenReadByGtm: {{DLV - head_pre_load_token}},
         bodyTokenReadByGtm: {{DLV - body_pre_load_token}},
         recordedAt: new Date().toISOString()
       };
       window.__GTM_CALLBACK_DATA__.push(payload);
       window.dataLayer.push(payload);
       window.dispatchEvent(new CustomEvent("gtm-verification-fired"));
     </script>
     ```
4. **Publish the container**. Every test page on `nielsoverwijn.dev` will automatically display the live `{{DLV - head_pre_load_token}}` and `{{DLV - body_pre_load_token}}` values resolved by GTM at container load time!
