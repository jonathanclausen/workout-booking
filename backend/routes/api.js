const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { db } = require('../config/firebase');
const ArcaClient = require('../services/arca-client');
const crypto = require('crypto');

// Encryption helpers
const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.SESSION_SECRET || 'your-secret-key')
  .digest(); // 32 bytes key for AES-256

function encrypt(text) {
  const iv = crypto.randomBytes(16); // Generate random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return IV + encrypted data (IV is needed for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get user profile and settings
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();
    
    res.json({
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      hasArcaCredentials: !!userData.arcaCredentials,
      notificationsEnabled: userData.notificationsEnabled ?? true,
      bookingRules: userData.bookingRules || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Save Arca credentials
router.post('/arca-credentials', isAuthenticated, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Test login
    const arcaClient = new ArcaClient();
    try {
      await arcaClient.login(username, password);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Arca credentials' });
    }

    // Save encrypted credentials
    await db.collection('users').doc(req.user.id).update({
      arcaCredentials: {
        username: encrypt(username),
        password: encrypt(password),
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Credentials saved successfully' });
  } catch (error) {
    console.error('Save credentials error:', error);
    res.status(500).json({ error: 'Failed to save credentials' });
  }
});

// Test Arca connection
router.get('/arca-test', isAuthenticated, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);

    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    res.status(400).json({ error: 'Connection failed', details: error.message });
  }
});

// Get booking rules
router.get('/booking-rules', isAuthenticated, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();
    res.json(userData.bookingRules || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking rules' });
  }
});

// Add booking rule
router.post('/booking-rules', isAuthenticated, async (req, res) => {
  try {
    const { className, dayOfWeek, time, instructor, location, enabled } = req.body;

    if (!className || !dayOfWeek || !time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newRule = {
      id: crypto.randomBytes(8).toString('hex'),
      className,
      dayOfWeek,
      time,
      instructor: instructor || null,
      location: location || null,
      enabled: enabled !== false,
      createdAt: new Date()
    };

    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();
    const currentRules = userDoc.data().bookingRules || [];

    await userRef.update({
      bookingRules: [...currentRules, newRule]
    });

    res.json(newRule);
  } catch (error) {
    console.error('Add booking rule error:', error);
    res.status(500).json({ error: 'Failed to add booking rule' });
  }
});

// Update booking rule
router.put('/booking-rules/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();
    const currentRules = userDoc.data().bookingRules || [];

    const updatedRules = currentRules.map(rule => 
      rule.id === id ? { ...rule, ...updates, updatedAt: new Date() } : rule
    );

    await userRef.update({ bookingRules: updatedRules });

    res.json({ message: 'Rule updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking rule' });
  }
});

// Delete booking rule
router.delete('/booking-rules/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const userRef = db.collection('users').doc(req.user.id);
    const userDoc = await userRef.get();
    const currentRules = userDoc.data().bookingRules || [];

    const updatedRules = currentRules.filter(rule => rule.id !== id);

    await userRef.update({ bookingRules: updatedRules });

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete booking rule' });
  }
});

// Get booking history
router.get('/booking-history', isAuthenticated, async (req, res) => {
  try {
    const bookingsSnapshot = await db.collection('users')
      .doc(req.user.id)
      .collection('bookingHistory')
      .orderBy('bookedAt', 'desc')
      .limit(50)
      .get();

    const bookings = [];
    bookingsSnapshot.forEach(doc => {
      bookings.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Found ${bookings.length} booking history entries for user ${req.user.id}`);
    res.json(bookings);
  } catch (error) {
    console.error('Fetch booking history error:', error);
    res.status(500).json({ error: 'Failed to fetch booking history' });
  }
});

// Get list of gyms
router.get('/arca-gyms', isAuthenticated, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);
    
    const gymsResponse = await arcaClient.getGyms();
    const gyms = gymsResponse.gyms || [];
    
    console.log('Number of gyms:', gyms.length);

    res.json(gyms);
  } catch (error) {
    console.error('Fetch gyms error:', error);
    res.status(500).json({ error: 'Failed to fetch gyms', details: error.message });
  }
});

// Get available Arca classes for a specific gym
router.get('/arca-classes', isAuthenticated, async (req, res) => {
  try {
    const { gym_id, days = 7 } = req.query;

    if (!gym_id) {
      return res.status(400).json({ error: 'gym_id parameter is required' });
    }

    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);
    
    console.log(`Fetching classes for gym ${gym_id} for next ${days} days...`);
    
    const allClasses = [];
    const numDays = parseInt(days) || 7;
    
    // Get classes for next N days for this specific gym
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      try {
        const classesResponse = await arcaClient.getClassesByGymAndDate(gym_id, date);
        const classes = classesResponse.ss_events || [];
        allClasses.push(...classes);
      } catch (error) {
        console.log(`Failed to fetch classes for gym ${gym_id} on ${date.toISOString().split('T')[0]}`);
      }
    }
    
    console.log('Number of classes fetched:', allClasses.length);

    res.json(allClasses);
  } catch (error) {
    console.error('Fetch Arca classes error:', error);
    console.error('Error details:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message });
  }
});

// Get current Arca bookings
router.get('/arca-bookings', isAuthenticated, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);
    
    const response = await arcaClient.getMyBookings();
    
    console.log('Arca bookings response type:', typeof response);
    console.log('Has ss_participations:', !!response.ss_participations);
    
    // Extract the bookings array from the response
    const bookings = response.ss_participations || [];
    console.log('Number of bookings:', bookings.length);

    res.json(bookings);
  } catch (error) {
    console.error('Fetch Arca bookings error:', error);
    console.error('Error details:', error.response?.data);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// Book a class (manual test endpoint)
router.post('/book-class', isAuthenticated, async (req, res) => {
  try {
    const { eventId, className, classTime, gym, instructor } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);
    
    const result = await arcaClient.bookClass(eventId);
    
    if (result.success) {
      // Log to booking history
      const bookingRecord = {
        eventId,
        className: className || 'Unknown',
        classTime: classTime || null,
        gym: gym || 'Unknown',
        instructor: instructor || 'Unknown',
        ruleId: null, // Manual booking, no rule
        bookedAt: new Date().toISOString(),
        status: 'success',
        automatic: false
      };
      
      // Only add details if it exists and is not empty
      if (result.data && Object.keys(result.data).length > 0) {
        bookingRecord.details = result.data;
      }
      
      await db.collection('users').doc(req.user.id).collection('bookingHistory').add(bookingRecord);
      
      res.json(result);
    } else {
      // Log failed attempt
      const failedRecord = {
        eventId,
        className: className || 'Unknown',
        classTime: classTime || null,
        gym: gym || 'Unknown',
        instructor: instructor || 'Unknown',
        ruleId: null, // Manual booking, no rule
        bookedAt: new Date().toISOString(),
        status: 'failed',
        error: result.error || 'Unknown error',
        automatic: false
      };
      
      // Only add details if it exists and is not empty
      if (result.data && Object.keys(result.data).length > 0) {
        failedRecord.details = result.data;
      }
      
      await db.collection('users').doc(req.user.id).collection('bookingHistory').add(failedRecord);
      
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Book class error:', error);
    res.status(500).json({ error: 'Failed to book class', details: error.message });
  }
});

// Manual booking test
router.post('/book-now', isAuthenticated, async (req, res) => {
  try {
    const { classId } = req.body;

    const userDoc = await db.collection('users').doc(req.user.id).get();
    const userData = userDoc.data();

    if (!userData.arcaCredentials) {
      return res.status(400).json({ error: 'No Arca credentials saved' });
    }

    const username = decrypt(userData.arcaCredentials.username);
    const password = decrypt(userData.arcaCredentials.password);

    const arcaClient = new ArcaClient();
    await arcaClient.login(username, password);
    
    const result = await arcaClient.bookClass(classId);

    // Log the booking
    await db.collection('bookings').add({
      userId: req.user.id,
      classId,
      status: 'success',
      timestamp: new Date(),
      manual: true
    });

    res.json({ success: true, message: 'Class booked successfully', result });
  } catch (error) {
    console.error('Manual booking error:', error);
    res.status(500).json({ error: 'Failed to book class', details: error.message });
  }
});

module.exports = router;

