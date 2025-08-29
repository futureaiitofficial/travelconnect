import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PostService, CreatePostData, PostLocation } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';
import { GoogleMapsService, PlaceResult } from '../../services/google-maps.service';

interface SelectedMedia {
  id: string;
  file: File;
  url: string;
  type: 'image' | 'video';
}

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit, AfterViewInit {
  @ViewChild('locationInput', { static: false }) locationInput!: ElementRef<HTMLInputElement>;

  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleMapsService = inject(GoogleMapsService);

  caption = signal<string>('');
  location = signal<string>('');
  visibility = signal<'public' | 'private'>('public');
  pending = signal<boolean>(false);
  hashtags = signal<string[]>([]);
  newHashtag = signal<string>('');
  selectedMedia = signal<SelectedMedia[]>([]);
  error = signal<string>('');
  locationCoords = signal<PostLocation | null>(null);
  isLoadingLocation = signal<boolean>(false);
  selectedPlace = signal<PlaceResult | null>(null);
  suggestions = signal<PlaceResult[]>([]);
  suggestionsOpen = signal<boolean>(false);
  private locationSearchDebounce: any = null;

  charCount = computed(() => this.caption().length);
  canPost = computed(() => this.caption().trim().length > 0 || this.selectedMedia().length > 0);

  ngOnInit(): void {
    // Check if user is authenticated
    const user = this.authService.user();
    if (!user) {
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewInit(): void {
    // Autocomplete handled manually with inline suggestions
  }

  /**
   * Initialize Google Maps autocomplete for location input
   */
  private async initializeLocationAutocomplete(): Promise<void> {
    // No-op: using REST Places with custom suggestions UI
  }

  /**
   * Handle place selection from autocomplete
   */
  private onPlaceSelected(place: PlaceResult): void {
    this.selectedPlace.set(place);
    this.location.set(place.name);
    this.locationCoords.set({
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng
    });
    this.error.set(''); // Clear any previous errors
    this.suggestions.set([]);
    this.suggestionsOpen.set(false);
  }

  handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    const files = Array.from(event.dataTransfer.files || []);
    this.addFiles(files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  addFiles(files: File[]) {
    const next: SelectedMedia[] = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        this.error.set('Only image and video files are allowed');
        continue;
      }

      // Validate file size (50MB for videos, 10MB for images)
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.error.set(`File size too large. Max: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`);
        continue;
      }

      const type = file.type.startsWith('video') ? 'video' : 'image';
      const url = URL.createObjectURL(file);
      next.push({ id: `${Date.now()}-${file.name}`, file, url, type });
    }

    // Check total media limit
    const totalMedia = this.selectedMedia().length + next.length;
    if (totalMedia > 10) {
      this.error.set('Maximum 10 media files allowed per post');
      return;
    }

    this.selectedMedia.update(list => [...list, ...next]);
    this.error.set(''); // Clear error on successful add
  }

  removeMedia(id: string) {
    const item = this.selectedMedia().find(m => m.id === id);
    if (item) URL.revokeObjectURL(item.url);
    this.selectedMedia.update(list => list.filter(m => m.id !== id));
  }

  addHashtagFromInput() {
    const tag = this.newHashtag().trim().replace(/^#/, '');
    if (!tag) return;
    if (!this.hashtags().includes(tag)) {
      this.hashtags.update(arr => [...arr, tag]);
    }
    this.newHashtag.set('');
  }

  removeHashtag(tag: string) {
    this.hashtags.update(arr => arr.filter(t => t !== tag));
  }

  async submit() {
    if (!this.canPost()) return;

    this.pending.set(true);
    this.error.set('');

    try {
      // Prepare post data
      const postData: CreatePostData = {
        caption: this.caption().trim(),
        isPublic: this.visibility() === 'public'
      };

      // Add location if provided
      if (this.locationCoords()) {
        postData.location = this.locationCoords()!;
      } else if (this.location().trim()) {
        postData.location = { name: this.location().trim() };
      }

      // Get media files
      const mediaFiles = this.selectedMedia().map(media => media.file);

      // Submit post
      this.postService.createPost(postData, mediaFiles).subscribe({
        next: (response) => {
          if (response.success) {
            // Reset form
            this.resetForm();
            // Navigate to feed or the new post
            this.router.navigate(['/feed']);
          } else {
            this.error.set(response.message || 'Failed to create post');
          }
          this.pending.set(false);
        },
        error: (error) => {
          console.error('Error creating post:', error);
          this.error.set(error.message || 'Failed to create post');
          this.pending.set(false);
        }
      });

    } catch (error: any) {
      console.error('Error preparing post:', error);
      this.error.set('Failed to prepare post data');
      this.pending.set(false);
    }
  }

  /**
   * Reset form to initial state
   */
  private resetForm() {
    this.caption.set('');
    this.location.set('');
    this.visibility.set('public');
    this.hashtags.set([]);
    this.newHashtag.set('');
    this.error.set('');
    this.locationCoords.set(null);

    // Clean up media files
    this.selectedMedia().forEach(m => URL.revokeObjectURL(m.url));
    this.selectedMedia.set([]);
  }

  /**
   * Get current location using Google Maps service with reverse geocoding
   */
  async getCurrentLocation(): Promise<void> {
    this.isLoadingLocation.set(true);
    this.error.set('');

    try {
      // Get current coordinates
      const coordinates = await this.googleMapsService.getCurrentLocation();

      // Reverse geocode to get address
      const place = await this.googleMapsService.reverseGeocode(
        coordinates.lat,
        coordinates.lng
      );

      if (place) {
        this.selectedPlace.set(place);
        this.location.set(place.name);
        this.locationCoords.set({
          name: place.name,
          lat: place.location.lat,
          lng: place.location.lng
        });
      } else {
        // Fallback to coordinates only
        this.locationCoords.set({
          name: 'Current Location',
          lat: coordinates.lat,
          lng: coordinates.lng
        });
        this.location.set('Current Location');
      }

    } catch (error: any) {
      console.error('Get current location error:', error);
      this.error.set(error.message || 'Failed to get current location');
    } finally {
      this.isLoadingLocation.set(false);
    }
  }

  /**
   * Handle manual location search when user presses Enter
   */
  handleLocationSearch(): void {
    const locationName = this.location().trim();
    if (locationName) {
      // For manual entry, just use the location name without coordinates
      this.locationCoords.set({
        name: locationName
      });
      this.selectedPlace.set(null);
      this.suggestions.set([]);
      this.suggestionsOpen.set(false);
    }
  }

  /**
   * Clear location selection
   */
  clearLocation(): void {
    this.location.set('');
    this.locationCoords.set(null);
    this.selectedPlace.set(null);
    if (this.locationInput?.nativeElement) {
      this.locationInput.nativeElement.value = '';
    }
    this.suggestions.set([]);
    this.suggestionsOpen.set(false);
  }

  onLocationInputChange(value: string): void {
    this.location.set(value);
    const query = value.trim();
    if (this.locationSearchDebounce) clearTimeout(this.locationSearchDebounce);
    if (query.length < 3) {
      this.suggestions.set([]);
      this.suggestionsOpen.set(false);
      return;
    }
    this.locationSearchDebounce = setTimeout(async () => {
      try {
        const results = await this.googleMapsService.searchPlacesNew(query);
        this.suggestions.set(results);
        this.suggestionsOpen.set(results.length > 0);
      } catch {
        this.suggestions.set([]);
        this.suggestionsOpen.set(false);
      }
    }, 400);
  }

  selectSuggestion(place: PlaceResult): void {
    this.onPlaceSelected(place);
  }
}


