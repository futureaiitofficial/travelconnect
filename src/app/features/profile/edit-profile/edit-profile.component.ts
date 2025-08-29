import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProfileService, ProfileUser } from '../../../services/profile.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css'
})
export class EditProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Form fields
  firstName = signal<string>('');
  lastName = signal<string>('');
  displayName = signal<string>('');
  username = signal<string>('');
  bio = signal<string>('');
  avatarUrl = signal<string>('assets/images/avatar-placeholder.jpg');
  coverUrl = signal<string>('assets/images/trip-placeholder.jpg');
  newInterest = signal<string>('');
  interests = signal<string[]>([]);

  // UI state
  saving = signal<boolean>(false);
  uploadingAvatar = signal<boolean>(false);
  uploadingCover = signal<boolean>(false);
  error = signal<string>('');

  // Original user data for comparison
  private originalUser: ProfileUser | null = null;

  ngOnInit(): void {
    this.loadCurrentUserProfile();
  }

  /**
   * Load current user's profile data
   */
  private loadCurrentUserProfile(): void {
    const currentUser = this.authService.user();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.profileService.getUserProfile(currentUser.username).subscribe({
      next: (response) => {
        if (response.success) {
          this.originalUser = response.data.user;
          this.populateForm(response.data.user);
        }
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.error.set('Failed to load profile data');
      }
    });
  }

  /**
   * Populate form with user data
   */
  private populateForm(user: ProfileUser): void {
    this.firstName.set(user.firstName || '');
    this.lastName.set(user.lastName || '');
    this.displayName.set(user.fullName || user.displayName || '');
    this.username.set(user.username || '');
    this.bio.set(user.bio || '');
    this.avatarUrl.set(this.profileService.getProfilePictureUrl(user));
    this.coverUrl.set(this.profileService.getCoverImageUrl(user));
    this.interests.set(user.interests ? [...user.interests] : []);
  }

  /**
   * Handle avatar file selection and upload
   */
  handleAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select a valid image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    this.avatarUrl.set(url);

    // Upload file
    this.uploadingAvatar.set(true);
    this.error.set('');

    this.profileService.uploadAvatar(file).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.user) {
          this.avatarUrl.set(this.profileService.getProfilePictureUrl(response.data.user));
          // Update original user reference
          this.originalUser = response.data.user;
        }
        this.uploadingAvatar.set(false);
      },
      error: (error) => {
        console.error('Error uploading avatar:', error);
        this.error.set(error.message || 'Failed to upload avatar');
        this.uploadingAvatar.set(false);
        // Revert to original avatar
        if (this.originalUser) {
          this.avatarUrl.set(this.profileService.getProfilePictureUrl(this.originalUser));
        }
      }
    });
  }

  /**
   * Handle cover image file selection and upload
   */
  handleCoverChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error.set('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit for cover images)
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Image size must be less than 10MB');
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    this.coverUrl.set(url);

    // Upload file
    this.uploadingCover.set(true);
    this.error.set('');

    this.profileService.uploadCover(file).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.user) {
          this.coverUrl.set(this.profileService.getCoverImageUrl(response.data.user));
          // Update original user reference
          this.originalUser = response.data.user;
        }
        this.uploadingCover.set(false);
      },
      error: (error) => {
        console.error('Error uploading cover:', error);
        this.error.set(error.message || 'Failed to upload cover image');
        this.uploadingCover.set(false);
        // Revert to original cover
        if (this.originalUser) {
          this.coverUrl.set(this.profileService.getCoverImageUrl(this.originalUser));
        }
      }
    });
  }

  /**
   * Add new interest to the list
   */
  addInterest(): void {
    const value = this.newInterest().trim();
    if (!value) return;
    if (!this.interests().includes(value)) {
      this.interests.update(list => [...list, value]);
    }
    this.newInterest.set('');
  }

  /**
   * Remove interest from the list
   */
  removeInterest(tag: string): void {
    this.interests.update(list => list.filter(i => i !== tag));
  }

  /**
   * Save profile changes
   */
  save(): void {
    this.saving.set(true);
    this.error.set('');

    const updateData = {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      fullName: this.displayName().trim(),
      bio: this.bio().trim(),
      interests: this.interests()
    };

    this.profileService.updateProfile(updateData).subscribe({
      next: (response) => {
        if (response.success) {
          // Update original user reference
          this.originalUser = response.data;
          // Navigate back to profile
          this.router.navigate(['/profile']);
        } else {
          this.error.set('Failed to save profile');
        }
        this.saving.set(false);
      },
      error: (error) => {
        console.error('Error saving profile:', error);
        this.error.set(error.message || 'Failed to save profile');
        this.saving.set(false);
      }
    });
  }

  /**
   * Cancel editing and navigate back
   */
  cancel(): void {
    this.router.navigate(['/profile']);
  }
}


