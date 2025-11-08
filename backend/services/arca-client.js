const axios = require('axios');
const cheerio = require('cheerio');

class ArcaClient {
  constructor() {
    this.baseUrl = process.env.ARCA_BASE_URL || 'https://backend.arca.dk';
    this.sessionCookie = null;
    this.username = null;
    this.password = null;
  }

  /**
   * Login to Arca account
   * @param {string} username - Arca username
   * @param {string} password - Arca password
   * @returns {Promise<boolean>} - Success status
   */
  async login(username, password) {
    try {
      this.username = username;
      this.password = password;

      // Step 1: GET login page to fetch CSRF token
      console.log('Fetching login page...');
      const loginPageResponse = await axios.get(`${this.baseUrl}/user_sessions/new`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });

      // Extract cookies from initial request
      const initialCookies = loginPageResponse.headers['set-cookie'];
      let cookieHeader = '';
      if (initialCookies) {
        cookieHeader = initialCookies.map(cookie => cookie.split(';')[0]).join('; ');
      }

      const $ = cheerio.load(loginPageResponse.data);
      let csrfToken = $('meta[name="csrf-token"]').attr('content');

      // Try alternative selectors if not found
      if (!csrfToken) {
        csrfToken = $('input[name="authenticity_token"]').attr('value');
      }
      
      if (!csrfToken) {
        // Try to find it in the HTML
        const tokenMatch = loginPageResponse.data.match(/authenticity_token["\s:=]+([^"<>\s]+)/i);
        if (tokenMatch) {
          csrfToken = tokenMatch[1];
        }
      }

      if (!csrfToken) {
        console.error('Login page HTML (first 500 chars):', loginPageResponse.data.substring(0, 500));
        throw new Error('CSRF token not found in login page');
      }

      console.log('CSRF token found:', csrfToken.substring(0, 10) + '...');

      // Inspect form to find correct field names
      const formInputs = $('form input').map((i, el) => ({
        name: $(el).attr('name'),
        type: $(el).attr('type')
      })).get();
      console.log('Form fields found:', formInputs);

      // Step 2: POST /user_sessions to login
      console.log('Attempting login with cookies:', cookieHeader.substring(0, 50) + '...');
      const loginResponse = await axios.post(
        `${this.baseUrl}/user_sessions`,
        new URLSearchParams({
          'authenticity_token': csrfToken,
          'username': username,
          'password': password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieHeader,
            'Referer': `${this.baseUrl}/user_sessions/new`
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );
      console.log('Login response status:', loginResponse.status);

      // Step 3: Extract _cfc2_session cookie
      const setCookieHeader = loginResponse.headers['set-cookie'];
      if (!setCookieHeader) {
        throw new Error('No session cookie received - login may have failed');
      }

      const sessionCookieMatch = setCookieHeader.find(cookie => 
        cookie.includes('_cfc2_session')
      );

      if (!sessionCookieMatch) {
        throw new Error('_cfc2_session cookie not found');
      }

      this.sessionCookie = sessionCookieMatch.split(';')[0];

      // Step 4: Try to call /react/login (optional, might not exist)
      try {
        await axios.get(`${this.baseUrl}/react/login`, {
          headers: {
            'Cookie': this.sessionCookie,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        console.log('React session established');
      } catch (reactError) {
        console.log('Note: /react/login endpoint not available (this is okay)');
      }

      console.log('Successfully logged in to Arca');
      return true;
    } catch (error) {
      console.error('Arca login failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data?.substring?.(0, 500) || error.response.data);
      }
      this.sessionCookie = null;
      throw error;
    }
  }

  /**
   * Test if current session is valid
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.sessionCookie) {
      return false;
    }

    try {
      // Try to access a page that requires authentication
      const response = await axios.get(`${this.baseUrl}/booking`, {
        headers: {
          'Cookie': this.sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      return response.status === 200 || response.status === 302;
    } catch (error) {
      return false;
    }
  }

  /**
   * Re-login if session expired
   */
  async ensureLoggedIn() {
    if (!await this.testConnection()) {
      if (!this.username || !this.password) {
        throw new Error('No credentials stored for re-authentication');
      }
      await this.login(this.username, this.password);
    }
  }

  /**
   * Make authenticated request to Arca API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} data - Request data
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    await this.ensureLoggedIn();

    const config = {
      url: `${this.baseUrl}${endpoint}`,
      method,
      headers: {
        'Cookie': this.sessionCookie,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get all gyms/locations
   */
  async getGyms() {
    const endpoint = `/react/gyms`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Get available classes for a specific gym and date
   * @param {number} centerId - Gym ID
   * @param {Date} date - Date to get classes for
   */
  async getClassesByGymAndDate(centerId, date) {
    // Format date as YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];
    const endpoint = `/react/events?center_id=${centerId}&date=${formatDate(date)}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Get available classes for all gyms over multiple days
   * @param {number} days - Number of days to fetch (default 7)
   */
  async getClasses(days = 7) {
    const gyms = await this.getGyms();
    const allClasses = [];
    
    // Get classes for next N days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      // Fetch classes for each gym on this date
      for (const gym of gyms.gyms || []) {
        try {
          const classesResponse = await this.getClassesByGymAndDate(gym.id, date);
          const classes = classesResponse.ss_events || [];
          allClasses.push(...classes);
        } catch (error) {
          console.log(`Failed to fetch classes for gym ${gym.id} on ${date.toISOString().split('T')[0]}`);
        }
      }
    }
    
    return allClasses;
  }

  /**
   * Book a class
   * @param {number} eventId - The ID of the event/class to book
   * @returns {Promise<Object>} Booking confirmation or error
   */
  async bookClass(eventId) {
    if (!this.sessionCookie) {
      return {
        success: false,
        error: 'Not logged in - no session cookie'
      };
    }

    try {
      console.log(`Attempting to book class ${eventId}...`);
      
      const response = await axios.post(
        `${this.baseUrl}/react/events/${eventId}/book`, 
        {}, 
        {
          headers: {
            'Cookie': this.sessionCookie,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      console.log('Booking successful:', response.data);
      return {
        success: true,
        data: response.data || {}
      };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('Book class error:', errorMessage);
      
      // Check for specific error messages
      if (errorMessage === 'Hov! Du har ikke flere holdbookinger tilbage.') {
        return {
          success: false,
          error: 'No more bookings available',
          message: errorMessage
        };
      }
      
      return {
        success: false,
        error: errorMessage,
        data: error.response?.data || {}
      };
    }
  }

  /**
   * Get user's bookings
   */
  async getMyBookings() {
    const endpoint = `/react/participations/bookings`;
    return await this.makeRequest(endpoint);
  }
}

module.exports = ArcaClient;

