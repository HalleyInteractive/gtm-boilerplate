# GCP Load Balancer with Google Tag Gateway (GTG) Reverse Proxy - Terraform Module

This Terraform module provisions an **External Application Load Balancer** (Global HTTP(S) Load Balancer) in Google Cloud that:
1. **Routes Web Traffic**: Forwards all standard web application traffic (`/*`) to a Cloud Run Single-Page Application (SPA) backend via a **Serverless Network Endpoint Group (NEG)**.
2. **Proxies Google Tag Gateway at the Edge**: Intercepts Google Tag Gateway measurement routes (`/d4t4/*` and `/d4t4`) and routes them directly to Google Tag Gateway (`<GTG_TAG_ID>.fps.goog`) via an **Internet FQDN Network Endpoint Group (Internet NEG)** with the required `Host` header rewrite.
3. **Automates SSL & Security**:
   - Provisions a **Google-Managed SSL Certificate** with automatic renewal.
   - Enforces **HTTP-to-HTTPS redirect** on port 80.
   - Locks Cloud Run ingress to internal and load balancer traffic only (`internal-and-cloud-load-balancing`).

---

## Architecture Diagram

```
                              [ Client Browser ]
                                      |
                         (HTTPS:443 / HTTP:80)
                                      |
                                      v
                        [ Global Static Anycast IP ]
                                      |
                         +------------+------------+
                         | HTTP:80 Redirect URLMap | (301 to HTTPS)
                         +-------------------------+
                                      |
                       [ Target HTTPS Proxy + SSL ]
                                      |
                             [ Global URL Map ]
                                     / \
                /d4t4/* (GTG Routes)/   \  /* (Default Routes)
                                   /     \
                                  v       v
           +-------------------------+   +----------------------------+
           | GTG Backend Service     |   | Cloud Run Backend Service  |
           | (Host: *.fps.goog)      |   | (Serverless NEG)           |
           +-------------------------+   +----------------------------+
                        |                              |
                        v                              v
            [ Internet FQDN NEG ]            [ Cloud Run Service ]
          (*.fps.goog:443 via HTTPS)       (gtm-boilerplate-gcp:8080)
```

---

## Prerequisites

1. [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) >= 1.3.0
2. Authenticated Google Cloud CLI (`gcloud auth application-default login`)
3. Existing Cloud Run service (e.g. deployed via Cloud Build or `gcloud run deploy`)

---

## Quickstart

1. **Copy the example variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your GCP project ID and domain:
   ```hcl
   project_id       = "your-gcp-project-id"
   region           = "europe-west4"
   service_name     = "gtm-boilerplate-gcp"
   domain           = "gcp.nielsoverwijn.dev"
   gtg_tag_id       = "GTM-KDFCRJM5"
   measurement_path = "/d4t4"
   ```

3. **Initialize and Apply**:
   ```bash
   terraform init
   terraform apply
   ```

4. **Add DNS Record in Cloudflare**:
   From the Terraform output `load_balancer_ip`, add an `A` record in your DNS provider:
   - **Type**: `A`
   - **Name**: `gcp` (subdomain)
   - **Value**: `<load_balancer_ip>`
   - **Proxy Status**: **DNS only (Grey Cloud ⚪)**
