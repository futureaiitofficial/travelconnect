# TravelConnect Docker Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying TravelConnect using Docker containers on AWS EC2 with Portainer management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS EC2 Instance                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Portainer :9443                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Docker Containers                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │   Nginx     │  │   Backend   │  │   MongoDB   │  │    │
│  │  │  Frontend   │  │   Node.js   │  │   Database  │  │    │
│  │  │   :80/:443  │  │    :3000    │  │   :27017    │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### AWS EC2 Instance Requirements
- **Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Storage**: 20GB+ SSD
- **OS**: Amazon Linux 2 or Ubuntu 20.04+
- **Security Groups**: Open ports 80, 443, 3000, 9443, 22

### Required Software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Portainer (already installed on port 9443)

## Installation Steps

### 1. Prepare EC2 Instance

```bash
# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Docker (if not already installed)
sudo yum install -y docker  # Amazon Linux
# OR
sudo apt install -y docker.io  # Ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
# Clone the repository
git clone <your-repository-url> travelconnect
cd travelconnect

# Create environment file from template
cp .env.example .env
```

### 3. Configure Environment Variables

Edit the `.env` file with your production settings:

```bash
nano .env
```

**Required Configuration:**
```env
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password_here
MONGO_DB_NAME=travelconnect

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRE=7d

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# CORS Configuration (Your domain or EC2 public IP)
CORS_ORIGIN=http://your-domain.com
```

### 4. Deploy Using Script

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 5. Manual Deployment (Alternative)

```bash
# Build and start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Portainer Deployment

### Access Portainer
1. Open browser to `https://your-ec2-ip:9443`
2. Login to Portainer

### Deploy via Portainer Stack

1. Go to **Stacks** → **Add Stack**
2. Name: `travelconnect`
3. Upload or paste the `docker-compose.prod.yml` content
4. Set environment variables in the **Environment variables** section
5. Click **Deploy the stack**

### Portainer Stack Configuration

**Environment Variables to set in Portainer:**
```
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DB_NAME=travelconnect
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRE=7d
GOOGLE_MAPS_API_KEY=your-api-key
CORS_ORIGIN=http://your-domain.com
```

## SSL/HTTPS Configuration

### 1. Generate SSL Certificates

```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to ssl directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
sudo chown $USER:$USER ssl/*
```

### 2. Update Nginx Configuration

Create `nginx-ssl.conf` for HTTPS:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        
        root /usr/share/nginx/html;
        index index.html;
        
        # ... rest of configuration
    }
}
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl http://your-domain.com/api/health

# Check container health
docker-compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs mongodb

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Container Management

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update and restart
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Clean up unused resources
docker system prune -a
```

### Database Backup

```bash
# Create backup
docker exec travelconnect-mongodb-prod mongodump --authenticationDatabase admin -u admin -p your_password --db travelconnect --out /data/backup

# Copy backup from container
docker cp travelconnect-mongodb-prod:/data/backup ./backup-$(date +%Y%m%d)
```

## Troubleshooting

### Common Issues

**1. Container fails to start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service-name]

# Check container status
docker ps -a
```

**2. Permission issues with uploads**
```bash
# Fix upload directory permissions
sudo chown -R 1001:1001 backend/uploads
sudo chmod -R 755 backend/uploads
```

**3. Database connection issues**
```bash
# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Verify MongoDB is accessible
docker exec -it travelconnect-mongodb-prod mongosh -u admin -p your_password
```

**4. Frontend not accessible**
```bash
# Check Nginx logs
docker-compose -f docker-compose.prod.yml logs frontend

# Test backend API directly
curl http://localhost:3000/api/health
```

### Performance Optimization

**1. Resource Limits**
- Monitor container resource usage in Portainer
- Adjust memory limits in docker-compose.prod.yml if needed

**2. Database Optimization**
```bash
# Enable MongoDB indexes (if needed)
docker exec -it travelconnect-mongodb-prod mongosh -u admin -p your_password travelconnect
```

**3. CDN Integration**
- Consider using AWS CloudFront for static assets
- Update CORS settings accordingly

## Security Considerations

1. **Firewall Configuration**
   ```bash
   # Only allow necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw allow 9443  # Portainer
   sudo ufw enable
   ```

2. **Regular Updates**
   ```bash
   # Update system regularly
   sudo yum update -y   # Amazon Linux
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   
   # Update Docker images
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Environment Variables**
   - Use strong passwords
   - Rotate JWT secrets regularly
   - Never commit .env file to repository

## Backup Strategy

### Automated Backup Script

Create `/home/ec2-user/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"
mkdir -p $BACKUP_DIR

# Database backup
docker exec travelconnect-mongodb-prod mongodump --authenticationDatabase admin -u admin -p $MONGO_ROOT_PASSWORD --db travelconnect --out /tmp/backup_$DATE

# Copy from container
docker cp travelconnect-mongodb-prod:/tmp/backup_$DATE $BACKUP_DIR/

# Upload backup (files)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "backup_*" -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

### Schedule Backups

```bash
# Add to crontab
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /home/ec2-user/backup.sh >> /home/ec2-user/backup.log 2>&1
```

## Support

For issues and support:
1. Check logs using commands above
2. Review Docker container status in Portainer
3. Verify environment configuration
4. Check AWS Security Group settings
5. Ensure all required ports are open

## Useful Commands Reference

```bash
# Deployment
./deploy.sh

# Container management
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml restart
docker-compose -f docker-compose.prod.yml logs -f

# System maintenance
docker system prune -a
docker volume prune
docker network prune

# Database access
docker exec -it travelconnect-mongodb-prod mongosh -u admin -p your_password travelconnect

# File permissions
sudo chown -R 1001:1001 backend/uploads
sudo chmod -R 755 backend/uploads
```

This deployment guide ensures a robust, scalable, and maintainable Docker setup for TravelConnect on AWS EC2 with Portainer management.
