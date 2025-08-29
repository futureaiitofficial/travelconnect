import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService, RegisterRequest } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(-100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class RegisterComponent {
  // Form
  registerForm: FormGroup;

  // UI state signals
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  errorMessage = signal('');
  currentStep = signal(1);

  // Predefined interests for selection
  availableInterests = [
    'Adventure', 'Beach', 'Culture', 'Food', 'Photography', 'Hiking',
    'Museums', 'Nightlife', 'Nature', 'History', 'Art', 'Music',
    'Sports', 'Wildlife', 'Architecture', 'Festivals', 'Shopping',
    'Spiritual', 'Wellness', 'Luxury'
  ];

  selectedInterests = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize form
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)]],
      confirmPassword: ['', [Validators.required]],
      bio: ['', [Validators.maxLength(500)]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * Custom validator to check if passwords match
   */
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword?.hasError('passwordMismatch')) {
        delete confirmPassword.errors!['passwordMismatch'];
        if (Object.keys(confirmPassword.errors!).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null;
  }

  /**
   * Get loading state from auth service
   */
  get isLoading() {
    return this.authService.loading;
  }

  /**
   * Get form control for easy access in template
   */
  get formControls() {
    return this.registerForm.controls;
  }

  /**
   * Toggle password visibility
   */
  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }

  /**
   * Check if step 1 is valid
   */
  isStep1Valid(): boolean {
    const basicFields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];
    return basicFields.every(field => {
      const control = this.registerForm.get(field);
      return control?.valid;
    });
  }

  /**
   * Move to next step
   */
  nextStep(): void {
    if (this.currentStep() === 1) {
      // Validate basic info before moving to step 2
      const basicFields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];
      let hasErrors = false;

      basicFields.forEach(field => {
        const control = this.registerForm.get(field);
        control?.markAsTouched();
        if (control?.invalid) {
          hasErrors = true;
        }
      });

      if (!hasErrors) {
        this.currentStep.set(2);
      }
    }
  }

  /**
   * Move to previous step
   */
  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  /**
   * Toggle interest selection
   */
  toggleInterest(interest: string): void {
    this.selectedInterests.update(interests => {
      if (interests.includes(interest)) {
        return interests.filter(i => i !== interest);
      } else {
        return [...interests, interest];
      }
    });
  }

  /**
   * Check if interest is selected
   */
  isInterestSelected(interest: string): boolean {
    return this.selectedInterests().includes(interest);
  }

  /**
   * Handle registration form submission
   */
  onRegister(): void {
    // Reset error message
    this.errorMessage.set('');

    // Check if form is valid
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.registerForm.value;
    const userData: RegisterRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      username: formValue.username,
      email: formValue.email,
      password: formValue.password,
      fullName: `${formValue.firstName} ${formValue.lastName}`,
      bio: formValue.bio || '',
      interests: this.selectedInterests()
    };

    this.authService.register(userData).subscribe({
      next: (response) => {
        if (response.success) {
          // Navigate to feed
          this.router.navigate(['/feed']);
        }
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Registration failed. Please try again.');
      }
    });
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldDisplayName(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        if (fieldName === 'username') {
          return 'Username must start with a letter and contain only letters, numbers, and underscores';
        }
        if (fieldName === 'password') {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
      if (field.errors['requiredTrue']) {
        return 'You must agree to the terms and conditions';
      }
    }
    return '';
  }

  /**
   * Get display name for field
   */
  private getFieldDisplayName(fieldName: string): string {
    const names: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      username: 'Username',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      bio: 'Bio'
    };
    return names[fieldName] || fieldName;
  }
}
