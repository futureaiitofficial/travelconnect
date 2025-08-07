import { Component, signal } from '@angular/core';

/**
 * Login Component - User authentication
 * Handles user login with email/password
 * Provides links to registration and password reset
 */
@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1 class="app-logo">TravelConnect</h1>
          <p class="login-subtitle">Welcome back, traveler!</p>
        </div>
        
        <form class="login-form" (submit)="onLogin($event)">
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <input 
              type="email" 
              id="email"
              class="form-input"
              placeholder="Enter your email"
              #emailInput
              required
            >
          </div>
          
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="password-input-wrapper">
              <input 
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                class="form-input"
                placeholder="Enter your password"
                #passwordInput
                required
              >
              <button 
                type="button"
                class="password-toggle"
                (click)="togglePassword()"
              >
                {{ showPassword() ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
          
          <div class="form-options">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                #rememberMeInput
              >
              <span class="checkbox-text">Remember me</span>
            </label>
            <a href="#" class="forgot-password">Forgot password?</a>
          </div>
          
          <button 
            type="submit" 
            class="login-btn"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              Signing in...
            } @else {
              Sign In
            }
          </button>
          
          @if (errorMessage()) {
            <div class="error-message">
              {{ errorMessage() }}
            </div>
          }
        </form>
        
        <div class="login-divider">
          <span>or</span>
        </div>
        
        <div class="social-login">
          <button class="social-btn google-btn" type="button">
            <span class="social-icon">🔍</span>
            Continue with Google
          </button>
          <button class="social-btn facebook-btn" type="button">
            <span class="social-icon">📘</span>
            Continue with Facebook
          </button>
        </div>
        
        <div class="login-footer">
          <p>Don't have an account? <a href="/register" class="register-link">Sign up here</a></p>
        </div>
      </div>
      
      <!-- Background decoration -->
      <div class="background-decoration">
        <div class="floating-icon" style="top: 10%; left: 10%;">✈️</div>
        <div class="floating-icon" style="top: 20%; right: 15%;">🌍</div>
        <div class="floating-icon" style="bottom: 30%; left: 20%;">📸</div>
        <div class="floating-icon" style="bottom: 15%; right: 10%;">🗺️</div>
        <div class="floating-icon" style="top: 50%; left: 5%;">🎒</div>
        <div class="floating-icon" style="top: 70%; right: 5%;">🏖️</div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }
    
    .background-decoration {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    
    .floating-icon {
      position: absolute;
      font-size: 2rem;
      opacity: 0.1;
      animation: float 6s ease-in-out infinite;
    }
    
    .floating-icon:nth-child(2n) {
      animation-delay: -2s;
    }
    
    .floating-icon:nth-child(3n) {
      animation-delay: -4s;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      position: relative;
      z-index: 2;
    }
    
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .app-logo {
      font-size: 2rem;
      font-weight: 700;
      color: #3498db;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.5px;
    }
    
    .login-subtitle {
      color: #7f8c8d;
      margin: 0;
      font-size: 1rem;
    }
    
    .login-form {
      margin-bottom: 1.5rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #2c3e50;
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
      box-sizing: border-box;
    }
    
    .form-input:focus {
      border-color: #3498db;
      box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }
    
    .password-input-wrapper {
      position: relative;
    }
    
    .password-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      color: #7f8c8d;
      padding: 0;
    }
    
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: #7f8c8d;
    }
    
    .checkbox-label input {
      margin: 0;
    }
    
    .forgot-password {
      color: #3498db;
      text-decoration: none;
      font-weight: 500;
    }
    
    .forgot-password:hover {
      text-decoration: underline;
    }
    
    .login-btn {
      width: 100%;
      background: #3498db;
      color: white;
      border: none;
      padding: 0.875rem 1rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .login-btn:hover:not(:disabled) {
      background: #2980b9;
      transform: translateY(-1px);
    }
    
    .login-btn:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
      transform: none;
    }
    
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-message {
      background: #fee2e2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-top: 1rem;
      text-align: center;
    }
    
    .login-divider {
      text-align: center;
      margin: 1.5rem 0;
      position: relative;
    }
    
    .login-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e9ecef;
    }
    
    .login-divider span {
      background: white;
      color: #7f8c8d;
      padding: 0 1rem;
      font-size: 0.9rem;
    }
    
    .social-login {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    
    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: white;
      color: #2c3e50;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    
    .social-btn:hover {
      border-color: #bdc3c7;
      transform: translateY(-1px);
    }
    
    .social-icon {
      font-size: 1.2rem;
    }
    
    .login-footer {
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9rem;
    }
    
    .register-link {
      color: #3498db;
      text-decoration: none;
      font-weight: 600;
    }
    
    .register-link:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 480px) {
      .login-card {
        padding: 1.5rem;
        margin: 0.5rem;
      }
      
      .app-logo {
        font-size: 1.75rem;
      }
      
      .social-login {
        flex-direction: column;
      }
    }
  `]
})
export class LoginComponent {
  // Component state using Angular signals
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  
  /**
   * Toggle password visibility
   */
  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }
  
  /**
   * Handle login form submission
   */
  async onLogin(event: Event) {
    event.preventDefault();
    
    // Get form data from template references
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = (form.querySelector('#email') as HTMLInputElement)?.value;
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;
    const rememberMe = (form.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked;
    
    // Clear any previous error messages
    this.errorMessage.set('');
    
    // Basic validation
    if (!email || !password) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }
    
    // Set loading state
    this.isLoading.set(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Replace with actual authentication service call
      console.log('Login attempt:', {
        email: email,
        password: '***', // Don't log actual password
        rememberMe: rememberMe
      });
      
      // For now, simulate successful login
      // In real implementation, this would call the authentication service
      // and handle JWT tokens, user state, etc.
      
      // Navigate to dashboard/feed on successful login
      // this.router.navigate(['/feed']);
      
      alert('Login successful! (This is a demo)');
      
    } catch (error) {
      // Handle login errors
      this.errorMessage.set('Invalid email or password. Please try again.');
      console.error('Login error:', error);
    } finally {
      // Reset loading state
      this.isLoading.set(false);
    }
  }
}
