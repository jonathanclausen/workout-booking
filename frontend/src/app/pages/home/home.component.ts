import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-container">
      <div class="hero">
        <h1>Arca Class Booking Automation</h1>
        <p>Never miss your favorite class again. Automatically book Arca classes when they become available.</p>
        
        <div class="cta" *ngIf="!isAuthenticated">
          <button class="btn btn-primary btn-large" (click)="login()">
            <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px; vertical-align: middle;">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div class="cta" *ngIf="isAuthenticated">
          <button class="btn btn-primary btn-large" (click)="goToDashboard()">
            Go to Dashboard
          </button>
        </div>
      </div>

      <div class="features">
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>Automatic Booking</h3>
          <p>Set your preferences once and let the app book classes for you automatically.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Lightning Fast</h3>
          <p>Our system checks for available classes every minute and books instantly.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📧</div>
          <h3>Notifications</h3>
          <p>Get notified via email when a class is successfully booked for you.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Secure</h3>
          <p>Your credentials are encrypted and stored securely in Google Cloud.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
    }

    .hero {
      text-align: center;
      max-width: 800px;
      margin: 0 auto 80px;
      padding-top: 60px;
    }

    .hero h1 {
      font-size: 48px;
      margin-bottom: 20px;
      font-weight: 700;
    }

    .hero p {
      font-size: 20px;
      margin-bottom: 40px;
      opacity: 0.9;
    }

    .btn-large {
      padding: 16px 32px;
      font-size: 16px;
      display: inline-flex;
      align-items: center;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .feature-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .feature-card h3 {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .feature-card p {
      opacity: 0.9;
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .hero h1 {
        font-size: 32px;
      }

      .hero p {
        font-size: 16px;
      }

      .features {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }

  login(): void {
    this.authService.loginWithGoogle();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

