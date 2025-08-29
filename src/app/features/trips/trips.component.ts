import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TripService, TripConstants } from '../../services/trip.service';
import { environment } from '../../../environments/environment';
import { GoogleMapsService, PlaceResult } from '../../services/google-maps.service';

/**
 * Interfaces for Trip Planner Module
 *
 * These interfaces match the expected data structure from the backend
 *
 * DEVELOPER NOTE:
 * Backend Routes to implement:
 * - GET /api/trips - Get all trips for current user
 * - GET /api/trips/:id - Get specific trip details
 * - POST /api/trips - Create a new trip
 * - PUT /api/trips/:id - Update trip details
 * - DELETE /api/trips/:id - Delete a trip
 * - GET /api/trips/:id/collaborators - Get trip collaborators
 * - POST /api/trips/:id/collaborators - Add collaborator to trip
 * - DELETE /api/trips/:id/collaborators/:userId - Remove collaborator
 */

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ItineraryItem {
  id: string;
  day: number;
  date: string;
  location: string;
  title: string;
  notes: string;
  startTime?: string;
  endTime?: string;
}

interface Collaborator {
  id: string;
  username: string;
  profilePic: string;
  role: 'owner' | 'editor';
}

interface Trip {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  isPublic: boolean;
  destination: string;
  itinerary: ItineraryItem[];
  checklist: ChecklistItem[];
  collaborators: Collaborator[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Trip Planner Component
 *
 * This component allows users to create, view, and manage their trips.
 * It includes features for itinerary planning, checklists, and collaborator management.
 */
@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './trips.component.html',
  styleUrl: './trips.component.css'
})
export class TripsComponent {
  private tripService = inject(TripService);
  private googleMaps = inject(GoogleMapsService);
  // Active tab for navigation
  activeTab = signal<'upcoming' | 'past' | 'all' | 'requested'>('upcoming');

  // View mode for trips display
  viewMode = signal<'grid' | 'list'>('grid');

  // Trips from backend (initial mock data shown while wiring; overwritten after fetch)
  trips = signal<any[]>([]);

  // Requested trips (trips the user has requested to join)
  requestedTrips = signal<any[]>([]);

  loading = signal<boolean>(false);
  error = signal<string>('');

  // Create trip modal state
  modalOpen = signal<boolean>(false);
  newTripTitle = signal<string>('');
  newTripDestination = signal<string>('');
  newTripStartDate = signal<string>('');
  newTripEndDate = signal<string>('');
  newTripDescription = signal<string>('');
  newTripIsPublic = signal<boolean>(false);
  newTripMaxMembers = signal<number>(10);
  newTripType = signal<string>('');
  newTripInterests = signal<string[]>([]);
  newTripCoverImage = signal<File | null>(null);
  coverImagePreview = signal<string | null>(null);

  // Trip constants
  tripConstants = signal<TripConstants | null>(null);

  // Destination suggestions (Google Places API)
  destSuggestions = signal<PlaceResult[]>([]);
  destSuggestOpen = signal<boolean>(false);
  private destDebounce: any = null;
  selectedDestinationPlace = signal<PlaceResult | null>(null);

  constructor() {
    this.fetchTrips();
    this.fetchRequestedTrips();
    this.loadTripConstants();
  }

  fetchTrips(): void {
    this.loading.set(true);
    this.error.set('');
    this.tripService.listMine().subscribe({
      next: (res) => {
        if (res.success) {
          this.trips.set(res.data.trips || []);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Trips load error:', err);
        this.error.set('Failed to load trips');
        this.loading.set(false);
      }
    });
  }

  fetchRequestedTrips(): void {
    this.tripService.getRequestedTrips().subscribe({
      next: (res) => {
        if (res.success) {
          this.requestedTrips.set(res.data.trips || []);
        }
      },
      error: (err) => {
        console.error('Requested trips load error:', err);
      }
    });
  }

  cancelJoinRequest(tripId: string): void {
    if (confirm('Are you sure you want to cancel your join request for this trip?')) {
      // For now, we'll just remove it from the local state
      // In a full implementation, you'd want to call an API to cancel the request
      this.requestedTrips.update(trips => trips.filter(trip => trip._id !== tripId));
    }
  }

  loadTripConstants(): void {
    this.tripService.getConstants().subscribe({
      next: (res) => {
        if (res.success) {
          this.tripConstants.set(res.data);
        }
      },
      error: (err) => {
        console.error('Failed to load trip constants:', err);
      }
    });
  }

  // Computed properties for filtering trips
  upcomingTrips = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.trips().filter(trip => trip.startDate >= today);
  });

  pastTrips = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.trips().filter(trip => trip.endDate < today);
  });

  // Display trips based on active tab
  displayedTrips = computed(() => {
    switch (this.activeTab()) {
      case 'upcoming': return this.upcomingTrips();
      case 'past': return this.pastTrips();
      case 'all': return this.trips();
      case 'requested': return this.requestedTrips();
      default: return this.trips();
    }
  });

  // Set active tab
  setActiveTab(tab: 'upcoming' | 'past' | 'all' | 'requested'): void {
    this.activeTab.set(tab);
  }

  // Toggle view mode
  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  openCreateModal(): void { this.modalOpen.set(true); }
  closeCreateModal(): void { this.modalOpen.set(false); }

  async submitCreateTrip(): Promise<void> {
    if (!this.newTripTitle().trim() || !this.newTripDestination().trim() || !this.newTripStartDate() || !this.newTripEndDate() || !this.newTripType()) {
      this.error.set('Please fill out title, destination, dates, and trip type');
      return;
    }

    // Prepare destination data
    let selectedPlace = this.selectedDestinationPlace();
    const coverImage = this.newTripCoverImage();

    // If no place is selected but destination is provided, try to get coordinates
    if (!selectedPlace && this.newTripDestination().trim()) {
      console.log('🔍 No place selected, attempting to fetch coordinates for:', this.newTripDestination().trim());
      try {
        const results = await this.googleMaps.searchPlacesNew(this.newTripDestination().trim());
        if (results && results.length > 0) {
          selectedPlace = results[0]; // Use the first result
          console.log('✅ Found coordinates for destination:', selectedPlace);
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch coordinates for destination:', error);
      }
    }

    // Use FormData if there's a cover image, otherwise use JSON
    if (coverImage) {
      const formData = new FormData();
      formData.append('tripName', this.newTripTitle().trim());
      formData.append('destination', this.newTripDestination().trim());
      formData.append('startDate', this.newTripStartDate());
      formData.append('endDate', this.newTripEndDate());
      formData.append('description', this.newTripDescription().trim());
      formData.append('isPublic', this.newTripIsPublic().toString());
      formData.append('maxMembers', this.newTripMaxMembers().toString());
      formData.append('tripType', this.newTripType());
      formData.append('interests', JSON.stringify(this.newTripInterests()));
      formData.append('coverImage', coverImage);

      if (selectedPlace?.location) {
        formData.append('destinationCoordinates', JSON.stringify(selectedPlace.location));
      }
      if (selectedPlace?.placeId) {
        formData.append('destinationPlaceId', selectedPlace.placeId);
      }

      this.loading.set(true);
      this.tripService.createWithFormData(formData).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            this.resetCreateForm();
            this.closeCreateModal();
            this.fetchTrips();
          } else {
            this.error.set('Failed to create trip');
          }
        },
        error: (err) => {
          console.error('Create trip error:', err);
          this.error.set('Failed to create trip');
          this.loading.set(false);
        }
      });
    } else {
      const body = {
        tripName: this.newTripTitle().trim(),
        destination: this.newTripDestination().trim(),
        destinationCoordinates: selectedPlace?.location || null,
        destinationPlaceId: selectedPlace?.placeId || null,
        startDate: this.newTripStartDate(),
        endDate: this.newTripEndDate(),
        description: this.newTripDescription().trim(),
        isPublic: this.newTripIsPublic(),
        maxMembers: this.newTripMaxMembers(),
        tripType: this.newTripType(),
        interests: this.newTripInterests()
      } as any;

      this.loading.set(true);
      this.tripService.create(body).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            this.resetCreateForm();
            this.closeCreateModal();
            this.fetchTrips();
          } else {
            this.error.set('Failed to create trip');
          }
        },
        error: (err) => {
          console.error('Create trip error:', err);
          this.error.set('Failed to create trip');
          this.loading.set(false);
        }
      });
    }
  }

  resetCreateForm(): void {
    this.newTripTitle.set('');
    this.newTripDestination.set('');
    this.newTripStartDate.set('');
    this.newTripEndDate.set('');
    this.newTripDescription.set('');
    this.newTripIsPublic.set(false);
    this.newTripMaxMembers.set(10);
    this.newTripType.set('');
    this.newTripInterests.set([]);
    this.newTripCoverImage.set(null);
    this.coverImagePreview.set(null);
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);
    this.selectedDestinationPlace.set(null);

    // Clear file input
    const fileInput = document.getElementById('coverImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Update an existing trip
   *
   * DEVELOPER NOTE:
   * This will call PUT /api/trips/:id with the updated trip data
   * The backend should validate the data and update the trip
   */
  updateTrip(tripId: string, tripData: Partial<Trip>): void {
    console.log(`Updating trip ${tripId}:`, tripData);
    // Implementation will connect to backend API
  }

  /**
   * Delete a trip
   */
  deleteTrip(tripId: string): void {
    if (!tripId) return;
    this.loading.set(true);
    this.tripService.delete(tripId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.fetchTrips();
        }
      },
      error: (err) => {
        console.error('Delete trip error:', err);
        this.loading.set(false);
      }
    });
  }

  /**
   * Helper method to count completed tasks in a trip's checklist
   * @param trip The trip object
   * @returns Number of completed tasks
   */
  getCompletedTasksCount(trip: any): number {
    return Array.isArray(trip.checklist) ? trip.checklist.filter((item: any) => item.isDone || item.completed).length : 0;
  }

  getCoverImage(trip: any): string {
    const cover = trip.coverImage;
    if (!cover) return '';
    if (typeof cover === 'string' && (cover.startsWith('http') || cover.startsWith('data:'))) return cover;
    if (typeof cover === 'string' && cover.startsWith('/')) return `${environment.backendUrl}${cover}`;
    return '';
  }

  hasCoverImage(trip: any): boolean {
    return !!trip.coverImage;
  }

  // Destination autocomplete behaviors
  onDestinationInputChange(value: string): void {
    this.newTripDestination.set(value);

    // Clear selection if user types something different from selected place
    const selectedPlace = this.selectedDestinationPlace();
    if (selectedPlace && value !== selectedPlace.name) {
      this.selectedDestinationPlace.set(null);
    }

    const query = value.trim();
    if (this.destDebounce) clearTimeout(this.destDebounce);
    if (query.length < 3) {
      this.destSuggestions.set([]);
      this.destSuggestOpen.set(false);
      return;
    }
    this.destDebounce = setTimeout(async () => {
      try {
        const results = await this.googleMaps.searchPlacesNew(query);
        this.destSuggestions.set(results);
        this.destSuggestOpen.set(results.length > 0);
      } catch {
        this.destSuggestions.set([]);
        this.destSuggestOpen.set(false);
      }
    }, 350);
  }

  selectDestinationSuggestion(place: PlaceResult): void {
    this.newTripDestination.set(place.name);
    this.selectedDestinationPlace.set(place);
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);
  }

  clearDestinationSelection(): void {
    this.newTripDestination.set('');
    this.selectedDestinationPlace.set(null);
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);
  }

  // Cover image handling
  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      this.newTripCoverImage.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverImagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage(): void {
    this.newTripCoverImage.set(null);
    this.coverImagePreview.set(null);

    // Clear the file input
    const fileInput = document.getElementById('coverImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('coverImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Interest management methods
  toggleInterest(interest: string): void {
    const currentInterests = this.newTripInterests();
    const index = currentInterests.indexOf(interest);

    if (index === -1) {
      // Add interest (max 5)
      if (currentInterests.length < 5) {
        this.newTripInterests.set([...currentInterests, interest]);
      }
    } else {
      // Remove interest
      this.newTripInterests.set(currentInterests.filter(i => i !== interest));
    }
  }

  isInterestSelected(interest: string): boolean {
    return this.newTripInterests().includes(interest);
  }

  canAddMoreInterests(): boolean {
    return this.newTripInterests().length < 5;
  }

  formatInterestDisplay(interest: string): string {
    return interest.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' & ');
  }

  /**
   * Add an itinerary item to a trip
   *
   * DEVELOPER NOTE:
   * This will call POST /api/trips/:id/itinerary
   * The backend should add the item to the trip's itinerary array
   */
  addItineraryItem(tripId: string, item: Partial<ItineraryItem>): void {
    console.log(`Adding itinerary item to trip ${tripId}:`, item);
    // Implementation will connect to backend API
  }

  /**
   * Update an itinerary item
   *
   * DEVELOPER NOTE:
   * This will call PUT /api/trips/:id/itinerary/:itemId
   * The backend should update the specific itinerary item
   */
  updateItineraryItem(tripId: string, itemId: string, item: Partial<ItineraryItem>): void {
    console.log(`Updating itinerary item ${itemId} in trip ${tripId}:`, item);
    // Implementation will connect to backend API
  }

  /**
   * Delete an itinerary item
   *
   * DEVELOPER NOTE:
   * This will call DELETE /api/trips/:id/itinerary/:itemId
   * The backend should remove the item from the trip's itinerary array
   */
  deleteItineraryItem(tripId: string, itemId: string): void {
    console.log(`Deleting itinerary item ${itemId} from trip ${tripId}`);
    // Implementation will connect to backend API
  }

  /**
   * Add a checklist item to a trip
   *
   * DEVELOPER NOTE:
   * This will call POST /api/trips/:id/checklist
   * The backend should add the item to the trip's checklist array
   */
  addChecklistItem(tripId: string, item: Partial<ChecklistItem>): void {
    console.log(`Adding checklist item to trip ${tripId}:`, item);
    // Implementation will connect to backend API
  }

  /**
   * Toggle checklist item completion
   *
   * DEVELOPER NOTE:
   * This will call PATCH /api/trips/:id/checklist/:itemId
   * The backend should toggle the completed status of the item
   */
  toggleChecklistItem(tripId: string, itemId: string, completed: boolean): void {
    console.log(`Toggling checklist item ${itemId} in trip ${tripId} to ${completed}`);
    // Implementation will connect to backend API
  }

  /**
   * Remove a collaborator from a trip
   *
   * DEVELOPER NOTE:
   * This will call DELETE /api/trips/:id/collaborators/:userId
   * The backend should:
   * 1. Check if the requesting user has permission
   * 2. Remove the user from the trip's collaborators array
   */
  removeCollaborator(tripId: string, userId: string): void {
    console.log(`Removing user ${userId} from trip ${tripId}`);
    // Implementation will connect to backend API
  }
}
