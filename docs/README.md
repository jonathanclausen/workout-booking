# Documentation

This folder contains comprehensive documentation for the Arca Booking App.

## Documentation Files

### Setup & Deployment

- **[SETUP.md](SETUP.md)** - Detailed setup instructions
  - Google Cloud project configuration
  - OAuth setup
  - Firestore setup
  - Service account creation
  - Local development environment

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
  - Step-by-step deployment process
  - Environment variable management
  - Security best practices
  - OAuth redirect URI configuration
  - Troubleshooting common deployment issues

### Operations

- **[SCRIPTS.md](SCRIPTS.md)** - Script reference
  - All deployment scripts explained
  - Usage examples
  - Script parameters

### Cost & Optimization

- **[COST-OPTIMIZATION.md](COST-OPTIMIZATION.md)** - Cost optimization guide
  - Cloud Run configuration details
  - Budget alerts setup
  - Free tier limits
  - Cost monitoring tips
  - Expected monthly costs (~$0-2/month)

### Testing

- **[TESTING.md](TESTING.md)** - Testing guide
  - Unit tests with Jest
  - Integration tests with mocked services
  - E2E tests with Playwright
  - Test setup and execution
  - CI/CD integration

## Quick Links

### Getting Started
1. Start with [SETUP.md](SETUP.md) for initial setup
2. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to deploy to Cloud Run
3. Use [../scripts/](../scripts/) folder for deployment scripts

### Development
- Main README: [../README.md](../README.md)
- Backend code: [../backend/](../backend/)
- Frontend code: [../frontend/](../frontend/)
- Tests: [../backend/tests/](../backend/tests/) and [../e2e/](../e2e/)

### Common Tasks

**Deploy to production:**
```powershell
.\scripts\deploy.ps1
```

**Set up nightly booking job:**
```powershell
.\scripts\setup-cron.ps1
```

**Run tests:**
```bash
cd backend && npm test
```

**Monitor costs:**
- See [COST-OPTIMIZATION.md](COST-OPTIMIZATION.md)
- Check [Google Cloud Console Billing](https://console.cloud.google.com/billing)

## Document Organization

All documentation follows this structure:
- **Purpose** - What the document covers
- **Prerequisites** - What you need before starting
- **Step-by-step instructions** - Detailed procedures
- **Troubleshooting** - Common issues and solutions
- **Next steps** - What to do after completing the guide

## Contributing

When adding new documentation:
1. Follow existing formatting style
2. Include code examples
3. Add troubleshooting sections
4. Update this README with links
5. Keep information up-to-date with code changes

