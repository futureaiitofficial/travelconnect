import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TripService } from '../../../services/trip.service';
import { AuthService } from '../../../services/auth.service';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { environment } from '../../../../environments/environment';

interface User {
  _id: string; // Changed from id to _id to match backend format
  username: string;
  fullName: string;
  profilePicture?: string;
  email?: string;
  // For backward compatibility with existing code
  id?: string;
}

interface ChecklistItem {
  _id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface ItineraryItem {
  _id: string;
  day: number;
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  location: string;
  notes?: string;
  createdAt: string;
}

interface Collaborator {
  user: User;
  role: 'viewer' | 'editor' | 'admin';
  addedAt: string;
}

interface JoinRequest {
  user: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  requestedAt: string;
}

interface Trip {
  _id: string;
  tripName: string;
  description: string;
  destination: string;
  destinationCoordinates?: { lat: number; lng: number };
  destinationPlaceId?: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  isPublic: boolean;
  maxMembers: number;
  tripType: string;
  interests: string[];

  createdBy: User;
  members: User[];
  collaborators: Collaborator[];
  itinerary: ItineraryItem[];
  checklist: ChecklistItem[];
  joinRequests: JoinRequest[];
  shareCode: string;

  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './trip-details.component.html',
  styleUrl: './trip-details.component.css'
})
export class TripDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private googleMaps = inject(GoogleMapsService);

  // Core state
  tripId = signal<string>('');
  trip = signal<Trip | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // UI state
  activeTab = signal<'overview' | 'itinerary' | 'checklist' | 'members' | 'settings'>('overview');

  // Edit mode states
  isEditingTrip = signal<boolean>(false);
  isEditingItinerary = signal<boolean>(false);

  // Form states
  newChecklistItem = signal<string>('');
  newItineraryItem = signal<Partial<ItineraryItem>>({});
  selectedDay = signal<number>(1);
  togglingItems = signal<Set<string>>(new Set());

  // Modals and UI
  showDeleteModal = signal<boolean>(false);
  showShareModal = signal<boolean>(false);
  showInviteModal = signal<boolean>(false);
  showItineraryModal = signal<boolean>(false);
  editingItineraryId = signal<string | null>(null);

  // Edit trip form
  editForm = signal({
    tripName: '',
    description: '',
    destination: '',
    startDate: '',
    endDate: '',
    isPublic: false,
    maxMembers: 10,
    tripType: '',
    interests: [] as string[]
  });

  // User search for invitations
  userSearchQuery = signal<string>('');
  searchResults = signal<User[]>([]);
  searchLoading = signal<boolean>(false);



  // Computed properties
  currentUser = computed(() => {
    // Get current user from auth service
    const userStr = localStorage.getItem('travelconnect_user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // Join request processing state
  processingJoinRequests = signal<Set<string>>(new Set());
  isOwner = computed(() => {
    const user = this.currentUser();
    const trip = this.trip();
    return user && trip && user.id === trip.createdBy.id;
  });

  canEdit = computed(() => {
    const user = this.currentUser();
    const trip = this.trip();
    if (!user || !trip) return false;

    // Owner can always edit
    if (this.isOwner()) return true;

    // Check if user is a collaborator with edit permissions
    const collaboration = trip.collaborators.find(c => c.user.id === user.id);
    return collaboration && (collaboration.role === 'editor' || collaboration.role === 'admin');
  });

  tripDays = computed(() => {
    const trip = this.trip();
    if (!trip) return [];

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const days = [];

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < diffDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        day: i + 1,
        date: date.toISOString().split('T')[0],
        formattedDate: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
    }

    return days;
  });

  completedChecklistItems = computed(() => {
    const trip = this.trip();
    if (!trip) return 0;
    return trip.checklist.filter(item => item.completed).length;
  });

  checklistProgress = computed(() => {
    const trip = this.trip();
    if (!trip || !trip.checklist.length) return 0;
    const completed = trip.checklist.filter((item: any) => item.completed).length;
    return Math.round((completed / trip.checklist.length) * 100);
  });



  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tripId.set(id);
        this.fetchTripDetails(id);
      } else {
        this.router.navigate(['/trips']);
      }
    });
  }

  fetchTripDetails(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    console.log('Fetching trip details for ID:', id);

    this.tripService.getById(id).subscribe({
      next: (response) => {
        console.log('Trip API response:', response);

        if (response.success) {
          // Map the response data to our Trip interface
          const tripData = response.data;
          console.log('Trip data from backend:', tripData);

          const mappedTrip: Trip = {
            _id: tripData._id || id,
            tripName: tripData.tripName || 'Untitled Trip',
            description: tripData.description || '',
            destination: tripData.destination || '',
            destinationCoordinates: tripData.destinationCoordinates,
            destinationPlaceId: tripData.destinationPlaceId,
            startDate: tripData.startDate || '',
            endDate: tripData.endDate || '',
            coverImage: tripData.coverImage,
            isPublic: tripData.isPublic || false,
            maxMembers: tripData.maxMembers || 10,
            tripType: tripData.tripType || 'group',
            interests: tripData.interests || [],

            createdBy: tripData.createdBy || {
              _id: 'unknown',
              id: 'unknown', // For backward compatibility
              username: 'unknown',
              fullName: 'Unknown User',
              profilePicture: '/assets/images/avatars/user.svg'
            },
            members: tripData.members || [],
            collaborators: tripData.collaborators || [],
            itinerary: tripData.itinerary || [],
            checklist: (tripData.checklist || []).map((item: any) => ({
              _id: item._id,
              text: item.item, // Backend uses 'item' for text content
              completed: item.isDone, // Backend uses 'isDone' for completed status
              createdAt: item.addedAt || item.createdAt || new Date().toISOString()
            })),
            joinRequests: tripData.joinRequests || [],
            shareCode: tripData.shareCode || '',

            createdAt: tripData.createdAt || new Date().toISOString(),
            updatedAt: tripData.updatedAt || new Date().toISOString()
          };

          console.log('Mapped trip data:', mappedTrip);
          console.log('Checklist from backend:', tripData.checklist);
          console.log('Mapped checklist:', mappedTrip.checklist);
          this.trip.set(mappedTrip);
          this.initializeEditForm();
        } else {
          console.error('API returned success: false', response);
          this.error.set('Failed to load trip details');
        }
        this.isLoading.set(false);
      },
            error: (err) => {
        console.error('Error fetching trip:', err);

        // Provide more specific error messages
        if (err.status === 404) {
          this.error.set('Trip not found. It may have been deleted or you don\'t have access to it.');
        } else if (err.status === 403) {
          this.error.set('Access denied. This trip is private.');
        } else if (err.status === 500 && err.error?.message?.includes('ObjectId')) {
          this.error.set('Invalid trip ID format. Please navigate to this trip from the trips list.');
        } else if (err.status === 0) {
          this.error.set('Cannot connect to server. Please check if the backend is running.');
        } else {
          this.error.set(`Failed to load trip details (Error ${err.status})`);
        }

      this.isLoading.set(false);
      }
    });
  }

      initializeEditForm(): void {
    const trip = this.trip();
    if (!trip) return;

    this.editForm.set({
      tripName: trip.tripName || '',
      description: trip.description || '',
      destination: trip.destination || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      isPublic: trip.isPublic || false,
      maxMembers: trip.maxMembers || 10,
      tripType: trip.tripType || 'group',
      interests: trip.interests ? [...trip.interests] : []
    });
  }

  updateEditForm(field: string, value: any): void {
    this.editForm.update(form => ({ ...form, [field]: value }));
  }

  updateItineraryItem(field: string, value: any): void {
    this.newItineraryItem.update(item => ({ ...item, [field]: value }));
  }

  // Tab navigation
  setActiveTab(tab: 'overview' | 'itinerary' | 'checklist' | 'members' | 'settings'): void {
    this.activeTab.set(tab);
  }

  // Trip editing
  startEditingTrip(): void {
    this.isEditingTrip.set(true);
    this.initializeEditForm();
    // Clear destination suggestions
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);
    this.selectedDestinationPlace.set(null);
  }

  cancelEditingTrip(): void {
    this.isEditingTrip.set(false);
    this.initializeEditForm();
    // Clear destination suggestions
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);
    this.selectedDestinationPlace.set(null);
  }

  saveTrip(): void {
    const tripId = this.tripId();
    const formData = this.editForm();

    console.log('Saving trip:', tripId, formData);

    this.tripService.update(tripId, formData as any).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Trip updated successfully:', response.data);
          // Update the current trip with the new data
          this.fetchTripDetails(tripId);
          this.isEditingTrip.set(false);
        } else {
          console.error('Failed to update trip:', response);
          this.error.set('Failed to save trip changes');
        }
      },
      error: (err) => {
        console.error('Error updating trip:', err);
        this.error.set('Failed to save trip changes');
      }
    });
  }

  // Checklist management
  addChecklistItem(): void {
    const text = this.newChecklistItem().trim();
    if (!text || !this.tripId()) return;

    console.log('Adding checklist item:', text);

    this.tripService.addChecklist(this.tripId(), { item: text }).subscribe({
      next: (response) => {
        console.log('Checklist API response:', response);
        if (response.success) {
          console.log('Checklist item added successfully');
          console.log('Updated checklist data:', response.data);

          // Update local state immediately for better UX
          const currentTrip = this.trip();
          if (currentTrip && response.data) {
            const mappedChecklist = response.data.map((item: any) => ({
              _id: item._id,
              text: item.item, // Backend uses 'item' for text content
              completed: item.isDone, // Backend uses 'isDone' for completed status
              createdAt: item.addedAt || item.createdAt || new Date().toISOString()
            }));
            this.trip.set({ ...currentTrip, checklist: mappedChecklist });
          }

          this.newChecklistItem.set('');
        } else {
          console.error('Failed to add checklist item');
        }
      },
      error: (err) => {
        console.error('Error adding checklist item:', err);
      }
    });
  }

  toggleChecklistItem(itemId: string): void {
    console.log('=== TOGGLE CHECKLIST ITEM CALLED ===');
    console.log('Item ID:', itemId);
    console.log('Current trip state:', this.trip());
    console.log('Toggling checklist item:', itemId);

    // Check authentication
    const token = localStorage.getItem('travelconnect_token');
    console.log('Auth token exists:', !!token);
    console.log('Auth service isLoggedIn:', this.authService.isLoggedIn());
    console.log('Current user:', this.authService.user());

    // Add to toggling set for loading state
    const currentToggling = this.togglingItems();
    currentToggling.add(itemId);
    this.togglingItems.set(new Set(currentToggling));

    // Get current state before toggle for logging
    const currentTrip = this.trip();
    if (currentTrip) {
      const currentItem = currentTrip.checklist.find(item => item._id === itemId);
      console.log('Current item state before toggle:', currentItem);
    }

        // Optimistic update - update UI immediately
    const tripData = this.trip();
    if (tripData) {
      const updatedChecklist = tripData.checklist.map(item =>
        item._id === itemId ? { ...item, completed: !item.completed } : item
      );
      this.trip.set({ ...tripData, checklist: updatedChecklist });
      console.log('Optimistic update completed');
    }

        // Make API call to sync with backend
    console.log('Making API call to sync with backend');

    this.tripService.toggleChecklist(this.tripId(), itemId).subscribe({
      next: (response) => {
        console.log('Toggle API response:', response);
        if (response.success) {
          console.log('Checklist item toggled successfully');

                    // Backend returns the updated item with backend field names
          if (response.data && response.data._id) {
            const currentTrip = this.trip();
            if (currentTrip) {
              const updatedChecklist = currentTrip.checklist.map(item =>
                item._id === itemId ? {
              ...item,
                  // Map backend fields to frontend fields
                  completed: response.data.isDone, // Backend: isDone -> Frontend: completed
                  text: response.data.item // Backend: item -> Frontend: text
                } : item
              );
              this.trip.set({ ...currentTrip, checklist: updatedChecklist });
              console.log('Updated checklist with backend data:', updatedChecklist);
            }
          } else {
            // Fallback: toggle locally if no backend data
            const currentTrip = this.trip();
            if (currentTrip) {
              const updatedChecklist = currentTrip.checklist.map(item =>
                item._id === itemId ? { ...item, completed: !item.completed } : item
              );
              this.trip.set({ ...currentTrip, checklist: updatedChecklist });
              console.log('Locally toggled checklist (fallback):', updatedChecklist);
            }
          }
        } else {
          console.error('Failed to toggle checklist item');
        }

        // Remove from toggling set
        const currentToggling = this.togglingItems();
        currentToggling.delete(itemId);
        this.togglingItems.set(new Set(currentToggling));
      },
            error: (err) => {
        console.error('=== API ERROR ===');
        console.error('Error toggling checklist item:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.error?.message || err.message);
        console.error('Error details:', err.error);

        // On API error, fallback to local toggle
        console.log('Falling back to local toggle due to API error');
        const currentTrip = this.trip();
        if (currentTrip) {
          const updatedChecklist = currentTrip.checklist.map(item =>
            item._id === itemId ? { ...item, completed: !item.completed } : item
          );
          this.trip.set({ ...currentTrip, checklist: updatedChecklist });
          console.log('Local fallback toggle completed');
        }

        // Remove from toggling set on error
        const currentToggling = this.togglingItems();
        currentToggling.delete(itemId);
        this.togglingItems.set(new Set(currentToggling));
      }
    });
  }

  isItemToggling(itemId: string): boolean {
    return this.togglingItems().has(itemId);
  }



  deleteChecklistItem(itemId: string): void {
    console.log('Deleting checklist item:', itemId);

    this.tripService.deleteChecklist(this.tripId(), itemId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Checklist item deleted successfully');
          // Update the local state immediately
          const currentTrip = this.trip();
          if (currentTrip) {
            const updatedChecklist = currentTrip.checklist.filter(item => item._id !== itemId);
            this.trip.set({ ...currentTrip, checklist: updatedChecklist });
          }
        } else {
          console.error('Failed to delete checklist item');
        }
      },
      error: (err) => {
        console.error('Error deleting checklist item:', err);
      }
    });
  }

  // Location suggestions for itinerary
  locationSuggestions = signal<any[]>([]);
  locationSuggestionsOpen = signal<boolean>(false);
  selectedLocation = signal<any>(null);
  locationSearchTimeout: any = null;

  // Location suggestions for trip destination edit
  destSuggestions = signal<any[]>([]);
  destSuggestOpen = signal<boolean>(false);
  selectedDestinationPlace = signal<any>(null);
  destSearchTimeout: any = null;

  // Itinerary management
  openItineraryModal(day?: number): void {
    if (day) this.selectedDay.set(day);
    this.newItineraryItem.set({
      day: this.selectedDay(),
      title: '',
      location: '',
      startTime: '',
      endTime: '',
      notes: ''
    });
    this.selectedLocation.set(null);
    this.locationSuggestions.set([]);
    this.locationSuggestionsOpen.set(false);
    this.editingItineraryId.set(null); // Clear editing state
    this.showItineraryModal.set(true);
  }

  editItineraryItem(item: any): void {
    this.editingItineraryId.set(item._id);
    this.selectedDay.set(item.day);
    this.newItineraryItem.set({
      day: item.day,
      title: item.title,
      location: item.location,
      startTime: item.startTime,
      endTime: item.endTime,
      notes: item.notes
    });
    this.selectedLocation.set(null);
    this.locationSuggestions.set([]);
    this.locationSuggestionsOpen.set(false);
    this.showItineraryModal.set(true);
  }

  closeItineraryModal(): void {
    this.showItineraryModal.set(false);
    this.newItineraryItem.set({});
    this.selectedLocation.set(null);
    this.locationSuggestions.set([]);
    this.locationSuggestionsOpen.set(false);
    this.editingItineraryId.set(null); // Clear editing state
  }

    // Google Places API integration for itinerary locations
  onLocationInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    console.log('Location input changed:', query);

    // Update the form field
    this.updateItineraryItem('location', query);

    // Clear existing timeout
    if (this.locationSearchTimeout) {
      clearTimeout(this.locationSearchTimeout);
    }

    if (query.length < 2) {
      this.locationSuggestions.set([]);
      this.locationSuggestionsOpen.set(false);
      this.selectedLocation.set(null);
      return;
    }

    // Debounce the search to avoid too many API calls
    this.locationSearchTimeout = setTimeout(() => {
      this.searchPlaces(query);
    }, 300);
  }

      async searchPlaces(query: string): Promise<void> {
    console.log('Searching places for:', query);

    try {
      const results = await this.googleMaps.searchPlacesNew(query);
      console.log('Places API results:', results);

      if (results && results.length > 0) {
        this.locationSuggestions.set(results);
        this.locationSuggestionsOpen.set(true);
        console.log('Location suggestions set:', results);
      } else {
        console.log('No places found');
        this.locationSuggestions.set([]);
        this.locationSuggestionsOpen.set(false);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      this.locationSuggestions.set([]);
      this.locationSuggestionsOpen.set(false);
    }
  }

  selectLocationSuggestion(place: any): void {
    this.selectedLocation.set(place);
    this.updateItineraryItem('location', place.displayName?.text || place.name);
    this.locationSuggestions.set([]);
    this.locationSuggestionsOpen.set(false);

    // Show success feedback
    console.log('✅ Location selected:', place.displayName?.text || place.name);
  }

  // Destination search for trip editing
  onDestinationInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    console.log('Destination input changed:', value);

    // Update the form field
    this.updateEditForm('destination', value);

    // Clear selection if user types something different from selected place
    const selectedPlace = this.selectedDestinationPlace();
    if (selectedPlace && value !== selectedPlace.name) {
      this.selectedDestinationPlace.set(null);
    }

    // Clear existing timeout
    if (this.destSearchTimeout) {
      clearTimeout(this.destSearchTimeout);
    }

    if (value.length < 3) {
      this.destSuggestions.set([]);
      this.destSuggestOpen.set(false);
      return;
    }

    // Debounce the search
    this.destSearchTimeout = setTimeout(() => {
      this.searchDestinationPlaces(value);
    }, 300);
  }

  async searchDestinationPlaces(query: string): Promise<void> {
    console.log('Searching destination places for:', query);

    try {
      const results = await this.googleMaps.searchPlacesNew(query);
      console.log('Destination places API results:', results);

      if (results && results.length > 0) {
        this.destSuggestions.set(results);
        this.destSuggestOpen.set(true);
        console.log('Destination suggestions set:', results);
      } else {
        console.log('No destination places found');
        this.destSuggestions.set([]);
        this.destSuggestOpen.set(false);
      }
    } catch (error) {
      console.error('Error searching destination places:', error);
      this.destSuggestions.set([]);
      this.destSuggestOpen.set(false);
    }
  }

  selectDestinationSuggestion(place: any): void {
    this.selectedDestinationPlace.set(place);
    this.updateEditForm('destination', place.displayName?.text || place.name);
    this.destSuggestions.set([]);
    this.destSuggestOpen.set(false);

    // Show success feedback
    console.log('✅ Destination selected:', place.displayName?.text || place.name);
  }

  addItineraryItem(): void {
    const item = this.newItineraryItem();
    if (!item.title || !item.location) return;

    const editingId = this.editingItineraryId();

    if (editingId) {
      // Update existing item
      console.log('Updating itinerary item:', item);
      this.tripService.updateItinerary(this.tripId(), editingId, item).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Itinerary item updated successfully');
            this.fetchTripDetails(this.tripId());
            this.closeItineraryModal();
          } else {
            console.error('Failed to update itinerary item');
          }
        },
        error: (err) => {
          console.error('Error updating itinerary item:', err);
        }
      });
    } else {
      // Add new item
      console.log('Adding itinerary item:', item);
      this.tripService.addItinerary(this.tripId(), item).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Itinerary item added successfully');
            this.fetchTripDetails(this.tripId());
            this.closeItineraryModal();
          } else {
            console.error('Failed to add itinerary item');
          }
        },
        error: (err) => {
          console.error('Error adding itinerary item:', err);
        }
      });
    }
  }

  deleteItineraryItem(itemId: string): void {
    console.log('Deleting itinerary item:', itemId);

    this.tripService.deleteItinerary(this.tripId(), itemId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Itinerary item deleted successfully');
          // Update local state immediately
          const currentTrip = this.trip();
          if (currentTrip) {
            const updatedItinerary = currentTrip.itinerary.filter(item => item._id !== itemId);
            this.trip.set({ ...currentTrip, itinerary: updatedItinerary });
          }
        } else {
          console.error('Failed to delete itinerary item');
        }
      },
      error: (err) => {
        console.error('Error deleting itinerary item:', err);
      }
    });
  }

  getItineraryForDay(day: number): ItineraryItem[] {
    const trip = this.trip();
    if (!trip) return [];
    return trip.itinerary.filter(item => item.day === day);
  }

  // User search and invitation
  searchUsers(): void {
    const query = this.userSearchQuery().trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }

    this.searchLoading.set(true);
    // TODO: Implement user search API call
    setTimeout(() => {
      // Mock search results
      this.searchResults.set([
        { _id: '1', id: '1', username: 'john_doe', fullName: 'John Doe', profilePicture: '/assets/images/avatars/avatar1.svg' },
        { _id: '2', id: '2', username: 'jane_smith', fullName: 'Jane Smith', profilePicture: '/assets/images/avatars/avatar2.svg' }
      ]);
      this.searchLoading.set(false);
    }, 500);
  }

  inviteUser(userId: string): void {
    if (!userId) {
      console.error('Invalid user ID for invitation');
      return;
    }

    // TODO: Implement when backend API is ready
    console.log('Inviting user:', userId);
    this.showInviteModal.set(false);
    this.userSearchQuery.set('');
    this.searchResults.set([]);
  }

  removeCollaborator(userId: string): void {
    if (!userId) {
      console.error('Invalid user ID for removing collaborator');
      return;
    }

    // TODO: Implement when backend API is ready
    console.log('Removing collaborator:', userId);
  }

  // Trip sharing
  generateShareLink(): void {
    // TODO: Implement when backend API is ready
    console.log('Generating share link for trip:', this.tripId());
    // Mock setting a share code for demo
    const mockShareCode = 'demo-' + Math.random().toString(36).substr(2, 9);
    this.trip.set({ ...this.trip()!, shareCode: mockShareCode });
  }

  copyShareLink(): void {
    const trip = this.trip();
    if (!trip?.shareCode) return;

    const shareUrl = `${window.location.origin}/trips/join/${trip.shareCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      // TODO: Show success toast
      console.log('Share link copied to clipboard');
    });
  }

  // Trip deletion
  openDeleteModal(): void {
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
  }

  deleteTrip(): void {
    // TODO: Implement when backend API is ready
    console.log('Deleting trip:', this.tripId());
    // For demo, just navigate back to trips
    this.router.navigate(['/trips']);
  }

  // Join request methods
  getPendingJoinRequests(): JoinRequest[] {
    const trip = this.trip();
    if (!trip || !trip.joinRequests) return [];

    return trip.joinRequests.filter(request => request.status === 'pending');
  }

  processingRequest(userId: string): boolean {
    return this.processingJoinRequests().has(userId);
  }

  handleJoinRequest(action: 'approve' | 'reject', userId: string): void {
    if (!userId || !this.tripId()) return;

    // Add to processing set
    const processing = this.processingJoinRequests();
    processing.add(userId);
    this.processingJoinRequests.set(new Set(processing));

    this.tripService.handleJoin(this.tripId(), action, userId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log(`Join request ${action}ed successfully`);

          // Update local state if response includes updated join requests
          if (response.data?.joinRequests) {
            const currentTrip = this.trip();
            if (currentTrip) {
              // Find the user that was approved
              const approvedUser = currentTrip.joinRequests
                .find(r => r.user._id === userId)?.user;

              // Ensure the user object has the right format
              const formattedUser = approvedUser ? {
                ...approvedUser,
                id: approvedUser._id // Add id field for backward compatibility
              } : null;

              this.trip.set({
                ...currentTrip,
                joinRequests: response.data.joinRequests as any,
                // If approved and user found, add to members list
                members: action === 'approve' && formattedUser ?
                  [...currentTrip.members, formattedUser] :
                  currentTrip.members
              });
            }
          } else {
            // Fallback: refresh trip data
            this.fetchTripDetails(this.tripId());
          }
        } else {
          console.error(`Failed to ${action} join request:`, response);
          this.error.set(`Failed to ${action} join request`);
        }

        // Remove from processing set
        const updatedProcessing = this.processingJoinRequests();
        updatedProcessing.delete(userId);
        this.processingJoinRequests.set(new Set(updatedProcessing));
      },
      error: (err) => {
        console.error(`Error ${action}ing join request:`, err);
        this.error.set(`Error ${action}ing join request: ${err.message || 'Unknown error'}`);

        // Remove from processing set
        const updatedProcessing = this.processingJoinRequests();
        updatedProcessing.delete(userId);
        this.processingJoinRequests.set(new Set(updatedProcessing));
      }
    });
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCoverImage(): string {
    const trip = this.trip();
    if (!trip?.coverImage) return '';

    if (trip.coverImage.startsWith('http') || trip.coverImage.startsWith('data:')) {
      return trip.coverImage;
    }

    if (trip.coverImage.startsWith('/')) {
      return `${environment.backendUrl}${trip.coverImage}`;
    }

    return '';
  }

  hasCoverImage(): boolean {
    const trip = this.trip();
    return !!trip?.coverImage;
  }

  getUserAvatar(user: any): string {
    if (!user.profilePicture) return '/assets/images/avatars/user.svg';

    if (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:')) {
      return user.profilePicture;
    }

    if (user.profilePicture.startsWith('/')) {
      return `${environment.backendUrl}${user.profilePicture}`;
    }

    return '/assets/images/avatars/user.svg';
  }
}
