# Frontend Issues - Resolution Guide

## 🔧 Issues Identified and Fixed

### 1. ❌ API Calls Going to localhost:3002 Instead of Proxy

**Problem:**
```
Error Code: 0 Message: Http failure response for http://localhost:3002/api/auth/login: 0 Unknown Error
```

**Root Cause:** Angular was not using the production environment configuration during build.

**Solution Applied:**
✅ **Added file replacement configuration in `angular.json`**:
```json
"production": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.prod.ts"
    }
  ],
  // ... other config
}
```

✅ **Ensured production build**: Updated Dockerfile to explicitly use production configuration:
```dockerfile
RUN npm run build -- --configuration=production
```

### 2. ❌ Frontend Container Unhealthy

**Problem:** Frontend health checks failing

**Root Cause:** `wget` command not available in nginx:alpine container

**Solution Applied:**
✅ **Added wget to Dockerfile**:
```dockerfile
# Install wget for health checks
RUN apk add --no-cache wget
```

## 🎯 How the Fix Works

### Before (❌):
1. Angular imports `environment.ts` (development)
2. `environment.ts` has `backendUrl: 'http://localhost:3002'`
3. API calls go directly to backend container, bypassing nginx
4. CORS issues and connection failures

### After (✅):
1. Angular build replaces `environment.ts` with `environment.prod.ts`
2. `environment.prod.ts` has `backendUrl: '/api'`
3. API calls go through nginx proxy to backend
4. Proper routing and CORS handling

## 📊 Request Flow After Fix

```
Frontend App → /api/auth/login → Nginx Proxy → backend:3002/api/auth/login
```

Instead of:
```
Frontend App → http://localhost:3002/api/auth/login ❌ (Direct, bypassing proxy)
```

## 🚀 Deployment Steps

1. **Commit all changes**:
   - `angular.json` - Added file replacements
   - `Dockerfile.frontend` - Added wget and production build
   - `nginx.conf` - Fixed gzip configuration

2. **Redeploy in Portainer**:
   - Go to **Stacks** → Your Stack
   - Click **Editor**
   - Click **Pull and redeploy**

3. **Verify fixes**:
   - Frontend should be healthy
   - Login should work
   - API calls should go through nginx proxy

## ✅ Expected Results

### Health Checks:
```bash
# Frontend health
curl http://18.224.237.129
# Should return Angular app

# Backend health  
curl http://18.224.237.129/api/health
# Should return backend health response
```

### Login Flow:
1. User enters credentials on frontend
2. Frontend calls `/api/auth/login` (relative URL)
3. Nginx proxies to `backend:3002/api/auth/login`
4. Backend processes login with MongoDB Atlas
5. Success response returned through proxy

## 🔍 Debugging Commands

If issues persist:

```bash
# Check container logs
docker logs travelconnect-frontend-prod
docker logs travelconnect-backend-prod

# Test proxy directly
curl -X POST http://18.224.237.129/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Check nginx configuration
docker exec travelconnect-frontend-prod cat /etc/nginx/nginx.conf | grep -A 10 "location /api"
```

## 📋 Environment Verification

**Development (`environment.ts`):**
```typescript
backendUrl: 'http://localhost:3002'  // Direct connection
```

**Production (`environment.prod.ts`):**
```typescript
backendUrl: '/api'  // Uses nginx proxy
```

**File Replacement Active:** Angular build will now use production environment automatically.

---

🎉 **Both frontend and backend should now work perfectly together!**
