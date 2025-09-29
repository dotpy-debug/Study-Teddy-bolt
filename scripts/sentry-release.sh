#!/bin/bash

# Sentry Release Management Script
# This script creates releases, uploads source maps, and sets up deploys

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
VERSION=""
SENTRY_ORG="studyteddy"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --version VERSION    Release version (required)"
    echo "  -e, --environment ENV    Environment (default: production)"
    echo "  -o, --org ORG           Sentry organization (default: studyteddy)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -v 1.2.0"
    echo "  $0 -v 1.2.0 -e staging"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -o|--org)
            SENTRY_ORG="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$VERSION" ]; then
    print_error "Version is required. Use -v or --version to specify."
    show_usage
    exit 1
fi

# Check if sentry-cli is installed
if ! command -v sentry-cli &> /dev/null; then
    print_error "sentry-cli is not installed. Please install it first:"
    echo "  npm install -g @sentry/cli"
    exit 1
fi

# Check for required environment variables
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
    print_error "SENTRY_AUTH_TOKEN environment variable is not set"
    exit 1
fi

print_status "Starting Sentry release process..."
print_status "Version: $VERSION"
print_status "Environment: $ENVIRONMENT"
print_status "Organization: $SENTRY_ORG"

# Function to create release for a project
create_project_release() {
    local project=$1
    local app_path=$2

    print_status "Processing $project..."

    # Create release
    print_status "Creating release $VERSION for $project..."
    if sentry-cli releases new -p "$project" "$VERSION"; then
        print_success "Release $VERSION created for $project"
    else
        print_error "Failed to create release for $project"
        return 1
    fi

    # Upload source maps if build directory exists
    if [ -d "$app_path/.next" ] || [ -d "$app_path/dist" ]; then
        print_status "Uploading source maps for $project..."

        # For Next.js frontend
        if [ -d "$app_path/.next" ]; then
            if sentry-cli sourcemaps upload --release="$VERSION" --org="$SENTRY_ORG" --project="$project" "$app_path/.next"; then
                print_success "Source maps uploaded for $project (Next.js)"
            else
                print_warning "Failed to upload source maps for $project"
            fi
        fi

        # For NestJS backend
        if [ -d "$app_path/dist" ]; then
            if sentry-cli sourcemaps upload --release="$VERSION" --org="$SENTRY_ORG" --project="$project" "$app_path/dist"; then
                print_success "Source maps uploaded for $project (NestJS)"
            else
                print_warning "Failed to upload source maps for $project"
            fi
        fi
    else
        print_warning "No build directory found for $project. Skipping source map upload."
    fi

    # Set commits (if in git repository)
    if git rev-parse --git-dir > /dev/null 2>&1; then
        print_status "Setting commits for release $VERSION..."
        if sentry-cli releases set-commits --auto "$VERSION"; then
            print_success "Commits set for release $VERSION"
        else
            print_warning "Failed to set commits for release $VERSION"
        fi
    fi

    # Create deploy
    print_status "Creating deploy for $project in $ENVIRONMENT..."
    if sentry-cli releases deploys "$VERSION" new -e "$ENVIRONMENT"; then
        print_success "Deploy created for $project in $ENVIRONMENT"
    else
        print_warning "Failed to create deploy for $project"
    fi

    # Finalize release
    print_status "Finalizing release $VERSION for $project..."
    if sentry-cli releases finalize "$VERSION"; then
        print_success "Release $VERSION finalized for $project"
    else
        print_warning "Failed to finalize release $VERSION for $project"
    fi
}

# Create releases for both frontend and backend
print_status "Creating releases for Study Teddy applications..."

# Frontend release
if [ -d "apps/frontend" ]; then
    create_project_release "studyteddy-frontend" "apps/frontend"
else
    print_warning "Frontend directory not found. Skipping frontend release."
fi

# Backend release
if [ -d "apps/backend" ]; then
    create_project_release "studyteddy-backend" "apps/backend"
else
    print_warning "Backend directory not found. Skipping backend release."
fi

# Final status
print_success "Sentry release process completed!"
print_status "Release $VERSION is now available in Sentry for environment: $ENVIRONMENT"

# Provide next steps
echo ""
print_status "Next steps:"
echo "1. Monitor the deployment in Sentry dashboard"
echo "2. Check for any new issues or regressions"
echo "3. Set up alerts for error rate thresholds"
echo ""
print_status "Sentry dashboard: https://sentry.io/organizations/$SENTRY_ORG/"