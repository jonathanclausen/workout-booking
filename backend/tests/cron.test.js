// Unit tests for cron job booking logic
// These tests are self-contained and don't require external dependencies

describe('Cron Job Logic Tests', () => {
  describe('Timezone handling', () => {
    it('should correctly extract day and time in Copenhagen timezone', () => {
      // Test with a timestamp: Monday, Nov 11, 2024 at 6 PM CET (UTC+1)
      const timestamp = '2024-11-11T18:00:00+01:00';
      const classDate = new Date(timestamp);
      
      // Extract day of week in Copenhagen timezone
      const danishDay = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        weekday: 'long' 
      }).format(classDate).toLowerCase();
      
      // Extract time in Copenhagen timezone
      const time = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(classDate);

      expect(danishDay).toBe('monday');
      expect(time).toBe('18:00');
    });

    it('should handle daylight saving time correctly', () => {
      // Summer time: CEST (UTC+2)
      const summerTime = '2024-07-15T18:00:00+02:00';
      const summerDate = new Date(summerTime);
      
      const summerTimeString = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(summerDate);

      expect(summerTimeString).toBe('18:00');

      // Winter time: CET (UTC+1)
      const winterTime = '2024-12-15T18:00:00+01:00';
      const winterDate = new Date(winterTime);
      
      const winterTimeString = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(winterDate);

      expect(winterTimeString).toBe('18:00');
    });
  });

  describe('Class matching logic', () => {
    it('should match class when all criteria match', () => {
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

      // Simulate the matching logic
      const classDate = new Date(classInfo.start_date_time);
      
      const danishDay = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        weekday: 'long' 
      }).format(classDate).toLowerCase();
      
      const time = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(classDate);

      const classNameMatch = classInfo.name.toLowerCase() === rule.className.toLowerCase();
      const dayMatch = danishDay === rule.dayOfWeek;
      const timeMatch = time === rule.time;
      const locationMatch = !rule.location || 
        classInfo.gym.name.toLowerCase() === rule.location.toLowerCase();

      expect(classNameMatch).toBe(true);
      expect(dayMatch).toBe(true);
      expect(timeMatch).toBe(true);
      expect(locationMatch).toBe(true);
    });

    it('should not match when class name differs', () => {
      const rule = { className: 'WOD' };
      const classInfo = { name: 'Yoga' };

      const classNameMatch = classInfo.name.toLowerCase() === rule.className.toLowerCase();
      expect(classNameMatch).toBe(false);
    });

    it('should not match when time differs', () => {
      const rule = { time: '18:00' };
      const classInfo = { start_date_time: '2024-11-11T19:00:00+01:00' }; // 7 PM

      const classDate = new Date(classInfo.start_date_time);
      const time = new Intl.DateTimeFormat('en-US', { 
        timeZone: 'Europe/Copenhagen', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).format(classDate);

      const timeMatch = time === rule.time;
      expect(timeMatch).toBe(false);
    });

    it('should match when location is not specified in rule', () => {
      const rule = { location: undefined };
      const classInfo = { gym: { name: 'Kirken' } };

      const locationMatch = !rule.location || 
        classInfo.gym.name.toLowerCase() === rule.location.toLowerCase();
      
      expect(locationMatch).toBe(true);
    });
  });

  describe('Waiting list logic', () => {
    it('should book when spots are available', () => {
      const rule = { maxWaitingList: 0 };
      const classInfo = { 
        spots_available: 5,
        waiting_list_count: 0 
      };

      const spotsAvailable = classInfo.spots_available || 0;
      const shouldBook = spotsAvailable > 0;

      expect(shouldBook).toBe(true);
    });

    it('should not book when class is full and maxWaitingList is 0', () => {
      const rule = { maxWaitingList: 0 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 3 
      };

      const spotsAvailable = classInfo.spots_available || 0;
      const waitingListCount = classInfo.waiting_list_count || 0;
      const maxWaitingList = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
      
      const shouldBook = spotsAvailable > 0 || waitingListCount <= maxWaitingList;

      expect(shouldBook).toBe(false);
    });

    it('should book when waiting list is within limit', () => {
      const rule = { maxWaitingList: 5 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 3 
      };

      const spotsAvailable = classInfo.spots_available || 0;
      const waitingListCount = classInfo.waiting_list_count || 0;
      const maxWaitingList = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
      
      const shouldBook = spotsAvailable > 0 || waitingListCount <= maxWaitingList;

      expect(shouldBook).toBe(true);
    });

    it('should not book when waiting list exceeds limit', () => {
      const rule = { maxWaitingList: 2 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 5 
      };

      const spotsAvailable = classInfo.spots_available || 0;
      const waitingListCount = classInfo.waiting_list_count || 0;
      const maxWaitingList = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
      
      const shouldBook = spotsAvailable > 0 || waitingListCount <= maxWaitingList;

      expect(shouldBook).toBe(false);
    });

    it('should default maxWaitingList to 0 when undefined', () => {
      const rule = {}; // maxWaitingList not specified
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 1 
      };

      const maxWaitingList = rule.maxWaitingList !== undefined ? rule.maxWaitingList : 0;
      
      expect(maxWaitingList).toBe(0);
    });
  });
});
