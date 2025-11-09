const ArcaClient = require('../services/arca-client');
const axios = require('axios');

// Mock axios to avoid hitting real Arca API
jest.mock('axios');

describe('ArcaClient Unit Tests', () => {
  let client;

  beforeEach(() => {
    client = new ArcaClient();
    jest.clearAllMocks();
  });

  describe('getGyms', () => {
    it('should fetch and return list of gyms', async () => {
      const mockGyms = [
        { id: 4, name: 'Bazaren', address_city: 'København' },
        { id: 6, name: 'Boxen', address_city: 'København' },
        { id: 10, name: 'Centralen', address_city: 'København' }
      ];

      axios.get.mockResolvedValue({
        data: { gyms: mockGyms }
      });

      const gyms = await client.getGyms();
      
      expect(Array.isArray(gyms)).toBe(true);
      expect(gyms.length).toBe(3);
      expect(gyms[0]).toHaveProperty('id');
      expect(gyms[0]).toHaveProperty('name');
      expect(gyms[0].name).toBe('Bazaren');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/react/gyms'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(client.getGyms()).rejects.toThrow('Network error');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock GET request to login page (get CSRF token)
      axios.get.mockResolvedValueOnce({
        data: '<input name="authenticity_token" value="mock-csrf-token">',
        headers: { 'set-cookie': ['session=mock-session'] }
      });

      // Mock POST request to login
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { success: true }
      });

      await client.login('test@example.com', 'password123');

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/sign_in'),
        expect.any(Object)
      );
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/users/sign_in'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should throw error with invalid credentials', async () => {
      axios.get.mockResolvedValueOnce({
        data: '<input name="authenticity_token" value="mock-csrf-token">'
      });

      axios.post.mockRejectedValueOnce({
        response: { status: 401 }
      });

      await expect(client.login('wrong@example.com', 'wrong'))
        .rejects.toThrow();
    });
  });

  describe('getClasses', () => {
    it('should fetch classes for multiple days', async () => {
      const mockClasses = [
        {
          id: 123,
          name: 'WOD',
          start_date_time: '2024-11-11T18:00:00+01:00',
          gym: { id: 10, name: 'Centralen' },
          instructor: 'Test Coach',
          free_space: 5
        }
      ];

      // Mock getGyms
      axios.get.mockResolvedValueOnce({
        data: { gyms: [{ id: 10, name: 'Centralen' }] }
      });

      // Mock getClassesByGymAndDate
      axios.get.mockResolvedValue({
        data: { events: mockClasses }
      });

      const classes = await client.getClasses(3); // 3 days ahead
      
      expect(Array.isArray(classes)).toBe(true);
      expect(classes[0]).toHaveProperty('name');
      expect(classes[0]).toHaveProperty('start_date_time');
      expect(classes[0]).toHaveProperty('gym');
    });
  });

  describe('bookClass', () => {
    it('should successfully book a class', async () => {
      axios.post.mockResolvedValue({
        status: 200,
        data: { success: true }
      });

      const result = await client.bookClass(123);

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/react/events/123/book'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle booking failures', async () => {
      axios.post.mockResolvedValue({
        status: 200,
        data: {
          success: false,
          message: 'You have no more bookings'
        }
      });

      const result = await client.bookClass(123);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no more bookings');
    });

    it('should handle network errors', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      await expect(client.bookClass(123)).rejects.toThrow('Network error');
    });
  });
});

