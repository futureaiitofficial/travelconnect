# TravelConnect Portainer Deployment Guide

## Overview

This guide shows how to deploy TravelConnect on AWS EC2 using Portainer with your existing MongoDB Atlas database.

## Current Setup Analysis

✅ **Your Existing Configuration:**
- **Database**: MongoDB Atlas (cloud) - `mongodb+srv://lahari:***@travelconnect.jovulzu.mongodb.net/travelconnect`
- **Backend Port**: 3002 (not 3000)
- **Environment**: Already configured in `backend/.env`
- **Google Maps API**: Already configured
- **JWT**: Already configured with refresh tokens

## Deployment Methods

### Method 1: Git Repository Deployment (Recommended)

This method builds images directly from your Git repository in Portainer.

#### Step 1: Access Portainer
```
https://your-ec2-ip:9443
```

#### Step 2: Create New Stack from Git
1. Go to **Stacks** → **Add Stack**
2. Choose **Git Repository**
3. **Repository URL**: `https://github.com/your-username/your-repo.git`
4. **Reference**: `refs/heads/main` (or your branch)
5. **Compose path**: `portainer-git-stack.yml`

#### Step 3: Set Environment Variables
In the **Environment variables** section, add:

```env
# Required - MongoDB Atlas
MONGODB_URI=mongodb+srv://lahari:9R8En3qh7Csjd8Ve@travelconnect.jovulzu.mongodb.net/travelconnect?retryWrites=true&w=majority&appName=travelconnect

# Required - JWT Configuration
JWT_SECRET=travelconnect_super_secret_jwt_key_2024
JWT_REFRESH_SECRET=travelconnect_super_secret_refresh_key_2024

# Required - Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyAR6BJ14sWn5T9nn8Hy0C9XyqLUR7vF06k

# Required - CORS (Replace with your domain/IP)
FRONTEND_URL=http://your-ec2-public-ip
SOCKET_CORS_ORIGIN=http://your-ec2-public-ip

# Optional (defaults provided)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Step 4: Deploy
1. Click **Deploy the stack**
2. Portainer will:
   - Clone your repository
   - Build Docker images
   - Start containers
   - Set up networking

### Method 2: Pre-built Images

If you prefer to build images locally first:

#### Step 1: Build Images
```bash
# On your local machine or build server
git clone your-repo
cd travelconnect
./build-images.sh
docker push travelconnect-backend:latest
docker push travelconnect-frontend:latest
```

#### Step 2: Deploy in Portainer
1. Use `portainer-stack.yml` (not git version)
2. Set same environment variables as above

## Architecture After Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS EC2 Instance                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Portainer :9443                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Docker Containers                      │    │
│  │                                                     │    │
│  │  ┌─────────────┐           ┌─────────────┐          │    │
│  │  │    Nginx    │           │   Node.js   │          │    │
│  │  │  (Frontend) │ ──────────│  (Backend)  │          │    │
│  │  │   Port 80   │           │  Port 3002  │          │    │
│  │  └─────────────┘           └─────────────┘          │    │
│  │                                   │                 │    │
│  └───────────────────────────────────┼─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   MongoDB Atlas │
                            │   (Cloud DB)    │
                            └─────────────────┘
```

## Key Differences from Generic Setup

❌ **Removed**: MongoDB container (using Atlas)
✅ **Updated**: Port 3002 for backend
✅ **Configured**: Your existing environment variables
✅ **Optimized**: For your Atlas connection string

## Verification Steps

After deployment, verify:

### 1. Check Container Status
In Portainer → Containers:
- ✅ `travelconnect-backend-prod` - Running
- ✅ `travelconnect-frontend-prod` - Running

### 2. Test Endpoints
```bash
# Frontend
curl http://your-ec2-ip

# Backend API Health
curl http://your-ec2-ip:3002/api/health

# Through Nginx proxy
curl http://your-ec2-ip/api/health
```

### 3. Check Logs
In Portainer → Containers → [container] → Logs:
- Backend should show: "Server is running on port 3002"
- No MongoDB connection errors

## Environment Variables Reference

### Required Variables
```env
MONGODB_URI=mongodb+srv://lahari:***@travelconnect.jovulzu.mongodb.net/travelconnect?retryWrites=true&w=majority&appName=travelconnect
JWT_SECRET=travelconnect_super_secret_jwt_key_2024
JWT_REFRESH_SECRET=travelconnect_super_secret_refresh_key_2024
GOOGLE_MAPS_API_KEY=AIzaSyAR6BJ14sWn5T9nn8Hy0C9XyqLUR7vF06k
FRONTEND_URL=http://your-ec2-public-ip
SOCKET_CORS_ORIGIN=http://your-ec2-public-ip
```

### Optional Variables (with defaults)
```env
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Troubleshooting

### Common Issues

**1. Backend can't connect to MongoDB**
- ✅ Check `MONGODB_URI` is correct
- ✅ Verify Atlas IP whitelist includes 0.0.0.0/0
- ✅ Check Atlas user permissions

**2. Frontend shows 500 errors**
- ✅ Check backend container logs
- ✅ Verify backend is running on port 3002
- ✅ Check Nginx proxy configuration

**3. CORS errors**
- ✅ Update `FRONTEND_URL` with your domain/IP
- ✅ Update `SOCKET_CORS_ORIGIN` with your domain/IP

### Debug Commands

```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check containers
docker ps

# View logs
docker logs travelconnect-backend-prod
docker logs travelconnect-frontend-prod

# Test backend directly
docker exec -it travelconnect-backend-prod curl http://localhost:3002/api/health

# Check environment variables
docker exec -it travelconnect-backend-prod env | grep MONGODB_URI
```

## Updates and Maintenance

### Update from Git
In Portainer:
1. Go to **Stacks** → Your Stack
2. Click **Editor**
3. Click **Pull and redeploy**

### Manual Update
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

## Security Notes

1. **Environment Variables**: Never commit real credentials to Git
2. **Atlas Access**: Keep IP whitelist restrictive if possible
3. **JWT Secrets**: Use strong, unique secrets
4. **HTTPS**: Consider adding SSL certificates for production

## Success Criteria

✅ Frontend accessible at `http://your-ec2-ip`
✅ Backend API at `http://your-ec2-ip:3002/api/health`
✅ No MongoDB connection errors in logs
✅ File uploads working (check `/uploads/` endpoint)
✅ Real-time features working (Socket.IO)

---

🚀 **Your TravelConnect app is now running with MongoDB Atlas on AWS EC2!**
