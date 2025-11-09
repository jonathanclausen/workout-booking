const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock Firebase Admin SDK
jest.mock('../config/firebase', () => {
  const mockDb = {
    collection: jest.fn(() => mockDb),
    doc: jest.fn(() => mockDb),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  return {
    db: mockDb,
    admin: {
      initializeApp: jest.fn()
    }
  };
});

// Mock Arca Client
jest.mock('../services/arca-client');

const apiRoutes = require('../routes/api');
const { db } = require('../config/firebase');

// Create test app
const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false
}));

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User'
  };
  next();
});

app.use('/api', apiRoutes);

describe('API Unit Tests', () => {
  let testUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile when authenticated', async () => {
      // Mock Firestore response
      db.get.mockResolvedValue({
        data: () => ({
          email: 'test@example.com',
          bookingRules: [],
          arcaCredentials: { username: 'encrypted', password: 'encrypted' }
        })
      });

      const response = await request(app)
        .get('/api/profile')
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('bookingRules');
      expect(response.body).toHaveProperty('hasArcaCredentials');
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.doc).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('POST /api/booking-rules', () => {
    it('should create a new booking rule', async () => {
      // Mock Firestore reads and writes
      db.get.mockResolvedValue({
        data: () => ({ bookingRules: [] })
      });
      db.update.mockResolvedValue({});

      const newRule = {
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00',
        location: 'Kirken',
        instructor: 'Test Instructor',
        enabled: true,
        maxWaitingList: 2
      };

      const response = await request(app)
        .post('/api/booking-rules')
        .send(newRule)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.className).toBe('WOD');
      expect(response.body.maxWaitingList).toBe(2);
      expect(db.update).toHaveBeenCalled();
    });

    it('should fail without required fields', async () => {
      const invalidRule = {
        className: 'WOD'
        // missing dayOfWeek and time
      };

      await request(app)
        .post('/api/booking-rules')
        .send(invalidRule)
        .expect(400);
    });

    it('should default maxWaitingList to 0 if not provided', async () => {
      db.get.mockResolvedValue({
        data: () => ({ bookingRules: [] })
      });
      db.update.mockResolvedValue({});

      const rule = {
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00'
      };

      const response = await request(app)
        .post('/api/booking-rules')
        .send(rule)
        .expect(200);

      expect(response.body.maxWaitingList).toBe(0);
    });
  });

  describe('PUT /api/booking-rules/:id', () => {
    it('should update an existing rule', async () => {
      const ruleId = 'test-rule-123';
      const existingRule = {
        id: ruleId,
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00',
        enabled: true,
        maxWaitingList: 0
      };

      db.get.mockResolvedValue({
        data: () => ({ bookingRules: [existingRule] })
      });
      db.update.mockResolvedValue({});

      const updates = {
        maxWaitingList: 5,
        enabled: false
      };

      const response = await request(app)
        .put(`/api/booking-rules/${ruleId}`)
        .send(updates)
        .expect(200);

      expect(response.body.message).toContain('updated');
      expect(db.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingRules: expect.arrayContaining([
            expect.objectContaining({
              id: ruleId,
              maxWaitingList: 5,
              enabled: false
            })
          ])
        })
      );
    });
  });

  describe('DELETE /api/booking-rules/:id', () => {
    it('should delete a booking rule', async () => {
      const ruleId = 'test-rule-to-delete';
      const existingRule = {
        id: ruleId,
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00'
      };

      db.get.mockResolvedValue({
        data: () => ({ bookingRules: [existingRule] })
      });
      db.update.mockResolvedValue({});

      await request(app)
        .delete(`/api/booking-rules/${ruleId}`)
        .expect(200);

      // Verify the rule was removed
      expect(db.update).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingRules: expect.not.arrayContaining([
            expect.objectContaining({ id: ruleId })
          ])
        })
      );
    });
  });
});

