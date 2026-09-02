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

output "load_balancer_ip" {
  value       = google_compute_global_address.default.address
  description = "The reserved Global Static IPv4 address for the GCP Load Balancer."
}

output "custom_domain" {
  value       = var.domain
  description = "Configured custom domain."
}

output "cloudflare_dns_record" {
  value = {
    type         = "A"
    name         = replace(var.domain, ".nielsoverwijn.dev", "")
    content      = google_compute_global_address.default.address
    proxy_status = "DNS only (Grey Cloud ⚪)"
    ttl          = "Auto"
  }
  description = "Exact DNS record details to add in Cloudflare Dashboard."
}

output "ssl_certificate_id" {
  value       = google_compute_managed_ssl_certificate.default.id
  description = "Google-managed SSL certificate resource ID."
}

output "verification_urls" {
  value = {
    website         = "https://${var.domain}/"
    gtg_health      = "https://${var.domain}${var.measurement_path}/healthy"
    gtg_tag_script  = "https://${var.domain}${var.measurement_path}/gtm.js?id=${var.gtg_tag_id}"
    gtg_collect     = "https://${var.domain}${var.measurement_path}/g/collect"
  }
  description = "Key verification endpoints once SSL provisioning is ACTIVE."
}
