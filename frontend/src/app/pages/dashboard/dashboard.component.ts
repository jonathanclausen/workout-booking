import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService, BookingRule, BookingHistory, UserProfile } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  profile: UserProfile | null = null;
  bookingRules: BookingRule[] = [];
  bookingHistory: BookingHistory[] = [];
  arcaBookings: any[] = [];
  arcaGyms: any[] = [];
  arcaClasses: any[] = [];
  filteredClasses: any[] = [];
  selectedGym: any = null;
  
  // Arca credentials form
  arcaUsername = '';
  arcaPassword = '';
  credentialsSaving = false;
  credentialsMessage = '';
  
  // Loading states
  loadingArcaBookings = false;
  loadingGyms = false;
  loadingClasses = false;
  
  // Booking rule form
  showRuleForm = false;
  showClassBrowser = false;
  classSearchTerm = '';
  ruleForm: BookingRule = {
    className: '',
    dayOfWeek: 'monday',
    time: '',
    instructor: '',
    location: '',
    enabled: true,
    maxWaitingList: 0  // Default: only book if spots available (no waiting list)
  };
  
  loading = true;
  testingConnection = false;

  daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/']);
      } else {
        this.loadData();
      }
    });
  }

  loadData(): void {
    this.loading = true;
    
    this.apiService.getProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.bookingRules = profile.bookingRules;
        this.loading = false;
        
        // Load Arca bookings if credentials are saved
        if (profile.hasArcaCredentials) {
          this.loadArcaBookings();
        }
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.loading = false;
      }
    });

    this.loadBookingHistory();
  }

  loadBookingHistory(): void {
    this.apiService.getBookingHistory().subscribe({
      next: (history) => {
        this.bookingHistory = history;
      },
      error: (err) => console.error('Failed to load booking history:', err)
    });
  }

  saveArcaCredentials(): void {
    if (!this.arcaUsername || !this.arcaPassword) {
      this.credentialsMessage = 'Please enter both username and password';
      return;
    }

    this.credentialsSaving = true;
    this.credentialsMessage = '';

    this.apiService.saveArcaCredentials(this.arcaUsername, this.arcaPassword).subscribe({
      next: () => {
        this.credentialsSaving = false;
        this.credentialsMessage = 'Credentials saved successfully!';
        this.arcaUsername = '';
        this.arcaPassword = '';
        if (this.profile) {
          this.profile.hasArcaCredentials = true;
        }
        // Load bookings after saving credentials
        this.loadArcaBookings();
      },
      error: (err) => {
        this.credentialsSaving = false;
        this.credentialsMessage = err.error?.error || 'Failed to save credentials';
      }
    });
  }

  testConnection(): void {
    this.testingConnection = true;
    this.credentialsMessage = '';

    this.apiService.testArcaConnection().subscribe({
      next: () => {
        this.testingConnection = false;
        this.credentialsMessage = 'Connection successful! ✓';
        this.loadArcaBookings();
      },
      error: (err) => {
        this.testingConnection = false;
        this.credentialsMessage = 'Connection failed: ' + (err.error?.error || 'Unknown error');
      }
    });
  }

  loadArcaBookings(): void {
    if (!this.profile?.hasArcaCredentials) return;
    
    this.loadingArcaBookings = true;
    this.apiService.getArcaBookings().subscribe({
      next: (bookings) => {
        console.log('Received Arca bookings:', bookings);
        console.log('Type:', typeof bookings);
        console.log('Is array:', Array.isArray(bookings));
        this.arcaBookings = Array.isArray(bookings) ? bookings : [];
        this.loadingArcaBookings = false;
      },
      error: (err) => {
        console.error('Failed to load Arca bookings:', err);
        console.error('Error response:', err.error);
        this.loadingArcaBookings = false;
      }
    });
  }

  toggleRuleForm(): void {
    this.showRuleForm = !this.showRuleForm;
    if (this.showRuleForm) {
      this.resetRuleForm();
      this.loadGyms();
    } else {
      this.showClassBrowser = false;
      this.selectedGym = null;
      this.arcaClasses = [];
    }
  }

  loadGyms(): void {
    if (!this.profile?.hasArcaCredentials) return;
    
    this.loadingGyms = true;
    this.apiService.getArcaGyms().subscribe({
      next: (gyms) => {
        console.log('Received gyms:', gyms);
        this.arcaGyms = Array.isArray(gyms) ? gyms : [];
        this.loadingGyms = false;
      },
      error: (err) => {
        console.error('Failed to load gyms:', err);
        this.loadingGyms = false;
      }
    });
  }

  selectGym(gym: any): void {
    this.selectedGym = gym;
    this.loadClassesForGym(gym.id);
  }

  loadClassesForGym(gymId: number): void {
    this.loadingClasses = true;
    this.arcaClasses = [];
    this.filteredClasses = [];
    
    this.apiService.getArcaClasses(gymId, 7).subscribe({
      next: (classes) => {
        console.log('Received classes:', classes);
        this.arcaClasses = Array.isArray(classes) ? classes : [];
        this.filteredClasses = this.arcaClasses;
        this.loadingClasses = false;
      },
      error: (err) => {
        console.error('Failed to load classes:', err);
        this.loadingClasses = false;
      }
    });
  }

  toggleClassBrowser(): void {
    this.showClassBrowser = !this.showClassBrowser;
    if (this.showClassBrowser && this.arcaGyms.length === 0) {
      this.loadGyms();
    }
  }

  filterClasses(): void {
    if (!this.classSearchTerm) {
      this.filteredClasses = this.arcaClasses;
      return;
    }
    
    const search = this.classSearchTerm.toLowerCase();
    this.filteredClasses = this.arcaClasses.filter(c => 
      c.name?.toLowerCase().includes(search) ||
      c.title?.toLowerCase().includes(search) ||
      c.gym?.name?.toLowerCase().includes(search) ||
      c.instructor?.toLowerCase().includes(search)
    );
  }

  selectClass(classInfo: any): void {
    // Extract day of week from start_date_time
    const classDate = new Date(classInfo.start_date_time);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[classDate.getDay()];
    
    // Extract time (HH:mm format)
    const hours = classDate.getHours().toString().padStart(2, '0');
    const minutes = classDate.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    this.ruleForm = {
      className: classInfo.name || classInfo.title,
      dayOfWeek: dayOfWeek,
      time: time,
      instructor: classInfo.instructor || '',
      location: classInfo.gym?.name || '',
      enabled: true
    };
    
    this.showClassBrowser = false;
  }

  bookClassNow(classInfo: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm(`Book "${classInfo.name}" now?\n\nThis will immediately book the class if available.`)) {
      return;
    }

    this.apiService.bookClass(
      classInfo.id,
      classInfo.name,
      classInfo.start_date_time,
      classInfo.gym?.name || this.selectedGym?.name,
      classInfo.instructor
    ).subscribe({
      next: (result) => {
        if (result.success) {
          alert('✅ Booking successful!');
          this.loadArcaBookings();
          this.loadBookingHistory();
        } else {
          alert(`❌ Booking failed: ${result.error || result.message}`);
        }
      },
      error: (err) => {
        const errorMsg = err.error?.error || err.error?.message || 'Unknown error';
        alert(`❌ Booking failed: ${errorMsg}`);
      }
    });
  }

  resetRuleForm(): void {
    this.ruleForm = {
      className: '',
      dayOfWeek: 'monday',
      time: '',
      instructor: '',
      location: '',
      enabled: true,
      maxWaitingList: 0
    };
  }

  addBookingRule(): void {
    if (!this.ruleForm.className || !this.ruleForm.time) {
      alert('Please fill in required fields');
      return;
    }

    this.apiService.addBookingRule(this.ruleForm).subscribe({
      next: (newRule) => {
        this.bookingRules.push(newRule);
        this.showRuleForm = false;
        this.resetRuleForm();
      },
      error: (err) => {
        alert('Failed to add booking rule: ' + (err.error?.error || 'Unknown error'));
      }
    });
  }

  toggleRule(rule: BookingRule): void {
    if (!rule.id) return;

    this.apiService.updateBookingRule(rule.id, { enabled: !rule.enabled }).subscribe({
      next: () => {
        rule.enabled = !rule.enabled;
      },
      error: (err) => {
        alert('Failed to update rule: ' + (err.error?.error || 'Unknown error'));
      }
    });
  }

  deleteRule(rule: BookingRule): void {
    if (!rule.id) return;
    if (!confirm('Are you sure you want to delete this booking rule?')) return;

    this.apiService.deleteBookingRule(rule.id).subscribe({
      next: () => {
        this.bookingRules = this.bookingRules.filter(r => r.id !== rule.id);
      },
      error: (err) => {
        alert('Failed to delete rule: ' + (err.error?.error || 'Unknown error'));
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      }
    });
  }
}

