import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces for post data
export interface PostLocation {
  name?: string;
  lat?: number;
  lng?: number;
}

export interface PostUser {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface Post {
  _id: string;
  userId: PostUser;
  caption: string;
  media: string[];
  location?: PostLocation;
  hashtags: string[];
  likes: string[];
  commentsCount: number;
  isPublic: boolean;
  isReported: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  hasLocation: boolean;
}

export interface CreatePostData {
  caption?: string;
  location?: PostLocation;
  isPublic?: boolean;
}

export interface PostsResponse {
  success: boolean;
  message?: string;
  data: {
    posts: Post[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    hashtag?: string;
    location?: PostLocation;
    radius?: number;
    query?: string;
  };
}

export interface SinglePostResponse {
  success: boolean;
  message?: string;
  data: Post;
}

export interface LikeResponse {
  success: boolean;
  message: string;
  data: {
    isLiked: boolean;
    likesCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly API_URL = `${environment.backendUrl}/api/posts`;
  private http = inject(HttpClient);

  constructor() { }

  /**
   * Create a new post with media files
   */
  createPost(postData: CreatePostData, mediaFiles: File[]): Observable<SinglePostResponse> {
    const formData = new FormData();

    // Add text data
    if (postData.caption) formData.append('caption', postData.caption);
    if (postData.location) formData.append('location', JSON.stringify(postData.location));
    if (postData.isPublic !== undefined) formData.append('isPublic', postData.isPublic.toString());

    // Add media files
    mediaFiles.forEach(file => {
      formData.append('media', file);
    });

    return this.http.post<SinglePostResponse>(this.API_URL, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get all posts (feed)
   */
  getAllPosts(page: number = 1, limit: number = 20): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(`${this.API_URL}?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get single post by ID
   */
  getPostById(postId: string): Observable<SinglePostResponse> {
    return this.http.get<SinglePostResponse>(`${this.API_URL}/${postId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update post
   */
  updatePost(postId: string, postData: Partial<CreatePostData>): Observable<SinglePostResponse> {
    const updateData: any = {};
    if (postData.caption !== undefined) updateData.caption = postData.caption;
    if (postData.location) updateData.location = JSON.stringify(postData.location);
    if (postData.isPublic !== undefined) updateData.isPublic = postData.isPublic;

    return this.http.put<SinglePostResponse>(`${this.API_URL}/${postId}`, updateData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete post
   */
  deletePost(postId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${postId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Like/unlike post
   */
  toggleLike(postId: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.API_URL}/${postId}/like`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get posts by user
   */
  getPostsByUser(userId: string, page: number = 1, limit: number = 20): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(`${this.API_URL}/user/${userId}?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get posts by hashtag
   */
  getPostsByHashtag(hashtag: string, page: number = 1, limit: number = 20): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(`${this.API_URL}/hashtag/${hashtag}?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get posts by location (nearby)
   */
  getPostsByLocation(lat: number, lng: number, radius: number = 10, page: number = 1, limit: number = 20): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(`${this.API_URL}/location?lat=${lat}&lng=${lng}&radius=${radius}&page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search posts
   */
  searchPosts(query: string, page: number = 1, limit: number = 20): Observable<PostsResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.http.get<PostsResponse>(`${this.API_URL}/search?q=${encodedQuery}&page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get media URL for display
   */
  getMediaUrl(mediaPath: string): string {
    if (mediaPath.startsWith('http')) {
      return mediaPath;
    }
    return `${environment.backendUrl}${mediaPath}`;
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(user: PostUser): string {
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
   * Format post date
   */
  formatPostDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 24 * 7) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format large numbers (e.g., 12500 -> 12.5K)
   */
  formatCount(count: number): string {
    if (count >= 1_000_000) {
      return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1_000) {
      return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  }

  /**
   * Extract hashtags from caption
   */
  extractHashtags(caption: string): string[] {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(caption)) !== null) {
      const hashtag = match[1].toLowerCase();
      if (!hashtags.includes(hashtag)) {
        hashtags.push(hashtag);
      }
    }

    return hashtags;
  }

  /**
   * Check if user can edit post
   */
  canEditPost(post: Post, currentUserId?: string): boolean {
    return currentUserId === post.userId._id;
  }

  /**
   * Check if user has liked post
   */
  hasLikedPost(post: Post, currentUserId?: string): boolean {
    return currentUserId ? post.likes.includes(currentUserId) : false;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = error.error?.message || error.statusText || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error('PostService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
