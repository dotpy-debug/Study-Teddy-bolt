#!/bin/bash
# ===========================================
# Study Teddy Quick Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "=================================================================="
echo "          🧸 Study Teddy Docker Deployment Script               "
echo "=================================================================="
echo -e "${NC}"

# Check prerequisites
print_step "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

print_success "Prerequisites check passed"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning "Environment file not found. Creating from template..."

    if [ -f .env.docker ]; then
        cp .env.docker .env
        print_warning "Please edit .env file with your configuration before continuing."
        print_warning "Key things to change:"
        echo "  - Database passwords"
        echo "  - JWT secrets (must be 32+ characters)"
        echo "  - API keys (Google OAuth, OpenAI, etc.)"
        echo "  - Email configuration"
        echo ""
        read -p "Press Enter after you've configured .env file..."
    else
        print_error ".env.docker template not found!"
        exit 1
    fi
fi

# Deployment mode selection
echo ""
echo "Select deployment mode:"
echo "1) Development (basic services)"
echo "2) Full stack (with monitoring)"
echo "3) Production (full stack + security)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.yml"
        MODE="development"
        ;;
    2)
        COMPOSE_FILE="docker-compose.full.yml"
        MODE="full stack"
        ;;
    3)
        COMPOSE_FILE="docker-compose.full.yml"
        MODE="production"

        # Production checks
        print_step "Performing production readiness checks..."

        # Check for strong passwords
        if grep -q "change_in_production" .env; then
            print_error "Default passwords detected in .env file!"
            print_error "Please change all 'change_in_production' values to secure passwords."
            exit 1
        fi

        # Check SSL certificates for production
        if [ ! -f "nginx/ssl/studyteddy.crt" ] || [ ! -f "nginx/ssl/studyteddy.key" ]; then
            print_warning "SSL certificates not found. Generating self-signed certificates..."
            mkdir -p nginx/ssl
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout nginx/ssl/studyteddy.key \
                -out nginx/ssl/studyteddy.crt \
                -subj "/C=US/ST=State/L=City/O=StudyTeddy/CN=studyteddy.com"
            print_success "Self-signed certificates generated"
        fi
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

print_step "Starting $MODE deployment..."

# Create necessary directories
print_step "Creating required directories..."
mkdir -p backups data monitoring/prometheus monitoring/grafana/provisioning
print_success "Directories created"

# Pull latest images
print_step "Pulling latest Docker images..."
docker compose -f "$COMPOSE_FILE" pull
print_success "Images pulled successfully"

# Build and start services
print_step "Building and starting services..."
docker compose -f "$COMPOSE_FILE" up -d --build

# Wait for services to be ready
print_step "Waiting for services to initialize..."
sleep 30

# Health checks
print_step "Performing health checks..."

# Check if main services are running
if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    print_error "Some services failed to start"
    docker compose -f "$COMPOSE_FILE" logs
    exit 1
fi

# Test frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is responding"
else
    print_warning "Frontend health check failed"
fi

# Test backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Backend is responding"
else
    print_warning "Backend health check failed"
fi

# Test database
if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1; then
    print_success "Database is ready"
else
    print_warning "Database health check failed"
fi

# Display service information
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📋 Service URLs:"
echo "  🌐 Frontend:     http://localhost:3000"
echo "  🔧 Backend API:  http://localhost:3001"
echo "  📚 API Docs:     http://localhost:3001/api/docs"

if [ "$choice" != "1" ]; then
    echo "  📊 pgAdmin:      http://localhost:5050"
    echo "  📈 Grafana:      http://localhost:3002"
    echo "  📧 MailHog:      http://localhost:8025"
    echo "  🗄️  RedisInsight: http://localhost:8001"
fi

echo ""
echo "🔍 Useful commands:"
echo "  View logs:       docker compose -f $COMPOSE_FILE logs -f"
echo "  Stop services:   docker compose -f $COMPOSE_FILE down"
echo "  Restart:         docker compose -f $COMPOSE_FILE restart"
echo "  Check status:    docker compose -f $COMPOSE_FILE ps"

if [ "$MODE" = "production" ]; then
    echo ""
    echo -e "${YELLOW}📋 Production Checklist:${NC}"
    echo "  ☐ Configure domain DNS to point to this server"
    echo "  ☐ Set up proper SSL certificates (Let's Encrypt recommended)"
    echo "  ☐ Configure monitoring alerts"
    echo "  ☐ Set up automated backups"
    echo "  ☐ Review security settings"
    echo "  ☐ Test all functionality thoroughly"
fi

echo ""
echo -e "${BLUE}Happy studying with Study Teddy! 🧸📚${NC}"