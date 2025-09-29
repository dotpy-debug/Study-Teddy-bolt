#!/bin/bash

# Study Teddy Development Docker Script
# This script helps manage the development environment

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
COMPOSE_OVERRIDE="docker-compose.override.yml"
COMPOSE_DEV="docker-compose.dev.yml"
COMPOSE_TEST="docker-compose.test.yml"

# Functions
print_usage() {
    echo -e "${BLUE}Study Teddy Development Docker Manager${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  up              Start development environment"
    echo "  down            Stop development environment"
    echo "  restart         Restart development environment"
    echo "  logs            Show logs (use -f to follow)"
    echo "  shell           Open shell in container (backend|frontend|postgres|redis)"
    echo "  test            Run test suite"
    echo "  build           Build containers"
    echo "  clean           Clean containers and volumes"
    echo "  reset           Reset entire development environment"
    echo "  status          Show container status"
    echo "  db-reset        Reset database with fresh data"
    echo "  db-seed         Seed database with test data"
    echo "  db-migrate      Run database migrations"
    echo "  backup          Backup database and volumes"
    echo "  restore         Restore database from backup"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow logs (for logs command)"
    echo "  -h, --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up                    # Start development environment"
    echo "  $0 logs -f               # Follow all logs"
    echo "  $0 shell backend         # Open shell in backend container"
    echo "  $0 test                  # Run all tests"
}

check_requirements() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed or not in PATH${NC}"
        exit 1
    fi
}

wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $service to be ready...${NC}"

    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T $service nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}✅ $service is ready!${NC}"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}❌ $service failed to start within $(($max_attempts * 2)) seconds${NC}"
    return 1
}

start_development() {
    echo -e "${BLUE}🚀 Starting Study Teddy development environment...${NC}"

    # Create necessary directories
    mkdir -p logs coverage test-results playwright-report

    # Start infrastructure services first
    echo -e "${YELLOW}📦 Starting infrastructure services...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE up -d postgres redis mailhog minio

    # Wait for infrastructure to be ready
    wait_for_service postgres 5432
    wait_for_service redis 6379

    # Run database migrations
    echo -e "${YELLOW}🗃️  Running database migrations...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE run --rm backend npm run db:migrate

    # Start application services
    echo -e "${YELLOW}🏗️  Starting application services...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE up -d backend frontend

    # Wait for applications to be ready
    wait_for_service backend 3001
    wait_for_service frontend 3000

    # Start auxiliary services
    echo -e "${YELLOW}🛠️  Starting auxiliary services...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE up -d adminer redis-commander nginx-dev

    echo -e "${GREEN}✅ Development environment is ready!${NC}"
    echo ""
    echo -e "${BLUE}📋 Available services:${NC}"
    echo "  Frontend:        http://localhost:3000"
    echo "  Backend API:     http://localhost:3001"
    echo "  API Docs:        http://localhost:3001/api/docs"
    echo "  Database Admin:  http://localhost:8080"
    echo "  Redis Admin:     http://localhost:8081"
    echo "  MailHog:         http://localhost:8025"
    echo "  MinIO Console:   http://localhost:9001"
    echo ""
    echo -e "${YELLOW}💡 Use '$0 logs -f' to view live logs${NC}"
}

stop_development() {
    echo -e "${BLUE}🛑 Stopping Study Teddy development environment...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE down
    echo -e "${GREEN}✅ Development environment stopped${NC}"
}

restart_development() {
    echo -e "${BLUE}🔄 Restarting Study Teddy development environment...${NC}"
    stop_development
    start_development
}

show_logs() {
    local follow_flag=""
    if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
        follow_flag="-f"
    fi

    echo -e "${BLUE}📋 Showing logs...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE logs $follow_flag
}

open_shell() {
    local service=$2
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Please specify a service: backend, frontend, postgres, redis${NC}"
        exit 1
    fi

    echo -e "${BLUE}🐚 Opening shell in $service container...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec $service sh
}

run_tests() {
    echo -e "${BLUE}🧪 Running test suite...${NC}"

    # Start test environment
    docker-compose -f $COMPOSE_TEST up -d postgres-test redis-test

    # Wait for test infrastructure
    wait_for_service postgres-test 5432
    wait_for_service redis-test 6379

    # Run tests
    docker-compose -f $COMPOSE_TEST run --rm backend-test
    docker-compose -f $COMPOSE_TEST run --rm frontend-test
    docker-compose -f $COMPOSE_TEST run --rm e2e-test

    # Cleanup test environment
    docker-compose -f $COMPOSE_TEST down

    echo -e "${GREEN}✅ Test suite completed${NC}"
}

build_containers() {
    echo -e "${BLUE}🏗️  Building containers...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE build --no-cache
    echo -e "${GREEN}✅ Containers built successfully${NC}"
}

clean_environment() {
    echo -e "${YELLOW}⚠️  This will remove all containers and volumes. Are you sure? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🧹 Cleaning environment...${NC}"
        docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE down -v --remove-orphans
        docker-compose -f $COMPOSE_TEST down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Environment cleaned${NC}"
    else
        echo -e "${YELLOW}🚫 Operation cancelled${NC}"
    fi
}

reset_environment() {
    echo -e "${YELLOW}⚠️  This will completely reset the development environment. Are you sure? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        clean_environment
        build_containers
        start_development
        seed_database
    else
        echo -e "${YELLOW}🚫 Operation cancelled${NC}"
    fi
}

show_status() {
    echo -e "${BLUE}📊 Container status:${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE ps
}

reset_database() {
    echo -e "${BLUE}🗃️  Resetting database...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec backend npm run db:reset
    echo -e "${GREEN}✅ Database reset completed${NC}"
}

seed_database() {
    echo -e "${BLUE}🌱 Seeding database...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec backend npm run db:seed
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
}

migrate_database() {
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec backend npm run db:migrate
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

backup_database() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    echo -e "${BLUE}💾 Creating backup: $backup_name${NC}"

    mkdir -p ./backups
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec postgres pg_dump -U postgres studyteddy_dev > "./backups/${backup_name}.sql"

    echo -e "${GREEN}✅ Backup created: ./backups/${backup_name}.sql${NC}"
}

restore_database() {
    local backup_file=$2
    if [ -z "$backup_file" ]; then
        echo -e "${RED}❌ Please specify backup file: $0 restore [backup-file]${NC}"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi

    echo -e "${BLUE}🔄 Restoring database from: $backup_file${NC}"
    docker-compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE exec -T postgres psql -U postgres -d studyteddy_dev < "$backup_file"
    echo -e "${GREEN}✅ Database restored successfully${NC}"
}

# Main script logic
main() {
    check_requirements

    case ${1:-""} in
        "up")
            start_development
            ;;
        "down")
            stop_development
            ;;
        "restart")
            restart_development
            ;;
        "logs")
            show_logs "$@"
            ;;
        "shell")
            open_shell "$@"
            ;;
        "test")
            run_tests
            ;;
        "build")
            build_containers
            ;;
        "clean")
            clean_environment
            ;;
        "reset")
            reset_environment
            ;;
        "status")
            show_status
            ;;
        "db-reset")
            reset_database
            ;;
        "db-seed")
            seed_database
            ;;
        "db-migrate")
            migrate_database
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database "$@"
            ;;
        "-h"|"--help"|"help"|"")
            print_usage
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

main "$@"