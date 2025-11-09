# Quick Setup Guide

## Prerequisites

1. **Google Cloud Account**: Sign up at https://cloud.google.com/
2. **Node.js 18+**: Download from https://nodejs.org/
3. **Google Cloud SDK**: Install from https://cloud.google.com/sdk/docs/install
4. **Arca Account**: Your existing Arca credentials

## Step-by-Step Setup

### 1. Google Cloud Project Setup (5 minutes)

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create arca-booking-app-YOUR-NAME --name="Arca Booking"

# Set the project
gcloud config set project arca-booking-app-YOUR-NAME

# Enable required APIs
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com  
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create Firestore database
gcloud firestore databases create --location=us-central1
```

### 2. Google OAuth Setup (3 minutes)

1. Visit: https://console.cloud.google.com/apis/credentials
2. Click **"Create Credentials" > "OAuth 2.0 Client ID"**
3. If prompted, configure consent screen:
   - User Type: **External**
   - App name: **Arca Booking App**
   - User support email: Your email
   - Developer contact: Your email
   - Save and continue through remaining screens
4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **Arca Booking Web**
   - Authorized redirect URIs:
     - Add: `http://localhost:8080/auth/google/callback`
     - (You'll add production URL after deployment)
5. **Save the Client ID and Client Secret**

### 3. Local Development Setup (5 minutes)

```bash
# Clone/navigate to project
cd arca-booking-app

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_CLOUD_PROJECT=arca-booking-app-YOUR-NAME
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback
SESSION_SECRET=run_this_command_to_generate_openssl_rand_base64_32
ARCA_BASE_URL=https://arca.dk
PORT=8080
NODE_ENV=development
```

Create service account for local dev:
```bash
# Create service account
gcloud iam service-accounts create arca-booking-dev

# Grant Firestore access
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:arca-booking-dev@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Download credentials
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=arca-booking-dev@$(gcloud config get-value project).iam.gserviceaccount.com
```

### 4. Test Locally (2 minutes)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
cd frontend
npm start
```

Visit: http://localhost:4200

Test the login flow!

### 5. Deploy to Cloud Run (5 minutes)

```bash
# Make deploy script executable (Mac/Linux)
chmod +x deploy.sh

# Deploy
./deploy.sh

# Or manually:
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/arca-booking-app
gcloud run deploy arca-booking-app \
  --image gcr.io/$(gcloud config get-value project)/arca-booking-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Get your deployment URL:
```bash
gcloud run services describe arca-booking-app --region us-central1 --format 'value(status.url)'
```

### 6. Update OAuth Redirect URI

1. Go back to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. Add to **Authorized redirect URIs**:
   - `https://YOUR-APP-URL.run.app/auth/google/callback`
4. Save

### 7. Set Production Environment Variables

```bash
gcloud run services update arca-booking-app \
  --set-env-vars="GOOGLE_CLIENT_ID=your-client-id" \
  --set-env-vars="GOOGLE_CLIENT_SECRET=your-secret" \
  --set-env-vars="SESSION_SECRET=$(openssl rand -base64 32)" \
  --set-env-vars="GOOGLE_CALLBACK_URL=https://YOUR-APP-URL.run.app/auth/google/callback" \
  --region us-central1
```

### 8. Setup Automated Booking (2 minutes)

```bash
# Make script executable
chmod +x setup-cron.sh

# Run setup
./setup-cron.sh

# Or manually:
gcloud scheduler jobs create http arca-booking-checker \
  --schedule="* * * * *" \
  --uri="https://YOUR-APP-URL.run.app/cron/check-bookings" \
  --http-method=POST \
  --location=us-central1 \
  --headers="X-Cloudscheduler=true"
```

## You're Done! 🎉

1. Visit your app: `https://YOUR-APP-URL.run.app`
2. Sign in with Google
3. Add your Arca credentials
4. Create booking rules
5. Wait for automatic bookings!

## Important: Update Arca API Endpoints

The app currently has placeholder endpoints. You need to:

1. Log in to https://arca.dk/booking/
2. Open DevTools (F12) > Network tab
3. Perform actions (view classes, book a class)
4. Note the API endpoints used
5. Update `backend/services/arca-client.js`:

```javascript
// Update these methods with real endpoints:
async getClasses(startDate, endDate) {
  const endpoint = `/api/classes?start=${startDate}&end=${endDate}`;
  return await this.makeRequest(endpoint);
}

async bookClass(classId) {
  const endpoint = `/api/bookings`;
  return await this.makeRequest(endpoint, 'POST', { class_id: classId });
}
```

## Troubleshooting

### "gcloud: command not found"
Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### "Permission denied" errors
```bash
gcloud auth login
gcloud auth application-default login
```

### Firestore permission errors
```bash
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:$(gcloud config get-value project)@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Frontend not building
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Cost Estimation

With Google Cloud free tier:
- **Cloud Run**: 2M requests/month - **FREE**
- **Firestore**: 50k reads, 20k writes/day - **FREE**
- **Cloud Scheduler**: 3 jobs - **FREE**
- **Cloud Build**: 120 build-minutes/day - **FREE**

**Total cost if within limits: $0/month** 💰

## Need Help?

- Check logs: `gcloud run services logs read arca-booking-app --region us-central1`
- View metrics: https://console.cloud.google.com/run
- Scheduler status: https://console.cloud.google.com/cloudscheduler

## Security Best Practices

1. **Never commit `.env` or `serviceAccountKey.json`** (they're in .gitignore)
2. **Use Secret Manager in production** for sensitive data
3. **Rotate session secrets regularly**
4. **Review Cloud Run access logs** periodically
5. **Enable Cloud Armor** if you get DDoS attacks

Enjoy never missing an Arca class again! 🏋️‍♂️

