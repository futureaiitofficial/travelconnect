#!/bin/bash

# TravelConnect Docker Deployment Script for AWS EC2
# Make sure to run this script with sudo privileges

set -e

echo "🚀 Starting TravelConnect Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before running again."
        exit 1
    else
        print_error ".env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        print_error "Port $port is already in use. Please stop the service using this port."
        return 1
    fi
    return 0
}

# Check required ports
print_status "Checking port availability..."
check_port 80 || exit 1
check_port 3000 || exit 1
check_port 27017 || exit 1

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p ssl
mkdir -p backend/uploads/{posts,profile,trips}
mkdir -p logs

# Set proper permissions
print_status "Setting permissions..."
chmod +x deploy.sh
sudo chown -R $USER:$USER backend/uploads
sudo chmod -R 755 backend/uploads

# Pull latest changes (if in git repo)
if [ -d .git ]; then
    print_status "Pulling latest changes..."
    git pull origin main || print_warning "Could not pull latest changes"
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Remove old images (optional)
read -p "Do you want to remove old images to save space? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Removing old images..."
    docker image prune -af || true
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."
if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
    print_status "✅ Services are healthy!"
else
    print_warning "Some services might not be healthy. Check logs:"
    echo "docker-compose -f docker-compose.prod.yml logs"
fi

# Display service status
print_status "Service Status:"
docker-compose -f docker-compose.prod.yml ps

# Display useful information
echo ""
print_status "🎉 Deployment completed!"
echo ""
echo "Frontend URL: http://$(curl -s ifconfig.me || echo 'localhost')"
echo "Backend API: http://$(curl -s ifconfig.me || echo 'localhost'):3000"
echo "MongoDB: mongodb://localhost:27017"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  Restart services: docker-compose -f docker-compose.prod.yml restart"
echo "  Update services: ./deploy.sh"
echo ""
print_status "Deployment completed successfully! 🚀"
