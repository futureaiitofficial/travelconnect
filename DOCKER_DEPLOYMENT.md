# TravelConnect Docker Deployment Guide

## 🐳 Overview

This guide explains how to deploy the TravelConnect application using Docker containers. The application consists of:

- **Frontend**: Angular application served by Nginx
- **Backend**: Node.js/Express API
- **Database**: MongoDB

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Ports 27017, 3002, and 4200 available

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/futureaiitofficial/travelconnect.git
cd travelconnect
```

### 2. Configure Environment Variables
Copy the production environment file:
```bash
cp .env.production .env
```

Edit `.env` and update the following variables:
- `JWT_SECRET`: Generate a strong secret key
- `MONGODB_URI`: Update if using external MongoDB
- `CORS_ORIGIN`: Update with your domain

### 3. Build and Start Containers
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Access the Application
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3002
- **MongoDB**: localhost:27017

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    MongoDB      │
│   (Nginx)       │◄──►│   (Node.js)     │◄──►│   (Database)    │
│   Port: 4200    │    │   Port: 3002    │    │   Port: 27017   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 File Structure

```
travelconnect/
├── docker-compose.yml          # Main orchestration file
├── Dockerfile.frontend         # Frontend container
├── .dockerignore              # Frontend ignore rules
├── .env.production            # Production environment template
├── backend/
│   ├── Dockerfile             # Backend container
│   ├── .dockerignore          # Backend ignore rules
│   ├── init-mongo.js          # MongoDB initialization
│   └── ...                    # Backend source code
└── src/                       # Frontend source code
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
NODE_ENV=production
PORT=3002
MONGODB_URI=mongodb://travelconnect_user:travelconnect_app_password@mongodb:27017/travelconnect?authSource=travelconnect
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:4200,http://frontend:80
```

#### MongoDB
```bash
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=travelconnect123
MONGO_INITDB_DATABASE=travelconnect
```

### Ports
- **4200**: Frontend (Nginx)
- **3002**: Backend API
- **27017**: MongoDB

## 🛠️ Management Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build frontend
```

### Health Checks
```bash
# Check service health
docker-compose ps

# Test API health
curl http://localhost:3002/api/health

# Test frontend
curl http://localhost:4200
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

## 📊 Monitoring

### Health Checks
All services include health checks:
- **Backend**: `/api/health` endpoint
- **Frontend**: HTTP response check
- **MongoDB**: Database connectivity check

### Logs
```bash
# Real-time logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f backend
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Database Backup
```bash
# Backup MongoDB
docker exec travelconnect-mongodb mongodump --out /backup

# Copy backup from container
docker cp travelconnect-mongodb:/backup ./backup
```

### Database Restore
```bash
# Copy backup to container
docker cp ./backup travelconnect-mongodb:/backup

# Restore MongoDB
docker exec travelconnect-mongodb mongorestore /backup
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :4200
netstat -tulpn | grep :3002
netstat -tulpn | grep :27017
```

#### 2. Container Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check container status
docker-compose ps
```

#### 3. Database Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec travelconnect-backend node -e "console.log(process.env.MONGODB_URI)"
```

#### 4. Frontend Build Issues
```bash
# Check build logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

## 🔗 Integration with Nginx Proxy Manager

Since you're using Nginx Proxy Manager, configure it to proxy requests:

### Frontend Proxy
- **Domain**: your-domain.com
- **Forward Hostname/IP**: localhost
- **Forward Port**: 4200
- **SSL**: Enable Let's Encrypt

### Backend Proxy
- **Domain**: api.your-domain.com
- **Forward Hostname/IP**: localhost
- **Forward Port**: 3002
- **SSL**: Enable Let's Encrypt

### Environment Updates
After setting up the proxy, update the environment variables:
```bash
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com
SOCKET_CORS_ORIGIN=https://your-domain.com
```

## 📈 Production Recommendations

1. **Use External MongoDB** for better performance
2. **Implement Redis** for session management
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure automated backups**
5. **Use Docker secrets** for sensitive data
6. **Implement CI/CD** pipeline
7. **Set up logging aggregation**

## 🆘 Support

For issues and questions:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Check network connectivity
4. Review this documentation

---

**Happy Deploying! 🚀**
