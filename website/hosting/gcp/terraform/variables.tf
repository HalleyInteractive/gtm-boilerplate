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

variable "project_id" {
  type        = string
  description = "The Google Cloud project ID."
}

variable "region" {
  type        = string
  description = "The Google Cloud region where the Cloud Run service is deployed."
  default     = "europe-west4"
}

variable "service_name" {
  type        = string
  description = "Name of the Cloud Run service."
  default     = "gtm-boilerplate-gcp"
}

variable "domain" {
  type        = string
  description = "Fully-qualified custom domain or subdomain pointing to the Load Balancer (e.g. gcp.nielsoverwijn.dev)."
  default     = "gcp.nielsoverwijn.dev"
}

variable "gtg_tag_id" {
  type        = string
  description = "The Google Tag Gateway container/tag ID (e.g. GTM-KDFCRJM5)."
  default     = "GTM-KDFCRJM5"
}

variable "measurement_path" {
  type        = string
  description = "The first-party measurement path to proxy to GTG (e.g. /d4t4)."
  default     = "/d4t4"
}

variable "resource_prefix" {
  type        = string
  description = "Prefix prepended to all GCP load balancer resources."
  default     = "gtm-gcp"
}
