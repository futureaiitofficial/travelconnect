import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

/**
 * Application routing configuration
 * Defines all routes for the Travel Connect application
 * Uses lazy loading for feature modules to improve initial load time
 */
export const routes: Routes = [
  // Default route - redirect to feed for authenticated users, login for unauthenticated
  {
    path: '',
    redirectTo: '/feed',
    pathMatch: 'full'
  },
  {
    path: 'people',
    loadComponent: () => import('./features/people/people-search.component').then(m => m.PeopleSearchComponent),
    title: 'Find People - Travel Connect',
    canActivate: [authGuard]
  },

  // Authentication routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    title: 'Login - Travel Connect',
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
    title: 'Register - Travel Connect',
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    redirectTo: '/register'
  },

  // Main application routes
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
    title: 'Feed - Travel Connect',
    canActivate: [authGuard]
  },

  // Trip planner routes
  {
    path: 'trips',
    loadComponent: () => import('./features/trips/trips.component').then(m => m.TripsComponent),
    title: 'My Trips - Travel Connect'
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/trip-explorer/trip-explorer.component').then(m => m.TripExplorerComponent),
    title: 'Explore Trips - Travel Connect',
    canActivate: [authGuard]
  },
  {
    path: 'trips/:id',
    loadComponent: () => import('./features/trips/trip-details/trip-details.component').then(m => m.TripDetailsComponent),
    title: 'Trip Details - Travel Connect'
  },
  {
    path: 'trips/:id/edit',
    loadComponent: () => import('./features/trips/trip-details/trip-details.component').then(m => m.TripDetailsComponent),
    title: 'Edit Trip - Travel Connect'
  },
  {
    path: 'messages',
    loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent),
    title: 'Messages - Travel Connect'
  },

  {
    path: 'create',
    loadComponent: () => import('./features/create/create.component').then(m => m.CreateComponent),
    title: 'Create - Travel Connect'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    title: 'Profile - Travel Connect',
    canActivate: [authGuard]
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./features/profile/edit-profile/edit-profile.component').then(m => m.EditProfileComponent),
    title: 'Edit Profile - Travel Connect',
    canActivate: [authGuard]
  },
  {
    path: 'user/:username',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    title: 'User Profile - Travel Connect'
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings - Travel Connect'
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/feed'
  }
];
