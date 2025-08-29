import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

interface PeopleUser {
  _id: string;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profilePicture?: string;
  isFollowing?: boolean;
}

@Component({
  selector: 'app-people-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './people-search.component.html',
  styleUrl: './people-search.component.css'
})
export class PeopleSearchComponent implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  query = signal<string>('');
  results = signal<PeopleUser[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  page = signal<number>(1);
  hasMore = signal<boolean>(false);
  typingTimer: any = null;
  followingUsers = signal<Set<string>>(new Set());

  ngOnInit(): void {
    // Clear any existing search when component initializes
    this.query.set('');
    this.results.set([]);
    this.error.set(null);
  }

  onQueryInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.error.set(null); // Clear any previous errors

    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.search(true), 300);
  }

  clearSearch(): void {
    this.query.set('');
    this.results.set([]);
    this.error.set(null);
    this.hasMore.set(false);
    if (this.typingTimer) clearTimeout(this.typingTimer);
  }

  search(reset = false): void {
    const q = this.query().trim();
    if (q.length === 0) {
      this.results.set([]);
      this.hasMore.set(false);
      return;
    }
    this.loading.set(true);
    if (reset) this.page.set(1);
    this.profileService.searchUsers(q, this.page()).subscribe({
      next: (resp) => {
        if (resp.success) {
          const list = resp.data.users as PeopleUser[];
          console.log('Search results from backend:', list);
          // Backend now provides isFollowing status, but we can override with local state if needed
          const usersWithFollowingStatus = list.map(user => ({
            ...user,
            isFollowing: user.isFollowing || this.isFollowing(user)
          }));
          this.results.set(reset ? usersWithFollowingStatus : [...this.results(), ...usersWithFollowingStatus]);
          this.hasMore.set(resp.data.pagination?.hasNext ?? false);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Search error:', err);
        this.error.set(err.error?.message || err.message || 'Failed to search users');
        this.loading.set(false);
      }
    })
  }

  loadMore(): void {
    if (!this.hasMore()) return;
    this.page.set(this.page() + 1);
    this.search(false);
  }

  openProfile(user: PeopleUser): void {
    this.router.navigate(['/user', user.username]);
  }

      follow(user: PeopleUser): void {
    console.log('Following user:', user._id, user.username);

    // Check authentication status
    const currentUser = this.authService.user();
    const token = localStorage.getItem('travelconnect_token');
    console.log('Current user:', currentUser);
    console.log('Auth token exists:', !!token);
    console.log('User is logged in:', this.authService.isLoggedIn());

    // Add to following set for loading state
    const currentFollowing = this.followingUsers();
    currentFollowing.add(user._id);
    this.followingUsers.set(new Set(currentFollowing));

    this.profileService.followUser(user._id).subscribe({
      next: (response) => {
        console.log('Follow response:', response);
        if (response.success) {
          console.log('User followed successfully');
          // Refresh following status for all users
          this.refreshFollowingStatus();
        } else {
          console.error('Follow failed:', response.message);
          this.error.set(response.message || 'Failed to follow user');
        }

        // Remove from following set
        const currentFollowing = this.followingUsers();
        currentFollowing.delete(user._id);
        this.followingUsers.set(new Set(currentFollowing));
      },
      error: (err) => {
        console.error('Follow error:', err);
        this.error.set(err.error?.message || err.message || 'Failed to follow user');

        // Remove from following set on error
        const currentFollowing = this.followingUsers();
        currentFollowing.delete(user._id);
        this.followingUsers.set(new Set(currentFollowing));
      }
    });
  }

    unfollow(user: PeopleUser): void {
    console.log('Unfollowing user:', user._id, user.username);

    // Add to following set for loading state
    const currentFollowing = this.followingUsers();
    currentFollowing.add(user._id);
    this.followingUsers.set(new Set(currentFollowing));

    this.profileService.unfollowUser(user._id).subscribe({
      next: (response) => {
        console.log('Unfollow response:', response);
        if (response.success) {
          console.log('User unfollowed successfully');
          // Refresh following status for all users
          this.refreshFollowingStatus();
        } else {
          console.error('Unfollow failed:', response.message);
          this.error.set(response.message || 'Failed to unfollow user');
        }

        // Remove from following set
        const currentFollowing = this.followingUsers();
        currentFollowing.delete(user._id);
        this.followingUsers.set(new Set(currentFollowing));
      },
      error: (err) => {
        console.error('Unfollow error:', err);
        this.error.set(err.error?.message || err.message || 'Failed to unfollow user');

        // Remove from following set on error
        const currentFollowing = this.followingUsers();
        currentFollowing.delete(user._id);
        this.followingUsers.set(new Set(currentFollowing));
      }
    });
  }

  isFollowing(user: PeopleUser): boolean {
    const currentUser = this.authService.user();
    const following = currentUser?.following || [];
    const isFollowing = following.includes(user._id);
    console.log(`Checking if following ${user.username}:`, isFollowing, 'Following list:', following);
    return isFollowing;
  }

  refreshFollowingStatus(): void {
    // Refresh following status for all users in results
    const updatedResults = this.results().map(user => ({
      ...user,
      isFollowing: this.isFollowing(user) // Use local auth service state
    }));
    this.results.set(updatedResults);
    console.log('Refreshed following status for all users');
  }
}


