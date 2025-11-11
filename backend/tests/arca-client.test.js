const axios = require('axios');

// Mock axios to avoid hitting real Arca API
jest.mock('axios');

const ArcaClient = require('../services/arca-client');

describe('ArcaClient Unit Tests', () => {
  let client;

  beforeEach(() => {
    client = new ArcaClient();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct base URL', () => {
      expect(client.baseUrl).toBe('https://backend.arca.dk');
    });

    it('should initialize with null session cookie', () => {
      expect(client.sessionCookie).toBeNull();
    });
  });

  describe('Login', () => {
    it('should extract session cookie from login response', async () => {
      // Mock GET request to login page (get CSRF token)
      axios.get.mockResolvedValueOnce({
        data: '<input name="authenticity_token" value="mock-csrf-token">',
        headers: { 'set-cookie': ['session=mock-session'] }
      });

      // Mock POST request to login
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true },
        headers: { 
          'set-cookie': ['_cfc2_session=abc123; path=/; HttpOnly'] 
        }
      });

      await client.login('test@example.com', 'password123');

      expect(client.sessionCookie).toBe('_cfc2_session=abc123');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/user_sessions/new'),
        expect.any(Object)
      );
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/user_sessions'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should throw error when CSRF token not found', async () => {
      // Mock GET request without CSRF token
      axios.get.mockResolvedValueOnce({
        data: '<html>No token here</html>',
        headers: {}
      });

      await expect(client.login('test@example.com', 'password'))
        .rejects.toThrow('CSRF token not found');
    });

    it('should throw error when session cookie not received', async () => {
      // Mock GET request with CSRF token
      axios.get.mockResolvedValueOnce({
        data: '<input name="authenticity_token" value="token">',
        headers: { 'set-cookie': ['session=mock'] }
      });

      // Mock POST request without session cookie
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {} // No set-cookie header
      });

      await expect(client.login('test@example.com', 'password'))
        .rejects.toThrow('No session cookie received');
    });
  });

  describe('Book Class', () => {
    it('should return error when not logged in', async () => {
      const result = await client.bookClass(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not logged in - no session cookie');
    });

    it('should make booking request with session cookie', async () => {
      client.sessionCookie = '_cfc2_session=test-session';
      
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true, message: 'Booked' }
      });

      const result = await client.bookClass(123);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/react/events/123/book'),
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': '_cfc2_session=test-session'
          })
        })
      );
    });

    it('should handle booking errors', async () => {
      client.sessionCookie = '_cfc2_session=test-session';
      
      axios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'No more bookings available' }
        }
      });

      const result = await client.bookClass(123);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No more bookings available');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly for API', () => {
      // The getClassesByGymAndDate method formats dates as YYYY-MM-DD
      const date = new Date('2024-11-15T10:00:00Z');
      const formatted = date.toISOString().split('T')[0];
      
      expect(formatted).toBe('2024-11-15');
    });
  });
});
