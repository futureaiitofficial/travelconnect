# Docker Build Troubleshooting Guide

## ❌ Common Error: Exit Code 127 - Command Not Found

### Error Message:
```
Failed to deploy a stack: compose build operation failed: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127
```

### Root Cause:
The Angular CLI (`ng` command) is not available because `npm ci --only=production` was used, which excludes `devDependencies` where `@angular/cli` is located.

### ✅ Solution Applied:
Updated `Dockerfile.frontend` to:

1. **Install all dependencies** (including devDependencies)
2. **Add system dependencies** for native modules
3. **Increase Node.js memory limit** for large builds

### Fixed Dockerfile:
```dockerfile
# Multi-stage build for Angular frontend
FROM node:20-alpine as build

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set memory limit for Node.js (helps with large Angular builds)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the Angular app for production
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine
# ... rest of configuration
```

## 🔧 Other Common Docker Build Issues

### 1. ❌ uploads Directory Not Found
**Error:** 
```
failed to compute cache key: "/app/backend/uploads": not found
```
**Root Cause:** Trying to copy uploads directory that doesn't exist in Git
**Solution:** ✅ Fixed - Create directory instead of copying, use volumes for uploads

### 2. Memory Issues
**Error:** Build process killed or out of memory
**Solution:** Increase memory limit (already added above)

### 3. Network Issues
**Error:** npm install fails with network timeouts
**Solution:** Add retry logic:
```dockerfile
RUN npm ci --retry=3 --timeout=60000
```

### 4. Cache Issues
**Error:** Stale dependencies or build artifacts
**Solution:** Clear Docker build cache:
```bash
docker system prune -a
```

### 5. ❌ Nginx Configuration Error
**Error:** 
```
invalid value "must-revalidate" in /etc/nginx/nginx.conf:28
nginx: [emerg] invalid value "must-revalidate"
```
**Root Cause:** Invalid value in `gzip_proxied` directive
**Solution:** ✅ Fixed - Removed invalid `must-revalidate` option

### 6. File Permission Issues
**Error:** Permission denied during build
**Solution:** Check file permissions in repository

## 🚀 Testing the Fix

### Local Test:
```bash
# Test the build locally
docker build -t test-frontend -f Dockerfile.frontend .

# Check if image was created
docker images | grep test-frontend

# Test run
docker run -p 8080:80 test-frontend
```

### Portainer Redeploy:
1. Go to **Stacks** → Your Stack
2. Click **Editor**
3. Click **Pull and redeploy** (this will pull latest code and rebuild)

## 📊 Build Process Flow

```
┌─────────────────┐
│   Git Repo      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Portainer Pulls │
│ Latest Code     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Docker Build    │
│ Stage 1: Build  │
│ - npm ci        │ ← Fixed: Now includes devDependencies
│ - npm run build │ ← This should work now
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Docker Build    │
│ Stage 2: Nginx  │
│ - Copy built    │
│   app to nginx  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  Running App    │
│  Port 80        │
└─────────────────┘
```

## 🎯 Verification Steps

After redeploying:

1. **Check Portainer Logs**:
   - Go to Containers → travelconnect-frontend-prod → Logs
   - Should see successful build messages

2. **Test Frontend**:
   ```bash
   curl http://your-ec2-ip
   ```

3. **Test API Proxy**:
   ```bash
   curl http://your-ec2-ip/api/health
   ```

## 🆘 If Issues Persist

### Debug Commands:
```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check running containers
docker ps

# Check container logs
docker logs travelconnect-frontend-prod
docker logs travelconnect-backend-prod

# Rebuild manually if needed
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Contact Information:
If you continue to experience issues, provide:
1. Full error logs from Portainer
2. Container logs
3. Your repository structure

---

✅ **The Dockerfile has been fixed and should now build successfully!**
