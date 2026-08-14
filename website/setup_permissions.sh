#!/bin/bash

# 1. Detect active project from the environment variable,
# with a fallback to gcloud config if the variable is empty.
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
USER_EMAIL=$(gcloud config get-value account)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "❌ ERROR: No active Google Cloud project detected."
  echo "Please make sure you clicked on 'export GOOGLE_CLOUD_PROJECT=...' first."
  exit 1
fi

echo "🚀 Configuring Master IAM permissions for Project ID: ${PROJECT_ID}..."

# 2. Enable Google Cloud APIs automatically
echo "⚙️ Enabling Google Cloud APIs (Cloud Build & App Engine)..."
gcloud services enable \
  cloudbuild.googleapis.com \
  appengine.googleapis.com \
  --project="${PROJECT_ID}"

# 3. Check and initialize App Engine
if ! gcloud app describe --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "🌐 App Engine is not initialized yet."
  echo "Select a Google Cloud region to initialize App Engine (this cannot be changed later):"
  echo "1) europe-west3 (Frankfurt) [Default]"
  echo "2) us-central1 (Iowa)"
  echo "3) us-east1 (South Carolina)"
  echo "4) asia-east1 (Taiwan)"
  echo "5) Enter a custom region"
  read -p "Choose an option (1-5, default is 1): " REGION_CHOICE

  case $REGION_CHOICE in
    2) REGION="us-central1" ;;
    3) REGION="us-east1" ;;
    4) REGION="asia-east1" ;;
    5) 
      read -p "Enter custom GCP region: " REGION
      ;;
    *) REGION="europe-west3" ;;
  esac

  echo "📦 Initializing App Engine in '${REGION}'..."
  gcloud app create --region="${REGION}" --project="${PROJECT_ID}"
else
  echo "✅ App Engine is already initialized."
fi

# 4. Wait briefly for newly created Service Accounts to propagate
echo "⏳ Waiting 10 seconds for backend service accounts to propagate..."
sleep 10

# 5. Fetch project number now that APIs are fully active
PROJECT_NUM=$(gcloud projects list --filter="projectId:${PROJECT_ID}" --format="value(projectNumber)")

# 6. Grant Owner to your active user account
echo "🔑 Assigning Owner role to ${USER_EMAIL}..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="user:${USER_EMAIL}" --role="roles/owner" --no-user-output-enabled

# 7. Grant Storage Admin to App Engine Service Account
echo "🔑 Assigning Storage Admin to App Engine Service Account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/storage.admin" --no-user-output-enabled

# 8. Grant Artifact Registry permissions to Cloud Build
echo "🔑 Assigning Artifact Registry permissions to Cloud Build..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 9. Grant Artifact Registry permissions to Default Compute Service Account
echo "🔑 Assigning Artifact Registry permissions to Default Compute Service Account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 10. Grant Artifact Registry permissions to App Engine Service Account
echo "🔑 Assigning Artifact Registry permissions to App Engine Service Account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 11. Grant Artifact Registry permissions to Cloud Build Service Agent
echo "🔑 Assigning Artifact Registry permissions to Cloud Build Service Agent..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:service-${PROJECT_NUM}@gcp-sa-cloudbuild.iam.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled

echo "========================================="
echo "✅ All APIs enabled and permissions applied automatically!"
echo "🚀 You are fully ready to deploy your boilerplate website!"
echo "========================================="
