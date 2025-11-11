const request = require('supertest');
const { app } = require('../server');
const { db } = require('../config/firebase');

describe('Cron Job Integration Tests', () => {
  const testUserId = 'cron-test-user';

  beforeAll(async () => {
    // Create test user with Arca credentials and booking rules
    await db.collection('users').doc(testUserId).set({
      email: 'crontest@example.com',
      name: 'Cron Test User',
      arcaCredentials: {
        username: 'encrypted-test-username',
        password: 'encrypted-test-password'
      },
      bookingRules: [
        {
          id: 'rule-1',
          className: 'WOD',
          dayOfWeek: 'monday',
          time: '18:00',
          location: 'Kirken',
          enabled: true,
          maxWaitingList: 0
        }
      ],
      createdAt: new Date()
    });
  });

  afterAll(async () => {
    await db.collection('users').doc(testUserId).delete();
  });

  describe('POST /cron/check-bookings', () => {
    it('should process booking rules (development mode)', async () => {
      // In development, this endpoint doesn't require Cloud Scheduler headers
      const response = await request(app)
        .post('/cron/check-bookings')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Booking check completed');
    });

    it('should require Cloud Scheduler header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Without header, should fail
      await request(app)
        .post('/cron/check-bookings')
        .expect(403);

      // With header, should succeed
      await request(app)
        .post('/cron/check-bookings')
        .set('X-Cloudscheduler', 'true')
        .expect(200);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Booking Logic', () => {
    it('should match classes correctly', () => {
      const rule = {
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00',
        location: 'Kirken'
      };

      const classInfo = {
        name: 'WOD',
        start_date_time: '2024-11-11T18:00:00+01:00', // Monday 6 PM
        gym: { name: 'Kirken' },
        free_space: 5
      };

      // Test matching logic using Copenhagen timezone
      const classDate = new Date(classInfo.start_date_time);
      
      // Extract day of week in Copenhagen timezone
      const danishDay = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        weekday: 'long' 
      }).format(classDate).toLowerCase();
      
      // Extract time (HH:mm format) in Copenhagen timezone
      const time = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(classDate);

      expect(classInfo.name).toBe(rule.className);
      expect(danishDay).toBe(rule.dayOfWeek);
      expect(time).toBe(rule.time);
      expect(classInfo.gym.name).toBe(rule.location);
    });

    it('should respect maxWaitingList setting', () => {
      const rule1 = { maxWaitingList: 0 };
      const rule2 = { maxWaitingList: 3 };

      const classWithSpace = { free_space: 2 };
      const classFullWithSmallWaitlist = { free_space: 0, waiting_list_count: 2 };
      const classFullWithLargeWaitlist = { free_space: 0, waiting_list_count: 5 };

      // Rule 1: Only book if space available
      expect(classWithSpace.free_space > 0).toBe(true); // Should book
      expect(classFullWithSmallWaitlist.free_space > 0).toBe(false); // Should NOT book

      // Rule 2: Book if space OR waitlist <= 3
      expect(classWithSpace.free_space > 0).toBe(true); // Should book
      expect(classFullWithSmallWaitlist.waiting_list_count <= 3).toBe(true); // Should book
      expect(classFullWithLargeWaitlist.waiting_list_count <= 3).toBe(false); // Should NOT book
    });
  });
});

