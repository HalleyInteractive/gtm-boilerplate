#!/bin/bash


# 1. Detect active project from the environment variable set by the walkthrough tag,
# with a fallback to gcloud config if the variable is empty.
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
USER_EMAIL=$(gcloud config get-value account)
PROJECT_NUM=$(gcloud projects list --filter="projectId:${PROJECT_ID}" --format="value(projectNumber)")

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "❌ ERROR: No active Google Cloud project detected."
    echo "Please make sure you clicked on 'export GOOGLE_CLOUD_PROJECT=...' first."
    exit 1
fi

echo "🚀 Configuring Master IAM permissions for Project ID: ${PROJECT_ID}..."

# 2. Grant Owner to your active user account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="user:${USER_EMAIL}" --role="roles/owner" --no-user-output-enabled

# 3. Grant Storage Admin to App Engine Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/storage.admin" --no-user-output-enabled

# 4. Grant Artifact Registry permissions to Cloud Build
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 5. Grant Artifact Registry permissions to Default Compute Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 6. Grant Artifact Registry permissions to App Engine Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" --role="roles/artifactregistry.createOnPushWriter" --no-user-output-enabled

# 7. Grant Artifact Registry permissions to Cloud Build Service Agent
gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:service-${PROJECT_NUM}@gcp-sa-cloudbuild.iam.gserviceaccount.com" --role="roles/artifactregistry.admin" --no-user-output-enabled

echo "========================================="
echo "✅ Permissions applied! You are ready to deploy."
echo "========================================="
