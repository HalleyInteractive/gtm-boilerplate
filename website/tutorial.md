# GTM Boilerplate - e-commerce website

## Setup

Welcome to the guided deployment of the e-commerce website. We will deploy the
demo site on [Google Cloud App Engine](https://cloud.google.com/appengine).

## Cloud Project

To start we need to select the Google Cloud Project to deploy the site in.

We'll be using gcloud to deploy solution on Google Cloud, this SDK should be
available directly from your Cloud Shell environment.

<walkthrough-project-setup></walkthrough-project-setup>

Click the Cloud Shell icon below to copy the command to your shell, and then run
it from the shell by pressing Enter/Return. Terraform will pick up the project
name from the environment variable.

```bash
export GOOGLE_CLOUD_PROJECT=<walkthrough-project-id/>
```


## Configure Google Cloud Permissions

To ensure your App Engine deployment does not fail due to Google Cloud's secure-by-default policies, we need to quickly authorize the default service accounts.

Click the **Cloud Shell arrow button** on the top right of the code box below to automatically grant the correct administrative, storage, and registry roles:

```sh
# 1. Automatically detect active project, user, and project number
PROJECT_ID=$(gcloud config get-value project)
USER_EMAIL=$(gcloud config get-value account)
PROJECT_NUM=$(gcloud projects list --filter="projectId:${PROJECT_ID}" --format="value(projectNumber)")

echo "⚙️  Configuring Master IAM permissions for Project ID: ${PROJECT_ID}..."

# 2. Grant Owner to your active user account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="user:${USER_EMAIL}" \
    --role="roles/owner" \
    --no-user-output-enabled

# 3. Grant Storage Admin to App Engine Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
    --role="roles/storage.admin" \
    --no-user-output-enabled

# 4. Grant Artifact Registry permissions to Cloud Build
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" \
    --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
    --role="roles/artifactregistry.createOnPushWriter" \
    --no-user-output-enabled

# 5. Grant Artifact Registry permissions to Default Compute Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" \
    --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUM}-compute@developer.gserviceaccount.com" \
    --role="roles/artifactregistry.createOnPushWriter" \
    --no-user-output-enabled

# 6. Grant Artifact Registry permissions to App Engine Service Account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" \
    --no-user-output-enabled
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
    --role="roles/artifactregistry.createOnPushWriter" \
    --no-user-output-enabled

# 7. Grant Artifact Registry permissions to Cloud Build Service Agent
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:service-${PROJECT_NUM}@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin" \
    --no-user-output-enabled

echo "========================================="
echo "✅ Permissions applied! You are ready to deploy."
echo "========================================="
```

Once the terminal prints success, click the button below to deploy your App Engine website:

```sh
gcloud app deploy --no-cache
```


## Prepare environment

Google Cloud Project: <walkthrough-project-id/>

Before we deploy the solution let's modify the file that holds the environment
variables the site needs.

Open <walkthrough-editor-open-file filePath="././ui/src/environments/environment.prod.ts">
environment.prod.ts</walkthrough-editor-open-file>

Fill in the GTM Web Container ID and change locale settings accordingly.

Variable             | Description
-------------------- | -----------
currency             | This is the currency used for all products and tagging/conversions
localCode            | This is used to determine the pricing number format.
gtmContainerId       | Paste your GTM Web Container ID here (formatted as GTM-XXXXXX)
googleTagId          | Paste your GA Measurement ID
sgtmTagServingUrl    | Paste your URL for first-party script serving via sGTM
cdnTagServingUrl     | Paste your URL for first-party script serving via CDN
sgtmEndpointUrl      | Paste your sGTM endpoint URL

After that, let's get the deployment started.

## Deploying

First we need to build the angular code by running:
```bash
cd ui
npm install -g @angular/cli
npm install
ng build
cd ..
```

Then initialise `gcloud`, making sure you're logged in and have an active
account selected. If you've already intialised `gcloud` you can skip this step.
Follow the prompts in the console during the initialisation.
```bash
gcloud init
```

With the next command we'll deploy the website on AppEngine, run the next
command in the console and follow the prompts during the deployment.
```bash
gcloud app deploy
```

Once the deployment is completed you can use the follow command to describe the
newly deployed service, showing you the hostname and more details of the
deployed app.
```bash
gcloud app describe
```

If you want to view your service you can navigate to
<walkthrough-menu-navigation sectionId="APPENGINE_SECTION">AppEngine</walkthrough-menu-navigation>
via the menu.
