import { Routes } from '@angular/router';

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
  
  // Authentication routes
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    title: 'Login - Travel Connect'
  },
  
  // Main application routes
  {
    path: 'feed',
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent),
    title: 'Feed - Travel Connect'
  },
  
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent),
    title: 'Explore - Travel Connect'
  },
  
  // Placeholder routes for future implementation
  // TODO: Create these components
  // {
  //   path: 'trips',
  //   loadComponent: () => import('./features/trips/trips.component').then(m => m.TripsComponent),
  //   title: 'My Trips - Travel Connect'
  // },
  // 
  // {
  //   path: 'messages',
  //   loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent),
  //   title: 'Messages - Travel Connect'
  // },
  // 
  // {
  //   path: 'profile',
  //   loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
  //   title: 'Profile - Travel Connect'
  // },
  
  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/feed'
  }
];
