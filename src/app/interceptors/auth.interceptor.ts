import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get token directly from localStorage to avoid circular dependency
  const token = localStorage.getItem('travelconnect_token');

  // Skip adding token for auth endpoints to avoid circular calls
  const isAuthEndpoint = req.url.includes('/api/auth/login') ||
                        req.url.includes('/api/auth/register') ||
                        req.url.includes('/api/auth/refresh-token') ||
                        req.url.includes('/api/auth/forgot-password') ||
                        req.url.includes('/api/auth/reset-password');

  // Only attach auth header for our backend requests
  const isBackendRequest = req.url.startsWith(environment.backendUrl) || req.url.startsWith('/api');

  if (token && !isAuthEndpoint && isBackendRequest) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
