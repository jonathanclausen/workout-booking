const express = require('express');
const router = express.Router();
const { verifyCronRequest } = require('../middleware/auth');
const { db } = require('../config/firebase');
const ArcaClient = require('../services/arca-client');
const crypto = require('crypto');
const { DateTime } = require('luxon');

// Configuration: Arca booking window
const MAX_DAYS_AHEAD = 13; // Maximum days in advance that classes can be booked

function decrypt(text) {
  const ENCRYPTION_KEY = crypto.createHash('sha256')
    .update(process.env.SESSION_SECRET || 'your-secret-key')
    .digest();
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper to check if we should book based on waiting list
function shouldBookWithWaitingList(classInfo, rule) {
  // Get waiting list count (number of people on waiting list)
  const waitingListCount = classInfo.waiting_list_count || classInfo.waitingListCount || 0;
  const spotsAvailable = classInfo.spots_available || classInfo.spotsAvailable || 0;
  const maxWaitingList = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
  
  // If spots are available, always book
  if (spotsAvailable > 0) {
    console.log(`  ✅ Spots available: ${spotsAvailable}`);
    return true;
  }
  
  // No spots available - check waiting list
  if (waitingListCount <= maxWaitingList) {
    console.log(`  ✅ Waiting list OK: ${waitingListCount} people (max: ${maxWaitingList})`);
    return true;
  }
  
  console.log(`  ❌ Waiting list too long: ${waitingListCount} people (max: ${maxWaitingList})`);
  return false;
}

// Helper to check if a class matches booking rule
function matchesRule(classInfo, rule) {
  const classDate = DateTime.fromISO(classInfo.start_date_time, { setZone: true })
    .setZone('Europe/Copenhagen');

  if (!classDate.isValid) {
    console.warn(`Invalid class date received for class ${classInfo.id}: ${classInfo.start_date_time}`);
    return false;
  }

  console.log(
    `Class candidate ${classInfo.id}`,
    `raw=${classInfo.start_date_time}`,
    `cph=${classDate.toISO()}`,
    `utc=${classDate.toUTC().toISO()}`
  );

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const danishDay = dayNames[classDate.weekday % 7];

  const classTime = classDate.toFormat('HH:mm');

  console.log(`Class: ${classInfo.name}, Time extracted: "${classTime}", Rule time: "${rule.time}", Match: ${classTime === rule.time}`);
  
  // Match class name (exact)
  const classNameMatch = classInfo.name?.toLowerCase() === rule.className.toLowerCase();
  
  // Match day of week
  const dayMatch = danishDay === rule.dayOfWeek;
  
  // Match time (exact)
  const timeMatch = classTime === rule.time;
  
  // Match location (gym name) - must match if specified
  const locationMatch = !rule.location || 
    classInfo.gym?.name?.toLowerCase() === rule.location.toLowerCase();

  // Note: Instructor is NOT used for matching - it doesn't matter who teaches the class
  
  const matches = classNameMatch && dayMatch && timeMatch && locationMatch;
  
  if (matches) {
    console.log(`✓ Match found: ${classInfo.name} at ${classInfo.gym?.name} on ${danishDay} at ${classTime} (instructor: ${classInfo.instructor})`);
  }
  
  return matches;
}

// Cron endpoint - called by Cloud Scheduler
router.post('/check-bookings', verifyCronRequest, async (req, res) => {
  console.log('Starting booking check...');
  const results = {
    checked: 0,
    booked: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get all users with booking rules
    const usersSnapshot = await db.collection('users')
      .where('bookingRules', '!=', [])
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Skip if no credentials or no enabled rules
      if (!userData.arcaCredentials) continue;
      
      const enabledRules = (userData.bookingRules || []).filter(rule => rule.enabled);
      if (enabledRules.length === 0) continue;

      results.checked++;

      try {
        // Login to Arca
        const username = decrypt(userData.arcaCredentials.username);
        const password = decrypt(userData.arcaCredentials.password);
        
        const arcaClient = new ArcaClient();
        await arcaClient.login(username, password);

        // Get current bookings from Arca to avoid rebooking
        const currentBookingsResponse = await arcaClient.getMyBookings();
        console.log('Current bookings response keys:', Object.keys(currentBookingsResponse || {}));
        console.log('Current bookings response:', JSON.stringify(currentBookingsResponse).substring(0, 500));
        
        const currentBookings = currentBookingsResponse.ss_participations || currentBookingsResponse || [];
        const bookedEventIds = new Set(currentBookings.map(b => b.ss_event_id || b.event_id || b.eventId || b.id).filter(Boolean));
        console.log(`User has ${bookedEventIds.size} current bookings on Arca (IDs: ${Array.from(bookedEventIds).join(', ')})`);
        
        // Get gyms
        const gymsResponse = await arcaClient.getGyms();
        const gyms = gymsResponse.gyms || [];
        
        // Fetch classes within the booking window (1-13 days ahead)
        const allClasses = [];
        
        for (let daysAhead = 1; daysAhead <= MAX_DAYS_AHEAD; daysAhead++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() + daysAhead);
          
          // Get classes from all gyms for this date
          for (const gym of gyms) {
            try {
              const classesResponse = await arcaClient.getClassesByGymAndDate(gym.id, checkDate);
              const classes = classesResponse.ss_events || [];
              allClasses.push(...classes);
            } catch (error) {
              console.log(`Could not fetch classes for gym ${gym.id} on ${checkDate.toISOString().split('T')[0]}`);
            }
          }
        }
        
        console.log(`Found ${allClasses.length} classes for user ${userId}`);

        // Check each rule against available classes
        for (const rule of enabledRules) {
          const maxWait = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
          console.log(`Checking rule: ${rule.className} on ${rule.dayOfWeek} at ${rule.time} (maxWaitingList: ${maxWait})`);
          
          for (const classInfo of allClasses) {
            if (matchesRule(classInfo, rule)) {
              // Safety check: Verify class is not more than 13 days in the future
              const classDate = DateTime.fromISO(classInfo.start_date_time, { setZone: true }).toUTC();
              if (!classDate.isValid) {
                console.log(`Skipping class ${classInfo.id} - invalid start_date_time "${classInfo.start_date_time}"`);
                continue;
              }
              const daysUntilClass = Math.ceil(classDate.diffNow('days').days);
              
              if (daysUntilClass > MAX_DAYS_AHEAD) {
                console.log(`Skipping class ${classInfo.id} - too far in advance (${daysUntilClass} days)`);
                continue;
              }
              
              // Check if already booked on Arca
              if (bookedEventIds.has(classInfo.id)) {
                console.log(`Skipping class ${classInfo.id} - already booked on Arca`);
                continue;
              }
              
              // Check waiting list before proceeding
              if (!shouldBookWithWaitingList(classInfo, rule)) {
                console.log(`Skipping class ${classInfo.id} - waiting list too long`);
                continue;
              }
              
              // Check if already attempted in booking history
              const existingAttempt = await db.collection('users')
                .doc(userId)
                .collection('bookingHistory')
                .where('eventId', '==', classInfo.id)
                .where('status', '==', 'success')
                .limit(1)
                .get();

              if (!existingAttempt.empty) {
                console.log(`Skipping class ${classInfo.id} - already in successful booking history`);
                continue;
              }

              // Try to book
              console.log(`Attempting to book class ${classInfo.id}: ${classInfo.name}`);
              const bookingResult = await arcaClient.bookClass(classInfo.id);
              
              if (bookingResult.success) {
                // Log successful booking
                const bookingRecord = {
                  eventId: classInfo.id,
                  className: classInfo.name || 'Unknown',
                  classTime: classInfo.start_date_time,
                  gym: classInfo.gym?.name || 'Unknown',
                  instructor: classInfo.instructor || 'Unknown',
                  ruleId: rule.id || null,
                  bookedAt: new Date().toISOString(),
                  status: 'success',
                  automatic: true
                };
                
                // Only add details if it exists and is not empty
                if (bookingResult.data && Object.keys(bookingResult.data).length > 0) {
                  bookingRecord.details = bookingResult.data;
                }
                
                await db.collection('users').doc(userId).collection('bookingHistory').add(bookingRecord);

                results.booked++;
                console.log(`✅ Successfully booked class ${classInfo.id} for user ${userId}`);

                // TODO: Send notification email
                
              } else {
                console.error(`❌ Failed to book class ${classInfo.id}:`, bookingResult.error);
                
                // Log failed attempt
                const failedRecord = {
                  eventId: classInfo.id,
                  className: classInfo.name || 'Unknown',
                  classTime: classInfo.start_date_time,
                  gym: classInfo.gym?.name || 'Unknown',
                  instructor: classInfo.instructor || 'Unknown',
                  ruleId: rule.id || null,
                  bookedAt: new Date().toISOString(),
                  status: 'failed',
                  error: bookingResult.error || 'Unknown error',
                  automatic: true
                };
                
                // Only add details if it exists and is not empty
                if (bookingResult.data && Object.keys(bookingResult.data).length > 0) {
                  failedRecord.details = bookingResult.data;
                }
                
                await db.collection('users').doc(userId).collection('bookingHistory').add(failedRecord);

                results.failed++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error.message);
        results.errors.push({
          userId,
          error: error.message
        });
      }
    }

    console.log('Booking check completed:', results);
    res.json({
      success: true,
      message: 'Booking check completed',
      results
    });

  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
});

// Export router and helper functions for testing
module.exports = router;
module.exports.matchesRule = matchesRule;
module.exports.shouldBookWithWaitingList = shouldBookWithWaitingList;

