import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="login-container">
      <div class="login-card">
        <h2>Sign In</h2>
        <p>Sign in with your Google account to continue</p>
        <button class="btn btn-primary" (click)="loginWithGoogle()">
          Sign in with Google
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }

    .login-card {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }

    .login-card h2 {
      margin-bottom: 16px;
    }

    .login-card p {
      margin-bottom: 24px;
      color: #5f6368;
    }
  `]
})
export class LoginComponent {
  constructor(private authService: AuthService) {}

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}

