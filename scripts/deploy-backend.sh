#!/bin/bash

# ================================
# Study Teddy Backend Deployment Script
# ================================
# This script handles Railway deployment for the NestJS backend

set -e

echo "🚀 Starting Study Teddy Backend Deployment..."

# Check if we're in the right directory
if [ ! -f "apps/backend/package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Navigate to backend directory
cd apps/backend

echo "🔍 Validating environment variables..."

# Check required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "JWT_SECRET"
    "OPENAI_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "FRONTEND_URL"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  Warning: $var is not set"
    else
        echo "✅ $var is configured"
    fi
done

echo "🏗️  Building application..."
npm run build

echo "🔍 Running pre-deployment checks..."
# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "🗄️  Running database migrations..."
npm run db:push

echo "🚀 Deploying to Railway..."

# Deploy to Railway
railway up

echo "✅ Backend deployment completed!"

# Return to project root
cd ../..

echo "🎉 Study Teddy backend is now live!"