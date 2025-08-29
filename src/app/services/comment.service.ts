import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces for comment data
export interface CommentUser {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface Comment {
  _id: string;
  postId: string;
  userId: CommentUser;
  commentText: string;
  parentComment?: string;
  likes: string[];
  likesCount: number;
  isReply: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentData {
  postId: string;
  commentText: string;
  parentComment?: string;
}

export interface CommentsResponse {
  success: boolean;
  message?: string;
  data: {
    comments: Comment[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface SingleCommentResponse {
  success: boolean;
  message?: string;
  data: Comment;
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
export class CommentService {
  private readonly API_URL = `${environment.backendUrl}/api/comments`;
  private http = inject(HttpClient);

  constructor() { }

  /**
   * Get comments for a post
   */
  getCommentsForPost(postId: string, page: number = 1, limit: number = 20): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`${this.API_URL}/post/${postId}?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new comment
   */
  createComment(commentData: CreateCommentData): Observable<SingleCommentResponse> {
    return this.http.post<SingleCommentResponse>(this.API_URL, commentData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update a comment
   */
  updateComment(commentId: string, commentText: string): Observable<SingleCommentResponse> {
    return this.http.put<SingleCommentResponse>(`${this.API_URL}/${commentId}`, { commentText }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${commentId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Like/unlike a comment
   */
  toggleLike(commentId: string): Observable<LikeResponse> {
    return this.http.post<LikeResponse>(`${this.API_URL}/${commentId}/like`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get replies for a comment
   */
  getRepliesForComment(commentId: string, page: number = 1, limit: number = 10): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`${this.API_URL}/${commentId}/replies?page=${page}&limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(user: CommentUser): string {
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
   * Format comment date
   */
  formatCommentDate(dateString: string): string {
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
   * Check if user has liked comment
   */
  hasLikedComment(comment: Comment, currentUserId?: string): boolean {
    return currentUserId ? comment.likes.includes(currentUserId) : false;
  }

  /**
   * Check if user can edit comment
   */
  canEditComment(comment: Comment, currentUserId?: string): boolean {
    return currentUserId === comment.userId._id;
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
    console.error('CommentService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
