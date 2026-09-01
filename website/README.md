# Google Tag Manager Ecommerce Demo Store - GCP Load Balancer & GTG Reverse Proxy

This repository provides a sample e-commerce demo store instrumented with Google Tag Manager, Google Analytics 4 (GA4), and **Google Tag Gateway (GTG)**.

On this branch (`gcp`), the architecture uses a **Google Cloud External Application Load Balancer** with an **Internet Network Endpoint Group (Internet NEG)** to execute the GTG reverse proxy directly at the GCP Global Anycast Edge, completely offloading tracking telemetry from the Cloud Run application.

---

## Architecture Overview

```
                                [ Visitor Browser ]
                                         |
                                (HTTPS:443 / HTTP:80)
                                         |
                                         v
                         [ Global Anycast Static IPv4 ]
                                         |
                         +---------------+---------------+
                         |  HTTP Port 80 Redirect Map    | (301 to HTTPS)
                         +-------------------------------+
                                         |
                        [ Target HTTPS Proxy + SSL Cert ]
                         (Google-managed: gcp.nielsoverwijn.dev)
                                         |
                              [ Global URL Map ]
                                      / \
                 /d4t4/* (GTG Routes)/   \  /* (Default Routes)
                                    /     \
                                   v       v
            +--------------------------+   +-----------------------------+
            | GTG Backend Service      |   | Cloud Run Backend Service   |
            | (Host: *.fps.goog)       |   | (Serverless NEG)            |
            +--------------------------+   +-----------------------------+
                         |                                |
                         v                                v
             [ Global Internet NEG ]            [ Cloud Run Service ]
           (*.fps.goog:443 via HTTPS)         (gtm-boilerplate-gcp:8080)
```

### Key Architectural Highlights

1. **Edge Reverse Proxy via Internet NEG**:
   - Requests to `${MEASUREMENT_PATH}/*` (default `/d4t4/*`) and `${MEASUREMENT_PATH}` are routed directly by the GCP Load Balancer to `https://${GTG_TAG_ID}.fps.goog/` with an automatic `Host: ${GTG_TAG_ID}.fps.goog` rewrite.
   - Proxies tag script serving (`/d4t4/gtm.js`, `/d4t4/gtag/js`), telemetry collection (`/d4t4/g/collect`), and GTG health checks (`/d4t4/healthy`).
   - Zero CPU and latency overhead on Cloud Run; tracking traffic never hits your application containers.
2. **Cloud Run Ingress Lockdown**:
   - The Cloud Run service (`gtm-boilerplate-gcp`) is configured with `--ingress=internal-and-cloud-load-balancing`.
   - Direct access via `*.run.app` is blocked, ensuring all users and measurement traffic route through the load balancer and your custom domain.
3. **Automated SSL & Security**:
   - Uses a **Google-Managed SSL Certificate** with automatic provisioning and renewal for `gcp.nielsoverwijn.dev`.
   - Automatic HTTP-to-HTTPS redirect on port 80.
4. **Clean Customer Sharability**:
   - **Idempotent Bash Script (`setup_load_balancer.sh`)**: Runs seamlessly in Cloud Build CI/CD or Cloud Shell with zero external dependencies.
   - **Standalone Terraform Module (`website/terraform/`)**: Production-ready declarative IaC for customers managing infrastructure with Terraform.

---

## Deployment & Automated CI/CD

### 1. One-Time GCP Infrastructure & IAM Setup

Run the automated setup script to enable APIs, create the Artifact Registry Docker repository, and grant Cloud Build permissions:

```bash
cd website
bash setup_cloud_run.sh
```

### 2. Automated Continuous Deployment via GitHub (Cloud Build)

1. Open [Google Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers).
2. Click **Connect Repository** and select `gtm-boilerplate`.
3. Create a trigger:
   - **Name**: `deploy-gtm-boilerplate-gcp`
   - **Event**: `Push to a branch`
   - **Source**: `^gcp$`
   - **Configuration**: `Cloud Build configuration file (yaml)`
   - **Location**: `website/cloudbuild.yaml` (or `cloudbuild.yaml`)
4. Save the trigger.

Every push to `gcp` automatically:
1. Builds and containerizes the Angular SPA with NGINX.
2. Deploys to Cloud Run service `gtm-boilerplate-gcp` (ingress restricted to load balancer).
3. Executes `setup_load_balancer.sh` to idempotently provision or update the GCP Load Balancer, SSL certs, and GTG Internet NEG.

### 3. Manual Deployment (Alternative)

To deploy immediately from your terminal:

```bash
cd website
gcloud builds submit --config=cloudbuild.yaml
```

---

## Cloudflare DNS Configuration

Once the script or Terraform runs, it outputs the reserved Global Static IPv4 address (e.g. `34.xxx.xxx.xxx`):

1. Open **Cloudflare Dashboard** $\rightarrow$ Select `nielsoverwijn.dev`.
2. Go to **DNS** $\rightarrow$ **Records** $\rightarrow$ **Add Record**:
   - **Type**: `A`
   - **Name**: `gcp`
   - **IPv4 address**: `<YOUR_LOAD_BALANCER_STATIC_IP>`
   - **Proxy status**: **DNS only (Grey Cloud ⚪)**
   - **TTL**: `Auto`
3. Save the record.

> [!NOTE]
> Google checks DNS records to authorize and issue the Google-managed SSL certificate. Setting Cloudflare to **DNS only** allows Google's domain verification to succeed automatically within 10–20 minutes.

To monitor certificate provisioning:
```bash
gcloud compute ssl-certificates describe gtm-gcp-cert --global --format='get(managed.status,managed.domainStatus)'
```

---

## Verification Endpoints

Once the SSL certificate state becomes `ACTIVE`:

* **Web Store SPA**: `https://gcp.nielsoverwijn.dev/`
* **GTG Health Check**: `https://gcp.nielsoverwijn.dev/d4t4/healthy`
* **GTG Tag Script**: `https://gcp.nielsoverwijn.dev/d4t4/gtm.js?id=GTM-KDFCRJM5`
* **GA4 Data Collection**: `https://gcp.nielsoverwijn.dev/d4t4/g/collect`

---

## Using Terraform (Optional)

If sharing with customers who prefer Terraform:

```bash
cd website/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in project_id, domain, etc.
terraform init
terraform apply
```

See [website/terraform/README.md](./terraform/README.md) for full details.

---

## Disclaimers

__This is not an officially supported Google product.__

Copyright 2024 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind.
