#!/bin/bash
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

set -e

echo "=========================================================="
echo "🚀 Google Cloud Run & Cloud Build Multi-Platform Setup"
echo "=========================================================="

# 1. Detect active project ID
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null || true)}
USER_EMAIL=$(gcloud config get-value account 2>/dev/null || true)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "❌ ERROR: No active Google Cloud project detected."
  echo "Please set your project using: gcloud config set project <YOUR_PROJECT_ID>"
  exit 1
fi

echo "📋 Active GCP Project ID: ${PROJECT_ID}"
echo "👤 Active User Account : ${USER_EMAIL}"

# 2. Configurable deployment settings
REGION=${GCP_REGION:-"europe-west4"}
AR_REPO_NAME=${ARTIFACT_REPO:-"gtm-boilerplate-repo"}

echo ""
echo "⚙️ Deployment Configuration:"
echo "   - Region:            ${REGION}"
echo "   - Artifact Registry: ${AR_REPO_NAME}"
echo "   - Services Deployed: gtm-boilerplate, gtm-boilerplate-nginx, gtm-boilerplate-apache, gtm-boilerplate-gcp"
echo ""

# 3. Enable Required Google Cloud APIs
echo "🔌 Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Compute & Artifact Registry)..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}"

# 4. Create Artifact Registry Docker Repository (if not exists)
echo "📦 Checking Artifact Registry Docker repository..."
if ! gcloud artifacts repositories describe "${AR_REPO_NAME}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✨ Creating Artifact Registry repository '${AR_REPO_NAME}' in '${REGION}'..."
  gcloud artifacts repositories create "${AR_REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker repository for GTM Boilerplate" \
    --project="${PROJECT_ID}"
else
  echo "✅ Artifact Registry repository '${AR_REPO_NAME}' already exists."
fi

# 5. Fetch project number for IAM bindings
PROJECT_NUM=$(gcloud projects list --filter="projectId:${PROJECT_ID}" --format="value(projectNumber)")
CLOUDBUILD_SA="${PROJECT_NUM}@cloudbuild.gserviceaccount.com"

echo "🔑 Configuring Cloud Build Service Account permissions (${CLOUDBUILD_SA})..."

# Grant Cloud Run Admin role to Cloud Build SA
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin" \
  --no-user-output-enabled

# Grant Compute Admin role to Cloud Build SA (for Load Balancer, SSL certs, and NEGs)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/compute.admin" \
  --no-user-output-enabled

# Also grant Compute Admin to any custom CI/CD service accounts (e.g. cicd-*)
for sa in $(gcloud iam service-accounts list --filter="email:cicd-*" --format="value(email)" --project="${PROJECT_ID}" 2>/dev/null); do
  echo "🔑 Granting roles/compute.admin to custom CI/CD service account (${sa})..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${sa}" \
    --role="roles/compute.admin" \
    --no-user-output-enabled || true
done

# Grant Service Account User role to Cloud Build SA (to deploy Cloud Run as Compute SA)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --no-user-output-enabled

# Grant Artifact Registry Writer & Admin to Cloud Build SA
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --no-user-output-enabled

# Also ensure Cloud Build Service Agent has required roles
if [ -n "${PROJECT_NUM}" ]; then
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:service-${PROJECT_NUM}@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" \
    --no-user-output-enabled || true
fi

echo "=========================================================="
echo "✅ GCP Infrastructure & IAM Permissions configured!"
echo "=========================================================="
echo ""
echo "🔗 Next Step: Connect your GitHub Repository to Cloud Build Trigger:"
echo "   1. Open Google Cloud Console Cloud Build Triggers:"
echo "      https://console.cloud.google.com/cloud-build/triggers/connect?project=${PROJECT_ID}"
echo "   2. Select 'GitHub (Cloud Build GitHub App)'"
echo "   3. Authenticate and select your repository: gtm-boilerplate"
echo "   4. Create a trigger:"
echo "      - Name: deploy-gtm-boilerplate-all-on-push"
echo "      - Event: Push to a branch"
echo "      - Branch: ^main$"
echo "      - Configuration: Cloud Build configuration file (yaml)"
echo "      - Location: cloudbuild.yaml"
echo ""
echo "🚀 To test manual deployment right now from your local machine, run:"
echo "   gcloud builds submit --config=cloudbuild.yaml --substitutions=_REGION=${REGION},_AR_REPO_NAME=${AR_REPO_NAME}"
echo "=========================================================="
