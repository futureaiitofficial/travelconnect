import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JoinRequest {
  _id: string;
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

export interface TripPayload {
  _id: string;
  tripName: string;
  description?: string;
  destination?: string;
  destinationCoordinates?: {
    lat: number;
    lng: number;
  };
  destinationPlaceId?: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  maxMembers: number;
  tags: string[];
  tripType: 'solo' | 'couple' | 'group' | 'family';
  interests: string[];
  coverImage?: string;

  // User and collaboration data
  createdBy?: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  members: any[];
  collaborators: any[];

  // Trip content
  itinerary: any[];
  checklist: any[];
  joinRequests?: JoinRequest[];
  shareCode?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface TripConstants {
  tripTypes: string[];
  interests: string[];
}

export interface TripListResponse { success: boolean; data: { trips: TripPayload[] } }
export interface TripResponse { success: boolean; data: TripPayload }

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly API_URL = `${environment.backendUrl}/api/trips`;
  private http = inject(HttpClient);

  listMine(): Observable<TripListResponse> {
    return this.http.get<TripListResponse>(this.API_URL);
  }

  getRequestedTrips(): Observable<TripListResponse> {
    return this.http.get<TripListResponse>(`${this.API_URL}/requested`);
  }

  create(body: Partial<TripPayload>): Observable<TripResponse> {
    return this.http.post<TripResponse>(this.API_URL, body);
  }

  createWithFormData(formData: FormData): Observable<TripResponse> {
    return this.http.post<TripResponse>(this.API_URL, formData);
  }

  getById(id: string): Observable<TripResponse> {
    return this.http.get<TripResponse>(`${this.API_URL}/${id}`);
  }

  update(id: string, body: Partial<TripPayload>): Observable<TripResponse> {
    return this.http.put<TripResponse>(`${this.API_URL}/${id}`, body);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  addItinerary(id: string, item: any): Observable<{ success: boolean; data: any[] }> {
    return this.http.post<{ success: boolean; data: any[] }>(`${this.API_URL}/${id}/itinerary`, item);
  }

  updateItinerary(id: string, itemId: string, item: any): Observable<{ success: boolean; data: any }>{
    return this.http.put<{ success: boolean; data: any }>(`${this.API_URL}/${id}/itinerary/${itemId}`, item);
  }

  deleteItinerary(id: string, itemId: string): Observable<{ success: boolean; message: string }>{
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}/itinerary/${itemId}`);
  }

  addChecklist(id: string, item: { item: string }): Observable<{ success: boolean; data: any[] }>{
    return this.http.post<{ success: boolean; data: any[] }>(`${this.API_URL}/${id}/checklist`, item);
  }

  toggleChecklist(id: string, itemId: string): Observable<{ success: boolean; data: any }>{
    return this.http.patch<{ success: boolean; data: any }>(`${this.API_URL}/${id}/checklist/${itemId}`, {});
  }

  deleteChecklist(id: string, itemId: string): Observable<{ success: boolean; message: string }>{
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}/checklist/${itemId}`);
  }

  generateShareLink(id: string): Observable<{ success: boolean; data: { code: string; url: string } }>{
    return this.http.post<{ success: boolean; data: { code: string; url: string } }>(`${this.API_URL}/${id}/share`, {});
  }

  requestJoin(id: string, message?: string): Observable<{ success: boolean; message: string }>{
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/${id}/join`, { message });
  }

  handleJoin(id: string, action: 'approve' | 'reject', userId: string): Observable<{ success: boolean; message: string; data?: { joinRequests: JoinRequest[] } }>{
    return this.http.post<{ success: boolean; message: string; data?: { joinRequests: JoinRequest[] } }>(`${this.API_URL}/${id}/join/handle`, { action, userId });
  }

  addCollaborator(id: string, username: string): Observable<{ success: boolean; data: any[] }>{
    return this.http.post<{ success: boolean; data: any[] }>(`${this.API_URL}/${id}/collaborators`, { username, role: 'editor' });
  }

  removeCollaborator(id: string, userId: string): Observable<{ success: boolean; message: string }>{
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}/collaborators/${userId}`);
  }

  getConstants(): Observable<{ success: boolean; data: TripConstants }> {
    return this.http.get<{ success: boolean; data: TripConstants }>(`${this.API_URL}/constants`);
  }

  filterPublicTrips(filters: any): Observable<{ success: boolean; data: { trips: TripPayload[]; page: number; hasMore: boolean } }> {
    const params = new URLSearchParams();

    if (filters.tripType && filters.tripType.length > 0) {
      filters.tripType.forEach((type: string) => params.append('tripType', type));
    }
    if (filters.interests && filters.interests.length > 0) {
      filters.interests.forEach((interest: string) => params.append('interests', interest));
    }
    if (filters.destination) {
      params.append('destination', filters.destination);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `${this.API_URL}/public?${queryString}` : `${this.API_URL}/public`;

    return this.http.get<{ success: boolean; data: { trips: TripPayload[]; page: number; hasMore: boolean } }>(url);
  }

  // Checklist operations
  addChecklistItem(id: string, text: string): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.API_URL}/${id}/checklist`, { item: text });
  }

  toggleChecklistItem(id: string, itemId: string): Observable<{ success: boolean; data: any }> {
    return this.http.put<{ success: boolean; data: any }>(`${this.API_URL}/${id}/checklist/${itemId}`, {});
  }

  deleteChecklistItem(id: string, itemId: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}/checklist/${itemId}`);
  }
}


