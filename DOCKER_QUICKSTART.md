# TravelConnect Docker Quick Start

## 🚀 Quick Deployment Guide

### Local Development
```bash
# 1. Clone and setup
git clone <repository-url> travelconnect
cd travelconnect

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Start development environment
docker-compose up -d

# 4. Access application
# Frontend: http://localhost
# Backend API: http://localhost:3000
# MongoDB: mongodb://localhost:27017
```

### AWS EC2 Production Deployment

#### Method 1: Automated Script
```bash
# 1. Clone repository on EC2
git clone <repository-url> travelconnect
cd travelconnect

# 2. Configure environment
cp .env.example .env
nano .env  # Add your production settings

# 3. Deploy with one command
./deploy.sh
```

#### Method 2: Portainer UI
1. Access Portainer at `https://your-ec2-ip:9443`
2. Go to **Stacks** → **Add Stack**
3. Copy content from `portainer-stack.yml`
4. Set environment variables:
   ```
   MONGO_ROOT_USERNAME=admin
   MONGO_ROOT_PASSWORD=your_secure_password
   MONGO_DB_NAME=travelconnect
   JWT_SECRET=your-jwt-secret-here
   GOOGLE_MAPS_API_KEY=your-api-key
   CORS_ORIGIN=http://your-domain.com
   ```
5. Deploy the stack

#### Method 3: Manual Docker Compose
```bash
# 1. Build images
./build-images.sh

# 2. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 3. Check status
docker-compose -f docker-compose.prod.yml ps
```

## 📋 Prerequisites

### AWS EC2 Requirements
- **Instance**: t3.medium+ (2 vCPU, 4GB RAM)
- **Storage**: 20GB+ SSD
- **Security Groups**: Ports 80, 443, 3000, 9443, 22
- **Software**: Docker, Docker Compose, Git

### Environment Variables
Create `.env` file with:
```env
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DB_NAME=travelconnect
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRE=7d
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
CORS_ORIGIN=http://your-domain.com
```

## 🔧 Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull origin main
./deploy.sh

# Check health
curl http://your-domain.com/api/health

# Clean up
docker system prune -a
```

## 🎯 Architecture

```
Internet → Nginx (Frontend) → Node.js (Backend) → MongoDB
           Port 80/443      Port 3000          Port 27017
```

## 📚 Full Documentation

For comprehensive deployment guide, see [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)

## ✅ Verification

After deployment, verify:
- [ ] Frontend accessible: `http://your-domain.com`
- [ ] Backend health: `http://your-domain.com/api/health`
- [ ] All containers healthy: `docker-compose ps`
- [ ] Logs show no errors: `docker-compose logs`

## 🆘 Troubleshooting

**Container won't start?**
```bash
docker-compose -f docker-compose.prod.yml logs [service-name]
```

**Permission issues?**
```bash
sudo chown -R 1001:1001 backend/uploads
sudo chmod -R 755 backend/uploads
```

**Database connection failed?**
```bash
docker exec -it travelconnect-mongodb-prod mongosh -u admin -p your_password
```

---

🎉 **You're ready to deploy TravelConnect with Docker!**
