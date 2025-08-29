#!/bin/bash

# TravelConnect Docker Image Build Script
# Run this script to build Docker images before deployment

set -e

echo "🏗️  Building TravelConnect Docker Images..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Build Backend Image
print_status "Building backend image..."
docker build -t travelconnect-backend:latest ./backend/
if [ $? -eq 0 ]; then
    print_status "✅ Backend image built successfully!"
else
    print_error "❌ Backend image build failed!"
    exit 1
fi

# Build Frontend Image
print_status "Building frontend image..."
docker build -t travelconnect-frontend:latest -f Dockerfile.frontend .
if [ $? -eq 0 ]; then
    print_status "✅ Frontend image built successfully!"
else
    print_error "❌ Frontend image build failed!"
    exit 1
fi

# List built images
print_status "Built images:"
docker images | grep travelconnect

echo ""
print_status "🎉 All images built successfully!"
echo ""
echo "You can now deploy using:"
echo "  - ./deploy.sh (for docker-compose deployment)"
echo "  - Use portainer-stack.yml in Portainer UI"
echo "  - docker-compose -f docker-compose.prod.yml up -d"
echo ""
print_status "Build completed! 🚀"
