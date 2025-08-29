import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PostService, Post as BackendPost } from '../../services/post.service';
import { CommentService, Comment } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

// Frontend post interface for compatibility
interface FeedPost {
  _id: string;
  username: string;
  profilePic: string;
  location?: string;
  caption: string;
  likes: number;
  commentCount: number;
  timestamp: string;
  liked: boolean;
  saved: boolean;
  type: 'single' | 'carousel';
  imageUrl?: string;
  images?: string[];
  currentImageIndex?: number;
}

/**
 * Feed Component - Displays the main social feed
 * This component shows posts from users the current user follows
 * Features infinite scroll, like/unlike, comments, and sharing
 */
@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.css'
})
export class FeedComponent implements OnInit {
  private postService = inject(PostService);
  private commentService = inject(CommentService);
  private authService = inject(AuthService);

  // Responsive design
  isMobile = window.innerWidth < 768;

  // Loading states
  loading = signal<boolean>(false);
  error = signal<string>('');

  // Current user
  currentUser = signal<any>(null);

  constructor() {
    // Listen for window resize events to update isMobile
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
    });
  }

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUserFromStorage());
    this.loadFeed();
  }

  // Stories data (simplified for now)
  stories = signal<any[]>([]);

  // Posts data
  posts = signal<FeedPost[]>([]);

  // Suggested accounts (simplified for now)
  suggestedAccounts = signal<any[]>([]);

  // Pagination
  currentPage = signal<number>(1);
  hasMorePosts = signal<boolean>(true);

  // Comment functionality
  comments = signal<{ [postId: string]: Comment[] }>({});
  commentInputs = signal<{ [postId: string]: string }>({});
  showComments = signal<{ [postId: string]: boolean }>({});
  loadingComments = signal<{ [postId: string]: boolean }>({});

  /**
   * Load feed data from backend
   */
  loadFeed(): void {
    this.loading.set(true);
    this.error.set('');

    this.postService.getAllPosts(this.currentPage()).subscribe({
      next: (response) => {
        if (response.success) {
          const feedPosts = response.data.posts.map(backendPost => this.convertBackendPostToFeedPost(backendPost));

          if (this.currentPage() === 1) {
            this.posts.set(feedPosts);
          } else {
            this.posts.update(posts => [...posts, ...feedPosts]);
          }

          this.hasMorePosts.set(response.data.pagination?.hasNext || false);
        } else {
          this.error.set(response.message || 'Failed to load posts');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading feed:', error);
        this.error.set('Failed to load posts. Please try again.');
        this.loading.set(false);
      }
    });
  }

  /**
   * Convert backend post to feed post format
   */
  private convertBackendPostToFeedPost(backendPost: BackendPost): FeedPost {
    const currentUserId = this.currentUser()?._id;
    const isLiked = this.postService.hasLikedPost(backendPost, currentUserId);

    return {
      _id: backendPost._id,
      username: backendPost.userId.username,
      profilePic: this.postService.getUserAvatarUrl(backendPost.userId),
      location: backendPost.location?.name,
      caption: backendPost.caption,
      likes: backendPost.likesCount,
      commentCount: backendPost.commentsCount,
      timestamp: this.postService.formatPostDate(backendPost.createdAt),
      liked: isLiked,
      saved: false, // TODO: Implement save functionality
      type: backendPost.media.length > 1 ? 'carousel' : 'single',
      imageUrl: backendPost.media.length > 0 ? this.postService.getMediaUrl(backendPost.media[0]) : undefined,
      images: backendPost.media.length > 1 ? backendPost.media.map(media => this.postService.getMediaUrl(media)) : undefined,
      currentImageIndex: 0
    };
  }

  /**
   * Load more posts (infinite scroll)
   */
  loadMorePosts(): void {
    if (!this.loading() && this.hasMorePosts()) {
      this.currentPage.update(page => page + 1);
      this.loadFeed();
    }
  }

  /**
   * View a user's story
   * @param storyId ID of the story to view
   */
  viewStory(storyId: number): void {
    console.log('Viewing story:', storyId);
    // Implementation would open story viewer
  }

  /**
   * Toggle like status for a post
   * @param postId ID of the post to like/unlike
   */
  toggleLike(postId: string): void {
    this.postService.toggleLike(postId).subscribe({
      next: (response) => {
        if (response.success) {
          this.posts.update(posts => {
            return posts.map(post => {
              if (post._id === postId) {
                return {
                  ...post,
                  liked: response.data.isLiked,
                  likes: response.data.likesCount
                };
              }
              return post;
            });
          });
        }
      },
      error: (error) => {
        console.error('Error toggling like:', error);
      }
    });
  }

  /**
   * Toggle save status for a post
   * @param postId ID of the post to save/unsave
   */
  toggleSave(postId: string): void {
    this.posts.update(posts => {
      return posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            saved: !post.saved
          };
        }
        return post;
      });
    });
  }

  /**
   * Follow a suggested account
   * @param accountId ID of the account to follow
   */
  followAccount(accountId: string): void {
    this.suggestedAccounts.update(accounts => {
      return accounts.map(account => {
        if (account._id === accountId) {
          return {
            ...account,
            followed: true
          };
        }
        return account;
      });
    });
  }

  /**
   * Navigate to the next image in a carousel post
   * @param postId ID of the carousel post
   */
  nextImage(postId: string): void {
    this.posts.update(posts => {
      return posts.map(post => {
        if (post._id === postId && post.type === 'carousel' && post.images) {
          const totalImages = post.images.length;
          const nextIndex = ((post.currentImageIndex || 0) + 1) % totalImages;
          return {
            ...post,
            currentImageIndex: nextIndex
          };
        }
        return post;
      });
    });
  }

  /**
   * Navigate to the previous image in a carousel post
   * @param postId ID of the carousel post
   */
  prevImage(postId: string): void {
    this.posts.update(posts => {
      return posts.map(post => {
        if (post._id === postId && post.type === 'carousel' && post.images) {
          const totalImages = post.images.length;
          const prevIndex = ((post.currentImageIndex || 0) - 1 + totalImages) % totalImages;
          return {
            ...post,
            currentImageIndex: prevIndex
          };
        }
        return post;
      });
    });
  }

  /**
   * Get the current image URL for a carousel post
   */
  getCarouselImageUrl(post: FeedPost): string {
    if (post.type === 'carousel' && post.images && post.currentImageIndex !== undefined) {
      return post.images[post.currentImageIndex];
    }
    return '';
  }

  /**
   * Get an array of indices for carousel indicators
   */
  getCarouselIndicators(post: FeedPost): number[] {
    if (post.type === 'carousel' && post.images) {
      return Array.from({ length: post.images.length }, (_, i) => i);
    }
    return [];
  }

  /**
   * Check if a carousel dot is active
   */
  isActiveDot(post: FeedPost, index: number): boolean {
    if (post.type === 'carousel') {
      return index === (post.currentImageIndex || 0);
    }
    return false;
  }

  /**
   * Get user avatar URL with fallback
   */
  getUserAvatar(user: any): string {
    if (user?.profilePicture) {
      if (user.profilePicture.startsWith('http')) {
        return user.profilePicture;
      }
      return `${environment.backendUrl}${user.profilePicture}`;
    }
    // Use a data URL for the default avatar to ensure it always loads
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzY2N2VlYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNzY0YmEyO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgCiAgPCEtLSBCYWNrZ3JvdW5kIGNpcmNsZSAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0idXJsKCNhdmF0YXJHcmFkaWVudCkiLz4KICAKICA8IS0tIFVzZXIgaWNvbiAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxMiIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOSIvPgogIDxwYXRoIGQ9Ik0yNSA3NSBDMjUgNjAgMzUgNTAgNTAgNTAgQzY1IDUwIDc1IDYwIDc1IDc1IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+CiAgCiAgPCEtLSBEZWNvcmF0aXZlIGVsZW1lbnRzIC0tPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjMiLz4KICA8Y2lyY2xlIGN4PSI3MCIgY3k9IjI1IiByPSIyIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+CiAgPGNpcmNsZSBjeD0iNzUiIGN5PSI3MCIgcj0iMi41IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPgo=';
  }

  /**
   * Toggle comments visibility for a post
   */
  toggleComments(postId: string): void {
    const currentShow = this.showComments();
    this.showComments.set({ ...currentShow, [postId]: !currentShow[postId] });

    if (!currentShow[postId]) {
      this.loadComments(postId);
    }
  }

  /**
   * Load comments for a post
   */
  loadComments(postId: string): void {
    this.loadingComments.set({ ...this.loadingComments(), [postId]: true });

    this.commentService.getCommentsForPost(postId).subscribe({
      next: (response) => {
        if (response.success) {
          this.comments.set({ ...this.comments(), [postId]: response.data.comments });
        }
        this.loadingComments.set({ ...this.loadingComments(), [postId]: false });
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.loadingComments.set({ ...this.loadingComments(), [postId]: false });
      }
    });
  }

  /**
   * Add a comment to a post
   */
  addComment(postId: string): void {
    const commentText = this.commentInputs()[postId]?.trim();
    if (!commentText) return;

    this.commentService.createComment({ postId, commentText }).subscribe({
      next: (response) => {
        if (response.success) {
          // Add new comment to the list
          const currentComments = this.comments()[postId] || [];
          this.comments.set({
            ...this.comments(),
            [postId]: [...currentComments, response.data]
          });

          // Update post comment count
          this.posts.update(posts =>
            posts.map(post =>
              post._id === postId
                ? { ...post, commentCount: post.commentCount + 1 }
                : post
            )
          );

          // Clear input
          this.commentInputs.set({ ...this.commentInputs(), [postId]: '' });
        }
      },
      error: (error) => {
        console.error('Error adding comment:', error);
      }
    });
  }

  /**
   * Update comment input
   */
  updateCommentInput(postId: string, value: string): void {
    this.commentInputs.set({ ...this.commentInputs(), [postId]: value });
  }

  /**
   * Like/unlike a comment
   */
  toggleCommentLike(commentId: string, postId: string): void {
    this.commentService.toggleLike(commentId).subscribe({
      next: (response) => {
        if (response.success) {
          const currentComments = this.comments()[postId] || [];
          const updatedComments = currentComments.map(comment =>
            comment._id === commentId
              ? { ...comment, likes: response.data.isLiked ? [...comment.likes, this.currentUser()?._id] : comment.likes.filter(id => id !== this.currentUser()?._id), likesCount: response.data.likesCount }
              : comment
          );
          this.comments.set({ ...this.comments(), [postId]: updatedComments });
        }
      },
      error: (error) => {
        console.error('Error toggling comment like:', error);
      }
    });
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: string, postId: string): void {
    if (confirm('Are you sure you want to delete this comment?')) {
      this.commentService.deleteComment(commentId).subscribe({
        next: (response) => {
          if (response.success) {
            // Remove comment from the list
            const currentComments = this.comments()[postId] || [];
            this.comments.set({
              ...this.comments(),
              [postId]: currentComments.filter(comment => comment._id !== commentId)
            });

            // Update post comment count
            this.posts.update(posts =>
              posts.map(post =>
                post._id === postId
                  ? { ...post, commentCount: Math.max(0, post.commentCount - 1) }
                  : post
              )
            );
          }
        },
        error: (error) => {
          console.error('Error deleting comment:', error);
        }
      });
    }
  }

  /**
   * Get comment avatar URL
   */
  getCommentAvatarUrl(user: any): string {
    return this.commentService.getUserAvatarUrl(user);
  }

  /**
   * Format comment date
   */
  formatCommentDate(dateString: string): string {
    return this.commentService.formatCommentDate(dateString);
  }

  /**
   * Check if user has liked comment
   */
  hasLikedComment(comment: Comment): boolean {
    return this.commentService.hasLikedComment(comment, this.currentUser()?._id);
  }

  /**
   * Check if user can edit comment
   */
  canEditComment(comment: Comment): boolean {
    return this.commentService.canEditComment(comment, this.currentUser()?._id);
  }

  /**
   * Share post to social media
   */
  sharePost(post: FeedPost): void {
    const shareData = {
      title: `Check out this amazing travel post by ${post.username}!`,
      text: post.caption,
      url: `${window.location.origin}/post/${post._id}`
    };

    // Try native Web Share API first
    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData).catch((error) => {
        console.log('Error sharing:', error);
        this.fallbackShare(post);
      });
    } else {
      this.fallbackShare(post);
    }
  }

  /**
   * Fallback share method using URL copying
   */
  private fallbackShare(post: FeedPost): void {
    const shareUrl = `${window.location.origin}/post/${post._id}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Post link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Post link copied to clipboard!');
    });
  }

  /**
   * Share to specific social media platforms
   */
  shareToSocialMedia(post: FeedPost, platform: string): void {
    const shareUrl = `${window.location.origin}/post/${post._id}`;
    const text = encodeURIComponent(post.caption);
    const title = encodeURIComponent(`Check out this amazing travel post by ${post.username}!`);

    let url = '';

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${text}%20${encodeURIComponent(shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`;
        break;
      default:
        return;
    }

    window.open(url, '_blank', 'width=600,height=400');
  }
}
