# TravelConnect Portainer Deployment Guide

## 🐳 Overview

This guide explains how to deploy the TravelConnect application using Portainer, a powerful Docker management interface. The application consists of:

- **Frontend**: Angular application served by Nginx
- **Backend**: Node.js/Express API
- **Database**: MongoDB

## 📋 Prerequisites

- Portainer CE/EE installed and running
- Docker Engine 20.10+
- At least 2GB RAM available
- Ports 27017, 3002, and 4200 available
- Git access to clone the repository

## 🚀 Quick Deployment in Portainer

### Step 1: Access Portainer
1. Open your Portainer web interface (usually `http://your-server:9000`)
2. Login with your credentials
3. Navigate to your local Docker environment

### Step 2: Create a New Stack
1. Click on **"Stacks"** in the left sidebar
2. Click **"Add stack"**
3. Give your stack a name: `travelconnect`
4. Choose **"Web editor"** as the build method

### Step 3: Copy Docker Compose Configuration
Copy and paste the following Docker Compose configuration into the web editor:

```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: travelconnect-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: travelconnect123
      MONGO_INITDB_DATABASE: travelconnect
    volumes:
      - mongodb_data:/data/db
      - ./backend/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    ports:
      - "27017:27017"
    networks:
      - travelconnect-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Backend API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: travelconnect-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:travelconnect123@mongodb:27017/travelconnect?authSource=admin
      JWT_SECRET: your-super-secret-jwt-key-change-this-in-production
      PORT: 3002
      CORS_ORIGIN: http://localhost:4200,http://frontend:80
    volumes:
      - backend_uploads:/app/uploads
    ports:
      - "3002:3002"
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - travelconnect-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3002/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Frontend Application
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: travelconnect-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    ports:
      - "4200:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - travelconnect-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  mongodb_data:
    driver: local
  backend_uploads:
    driver: local

networks:
  travelconnect-network:
    driver: bridge
```

### Step 4: Deploy the Stack
1. Click **"Deploy the stack"**
2. Wait for the build process to complete (this may take 5-10 minutes)
3. Monitor the deployment in the **"Events"** tab

## 📁 Repository Setup

### Option 1: Clone Repository to Server
```bash
# SSH into your server
ssh user@your-server

# Clone the repository
git clone https://github.com/futureaiitofficial/travelconnect.git
cd travelconnect

# Make sure you're in the correct directory
ls -la
# Should show: docker-compose.yml, Dockerfile.frontend, backend/, src/, etc.
```

### Option 2: Use Git Repository in Portainer
1. In the stack configuration, change the build context to use Git:
```yaml
backend:
  build:
    context: https://github.com/futureaiitofficial/travelconnect.git#main
    dockerfile: backend/Dockerfile
frontend:
  build:
    context: https://github.com/futureaiitofficial/travelconnect.git#main
    dockerfile: Dockerfile.frontend
```

## 🔧 Configuration

### Environment Variables
You can customize the environment variables in the Portainer stack configuration:

#### Security Variables (Important to Change)
```yaml
environment:
  JWT_SECRET: your-very-secure-jwt-secret-key-here
  MONGO_INITDB_ROOT_PASSWORD: your-secure-mongodb-password
```

#### CORS Configuration
```yaml
environment:
  CORS_ORIGIN: https://your-domain.com,http://your-domain.com
  FRONTEND_URL: https://your-domain.com
```

### Port Configuration
Default ports (can be changed in Portainer):
- **4200**: Frontend (Nginx)
- **3002**: Backend API
- **27017**: MongoDB

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
All services include health checks that Portainer will monitor:
- **Backend**: `/api/health` endpoint
- **Frontend**: HTTP response check
- **MongoDB**: Database connectivity check

## 🔄 Updates and Maintenance

### Update Application
1. **Pull Latest Code**:
   ```bash
   cd /path/to/travelconnect
   git pull origin main
   ```

2. **Redeploy in Portainer**:
   - Go to **"Stacks"** → **"travelconnect"**
   - Click **"Editor"**
   - Update the configuration if needed
   - Click **"Update the stack"**

### Backup and Restore

#### Database Backup
```bash
# Create backup
docker exec travelconnect-mongodb mongodump --out /backup

# Copy backup from container
docker cp travelconnect-mongodb:/backup ./backup
```

#### Database Restore
```bash
# Copy backup to container
docker cp ./backup travelconnect-mongodb:/backup

# Restore database
docker exec travelconnect-mongodb mongorestore /backup
```

## 🔒 Security Considerations

### 1. Environment Variables
- Change default passwords in production
- Use strong JWT secrets
- Update CORS origins for your domain

### 2. Network Security
- Use reverse proxy (Nginx Proxy Manager) for SSL
- Restrict MongoDB access to internal network
- Configure firewall rules

### 3. Data Persistence
- MongoDB data is persisted in Docker volumes
- Upload files are persisted in volumes
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
```yaml
environment:
  CORS_ORIGIN: https://your-domain.com
  FRONTEND_URL: https://your-domain.com
  SOCKET_CORS_ORIGIN: https://your-domain.com
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
- **Check MongoDB logs**: `travelconnect-mongodb` container → **"Logs"**
- **Verify network connectivity**: Check if containers can communicate

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
docker logs travelconnect-mongodb
```

#### Access Container Console
```bash
# In Portainer: Container → Console
# Or via SSH:
docker exec -it travelconnect-backend sh
docker exec -it travelconnect-mongodb mongosh
```

#### Check Service Health
```bash
# Test API health
curl http://localhost:3002/api/health

# Test frontend
curl http://localhost:4200

# Test MongoDB
docker exec travelconnect-mongodb mongosh --eval "db.adminCommand('ping')"
```

## 📈 Production Recommendations

### 1. Resource Allocation
- **MongoDB**: 1GB RAM minimum
- **Backend**: 512MB RAM minimum
- **Frontend**: 256MB RAM minimum
- **Total**: 2GB+ RAM recommended

### 2. Monitoring Setup
- Use Portainer's built-in monitoring
- Set up resource alerts
- Monitor disk usage for uploads

### 3. Backup Strategy
- Regular MongoDB backups
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
- **MongoDB Documentation**: https://docs.mongodb.com/

---

## 🎯 Quick Reference

### Service URLs
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3002
- **MongoDB**: localhost:27017

### Container Names
- `travelconnect-frontend`
- `travelconnect-backend`
- `travelconnect-mongodb`

### Volume Names
- `travelconnect_mongodb_data`
- `travelconnect_backend_uploads`

### Network Name
- `travelconnect_travelconnect-network`

---

**Happy Deploying with Portainer! 🚀**
