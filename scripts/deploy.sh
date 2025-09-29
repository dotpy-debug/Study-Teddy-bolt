#!/bin/bash

# ================================
# Study Teddy Full Stack Deployment Script
# ================================
# This script handles deployment of both frontend and backend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment
validate_environment() {
    print_status "Validating deployment environment..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "apps/frontend" ] || [ ! -d "apps/backend" ]; then
        print_error "Must run from project root directory with apps/frontend and apps/backend"
        exit 1
    fi
    
    # Check required tools
    if ! command_exists "node"; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command_exists "npm"; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    print_success "Environment validation passed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install frontend dependencies
    cd apps/frontend
    npm install
    cd ../..
    
    # Install backend dependencies
    cd apps/backend
    npm install
    cd ../..
    
    print_success "Dependencies installed"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Run backend tests
    cd apps/backend
    npm run test
    cd ../..
    
    # Run frontend tests
    cd apps/frontend
    npm run test
    cd ../..
    
    print_success "All tests passed"
}

# Function to deploy backend
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    # Check if Railway CLI is installed
    if ! command_exists "railway"; then
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    cd apps/backend
    
    # Build the application
    print_status "Building backend application..."
    npm run build
    
    # Run database migrations
    print_status "Running database migrations..."
    npm run db:push
    
    # Deploy to Railway
    print_status "Deploying to Railway..."
    railway up
    
    cd ../..
    
    print_success "Backend deployed successfully"
}

# Function to deploy frontend
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command_exists "vercel"; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    cd apps/frontend
    
    # Build the application
    print_status "Building frontend application..."
    npm run build
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    cd ../..
    
    print_success "Frontend deployed successfully"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Add health check logic here
    print_warning "Manual verification required - check deployment URLs"
    
    print_success "Deployment verification completed"
}

# Main deployment function
main() {
    echo "================================"
    echo "🚀 Study Teddy Deployment Script"
    echo "================================"
    
    # Parse command line arguments
    ENVIRONMENT=${1:-preview}
    COMPONENT=${2:-all}
    SKIP_TESTS=${3:-false}
    
    print_status "Environment: $ENVIRONMENT"
    print_status "Component: $COMPONENT"
    print_status "Skip tests: $SKIP_TESTS"
    
    # Validate environment
    validate_environment
    
    # Install dependencies
    install_dependencies
    
    # Run tests (unless skipped)
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    # Deploy based on component selection
    case $COMPONENT in
        "backend")
            deploy_backend
            ;;
        "frontend")
            deploy_frontend
            ;;
        "all")
            deploy_backend
            deploy_frontend
            ;;
        *)
            print_error "Invalid component: $COMPONENT. Use 'backend', 'frontend', or 'all'"
            exit 1
            ;;
    esac
    
    # Verify deployment
    verify_deployment
    
    echo "================================"
    print_success "🎉 Deployment completed successfully!"
    echo "================================"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [environment] [component] [skip_tests]"
    echo ""
    echo "Arguments:"
    echo "  environment  - preview|production (default: preview)"
    echo "  component    - backend|frontend|all (default: all)"
    echo "  skip_tests   - true|false (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Deploy all to preview"
    echo "  $0 production                # Deploy all to production"
    echo "  $0 production backend        # Deploy only backend to production"
    echo "  $0 preview frontend true     # Deploy only frontend to preview, skip tests"
}

# Handle help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
fi

# Run main function
main "$@"