import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ProfileService, ProfileUser, ProfilePost, ProfileTrip } from '../../services/profile.service';
import { PostService, Post } from '../../services/post.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Profile data signals
  readonly profileUser = signal<ProfileUser | null>(null);
  readonly posts = signal<ProfilePost[]>([]);
  readonly trips = signal<ProfileTrip[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly following = signal<boolean>(false);

  // UI state
  readonly tabs = ['Posts', 'Trips', 'About'] as const;
  readonly activeTab = signal<(typeof this.tabs)[number]>('Posts');

  // Lightbox state for viewing post images
  readonly selectedPostIndex = signal<number | null>(null);
  readonly currentPost = computed(() => {
    const index = this.selectedPostIndex();
    const list = this.posts();
    if (index === null || index < 0 || index >= list.length) return null;
    return list[index] || null;
  });

  // Full post payload for lightbox details
  readonly lightboxLoading = signal<boolean>(false);
  readonly lightboxError = signal<string>('');
  readonly fullPost = signal<Post | null>(null);

  // Computed properties
  readonly isOwnProfile = computed(() => {
    const user = this.profileUser();
    const currentUser = this.authService.user();
    return user && currentUser && user._id === currentUser.id;
  });

  readonly displayName = computed(() => {
    const user = this.profileUser();
    return user ? this.profileService.getDisplayName(user) : '';
  });

  readonly username = computed(() => {
    const user = this.profileUser();
    return user ? user.username : '';
  });

  readonly avatarUrl = computed(() => {
    const user = this.profileUser();
    return user ? this.profileService.getProfilePictureUrl(user) : '/assets/images/avatar-placeholder.jpg';
  });

  readonly coverUrl = computed(() => {
    const user = this.profileUser();
    return user ? this.profileService.getCoverImageUrl(user) : '/assets/images/trip-placeholder.jpg';
  });

  readonly bio = computed(() => {
    const user = this.profileUser();
    return user ? user.bio : '';
  });

  readonly location = computed(() => {
    const user = this.profileUser();
    return user ? 'Travel enthusiast' : ''; // You can add location field to user model later
  });

  readonly website = computed(() => {
    return 'https://travelconnect.com'; // You can add website field to user model later
  });

  readonly stats = computed(() => {
    const user = this.profileUser();
    return user ? {
      posts: user.postsCount || 0,
      followers: user.followersCount || 0,
      following: user.followingCount || 0
    } : { posts: 0, followers: 0, following: 0 };
  });

  ngOnInit(): void {
    // Subscribe to route parameters to determine which profile to load
    this.route.paramMap.subscribe(params => {
      const username = params.get('username');
      if (username) {
        // Load other user's profile
        this.loadUserProfile(username);
      } else {
        // Load own profile
        this.loadOwnProfile();
      }
    });
  }

  // Open/close lightbox and navigate posts
  openPost(index: number): void {
    if (index >= 0 && index < this.posts().length) {
      this.selectedPostIndex.set(index);
      document.body.style.overflow = 'hidden';
      const basic = this.posts()[index];
      this.loadFullPost(basic.id);
    }
  }

  closePost(): void {
    this.selectedPostIndex.set(null);
    document.body.style.overflow = '';
  }

  nextPost(): void {
    const list = this.posts();
    if (!list.length) return;
    const idx = this.selectedPostIndex();
    const next = idx === null ? 0 : (idx + 1) % list.length;
    this.selectedPostIndex.set(next);
  }

  prevPost(): void {
    const list = this.posts();
    if (!list.length) return;
    const idx = this.selectedPostIndex();
    const prev = idx === null ? 0 : (idx - 1 + list.length) % list.length;
    this.selectedPostIndex.set(prev);
    const basic = this.posts()[prev];
    this.loadFullPost(basic.id);
  }

  private loadFullPost(postId: string): void {
    this.lightboxLoading.set(true);
    this.lightboxError.set('');
    this.fullPost.set(null);
    this.postService.getPostById(postId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          // Normalize media URLs
          const normalized: Post = {
            ...res.data,
            media: (res.data.media || []).map((m) => this.postService.getMediaUrl(m))
          } as Post;
          this.fullPost.set(normalized);
        } else {
          this.lightboxError.set('Failed to load post');
        }
        this.lightboxLoading.set(false);
      },
      error: (err) => {
        console.error('Load post error:', err);
        this.lightboxError.set('Failed to load post');
        this.lightboxLoading.set(false);
      }
    });
  }

  toggleLikeCurrent(): void {
    const post = this.fullPost();
    if (!post) return;
    this.postService.toggleLike(post._id).subscribe({
      next: (res) => {
        if (res.success) {
          const currentUser = this.authService.user();
          const currentUserId = currentUser?.id;
          const updated: Post = { ...post } as Post;
          updated.likes = Array.isArray(updated.likes) ? [...updated.likes] : [];
          if (currentUserId) {
            const hasLiked = updated.likes.some((id: any) => String(id) === String(currentUserId));
            if (hasLiked) {
              updated.likes = updated.likes.filter((id: any) => String(id) !== String(currentUserId));
            } else {
              (updated.likes as any).push(currentUserId);
            }
          }
          (updated as any).likesCount = res.data.likesCount;
          this.fullPost.set(updated);
        }
      },
      error: (err) => {
        console.error('Toggle like error:', err);
      }
    });
  }

  // Helpers for template to avoid null checks in HTML
  getLightboxAvatarUrl(): string {
    const post = this.fullPost();
    const fallback = '/assets/images/avatar-placeholder.jpg';
    const pic = post && post.userId && (post.userId as any).profilePicture as string | undefined;
    if (!pic || typeof pic !== 'string') return fallback;
    if (pic.startsWith('http')) return pic;
    if (pic.startsWith('/')) return `${environment.backendUrl}${pic}`;
    return fallback;
  }

  getLightboxDisplayName(): string {
    const post = this.fullPost();
    const user = post && post.userId ? (post.userId as any) : null;
    return user ? (user.fullName || user.username || '') : '';
  }

  getLightboxUsername(): string {
    const post = this.fullPost();
    const user = post && post.userId ? (post.userId as any) : null;
    return user ? (user.username || '') : '';
  }

  hasLightboxLocation(): boolean {
    const post = this.fullPost();
    const loc = post && post.location ? (post.location as any) : null;
    return !!(loc && loc.name);
  }

  getLightboxLocationName(): string {
    const post = this.fullPost();
    const loc = post && post.location ? (post.location as any) : null;
    return loc && loc.name ? loc.name : '';
  }

  getLightboxHashtags(): string[] {
    const post = this.fullPost();
    return post && Array.isArray(post.hashtags) ? post.hashtags : [];
  }

  /**
   * Load the current user's own profile
   */
  private loadOwnProfile(): void {
    const currentUser = this.authService.user();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadUserProfile(currentUser.username);
  }

  /**
   * Load a user's profile by username or ID
   */
  private loadUserProfile(identifier: string): void {
    this.loading.set(true);
    this.error.set('');

    // First, refresh current user data to ensure following array is up to date
    this.authService.getCurrentUser().subscribe({
      next: (userResponse) => {
        if (userResponse.success) {
          console.log('Profile: Refreshed current user data:', userResponse.data);

          // Now load the profile
          this.profileService.getUserProfile(identifier).subscribe({
            next: (response) => {
              if (response.success) {
                this.profileUser.set(response.data.user);
                this.posts.set(response.data.posts);
                this.trips.set(response.data.trips);

                // Check if current user is following this user
                const currentUser = this.authService.user();
                if (currentUser && response.data.user._id !== currentUser.id) {
                  const isFollowing = this.profileService.isFollowing(response.data.user._id);
                  console.log(`Profile: Checking if following ${response.data.user.username}:`, isFollowing);
                  console.log('Profile: Current user following array:', currentUser.following);
                  this.following.set(isFollowing);
                }
              }
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error loading profile:', error);
              this.error.set(error.message || 'Failed to load profile');
              this.loading.set(false);
            }
          });
        } else {
          this.loading.set(false);
          this.error.set('Failed to refresh user data');
        }
      },
      error: (error) => {
        console.error('Error refreshing current user:', error);
        this.loading.set(false);
        this.error.set('Failed to refresh user data');
      }
    });
  }

  /**
   * Toggle follow/unfollow for the current profile user
   */
  toggleFollow(): void {
    const user = this.profileUser();
    if (!user || this.isOwnProfile()) return;

    const isCurrentlyFollowing = this.following();
    console.log(`Profile: Toggling follow for ${user.username}, currently following:`, isCurrentlyFollowing);

    if (isCurrentlyFollowing) {
      console.log('Profile: Unfollowing user:', user._id);
      this.profileService.unfollowUser(user._id).subscribe({
        next: (response) => {
          console.log('Profile: Unfollow response:', response);
          if (response.success) {
            // Update follower count
            const updatedUser = { ...user, followersCount: user.followersCount - 1 };
            this.profileUser.set(updatedUser);
            // Refresh following status
            this.refreshFollowingStatus();
            console.log('Profile: User unfollowed successfully');
          }
        },
        error: (error) => {
          console.error('Profile: Error unfollowing user:', error);
          // Even on error, refresh the status to ensure UI is correct
          this.refreshFollowingStatus();
        }
      });
    } else {
      console.log('Profile: Following user:', user._id);
      this.profileService.followUser(user._id).subscribe({
        next: (response) => {
          console.log('Profile: Follow response:', response);
          if (response.success) {
            // Update follower count
            const updatedUser = { ...user, followersCount: user.followersCount + 1 };
            this.profileUser.set(updatedUser);
            // Refresh following status
            this.refreshFollowingStatus();
            console.log('Profile: User followed successfully');
          }
        },
        error: (error) => {
          console.error('Profile: Error following user:', error);
          // Even on error, refresh the status to ensure UI is correct
          this.refreshFollowingStatus();
        }
      });
    }
  }

  /**
   * Navigate to edit profile page
   */
  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  /**
   * Share profile (placeholder for future implementation)
   */
  shareProfile(): void {
    if (navigator.share) {
      navigator.share({
        title: `${this.displayName()} - TravelConnect`,
        text: `Check out ${this.displayName()}'s travel adventures on TravelConnect!`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }

  /**
   * Navigate to messages with this user
   */
  messageUser(): void {
    // TODO: Implement messaging functionality
    console.log('Message user functionality to be implemented');
  }

  /**
   * Set active tab
   */
  setTab(tab: (typeof this.tabs)[number]) {
    this.activeTab.set(tab);
  }

  /**
   * Get formatted follower count
   */
  get formattedFollowers() {
    return computed(() => this.profileService.formatCount(this.stats().followers));
  }

  /**
   * Get formatted following count
   */
  get formattedFollowing() {
    return computed(() => this.profileService.formatCount(this.stats().following));
  }

  /**
   * Refresh following status for the current profile user
   */
  refreshFollowingStatus(): void {
    const user = this.profileUser();
    if (!user || this.isOwnProfile()) return;

    // Refresh current user data first, then check following status
    this.authService.getCurrentUser().subscribe({
      next: (userResponse) => {
        if (userResponse.success) {
          const currentUser = this.authService.user();
          console.log('Profile: Refreshed current user following array:', currentUser?.following);
          console.log('Profile: Checking if following user ID:', user._id);

          const isFollowing = this.profileService.isFollowing(user._id);
          console.log(`Profile: Refreshing following status for ${user.username}:`, isFollowing);
          this.following.set(isFollowing);
        }
      },
      error: (error) => {
        console.error('Error refreshing current user for following status:', error);
      }
    });
  }
}


