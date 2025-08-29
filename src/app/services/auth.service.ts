import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interface for populated user references (when followers/following are populated)
interface PopulatedUserRef {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface User {
  id: string;
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName?: string;
  profilePicture: string;
  coverImage?: string;
  bio: string;
  interests: string[];
  travelHistory: string[];
  role: 'user' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  followers?: (string | PopulatedUserRef)[];
  following?: (string | PopulatedUserRef)[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  tripsCount: number;
  createdAt: string;
  lastLogin: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  fullName?: string;
  bio?: string;
  interests?: string[];
  travelHistory?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.backendUrl}/api/auth`;
  private readonly TOKEN_KEY = 'travelconnect_token';
  private readonly REFRESH_TOKEN_KEY = 'travelconnect_refresh_token';
  private readonly USER_KEY = 'travelconnect_user';

  // Reactive state
  private currentUser = signal<User | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private isLoading = signal<boolean>(false);
  private isCheckingAuth = false;

  // Public computed signals
  user = computed(() => this.currentUser());
  isLoggedIn = computed(() => this.isAuthenticated());
  loading = computed(() => this.isLoading());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for existing authentication on service initialization
    this.checkAuthStatus();
  }

  /**
   * Register a new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this)),
        tap(() => this.isLoading.set(false))
      );
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this)),
        tap(() => this.isLoading.set(false))
      );
  }

    /**
   * Logout user
   */
  logout(): Observable<{ success: boolean; message: string }> {
    const token = this.getToken();

    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/logout`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).pipe(
      tap(() => this.handleLogout()),
      catchError(() => {
        // Even if logout fails, clear local storage
        this.handleLogout();
        return throwError(() => new Error('Logout failed'));
      })
    );
  }

  /**
   * Get current user data
   */
  getCurrentUser(): Observable<{ success: boolean; data: User }> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }

    return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap(response => {
        if (response.success) {
          this.currentUser.set(response.data);
          this.saveUser(response.data);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

      /**
   * Update user profile
   */
  updateProfile(userData: Partial<User>): Observable<{ success: boolean; message: string; data: User }> {
    const token = this.getToken();

    return this.http.put<{ success: boolean; message: string; data: User }>(`${this.API_URL}/profile`, userData, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUser.set(response.data);
          this.saveUser(response.data);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

    /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    const token = this.getToken();

    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/change-password`, {
      currentPassword,
      newPassword
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Forgot password
   */
  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/forgot-password`, { email })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Reset password
   */
  resetPassword(token: string, password: string): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.API_URL}/reset-password/${token}`, { password })
      .pipe(
        tap(response => {
          if (response.success) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh-token`, {
      refreshToken
    }).pipe(
      tap(response => {
        if (response.success) {
          this.handleAuthSuccess(response);
        }
      }),
      catchError(error => {
        // If refresh fails, clear auth state but don't force logout redirect
        this.clearStorage();
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    this.saveToken(response.token);
    this.saveRefreshToken(response.refreshToken);
    this.saveUser(response.user);
    this.currentUser.set(response.user);
    this.isAuthenticated.set(true);
  }

  /**
   * Handle logout
   */
  private handleLogout(): void {
    this.clearStorage();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Only redirect to login if not already on an auth page
    const currentUrl = this.router.url;
    if (!currentUrl.includes('/login') && !currentUrl.includes('/register')) {
      this.router.navigate(['/login']);
    }
  }

    /**
   * Check authentication status on app init
   */
  private checkAuthStatus(): void {
    // Prevent multiple simultaneous auth checks
    if (this.isCheckingAuth) return;
    this.isCheckingAuth = true;

    const token = this.getToken();
    const user = this.getSavedUser();

    if (token && user && !this.isTokenExpired()) {
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      this.isCheckingAuth = false;
      // Don't automatically refresh user data on init to avoid circular dependencies
    } else if (token && this.getRefreshToken() && !this.isTokenExpired()) {
      // Only try to refresh if token isn't expired
      this.refreshToken().subscribe({
        next: (response) => {
          if (response.success) {
            this.currentUser.set(response.user);
            this.isAuthenticated.set(true);
          }
          this.isCheckingAuth = false;
        },
        error: () => {
          // Silently clear without logout redirect on init
          this.clearStorage();
          this.currentUser.set(null);
          this.isAuthenticated.set(false);
          this.isCheckingAuth = false;
        }
      });
    } else {
      // No valid token, just clear storage without redirecting
      this.clearStorage();
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
      this.isCheckingAuth = false;
    }
  }

  /**
   * Save token to localStorage
   */
  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Save refresh token to localStorage
   */
  private saveRefreshToken(refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Save user to localStorage
   */
  private saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Get saved user from localStorage
   */
  private getSavedUser(): User | null {
    if (typeof window !== 'undefined') {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    }
    return null;
  }

  /**
   * Get current user from localStorage (public method for components)
   */
  getCurrentUserFromStorage(): User | null {
    return this.getSavedUser();
  }

  /**
   * Clear all stored authentication data
   */
  private clearStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Update current user data
   */
  updateCurrentUser(userData: User): void {
    this.currentUser.set(userData);
    this.saveUser(userData);
  }

  /**
   * Add user to following list
   */
  addFollowing(userId: string): void {
    const currentUser = this.currentUser();
    if (currentUser) {
      // Check if already following to avoid duplicates
      const isAlreadyFollowing = (currentUser.following || []).some((item: string | any) => {
        const itemId = typeof item === 'string' ? item : item._id;
        return itemId.toString() === userId.toString();
      });

      if (!isAlreadyFollowing) {
        const updatedUser = {
          ...currentUser,
          following: [...(currentUser.following || []), userId]
        };
        console.log('Adding to following:', userId);
        console.log('Before following:', currentUser.following);
        console.log('After following:', updatedUser.following);
        this.updateCurrentUser(updatedUser);
      } else {
        console.log('Already following user:', userId);
      }
    }
  }

  /**
   * Remove user from following list
   */
  removeFollowing(userId: string): void {
    const currentUser = this.currentUser();
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        following: (currentUser.following || []).filter((item: string | PopulatedUserRef) => {
          const itemId = typeof item === 'string' ? item : item._id;
          return itemId.toString() !== userId.toString();
        })
      };
      console.log('Removing from following:', userId);
      console.log('Before following:', currentUser.following);
      console.log('After following:', updatedUser.following);
      this.updateCurrentUser(updatedUser);
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error && error.error.errors) {
        // Validation errors
        errorMessage = error.error.errors.map((err: any) => err.msg).join(', ');
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    console.error('AuthService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
