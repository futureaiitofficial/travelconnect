import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TripService, TripPayload, JoinRequest } from '../../../services/trip.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

// Interfaces
interface TripType {
  id: string;
  name: string;
}

interface TripInterest {
  id: string;
  name: string;
}

interface PublicTrip extends TripPayload {
  distance?: number;
}

@Component({
  selector: 'app-trip-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './trip-explorer.component.html',
  styleUrl: './trip-explorer.component.css'
})
export class TripExplorerComponent implements OnInit {

  private fb = inject(FormBuilder);
  private tripService = inject(TripService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Current user ID for checking join requests
  private currentUserId = computed(() => {
    const user = this.authService.getCurrentUserFromStorage();
    return user?._id || null;
  });

  searchRadius = signal<number>(50);
  searchQuery = signal<string>('');

  publicTrips = signal<PublicTrip[]>([]);
  selectedTrip = signal<PublicTrip | null>(null);

  tripTypes = signal<TripType[]>([]);
  tripInterests = signal<TripInterest[]>([]);

  loading = signal<boolean>(false);
  error = signal<string>('');

  // Filters
  filterForm: FormGroup;
  tripTypeFilters = signal<string[]>([]);
  interestFilters = signal<string[]>([]);
  minBudget = signal<number | null>(null);
  maxBudget = signal<number | null>(null);
  startDate = signal<string>('');
  endDate = signal<string>('');



  // Join request
  isJoinRequestOpen = signal<boolean>(false);
  joinRequestMessage = signal<string>('');
  joinRequestSent = signal<boolean>(false);
  joinRequestStatus = signal<'pending' | 'approved' | 'rejected' | null>(null);
  joinRequestInProgress = signal<boolean>(false);
  joinRequestTripName = signal<string>('');

  isLoading = signal<boolean>(false);
  searchSuggestions = signal<any[]>([]);
  showSuggestions = signal<boolean>(false);

  filteredTrips = computed(() => {
    let trips = this.publicTrips();

    // Apply search query filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      trips = trips.filter(trip =>
        trip.tripName.toLowerCase().includes(query) ||
        trip.destination?.toLowerCase().includes(query) ||
        trip.description?.toLowerCase().includes(query) ||
        trip.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply trip type filters
    const typeFilters = this.tripTypeFilters();
    if (typeFilters.length > 0) {
      trips = trips.filter(trip => typeFilters.includes(trip.tripType));
    }

    // Apply interest filters
    const interestFilters = this.interestFilters();
    if (interestFilters.length > 0) {
      trips = trips.filter(trip =>
        trip.interests && trip.interests.some(interest => interestFilters.includes(interest))
      );
    }

    // Apply date filters
    const startDate = this.startDate();
    const endDate = this.endDate();
    if (startDate || endDate) {
      trips = trips.filter(trip => {
        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);

        if (startDate && endDate) {
          const filterStart = new Date(startDate);
          const filterEnd = new Date(endDate);
          return tripStart <= filterEnd && tripEnd >= filterStart;
        } else if (startDate) {
          const filterStart = new Date(startDate);
          return tripEnd >= filterStart;
        } else if (endDate) {
          const filterEnd = new Date(endDate);
          return tripStart <= filterEnd;
        }
        return true;
      });
    }

    // Apply available spots filter
    const availableOnly = this.filterForm.value.availableOnly;
    if (availableOnly) {
      trips = trips.filter(trip => this.hasAvailableSpots(trip));
    }

    return trips;
  });

  constructor() {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      tripType: [''],
      interests: [''],
      minBudget: [''],
      maxBudget: [''],
      availableOnly: [false]
    });
  }

  ngOnInit(): void {
    this.loadTripConstants();
    this.loadPublicTrips();
    this.filterForm.valueChanges.subscribe(() => this.applyFilters());
  }

  loadTripConstants(): void {
    this.tripService.getConstants().subscribe({
      next: (response) => {
        if (response.success) {
          // Transform string arrays to object arrays
          this.tripTypes.set((response.data.tripTypes || []).map((type: string) => ({
            id: type,
            name: this.formatTripTypeName(type)
          })));
          this.tripInterests.set((response.data.interests || []).map((interest: string) => ({
            id: interest,
            name: this.formatInterestName(interest)
          })));
        }
      },
      error: (error) => {
        console.error('ERROR', error);
      }
    });
  }

  formatTripTypeName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'solo': 'Solo Traveler',
      'couple': 'Couple',
      'group': 'Group Trip',
      'family': 'Family'
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatInterestName(interest: string): string {
    return interest.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
  }

  loadPublicTrips(): void {
    this.loading.set(true);
    this.error.set('');

    const filters = this.getActiveFilters();
    console.log('🔍 Loading public trips with filters:', filters);
    this.tripService.filterPublicTrips(filters).subscribe({
      next: (response) => {
        console.log('✅ Trips API response:', response);
        if (response.success) {
          this.publicTrips.set(response.data.trips);
          console.log(`📍 Loaded ${response.data.trips.length} trips`);
        } else {
          console.error('❌ Failed to load trips:', response);
          this.error.set('Failed to load trips');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading public trips:', error);
        this.error.set(`Error Loading Trips\n\n${error.message || error.error?.message || 'Unknown error'}\n\nTry Again`);
        this.loading.set(false);
      }
    });
  }

  getActiveFilters(): any {
    const formValues = this.filterForm.value;
    const filters: any = {};

    if (formValues.startDate) filters.startDate = formValues.startDate;
    if (formValues.endDate) filters.endDate = formValues.endDate;
    if (this.tripTypeFilters().length > 0) filters.tripTypes = this.tripTypeFilters();
    if (this.interestFilters().length > 0) filters.interests = this.interestFilters();
    if (formValues.minBudget) filters.minBudget = formValues.minBudget;
    if (formValues.maxBudget) filters.maxBudget = formValues.maxBudget;
    if (formValues.availableOnly) filters.availableOnly = true;
    if (formValues.tripType) filters.tripType = formValues.tripType;

    return filters;
  }

  applyFilters(): void {
    const formValues = this.filterForm.value;
    this.startDate.set(formValues.startDate || '');
    this.endDate.set(formValues.endDate || '');
    this.minBudget.set(formValues.minBudget || null);
    this.maxBudget.set(formValues.maxBudget || null);

    // Update trip type filter if selected from dropdown
    if (formValues.tripType && !this.tripTypeFilters().includes(formValues.tripType)) {
      this.tripTypeFilters.set([...this.tripTypeFilters(), formValues.tripType]);
    }

    // Apply the filters to reload trips
    this.loadPublicTrips();
  }

  onTripTypeFilterChange(tripType: string): void {
    const currentFilters = this.tripTypeFilters();
    if (currentFilters.includes(tripType)) {
      this.tripTypeFilters.set(currentFilters.filter(t => t !== tripType));
    } else {
      this.tripTypeFilters.set([...currentFilters, tripType]);
    }
  }

  onInterestFilterChange(interest: string): void {
    const currentFilters = this.interestFilters();
    if (currentFilters.includes(interest)) {
      this.interestFilters.set(currentFilters.filter(i => i !== interest));
    } else {
      this.interestFilters.set([...currentFilters, interest]);
    }
  }

  openTripDetails(trip: PublicTrip): void {
    // Navigate to the trip details page
    this.router.navigate(['/trips', trip._id]);
  }



  requestJoinTrip(trip: PublicTrip): void {
    this.selectedTrip.set(trip);
    this.isJoinRequestOpen.set(true);
  }

  closeJoinRequestModal(): void {
    this.isJoinRequestOpen.set(false);
    this.joinRequestMessage.set('');
    if (!this.joinRequestSent()) {
      this.selectedTrip.set(null);
    }
  }

  closeJoinStatusModal(): void {
    this.joinRequestSent.set(false);
    this.selectedTrip.set(null);
    this.joinRequestTripName.set('');
  }

  onJoinMessageInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.joinRequestMessage.set(target.value);
  }

  submitJoinRequest(): void {
    const trip = this.selectedTrip();
    if (!trip) return;

    // Check if user is logged in
    const currentUser = this.authService.getCurrentUserFromStorage();
    if (!currentUser) {
      this.error.set('You must be logged in to request joining a trip');
      this.joinRequestInProgress.set(false);
      return;
    }

    this.joinRequestInProgress.set(true);

    this.tripService.requestJoin(trip._id, this.joinRequestMessage()).subscribe({
      next: (response) => {
        if (response.success) {
          this.joinRequestSent.set(true);
          this.joinRequestStatus.set('pending');
          this.joinRequestTripName.set(trip.tripName);

          // Update the trip in the list to show it as requested
          const trips = this.publicTrips();
          const updatedTrips = trips.map(t => {
            if (t._id === trip._id) {
              return {
                ...t,
                joinRequests: [...(t.joinRequests || []), {
                  _id: `temp-${Date.now()}`, // Temporary ID until backend updates
                  user: {
                    _id: currentUser._id,
                    username: currentUser.username || '',
                    fullName: currentUser.fullName || ''
                  },
                  status: 'pending',
                  requestedAt: new Date().toISOString()
                } as JoinRequest]
              };
            }
            return t;
          });
          this.publicTrips.set(updatedTrips);
        } else {
          this.error.set(response.message || 'Failed to send join request');
        }
        this.joinRequestInProgress.set(false);
        this.closeJoinRequestModal();
      },
      error: (error) => {
        console.error('Error sending join request:', error);
        this.error.set(error.error?.message || error.message || 'Error sending join request');
        this.joinRequestInProgress.set(false);
      }
    });
  }

  formatTripType(tripType: string): string {
    return tripType.charAt(0).toUpperCase() + tripType.slice(1);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateRange(startDate: string, endDate: string): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    return `${start} - ${end}`;
  }

  getTripCoverImage(trip: PublicTrip): string {
    return trip.coverImage || '';
  }

  hasCoverImage(trip: PublicTrip): boolean {
    return !!trip.coverImage;
  }

  getMemberCountText(trip: PublicTrip): string {
    const current = trip.members?.length || 0;
    const max = trip.maxMembers || 0;
    return `${current}/${max} members`;
  }

  hasAvailableSpots(trip: PublicTrip): boolean {
    const current = trip.members?.length || 0;
    const max = trip.maxMembers || 0;
    return current < max;
  }

    hasRequestedToJoin(trip: PublicTrip): boolean {
    if (!trip.joinRequests || !this.currentUserId()) return false;

    const currentUserId = this.currentUserId();

    return trip.joinRequests.some(request => {
      // Handle different user object structures
      const requestUserId = request.user._id || (typeof request.user === 'string' ? request.user : null);
      return requestUserId === currentUserId && request.status === 'pending';
    });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  selectSuggestion(place: any): void {
    this.searchQuery.set(place.name || place.formattedAddress);
    this.showSuggestions.set(false);
    this.searchTrips(place.name || place.formattedAddress);
  }

  searchTrips(query: string): void {
    if (!query.trim()) return;

    this.loading.set(true);
    this.error.set('');

    const filters = this.getActiveFilters();
    filters.query = query.trim();

    console.log('🔍 Searching trips with query:', query, 'and filters:', filters);
    this.tripService.filterPublicTrips(filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.publicTrips.set(response.data.trips);
          console.log(`📍 Found ${response.data.trips.length} trips matching query`);
        } else {
          this.error.set('Failed to search trips');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error searching trips:', error);
        this.error.set(`Error Searching Trips\n\n${error.message || error.error?.message || 'Unknown error'}\n\nTry Again`);
        this.loading.set(false);
      }
    });
  }

  interests = this.tripInterests; // Alias for template compatibility

  // This method is no longer needed as we're using onInterestFilterChange instead

  resetFilters(): void {
    this.filterForm.reset({
      startDate: '',
      endDate: '',
      tripType: '',
      interests: '',
      minBudget: '',
      maxBudget: '',
      availableOnly: false
    });
    this.tripTypeFilters.set([]);
    this.interestFilters.set([]);
    this.searchQuery.set('');
    this.showSuggestions.set(false);
    this.loadPublicTrips();
  }

  // This method is no longer needed as we're using openTripDetails instead

  getCreatorProfilePic(trip: PublicTrip): string {
    if (trip.createdBy?.profilePicture) {
      if (trip.createdBy.profilePicture.startsWith('http')) {
        return trip.createdBy.profilePicture;
      }
      return `${environment.backendUrl}${trip.createdBy.profilePicture}`;
    }
    // Use a data URL for the default avatar to ensure it always loads
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhckdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzY2N2VlYTtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojNzY0YmEyO3N0b3Atb3BhY2l0eToxIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgCiAgPCEtLSBCYWNrZ3JvdW5kIGNpcmNsZSAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0idXJsKCNhdmF0YXJHcmFkaWVudCkiLz4KICAKICA8IS0tIFVzZXIgaWNvbiAtLT4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjM1IiByPSIxMiIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOSIvPgogIDxwYXRoIGQ9Ik0yNSA3NSBDMjUgNjAgMzUgNTAgNTAgNTAgQzY1IDUwIDc1IDYwIDc1IDc1IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+CiAgCiAgPCEtLSBEZWNvcmF0aXZlIGVsZW1lbnRzIC0tPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjMiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjMiLz4KICA8Y2lyY2xlIGN4PSI3MCIgY3k9IjI1IiByPSIyIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+CiAgPGNpcmNsZSBjeD0iNzUiIGN5PSI3MCIgcj0iMi41IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPgo=';
  }
}
