# Study Teddy - Dependencies Documentation

Complete dependency analysis and management guide for the Study Teddy monorepo.

## Table of Contents

1. [Overview](#overview)
2. [Workspace Structure](#workspace-structure)
3. [Package Manager Requirements](#package-manager-requirements)
4. [Dependency Analysis](#dependency-analysis)
5. [Version Management](#version-management)
6. [Security Considerations](#security-considerations)
7. [Installation Order](#installation-order)
8. [Troubleshooting Dependencies](#troubleshooting-dependencies)

## Overview

Study Teddy uses a **pnpm monorepo** structure with **Turborepo** for build orchestration. This document provides a comprehensive analysis of all dependencies across the workspace.

### Key Statistics
- **Total Workspaces**: 6 (2 apps + 4 packages)
- **Package Manager**: pnpm 10.15.1+
- **Node.js Version**: 18.0.0+ (tested with 22.19.0)
- **TypeScript Version**: 5.7.3 (unified across all packages)

## Workspace Structure

```
studyteddy-monorepo/
├── apps/
│   ├── backend/           # @studyteddy/backend (NestJS 11.0.1)
│   └── frontend/          # @studyteddy/frontend (Next.js 15.5.3)
└── packages/
    ├── config/            # @studyteddy/config (build configs)
    ├── shared/            # @studyteddy/shared (utilities + Zod schemas)
    ├── shared-types/      # @studyteddy/shared-types (TypeScript types)
    └── validators/        # @studyteddy/validators (validation schemas)
```

## Package Manager Requirements

### CRITICAL: pnpm Only

**⚠️ NEVER use npm or yarn** for this project. Only use pnpm to avoid:
- Dependency version conflicts
- Workspace linking issues
- Lock file inconsistencies
- Build failures

### Required Versions
- **pnpm**: 8.0.0+ (current: 10.15.1)
- **Node.js**: 18.0.0+ (current: 22.19.0)

### Installation
```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version
```

## Dependency Analysis

### Root Package (studyteddy-monorepo)

#### Development Dependencies
```json
{
  "@types/node": "^20.0.0",           // Node.js type definitions
  "concurrently": "^8.2.2",          // Run multiple commands concurrently
  "cross-env": "^7.0.3",             // Cross-platform environment variables
  "dotenv-cli": "^7.4.4",            // Load environment variables from CLI
  "husky": "^8.0.3",                 // Git hooks management
  "lint-staged": "^15.2.10",         // Run linters on staged files
  "prettier": "^3.4.2",              // Code formatting
  "turbo": "^1.13.4",                // Monorepo build system
  "typescript": "^5.7.3"             // TypeScript compiler (unified version)
}
```

#### Engine Requirements
```json
{
  "node": ">=18.0.0",
  "npm": ">=9.0.0"  // Note: Despite npm reference, use pnpm only
}
```

---

### Backend (@studyteddy/backend)

#### Production Dependencies

##### NestJS Core
```json
{
  "@nestjs/common": "^11.0.1",        // Common NestJS utilities
  "@nestjs/core": "^11.0.1",          // NestJS core framework
  "@nestjs/platform-express": "^11.0.1", // Express platform adapter
  "@nestjs/config": "^4.0.2",         // Configuration management
  "@nestjs/swagger": "^11.2.0"        // API documentation
}
```

##### Authentication & Security
```json
{
  "@nestjs/jwt": "^11.0.0",           // JWT token handling
  "@nestjs/passport": "^11.0.5",      // Authentication strategies
  "@nestjs/throttler": "^6.4.0",      // Rate limiting
  "passport": "^0.7.0",               // Authentication middleware
  "passport-jwt": "^4.0.1",           // JWT authentication strategy
  "passport-google-oauth20": "^2.0.0", // Google OAuth strategy
  "bcrypt": "^6.0.0",                 // Password hashing
  "helmet": "^8.1.0"                  // Security headers
}
```

##### Database & ORM
```json
{
  "drizzle-orm": "^0.44.5",           // Type-safe ORM
  "postgres": "^3.4.7"               // PostgreSQL driver
}
```

##### AI Integration
```json
{
  "openai": "^5.20.3"                 // OpenAI API client
}
```

##### WebSocket & Real-time
```json
{
  "@nestjs/websockets": "^11.1.6",    // WebSocket support
  "@nestjs/platform-socket.io": "^11.1.6", // Socket.IO adapter
  "socket.io": "^4.8.1"              // Real-time communication
}
```

##### Email & Communication
```json
{
  "@nestjs-modules/mailer": "^2.0.2", // Email sending
  "nodemailer": "^6.10.1"            // Email transport
}
```

##### Validation & Transformation
```json
{
  "class-transformer": "^0.5.1",      // Object transformation
  "class-validator": "^0.14.2"        // Validation decorators
}
```

##### Utilities
```json
{
  "cache-manager": "^7.2.0",          // Caching abstraction
  "compression": "^1.8.1",            // Response compression
  "dotenv": "^17.2.2",               // Environment variables
  "reflect-metadata": "^0.2.2",       // Metadata reflection (required by NestJS)
  "rxjs": "^7.8.1",                  // Reactive programming
  "swagger-ui-express": "^5.0.1",     // Swagger UI
  "uuid": "^13.0.0"                  // UUID generation
}
```

#### Development Dependencies

##### NestJS CLI & Testing
```json
{
  "@nestjs/cli": "^11.0.0",           // NestJS CLI tools
  "@nestjs/schematics": "^11.0.0",    // Code generation
  "@nestjs/testing": "^11.0.0"        // Testing utilities
}
```

##### Database Tools
```json
{
  "drizzle-kit": "^0.31.4"           // Database migration and studio tools
}
```

##### TypeScript & Build
```json
{
  "typescript": "^5.7.3",            // TypeScript compiler
  "ts-jest": "^29.2.5",              // Jest TypeScript preprocessor
  "ts-loader": "^9.5.2",             // TypeScript webpack loader
  "ts-node": "^10.9.2",              // TypeScript execution
  "tsconfig-paths": "^4.2.0"         // TypeScript path mapping
}
```

##### Testing
```json
{
  "jest": "^29.7.0",                 // Testing framework
  "supertest": "^7.0.0"              // HTTP testing
}
```

##### Linting & Formatting
```json
{
  "eslint": "^9.18.0",               // Linting
  "eslint-config-prettier": "^10.0.1", // Prettier integration
  "eslint-plugin-prettier": "^5.2.2",  // Prettier as ESLint rules
  "prettier": "^3.4.2",              // Code formatting
  "typescript-eslint": "^8.20.0"     // TypeScript ESLint rules
}
```

---

### Frontend (@studyteddy/frontend)

#### Production Dependencies

##### React & Next.js
```json
{
  "next": "15.5.3",                  // React framework
  "react": "^18.3.1",               // React library
  "react-dom": "^18.3.1"            // React DOM rendering
}
```

##### UI Components & Styling
```json
{
  "@radix-ui/react-alert-dialog": "^1.1.15",    // Alert dialogs
  "@radix-ui/react-avatar": "^1.1.10",          // Avatar component
  "@radix-ui/react-checkbox": "^1.3.3",         // Checkbox component
  "@radix-ui/react-dialog": "^1.1.15",          // Modal dialogs
  "@radix-ui/react-dropdown-menu": "^2.1.16",   // Dropdown menus
  "@radix-ui/react-label": "^2.1.7",            // Form labels
  "@radix-ui/react-radio-group": "^1.3.8",      // Radio buttons
  "@radix-ui/react-scroll-area": "^1.2.10",     // Scroll containers
  "@radix-ui/react-select": "^2.2.6",           // Select dropdowns
  "@radix-ui/react-separator": "^1.1.7",        // Visual separators
  "@radix-ui/react-slot": "^1.2.3",             // Composition primitive
  "@radix-ui/react-switch": "^1.2.6",           // Toggle switches
  "@radix-ui/react-tabs": "^1.1.13",            // Tab navigation
  "class-variance-authority": "^0.7.1",          // Conditional CSS classes
  "clsx": "^2.1.1",                             // Conditional class names
  "tailwind-merge": "^3.3.1",                   // Tailwind class merging
  "lucide-react": "^0.400.0"                    // Icon library
}
```

##### Forms & Validation
```json
{
  "@hookform/resolvers": "^5.2.2",   // React Hook Form resolvers
  "react-hook-form": "^7.62.0",      // Form handling
  "zod": "^4.1.8"                    // Schema validation
}
```

##### Authentication
```json
{
  "next-auth": "^4.24.11"            // NextAuth.js authentication
}
```

##### HTTP & API
```json
{
  "axios": "^1.12.2"                 // HTTP client
}
```

##### Date & Time
```json
{
  "date-fns": "^4.1.0",              // Date utilities
  "react-day-picker": "^9.10.0"      // Date picker component
}
```

##### User Experience
```json
{
  "react-hot-toast": "^2.6.0"        // Toast notifications
}
```

##### Performance
```json
{
  "critters": "^0.0.23"              // Critical CSS inlining
}
```

#### Development Dependencies

##### Build & Bundle Analysis
```json
{
  "@next/bundle-analyzer": "^15.5.3" // Bundle size analysis
}
```

##### Styling & CSS
```json
{
  "@tailwindcss/postcss": "^4",      // Tailwind CSS PostCSS plugin
  "tailwindcss": "^4",               // Utility-first CSS framework
  "tw-animate-css": "^1.3.8"         // Animation utilities
}
```

##### Testing
```json
{
  "@testing-library/jest-dom": "^6.8.0",      // Jest DOM matchers
  "@testing-library/react": "^16.3.0",        // React testing utilities
  "@testing-library/user-event": "^14.6.1",   // User interaction simulation
  "jest": "^30.1.3",                          // Testing framework
  "jest-environment-jsdom": "^30.1.2"         // JSDOM test environment
}
```

##### Linting & TypeScript
```json
{
  "eslint": "^9",                    // Linting
  "eslint-config-next": "15.5.3",   // Next.js ESLint config
  "typescript": "^5"                // TypeScript compiler
}
```

---

### Shared Packages

#### @studyteddy/shared
```json
{
  "dependencies": {
    "zod": "^3.24.1"                // Schema validation
  },
  "devDependencies": {
    "@types/node": "^20.0.0",       // Node.js types
    "typescript": "^5.7.3"          // TypeScript compiler
  }
}
```

#### @studyteddy/config
```json
{
  "devDependencies": {
    "typescript": "^5.7.3"          // TypeScript compiler only
  }
}
```

#### @studyteddy/shared-types
```json
{
  "devDependencies": {
    "typescript": "^5.7.3"          // TypeScript compiler only
  }
}
```

#### @studyteddy/validators
```json
{
  "dependencies": {
    "zod": "^3.23.8",               // Schema validation
    "class-validator": "^0.14.1",   // Validation decorators
    "class-transformer": "^0.5.1",  // Object transformation
    "@studyteddy/shared-types": "workspace:*"  // Internal workspace dependency
  },
  "devDependencies": {
    "typescript": "^5.7.3"          // TypeScript compiler
  }
}
```

## Version Management

### Unified Versions

These packages maintain consistent versions across the workspace:

- **TypeScript**: `^5.7.3` (all packages)
- **Prettier**: `^3.4.2` (root + backend)
- **ESLint**: `^9.x` (backend + frontend)
- **Jest**: `^29.7.0+` (backend + frontend)

### Version Conflicts

#### Zod Version Inconsistency
- **Frontend**: `^4.1.8`
- **Shared**: `^3.24.1`
- **Validators**: `^3.23.8`

**Recommendation**: Standardize on Zod `^3.24.1` across all packages.

#### Node Types Version Inconsistency
- **Root**: `^20.0.0`
- **Shared**: `^20.0.0`
- **Backend**: `^22.10.7`
- **Frontend**: `^20`

**Recommendation**: Standardize on `@types/node ^20.0.0`.

## Security Considerations

### High-Priority Updates Needed

1. **bcrypt**: Currently `^6.0.0` - verify compatibility with Node.js 22+
2. **uuid**: Version `^13.0.0` is unusually high - verify legitimacy
3. **dotenv**: Version `^17.2.2` seems incorrect - should be `^16.x`

### Security Audit Commands

```bash
# Check for vulnerabilities
pnpm audit

# Fix vulnerabilities automatically
pnpm audit --fix

# Check specific package
pnpm audit --package-lock-only
```

### Dependency Scanning

```bash
# List all dependencies with versions
pnpm list --depth=0

# Check outdated packages
pnpm outdated

# Update dependencies (careful with major versions)
pnpm update
```

## Installation Order

### Correct Installation Sequence

1. **Clean State** (if needed)
```bash
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm pnpm-lock.yaml
```

2. **Install Root Dependencies**
```bash
pnpm install
```

3. **Build Shared Packages** (critical order)
```bash
pnpm --filter @studyteddy/shared-types build
pnpm --filter @studyteddy/shared build
pnpm --filter @studyteddy/config build
pnpm --filter @studyteddy/validators build
```

4. **Verify Workspace Linking**
```bash
pnpm list --depth=0
```

5. **Build Applications**
```bash
pnpm build
```

### Why Order Matters

1. **Shared Types** must be built first (no dependencies)
2. **Validators** depends on `@studyteddy/shared-types`
3. **Backend/Frontend** depend on all shared packages
4. **Turbo** handles parallel builds safely after initial setup

## Troubleshooting Dependencies

### Common Issues & Solutions

#### Issue 1: Workspace Dependencies Not Found
```bash
Error: Cannot resolve dependency '@studyteddy/shared-types'
```

**Solution**:
```bash
# Build shared packages in order
pnpm --filter @studyteddy/shared-types build
pnpm --filter @studyteddy/validators build

# Or build all shared packages
pnpm --filter "./packages/*" build
```

#### Issue 2: Version Conflicts
```bash
Error: Conflicting peer dependency versions
```

**Solution**:
```bash
# Check conflicting versions
pnpm list --depth=1 | grep WARN

# Force resolution in root package.json
{
  "pnpm": {
    "overrides": {
      "typescript": "^5.7.3",
      "zod": "^3.24.1"
    }
  }
}
```

#### Issue 3: Lock File Corruption
```bash
Error: Unable to resolve dependencies
```

**Solution**:
```bash
# Clean everything
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm pnpm-lock.yaml

# Fresh install
pnpm install
```

#### Issue 4: TypeScript Compilation Errors
```bash
Error: Cannot find module '@studyteddy/shared'
```

**Solution**:
```bash
# Ensure shared packages are built
pnpm build

# Check TypeScript project references
cat tsconfig.json | grep references

# Verify workspace structure
pnpm list --depth=0
```

#### Issue 5: Build Cache Issues
```bash
Error: Turbo cache corruption
```

**Solution**:
```bash
# Clear Turbo cache
npx turbo prune

# Clear all build artifacts
pnpm clean

# Rebuild everything
pnpm build
```

### Advanced Troubleshooting

#### Dependency Tree Analysis
```bash
# View complete dependency tree
pnpm list --depth=3

# Check specific package dependencies
pnpm why package-name

# Find duplicate packages
pnpm list --depth=Infinity | grep "^[├└]" | sort | uniq -c | grep -v "1 "
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Install with limited concurrency
pnpm install --reporter=silent --child-concurrency=1
```

#### Network Issues
```bash
# Use different registry
pnpm config set registry https://registry.npmjs.org/

# Clear pnpm cache
pnpm store prune
```

## Best Practices

### Development Workflow

1. **Always use pnpm** - never mix with npm/yarn
2. **Build shared packages first** before working on apps
3. **Use workspace protocols** for internal dependencies
4. **Keep versions synchronized** across the monorepo
5. **Regular security audits** with `pnpm audit`

### Package.json Maintenance

1. **Pin major versions** for stability
2. **Use exact versions** for critical dependencies
3. **Regular dependency updates** (minor/patch versions)
4. **Document version decisions** in commit messages

### Performance Optimization

1. **Use pnpm store** for faster installs
2. **Enable Turbo caching** for builds
3. **Minimize dependency count** in shared packages
4. **Use workspace protocols** to avoid duplication

---

## Dependencies Summary

| Category | Count | Key Packages |
|----------|-------|--------------|
| **Backend Core** | 25+ | NestJS, Drizzle ORM, Passport |
| **Frontend Core** | 20+ | Next.js, React, Radix UI |
| **Development Tools** | 15+ | TypeScript, ESLint, Jest |
| **Shared Utilities** | 10+ | Zod, class-validator |
| **Total Dependencies** | 70+ | High-quality, actively maintained |

The dependency graph is well-structured with clear separation of concerns and minimal circular dependencies. Regular maintenance and security updates are recommended to keep the project healthy and secure.