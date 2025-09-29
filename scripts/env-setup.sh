#!/bin/bash

# Study Teddy Environment Setup Script
# This script helps set up environment variables for different environments

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("development" "staging" "production" "test")
ENV_DIR="."

print_usage() {
    echo -e "${BLUE}Study Teddy Environment Setup${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  init [env]      Initialize environment files"
    echo "  validate [env]  Validate environment configuration"
    echo "  copy [env]      Copy template to actual .env file"
    echo "  generate        Generate secure secrets"
    echo "  check           Check all environment files"
    echo "  clean           Clean generated environment files"
    echo ""
    echo "Environments:"
    echo "  development     Local development environment"
    echo "  staging         Staging environment"
    echo "  production      Production environment"
    echo "  test            Testing environment"
    echo ""
    echo "Examples:"
    echo "  $0 init development         # Initialize development environment"
    echo "  $0 validate staging         # Validate staging configuration"
    echo "  $0 generate                 # Generate secure secrets"
    echo "  $0 check                    # Check all environments"
}

generate_secret() {
    local length=${1:-32}
    openssl rand -hex $length 2>/dev/null || head -c $length /dev/urandom | xxd -p | tr -d '\n'
}

generate_jwt_secret() {
    generate_secret 32
}

generate_password() {
    local length=${1:-16}
    # Generate password with letters, numbers, and safe special characters
    LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*' < /dev/urandom | head -c $length
}

init_environment() {
    local env=$1

    if [ -z "$env" ]; then
        echo -e "${RED}❌ Please specify an environment${NC}"
        exit 1
    fi

    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        echo -e "${RED}❌ Invalid environment: $env${NC}"
        echo "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi

    local template_file=".env.$env.example"
    local env_file=".env.$env"

    if [ "$env" = "development" ]; then
        env_file=".env"
    fi

    if [ ! -f "$template_file" ]; then
        echo -e "${RED}❌ Template file not found: $template_file${NC}"
        exit 1
    fi

    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  Environment file already exists: $env_file${NC}"
        echo -e "${YELLOW}Do you want to overwrite it? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${YELLOW}🚫 Operation cancelled${NC}"
            exit 0
        fi
    fi

    echo -e "${BLUE}🔧 Initializing $env environment...${NC}"

    # Copy template to environment file
    cp "$template_file" "$env_file"

    # Generate secure secrets if in development or if explicitly requested
    if [ "$env" = "development" ]; then
        echo -e "${YELLOW}🔐 Generating secure secrets for development...${NC}"

        # Generate JWT secrets
        jwt_secret=$(generate_jwt_secret)
        jwt_refresh_secret=$(generate_jwt_secret)
        nextauth_secret=$(generate_jwt_secret)

        # Replace secrets in the file
        if command -v sed &> /dev/null; then
            sed -i.bak "s/dev-jwt-secret-change-in-production-minimum-32-characters/$jwt_secret/g" "$env_file"
            sed -i.bak "s/dev-refresh-secret-change-in-production-minimum-32-characters/$jwt_refresh_secret/g" "$env_file"
            sed -i.bak "s/dev-nextauth-secret-change-in-production/$nextauth_secret/g" "$env_file"
            rm -f "$env_file.bak"
        fi
    fi

    echo -e "${GREEN}✅ Environment file created: $env_file${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next steps:${NC}"
    echo "1. Edit $env_file and fill in your actual values"
    echo "2. Never commit this file to version control"
    echo "3. Run '$0 validate $env' to check the configuration"
    echo ""

    if [ "$env" = "development" ]; then
        echo -e "${BLUE}🔧 Development environment specific notes:${NC}"
        echo "• Generated secure JWT secrets automatically"
        echo "• Database and Redis should be running via Docker"
        echo "• MailHog is configured for email testing"
        echo "• Add your actual OpenAI API key for AI features"
        echo ""
    fi
}

validate_environment() {
    local env=$1

    if [ -z "$env" ]; then
        echo -e "${RED}❌ Please specify an environment${NC}"
        exit 1
    fi

    local env_file=".env.$env"
    if [ "$env" = "development" ]; then
        env_file=".env"
    fi

    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ Environment file not found: $env_file${NC}"
        echo "Run '$0 init $env' to create it"
        exit 1
    fi

    echo -e "${BLUE}🔍 Validating $env environment configuration...${NC}"

    local errors=0
    local warnings=0

    # Check required variables
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "DATABASE_URL"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
    )

    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file" || grep -q "^$var=$" "$env_file" || grep -q "^$var=your-" "$env_file"; then
            echo -e "${RED}❌ Missing or invalid required variable: $var${NC}"
            errors=$((errors + 1))
        fi
    done

    # Check JWT secret strength
    jwt_secret=$(grep "^JWT_SECRET=" "$env_file" | cut -d'=' -f2)
    if [ ${#jwt_secret} -lt 32 ]; then
        echo -e "${RED}❌ JWT_SECRET is too short (minimum 32 characters)${NC}"
        errors=$((errors + 1))
    fi

    jwt_refresh_secret=$(grep "^JWT_REFRESH_SECRET=" "$env_file" | cut -d'=' -f2)
    if [ ${#jwt_refresh_secret} -lt 32 ]; then
        echo -e "${RED}❌ JWT_REFRESH_SECRET is too short (minimum 32 characters)${NC}"
        errors=$((errors + 1))
    fi

    # Check for placeholder values
    local placeholder_patterns=(
        "your-"
        "change-this"
        "replace-me"
        "example"
        "localhost" # Warning for production
    )

    for pattern in "${placeholder_patterns[@]}"; do
        if grep -q "$pattern" "$env_file"; then
            if [ "$env" = "production" ] && [ "$pattern" = "localhost" ]; then
                echo -e "${RED}❌ Production environment should not use localhost${NC}"
                errors=$((errors + 1))
            else
                echo -e "${YELLOW}⚠️  Found placeholder value containing '$pattern'${NC}"
                warnings=$((warnings + 1))
            fi
        fi
    done

    # Environment-specific checks
    if [ "$env" = "production" ]; then
        # Production specific validations
        if grep -q "NODE_ENV=development\|NODE_ENV=staging\|NODE_ENV=test" "$env_file"; then
            echo -e "${RED}❌ NODE_ENV should be 'production' in production environment${NC}"
            errors=$((errors + 1))
        fi

        if grep -q "DEBUG=true" "$env_file"; then
            echo -e "${YELLOW}⚠️  DEBUG is enabled in production${NC}"
            warnings=$((warnings + 1))
        fi

        if grep -q "http://" "$env_file"; then
            echo -e "${RED}❌ Production should use HTTPS URLs${NC}"
            errors=$((errors + 1))
        fi
    fi

    # Summary
    echo ""
    if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
        echo -e "${GREEN}✅ Environment configuration is valid!${NC}"
    elif [ $errors -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Environment configuration is valid with $warnings warnings${NC}"
    else
        echo -e "${RED}❌ Environment configuration has $errors errors and $warnings warnings${NC}"
        exit 1
    fi
}

copy_template() {
    local env=$1

    if [ -z "$env" ]; then
        echo -e "${RED}❌ Please specify an environment${NC}"
        exit 1
    fi

    local template_file=".env.$env.example"
    local env_file=".env"

    if [ ! -f "$template_file" ]; then
        echo -e "${RED}❌ Template file not found: $template_file${NC}"
        exit 1
    fi

    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  .env file already exists${NC}"
        echo -e "${YELLOW}Do you want to overwrite it? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${YELLOW}🚫 Operation cancelled${NC}"
            exit 0
        fi
    fi

    cp "$template_file" "$env_file"
    echo -e "${GREEN}✅ Copied $template_file to $env_file${NC}"
    echo -e "${YELLOW}📝 Remember to fill in your actual values!${NC}"
}

generate_secrets() {
    echo -e "${BLUE}🔐 Generating secure secrets...${NC}"
    echo ""

    echo -e "${YELLOW}JWT Secret (32 bytes):${NC}"
    echo "$(generate_jwt_secret)"
    echo ""

    echo -e "${YELLOW}JWT Refresh Secret (32 bytes):${NC}"
    echo "$(generate_jwt_secret)"
    echo ""

    echo -e "${YELLOW}NextAuth Secret (32 bytes):${NC}"
    echo "$(generate_jwt_secret)"
    echo ""

    echo -e "${YELLOW}Database Password (16 chars):${NC}"
    echo "$(generate_password 16)"
    echo ""

    echo -e "${YELLOW}Redis Password (16 chars):${NC}"
    echo "$(generate_password 16)"
    echo ""

    echo -e "${GREEN}✅ Copy these values to your environment files${NC}"
    echo -e "${RED}⚠️  Never share these secrets or commit them to version control!${NC}"
}

check_all_environments() {
    echo -e "${BLUE}🔍 Checking all environment configurations...${NC}"
    echo ""

    local total_errors=0

    for env in "${ENVIRONMENTS[@]}"; do
        local env_file=".env.$env"
        if [ "$env" = "development" ]; then
            env_file=".env"
        fi

        if [ -f "$env_file" ]; then
            echo -e "${BLUE}Checking $env environment...${NC}"
            if validate_environment "$env"; then
                echo -e "${GREEN}✅ $env: OK${NC}"
            else
                echo -e "${RED}❌ $env: FAILED${NC}"
                total_errors=$((total_errors + 1))
            fi
            echo ""
        else
            echo -e "${YELLOW}⚠️  $env environment file not found: $env_file${NC}"
        fi
    done

    if [ $total_errors -eq 0 ]; then
        echo -e "${GREEN}✅ All environment configurations are valid!${NC}"
    else
        echo -e "${RED}❌ $total_errors environment(s) have configuration issues${NC}"
        exit 1
    fi
}

clean_environments() {
    echo -e "${YELLOW}⚠️  This will remove all generated environment files. Are you sure? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo -e "${BLUE}🧹 Cleaning environment files...${NC}"

        for env in "${ENVIRONMENTS[@]}"; do
            local env_file=".env.$env"
            if [ "$env" = "development" ]; then
                env_file=".env"
            fi

            if [ -f "$env_file" ]; then
                rm -f "$env_file"
                echo -e "${GREEN}Removed: $env_file${NC}"
            fi
        done

        echo -e "${GREEN}✅ Environment files cleaned${NC}"
    else
        echo -e "${YELLOW}🚫 Operation cancelled${NC}"
    fi
}

# Main script logic
main() {
    case ${1:-""} in
        "init")
            init_environment "$2"
            ;;
        "validate")
            validate_environment "$2"
            ;;
        "copy")
            copy_template "$2"
            ;;
        "generate")
            generate_secrets
            ;;
        "check")
            check_all_environments
            ;;
        "clean")
            clean_environments
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