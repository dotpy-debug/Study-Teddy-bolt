#!/bin/bash

# ================================
# Study Teddy Frontend Deployment Script
# ================================
# This script handles Vercel deployment for the Next.js frontend

set -e

echo "🚀 Starting Study Teddy Frontend Deployment..."

# Check if we're in the right directory
if [ ! -f "apps/frontend/package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd apps/frontend

echo "🔍 Validating environment variables..."

# Check required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_API_URL"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET"
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
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
if [ ! -d ".next" ]; then
    echo "❌ Build failed - .next directory not found"
    exit 1
fi

echo "🚀 Deploying to Vercel..."

# Deploy based on environment
if [ "$1" = "production" ]; then
    echo "📦 Deploying to production..."
    vercel --prod --yes
elif [ "$1" = "preview" ]; then
    echo "📦 Deploying to preview..."
    vercel --yes
else
    echo "📦 Deploying to preview (default)..."
    vercel --yes
fi

echo "✅ Frontend deployment completed!"

# Return to project root
cd ../..

echo "🎉 Study Teddy frontend is now live!"