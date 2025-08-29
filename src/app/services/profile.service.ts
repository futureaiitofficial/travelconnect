import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService, User } from './auth.service';

// Define interfaces for profile data
export interface ProfileUser extends User {
  coverImage?: string;
  location?: string;
  website?: string;
}

export interface ProfilePost {
  id: string;
  imageUrl: string;
  likes: number;
  comments: number;
}

export interface ProfileTrip {
  id: string;
  title: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  location: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: ProfileUser;
    posts: ProfilePost[];
    trips: ProfileTrip[];
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    user: ProfileUser;
    filePath?: string;
    profilePicture?: string;
    coverImage?: string;
  };
}

export interface FollowResponse {
  success: boolean;
  message: string;
  data: {
    followerId: string;
    followedId: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = `${environment.backendUrl}/api/users`;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    console.log('ProfileService API_URL:', this.API_URL);
  }

  /**
   * Get user profile by username or ID
   */
  getUserProfile(identifier: string): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.API_URL}/profile/${identifier}`).pipe(
      map((response) => {
        if (response?.success && response.data) {
          const normalizedPosts = (response.data.posts || []).map((post) => ({
            ...post,
            imageUrl: post.imageUrl && post.imageUrl.startsWith('http')
              ? post.imageUrl
              : `${environment.backendUrl}${post.imageUrl || ''}`
          }));

          const normalizedTrips = (response.data.trips || []).map((trip) => ({
            ...trip,
            coverImage: trip.coverImage && trip.coverImage.startsWith('http')
              ? trip.coverImage
              : `${environment.backendUrl}${trip.coverImage || ''}`
          }));

          return {
            ...response,
            data: {
              ...response.data,
              posts: normalizedPosts,
              trips: normalizedTrips
            }
          } as ProfileResponse;
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(userData: Partial<ProfileUser>): Observable<{ success: boolean; message: string; data: ProfileUser }> {
    return this.http.put<{ success: boolean; message: string; data: ProfileUser }>(`${this.API_URL}/profile`, userData).pipe(
      tap(response => {
        if (response.success && response.data) {
          // Update local auth service user if it's the current user's profile
          const currentUser = this.authService.user();
          if (currentUser && currentUser.id === response.data._id) {
            this.authService.updateCurrentUser(response.data);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Upload profile avatar
   */
  uploadAvatar(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<UploadResponse>(`${this.API_URL}/upload/avatar`, formData).pipe(
      tap(response => {
        if (response.success && response.data && response.data.user) {
          const currentUser = this.authService.user();
          if (currentUser && currentUser.id === response.data.user._id) {
            this.authService.updateCurrentUser(response.data.user);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Upload cover image
   */
  uploadCover(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<UploadResponse>(`${this.API_URL}/upload/cover`, formData).pipe(
      tap(response => {
        if (response.success && response.data && response.data.user) {
          const currentUser = this.authService.user();
          if (currentUser && currentUser.id === response.data.user._id) {
            this.authService.updateCurrentUser(response.data.user);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Follow a user
   */
  followUser(userId: string): Observable<FollowResponse> {
    const url = `${this.API_URL}/follow/${userId}`;
    console.log('Follow URL:', url);
    return this.http.post<FollowResponse>(url, {}).pipe(
      tap(response => {
        console.log('Follow response in service:', response);
        if (response.success) {
          this.authService.addFollowing(userId);
          // Refresh current user data to ensure following array is up to date
          this.authService.getCurrentUser().subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Unfollow a user
   */
  unfollowUser(userId: string): Observable<FollowResponse> {
    const url = `${this.API_URL}/follow/${userId}`;
    console.log('Unfollow URL:', url);
    return this.http.delete<FollowResponse>(url).pipe(
      tap(response => {
        console.log('Unfollow response in service:', response);
        if (response.success) {
          this.authService.removeFollowing(userId);
          // Refresh current user data to ensure following array is up to date
          this.authService.getCurrentUser().subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Check if the current user is following a specific user
   */
  isFollowing(userId: string): boolean {
    const currentUser = this.authService.user();
    if (!currentUser?.following) {
      console.log('ProfileService: No following array found for current user');
      return false;
    }

    console.log('ProfileService: Current user following array:', currentUser.following);
    console.log('ProfileService: Checking if following userId:', userId);
    console.log('ProfileService: Following array types:', currentUser.following.map(item => typeof item));
    console.log('ProfileService: Target userId type:', typeof userId);

    // Convert both to strings for comparison to handle ObjectId vs string mismatches
    const isFollowing = currentUser.following.some((item: string | any) => {
      const followingId = typeof item === 'string' ? item : item._id;
      const followingStr = followingId.toString();
      const targetStr = userId.toString();
      const matches = followingStr === targetStr;
      console.log(`ProfileService: Comparing ${followingStr} === ${targetStr} = ${matches}`);
      return matches;
    });

    console.log('ProfileService: Final result:', isFollowing);
    return isFollowing;
  }

  /**
   * Get display name from user object
   */
  getDisplayName(user: ProfileUser): string {
    return user.fullName || `${user.firstName} ${user.lastName}`;
  }

  /**
   * Get profile picture URL
   */
  getProfilePictureUrl(user: ProfileUser): string {
    if (user.profilePicture) {
      if (user.profilePicture.startsWith('http')) {
        return user.profilePicture;
      }
      return `${environment.backendUrl}${user.profilePicture}`;
    }
    // Use a data URL for the default avatar to ensure it always loads
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzY2N2VlYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNzY0YmEyO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgCiAgPCEtLSBCYWNrZ3JvdW5kIGNpcmNsZSAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0idXJsKCNhdmF0YXJHcmFkaWVudCkiLz4KICAKICA8IS0tIFVzZXIgaWNvbiAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxMiIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOSIvPgogIDxwYXRoIGQ9Ik0yNSA3NSBDMjUgNjAgMzUgNTAgNTAgNTAgQzY1IDUwIDc1IDYwIDc1IDc1IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+CiAgCiAgPCEtLSBEZWNvcmF0aXZlIGVsZW1lbnRzIC0tPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjMiLz4KICA8Y2lyY2xlIGN4PSI3MCIgY3k9IjI1IiByPSIyIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+CiAgPGNpcmNsZSBjeD0iNzUiIGN5PSI3MCIgcj0iMi41IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPgo=';
  }

  /**
   * Search users by username/fullName
   */
  searchUsers(query: string, page: number = 1, limit: number = 20): Observable<{ success: boolean; data: { users: ProfileUser[]; pagination: any } }> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(limit));
    const url = `${this.API_URL.replace('/profile','')}/search?${params.toString()}`;
    return this.http.get<{ success: boolean; data: { users: ProfileUser[]; pagination: any } }>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get cover image URL
   */
  getCoverImageUrl(user: ProfileUser): string {
    if (user.coverImage) {
      if (user.coverImage.startsWith('http')) {
        return user.coverImage;
      }
      return `${environment.backendUrl}${user.coverImage}`;
    }
    return '/assets/images/trip-placeholder.jpg';
  }

  /**
   * Format large numbers (e.g., 12500 -> 12.5K)
   */
  formatCount(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(value);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = error.error.message || error.statusText || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
