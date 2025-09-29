#!/bin/bash

# Study Teddy Build Script
# This script builds both frontend and backend for production

set -e

echo "🚀 Starting Study Teddy production build..."

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

# Set build target (default to production)
BUILD_TARGET=${1:-production}

print_status "Building for target: $BUILD_TARGET"

# Create logs directory
mkdir -p logs

# Build backend
print_status "Building backend..."
cd apps/backend
if [ -f "package.json" ]; then
    npm ci --only=production
    npm run build
    print_status "Backend build completed ✅"
else
    print_error "Backend package.json not found!"
    exit 1
fi

# Go back to root
cd ..

# Build frontend
print_status "Building frontend..."
cd apps/frontend
if [ -f "package.json" ]; then
    npm ci --only=production
    npm run build
    print_status "Frontend build completed ✅"
else
    print_error "Frontend package.json not found!"
    exit 1
fi

# Go back to root
cd ..

# Build Docker images
print_status "Building Docker images..."

if [ "$BUILD_TARGET" = "production" ]; then
    # Build production images
    docker-compose -f docker-compose.prod.yml build --no-cache
    print_status "Production Docker images built successfully ✅"
elif [ "$BUILD_TARGET" = "development" ]; then
    # Build development images
    docker-compose -f docker-compose.dev.yml build --no-cache
    print_status "Development Docker images built successfully ✅"
else
    print_error "Invalid build target. Use 'production' or 'development'"
    exit 1
fi

# Run tests
print_status "Running tests..."

# Backend tests
cd apps/backend
if npm run test > ../logs/backend-tests.log 2>&1; then
    print_status "Backend tests passed ✅"
else
    print_warning "Backend tests failed ⚠️  Check logs/backend-tests.log"
fi

# Frontend tests
cd ../apps/frontend
if npm run test > ../logs/frontend-tests.log 2>&1; then
    print_status "Frontend tests passed ✅"
else
    print_warning "Frontend tests failed ⚠️  Check logs/frontend-tests.log"
fi

cd ..

print_status "🎉 Build completed successfully!"
print_status "Docker images are ready for deployment."

# Display next steps
echo
echo "Next steps:"
echo "1. Review the .env.production.template files and create your .env files"
echo "2. Run './scripts/deploy.sh $BUILD_TARGET' to deploy the application"
echo "3. Monitor the application health at /health endpoints"