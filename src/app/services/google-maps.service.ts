import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private http = inject(HttpClient);

  constructor() {}

  /**
   * Load Google Maps JavaScript API
   */
  loadGoogleMaps(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      // Create callback function
      window.initGoogleMaps = () => {
        this.isLoaded = true;
        resolve();
      };

      // Create script element
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places&callback=initGoogleMaps`;
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));

      // Add script to document
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

      /**
   * Initialize autocomplete for an input element using new Places API (New)
   */
  async initializeAutocomplete(
    inputElement: HTMLInputElement,
    onPlaceSelected: (place: PlaceResult) => void,
    options?: {
      types?: string[];
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
    }
  ): Promise<any> {
    try {
      let searchTimeout: any = null;

      const handleInput = () => {
        const query = inputElement.value.trim();
        if (query.length < 3) return;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          try {
            const results = await this.searchPlacesNew(query);
            if (results.length > 0) {
              // Auto-select the first result for simplicity
              const firstResult = results[0];
              onPlaceSelected(firstResult);
            }
          } catch (error) {
            console.error('Places search error:', error);
            // Silently fail - user can still enter location manually
          }
        }, 800); // Debounced to reduce API calls
      };

      inputElement.addEventListener('input', handleInput);
      inputElement.addEventListener('blur', handleInput);

      return {
        dispose: () => {
          inputElement.removeEventListener('input', handleInput);
          inputElement.removeEventListener('blur', handleInput);
          clearTimeout(searchTimeout);
        }
      };
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
      throw error;
    }
  }

  /**
   * Search for places using the new Places API (New) with HTTP requests
   */
  async searchPlacesNew(query: string): Promise<PlaceResult[]> {
    try {
      const requestBody = {
        textQuery: query,
        maxResultCount: 5,
        languageCode: 'en'
      };

      const response = await this.http.post(
        `${environment.backendUrl}/api/places/search-text`,
        requestBody
      ).toPromise() as any;

      const places = response?.data?.places || response?.places;
      if (places) {
        return places.map((place: any) => ({
          placeId: place.id,
          name: place.displayName?.text || place.formattedAddress,
          formattedAddress: place.formattedAddress,
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0
          },
          types: place.types || []
        }));
      }

      return [];
    } catch (error) {
      console.error('New Places API search error:', error);
      return [];
    }
  }

  /**
   * Legacy search for places (fallback) - will be removed
   */
  async searchPlaces(query: string): Promise<PlaceResult[]> {
    // Fallback to new API
    return this.searchPlacesNew(query);
  }

    /**
   * Reverse geocode coordinates to get address using new Places API (New)
   */
  async reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
    try {
      const response = await this.http.post(
        `${environment.backendUrl}/api/places/search-nearby`,
        {
          latitude: lat,
          longitude: lng,
          maxResultCount: 1,
          rankPreference: 'DISTANCE'
        }
      ).toPromise() as any;

      const places = response?.data?.places || response?.places;
      if (places && places.length > 0) {
        const place = places[0];
        return {
          placeId: place.id,
          name: place.displayName?.text || place.formattedAddress,
          formattedAddress: place.formattedAddress,
          location: { lat, lng },
          types: place.types || []
        };
      }

      // Fallback: return coordinates with generic name
      return {
        placeId: `lat_${lat}_lng_${lng}`,
        name: 'Current Location',
        formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        location: { lat, lng },
        types: ['point_of_interest']
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Return basic location info as fallback
      return {
        placeId: `lat_${lat}_lng_${lng}`,
        name: 'Current Location',
        formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        location: { lat, lng },
        types: ['point_of_interest']
      };
    }
  }

  /**
   * Get current location using browser geolocation
   */
  getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          let errorMessage = 'Unknown geolocation error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  /**
   * Create a simple map instance
   */
  async createMap(
    container: HTMLElement,
    center: LocationCoordinates,
    zoom: number = 15,
    options?: any
  ): Promise<any> {
    await this.loadGoogleMaps();

    const mapOptions = {
      zoom,
      center,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      ...options
    };

    return new window.google.maps.Map(container, mapOptions);
  }

  /**
   * Add a marker to a map
   */
  addMarker(
    map: any,
    position: LocationCoordinates,
    options?: {
      title?: string;
      draggable?: boolean;
      icon?: string;
    }
  ): any {
    const markerOptions = {
      position,
      map,
      title: options?.title,
      draggable: options?.draggable || false,
      icon: options?.icon
    };

    return new window.google.maps.Marker(markerOptions);
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  calculateDistance(
    point1: LocationCoordinates,
    point2: LocationCoordinates
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  formatDistance(kilometers: number): string {
    if (kilometers < 1) {
      return `${Math.round(kilometers * 1000)}m`;
    } else if (kilometers < 10) {
      return `${kilometers.toFixed(1)}km`;
    } else {
      return `${Math.round(kilometers)}km`;
    }
  }

  /**
   * Check if Google Maps API is loaded
   */
  isGoogleMapsLoaded(): boolean {
    return this.isLoaded && window.google && window.google.maps;
  }
}
