# Arca Booking Automation App

Automatically book your favorite Arca fitness classes when they become available. Never miss a class again!

## Features

- 🎯 **Automatic Booking**: Set your preferences and let the app book classes for you
- ⚡ **Lightning Fast**: Checks for available classes every minute
- 📧 **Email Notifications**: Get notified when a class is booked
- 🔒 **Secure**: Encrypted credential storage in Google Cloud
- 🎨 **Modern UI**: Clean Angular frontend with Google OAuth login
- 💰 **Cost-Optimized**: Runs for ~$0-2/month, mostly free tier eligible

## Architecture

- **Frontend**: Angular 17 with standalone components
- **Backend**: Node.js + Express
- **Database**: Google Cloud Firestore
- **Authentication**: Google OAuth 2.0
- **Hosting**: Google Cloud Run
- **Scheduling**: Google Cloud Scheduler (cron jobs)

## Prerequisites

- Google Cloud Platform account (with billing enabled)
- Node.js 20+ and npm
- Arca account credentials
- Google OAuth credentials

**💰 Cost**: ~$0-2/month (mostly free tier). See [COST-OPTIMIZATION.md](docs/COST-OPTIMIZATION.md) for details.

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo>
cd arca-booking-app
```

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Set Up Google Cloud Project

```bash
# Install Google Cloud SDK if you haven't
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable firestore.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create Firestore database (Native mode)
gcloud firestore databases create --location=us-central1
```

### 4. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Click **Create Credentials > OAuth 2.0 Client ID**
4. Configure consent screen if prompted
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:8080/auth/google/callback` (for local dev)
   - `https://YOUR-APP.run.app/auth/google/callback` (for production)
7. Save Client ID and Client Secret

### 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback
SESSION_SECRET=generate-a-random-secret
ARCA_BASE_URL=https://backend.arca.dk
PORT=8080
NODE_ENV=development
```

### 6. Set Up Service Account (Local Dev)

```bash
# Create service account
gcloud iam service-accounts create arca-booking-dev \
  --display-name="Arca Booking Dev"

# Grant Firestore access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:arca-booking-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Download key
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=arca-booking-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 7. Run Locally

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Visit `http://localhost:4200`

## Deployment to Google Cloud Run

**See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide including:**
- Environment variable handling
- Security best practices  
- OAuth configuration
- Troubleshooting

### Quick Deploy

**PowerShell (Windows - Recommended):**

```powershell
# 1. Make sure your .env file has:
#    GOOGLE_CLIENT_ID=...
#    GOOGLE_CLIENT_SECRET=...
#    SESSION_SECRET=...

# 2. Deploy (reads from .env automatically)
.\scripts\deploy.ps1

# 3. Set up nightly cron job (2 AM)
.\scripts\setup-cron.ps1
```

**Bash (Linux/Mac):**

```bash
# Set environment variables
export GOOGLE_CLIENT_ID='...'
export GOOGLE_CLIENT_SECRET='...'
export SESSION_SECRET='...'

# Deploy
./deploy.sh

# Set up cron
./setup-cron.sh
```

### Environment Variables

Required for production:
```bash
# Set secrets via Cloud Run console or CLI
gcloud run services update arca-booking-app \
  --set-env-vars="GOOGLE_CLIENT_ID=your-client-id" \
  --set-env-vars="GOOGLE_CLIENT_SECRET=your-client-secret" \
  --set-env-vars="SESSION_SECRET=your-session-secret" \
  --set-env-vars="GOOGLE_CALLBACK_URL=https://YOUR-APP.run.app/auth/google/callback" \
  --region us-central1
```

### 3. Set Up Cloud Scheduler (Cron Job)

```bash
# Create a cron job that runs every minute
gcloud scheduler jobs create http arca-booking-checker \
  --schedule="* * * * *" \
  --uri="https://YOUR-APP.run.app/cron/check-bookings" \
  --http-method=POST \
  --location=us-central1 \
  --headers="X-Cloudscheduler=true"
```

## Usage

1. **Sign In**: Click "Sign in with Google" on the homepage
2. **Add Arca Credentials**: Enter your Arca username and password in the dashboard
3. **Test Connection**: Click "Test Connection" to verify credentials
4. **Create Booking Rules**: Add rules for classes you want to book:
   - Class name (e.g., "CrossFit", "Yoga")
   - Day of week
   - Time
   - Optional: specific instructor or location
5. **Enable Rules**: Make sure rules are enabled (toggle button)
6. **Monitor**: Check booking history to see successful bookings

## API Endpoints

### Authentication
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### API
- `GET /api/profile` - Get user profile
- `POST /api/arca-credentials` - Save Arca credentials
- `GET /api/arca-test` - Test Arca connection
- `GET /api/booking-rules` - Get booking rules
- `POST /api/booking-rules` - Add booking rule
- `PUT /api/booking-rules/:id` - Update booking rule
- `DELETE /api/booking-rules/:id` - Delete booking rule
- `GET /api/booking-history` - Get booking history
- `POST /api/book-now` - Manual booking test

### Cron
- `POST /cron/check-bookings` - Check and book classes (called by Cloud Scheduler)

## Important Notes

### Discovering Arca API Endpoints

The current implementation has placeholder endpoints for:
- Getting available classes
- Booking a class

You'll need to:
1. Log in to https://arca.dk/booking/
2. Open browser DevTools (F12) > Network tab
3. Navigate through the booking flow
4. Find the actual API endpoints
5. Update `backend/services/arca-client.js`:
   - `getClasses()` method
   - `bookClass()` method

### Security Considerations

- Credentials are encrypted using Node.js crypto
- For production, consider using Google Secret Manager
- Cloud Scheduler requests should be authenticated
- Keep your service account keys secure

### Cost Optimization

Google Cloud free tier includes:
- Cloud Run: 2M requests/month
- Firestore: 50k reads, 20k writes/day
- Cloud Scheduler: 3 jobs free

If you stay within limits, the app runs **completely free**!

## Troubleshooting

### "No CSRF token found"
- Arca may have changed their HTML structure
- Check the login page HTML and update the selector in `arca-client.js`

### "Session cookie not found"
- Verify login credentials are correct
- Check if Arca changed their authentication flow

### Bookings not happening
1. Check Cloud Scheduler is running: `gcloud scheduler jobs list`
2. Check Cloud Run logs: `gcloud run services logs read arca-booking-app`
3. Verify booking rules are enabled in the UI
4. Test Arca connection in dashboard

### OAuth errors
- Verify redirect URIs in Google Cloud Console match your deployment
- Check CLIENT_ID and CLIENT_SECRET are set correctly

## Development

### Project Structure

```
arca-booking-app/
├── backend/
│   ├── config/          # Firebase, Passport config
│   ├── middleware/      # Auth middleware
│   ├── routes/          # Express routes
│   ├── services/        # Arca API client
│   ├── tests/           # Unit tests
│   └── server.js        # Main server file
├── frontend/
│   └── src/
│       └── app/
│           ├── pages/   # Angular components
│           └── services/# Angular services
├── scripts/             # Deployment & setup scripts
│   ├── deploy.ps1
│   ├── setup-cron.ps1
│   └── ...
├── docs/                # Documentation
│   ├── DEPLOYMENT.md
│   ├── SETUP.md
│   ├── TESTING.md
│   └── ...
├── e2e/                 # End-to-end tests
├── Dockerfile
└── package.json
```

### Adding New Features

1. **Backend**: Add routes in `backend/routes/`
2. **Frontend**: Add components in `frontend/src/app/`
3. **Database**: Define schema in Firestore collections
4. **Deploy**: Push to main branch (if CI/CD configured)

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

## Disclaimer

This is an unofficial tool and is not affiliated with Arca. Use at your own risk. Make sure automated booking complies with Arca's Terms of Service.

