import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  } else {
    // Redirect to login page with return url
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  } else {
    // Redirect authenticated users to feed
    router.navigate(['/feed']);
    return false;
  }
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  } else if (authService.isLoggedIn()) {
    // User is logged in but not admin
    router.navigate(['/feed']);
    return false;
  } else {
    // User is not logged in
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
