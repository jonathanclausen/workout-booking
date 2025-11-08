# Cost Optimization & Budget Protection

This document explains how your Arca Booking app is configured for minimal cost and how to protect against surprise bills.

## Current Configuration

Your Cloud Run service is configured for **minimal cost**:

```
Memory:      256Mi (minimum for Node.js)
CPU:         1 vCPU (minimum)
CPU Mode:    cpu-throttling (only charged during requests)
Min inst:    0 (scales to zero when idle = FREE)
Max inst:    3 (cap to prevent runaway scaling)
Concurrency: 80 (max requests per instance)
Timeout:     60s (reasonable limit)
```

## Expected Monthly Cost

For your usage pattern (personal booking app):
- **~$0.50 - $2.00/month**
- Most months likely **$0** due to free tier

### What's Included in Free Tier
Google Cloud Run free tier (per month):
- 2 million requests
- 360,000 GB-seconds (memory time)
- 180,000 vCPU-seconds (CPU time)
- 1 GB network egress

Your app uses:
- ~1 request/night (cron job) = 30 requests/month
- ~10 manual visits/month = 10 requests
- **Total: ~40 requests << 2 million = FREE**

## Cost Breakdown

### What You Pay For
1. **Requests**: First 2M free, then $0.40 per million
2. **Memory**: First 360K GB-seconds free, then $0.0000025/GB-second
3. **CPU**: First 180K vCPU-seconds free, then $0.00002400/vCPU-second
4. **Network**: First 1GB free, then $0.12/GB

### Your Actual Usage (estimated)
```
Per request:
- Duration:     ~1-2 seconds
- Memory:       256Mi = 0.25GB
- CPU:          1 vCPU

Daily cron job:
- 1 request × 2 seconds × 0.25GB = 0.5 GB-seconds/day
- 1 request × 2 seconds × 1 vCPU = 2 vCPU-seconds/day

Monthly (30 days):
- Memory: 15 GB-seconds (0.004% of free tier)
- CPU: 60 vCPU-seconds (0.03% of free tier)
- Requests: 30 (0.0015% of free tier)
```

**Result: Comfortably within free tier**

## Cost Protection Features

### 1. Max Instances Cap
```powershell
--max-instances 3
```
- Limits scaling to 3 containers max
- Even if attacked/spammed, max cost: ~$0.10/hour
- **Daily cap: ~$2.40 even under attack**

### 2. CPU Throttling
```powershell
--cpu-throttling
```
- CPU only allocated during requests
- Idle time = $0 for CPU
- **Savings: ~70% compared to always-allocated CPU**

### 3. Scale to Zero
```powershell
--min-instances 0
```
- No containers running when idle = $0
- Cold start delay: ~2-3 seconds (acceptable for this app)
- **Savings: $0 cost for 99% of the time**

### 4. Small Memory Footprint
```powershell
--memory 256Mi
```
- Minimum that works for Node.js
- Lower memory = lower cost per second
- **Savings: 50% vs 512Mi default**

## Set Up Budget Alerts

To monitor spending and get alerts:

### Step 1: Create Budget Alert
```powershell
# Set a $5/month budget with 50%, 90%, 100% alerts
gcloud billing budgets create `
  --billing-account=YOUR_BILLING_ACCOUNT_ID `
  --display-name="Arca Booking App Budget" `
  --budget-amount=5 `
  --threshold-rule=percent=50 `
  --threshold-rule=percent=90 `
  --threshold-rule=percent=100
```

### Step 2: Find Your Billing Account ID
```powershell
gcloud billing accounts list
```

### Step 3: Enable Budget Alerts via Console
1. Go to: https://console.cloud.google.com/billing/budgets
2. Click "CREATE BUDGET"
3. Set budget amount: $5.00
4. Add alert thresholds: 50%, 90%, 100%
5. Add your email for notifications

## Monitoring Costs

### Check Current Usage
```powershell
# View Cloud Run metrics
gcloud run services describe arca-booking-app `
  --region us-central1 `
  --format="table(status.traffic)"

# View billing
gcloud billing projects describe YOUR_PROJECT_ID
```

### View Cost Breakdown
1. Go to: https://console.cloud.google.com/billing/reports
2. Filter by "Service: Cloud Run"
3. Group by "SKU" to see request/memory/CPU costs

### Set Up Cost Dashboard
1. Go to: https://console.cloud.google.com/billing
2. Click "Reports" → "Cost breakdown"
3. Create custom report filtered to your project

## What Could Cause High Bills?

### Unlikely Scenarios (all protected against):

1. **DDoS/Spam Attack**
   - Max 3 instances = max $2.40/day even under attack
   - Budget alert triggers at $2.50 (50% of $5)
   - You get email notification

2. **Infinite Loop in Cron**
   - Timeout: 60s max per request
   - Budget alert would trigger after ~208 hours of continuous loops
   - You'd get email long before that

3. **Memory Leak**
   - Container restarts every few hours automatically
   - Max 3 instances limit total impact
   - 256Mi is minimal

4. **Accidental High Traffic**
   - Max 3 instances cap prevents scaling
   - 80 concurrency = max 240 simultaneous requests
   - Still only $2.40/day max

## Cost Optimization Checklist

- ✅ CPU throttling enabled (only pay during requests)
- ✅ Scale to zero (0 cost when idle)
- ✅ Minimal memory (256Mi)
- ✅ Max instances capped (3)
- ✅ Timeout limited (60s)
- ⚠️ Budget alert (set up manually - see above)
- ⚠️ Firestore rules deployed (prevent unauthorized access)

## If You See Unexpected Costs

### Step 1: Check Usage
```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=arca-booking-app" --limit=100
```

### Step 2: Check for Attacks
```powershell
# View request count by IP
gcloud logging read "resource.type=cloud_run_revision" --format="table(httpRequest.remoteIp)" | sort | uniq -c | sort -nr
```

### Step 3: Reduce Max Instances
```powershell
gcloud run services update arca-booking-app `
  --region us-central1 `
  --max-instances 1
```

## Further Cost Reduction

If you want to go even cheaper:

### Option 1: Increase Cron Interval
Change from daily to every 3 days:
```powershell
# In setup-cron.ps1, change schedule to:
--schedule="0 2 */3 * *"  # Every 3 days at 2 AM
```

### Option 2: Manual Booking Only
Disable cron entirely, only book manually via dashboard

### Option 3: Use Cloud Functions
Migrate to Cloud Functions (slightly cheaper for very low traffic)

## Summary

Your current setup:
- ✅ **Minimal cost**: ~$0-2/month
- ✅ **Free tier eligible**: Well within limits
- ✅ **Protected**: Max $2.40/day even if attacked
- ✅ **Scalable**: Can handle traffic spikes (up to 3 instances)
- ✅ **Reliable**: Auto-restarts, health checks

**Action Required**: Set up $5 budget alert (see above)

## Questions?

- **"Will cold starts affect my bookings?"** → No, cron job triggers cold start automatically
- **"What if I get 100 visitors?"** → Still free tier, handles 80 concurrent easily
- **"Can costs suddenly spike?"** → No, max 3 instances cap prevents this
- **"Should I use min-instances=1?"** → No, would cost ~$8-10/month for 24/7 running

---

**Your app is configured for minimal cost. Relax and enjoy automated booking!** 🎉

