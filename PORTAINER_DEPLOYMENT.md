# TravelConnect Portainer Deployment Guide

## 🐳 Overview

This guide explains how to deploy the TravelConnect application using Portainer, a powerful Docker management interface. The application consists of:

- **Frontend**: Angular application served by Nginx
- **Backend**: Node.js/Express API
- **Database**: MongoDB Atlas (Cloud Database)

## 📋 Prerequisites

- Portainer CE/EE installed and running
- Docker Engine 20.10+
- At least 1GB RAM available
- Ports 3002 and 4200 available
- MongoDB Atlas cluster set up
- Git access to the repository

## 🚀 Quick Deployment in Portainer

### Step 1: Access Portainer
1. Open your Portainer web interface (usually `http://your-server:9000`)
2. Login with your credentials
3. Navigate to your local Docker environment

### Step 2: Create a New Stack
1. Click on **"Stacks"** in the left sidebar
2. Click **"Add stack"**
3. Give your stack a name: `travelconnect`
4. Choose **"Repository"** as the build method

### Step 3: Configure Git Repository Settings

#### Repository Configuration
- **Repository URL**: `https://github.com/futureaiitofficial/travelconnect.git`
- **Repository Reference**: `main`
- **Compose Path**: `docker-compose.yml`

#### Environment Variables
Add these environment variables in the Portainer stack configuration:

**Required Variables:**
```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/travelconnect?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Optional Variables:**
```
NODE_ENV=production
CORS_ORIGIN=http://localhost:4200,http://frontend:80
FRONTEND_URL=http://localhost:4200
BACKEND_PORT=3002
FRONTEND_PORT=4200
PORT=3002
```

### Step 4: Deploy the Stack
1. Click **"Deploy the stack"**
2. Wait for the build process to complete (this may take 5-10 minutes)
3. Monitor the deployment in the **"Events"** tab

## 🔧 Configuration

### Environment Variables Explained

#### Required Variables
- **`MONGODB_URI`**: Your MongoDB Atlas connection string
  - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
  - Get this from your MongoDB Atlas dashboard

- **`JWT_SECRET`**: Secret key for JWT token generation
  - Use a strong, random string
  - Example: `my-super-secret-jwt-key-2024-production`

#### Optional Variables
- **`NODE_ENV`**: Environment mode (default: `production`)
- **`CORS_ORIGIN`**: Allowed origins for CORS (default: `http://localhost:4200,http://frontend:80`)
- **`FRONTEND_URL`**: Frontend URL for backend configuration (default: `http://localhost:4200`)
- **`BACKEND_PORT`**: Port for backend API (default: `3002`)
- **`FRONTEND_PORT`**: Port for frontend application (default: `4200`)
- **`PORT`**: Internal backend port (default: `3002`)

### Port Configuration
Default ports (can be changed via environment variables):
- **4200**: Frontend (Nginx)
- **3002**: Backend API

## 📊 Monitoring in Portainer

### Stack Overview
- Navigate to **"Stacks"** → **"travelconnect"**
- View overall stack status and health

### Container Management
- Click on individual containers to:
  - View logs in real-time
  - Access container console
  - Restart containers
  - View resource usage

### Health Checks
Both services include health checks that Portainer will monitor:
- **Backend**: `/api/health` endpoint
- **Frontend**: HTTP response check

## 🔄 Updates and Maintenance

### Update Application
1. **Automatic Updates**: When you push changes to the `main` branch, Portainer can automatically pull the latest code
2. **Manual Updates**: 
   - Go to **"Stacks"** → **"travelconnect"**
   - Click **"Editor"**
   - Update the configuration if needed
   - Click **"Update the stack"**

### Backup and Restore

#### Database Backup (MongoDB Atlas)
- Use MongoDB Atlas built-in backup features
- Or use MongoDB Compass to export data

#### Upload Files Backup
```bash
# Backup uploads
docker cp travelconnect-backend:/app/uploads ./backup-uploads

# Restore uploads
docker cp ./backup-uploads travelconnect-backend:/app/uploads
```

## 🔒 Security Considerations

### 1. Environment Variables
- Use strong JWT secrets
- Keep MongoDB Atlas credentials secure
- Update CORS origins for your domain

### 2. Network Security
- Use reverse proxy (Nginx Proxy Manager) for SSL
- Configure firewall rules
- Restrict access to backend API

### 3. Data Persistence
- Upload files are persisted in Docker volumes
- Database is managed by MongoDB Atlas
- Regular backups recommended

## 🔗 Integration with Nginx Proxy Manager

### Frontend Proxy Configuration
1. **Domain**: your-domain.com
2. **Forward Hostname/IP**: localhost
3. **Forward Port**: 4200
4. **SSL**: Enable Let's Encrypt
5. **Force SSL**: Enable
6. **WebSocket Support**: Enable

### Backend Proxy Configuration
1. **Domain**: api.your-domain.com
2. **Forward Hostname/IP**: localhost
3. **Forward Port**: 3002
4. **SSL**: Enable Let's Encrypt
5. **Force SSL**: Enable

### Environment Updates
After setting up the proxy, update the stack environment variables:
```
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
SOCKET_CORS_ORIGIN=https://your-domain.com
```

## 🚨 Troubleshooting

### Common Issues in Portainer

#### 1. Build Failures
- **Check logs**: Click on the failing container → **"Logs"**
- **Common causes**:
  - Network connectivity issues
  - Insufficient disk space
  - Memory constraints

#### 2. Container Won't Start
- **Check container logs**: Container → **"Logs"**
- **Check resource usage**: Container → **"Stats"**
- **Verify environment variables**: Stack → **"Editor"**

#### 3. Database Connection Issues
- **Verify MongoDB Atlas connection string**
- **Check network connectivity**
- **Verify MongoDB Atlas IP whitelist**

#### 4. Frontend Build Issues
- **Check build logs**: `travelconnect-frontend` container → **"Logs"**
- **Verify source code**: Ensure all files are present

### Useful Portainer Commands

#### View Container Logs
```bash
# In Portainer: Container → Logs
# Or via SSH:
docker logs travelconnect-backend
docker logs travelconnect-frontend
```

#### Access Container Console
```bash
# In Portainer: Container → Console
# Or via SSH:
docker exec -it travelconnect-backend sh
```

#### Check Service Health
```bash
# Test API health
curl http://localhost:3002/api/health

# Test frontend
curl http://localhost:4200
```

## 📈 Production Recommendations

### 1. Resource Allocation
- **Backend**: 512MB RAM minimum
- **Frontend**: 256MB RAM minimum
- **Total**: 1GB+ RAM recommended

### 2. Monitoring Setup
- Use Portainer's built-in monitoring
- Set up resource alerts
- Monitor disk usage for uploads

### 3. Backup Strategy
- MongoDB Atlas automatic backups
- Volume backups for uploads
- Configuration backups

### 4. Security Enhancements
- Use Docker secrets for sensitive data
- Implement network segmentation
- Regular security updates

## 🆘 Support

### Getting Help
1. **Check Portainer logs** first
2. **Verify configuration** in stack editor
3. **Check resource usage** in container stats
4. **Review this documentation**

### Useful Links
- **Portainer Documentation**: https://docs.portainer.io/
- **Docker Documentation**: https://docs.docker.com/
- **MongoDB Atlas Documentation**: https://docs.atlas.mongodb.com/

---

## 🎯 Quick Reference

### Service URLs
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3002

### Container Names
- `travelconnect-frontend`
- `travelconnect-backend`

### Volume Names
- `travelconnect_backend_uploads`

### Network Name
- `travelconnect_travelconnect-network`

### Required Environment Variables
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/travelconnect?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

**Happy Deploying with Portainer! 🚀**
