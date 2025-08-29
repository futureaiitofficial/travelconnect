import { Component, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

/**
 * Main application component for Travel Connect
 * This is the root component that houses the entire application layout
 * including sidebar navigation, mobile navigation, and main content area
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Dark mode state
  darkMode = signal(false);

  // Current route tracking
  private currentRoute = signal('');

  // Auth state
  isAuthenticated = computed(() => this.authService.isLoggedIn());
  currentUser = computed(() => this.authService.user());

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.darkMode.set(true);
      document.body.classList.add('dark-mode');
    }

    // Check for system preference if no saved preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.darkMode.set(true);
        document.body.classList.add('dark-mode');
      }
    }

    // Track route changes for layout switching
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.urlAfterRedirects);
    });
  }

  /**
   * Check if current route is an authentication route
   */
  isAuthRoute(): boolean {
    const route = this.currentRoute();
    return route.includes('/login') || route.includes('/register') || route.includes('/signup');
  }

  /**
   * Toggle between light and dark mode
   */
  toggleTheme(): void {
    const newMode = !this.darkMode();
    this.darkMode.set(newMode);

    if (newMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Navigation is handled by the auth service
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout fails, the auth service will clear local storage
      }
    });
  }
}
