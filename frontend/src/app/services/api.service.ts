import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BookingRule {
  id?: string;
  className: string;
  dayOfWeek: string;
  time: string;
  instructor?: string;
  location?: string;
  enabled: boolean;
  maxWaitingList?: number;  // Max people on waiting list to still book (e.g., 2 means book if 0-2 on waitlist)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingHistory {
  id: string;
  eventId: number;
  className: string;
  classTime: string;
  gym: string;
  instructor?: string;
  ruleId?: string | null;
  bookedAt: string;
  status: 'success' | 'failed';
  error?: string;
  automatic: boolean;
  details?: any;
  // Legacy fields (for backwards compatibility)
  timestamp?: Date;
  manual?: boolean;
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  hasArcaCredentials: boolean;
  notificationsEnabled: boolean;
  bookingRules: BookingRule[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Profile
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/profile');
  }

  // Arca Credentials
  saveArcaCredentials(username: string, password: string): Observable<any> {
    return this.http.post('/api/arca-credentials', { username, password });
  }

  testArcaConnection(): Observable<any> {
    return this.http.get('/api/arca-test');
  }

  // Booking Rules
  getBookingRules(): Observable<BookingRule[]> {
    return this.http.get<BookingRule[]>('/api/booking-rules');
  }

  addBookingRule(rule: BookingRule): Observable<BookingRule> {
    return this.http.post<BookingRule>('/api/booking-rules', rule);
  }

  updateBookingRule(id: string, updates: Partial<BookingRule>): Observable<any> {
    return this.http.put(`/api/booking-rules/${id}`, updates);
  }

  deleteBookingRule(id: string): Observable<any> {
    return this.http.delete(`/api/booking-rules/${id}`);
  }

  // Booking History
  getBookingHistory(): Observable<BookingHistory[]> {
    return this.http.get<BookingHistory[]>('/api/booking-history');
  }

  // Manual Booking
  bookNow(classId: string): Observable<any> {
    return this.http.post('/api/book-now', { classId });
  }

  // Get current Arca bookings
  getArcaBookings(): Observable<any> {
    return this.http.get('/api/arca-bookings');
  }

  // Get Arca gyms/locations
  getArcaGyms(): Observable<any> {
    return this.http.get('/api/arca-gyms');
  }

  // Get available Arca classes for a specific gym
  getArcaClasses(gymId: number, days: number = 7): Observable<any> {
    return this.http.get(`/api/arca-classes?gym_id=${gymId}&days=${days}`);
  }

  // Book a class manually (for testing)
  bookClass(eventId: number, className?: string, classTime?: string, gym?: string, instructor?: string): Observable<any> {
    return this.http.post('/api/book-class', { 
      eventId, 
      className, 
      classTime, 
      gym, 
      instructor 
    });
  }
}

