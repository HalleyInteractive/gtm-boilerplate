# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0, < 7.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# 1. Enable Required Google Cloud APIs
# -----------------------------------------------------------------------------
resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# 2. Reserve Global Static External IPv4 Address
# -----------------------------------------------------------------------------
resource "google_compute_global_address" "default" {
  name        = "${var.resource_prefix}-ip"
  description = "Global Anycast IP for ${var.domain}"
  ip_version  = "IPV4"
  depends_on  = [google_project_service.compute]
}

# -----------------------------------------------------------------------------
# 3. Google-Managed SSL Certificate
# -----------------------------------------------------------------------------
resource "google_compute_managed_ssl_certificate" "default" {
  name        = "${var.resource_prefix}-cert"
  description = "Google-managed SSL certificate for ${var.domain}"

  managed {
    domains = [var.domain]
  }
  depends_on = [google_project_service.compute]
}

# -----------------------------------------------------------------------------
# 4. Cloud Run Backend (Serverless NEG & Backend Service)
# -----------------------------------------------------------------------------
resource "google_compute_region_network_endpoint_group" "cloud_run_neg" {
  name                  = "${var.resource_prefix}-cr-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = var.service_name
  }
  depends_on = [google_project_service.compute]
}

resource "google_compute_backend_service" "cloud_run_backend" {
  name                  = "${var.resource_prefix}-cr-backend"
  description           = "Backend service routing to Cloud Run SPA (${var.service_name})"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run_neg.id
  }
}

# -----------------------------------------------------------------------------
# 5. Google Tag Gateway (GTG) Edge Reverse Proxy Backend (Internet NEG)
# -----------------------------------------------------------------------------
resource "google_compute_global_network_endpoint_group" "gtg_neg" {
  name                  = "${var.resource_prefix}-gtg-neg"
  description           = "Internet NEG for Google Tag Gateway (${var.gtg_tag_id}.fps.goog)"
  network_endpoint_type = "INTERNET_FQDN_PORT"
  default_port          = 443
  depends_on            = [google_project_service.compute]
}

resource "google_compute_global_network_endpoint" "gtg_endpoint" {
  global_network_endpoint_group = google_compute_global_network_endpoint_group.gtg_neg.name
  fqdn                          = "${var.gtg_tag_id}.fps.goog"
  port                          = 443
}

resource "google_compute_backend_service" "gtg_backend" {
  name                  = "${var.resource_prefix}-gtg-backend"
  description           = "Edge reverse proxy backend service for Google Tag Gateway"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  custom_request_headers = [
    "Host: ${var.gtg_tag_id}.fps.goog"
  ]

  backend {
    group = google_compute_global_network_endpoint_group.gtg_neg.id
  }
  depends_on = [google_compute_global_network_endpoint.gtg_endpoint]
}

# -----------------------------------------------------------------------------
# 6. URL Map (Edge Routing: /d4t4/* -> GTG, /* -> Cloud Run)
# -----------------------------------------------------------------------------
resource "google_compute_url_map" "default" {
  name            = "${var.resource_prefix}-url-map"
  description     = "URL map routing GTG measurement paths to internet NEG and SPA to Cloud Run"
  default_service = google_compute_backend_service.cloud_run_backend.id

  host_rule {
    hosts        = [var.domain, "*"]
    path_matcher = "gtg-matcher"
  }

  path_matcher {
    name            = "gtg-matcher"
    default_service = google_compute_backend_service.cloud_run_backend.id

    path_rule {
      paths = [
        "${var.measurement_path}/*",
        var.measurement_path
      ]
      service = google_compute_backend_service.gtg_backend.id
    }
  }
}

# -----------------------------------------------------------------------------
# 7. Target HTTPS Proxy & Global Forwarding Rule (Port 443)
# -----------------------------------------------------------------------------
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.resource_prefix}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "${var.resource_prefix}-https-rule"
  description           = "Global HTTPS forwarding rule for ${var.domain}"
  target                = google_compute_target_https_proxy.default.id
  port_range            = "443"
  ip_address            = google_compute_global_address.default.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# -----------------------------------------------------------------------------
# 8. HTTP-to-HTTPS Automatic Redirect (Port 80)
# -----------------------------------------------------------------------------
resource "google_compute_url_map" "https_redirect" {
  name        = "${var.resource_prefix}-http-redirect-map"
  description = "URL map for automatic HTTP to HTTPS redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "https_redirect" {
  name    = "${var.resource_prefix}-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.resource_prefix}-http-rule"
  description           = "Global HTTP forwarding rule for port 80 to 443 redirect"
  target                = google_compute_target_http_proxy.https_redirect.id
  port_range            = "80"
  ip_address            = google_compute_global_address.default.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
