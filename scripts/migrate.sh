#!/bin/bash

# Study Teddy Database Migration Script
# This script handles database migrations for the Study Teddy application

set -e

echo "🗄️  Study Teddy Database Migration Script"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Parse command line arguments
COMMAND=${1:-help}
ENVIRONMENT=${2:-development}

case $COMMAND in
    "generate")
        print_step "Generating new migration..."
        cd apps/backend
        npm run db:generate
        print_status "Migration generated successfully ✅"
        ;;

    "push")
        print_step "Pushing schema changes to database..."
        cd apps/backend
        npm run db:push
        print_status "Schema pushed successfully ✅"
        ;;

    "migrate")
        print_step "Running database migrations..."
        cd apps/backend

        if [ "$ENVIRONMENT" = "production" ]; then
            print_warning "Running migrations in PRODUCTION environment!"
            read -p "Are you sure you want to continue? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_status "Migration cancelled."
                exit 0
            fi
        fi

        npm run db:migrate
        print_status "Migrations completed successfully ✅"
        ;;

    "studio")
        print_step "Opening Drizzle Studio..."
        cd apps/backend
        print_status "Drizzle Studio will open in your browser"
        npm run db:studio
        ;;

    "reset")
        print_warning "This will DESTROY all data in the database!"
        read -p "Are you sure you want to reset the database? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Database reset cancelled."
            exit 0
        fi

        print_step "Resetting database..."
        cd apps/backend

        # Drop all tables (you might need to implement this in your schema)
        print_warning "Manual database reset required. Please connect to your database and drop all tables."
        print_status "Then run: ./scripts/migrate.sh migrate $ENVIRONMENT"
        ;;

    "backup")
        print_step "Creating database backup..."

        # Get database URL from environment
        if [ -f ".env" ]; then
            source .env
        fi

        if [ -z "$DATABASE_URL" ]; then
            print_error "DATABASE_URL not found in .env file"
            exit 1
        fi

        # Extract database connection details
        DB_HOST=$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d':' -f1)
        DB_PORT=$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
        DB_NAME=$(echo $DATABASE_URL | cut -d'/' -f4)
        DB_USER=$(echo $DATABASE_URL | cut -d'/' -f3 | cut -d':' -f1)

        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

        print_status "Creating backup: $BACKUP_FILE"
        pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "backups/$BACKUP_FILE"
        print_status "Backup created successfully ✅"
        ;;

    "restore")
        BACKUP_FILE=$3
        if [ -z "$BACKUP_FILE" ]; then
            print_error "Please specify backup file to restore"
            print_status "Usage: ./scripts/migrate.sh restore development backup_file.sql"
            exit 1
        fi

        if [ ! -f "backups/$BACKUP_FILE" ]; then
            print_error "Backup file backups/$BACKUP_FILE not found"
            exit 1
        fi

        print_warning "This will OVERWRITE the current database!"
        read -p "Are you sure you want to restore from $BACKUP_FILE? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Database restore cancelled."
            exit 0
        fi

        print_step "Restoring database from $BACKUP_FILE..."

        # Get database URL from environment
        if [ -f ".env" ]; then
            source .env
        fi

        if [ -z "$DATABASE_URL" ]; then
            print_error "DATABASE_URL not found in .env file"
            exit 1
        fi

        # Extract database connection details
        DB_HOST=$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d':' -f1)
        DB_PORT=$(echo $DATABASE_URL | cut -d'@' -f2 | cut -d':' -f2 | cut -d'/' -f1)
        DB_NAME=$(echo $DATABASE_URL | cut -d'/' -f4)
        DB_USER=$(echo $DATABASE_URL | cut -d'/' -f3 | cut -d':' -f1)

        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < "backups/$BACKUP_FILE"
        print_status "Database restored successfully ✅"
        ;;

    "help"|*)
        echo "Study Teddy Database Migration Script"
        echo
        echo "Usage: ./scripts/migrate.sh [COMMAND] [ENVIRONMENT]"
        echo
        echo "Commands:"
        echo "  generate                Generate new migration from schema changes"
        echo "  push                    Push schema changes directly to database"
        echo "  migrate                 Run pending migrations"
        echo "  studio                  Open Drizzle Studio for database management"
        echo "  reset                   Reset database (WARNING: destroys all data)"
        echo "  backup                  Create database backup"
        echo "  restore [backup_file]   Restore database from backup"
        echo "  help                    Show this help message"
        echo
        echo "Environments:"
        echo "  development (default)"
        echo "  production"
        echo
        echo "Examples:"
        echo "  ./scripts/migrate.sh generate"
        echo "  ./scripts/migrate.sh migrate production"
        echo "  ./scripts/migrate.sh backup"
        echo "  ./scripts/migrate.sh restore development backup_20231215_120000.sql"
        ;;
esac