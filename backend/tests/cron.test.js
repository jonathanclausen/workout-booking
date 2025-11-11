// Unit tests for cron job booking logic
// These tests call actual production code

const cronRouter = require('../routes/cron');
const { matchesRule, shouldBookWithWaitingList } = cronRouter;

describe('Cron Job Logic Tests', () => {

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

      // Call ACTUAL production code
      const result = matchesRule(classInfo, rule);

      expect(result).toBe(true);
    });

    it('should not match when class name differs', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00'
      };
      const classInfo = { 
        name: 'Yoga',
        start_date_time: '2024-11-11T18:00:00+01:00',
        gym: { name: 'Test' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(false);
    });

    it('should not match when time differs', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00'
      };
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-11-11T19:00:00+01:00', // 7 PM not 6 PM
        gym: { name: 'Test' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(false);
    });

    it('should match when location is not specified in rule', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '18:00',
        location: undefined // No location requirement
      };
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-11-11T18:00:00+01:00',
        gym: { name: 'Kirken' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(true);
    });

    it('should match 17:00 rule with 17:00 CET class (bug fix verification)', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '17:00',
        location: 'Kirken'
      };
      // Class at 5 PM CET (UTC+1)
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-11-11T17:00:00+01:00',
        gym: { name: 'Kirken' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(true);
    });

    it('should NOT match 17:00 rule with 18:00 CET class', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '17:00',
        location: 'Kirken'
      };
      // Class at 6 PM CET (UTC+1)
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-11-11T18:00:00+01:00',
        gym: { name: 'Kirken' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(false);
    });

    it('should handle daylight saving time - summer (CEST)', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'monday',
        time: '17:00',
        location: 'Kirken'
      };
      // Summer time: 5 PM CEST (UTC+2)
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-07-15T17:00:00+02:00',
        gym: { name: 'Kirken' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(true);
    });

    it('should not match when day of week differs', () => {
      const rule = { 
        className: 'WOD',
        dayOfWeek: 'tuesday',
        time: '18:00'
      };
      // Monday class
      const classInfo = { 
        name: 'WOD',
        start_date_time: '2024-11-11T18:00:00+01:00',
        gym: { name: 'Test' }
      };

      const result = matchesRule(classInfo, rule);
      expect(result).toBe(false);
    });
  });

  describe('Waiting list logic', () => {
    it('should book when spots are available', () => {
      const rule = { maxWaitingList: 0 };
      const classInfo = { 
        spots_available: 5,
        waiting_list_count: 0 
      };

      // Call actual production code
      const result = shouldBookWithWaitingList(classInfo, rule);

      expect(result).toBe(true);
    });

    it('should not book when class is full and maxWaitingList is 0', () => {
      const rule = { maxWaitingList: 0 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 3 
      };

      // Call actual production code
      const result = shouldBookWithWaitingList(classInfo, rule);

      expect(result).toBe(false);
    });

    it('should book when waiting list is within limit', () => {
      const rule = { maxWaitingList: 5 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 3 
      };

      // Call actual production code
      const result = shouldBookWithWaitingList(classInfo, rule);

      expect(result).toBe(true);
    });

    it('should not book when waiting list exceeds limit', () => {
      const rule = { maxWaitingList: 2 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 5 
      };

      // Call actual production code
      const result = shouldBookWithWaitingList(classInfo, rule);

      expect(result).toBe(false);
    });

    it('should default maxWaitingList to 0 when undefined', () => {
      const rule = {}; // maxWaitingList not specified
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 1 
      };

      // Call actual production code - should not book since waiting list > 0 and max is 0
      const result = shouldBookWithWaitingList(classInfo, rule);
      
      expect(result).toBe(false);
    });

    it('should book on waiting list when count equals max', () => {
      const rule = { maxWaitingList: 3 };
      const classInfo = { 
        spots_available: 0,
        waiting_list_count: 3 
      };

      // Call actual production code
      const result = shouldBookWithWaitingList(classInfo, rule);
      
      expect(result).toBe(true);
    });
  });
});
