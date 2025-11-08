# Testing Guide for Arca Booking Automation

This guide explains how to test all the booking features.

## Prerequisites

1. Backend and frontend running:
   ```powershell
   npm run dev
   ```

2. Logged in to the application with Google OAuth
3. Arca credentials saved and tested

## Feature 1: Manual "Book Now" Button

**Purpose**: Immediately book any available class

**Steps**:
1. Go to Dashboard
2. Click "+ Add Rule"
3. Click "📅 Browse Available Classes"
4. Select a gym location
5. Browse classes for that gym
6. Find a class you want to book
7. Click the green "🎯 Book Now" button
8. Confirm the booking

**Expected Result**:
- If booking succeeds: "✅ Booking successful!" alert
- If booking fails: "❌ Booking failed: [error message]" alert
- Your "My Current Bookings" table will refresh automatically
- The booking appears in your Booking History

**Error Scenarios**:
- If you already have 4 bookings: `"Hov! Du har ikke flere holdbookinger tilbage."`
- If the class is full: Specific error message from Arca

## Feature 2: Create Booking Rules

**Purpose**: Set up automatic weekly bookings for specific classes

**Steps**:
1. Go to Dashboard
2. Click "+ Add Rule"
3. Click "📅 Browse Available Classes"
4. Select a gym location
5. Browse and find a class you want to book weekly
6. Click "Select for Rule" button
7. Review the pre-filled form:
   - Class name
   - Day of week
   - Time
   - Instructor
   - Location
8. Click "Add Rule"

**Expected Result**:
- Rule appears in "Your Booking Rules" section
- Rule is enabled by default (green badge)
- You can toggle it on/off with the switch
- You can delete the rule with the "Delete" button

## Feature 3: Automatic Booking via Cron

**Purpose**: Automatically book classes that match your rules when they become available

**Important**: Classes are available for booking **2 weeks in advance**. The cron job checks for classes 14-16 days in the future.

### Test the Cron Logic Manually

You can trigger the booking check manually without waiting for the scheduler:

```powershell
# Send a POST request to the test endpoint
curl -X POST http://localhost:8080/cron/test-bookings
```

Or use PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/cron/test-bookings" -Method POST
```

**What this does**:
1. Fetches all enabled booking rules from Firestore
2. Gets all gyms from Arca
3. Checks classes 1-16 days in the future (catches available classes next week AND newly available classes 2 weeks out)
4. Matches classes against your rules based on:
   - Exact class name
   - Day of week (e.g., monday, tuesday)
   - Exact time (HH:mm format)
   - Location/gym name (if specified)
   - **Note**: Instructor is NOT used for matching - it doesn't matter who teaches the class
5. Checks waiting list availability:
   - If spots are available: books immediately
   - If class is full: checks waiting list count vs your maxWaitingList setting
   - Example: maxWaitingList=2 means book if 0-2 people on waiting list
6. Attempts to book matching classes that meet the criteria
7. Logs all attempts to `bookingHistory` in Firestore

**Expected Response**:
```json
{
  "success": true,
  "message": "Test booking check completed",
  "results": {
    "checked": 1,
    "booked": 0,
    "failed": 0,
    "errors": []
  }
}
```

**Check the backend logs**:
Look for messages like:
- `"Checking rule: [className] on [day] at [time]"`
- `"✓ Match found: [class details]"`
- `"✅ Successfully booked class [id]"`
- `"❌ Failed to book class [id]"`

### View Booking History

1. Go to Dashboard
2. Scroll to "Booking History" section
3. See all automatic booking attempts with:
   - Status (Success/Failed)
   - Class name
   - Class time
   - Gym/location
   - Timestamp
   - Whether it was automatic or manual

## Feature 4: Production Cron Job

When deployed to Cloud Run, set up Cloud Scheduler to call the cron endpoint:

```bash
# Run the setup script
./setup-cron.sh
```

This creates a Cloud Scheduler job that:
- Runs every day at 9:00 AM (configurable)
- Calls `POST /cron/check-bookings`
- Includes authentication header for security

## Testing Scenarios

### Scenario 1: First Time Booking
1. Create a rule for a class 14+ days in the future
2. Run the manual test endpoint
3. Should book the class successfully
4. Run again - should skip (already booked)

### Scenario 2: No Matching Classes
1. Create a rule with very specific criteria (unusual time/location)
2. Run the manual test
3. Should return: `checked: 1, booked: 0, failed: 0`

### Scenario 3: Booking Limit Reached
1. Already have 4 active bookings
2. Try to book another class (manual or automatic)
3. Should fail with: `"No more bookings available"`
4. Logged in booking history as failed

### Scenario 4: Disabled Rule
1. Create a rule
2. Toggle it off (disabled)
3. Run the manual test
4. Should skip the disabled rule

## Troubleshooting

### No classes found
- **Check**: Are you looking 14-16 days ahead? Classes are only available 2 weeks in advance
- **Check**: Is your gym ID correct?
- **Check**: Backend logs for API errors

### Rule not matching
- **Check**: Class name must be exact match (case-insensitive)
- **Check**: Time must match exactly (HH:mm format, e.g., "18:30")
- **Check**: Day of week must match (lowercase: monday, tuesday, etc.)
- **Check**: Location must match if specified in rule
- **Note**: Instructor is NOT checked - any instructor teaching the class will match
- **Check**: Backend logs show the matching logic

### Booking fails
- **Check**: Already have 4 active bookings?
- **Check**: Class is full?
- **Check**: Class is still available?
- **Check**: Session is still valid (login might have expired)

## Viewing Logs

**Backend logs** (in your PowerShell terminal running `npm run dev`):
- Login attempts
- Class fetching
- Rule matching
- Booking attempts
- All errors

**Firestore data** (via Firebase Console):
- `users/{userId}/bookingRules` - Your rules
- `users/{userId}/bookingHistory` - All booking attempts

## Next Steps

Once tested locally:
1. Deploy to Cloud Run (see `SETUP.md`)
2. Set up Cloud Scheduler for automatic daily checks
3. Monitor logs in Google Cloud Console
4. Set up email notifications (TODO)

